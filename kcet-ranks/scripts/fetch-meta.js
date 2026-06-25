import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import zlib from 'zlib';
import { promisify } from 'util';

const brotliCompress = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);
import { processCollegeChunks } from './precompute-suggestions.js';

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\(\)\[\]]+/g, '-')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractSeoData(roundsObj) {
  if (!roundsObj) return null;
  // Parse all year+round combos
  const parsed = [];
  for (const key of Object.keys(roundsObj)) {
    const [yStr, rStr] = key.split('_R');
    const y = Number(yStr);
    const r = Number(rStr);
    const val = roundsObj[key];
    if (!isNaN(y) && !isNaN(r) && val !== null && val !== undefined && val !== '--') {
      parsed.push({ y, r, val });
    }
  }
  if (parsed.length === 0) return null;

  // Find latest year
  const years = [...new Set(parsed.map(p => p.y))].sort((a, b) => b - a);
  const latestYear = years[0];
  const prevYear = years.length > 1 ? years[1] : null;

  // Latest year: closing rank (highest round) and round 1 rank
  const latestEntries = parsed.filter(p => p.y === latestYear).sort((a, b) => b.r - a.r);
  const closingRank = latestEntries[0]?.val;
  const lastRound = latestEntries[0]?.r;
  const r1Entry = latestEntries.find(p => p.r === 1) || latestEntries[latestEntries.length - 1];
  const r1Rank = r1Entry?.val;

  // Previous year closing rank
  let prevClosing = null;
  if (prevYear) {
    const prevEntries = parsed.filter(p => p.y === prevYear).sort((a, b) => b.r - a.r);
    prevClosing = prevEntries[0]?.val || null;
  }

  if (closingRank === null || closingRank === undefined) return null;

  return { r: closingRank, y: latestYear, rd: lastRound, r1: r1Rank || null, pr: prevClosing, py: prevYear };
}

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
        .select('college_code, college_name, course_name, category, seat_type, rounds, min_rank, max_rank')
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
          streams[stream].combinations.add(`${col.college_code}::${col.college_name}::${row.course_name}`);
          if (row.category && row.max_rank > 0) {
            streams[stream].articleCombinations.add(`${col.college_code}::${col.college_name}::${row.course_name}::${row.category}::${row.seat_type || 'G'}`);
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

    // --- NEW: EXPORT COLLEGE-LEVEL STATIC CHUNKS ---
    const collegeDataDir = path.resolve(process.cwd(), 'public', 'college_data');
    if (!fs.existsSync(collegeDataDir)) fs.mkdirSync(collegeDataDir, { recursive: true });

    console.log(`Precomputing suggestions and splitting ${stream} by college...`);
    const collegeOutputs = processCollegeChunks(allMatrixData);
    
    for (const [collegeCode, dataObj] of Object.entries(collegeOutputs)) {
      const cBuffer = Buffer.from(JSON.stringify(dataObj));
      const cName = `${stream}_${collegeCode}.json`;
      fs.writeFileSync(path.join(collegeDataDir, cName), cBuffer);
      const cBrBuffer = await brotliCompress(cBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
      fs.writeFileSync(path.join(collegeDataDir, `${cName}.br`), cBrBuffer);
    }
    console.log(`✅ Saved ${Object.keys(collegeOutputs).length} college-specific files for ${stream}`);

    // --- SEO LOOKUP for Edge Function ---
    const seoLookup = {};
    for (const row of allMatrixData) {
      if (row.seat_type !== 'ROK') continue;
      const seoData = extractSeoData(row.rounds);
      if (!seoData) continue;
      const key = `${row.college_code}|${slugify(row.course_name)}|${row.category}`.toLowerCase();
      if (!seoLookup[key]) {
        seoLookup[key] = { ...seoData, code: row.college_code };
      }
    }
    const seoPublicDir = path.resolve(process.cwd(), 'public');
    const seoBuffer = Buffer.from(JSON.stringify(seoLookup));
    fs.writeFileSync(path.join(seoPublicDir, `seo_${stream}.json`), seoBuffer);
    const seoBrBuffer = await brotliCompress(seoBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
    fs.writeFileSync(path.join(seoPublicDir, `seo_${stream}.json.br`), seoBrBuffer);
    console.log(`✅ Wrote seo_${stream}.json (${Object.keys(seoLookup).length} entries, ${(seoBuffer.length/1024).toFixed(1)}KB)`);

    // --- NEW: EXPORT FULL COMPRESSED DATA IN CHUNKS ---
    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

    const CHUNK_SIZE = 30000;
    const numChunks = Math.ceil(allMatrixData.length / CHUNK_SIZE);
    
    // Store numChunks in the meta object so the frontend knows how many to fetch
    streams[stream].numChunks = numChunks;

    console.log(`Compressing ${allMatrixData.length} rows for ${stream} into ${numChunks} chunks...`);
    
    for (let i = 0; i < numChunks; i++) {
      const chunkData = allMatrixData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const jsonBuffer = Buffer.from(JSON.stringify(chunkData));
      const chunkName = `data_${stream}_${i}.json`;
      
      // Write Raw JSON
      fs.writeFileSync(path.join(publicDir, chunkName), jsonBuffer);
      
      // Write Brotli (Level 4 for much faster builds)
      const brBuffer = await brotliCompress(jsonBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
      fs.writeFileSync(path.join(publicDir, `${chunkName}.br`), brBuffer);
      
      // Write Gzip
      const gzBuffer = await gzip(jsonBuffer, { level: 6 });
      fs.writeFileSync(path.join(publicDir, `${chunkName}.gz`), gzBuffer);
      
      console.log(`✅ Saved ${chunkName} (Raw: ${(jsonBuffer.length/1024/1024).toFixed(2)}MB, Brotli: ${(brBuffer.length/1024/1024).toFixed(2)}MB)`);
    }
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
      const isArticle = partsA.length === 5;

      const codeA = partsA[0];
      const codeB = partsB[0];
      const branchA = partsA[2];
      const branchB = partsB[2];
      const catA = isArticle ? partsA[3] : '';
      const catB = isArticle ? partsB[3] : '';

      // 1. Sort by Category: GM first, then alphabetical
      if (catA && catB && catA !== catB) {
         if (catA === 'GM') return -1;
         if (catB === 'GM') return 1;
         return catA.localeCompare(catB);
      }

      // 2. Sort by College Code
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

  const srcDir = path.resolve(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(srcDir, 'streams.json'), 
    JSON.stringify(streamSummaries, null, 2)
  );

  // Write individual metadata files per stream
  for (const [stream, data] of Object.entries(streams)) {
    delete data._seenRounds;
    data.lastUpdated = Date.now();
    
    // Extract articleCombinations to a separate file so meta_*.json stays tiny
    const archiveData = { 
      articleCombinations: data.articleCombinations || [] 
    };
    
    const metaData = { ...data };
    delete metaData.articleCombinations;

    // Write meta_*.json
    const jsonBuffer = Buffer.from(JSON.stringify(metaData));
    const filePath = path.join(publicDir, `meta_${stream}.json`);
    fs.writeFileSync(filePath, jsonBuffer);
    
    const brBuffer = await brotliCompress(jsonBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
    fs.writeFileSync(path.join(publicDir, `meta_${stream}.json.br`), brBuffer);
    
    const gzBuffer = await gzip(jsonBuffer, { level: 6 });
    fs.writeFileSync(path.join(publicDir, `meta_${stream}.json.gz`), gzBuffer);

    // Write archive_*.json
    const archiveBuffer = Buffer.from(JSON.stringify(archiveData));
    const archivePath = path.join(publicDir, `archive_${stream}.json`);
    fs.writeFileSync(archivePath, archiveBuffer);
    
    const archiveBrBuffer = await brotliCompress(archiveBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
    fs.writeFileSync(path.join(publicDir, `archive_${stream}.json.br`), archiveBrBuffer);
    
    const archiveGzBuffer = await gzip(archiveBuffer, { level: 6 });
    fs.writeFileSync(path.join(publicDir, `archive_${stream}.json.gz`), archiveGzBuffer);

    console.log(`✅ Wrote meta_${stream}.json (${data.colleges.length} colleges, ${data.branches.length} branches)`);
    console.log(`✅ Wrote archive_${stream}.json (${archiveData.articleCombinations.length} combinations)`);
  }

  // Generate sitemap.xml
  const domain = process.env.VITE_APP_DOMAIN || 'https://uninode.in';
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
  mainUrls.push({ loc: `${domain}/gear`, changefreq: 'daily', priority: '0.8' });
  mainUrls.push({ loc: `${domain}/option-entry`, changefreq: 'daily', priority: '0.9' });

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
        analyzerUrls.push({ loc: `${domain}/analyzer/${sId}/rank/${rb}/${encodeURIComponent(cat)}`, changefreq: 'weekly', priority: '0.7' });
        rankBucketCount++;
      }
    }
    
    // Branch pages
    if (streamData && streamData.branches) {
      for (const b of streamData.branches) {
        const bName = b.raw_name;
        if (!bName) continue;
        const bUrl = `${domain}/explorer/${sId}/branch/${slugify(bName)}`;
        explorerUrls.push({ loc: bUrl, changefreq: 'weekly', priority: '0.6' });
        branchCount++;
      }
    }

    // College pages
    if (streamData && streamData.colleges) {
      for (const c of streamData.colleges) {
        if (!c.college_code) continue;
        const cUrl = `${domain}/explorer/${sId}/college/${c.college_code.toLowerCase()}`;
        explorerUrls.push({ loc: cUrl, changefreq: 'weekly', priority: '0.6' });
        collegeCount++;
      }
    }

    // Combinations (College + Branch)
    if (streamData && streamData.combinations) {
      for (const combo of streamData.combinations) {
        const [cCode, cName, bName] = combo.split('::');
        if (!cCode || !bName) continue;
        const comboUrl = `${domain}/explorer/${sId}/branch/${slugify(bName)}?college=${cCode.toLowerCase()}`;
        cutoffUrls.push({ loc: comboUrl, changefreq: 'weekly', priority: '0.5' });
      }
    }

    // Article URLs and Pagination
    if (streamData && streamData.articleCombinations) {
      const perPage = 24;
      const totalPages = Math.ceil(streamData.articleCombinations.length / perPage);
      
      for (let p = 1; p <= totalPages; p++) {
        paginationUrls.push({ loc: `${domain}/articles/${sId}?page=${p}`, changefreq: 'weekly', priority: '0.6' });
      }

      for (const combo of streamData.articleCombinations) {
        const [cCode, cName, bName, cat, st] = combo.split('::');
        if (!cCode || !bName || !cat) continue;
        const articleUrl = `${domain}/articles/${sId}/${cCode.toLowerCase()}/${slugify(bName)}/${cat.toUpperCase()}`;
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
        chunkXml += `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
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