function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function onRequest(context) {
  // Get the static asset response from the Pages asset server
  const response = await context.next();
  
  // Only modify HTML responses
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  const url = new URL(context.request.url);
  
  // Extract stream from pathname (e.g. "/engineering" -> "Engineering")
  const streamRaw = url.pathname.replace(/^\/|\/$/g, ''); 
  const stream = streamRaw 
    ? streamRaw.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'KCET';
    
  const college = url.searchParams.get('college');
  const branchesStr = url.searchParams.get('branches');

  // Default metadata
  let pageTitle = `${stream} Cutoffs | Uninode KCET Cutoff Analyzer`;
  let pageDescription = `Analyze historical KCET cutoff trends for ${stream}. Discover eligible colleges for your rank with the Uninode KCET Cutoff Analyzer.`;

  // Dynamic override for URL parameters
  if (college || branchesStr) {
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
      }
    })
    .transform(response);
}
