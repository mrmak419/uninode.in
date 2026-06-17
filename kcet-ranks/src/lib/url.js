/**
 * Slugifies a text string (e.g. "Computer Science" -> "computer-science")
 * to make it safe and clean for URL paths.
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, '-')                 // Replace & with -
    .replace(/[^\w\-]+/g, '-')          // Replace spaces and all other symbols with -
    .replace(/\-\-+/g, '-')             // Replace multiple - with single -
    .replace(/^-+|-+$/g, '');           // Trim dashes from start and end
}

/**
 * Returns a clean, human-readable URL for an article.
 */
export function getArticleUrl(stream, collegeCode, branchName, category) {
  const s = (stream || 'engineering').toLowerCase();
  const col = (collegeCode || '').toLowerCase();
  const br = slugify(branchName);
  const cat = (category || '').toUpperCase();
  return `/articles/${s}/${col}/${br}/${cat}`;
}

/**
 * Returns a clean, human-readable URL for explorer by college.
 */
export function getExplorerCollegeUrl(stream, collegeCode) {
  const s = (stream || 'engineering').toLowerCase();
  const col = (collegeCode || '').toLowerCase();
  return `/explorer/${s}/college/${col}`;
}

/**
 * Returns a clean, human-readable URL for explorer by branch.
 */
export function getExplorerBranchUrl(stream, branchName) {
  const s = (stream || 'engineering').toLowerCase();
  const br = slugify(branchName);
  return `/explorer/${s}/branch/${br}`;
}

/**
 * Returns a clean, human-readable URL for the analyzer.
 */
export function getAnalyzerUrl(stream, rank, category) {
  const s = (stream || 'engineering').toLowerCase();
  const cat = (category || '').toUpperCase();
  return `/analyzer/${s}/rank/${rank}/${cat}`;
}
