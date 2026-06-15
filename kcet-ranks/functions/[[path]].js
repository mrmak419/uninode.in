function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
        const college = formatSlug(pathParts[2]);
        const branch = formatSlug(pathParts[3]);
        const cat = pathParts[4] ? pathParts[4].toUpperCase() : '';
        pageTitle = `${college} - ${branch} ${cat} Cutoffs | ${stream}`;
        pageDescription = `Check the latest KCET cutoff ranks for ${branch} at ${college} for ${cat} category. Compare historical trends.`;
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
      // Root stream route (e.g. /engineering)
      streamRaw = pathParts[0];
      stream = formatStream(streamRaw);
      pageTitle = `${stream} Cutoffs | Uninode KCET Cutoff Analyzer`;
      pageDescription = `Analyze historical KCET cutoff trends for ${stream}. Discover eligible colleges for your rank.`;
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
        element.append(`<meta property="og:type" content="website" />\n`, { html: true });
        element.append(`<meta name="twitter:card" content="summary_large_image" />\n`, { html: true });
        element.append(`<meta name="twitter:title" content="${safeTitle}" />\n`, { html: true });
        element.append(`<meta name="twitter:description" content="${safeDescription}" />\n`, { html: true });
        
        // Edge Preloading for meta json to eliminate React waterfall delay
        const preloadStream = streamRaw || 'engineering';
        element.append(`<link rel="preload" href="/meta_${preloadStream}.json" as="fetch" crossorigin="anonymous" />\n`, { html: true });
        
        // JSON-LD Structured Data Schema for Rich Snippets
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
        
        // SEO: Canonical URL to prevent duplicate content penalties
        // Using clean pathname without search parameters to consolidate SEO juice
        const canonicalUrl = new URL(url.origin + url.pathname);
        element.append(`<link rel="canonical" href="${escapeHtml(canonicalUrl.toString())}" />\n`, { html: true });
      }
    })
    .transform(response);
}
