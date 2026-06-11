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

  // 1. Fetch colleges
  const { data: collegeData, error: collegeError } = await supabase
    .from('colleges')
    .select('college_code, college_name, search_terms, stream')
    .order('college_code');

  if (collegeError) {
    console.error('Failed to fetch colleges:', collegeError);
    process.exit(1);
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

    streams[stream] = { colleges: new Map(), branches: new Map(), rounds: roundData, combinations: new Set() };

    // Fetch matrix data to discover active colleges and branches for this stream
    let allMatrixData = [];
    let start = 0;
    const step = 1000;
    while(true) {
      const { data: matrixData, error: matrixError } = await supabase
        .from(`cutoffs_matrix_${stream}`)
        .select('college_code, course_name')
        .range(start, start + step - 1);

      if (matrixError || !matrixData || matrixData.length === 0) break;
      allMatrixData.push(...matrixData);
      if (matrixData.length < step) break;
      start += step;
    }

    if (allMatrixData.length > 0) {
      allMatrixData.forEach(row => {
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
    if (streams[streamKey].combinations) {
      streams[streamKey].combinations = Array.from(streams[streamKey].combinations);
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
  }

  // Generate sitemap.xml
  const domain = process.env.VITE_APP_DOMAIN || 'https://kcet.uninode.in';
  const currentDate = new Date().toISOString();
  
  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemapXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Home page
  sitemapXml += `  <url>\n`;
  sitemapXml += `    <loc>${domain}/</loc>\n`;
  sitemapXml += `    <lastmod>${currentDate}</lastmod>\n`;
  sitemapXml += `    <changefreq>daily</changefreq>\n`;
  sitemapXml += `    <priority>1.0</priority>\n`;
  sitemapXml += `  </url>\n`;

  // Static Legal Pages
  const staticPages = ['privacy', 'terms'];
  for (const page of staticPages) {
    sitemapXml += `  <url>\n`;
    sitemapXml += `    <loc>${domain}/${page}</loc>\n`;
    sitemapXml += `    <lastmod>${currentDate}</lastmod>\n`;
    sitemapXml += `    <changefreq>monthly</changefreq>\n`;
    sitemapXml += `    <priority>0.5</priority>\n`;
    sitemapXml += `  </url>\n`;
  }

  // Stream pages, Branch pages, and College pages
  let branchCount = 0;
  let collegeCount = 0;
  let rankBucketCount = 0;

  for (const streamObj of streamSummaries) {
    const sId = streamObj.id;
    // Main stream page
    sitemapXml += `  <url>\n`;
    sitemapXml += `    <loc>${domain}/${sId}</loc>\n`;
    sitemapXml += `    <lastmod>${currentDate}</lastmod>\n`;
    sitemapXml += `    <changefreq>weekly</changefreq>\n`;
    sitemapXml += `    <priority>0.8</priority>\n`;
    sitemapXml += `  </url>\n`;

    // Strategic Rank Buckets for Analyzer mode
    const rankBuckets = [1000, 5000, 10000, 25000, 50000, 100000];
    for (const rb of rankBuckets) {
      sitemapXml += `  <url>\n    <loc>${domain}/${sId}?mode=analyzer&amp;rank=${rb}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      rankBucketCount++;
    }

    const streamData = streams[sId];
    
    // Branch pages
    if (streamData && streamData.branches) {
      for (const b of streamData.branches) {
        const bName = b.parent_branches ? b.parent_branches.name : b.raw_name;
        if (!bName) continue;
        const bUrl = `${domain}/${sId}?mode=explorer&amp;branches=${encodeURIComponent(bName).replace(/%20/g, '+')}`;
        sitemapXml += `  <url>\n    <loc>${bUrl}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        branchCount++;
      }
    }

    // College pages
    if (streamData && streamData.colleges) {
      for (const c of streamData.colleges) {
        if (!c.college_name) continue;
        const cUrl = `${domain}/${sId}?mode=explorer&amp;college=${encodeURIComponent(c.college_name).replace(/%20/g, '+').replace(/&/g, '%26')}`;
        sitemapXml += `  <url>\n    <loc>${cUrl}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        collegeCount++;
      }
    }

    // Combinations (College + Branch)
    if (streamData && streamData.combinations) {
      for (const combo of streamData.combinations) {
        const [cName, bName] = combo.split('::');
        if (!cName || !bName) continue;
        const comboUrl = `${domain}/${sId}?mode=explorer&amp;college=${encodeURIComponent(cName).replace(/%20/g, '+').replace(/&/g, '%26')}&amp;branches=${encodeURIComponent(bName).replace(/%20/g, '+')}`;
        sitemapXml += `  <url>\n    <loc>${comboUrl}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
      }
    }
  }
  
  sitemapXml += `</urlset>`;
  
  let totalCombos = 0;
  for (const s of Object.keys(streams)) {
    if (streams[s].combinations) totalCombos += streams[s].combinations.length;
  }
  
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml);
  console.log(`✅ Wrote sitemap.xml (1 home + ${streamSummaries.length} streams + ${rankBucketCount} rank buckets + ${branchCount} branches + ${collegeCount} colleges + ${totalCombos} combinations)`);

  console.log('Metadata generation complete!');
}

fetchMetadata();
