import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON) {
  console.error('ERROR: Missing VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function fetchMetadata() {
  console.log('Fetching multi-stream metadata from Supabase...');

  // 1. Fetch colleges (bypassing 1000 row limit)
  let collegeData = [];
  let colStart = 0;
  const colStep = 1000;
  while(true) {
    const { data: colBatch, error: colError } = await supabase
      .from('colleges')
      .select('college_code, college_name, search_terms, stream')
      .order('college_code')
      .range(colStart, colStart + colStep - 1);

    if (colError) {
      console.error('Failed to fetch colleges:', colError);
      process.exit(1);
    }
    if (!colBatch || colBatch.length === 0) break;
    collegeData.push(...colBatch);
    if (colBatch.length < colStep) break;
    colStart += colStep;
  }

  // 2. Fetch branches
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('raw_name, stream, parent_branches(name, alias), specialisations(name)')
    .order('raw_name');

  if (branchError) {
    console.error('Failed to fetch branches:', branchError);
    process.exit(1);
  }

  // 3. Dynamically determine all streams available in the database
  const uniqueStreamsSet = new Set();
  collegeData.forEach(c => { if (c.stream) uniqueStreamsSet.add(c.stream); });
  branchData.forEach(b => { if (b.stream) uniqueStreamsSet.add(b.stream); });
  const KNOWN_STREAMS = Array.from(uniqueStreamsSet);

  const streams = {};
  const streamSummaries = [];

  for (const stream of KNOWN_STREAMS) {
    // Check if this stream has any rounds
    const { data: roundData, error: roundError } = await supabase
      .from(`latest_rounds_${stream}`)
      .select('year, round, round_name, seat_type')
      .order('year', { ascending: false })
      .order('round', { ascending: false });

    // If no rounds exist, this stream hasn't been populated yet, skip it.
    if (roundError || !roundData || roundData.length === 0) {
      continue;
    }

    streams[stream] = { colleges: new Map(), branches: new Map(), rounds: roundData, combinations: new Set(), articleCombinations: new Set(), maxRankByCategory: {} };

    // Fetch matrix data to discover active colleges and branches for this stream
    let allMatrixData = [];
    let start = 0;
    const step = 1000;
    while(true) {
      const { data: matrixData, error: matrixError } = await supabase
        .from(`cutoffs_matrix_${stream}`)
        .select('college_code, course_name, max_rank, category, seat_type')
        .range(start, start + step - 1);

      if (matrixError || !matrixData || matrixData.length === 0) break;
      allMatrixData.push(...matrixData);
      if (matrixData.length < step) break;
      start += step;
    }

    if (allMatrixData.length > 0) {
      allMatrixData.forEach(row => {
        // Track absolute maximum rank per category for precise SEO sitemap buckets
        if (row.category && row.max_rank) {
          if (!streams[stream].maxRankByCategory[row.category]) {
            streams[stream].maxRankByCategory[row.category] = 0;
          }
          if (row.max_rank > streams[stream].maxRankByCategory[row.category]) {
            streams[stream].maxRankByCategory[row.category] = row.max_rank;
          }
        }

        // Add college
        const col = collegeData.find(c => c.college_code === row.college_code);
        if (col && !streams[stream].colleges.has(row.college_code)) {
          streams[stream].colleges.set(row.college_code, col);
        }
        // Add branch
        const branch = branchData.find(b => b.raw_name === row.course_name);
        if (branch && !streams[stream].branches.has(row.course_name)) {
          streams[stream].branches.set(row.course_name, branch);
        }
        // Add valid combination
        if (col && branch && col.college_name) {
          const bName = branch.parent_branches ? branch.parent_branches.name : branch.raw_name;
          streams[stream].combinations.add(`${col.college_name}::${bName}`);
          if (row.category && row.max_rank > 0) {
            streams[stream].articleCombinations.add(`${col.college_name}::${bName}::${row.category}::${row.seat_type || 'G'}`);
          }
        }
      });
    }

    // Create a summary for the homepage cards
    const yearSummary = {};
    const reversedRoundData = [...roundData].reverse();
    reversedRoundData.forEach(r => {
      if (!yearSummary[r.year]) yearSummary[r.year] = [];
      if (r.round_name && !yearSummary[r.year].includes(r.round_name)) {
        yearSummary[r.year].push(r.round_name);
      }
    });
    
    const yearsArray = Object.keys(yearSummary)
      .map(y => parseInt(y))
      .sort((a,b) => a - b)
      .map(year => ({ year, rounds: yearSummary[year] }));
    
    streamSummaries.push({ id: stream, yearSummary: yearsArray });
  }

  // Convert Maps/Sets back to arrays
  for (const streamKey of Object.keys(streams)) {
    streams[streamKey].colleges = Array.from(streams[streamKey].colleges.values());
    streams[streamKey].branches = Array.from(streams[streamKey].branches.values());

    const nameToCode = new Map();
    for (const c of streams[streamKey].colleges) {
      nameToCode.set(c.college_name, c.college_code);
    }

    const sortFn = (a, b) => {
      const partsA = a.split('::');
      const partsB = b.split('::');
      const collegeA = partsA[0];
      const collegeB = partsB[0];
      const branchA = partsA[1];
      const branchB = partsB[1];
      const catA = partsA[2];
      const catB = partsB[2];

      // 1. Sort by Category: GM first, then alphabetical
      if (catA && catB && catA !== catB) {
         if (catA === 'GM') return -1;
         if (catB === 'GM') return 1;
         return catA.localeCompare(catB);
      }

      // 2. Sort by College Code
      const codeA = nameToCode.get(collegeA) || '';
      const codeB = nameToCode.get(collegeB) || '';
      if (codeA !== codeB) {
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      }

      // 3. Sort by Branch
      if (branchA && branchB && branchA !== branchB) {
         return branchA.localeCompare(branchB);
      }

      return a.localeCompare(b);
    };

    if (streams[streamKey].combinations) {
      streams[streamKey].combinations = Array.from(streams[streamKey].combinations).sort(sortFn);
    }
    if (streams[streamKey].articleCombinations) {
      streams[streamKey].articleCombinations = Array.from(streams[streamKey].articleCombinations).sort(sortFn);
    }
  }

  // Write files to public folder
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  // Write a global index of available streams with their summary data
  if (streamSummaries.length === 0) {
    streamSummaries.push({ id: 'engineering', yearSummary: [] });
    streams['engineering'] = { colleges: [], branches: [], rounds: [] };
  }

  // Sort streams: engineering first, rest alphabetically
  streamSummaries.sort((a, b) => {
    if (a.id === 'engineering') return -1;
    if (b.id === 'engineering') return 1;
    return a.id.localeCompare(b.id);
  });

  fs.writeFileSync(
    path.join(publicDir, 'streams.json'), 
    JSON.stringify(streamSummaries, null, 2)
  );

  // Write individual metadata files per stream
  for (const [stream, data] of Object.entries(streams)) {
    delete data._seenRounds;
    const filePath = path.join(publicDir, `meta_${stream}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`✅ Wrote meta_${stream}.json (${data.colleges.length} colleges, ${data.branches.length} branches)`);
  }  // Generate sitemap.xml
  const domain = process.env.VITE_APP_DOMAIN || 'https://kcet.uninode.in';
  const currentDate = new Date().toISOString();
  
  const mainUrls = [];
  const analyzerUrls = [];
  const explorerUrls = [];
  const cutoffUrls = [];
  const articleUrls = [];
  const paginationUrls = [];
  
  // Home page and index pages
  mainUrls.push({ loc: `${domain}/`, changefreq: 'daily', priority: '1.0' });
  mainUrls.push({ loc: `${domain}/articles`, changefreq: 'daily', priority: '0.9' });

  // Stream pages, Branch pages, College pages, and Rank Buckets
  let branchCount = 0;
  let collegeCount = 0;
  let rankBucketCount = 0;

  for (const streamObj of streamSummaries) {
    const sId = streamObj.id;
    
    // Main stream page
    mainUrls.push({ loc: `${domain}/${sId}`, changefreq: 'weekly', priority: '0.8' });

    const streamData = streams[sId];
    
    // Strategic Rank Buckets for Analyzer mode
    const maxRankByCategory = streamData ? streamData.maxRankByCategory : {};
    
    for (const [cat, maxRank] of Object.entries(maxRankByCategory)) {
      if (!maxRank || maxRank <= 0) continue;
      
      const bucketLimit = Math.min(maxRank, 400000); // Hard cap at 400k
      const numOf1kBuckets = Math.floor(bucketLimit / 1000);
      
      const rankBuckets = Array.from({ length: numOf1kBuckets }, (_, i) => (i + 1) * 1000);
      
      for (const rb of rankBuckets) {
        analyzerUrls.push({ loc: `${domain}/${sId}?mode=analyzer&amp;rank=${rb}&amp;cat=${encodeURIComponent(cat)}`, changefreq: 'weekly', priority: '0.7' });
        rankBucketCount++;
      }
    }
    
    // Branch pages
    if (streamData && streamData.branches) {
      for (const b of streamData.branches) {
        const bName = b.parent_branches ? b.parent_branches.name : b.raw_name;
        if (!bName) continue;
        const bUrl = `${domain}/${sId}?mode=explorer&amp;branches=${encodeURIComponent(bName).replace(/%20/g, '+')}`;
        explorerUrls.push({ loc: bUrl, changefreq: 'weekly', priority: '0.6' });
        branchCount++;
      }
    }

    // College pages
    if (streamData && streamData.colleges) {
      for (const c of streamData.colleges) {
        if (!c.college_name) continue;
        const cUrl = `${domain}/${sId}?mode=explorer&amp;college=${encodeURIComponent(c.college_name).replace(/%20/g, '+').replace(/&/g, '%26')}`;
        explorerUrls.push({ loc: cUrl, changefreq: 'weekly', priority: '0.6' });
        collegeCount++;
      }
    }

    // Combinations (College + Branch)
    if (streamData && streamData.combinations) {
      for (const combo of streamData.combinations) {
        const [cName, bName] = combo.split('::');
        if (!cName || !bName) continue;
        const comboUrl = `${domain}/${sId}?mode=explorer&amp;college=${encodeURIComponent(cName).replace(/%20/g, '+').replace(/&/g, '%26')}&amp;branches=${encodeURIComponent(bName).replace(/%20/g, '+')}`;
        cutoffUrls.push({ loc: comboUrl, changefreq: 'weekly', priority: '0.5' });
      }
    }

    // Article URLs and Pagination
    if (streamData && streamData.articleCombinations) {
      const perPage = 24;
      const totalPages = Math.ceil(streamData.articleCombinations.length / perPage);
      
      for (let p = 1; p <= totalPages; p++) {
        paginationUrls.push({ loc: `${domain}/articles?stream=${sId}&amp;page=${p}`, changefreq: 'weekly', priority: '0.6' });
      }

      for (const combo of streamData.articleCombinations) {
        const [cName, bName, cat, st] = combo.split('::');
        if (!cName || !bName || !cat) continue;
        const articleUrl = `${domain}/article?stream=${sId}&amp;college=${encodeURIComponent(cName).replace(/%20/g, '+').replace(/&/g, '%26')}&amp;branch=${encodeURIComponent(bName).replace(/%20/g, '+')}&amp;cat=${encodeURIComponent(cat)}`;
        articleUrls.push({ loc: articleUrl, changefreq: 'weekly', priority: '0.6' });
      }
    }
  }
  
  // Intelligent Semantic Chunking by Feature
  const URLS_PER_SITEMAP = 10000;
  let sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  function processCategory(prefix, urls) {
    if (urls.length === 0) return;
    const numChunks = Math.ceil(urls.length / URLS_PER_SITEMAP);
    
    for (let i = 0; i < numChunks; i++) {
      const filename = numChunks === 1 ? `sitemap-${prefix}.xml` : `sitemap-${prefix}-${i + 1}.xml`;
      sitemapIndexXml += `  <sitemap>\n    <loc>${domain}/${filename}</loc>\n    <lastmod>${currentDate}</lastmod>\n  </sitemap>\n`;
      
      const chunk = urls.slice(i * URLS_PER_SITEMAP, (i + 1) * URLS_PER_SITEMAP);
      let chunkXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      chunk.forEach(u => {
        chunkXml += `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
      });
      chunkXml += `</urlset>`;
      fs.writeFileSync(path.join(publicDir, filename), chunkXml);
    }
  }

  processCategory('main', mainUrls);
  processCategory('analyzer', analyzerUrls);
  processCategory('explorer', explorerUrls);
  processCategory('cutoffs', cutoffUrls);
  processCategory('articles', articleUrls);
  processCategory('pagination', paginationUrls);

  sitemapIndexXml += `</sitemapindex>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapIndexXml);
  
  const totalUrls = mainUrls.length + analyzerUrls.length + explorerUrls.length + cutoffUrls.length + articleUrls.length + paginationUrls.length;
  console.log(`✅ Wrote feature-specific sitemaps (${totalUrls} total URLs)`);
}

fetchMetadata();
