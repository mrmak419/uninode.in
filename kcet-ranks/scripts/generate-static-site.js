import fs from 'fs'
import path from 'path'

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase().trim().replace(/[\s\(\)\[\]]+/g, '-').replace(/\-\-+/g, '-').replace(/^-+|-+$/g, '');
}

function xmlEscape(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(unsafe) {
  return xmlEscape(unsafe);
}

function cleanCollegeName(name) {
  if (!name) return '';
  return name.split('(')[0].split(',')[0].trim();
}

function formatRank(rank) {
  if (rank === null || rank === undefined || rank === '--') return '--';
  return Math.round(Number(rank)).toLocaleString('en-IN');
}

function getDynamicTrendText(r, pr, py, y) {
  if (!pr || !py) return null;
  const diff = r - pr;
  if (diff === 0) return `Perfectly stable. The cutoff remained at ${formatRank(r)} from ${py} to ${y}.`;
  
  const pct = (diff / pr) * 100;
  const absDiff = Math.abs(diff);
  
  if (diff > 0) {
    if (pct >= 30) return `Massively easier. The closing rank dropped by ${formatRank(absDiff)} ranks (from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}), indicating a significant drop in demand.`;
    if (pct >= 15) return `Significantly easier. The closing rank relaxed from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}.`;
    if (pct >= 5) return `Moderately easier. Competition eased as the cutoff dropped from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}.`;
    return `Slightly easier. The closing rank eased from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}, meaning competition has slightly relaxed.`;
  } else {
    if (pct <= -30) return `Highly competitive spike! The cutoff aggressively tightened by ${formatRank(absDiff)} ranks (from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}), showing a massive surge in demand.`;
    if (pct <= -15) return `Significantly more competitive. The cutoff tightened notably from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}.`;
    if (pct <= -5) return `Moderately more competitive. The cutoff tightened from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}, indicating a steady increase in competition.`;
    return `Slightly more competitive. The cutoff tightened from ${formatRank(pr)} in ${py} to ${formatRank(r)} in ${y}.`;
  }
}

const DIST_DIR = path.resolve(process.cwd(), 'dist')
const EXAMS = ['kcet', 'comedk', 'dcet']
const BASE_URL = 'https://uninode.in'

function injectSeo(htmlTemplate, title, description, urlPath, options = {}) {
  let html = htmlTemplate
  html = html.replace(/<title>.*?<\/title>/, `<title>${xmlEscape(title)}</title>`)
  html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${xmlEscape(description)}">`)
  
  const canonicalTag = `<link rel="canonical" href="${BASE_URL}${urlPath}" />`
  if (html.includes('</head>')) {
    html = html.replace('</head>', `  ${canonicalTag}\n</head>`)
  }

  // Inject open graph / twitter
  const ogTags = `
    <meta property="og:title" content="${xmlEscape(title)}" />
    <meta property="og:description" content="${xmlEscape(description)}" />
    <meta property="og:type" content="${options.isArticle ? 'article' : 'website'}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${xmlEscape(title)}" />
    <meta name="twitter:description" content="${xmlEscape(description)}" />
  `;
  html = html.replace('</head>', `  ${ogTags}\n</head>`)

  if (options.jsonLd) {
    const safeJsonLd = options.jsonLd.map(j => JSON.stringify(j).replace(/</g, '\\u003c')).join('\\n</script>\\n<script type="application/ld+json">\\n');
    html = html.replace('</head>', `  <script type="application/ld+json">\n${safeJsonLd}\n</script>\n</head>`)
  }

  if (options.fallbackHtml) {
    html = html.replace(/<div id="root">[\s\S]*?<\/body>/, `<div id="root">\n      ${options.fallbackHtml}\n    </div>\n  </body>`)
  }

  return html
}

function writeHtmlFile(urlPath, htmlContent) {
  const outDir = path.join(DIST_DIR, ...urlPath.split('/').filter(Boolean))
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent)
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist directory not found. Please run "npm run build" first.')
    process.exit(1)
  }

  // Cleanup old generated HTML directories in local build
  const dirsToClean = ['kcet', 'comedk', 'dcet', 'articles', 'explorer', 'analyzer'];
  dirsToClean.forEach(dir => {
    const p = path.join(DIST_DIR, dir);
    if (fs.existsSync(p)) {
      console.log(`Cleaning up old directory: ${dir}`)
      fs.rmSync(p, { recursive: true, force: true });
    }
  });

  const templatePath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(templatePath)) process.exit(1)
  const template = fs.readFileSync(templatePath, 'utf8')

  const examsPath = path.resolve(process.cwd(), 'src/exams.json')
  let exams = []
  if (fs.existsSync(examsPath)) {
    exams = JSON.parse(fs.readFileSync(examsPath, 'utf8'))
  }

  console.log(`Starting static site generation...`)
  let generatedCount = 0

  const buildGenericJsonLd = (title, desc) => [{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": title,
    "applicationCategory": "EducationalApplication",
    "description": desc,
    "offers": { "@type": "Offer", "price": "0" }
  }];

  let allStreams = [];

  exams.forEach(examObj => {
    const exam = examObj.id
    const title = `${examObj.title} Cutoffs & Ranks Analyzer`
    const description = `Explore ${examObj.title} cutoffs, analyze ranks, and view college details.`
    const examUrl = `/${exam}`
    writeHtmlFile(examUrl, injectSeo(template, title, description, examUrl, { jsonLd: buildGenericJsonLd(title, description) }))
    generatedCount++
    
    examObj.streams.forEach(streamObj => {
      const stream = streamObj.id
      allStreams.push({ exam, stream })
      const streamName = stream.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

      const explorerUrl = `/${exam}/${stream}/explorer`
      const expTitle = `${examObj.title} ${streamName} College Explorer`
      writeHtmlFile(explorerUrl, injectSeo(template, expTitle, `Explore ${streamName} colleges through ${examObj.title} quota.`, explorerUrl, { jsonLd: buildGenericJsonLd(expTitle, `Explore ${streamName} colleges`) }))
      generatedCount++
      
      const analyzerUrl = `/${exam}/${stream}/analyzer`
      const anaTitle = `${examObj.title} ${streamName} Rank Analyzer`
      writeHtmlFile(analyzerUrl, injectSeo(template, anaTitle, `Analyze your ${examObj.title} rank for ${streamName} colleges.`, analyzerUrl, { jsonLd: buildGenericJsonLd(anaTitle, `Analyze rank`) }))
      generatedCount++
      
      const articlesUrl = `/${exam}/articles/${stream}`
      const artTitle = `${examObj.title} ${streamName} College Cutoffs Archive`
      writeHtmlFile(articlesUrl, injectSeo(template, artTitle, `Browse all cutoff archives for ${streamName} colleges under ${examObj.title}.`, articlesUrl, { jsonLd: buildGenericJsonLd(artTitle, `Archives`) }))
      generatedCount++
    })
  })

  allStreams.forEach(({ exam, stream }) => {
    const archivePath = path.join(DIST_DIR, `archive_${exam}_${stream}.json`)
    if (!fs.existsSync(archivePath)) return;
    
    const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'))
    const combos = archiveData.articleCombinations || []
    const streamName = stream.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    console.log(`Generating ${combos.length} article pages for stream: ${stream}...`)

    const seoPath = path.join(DIST_DIR, `seo_${exam}_${stream}.json`)
    let seoDataMap = null
    if (fs.existsSync(seoPath)) {
      seoDataMap = JSON.parse(fs.readFileSync(seoPath, 'utf8'))
    }

    combos.forEach(combo => {
      const parts = combo.split('::')
      if (parts.length < 3) return;
      const [collegeCode, collegeName, rawCourseName] = parts
      
      function toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      }
      
      const slugifiedCourse = slugify(rawCourseName)
      const collegeShort = cleanCollegeName(collegeName)
      const courseName = toTitleCase(rawCourseName)
      
      let articleSeo = null
      let category = 'GM'
      let availableCategories = []
      
      if (seoDataMap) {
        const prefix = `${collegeCode}|${slugifiedCourse}|`.toLowerCase()
        const matchingKeys = Object.keys(seoDataMap).filter(k => k.startsWith(prefix))
        availableCategories = matchingKeys.map(k => k.split('|')[2].toUpperCase())
        
        if (matchingKeys.length > 0) {
           let defaultKey = matchingKeys.find(k => k.endsWith('|gm'))
           if (!defaultKey) defaultKey = matchingKeys[0]
           articleSeo = seoDataMap[defaultKey]
           category = defaultKey.split('|')[2].toUpperCase()
        }
      }
      

      const urlPath = `/${exam}/articles/${stream}/${collegeCode.toLowerCase()}/${slugifiedCourse}`
      let title = `${courseName} Cutoff Rank at ${collegeName} (${category})`
      let description = `Check the latest cutoffs and closing ranks for ${courseName} at ${collegeName} for the ${category} category.`
      
      const jsonLd = []
      let fallbackHtml = ''

      if (articleSeo) {
        const rank = formatRank(articleSeo.r)
        const year = articleSeo.y
        const round = articleSeo.rd
        const r1Rank = formatRank(articleSeo.r1)

        title = `${collegeShort} ${courseName} Cutoff ${year} – Rank ${rank} | Uninode ${exam.toUpperCase()}`
        
        let descParts = [`The ${exam.toUpperCase()} cutoff for ${courseName} at ${collegeShort} was ${rank} in ${year} (Round ${round}).`]
        if (articleSeo.pr && articleSeo.py) {
          const diff = articleSeo.r - articleSeo.pr
          if (diff > 0) descParts.push(`Eased from ${formatRank(articleSeo.pr)} in ${articleSeo.py}.`)
          else if (diff < 0) descParts.push(`Tightened from ${formatRank(articleSeo.pr)} in ${articleSeo.py}.`)
          else descParts.push(`Stable since ${articleSeo.py}.`)
        }
        if (articleSeo.r1 && articleSeo.r1 !== articleSeo.r) {
          descParts.push(`Round 1 was ${formatRank(articleSeo.r1)}.`)
        }
        descParts.push('Compare all rounds & years.')
        description = descParts.join(' ')

        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": title,
          "description": description,
          "image": [
            BASE_URL + "/logo_1.png"
          ],
          "author": {
            "@type": "Organization",
            "name": "Uninode",
            "url": BASE_URL
          },
          "publisher": {
            "@type": "Organization",
            "name": "Uninode",
            "logo": {
              "@type": "ImageObject",
              "url": BASE_URL + "/logo_1.png"
            }
          },
          "datePublished": "2025-01-01T00:00:00+05:30",
          "dateModified": new Date().toISOString()
        })

        let allCategoriesHtml = '';
        if (seoDataMap) {
          const prefix = `${collegeCode}|${slugifiedCourse}|`.toLowerCase();
          const matchingKeys = Object.keys(seoDataMap).filter(k => k.startsWith(prefix));
          if (matchingKeys.length > 0) {
            allCategoriesHtml = `
    <div class="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-900">All Categories Cutoffs (${year})</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round 1 Cutoff</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Cutoff</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${matchingKeys.map(k => {
              const data = seoDataMap[k];
              const cat = k.split('|')[2].toUpperCase();
              return `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${cat}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.r1 ? formatRank(data.r1) : '--'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${formatRank(data.r)}</td>
            </tr>
            `
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
          }
        }

        const faqQuestions = [
          {
            "@type": "Question",
            "name": `What rank do I need for ${courseName} at ${collegeShort}?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `Based on ${year} data, you need a rank of ${r1Rank} or better in Round 1. The final Round ${round} cutoff was ${rank}, meaning students with ranks up to ${rank} were admitted by the end of counseling.`
            }
          }
        ]
        if (articleSeo.pr && articleSeo.py) {
          const trendText = getDynamicTrendText(articleSeo.r, articleSeo.pr, articleSeo.py, articleSeo.y)
          faqQuestions.push({
            "@type": "Question",
            "name": `Is ${courseName} at ${collegeShort} getting easier or harder to get into?`,
            "acceptedAnswer": { "@type": "Answer", "text": trendText }
          })
        }
        if (articleSeo.r1 && articleSeo.r && articleSeo.r > articleSeo.r1) {
          faqQuestions.push({
            "@type": "Question",
            "name": `Do cutoffs drop in later rounds for ${courseName} at ${collegeShort}?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `Yes. In ${year}, the cutoff relaxed from ${r1Rank} in Round 1 to ${rank} in Round ${round}. If your rank is close to Round 1, waiting may be viable.`
            }
          })
        }
        faqQuestions.push({
          "@type": "Question",
          "name": `Can I get admission for ${courseName} at ${collegeShort} if my rank is slightly above the cutoff?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `KCET cutoffs vary annually based on candidate preferences and seat matrix. If your rank is close to ${rank}, you should definitely include ${collegeShort} in your option entry list during counseling.`
          }
        })
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqQuestions
        })

        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL + "/" },
            { "@type": "ListItem", "position": 2, "name": `${streamName} Articles`, "item": BASE_URL + `/${exam}/articles/` + stream },
            { "@type": "ListItem", "position": 3, "name": collegeShort, "item": BASE_URL + `/${exam}/` + stream + "/explorer/college/" + encodeURIComponent(collegeCode.toLowerCase()) },
            { "@type": "ListItem", "position": 4, "name": courseName, "item": BASE_URL + urlPath }
          ]
        })

        let advancedMathUI = '';
        if (articleSeo.advMath) {
          const adv = articleSeo.advMath;
          let mathParagraphs = '';
          
          function generateMetricCard(title, tooltip, children, iconPath) {
            return `
              <div class="mb-4 bg-white p-5 rounded-xl shadow-sm border border-gray-200 relative group">
                <div class="flex items-center mb-2">
                  <div class="bg-gray-100 p-2 rounded-lg mr-3 text-gray-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
                  </div>
                  <h4 class="text-lg font-bold text-gray-800 m-0">${title}</h4>
                  
                  <div class="ml-auto relative flex items-center">
                    <button type="button" onclick="this.nextElementSibling.classList.toggle('hidden'); this.classList.toggle('text-blue-600'); this.classList.toggle('text-gray-400')" class="text-gray-400 hover:text-blue-600 transition-colors p-1" aria-label="Info">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                      </svg>
                    </button>
                    <div class="absolute right-0 bottom-full mb-2 hidden w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-xl z-10 pointer-events-auto">
                      ${tooltip}
                      <div class="absolute w-3 h-3 bg-gray-800 transform rotate-45 -bottom-1.5 right-3"></div>
                    </div>
                  </div>
                </div>
                <div class="text-gray-700 leading-relaxed m-0 text-base">
                  ${children}
                </div>
              </div>
            `;
          }

          if (adv.cagrTag) {
            mathParagraphs += generateMetricCard(
              "Historical Trend",
              "Measures whether the rank required to get this seat is increasing or decreasing over a multi-year period.",
              `Over the last ${adv.years || 3} years, the competition for this seat is <strong>${escapeHtml(adv.cagrTag)}</strong>.${adv.cagr != null ? ` Specifically, the rank boundary has been shifting at a compound annual rate of ${(Math.abs(adv.cagr) * 100).toFixed(1)}% per year, giving us a very clear long-term trajectory.` : ''}`,
              '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline>'
            );
          }
          if (adv.momentumTag) {
            mathParagraphs += generateMetricCard(
              "Current Demand",
              "Shows if the popularity of this seat is currently speeding up or slowing down compared to last year.",
              `Right now, the demand from students is <strong>${escapeHtml(adv.momentumTag)}</strong>.${adv.acceleration != null ? ` The year-over-year shift in rank cutoffs accelerated by ${Math.abs(Math.round(adv.acceleration))} positions recently, confirming this immediate momentum.` : ''}`,
              '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>'
            );
          }
          if (adv.volatilityTag) {
            mathParagraphs += generateMetricCard(
              "Seat Drop Risk",
              "Measures how much the cutoff falls between the first and last rounds. High risk means you shouldn't rely on it dropping much.",
              `During counseling rounds, holding out for this seat exhibits <strong>${escapeHtml(adv.volatilityTag)}</strong>.${adv.volatility != null ? ` Historically, the rank cutoff drops by an average of ${adv.volatility.toFixed(1)}% between the first round and the final round.` : ''}`,
              '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>'
            );
          }
          if (adv.zScoreTag) {
            mathParagraphs += generateMetricCard(
              "State Rank",
              "Compares this seat's difficulty against all other colleges in the state offering the exact same branch.",
              `Compared to all other colleges offering this branch, this seat is <strong>${escapeHtml(adv.zScoreTag)}</strong>.${adv.zScore != null ? ` This gives it a statistical Z-Score of ${adv.zScore.toFixed(2)} when standardizing cutoffs across Karnataka.` : ''}`,
              '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 1.1-.9 2-2 2H6"></path><path d="M14 14.66V17c0 1.1.9 2 2 2h2"></path><path d="M18 4c0 3.2-2 5.5-5 5.5h-2c-3 0-5-2.3-5-5.5V4h12z"></path>'
            );
          }
          if (adv.bpiTag) {
            mathParagraphs += generateMetricCard(
              "College Priority",
              "Compares this specific branch to the most demanded branch (usually Computer Science) at this exact same college.",
              `Compared to the best branch in this college, this acts as <strong>${escapeHtml(adv.bpiTag)}</strong>.${adv.bpi != null ? ` The Branch Preference Index (BPI) sits at ${adv.bpi.toFixed(2)}, which mathematically compares its cutoff against the toughest branch at this campus.` : ''}`,
              '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>'
            );
          }

          if (adv.ci) {
            mathParagraphs += generateMetricCard(
              "Expected Cutoff",
              "A statistically calculated safe range for this year's cutoff based on all historical counseling rounds.",
              `Based on past data, our confidence interval projects a safe target rank between <strong>${adv.ci.lower.toLocaleString()} and ${adv.ci.upper.toLocaleString()}</strong>.`,
              '<rect width="16" height="20" x="4" y="2" rx="2"></rect><line x1="8" x2="16" y1="6" y2="6"></line><line x1="16" x2="16" y1="14" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path>'
            );
          }
          
          if (adv.cushionTag) {
            mathParagraphs += generateMetricCard(
              "Category Advantage",
              "Shows if having this specific category reservation provides a large or small rank advantage over the General Merit category.",
              `The ${category.toLowerCase()} quota <strong>${escapeHtml(adv.cushionTag)}</strong>.${adv.gmRank && adv.latestRank ? ` For example, while GM required a rank of ${formatRank(adv.gmRank)}, this category allowed ranks up to ${formatRank(adv.latestRank)}.` : ''}`,
              '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'
            );
          }
          
            if (adv.peers && adv.peers.length > 0) {
              let peerList = '<ul class="list-disc pl-6">';
              adv.peers.forEach(peer => {
                const peerUrl = `/${exam}/articles/${stream}/${peer.college_code.toLowerCase()}/${slugify(courseName)}?c=${encodeURIComponent(category)}`;
                peerList += `<li class="mb-1"><a href="${peerUrl}" class="font-bold text-blue-600 hover:underline" data-discover="true">${escapeHtml(peer.college_name)}</a> (Distance: ${peer.distance} ranks)</li>`;
              });
              peerList += '</ul>';
            
            mathParagraphs += generateMetricCard(
              "Similar Options",
              "Colleges that have an almost identical level of competition and cutoff rank for this branch.",
              peerList,
              '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path>'
            );
          }

          if (mathParagraphs) {
            advancedMathUI = `
              <div class="mt-8">
                <div class="flex flex-col space-y-4">
                  ${mathParagraphs}
                </div>
              </div>
            `;
          }
        }

        fallbackHtml = `
  <div class="max-w-4xl mx-auto px-4 py-8">
    <nav class="text-sm font-medium text-gray-500 mb-6 flex flex-wrap gap-2">
      <a href="/" class="hover:text-blue-600">Home</a> &rsaquo; 
      <a href="/${exam}/articles/${stream}" class="hover:text-blue-600">${streamName} Archives</a> &rsaquo; 
      <a href="/${exam}/${stream}/explorer/college/${encodeURIComponent(collegeCode)}" class="hover:text-blue-600">${escapeHtml(collegeShort)}</a> &rsaquo; 
      <span class="text-gray-900">${escapeHtml(courseName)}</span>
    </nav>

    <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
      ${escapeHtml(courseName)} Cutoff at ${escapeHtml(collegeShort)}
    </h1>
    
    <div class="prose prose-blue max-w-none mt-8">
      <div class="text-lg font-bold mb-6">
        <div class="text-gray-900 mb-2">
          Closing cutoff: ${rank} (${year} Round ${round})
        </div>
      </div>
    </div>

    ${advancedMathUI}

    <div class="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-900">Historical Matrix</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round 1 Cutoff</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Cutoff (Round ${round})</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${year}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r1Rank}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${rank}</td>
            </tr>
            ${articleSeo.pr && articleSeo.py ? `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${articleSeo.py}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">--</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${formatRank(articleSeo.pr)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>

    ${allCategoriesHtml}

    <div class="mt-12">
      <h3 class="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
      <div class="space-y-4">
        ${faqQuestions.map(q => `
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h4 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(q.name)}</h4>
          <p class="text-gray-700">${escapeHtml(q.acceptedAnswer.text)}</p>
        </div>
        `).join('\n')}
      </div>
    </div>

    <div class="mt-8 text-center">
      <a href="/${exam}/${stream}/analyzer" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-md">
        Analyze Your Rank in the App
      </a>
    </div>
  </div>
`
      } else {
        jsonLd.push(...buildGenericJsonLd(title, description))
      }

      writeHtmlFile(urlPath, injectSeo(template, title, description, urlPath, { jsonLd, fallbackHtml, isArticle: true }))
      generatedCount++
    })
  })

  console.log(`✅ Static site generation complete. Generated ${generatedCount} HTML files.`)
  const notFoundPath = path.join(DIST_DIR, '404.html')
  fs.writeFileSync(notFoundPath, template)
  console.log(`✅ Created 404.html for SPA routing`)
}

main()
