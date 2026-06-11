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

  // Extract stream from pathname (e.g. "/engineering" -> "Engineering")
  const streamRaw = url.pathname.replace(/^\/|\/$/g, ''); 
  const stream = streamRaw 
    ? streamRaw.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'KCET';
    
  const college = url.searchParams.get('college');
  const branchesStr = url.searchParams.get('branches');
  const rank = url.searchParams.get('rank');
  const mode = url.searchParams.get('mode');

  // Default metadata
  let pageTitle = `${stream} Cutoffs | Uninode KCET Cutoff Analyzer`;
  let pageDescription = `Analyze historical KCET cutoff trends for ${stream}. Discover eligible colleges for your rank with the Uninode KCET Cutoff Analyzer.`;

  // Dynamic override for URL parameters
  if (rank && mode === 'analyzer') {
    const formattedRank = parseInt(rank).toLocaleString('en-IN');
    pageTitle = `Top ${stream} Colleges for ${formattedRank} Rank | KCET Cutoffs`;
    pageDescription = `Discover the best ${stream} colleges you can get with a KCET rank of ${formattedRank}. Check category-wise and historical cutoff trends.`;
  } else if (college || branchesStr) {
    let prefixParts = [];
    if (college) {
      prefixParts.push(college.trim());
    }
    if (branchesStr) {
      const branches = branchesStr.split(',').filter(Boolean);
      if (branches.length === 1) {
        prefixParts.push(branches[0]);
      } else if (branches.length > 1) {
        prefixParts.push(`${branches.length} Branches`);
      }
    }

    const prefix = prefixParts.join(' - ');
    pageTitle = `${prefix} KCET Cutoffs | ${stream}`;
    pageDescription = `Check the latest KCET cutoff ranks for ${prefix} in ${stream}. Compare historical cutoff trends and find your perfect college match.`;
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
        element.append(`<script type="application/ld+json">\n${JSON.stringify(jsonLd)}\n</script>\n`, { html: true });
      }
    })
    .transform(response);
}
