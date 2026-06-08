// Node script to generate aliases
const fs = require('fs');

const colleges = JSON.parse(fs.readFileSync('colleges_dump.json', 'utf8'));

const stopWords = ['of', 'and', 'for', 'the', 'in', '&'];

function generateAliases(name) {
  let aliases = new Set();
  
  // Strip address by taking everything before a comma, parenthesis, or common address marker
  let cleanName = name.split(',')[0].split('-')[0].split('(')[0];
  // Sometimes address is separated by just space after 'Bangalore', 'Mysore', etc. but this is harder.
  cleanName = cleanName.replace(/[\.\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanName.split(' ');
  
  // 1. Initials / Acronym
  let acronym = '';
  for (let w of words) {
    if (!stopWords.includes(w.toLowerCase()) && w.length > 0) {
      acronym += w[0].toUpperCase();
    }
  }
  if (acronym.length > 1) aliases.add(acronym);
  
  // 2. Acronym without "College/Institute of Engineering/Technology"
  let shortAcronym = '';
  for (let w of words) {
    let lower = w.toLowerCase();
    if (['college', 'institute', 'engineering', 'technology', 'management', 'science', 'applied'].includes(lower)) {
      continue;
    }
    if (!stopWords.includes(lower) && w.length > 0) {
      shortAcronym += w[0].toUpperCase();
    }
  }
  if (shortAcronym.length > 1) aliases.add(shortAcronym);

  // 3. Spaced initials (e.g., R V -> RV)
  const spacedInitialsMatch = name.match(/([A-Z])\s+([A-Z])/g);
  if (spacedInitialsMatch) {
      const combined = name.match(/[A-Z]/g).join('');
      if(combined.length > 1 && combined.length < 6) aliases.add(combined);
  }

  // 4. Hardcoded common ones (Overrides)
  const lowerName = name.toLowerCase();
  if (lowerName.includes('r. v.') || lowerName.includes('r v ')) { aliases.add('RVCE'); aliases.add('RV'); }
  if (lowerName.includes('m s ramaiah')) { aliases.add('MSRIT'); aliases.add('Ramaiah'); }
  if (lowerName.includes('b m s') || lowerName.includes('b.m.s')) { aliases.add('BMSCE'); aliases.add('BMSIT'); aliases.add('BMS'); }
  if (lowerName.includes('p e s') || lowerName.includes('p.e.s')) { aliases.add('PESU'); aliases.add('PESIT'); aliases.add('PES'); }
  if (lowerName.includes('visvesvaraya college of engineering') && lowerName.includes('university')) { aliases.add('UVCE'); }
  if (lowerName.includes('jayachamarajendra')) { aliases.add('SJCE'); }
  if (lowerName.includes('national institute of engineering')) { aliases.add('NIE'); }
  if (lowerName.includes('siddaganga')) { aliases.add('SIT'); }
  if (lowerName.includes('b.d.t')) { aliases.add('UBDT'); }
  if (lowerName.includes('jss')) { aliases.add('JSS'); aliases.add('JSSATE'); }
  if (lowerName.includes('dayananda sagar')) { aliases.add('DSCE'); aliases.add('DSU'); aliases.add('DSATM'); }
  if (lowerName.includes('nitte')) { aliases.add('NMIT'); }
  if (lowerName.includes('cmr')) { aliases.add('CMRIT'); aliases.add('CMRU'); }
  if (lowerName.includes('new horizon')) { aliases.add('NHCE'); }
  if (lowerName.includes('sir m.visvesvaraya') || lowerName.includes('sir m v')) { aliases.add('MVIT'); aliases.add('SMVIT'); }

  return Array.from(aliases).filter(a => a.length >= 2).join(', ').toLowerCase();
}

let markdown = '# Generated College Aliases\n\n| Code | College Name | Generated Aliases |\n|---|---|---|\n';
let sql = '';

colleges.sort((a, b) => a.college_code.localeCompare(b.college_code));

for (const c of colleges) {
  const aliases = generateAliases(c.college_name);
  markdown += `| ${c.college_code} | ${c.college_name.split(',')[0].trim()} | **${aliases}** |\n`;
  
  sql += `UPDATE colleges SET search_terms = '${aliases}' WHERE college_code = '${c.college_code}';\n`;
}

fs.writeFileSync('college_aliases.md', markdown);
fs.writeFileSync('update_aliases.sql', sql);
console.log('Done!');
