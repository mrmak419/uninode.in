// Legacy redirects for kcet-ranks
// This file handles redirects from the old query-parameter-based URLs to the new /:exam/ URLs.
// Static Site Generation (SSG) now handles SEO, so we no longer need HTMLRewriter here.

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, '-')
    .replace(/[^\w\-]+/g, '-')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getStreamMeta(context, stream, origin) {
  try {
    const res = await context.env.ASSETS.fetch(
      new Request(new URL(`/meta_${stream}.json`, origin))
    );
    if (res.ok) {
      return await res.json();
    }
  } catch(e) {}
  return null;
}

async function findCollegeCode(context, stream, collegeQuery, origin) {
  const meta = await getStreamMeta(context, stream, origin);
  if (!meta || !meta.colleges) return null;
  const query = collegeQuery.toLowerCase();
  
  let match = meta.colleges.find(c => c.college_code.toLowerCase() === query);
  if (match) return match.college_code;
  
  match = meta.colleges.find(c => c.college_name.toLowerCase().includes(query) || (c.search_terms && c.search_terms.toLowerCase().includes(query)));
  if (match) return match.college_code;
  
  return null;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Quick bypass for static assets
  if (url.pathname.match(/\.(xml|json|txt|png|jpg|jpeg|svg|css|js|ico|br|gz)$/i)) {
    return context.next();
  }

  // --- Redirect logic to new /:exam/ paths ---
  // Default to 'kcet' since legacy URLs didn't have an exam prefix
  const defaultExam = 'kcet';

  // 1. Redirect old parameterized URLs
  if (url.searchParams.has('mode')) {
    const mode = url.searchParams.get('mode');
    const pathStream = url.pathname.slice(1).split('/')[0] || 'engineering';
    
    if (mode === 'analyzer') {
      const rank = url.searchParams.get('rank');
      const cat = url.searchParams.get('cat') || 'GM';
      if (rank) {
        return Response.redirect(`${url.origin}/${defaultExam}/${pathStream}/analyzer?rank=${rank}&cat=${cat.toUpperCase()}`, 301);
      }
    } else if (mode === 'explorer') {
      const college = url.searchParams.get('college');
      const branches = url.searchParams.get('branches');
      if (college) {
        const code = await findCollegeCode(context, pathStream, college, url.origin);
        const resolvedCollege = code || college;
        return Response.redirect(`${url.origin}/${defaultExam}/${pathStream}/explorer?college=${encodeURIComponent(resolvedCollege.toLowerCase())}`, 301);
      } else if (branches) {
        return Response.redirect(`${url.origin}/${defaultExam}/${pathStream}/explorer?branches=${encodeURIComponent(slugify(branches.split(',')[0]))}`, 301);
      }
    }
  }

  // 2. Redirect legacy /article?stream=...
  if (url.pathname === '/article' || url.pathname === '/article/') {
    const stream = url.searchParams.get('stream') || 'engineering';
    const college = url.searchParams.get('college');
    const branch = url.searchParams.get('branch');
    const cat = url.searchParams.get('cat');
    
    if (college && branch && cat) {
      const code = await findCollegeCode(context, stream, college, url.origin);
      const resolvedCollege = code || college;
      return Response.redirect(`${url.origin}/${defaultExam}/articles/${stream}/${encodeURIComponent(resolvedCollege.toLowerCase())}/${encodeURIComponent(slugify(branch))}/${encodeURIComponent(cat.toUpperCase())}`, 301);
    } else {
      return Response.redirect(`${url.origin}/${defaultExam}/articles/${stream}`, 301);
    }
  }

  // 3. Redirect /articles/... -> /kcet/articles/...
  const tempParts = url.pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  if (tempParts.length > 0 && tempParts[0] === 'articles') {
    // Already an article path but missing exam prefix
    return Response.redirect(`${url.origin}/${defaultExam}${url.pathname}${url.search}`, 301);
  }
  
  if (tempParts.length > 0 && (tempParts[0] === 'explorer' || tempParts[0] === 'analyzer' || tempParts[0] === 'engineering' || tempParts[0] === 'b_pharma')) {
     // Legacy tools without /exam/ prefix
     // Wait, the routes are now /:exam/:stream/analyzer etc.
     if (tempParts[0] === 'explorer' || tempParts[0] === 'analyzer') {
        const streamRaw = tempParts[1] || 'engineering';
        // /explorer/engineering -> /kcet/engineering/explorer
        return Response.redirect(`${url.origin}/${defaultExam}/${streamRaw}/${tempParts[0]}${url.search}`, 301);
     } else {
        // e.g. /engineering -> /kcet/engineering
        return Response.redirect(`${url.origin}/${defaultExam}${url.pathname}${url.search}`, 301);
     }
  }

  // Get the static asset response from the Pages asset server
  let response = await context.next();
  
  // If static asset is not found (e.g., /kcet/engineering), manually fallback to index.html for SPA routing.
  if (response.status === 404) {
    const fallbackUrl = new URL('/index.html', context.request.url);
    response = await context.env.ASSETS.fetch(new Request(fallbackUrl));
  }
  
  return response;
}
