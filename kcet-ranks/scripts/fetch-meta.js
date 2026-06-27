import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import zlib from 'zlib';
import { promisify } from 'util';

const brotliCompress = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);
import { processCollegeChunks } from './precompute-suggestions.js';
import { calculateAdvancedMetrics } from './math-engine.js';

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

  // Helper to fix ALL CAPS branch names
  const toTitleCase = (str) => {
    if (!str) return str;
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  branchData.forEach(b => {
    if (b.raw_name) b.raw_name = toTitleCase(b.raw_name);
    if (b.parent_branches?.name) {
      b.parent_branches.name = toTitleCase(b.parent_branches.name);
    }
  });

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

    streams[stream] = { colleges: new Map(), branches: new Map(), rounds: roundData, combinations: new Set(), maxRankByCategory: {} };

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
      console.log(`Calculating advanced mathematical metrics for ${stream}...`);
      
      // Titlecase course names before metrics calculations
      allMatrixData.forEach(row => {
        if (row.course_name) row.course_name = toTitleCase(row.course_name);
      });

      allMatrixData = calculateAdvancedMetrics(allMatrixData);

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
        if (col && branch && col.college_name && row.max_rank > 0) {
          streams[stream].combinations.add(`${col.college_code}::${col.college_name}::${row.course_name}`);
        }
      });
    }

    // We no longer build streams.json here, we will scan the public dir at the end.

    // --- NEW: EXPORT COLLEGE-LEVEL STATIC CHUNKS ---
    const collegeDataDir = path.resolve(process.cwd(), 'public', 'college_data');
    if (!fs.existsSync(collegeDataDir)) fs.mkdirSync(collegeDataDir, { recursive: true });

    console.log(`Precomputing suggestions and splitting ${stream} by college...`);
    const collegeOutputs = processCollegeChunks(allMatrixData);
    
    for (const [collegeCode, dataObj] of Object.entries(collegeOutputs)) {
      const cBuffer = Buffer.from(JSON.stringify(dataObj));
      const cName = `kcet_${stream}_${collegeCode}.json`;
      fs.writeFileSync(path.join(collegeDataDir, cName), cBuffer);
      const cBrBuffer = await brotliCompress(cBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
      fs.writeFileSync(path.join(collegeDataDir, `${cName}.br`), cBrBuffer);
    }
    console.log(`✅ Saved ${Object.keys(collegeOutputs).length} college-specific files for ${stream}`);

    // --- SEO LOOKUP for Edge Function & SSG ---
    const seoLookup = {};
    for (const row of allMatrixData) {
      if (row.seat_type !== 'ROK') continue;
      const seoData = extractSeoData(row.rounds);
      if (!seoData) continue;
      const key = `${row.college_code}|${slugify(row.course_name)}|${row.category}`.toLowerCase();
      if (!seoLookup[key]) {
        seoLookup[key] = { ...seoData, code: row.college_code, advMath: row.advMath };
      }
    }
    const seoPublicDir = path.resolve(process.cwd(), 'public');
    const seoBuffer = Buffer.from(JSON.stringify(seoLookup));
    fs.writeFileSync(path.join(seoPublicDir, `seo_kcet_${stream}.json`), seoBuffer);
    const seoBrBuffer = await brotliCompress(seoBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
    fs.writeFileSync(path.join(seoPublicDir, `seo_kcet_${stream}.json.br`), seoBrBuffer);
    console.log(`✅ Wrote seo_kcet_${stream}.json (${Object.keys(seoLookup).length} entries, ${(seoBuffer.length/1024).toFixed(1)}KB)`);

    // --- NEW: EXPORT FULL COMPRESSED DATA IN CHUNKS ---
    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

    const groupedData = new Map();
    for (const row of allMatrixData) {
      const cat = row.category || 'GM';
      const seat = row.seat_type || 'ROK';
      const key = `${cat}_${seat}`;
      if (!groupedData.has(key)) {
        groupedData.set(key, []);
      }
      groupedData.get(key).push(row);
    }

    console.log(`Compressing ${allMatrixData.length} rows for ${stream} into ${groupedData.size} category-specific files...`);
    
    for (const [key, chunkData] of groupedData.entries()) {
      const jsonBuffer = Buffer.from(JSON.stringify(chunkData));
      const chunkName = `data_kcet_${stream}_${key}.json`;
      
      // Write Raw JSON
      fs.writeFileSync(path.join(publicDir, chunkName), jsonBuffer);
      
      // Write Brotli (Level 4 for much faster builds)
      const brBuffer = await brotliCompress(jsonBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
      fs.writeFileSync(path.join(publicDir, `${chunkName}.br`), brBuffer);
      
      // Write Gzip
      const gzBuffer = await gzip(jsonBuffer, { level: 6 });
      fs.writeFileSync(path.join(publicDir, `${chunkName}.gz`), gzBuffer);
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
  }

  // Write files to public folder
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  // We will build exams.json after writing all meta files.

  // Write individual metadata files per stream
  for (const [stream, data] of Object.entries(streams)) {
    delete data._seenRounds;
    data.lastUpdated = Date.now();
    
    // Extract combinations to a separate file so meta_*.json stays tiny
    const archiveData = { 
      articleCombinations: data.combinations || [] 
    };
    
    const metaData = { ...data };
    delete metaData.combinations;

    // Write meta_*.json
    const jsonBuffer = Buffer.from(JSON.stringify(metaData));
    const filePath = path.join(publicDir, `meta_kcet_${stream}.json`);
    fs.writeFileSync(filePath, jsonBuffer);
    
    const brBuffer = await brotliCompress(jsonBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
    fs.writeFileSync(path.join(publicDir, `meta_kcet_${stream}.json.br`), brBuffer);
    
    const gzBuffer = await gzip(jsonBuffer, { level: 6 });
    fs.writeFileSync(path.join(publicDir, `meta_kcet_${stream}.json.gz`), gzBuffer);

    // Write archive_*.json
    const archiveBuffer = Buffer.from(JSON.stringify(archiveData));
    const archivePath = path.join(publicDir, `archive_kcet_${stream}.json`);
    fs.writeFileSync(archivePath, archiveBuffer);
    
    const archiveBrBuffer = await brotliCompress(archiveBuffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
    fs.writeFileSync(path.join(publicDir, `archive_kcet_${stream}.json.br`), archiveBrBuffer);
    
    const archiveGzBuffer = await gzip(archiveBuffer, { level: 6 });
    fs.writeFileSync(path.join(publicDir, `archive_kcet_${stream}.json.gz`), archiveGzBuffer);

    console.log(`✅ Wrote meta_kcet_${stream}.json (${data.colleges.length} colleges, ${data.branches.length} branches)`);
    console.log(`✅ Wrote archive_kcet_${stream}.json (${archiveData.articleCombinations.length} combinations)`);
  }

  // --- BUILD GLOBAL EXAMS INDEX ---
  const EXAM_METADATA = {
    kcet: { title: 'KCET', desc: 'Karnataka Common Entrance Test', icon: 'GraduationCap', color: 'from-blue-500 to-indigo-600' },
    comedk: { title: 'COMEDK', desc: 'Consortium of Medical, Engineering and Dental Colleges of Karnataka', icon: 'Building2', color: 'from-emerald-500 to-teal-600' },
    dcet: { title: 'DCET', desc: 'Diploma Common Entrance Test', icon: 'Library', color: 'from-purple-500 to-fuchsia-600' }
  };

  const files = fs.readdirSync(publicDir);
  const examsMap = {};

  for (const file of files) {
    const match = file.match(/^meta_([^_]+)_(.+)\.json$/);
    if (match) {
      const examId = match[1];
      const streamId = match[2];

      if (!examsMap[examId]) {
        examsMap[examId] = {
          id: examId,
          title: EXAM_METADATA[examId]?.title || examId.toUpperCase(),
          desc: EXAM_METADATA[examId]?.desc || '',
          icon: EXAM_METADATA[examId]?.icon || 'Building2',
          color: EXAM_METADATA[examId]?.color || 'from-gray-500 to-gray-600',
          streams: []
        };
      }

      // Read file to get yearSummary
      const data = JSON.parse(fs.readFileSync(path.join(publicDir, file), 'utf-8'));
      const rounds = data.rounds || [];
      const yearSummaryMap = {};
      
      rounds.forEach(r => {
        if (!yearSummaryMap[r.year]) yearSummaryMap[r.year] = [];
        if (r.round_name && !yearSummaryMap[r.year].includes(r.round_name)) {
           yearSummaryMap[r.year].push(r.round_name);
        }
      });

      const yearSummary = Object.keys(yearSummaryMap)
        .map(y => parseInt(y))
        .sort((a,b) => b - a) // Most recent year first
        .map(year => ({ year, rounds: yearSummaryMap[year].sort() }));

      examsMap[examId].streams.push({
        id: streamId,
        yearSummary
      });
    }
  }

  // Sort streams per exam: engineering first, then alphabetically
  for (const examId of Object.keys(examsMap)) {
    examsMap[examId].streams.sort((a, b) => {
      if (a.id === 'engineering') return -1;
      if (b.id === 'engineering') return 1;
      return a.id.localeCompare(b.id);
    });
  }

  const examsArray = Object.values(examsMap);
  
  // Sort exams by order in EXAM_METADATA
  const orderedExamKeys = Object.keys(EXAM_METADATA);
  examsArray.sort((a, b) => {
    let idxA = orderedExamKeys.indexOf(a.id);
    let idxB = orderedExamKeys.indexOf(b.id);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });

  const examsJson = JSON.stringify(examsArray, null, 2);
  const srcDir = path.resolve(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(srcDir, 'exams.json'), examsJson);
  console.log(`✅ Built exams.json with ${examsArray.length} exams.`);

  // ═══════════════════════════════════════════════════════════════════
  //  SITEMAP GENERATION
  //  - sitemap.xml is a pure index (references child sitemaps only)
  //  - Each child sitemap is capped at 10,000 URLs
  //  - Option Entry URLs are excluded (too many combinations)
  //  - Analyzer uses smart rank buckets to keep URL count reasonable
  // ═══════════════════════════════════════════════════════════════════
  const domain = process.env.VITE_APP_DOMAIN || 'https://uninode.in';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const sitemapsDir = path.join(publicDir, 'sitemaps');
  if (!fs.existsSync(sitemapsDir)) fs.mkdirSync(sitemapsDir, { recursive: true });

  const mainUrls = [];
  
  // ── Static / Main Pages ──
  mainUrls.push({ loc: `${domain}/`, changefreq: 'daily', priority: '1.0' });
  mainUrls.push({ loc: `${domain}/kcet/`, changefreq: 'daily', priority: '0.9' });
  mainUrls.push({ loc: `${domain}/kcet/articles/`, changefreq: 'daily', priority: '0.9' });
  mainUrls.push({ loc: `${domain}/kcet/option-entry/`, changefreq: 'weekly', priority: '0.8' });
  mainUrls.push({ loc: `${domain}/gear/`, changefreq: 'weekly', priority: '0.7' });
  mainUrls.push({ loc: `${domain}/contact/`, changefreq: 'monthly', priority: '0.4' });
  mainUrls.push({ loc: `${domain}/privacy/`, changefreq: 'monthly', priority: '0.3' });
  mainUrls.push({ loc: `${domain}/terms/`, changefreq: 'monthly', priority: '0.3' });

  const streamSitemaps = {}; // Will hold arrays for articles, analyzer, explorer per stream

  let branchCount = 0;
  let collegeCount = 0;
  let rankBucketCount = 0;
  let articleCount = 0;

  const validStreams = Object.keys(streams);
  for (const sId of validStreams) {
    const streamData = streams[sId];
    streamSitemaps[sId] = {
      articles: [],
      analyzer: [],
      explorer: []
    };

    // ── Stream Landing Pages (go into main) ──
    mainUrls.push({ loc: `${domain}/kcet/${sId}/`, changefreq: 'weekly', priority: '0.8' });
    mainUrls.push({ loc: `${domain}/kcet/articles/${sId}/`, changefreq: 'weekly', priority: '0.7' });
    mainUrls.push({ loc: `${domain}/kcet/option-entry/${sId}/`, changefreq: 'weekly', priority: '0.8' });
    
    // ── Analyzer: Smart Rank Buckets ──
    const maxRankByCategory = streamData ? streamData.maxRankByCategory : {};
    for (const [cat, maxRank] of Object.entries(maxRankByCategory)) {
      if (!maxRank || maxRank <= 0) continue;
      
      const bucketLimit = Math.min(maxRank, 400000);
      const rankBuckets = [];
      
      // 1k steps up to 50k
      const phase1Limit = Math.min(bucketLimit, 50000);
      for (let r = 1000; r <= phase1Limit; r += 1000) {
        rankBuckets.push(r);
      }
      // 5k steps from 50k to max
      if (bucketLimit > 50000) {
        for (let r = 55000; r <= bucketLimit; r += 5000) {
          rankBuckets.push(r);
        }
      }
      
      for (const rb of rankBuckets) {
        streamSitemaps[sId].analyzer.push({ loc: `${domain}/kcet/${sId}/analyzer/rank/${rb}/?cat=${encodeURIComponent(cat)}`, changefreq: 'weekly', priority: '0.6' });
        rankBucketCount++;
      }
    }
    
    // ── Explorer: Branch Pages ──
    if (streamData && streamData.branches) {
      for (const b of streamData.branches) {
        const bName = b.raw_name;
        if (!bName) continue;
        streamSitemaps[sId].explorer.push({ loc: `${domain}/kcet/${sId}/explorer/branch/${slugify(bName)}/`, changefreq: 'weekly', priority: '0.6' });
        branchCount++;
      }
    }

    // ── Explorer: College Pages ──
    if (streamData && streamData.colleges) {
      for (const c of streamData.colleges) {
        if (!c.college_code) continue;
        streamSitemaps[sId].explorer.push({ loc: `${domain}/kcet/${sId}/explorer/college/${c.college_code.toLowerCase()}/`, changefreq: 'weekly', priority: '0.6' });
        collegeCount++;
      }
    }

    // ── Article Pages ──
    if (streamData && streamData.combinations) {
      // Pagination pages (we add these to the stream's articles sitemap)
      const perPage = 24;
      const totalPages = Math.ceil(streamData.combinations.length / perPage);
      for (let p = 2; p <= totalPages; p++) {
        streamSitemaps[sId].articles.push({ loc: `${domain}/kcet/articles/${sId}/?page=${p}`, changefreq: 'weekly', priority: '0.5' });
      }

      // Individual article pages (Combinations are pre-verified college+branch pairs from data)
      for (const combo of streamData.combinations) {
        const [cCode, cName, bName] = combo.split('::');
        if (!cCode || !bName) continue;
        // In the new URL format, category is ?c=
        // We will just generate the base article URL (which handles all categories via query params or selector)
        // If you want every single category URL in the sitemap, it multiplies it heavily. We stick to base article path for SEO.
        streamSitemaps[sId].articles.push({ loc: `${domain}/kcet/articles/${sId}/${cCode.toLowerCase()}/${slugify(bName)}/`, changefreq: 'weekly', priority: '0.5' });
        articleCount++;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════
  //  WRITE SITEMAPS (max 10,000 URLs per file)
  // ═══════════════════════════════════════════════════════════════════
  const URLS_PER_SITEMAP = 10000;
  
  // Clean up old sitemaps in sitemaps/ dir
  fs.readdirSync(sitemapsDir).forEach(file => {
    if (file.endsWith('.xml')) {
      fs.unlinkSync(path.join(sitemapsDir, file));
    }
  });

  let sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  let totalSitemapFiles = 0;
  
  function writeChunkedSitemaps(filenamePrefix, urls) {
    if (urls.length === 0) return;
    const numChunks = Math.ceil(urls.length / URLS_PER_SITEMAP);
    
    for (let i = 0; i < numChunks; i++) {
      const filename = numChunks === 1 ? `${filenamePrefix}.xml` : `${filenamePrefix}_${i + 1}.xml`;
      // We will host them at /sitemaps/...
      sitemapIndexXml += `  <sitemap>\n    <loc>${domain}/sitemaps/${filename}</loc>\n    <lastmod>${currentDate}</lastmod>\n  </sitemap>\n`;
      
      const chunk = urls.slice(i * URLS_PER_SITEMAP, (i + 1) * URLS_PER_SITEMAP);
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      for (const u of chunk) {
        xml += `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
      }
      xml += `</urlset>`;
      fs.writeFileSync(path.join(sitemapsDir, filename), xml);
      totalSitemapFiles++;
    }
    console.log(`   📄 ${filenamePrefix}: ${urls.length} URLs → ${numChunks} file(s)`);
  }

  writeChunkedSitemaps('sitemap-main', mainUrls);
  
  for (const sId of validStreams) {
    writeChunkedSitemaps(`sitemap_kcet_${sId}_articles`, streamSitemaps[sId].articles);
    writeChunkedSitemaps(`sitemap_kcet_${sId}_analyzer`, streamSitemaps[sId].analyzer);
    writeChunkedSitemaps(`sitemap_kcet_${sId}_explorer`, streamSitemaps[sId].explorer);
  }

  sitemapIndexXml += `</sitemapindex>`;
  // Write the index file into the sitemaps/ folder
  fs.writeFileSync(path.join(sitemapsDir, 'sitemap.xml'), sitemapIndexXml);
  // Optional: Also place a copy at the root / publicDir for standard search engine crawling
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapIndexXml);
  
  console.log(`\n✅ Sitemap Summary:`);
  console.log(`   Total Sitemap Files: ${totalSitemapFiles}`);
  console.log(`   Index: /sitemaps/sitemap.xml`);
}

fetchMetadata();