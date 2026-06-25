import fs from 'fs'
import path from 'path'

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\(\)\[\]]+/g, '-')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DIST_DIR = path.resolve(process.cwd(), 'dist')
const EXAMS = ['kcet', 'comedk', 'dcet']

function injectSeo(htmlTemplate, title, description, urlPath) {
  let html = htmlTemplate
  // Replace title
  html = html.replace(/<title>.*?<\/title>/, `<title>${xmlEscape(title)}</title>`)
  // Replace description
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${xmlEscape(description)}">`)
  
  // Inject Canonical Tag
  const canonicalTag = `<link rel="canonical" href="https://uninode.in${urlPath}" />`
  if (html.includes('</head>')) {
    html = html.replace('</head>', `  ${canonicalTag}\n</head>`)
  }
  return html
}

function writeHtmlFile(urlPath, htmlContent) {
  // urlPath is something like '/kcet/articles/engineering/b101/computer-science/gm'
  // we want to write it to 'dist/kcet/articles/engineering/b101/computer-science/gm/index.html'
  const outDir = path.join(DIST_DIR, ...urlPath.split('/').filter(Boolean))
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent)
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist directory not found. Please run "npm run build" first.')
    process.exit(1)
  }

  const templatePath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(templatePath)) {
    console.error('dist/index.html not found.')
    process.exit(1)
  }
  const template = fs.readFileSync(templatePath, 'utf8')

  const streamsPath = path.resolve(process.cwd(), 'src/streams.json')
  let streams = []
  if (fs.existsSync(streamsPath)) {
    streams = JSON.parse(fs.readFileSync(streamsPath, 'utf8'))
  } else {
    console.warn('src/streams.json not found. Skipping dynamic pages.')
  }

  console.log(`Starting static site generation...`)
  let generatedCount = 0

  // 1. Generate exam home pages
  EXAMS.forEach(exam => {
    const title = `${exam.toUpperCase()} Cutoffs & Ranks Analyzer`
    const description = `Explore ${exam.toUpperCase()} cutoffs, analyze ranks, and view college details.`
    const examUrl = `/${exam}`
    writeHtmlFile(examUrl, injectSeo(template, title, description, examUrl))
    generatedCount++
    
    // 2. Generate tool pages per stream
    streams.forEach(streamObj => {
      const stream = streamObj.id
      const streamName = stream.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

      const explorerUrl = `/${exam}/${stream}/explorer`
      writeHtmlFile(explorerUrl, injectSeo(template, `${exam.toUpperCase()} ${streamName} College Explorer`, `Explore ${streamName} colleges through ${exam.toUpperCase()} quota.`, explorerUrl))
      generatedCount++
      
      const analyzerUrl = `/${exam}/${stream}/analyzer`
      writeHtmlFile(analyzerUrl, injectSeo(template, `${exam.toUpperCase()} ${streamName} Rank Analyzer`, `Analyze your ${exam.toUpperCase()} rank for ${streamName} colleges.`, analyzerUrl))
      generatedCount++
      
      const articlesUrl = `/${exam}/articles/${stream}`
      writeHtmlFile(articlesUrl, injectSeo(template, `${exam.toUpperCase()} ${streamName} College Cutoffs Archive`, `Browse all cutoff archives for ${streamName} colleges under ${exam.toUpperCase()}.`, articlesUrl))
      generatedCount++
    })
  })

  // 3. Generate individual article pages based on archive_*.json
  streams.forEach(streamObj => {
    const stream = streamObj.id
    const archivePath = path.join(DIST_DIR, `archive_${stream}.json`)
    if (fs.existsSync(archivePath)) {
      const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'))
      const combos = archiveData.articleCombinations || []
      console.log(`Found ${combos.length} articles for stream: ${stream}`)

      combos.forEach(combo => {
        // combo format: col.college_code::col.college_name::row.course_name::row.category::row.seat_type
        const parts = combo.split('::')
        if (parts.length >= 4) {
          const [collegeCode, collegeName, courseName, category, seatType] = parts
          const slugifiedCourse = slugify(courseName)

          const title = `${courseName} Cutoff Rank at ${collegeName} (${category})`
          const description = `Check the latest cutoffs and closing ranks for ${courseName} at ${collegeName} for the ${category} category.`

          // Generate for kcet for now. (If comedk data is mixed in the future, we could generate for both, or use logic based on stream name).
          // For now, generate the article under the default 'kcet' since the data is KCET. 
          // If the user wants COMEDK, they'll likely run the data fetcher for COMEDK.
          // Let's generate it for 'kcet' by default. If the user expands this script to know which exam the stream belongs to, they can update here.
          const urlPath = `/kcet/articles/${stream}/${collegeCode.toLowerCase()}/${slugifiedCourse}/${category.toLowerCase()}`
          
          writeHtmlFile(urlPath, injectSeo(template, title, description, urlPath))
          generatedCount++
        }
      })
    }
  })

  console.log(`✅ Static site generation complete. Generated ${generatedCount} HTML files.`)
  
  // 4. Create 404.html for GitHub Pages SPA fallback
  const notFoundPath = path.join(DIST_DIR, '404.html')
  fs.writeFileSync(notFoundPath, template)
  console.log(`✅ Created 404.html for SPA routing`)
}

main()
