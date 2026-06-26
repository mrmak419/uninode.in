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
 * Normalizes a course/branch name by removing all whitespace and special characters
 * for robust string matching (e.g. "D ata Science" -> "datascience")
 */
export function normalizeCourse(name) {
  if (!name) return '';
  return name.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Returns a clean, human-readable URL for an article.
 */
export function getArticleUrl(exam, stream, collegeCode, branchName, category) {
  const e = (exam || 'kcet').toLowerCase();
  const s = (stream || 'engineering').toLowerCase();
  const col = (collegeCode || '').toLowerCase();
  const br = slugify(branchName);
  let url = `/${e}/articles/${s}/${col}/${br}`;
  if (category) {
    url += `?c=${category}`;
  }
  return url;
}

/**
 * Returns a clean, human-readable URL for explorer by college.
 */
export function getExplorerCollegeUrl(exam, stream, collegeCode) {
  const e = (exam || 'kcet').toLowerCase();
  const s = (stream || 'engineering').toLowerCase();
  const col = (collegeCode || '').toLowerCase();
  return `/${e}/${s}/explorer/college/${col}`;
}

/**
 * Returns a clean, human-readable URL for explorer by branch.
 */
export function getExplorerBranchUrl(exam, stream, branchName) {
  const e = (exam || 'kcet').toLowerCase();
  const s = (stream || 'engineering').toLowerCase();
  const br = slugify(branchName);
  return `/${e}/${s}/explorer/branch/${br}`;
}

/**
 * Returns a clean, human-readable URL for the analyzer.
 */
export function getAnalyzerUrl(exam, stream, rank, category) {
  const e = (exam || 'kcet').toLowerCase();
  const s = (stream || 'engineering').toLowerCase();
  const cat = (category || '').toUpperCase();
  return `/${e}/${s}/analyzer/rank/${rank}/${cat}`;
}
