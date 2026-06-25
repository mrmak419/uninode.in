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
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${xmlEscape(description)}">`)
  
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
    html = html.replace('<div id="root"></div>', `<div id="root">${options.fallbackHtml}</div>`)
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
    const archivePath = path.join(DIST_DIR, `archive_${stream}.json`)
    if (!fs.existsSync(archivePath)) return;
    
    const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'))
    const combos = archiveData.articleCombinations || []
    console.log(`Generating ${combos.length} article pages for stream: ${stream}...`)

    const seoPath = path.join(DIST_DIR, `seo_${stream}.json`)
    let seoDataMap = null
    if (fs.existsSync(seoPath)) {
      seoDataMap = JSON.parse(fs.readFileSync(seoPath, 'utf8'))
    }

    combos.forEach(combo => {
      const parts = combo.split('::')
      if (parts.length < 4) return;
      const [collegeCode, collegeName, courseName, category, seatType] = parts
      const slugifiedCourse = slugify(courseName)
      const collegeShort = cleanCollegeName(collegeName)
      
      let articleSeo = null
      if (seoDataMap) {
        const lookupKey = `${collegeCode}|${slugifiedCourse}|${category}`.toLowerCase()
        articleSeo = seoDataMap[lookupKey]
      }

      const urlPath = `/${exam}/articles/${stream}/${collegeCode.toLowerCase()}/${slugifiedCourse}/${category.toLowerCase()}`
      let title = `${courseName} Cutoff Rank at ${collegeName} (${category})`
      let description = `Check the latest cutoffs and closing ranks for ${courseName} at ${collegeName} for the ${category} category.`
      
      const jsonLd = []
      let fallbackHtml = ''

      if (articleSeo) {
        const rank = formatRank(articleSeo.r)
        const year = articleSeo.y
        const round = articleSeo.rd
        const r1Rank = formatRank(articleSeo.r1)

        title = `${collegeShort} ${courseName} ${category.toUpperCase()} Cutoff ${year} – Rank ${rank} | Uninode ${exam.toUpperCase()}`
        
        let descParts = [`The ${exam.toUpperCase()} ${category.toUpperCase()} cutoff for ${courseName} at ${collegeShort} was ${rank} in ${year} (Round ${round}).`]
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
          "image": [BASE_URL + "/logo.png"],
          "author": { "@type": "Organization", "name": "Uninode", "url": BASE_URL },
          "publisher": { "@type": "Organization", "name": "Uninode", "logo": { "@type": "ImageObject", "url": BASE_URL + "/logo.png" } },
          "datePublished": `${year}-01-01T00:00:00+05:30`,
          "dateModified": new Date().toISOString()
        })

        const faqQuestions = [
          {
            "@type": "Question",
            "name": `What rank do I need for ${courseName} at ${collegeShort} (${category})?`,
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
            { "@type": "ListItem", "position": 2, "name": `${stream} Articles`, "item": BASE_URL + `/${exam}/articles/` + stream },
            { "@type": "ListItem", "position": 3, "name": collegeShort, "item": BASE_URL + `/${exam}/` + stream + "/explorer/college/" + encodeURIComponent(collegeCode) },
            { "@type": "ListItem", "position": 4, "name": `${courseName} (${category})`, "item": BASE_URL + urlPath }
          ]
        })

        fallbackHtml = `\n  <div style="padding: 20px; border: 1px solid #ccc; margin: 20px; font-family: sans-serif; background-color: #fff; border-radius: 8px;">\n    <h2 style="margin-top: 10px;">${escapeHtml(collegeShort)} ${escapeHtml(courseName)} Cutoff Matrix (${escapeHtml(category.toUpperCase())})</h2>\n    <table border="1" cellpadding="8" style="border-collapse: collapse; margin-top: 10px; width: 100%; text-align: left;">\n      <thead><tr style="background-color: #f2f2f2;"><th>Year</th><th>Round 1 Cutoff</th><th>Closing Cutoff (Round ${round})</th></tr></thead>\n      <tbody>\n        <tr><td>${year}</td><td>${r1Rank}</td><td>${rank}</td></tr>\n        ${articleSeo.pr && articleSeo.py ? `<tr><td>${articleSeo.py}</td><td>--</td><td>${formatRank(articleSeo.pr)}</td></tr>` : ''}\n      </tbody>\n    </table>\n    <h3 style="margin-top: 20px;">Frequently Asked Questions</h3>\n    <ul>\n      ${faqQuestions.map(q => `<li><strong>${escapeHtml(q.name)}</strong><br/>${escapeHtml(q.acceptedAnswer.text)}</li>`).join('\n')}\n    </ul>\n    <p style="color: #666; font-size: 12px; margin-top: 20px;">This is a crawler-friendly fallback representation. Enable JavaScript to view interactive trend charts, search widgets, and compare other options.</p>\n  </div>\n`
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
