const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'generate-static-site.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Change combo parsing
code = code.replace(
  /combos\.forEach\(combo => \{\s*const parts = combo\.split\('::'\)\s*if \(parts\.length < 4\) return;\s*const \[collegeCode, collegeName, courseName, category, seatType\] = parts/g,
  `combos.forEach(combo => {
      const parts = combo.split('::')
      if (parts.length < 3) return;
      const [collegeCode, collegeName, courseName] = parts
      
      const slugifiedCourse = slugify(courseName)
      const collegeShort = cleanCollegeName(collegeName)
      
      let articleSeo = null
      let category = 'GM'
      let availableCategories = []
      
      if (seoDataMap) {
        const prefix = \`\${collegeCode}|\${slugifiedCourse}|\`.toLowerCase()
        const matchingKeys = Object.keys(seoDataMap).filter(k => k.startsWith(prefix))
        availableCategories = matchingKeys.map(k => k.split('|')[2].toUpperCase())
        
        if (matchingKeys.length > 0) {
           let defaultKey = matchingKeys.find(k => k.endsWith('|gm'))
           if (!defaultKey) defaultKey = matchingKeys[0]
           articleSeo = seoDataMap[defaultKey]
           category = defaultKey.split('|')[2].toUpperCase()
        }
      }`
);

// We need to remove the old slugifiedCourse, collegeShort, articleSeo block up to urlPath.
code = code.replace(
  /const slugifiedCourse = slugify\(courseName\)\s*const collegeShort = cleanCollegeName\(collegeName\)\s*let articleSeo = null\s*if \(seoDataMap\) \{\s*const lookupKey = `\$\{collegeCode\}\|\$\{slugifiedCourse\}\|\$\{category\}`\.toLowerCase\(\)\s*articleSeo = seoDataMap\[lookupKey\]\s*\}/g,
  ``
);

// 2. Change urlPath
code = code.replace(
  /const urlPath = `\/\$\{exam\}\/articles\/\$\{stream\}\/\$\{collegeCode\.toLowerCase\(\)\}\/\$\{slugifiedCourse\}\/\$\{category\.toLowerCase\(\)\}`/g,
  'const urlPath = `/${exam}/articles/${stream}/${collegeCode.toLowerCase()}/${slugifiedCourse}`'
);

// 3. Spintax for narratives and Master Table injection
const getSpintaxContent = `
          // SPINTAX LOGIC
          const hashStr = collegeCode + courseName;
          let hashVal = 0;
          for(let i=0; i<hashStr.length; i++) hashVal += hashStr.charCodeAt(i);
          const spin = (arr) => arr[hashVal % arr.length];

          // Simplified text variations
          const tighteningTexts = [
            \`Securing this seat is getting tougher.\`,
            \`Competition for this branch is rising.\`,
            \`It is becoming harder to get into this course.\`
          ];
          const easingTexts = [
            \`It has become slightly easier to get this seat.\`,
            \`The cutoff ranks have relaxed recently.\`,
            \`Securing this branch is more attainable now.\`
          ];
          const momentumTexts = [
            \`Demand is spiking rapidly.\`,
            \`Interest in this branch is surging.\`,
            \`Competition is accelerating quickly.\`
          ];
          const momentumDownTexts = [
            \`Demand is cooling off.\`,
            \`Competition has eased up.\`,
            \`Interest has softened recently.\`
          ];

          let zScoreText = adv.zScore > 1 ? spin(tighteningTexts) : (adv.zScore < -1 ? spin(easingTexts) : \`The cutoff has remained relatively stable.\`);
          let cagrText = '';
          if (adv.cagr) {
             const cagrVal = parseFloat(adv.cagr);
             if (cagrVal < -5) cagrText = \`The cutoff rank has dropped by about \${Math.abs(cagrVal).toFixed(1)}% annually.\`;
             else if (cagrVal > 5) cagrText = \`The cutoff rank has expanded by about \${cagrVal.toFixed(1)}% annually.\`;
          }
          let momentumText = '';
          if (adv.momentum) {
             const momVal = parseFloat(adv.momentum);
             if (momVal > 10) momentumText = spin(momentumTexts);
             else if (momVal < -10) momentumText = spin(momentumDownTexts);
          }
          let ciText = adv.ciRange ? \`Based on trends, we estimate the next cutoff to fall between \${adv.ciRange}.\` : '';

          let paragraphsHTML = \`
            <div class="space-y-4 text-gray-700 leading-relaxed mb-6">
              <p>\${zScoreText} \${cagrText}</p>
              <p>\${momentumText} \${ciText}</p>
              <p>Please note that this data is for the \${category} category. You can use the dropdown above to view data for other categories like SC, ST, or OBC.</p>
            </div>
          \`;

          // Generate SEO Master Table
          let masterTableHTML = \`
            <div class="mt-8 mb-8">
              <h3 class="text-xl font-bold mb-4">All Categories Cutoff Summary</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-sm text-left border border-gray-200">
                  <thead class="bg-gray-100">
                    <tr><th class="p-3 border-b">Category</th><th class="p-3 border-b">Latest Cutoff</th></tr>
                  </thead>
                  <tbody>
          \`;
          
          availableCategories.forEach(cat => {
            const k = \`\${collegeCode}|\${slugifiedCourse}|\${cat}\`.toLowerCase();
            const catSeo = seoDataMap[k];
            if (catSeo) {
              masterTableHTML += \`<tr><td class="p-3 border-b font-semibold">\${cat}</td><td class="p-3 border-b">\${formatRank(catSeo.r)} (\${catSeo.y})</td></tr>\`;
            }
          });
          
          masterTableHTML += \`</tbody></table></div></div>\`;

          fallbackHtml = \`<div class="ssr-article-content">\${paragraphsHTML}\${masterTableHTML}</div>\`;
`;

// Replace the old metric card logic with our new spintax text
code = code.replace(
  /let mathParagraphs = '';\s*function generateMetricCard.*?fallbackHtml = `<div class="ssr-article-content">\$\{mathParagraphs\}<\/div>`/s,
  getSpintaxContent
);

// We need to also clean up the Advanced Data Science Analytics header
// Let's replace the whole `let advancedMathUI` block.
code = code.replace(
  /let advancedMathUI = '';\s*if \(articleSeo\.advMath\) \{.*?\s*fallbackHtml = `<div class="ssr-article-content">\$\{mathParagraphs\}<\/div>`;\s*\}/s,
  `if (articleSeo && articleSeo.advMath) {
     const adv = articleSeo.advMath;
     ${getSpintaxContent}
  }`
);

fs.writeFileSync(filePath, code);
console.log('generate-static-site.js patched successfully!');
