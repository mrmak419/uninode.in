function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Truncate long college names to a clean short form for SEO titles
// e.g., "PES University 100 Feet Ring Road, Banashankari..." → "PES University"
function cleanCollegeName(name) {
  if (!name) return '';
  return name.split('(')[0].split(',')[0].trim();
}

// Format a rank number with Indian-style commas (1,23,456)
function formatRank(rank) {
  if (rank === null || rank === undefined || rank === '--') return '--';
  return Math.round(Number(rank)).toLocaleString('en-IN');
}

// Module-level caches — survive across requests in the same worker isolate
// seoCache: eliminates re-fetching the ~5MB SEO lookup on every request
// collegeChunkCache: eliminates re-fetching per-college data when bot crawls multiple branches
// knownStreamsCache: validated stream IDs from streams.json (built at deploy time)
const seoCache = new Map();
const collegeChunkCache = new Map();
let knownStreamsCache = null;

async function getKnownStreams(context, origin) {
  if (knownStreamsCache) {
    console.log('[CACHE HIT] knownStreams');
    return knownStreamsCache;
  }
  console.log('[CACHE MISS] knownStreams — fetching streams.json');
  try {
    const res = await context.env.ASSETS.fetch(
      new Request(new URL('/streams.json', origin))
    );
    if (res.ok) {
      const streams = await res.json();
      knownStreamsCache = new Set(streams.map(s => s.id));
      return knownStreamsCache;
    }
  } catch(e) {}
  return null;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Quick bypass for static assets to prevent routing issues with query params
  if (url.pathname.match(/\.(xml|json|txt|png|jpg|jpeg|svg|css|js|ico)$/i)) {
    return context.next();
  }

  // Redirect old parameterized URLs to clean URLs
  if (url.searchParams.has('mode')) {
    const mode = url.searchParams.get('mode');
    const pathStream = url.pathname.slice(1).split('/')[0] || 'engineering';
    
    if (mode === 'analyzer') {
      const rank = url.searchParams.get('rank');
      const cat = url.searchParams.get('cat') || 'GM';
      if (rank) {
        return Response.redirect(`${url.origin}/analyzer/${pathStream}/rank/${rank}/${cat}`, 301);
      }
    } else if (mode === 'explorer') {
      const college = url.searchParams.get('college');
      const branches = url.searchParams.get('branches');
      if (college) {
        return Response.redirect(`${url.origin}/explorer/${pathStream}/college/${encodeURIComponent(college)}`, 301);
      } else if (branches) {
        return Response.redirect(`${url.origin}/explorer/${pathStream}/branch/${encodeURIComponent(branches.split(',')[0])}`, 301);
      }
    }
  }

  // Redirect legacy /article?stream=... to /articles/stream/college/branch/cat
  if (url.pathname === '/article' || url.pathname === '/article/') {
    const stream = url.searchParams.get('stream') || 'engineering';
    const college = url.searchParams.get('college');
    const branch = url.searchParams.get('branch');
    const cat = url.searchParams.get('cat');
    
    if (college && branch && cat) {
      return Response.redirect(`${url.origin}/articles/${stream}/${encodeURIComponent(college)}/${encodeURIComponent(branch)}/${encodeURIComponent(cat)}`, 301);
    } else {
      return Response.redirect(`${url.origin}/articles/${stream}`, 301);
    }
  }

  // Get the static asset response from the Pages asset server
  let response = await context.next();
  
  // If static asset is not found (e.g., /engineering), manually fallback to index.html for SPA routing.
  // This ensures local `wrangler pages dev` behaves exactly like the live Cloudflare environment.
  if (response.status === 404) {
    const fallbackUrl = new URL('/index.html', context.request.url);
    response = await context.env.ASSETS.fetch(new Request(fallbackUrl));
  }
  
  // Only modify HTML responses
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  const pathParts = url.pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  
  let streamRaw = 'engineering';
  let stream = 'KCET';
  let pageTitle = `KCET Cutoffs | Uninode KCET Cutoff Analyzer`;
  let pageDescription = `Analyze historical KCET cutoff trends. Discover eligible colleges for your rank with the Uninode KCET Cutoff Analyzer.`;
  let isArticle = false;
  let articleSeo = null; // Will hold real cutoff data for article pages
  let seoDataMap = null; // Will hold the parsed seo lookup object
  let articleParts = null; // { college, branch, cat } decoded from URL

  // Helper to format slugs like 'computer-science' or 'computer%20science' to 'Computer Science'
  const formatSlug = (slug) => {
    if (!slug) return '';
    try { slug = decodeURIComponent(slug); } catch(e) {}
    return slug.split(/[- ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatStream = (slug) => {
    if (!slug) return 'KCET';
    try { slug = decodeURIComponent(slug); } catch(e) {}
    return slug.split(/[_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (pathParts.length > 0) {
    const section = pathParts[0].toLowerCase();
    
    if (section === 'articles') {
      streamRaw = pathParts[1] || 'engineering';
      stream = formatStream(streamRaw);
      
      if (pathParts.length >= 4) {
        isArticle = true;
        // Decode URL segments
        let collegeDec = '', branchDec = '', catDec = '';
        try { collegeDec = decodeURIComponent(pathParts[2]); } catch(e) { collegeDec = pathParts[2]; }
        try { branchDec = decodeURIComponent(pathParts[3]); } catch(e) { branchDec = pathParts[3]; }
        catDec = pathParts[4] ? pathParts[4].toUpperCase() : '';
        
        articleParts = { college: collegeDec, branch: branchDec, cat: catDec };
        const collegeShort = cleanCollegeName(collegeDec);
        
        // Try to fetch real cutoff data from the pre-built SEO lookup
        try {
          if (!seoCache.has(streamRaw)) {
              console.log(`[CACHE MISS] seoCache(${streamRaw}) — fetching seo_${streamRaw}.json`);
              const seoRes = await context.env.ASSETS.fetch(
                new Request(new URL(`/seo_${streamRaw}.json`, url.origin))
              );
              if (seoRes.ok) {
                seoCache.set(streamRaw, await seoRes.json());
              }
            } else {
              console.log(`[CACHE HIT] seoCache(${streamRaw})`);
            }
          seoDataMap = seoCache.get(streamRaw) || null;
          if (seoDataMap) {
            const lookupKey = `${collegeDec}|${branchDec}|${catDec}`.toLowerCase();
            articleSeo = seoDataMap[lookupKey] || null;
          }
        } catch(e) {
          // Graceful fallback — SEO lookup failed, use generic meta
        }

        if (articleSeo) {
          // DATA-AWARE: Rich title & description with real rank data
          const rank = formatRank(articleSeo.r);
          const year = articleSeo.y;
          const round = articleSeo.rd;
          
          pageTitle = `${collegeShort} ${branchDec} ${catDec} Cutoff ${year} – Rank ${rank} | Uninode KCET`;
          
          let descParts = [`The KCET ${catDec} cutoff for ${branchDec} at ${collegeShort} was ${rank} in ${year} (Round ${round}).`];
          
          // Add trend info if previous year data exists
          if (articleSeo.pr && articleSeo.py) {
            const prevRank = formatRank(articleSeo.pr);
            const diff = articleSeo.r - articleSeo.pr;
            if (diff > 0) {
              descParts.push(`Eased from ${prevRank} in ${articleSeo.py}.`);
            } else if (diff < 0) {
              descParts.push(`Tightened from ${prevRank} in ${articleSeo.py}.`);
            } else {
              descParts.push(`Stable since ${articleSeo.py}.`);
            }
          }
          
          // Add round-by-round info
          if (articleSeo.r1 && articleSeo.r1 !== articleSeo.r) {
            descParts.push(`Round 1 was ${formatRank(articleSeo.r1)}.`);
          }
          
          descParts.push('Compare all rounds & years.');
          pageDescription = descParts.join(' ');
        } else {
          // FALLBACK: Generic article meta (SEO lookup miss or not available)
          pageTitle = `${collegeShort} – ${branchDec} ${catDec} Cutoffs | ${stream}`;
          pageDescription = `Check the latest KCET cutoff ranks for ${branchDec} at ${collegeShort} for ${catDec} category. Compare historical trends.`;
        }
      } else {
        pageTitle = `${stream} College Articles & Cutoffs | Uninode`;
        pageDescription = `Browse all colleges and branches for ${stream} cutoffs.`;
      }
    } else if (section === 'explorer') {
      streamRaw = pathParts[1] || 'engineering';
      stream = formatStream(streamRaw);
      const name = formatSlug(pathParts[3]);
      pageTitle = `${name} KCET Cutoffs | ${stream} Explorer`;
      pageDescription = `Explore KCET cutoff trends for ${name} in ${stream}.`;
    } else if (section === 'analyzer') {
      streamRaw = pathParts[1] || 'engineering';
      stream = formatStream(streamRaw);
      const rank = pathParts[3];
      const cat = pathParts[4] ? pathParts[4].toUpperCase() : '';
      const formattedRank = parseInt(rank || '0').toLocaleString('en-IN');
      const catSuffix = cat ? ` in ${cat} Category` : '';
      pageTitle = `Top ${stream} Colleges for ${formattedRank} Rank${catSuffix} | KCET Cutoffs`;
      pageDescription = `Discover the best ${stream} colleges you can get with a KCET rank of ${formattedRank}${catSuffix}.`;
    } else if (section === 'gear') {
      streamRaw = 'engineering';
      const categorySlug = pathParts[1];
      if (categorySlug) {
        pageTitle = `Best ${formatSlug(categorySlug)} for Engineering Students | Uninode Gear`;
        pageDescription = `Top recommended ${formatSlug(categorySlug)} for engineering students in college.`;
      } else {
        pageTitle = `Uninode Gear | Recommended Laptops & Tech for College`;
        pageDescription = `The best laptops, tablets, and accessories recommended for engineering students.`;
      }
    } else {
      // Root stream route (e.g. /engineering) — validate against build-time streams.json
      const candidate = pathParts[0].toLowerCase();
      const validStreams = await getKnownStreams(context, url.origin);
      if (validStreams && validStreams.has(candidate)) {
        streamRaw = candidate;
        stream = formatStream(streamRaw);
        pageTitle = `${stream} Cutoffs | Uninode KCET Cutoff Analyzer`;
        pageDescription = `Analyze historical KCET cutoff trends for ${stream}. Discover eligible colleges for your rank.`;
      } else {
        pageTitle = `Page Not Found | Uninode KCET`;
        pageDescription = `The page you're looking for doesn't exist. Browse KCET cutoffs and college data on Uninode.`;
      }
    }
  }

  const safeTitle = escapeHtml(pageTitle);
  const safeDescription = escapeHtml(pageDescription);

  // Use Cloudflare's HTMLRewriter to inject the metadata instantly at the edge
  return new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(pageTitle);
      }
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute("content", pageDescription);
      }
    })
    .on('head', {
      element(element) {
        element.append(`<meta property="og:title" content="${safeTitle}" />\n`, { html: true });
        element.append(`<meta property="og:description" content="${safeDescription}" />\n`, { html: true });
        element.append(`<meta property="og:type" content="${isArticle ? 'article' : 'website'}" />\n`, { html: true });
        element.append(`<meta name="twitter:card" content="summary_large_image" />\n`, { html: true });
        element.append(`<meta name="twitter:title" content="${safeTitle}" />\n`, { html: true });
        element.append(`<meta name="twitter:description" content="${safeDescription}" />\n`, { html: true });
        
        // Edge Preloading for meta json to eliminate React waterfall delay
        const preloadStream = streamRaw || 'engineering';
        element.append(`<link rel="preload" href="/meta_${preloadStream}.json" as="fetch" crossorigin="anonymous" />\n`, { html: true });
        
        // --- JSON-LD Structured Data ---
        if (isArticle && articleParts) {
          // ARTICLE PAGE: Inject Article, FAQPage, and BreadcrumbList schemas
          const collegeShort = cleanCollegeName(articleParts.college);
          
          // 1. Article Schema
          const articleLd = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": pageTitle,
            "description": pageDescription,
            "image": [
              url.origin + "/logo.png"
            ],
            "author": { 
              "@type": "Organization", 
              "name": "Uninode",
              "url": url.origin
            },
            "publisher": { 
              "@type": "Organization", 
              "name": "Uninode",
              "logo": {
                "@type": "ImageObject",
                "url": url.origin + "/logo.png"
              }
            }
          };
          if (articleSeo) {
            articleLd.datePublished = `${articleSeo.y}-01-01T00:00:00+05:30`;
            articleLd.dateModified = new Date().toISOString();
          }
          const safeArticleLd = JSON.stringify(articleLd).replace(/</g, '\\u003c');
          element.append(`<script type="application/ld+json">\n${safeArticleLd}\n</script>\n`, { html: true });
          
          // 2. FAQPage Schema (bot-visible! was previously only client-side)
          if (articleSeo) {
            const faqQuestions = [];
            
            // Q1: What rank do I need?
            faqQuestions.push({
              "@type": "Question",
              "name": `What rank do I need for ${articleParts.branch} at ${collegeShort} (${articleParts.cat})?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Based on ${articleSeo.y} data, you need a rank of ${formatRank(articleSeo.r1)} or better in Round 1. The final Round ${articleSeo.rd} cutoff was ${formatRank(articleSeo.r)}, meaning students with ranks up to ${formatRank(articleSeo.r)} were admitted by the end of counseling.`
              }
            });
            
            // Q2: Is it getting easier or harder?
            if (articleSeo.pr && articleSeo.py) {
              const trend = articleSeo.r > articleSeo.pr ? 'easing' : articleSeo.r < articleSeo.pr ? 'tightening' : 'stable';
              const trendText = trend === 'easing' 
                ? `Easing. The closing rank increased from ${formatRank(articleSeo.pr)} in ${articleSeo.py} to ${formatRank(articleSeo.r)} in ${articleSeo.y}, meaning competition has relaxed.`
                : trend === 'tightening'
                ? `More competitive. The cutoff tightened from ${formatRank(articleSeo.pr)} in ${articleSeo.py} to ${formatRank(articleSeo.r)} in ${articleSeo.y}.`
                : `Perfectly stable. The cutoff remained at ${formatRank(articleSeo.r)} from ${articleSeo.py} to ${articleSeo.y}.`;
              
              faqQuestions.push({
                "@type": "Question",
                "name": `Is ${articleParts.branch} at ${collegeShort} getting easier or harder to get into?`,
                "acceptedAnswer": { "@type": "Answer", "text": trendText }
              });
            }
            
            // Q3: Should I wait for later rounds?
            if (articleSeo.r1 && articleSeo.r && articleSeo.r > articleSeo.r1) {
              faqQuestions.push({
                "@type": "Question",
                "name": `Do cutoffs drop in later rounds for ${articleParts.branch} at ${collegeShort}?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `Yes. In ${articleSeo.y}, the cutoff relaxed from ${formatRank(articleSeo.r1)} in Round 1 to ${formatRank(articleSeo.r)} in Round ${articleSeo.rd}. If your rank is close to Round 1, waiting may be viable.`
                }
              });
            }
            
            // Q4: Borderline ranks
            faqQuestions.push({
              "@type": "Question",
              "name": `Can I get admission for ${articleParts.branch} at ${collegeShort} if my rank is slightly above the cutoff?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `KCET cutoffs vary annually based on candidate preferences and seat matrix. If your rank is close to ${formatRank(articleSeo.r)}, you should definitely include ${collegeShort} in your option entry list during counseling.`
              }
            });
            
            // Q5: Counseling authority
            faqQuestions.push({
              "@type": "Question",
              "name": `Which counseling authority handles admissions for ${stream} at ${collegeShort}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Admissions for ${stream} courses at ${collegeShort} are administered by the Karnataka Examinations Authority (KEA) based on KCET rank merit.`
              }
            });
            
            if (faqQuestions.length > 0) {
              const faqLd = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": faqQuestions
              };
              const safeFaqLd = JSON.stringify(faqLd).replace(/</g, '\\u003c');
              element.append(`<script type="application/ld+json">\n${safeFaqLd}\n</script>\n`, { html: true });
            }
          }
          
          // 3. BreadcrumbList Schema
          const breadcrumbLd = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": url.origin + "/" },
              { "@type": "ListItem", "position": 2, "name": `${stream} Articles`, "item": url.origin + "/articles/" + streamRaw },
              { "@type": "ListItem", "position": 3, "name": collegeShort, "item": url.origin + "/explorer/" + streamRaw + "/college/" + encodeURIComponent(articleParts.college) },
              { "@type": "ListItem", "position": 4, "name": `${articleParts.branch} (${articleParts.cat})`, "item": url.origin + url.pathname }
            ]
          };
          const safeBreadcrumbLd = JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c');
          element.append(`<script type="application/ld+json">\n${safeBreadcrumbLd}\n</script>\n`, { html: true });
          
        } else {
          // NON-ARTICLE PAGES: Standard WebApplication schema
          const jsonLd = {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": pageTitle,
            "applicationCategory": "EducationalApplication",
            "description": pageDescription,
            "offers": {
              "@type": "Offer",
              "price": "0"
            }
          };
          const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
          element.append(`<script type="application/ld+json">\n${safeJsonLd}\n</script>\n`, { html: true });
        }
        
        // SEO: Canonical URL to prevent duplicate content penalties
        // Using clean pathname without search parameters to consolidate SEO juice
        const canonicalUrl = new URL(url.origin + url.pathname);
        element.append(`<link rel="canonical" href="${escapeHtml(canonicalUrl.toString())}" />\n`, { html: true });
      }
    })
    .on('div#root', {
      async element(element) {
        if (isArticle && articleSeo && articleParts && seoDataMap) {
          const collegeShort = cleanCollegeName(articleParts.college);
          const rank = formatRank(articleSeo.r);
          const year = articleSeo.y;
          const round = articleSeo.rd;
          const r1Rank = formatRank(articleSeo.r1);
          
          // Find other categories for the same college and branch
          const otherCats = [];
          const prefix = `${articleParts.college}|${articleParts.branch}|`.toLowerCase();
          for (const key of Object.keys(seoDataMap)) {
            if (key.startsWith(prefix)) {
              const catFromKey = key.slice(prefix.length).toUpperCase();
              if (catFromKey !== articleParts.cat) {
                otherCats.push(catFromKey);
              }
            }
          }
          otherCats.sort();
          
          let fallbackHtml = `\n  <div style="padding: 20px; border: 1px solid #ccc; margin: 20px; font-family: sans-serif; background-color: #fff; border-radius: 8px;">\n    <div style="margin-bottom: 15px; font-size: 14px; color: #666;">\n      <a href="/" style="color: #0284c7; text-decoration: none;">Home</a> &raquo; \n      <a href="/articles/${streamRaw}" style="color: #0284c7; text-decoration: none;">${escapeHtml(stream)} Articles</a> &raquo; \n      <a href="/explorer/${streamRaw}/college/${encodeURIComponent(articleParts.college)}" style="color: #0284c7; text-decoration: none;">${escapeHtml(collegeShort)} Explorer</a>\n    </div>\n    <h2 style="margin-top: 10px;">${escapeHtml(collegeShort)} ${escapeHtml(articleParts.branch)} Cutoff Matrix (${escapeHtml(articleParts.cat)})</h2>\n    <p><strong>Counselling Stream:</strong> ${escapeHtml(stream)}</p>\n    <table border="1" cellpadding="8" style="border-collapse: collapse; margin-top: 10px; width: 100%; text-align: left;">\n      <thead>\n        <tr style="background-color: #f2f2f2;">\n          <th>Year</th>\n          <th>Round 1 Cutoff</th>\n          <th>Closing Cutoff (Round ${round})</th>\n        </tr>\n      </thead>\n      <tbody>\n        <tr>\n          <td>${year}</td>\n          <td>${r1Rank}</td>\n          <td>${rank}</td>\n        </tr>\n`;
          
          if (articleSeo.pr && articleSeo.py) {
            fallbackHtml += `        <tr>\n          <td>${articleSeo.py}</td>\n          <td>--</td>\n          <td>${formatRank(articleSeo.pr)}</td>\n        </tr>\n`;
          }
          
          fallbackHtml += `      </tbody>\n    </table>\n    <h3 style="margin-top: 20px;">Frequently Asked Questions</h3>\n    <ul>\n      <li><strong>What rank do I need for ${escapeHtml(articleParts.branch)} at ${escapeHtml(collegeShort)} (${escapeHtml(articleParts.cat)})?</strong><br/>Based on ${year} data, you need a rank of ${r1Rank} or better in Round 1. The final Round ${round} cutoff was ${rank}.</li>\n`;
          
          if (articleSeo.pr && articleSeo.py) {
            const trend = articleSeo.r > articleSeo.pr ? 'easing' : articleSeo.r < articleSeo.pr ? 'tightening' : 'stable';
            const trendText = trend === 'easing'
              ? `Easing. The closing rank increased from ${formatRank(articleSeo.pr)} in ${articleSeo.py} to ${rank} in ${year}.`
              : trend === 'tightening'
              ? `More competitive. The cutoff tightened from ${formatRank(articleSeo.pr)} in ${articleSeo.py} to ${rank} in ${year}.`
              : `Stable. The cutoff remained at ${rank} from ${articleSeo.py} to ${year}.`;
            fallbackHtml += `      <li><strong>Is ${escapeHtml(articleParts.branch)} at ${escapeHtml(collegeShort)} getting easier or harder to get into?</strong><br/>${trendText}</li>\n`;
          }
          
          if (articleSeo.r1 && articleSeo.r && articleSeo.r > articleSeo.r1) {
            fallbackHtml += `      <li><strong>Do cutoffs drop in later rounds for ${escapeHtml(articleParts.branch)} at ${escapeHtml(collegeShort)}?</strong><br/>Yes. In ${year}, the cutoff relaxed from ${r1Rank} in Round 1 to ${rank} in Round ${round}.</li>\n`;
          }
          
          fallbackHtml += `      <li><strong>Can I get admission for ${escapeHtml(articleParts.branch)} at ${escapeHtml(collegeShort)} if my rank is slightly above the cutoff?</strong><br/>KCET cutoffs vary annually. If your rank is close to ${rank}, you should include ${escapeHtml(collegeShort)} in your option entry list.</li>\n      <li><strong>Which counseling authority handles admissions for ${escapeHtml(stream)} at ${escapeHtml(collegeShort)}?</strong><br/>Admissions are administered by the Karnataka Examinations Authority (KEA) based on KCET rank merit.</li>\n    </ul>\n`;
          
          if (otherCats.length > 0) {
            fallbackHtml += `    <h3 style="margin-top: 20px;">View Cutoffs for Other Categories</h3>\n    <p style="line-height: 1.6;">\n`;
            fallbackHtml += otherCats.map(cat => {
              const catUrl = `/articles/${streamRaw}/${encodeURIComponent(articleParts.college)}/${encodeURIComponent(articleParts.branch)}/${encodeURIComponent(cat)}`;
              return `      <a href="${catUrl}" style="color: #0284c7; text-decoration: none; margin-right: 12px; display: inline-block; font-weight: 600;">${escapeHtml(cat)}</a>`;
            }).join(', \n');
            fallbackHtml += `\n    </p>\n`;
          }
          
          // --- CTA Internal Links (mirrors ArticleCTABlocks) ---
          fallbackHtml += `    <h3 style="margin-top: 24px;">Explore More</h3>\n    <ul style="list-style: none; padding: 0;">\n`;
          fallbackHtml += `      <li style="margin-bottom: 8px;"><a href="/explorer/${streamRaw}/college/${encodeURIComponent(articleParts.college)}?cat=${encodeURIComponent(articleParts.cat)}&seat=ROK" style="color: #0284c7; text-decoration: none; font-weight: 600;">📊 Explore all branches at ${escapeHtml(collegeShort)}</a></li>\n`;
          fallbackHtml += `      <li style="margin-bottom: 8px;"><a href="/explorer/${streamRaw}/branch/${encodeURIComponent(articleParts.branch)}?cat=${encodeURIComponent(articleParts.cat)}&seat=ROK" style="color: #0284c7; text-decoration: none; font-weight: 600;">🔍 Compare ${escapeHtml(articleParts.branch)} across all colleges</a></li>\n`;
          fallbackHtml += `      <li style="margin-bottom: 8px;"><a href="/gear" style="color: #0284c7; text-decoration: none; font-weight: 600;">🎒 College essentials & recommended gear</a></li>\n`;
          fallbackHtml += `    </ul>\n`;
          
          // --- Related Articles: Precomputed Suggestions (same source as React) ---
          try {
            const chunkKey = `${streamRaw}_${articleSeo.code}`;
            if (!collegeChunkCache.has(chunkKey)) {
              console.log(`[CACHE MISS] collegeChunk(${chunkKey}) — fetching`);
              const collegeChunkRes = await context.env.ASSETS.fetch(
                new Request(new URL(`/college_data/${chunkKey}.json`, url.origin))
              );
              if (collegeChunkRes.ok) {
                collegeChunkCache.set(chunkKey, await collegeChunkRes.json());
              }
            } else {
              console.log(`[CACHE HIT] collegeChunk(${chunkKey})`);
            }
            const collegeChunk = collegeChunkCache.get(chunkKey);
            if (collegeChunk) {
              const suggKey = `${articleParts.branch}|${articleParts.cat}|ROK`;
              const suggestion = (collegeChunk.suggestions || {})[suggKey];
              
              if (suggestion) {
                const items = [];
                if (suggestion.similarBranch && suggestion.similarBranch.college && suggestion.similarBranch.branch) {
                  const sbKey = `${suggestion.similarBranch.college}|${suggestion.similarBranch.branch}|${suggestion.similarBranch.category}`.toLowerCase();
                  const sbData = seoDataMap[sbKey];
                  if (sbData && Number(sbData.r) > 0) {
                    items.push({ label: 'Similar Ranked Branch', college: suggestion.similarBranch.college, branch: suggestion.similarBranch.branch, cat: suggestion.similarBranch.category, rank: sbData.r });
                  }
                }
                if (suggestion.similarCollege && suggestion.similarCollege.college && suggestion.similarCollege.branch) {
                  const scKey = `${suggestion.similarCollege.college}|${suggestion.similarCollege.branch}|${suggestion.similarCollege.category}`.toLowerCase();
                  const scData = seoDataMap[scKey];
                  if (scData && Number(scData.r) > 0) {
                    items.push({ label: 'Similar Ranked College', college: suggestion.similarCollege.college, branch: suggestion.similarCollege.branch, cat: suggestion.similarCollege.category, rank: scData.r });
                  }
                }
                
                if (items.length > 0) {
                  fallbackHtml += `    <h3 style="margin-top: 24px;">Related Articles</h3>\n`;
                  fallbackHtml += `    <table border="1" cellpadding="8" style="border-collapse: collapse; margin-top: 10px; width: 100%; text-align: left;">\n      <thead><tr style="background-color: #f2f2f2;"><th>Type</th><th>College</th><th>Branch</th><th>Closing Rank (${articleSeo.y})</th></tr></thead>\n      <tbody>\n`;
                  for (const item of items) {
                    const displayCollege = item.college.split('(')[0].split(',')[0].trim();
                    const articleUrl = `/articles/${streamRaw}/${encodeURIComponent(item.college)}/${encodeURIComponent(item.branch)}/${encodeURIComponent(item.cat)}`;
                    fallbackHtml += `        <tr><td>${escapeHtml(item.label)}</td><td><a href="${articleUrl}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${escapeHtml(displayCollege)}</a></td><td>${escapeHtml(item.branch)}</td><td>${formatRank(item.rank)}</td></tr>\n`;
                  }
                  fallbackHtml += `      </tbody>\n    </table>\n`;
                }
              }
            }
          } catch(e) {
            // Graceful fallback — college chunk unavailable
          }
          
          fallbackHtml += `    <p style="color: #666; font-size: 12px; margin-top: 20px;">This is a crawler-friendly fallback representation. Enable JavaScript to view interactive trend charts, search widgets, and compare other options.</p>\n  </div>\n`;
          
          element.setInnerContent(fallbackHtml, { html: true });
        }
      }
    })
    .transform(response);
}
