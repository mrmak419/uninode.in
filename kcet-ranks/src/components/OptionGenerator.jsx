import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { normalizeCourse } from '../lib/url'
import { AlertTriangle, RefreshCw, Eye, Search, ListOrdered } from 'lucide-react'
import TabTitle from './TabTitle'
import Footer from './Footer'
import OptionConfigBar from './OptionConfigBar'
import OptionWizard from './OptionWizard'
import OptionSearchPanel from './OptionSearchPanel'
import OptionPriorityList from './OptionPriorityList'


export default function OptionGenerator() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // --- Persistent & Share State ---
  const [stream, setStream] = useState(searchParams.get('stream') || localStorage.getItem('op_stream') || 'engineering')
  const [rank, setRank] = useState(searchParams.get('rank') || localStorage.getItem('op_rank') || '')
  const [category, setCategory] = useState((searchParams.get('cat') || localStorage.getItem('op_cat') || 'GM').toUpperCase())
  const [seatType, setSeatType] = useState(searchParams.get('seat') || localStorage.getItem('op_seat') || 'ROK')
  
  // Preference list state
  const [optionsList, setOptionsList] = useState([])

  // UI state
  const [activeTab, setActiveTab] = useState('search') // 'search' or 'list' for mobile
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('op_search_query') || '')
  const [selectedSearchBranches, setSelectedSearchBranches] = useState(() => {
    try {
      const saved = localStorage.getItem('op_search_branches')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })
  const [safetyFilter, setSafetyFilter] = useState(() => localStorage.getItem('op_safety_filter') || 'all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Data caching
  const [colleges, setColleges] = useState([])
  const [branches, setBranches] = useState([])
  const [rounds, setRounds] = useState([])
  const [fullMatrixData, setFullMatrixData] = useState(null)

  // Accordion expands for historical cutoff tables
  const [expandedHistory, setExpandedHistory] = useState(new Set())

  // Wizard state
  const [wizardBranches, setWizardBranches] = useState(() => {
    try {
      const saved = localStorage.getItem('op_wizard_branches')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })
  const [wizardThreshold, setWizardThreshold] = useState(() => localStorage.getItem('op_wizard_threshold') || 'balanced')
  const [wizardBranchInput, setWizardBranchInput] = useState('')
  const [wizardBranchOpen, setWizardBranchOpen] = useState(false)
  const wizardBranchRef = useRef(null)

  // Direct editing of positions
  const [editingIndex, setEditingIndex] = useState(null)
  const [editVal, setEditVal] = useState('')

  // Drag and Drop tracking
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [shareStatus, setShareStatus] = useState('')

  // Clear priority list modal confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Collapse states
  const [findCollegesOpen, setFindCollegesOpen] = useState(() => localStorage.getItem('op_find_colleges_open') === 'true')
  const [collapsedCategories, setCollapsedCategories] = useState({
    dream: false,
    borderline: false,
    safe: false,
    neutral: false
  })

  // Format display name for stream
  const formattedStreamName = stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  // --- Close Dropdowns on Click Outside ---
  useEffect(() => {
    function handler(e) {
      if (wizardBranchRef.current && !wizardBranchRef.current.contains(e.target)) {
        setWizardBranchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // --- Lazy Loading & Parsing States ---
  const [shouldLoad, setShouldLoad] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState(false)

  // Reset load flag on stream change unless a shared list is present
  useEffect(() => {
    if (!searchParams.get('list')) {
      setShouldLoad(false)
    }
  }, [stream, searchParams])

  // Trigger data load when 'list' param exists in URL
  useEffect(() => {
    if (searchParams.get('list')) {
      setShouldLoad(true)
    }
  }, [searchParams])

  // Trigger data load when search panel is opened
  useEffect(() => {
    if (findCollegesOpen) {
      setShouldLoad(true)
    }
  }, [findCollegesOpen])

  // --- Load Stream Metadata ---
  useEffect(() => {
    setColleges([])
    setBranches([])
    setRounds([])
    setFullMatrixData(null)
    setExpandedHistory(new Set())

    async function loadStreamData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/meta_${stream}.json?v=1`)
        if (!res.ok) throw new Error(`Stream metadata not found for ${stream}`)
        const data = await res.json()
        
        setColleges(data.colleges || [])
        setBranches(data.branches || [])
        
        const uniqueRounds = data.rounds || []
        uniqueRounds.sort((a,b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.round - a.round
        })
        setRounds(uniqueRounds)

        // Only load the heavy matrix chunks if shouldLoad is true!
        if (shouldLoad) {
          let matrixData = []
          if (data.numChunks && data.numChunks > 0) {
            const fetchPromises = []
            for (let i = 0; i < data.numChunks; i++) {
              fetchPromises.push(
                fetch(`/data_${stream}_${i}.json?v=${data.lastUpdated || ''}`)
                  .then(r => r.ok ? r.json() : [])
              )
            }
            const chunkResults = await Promise.all(fetchPromises)
            matrixData = chunkResults.flat()
          } else {
            const dataRes = await fetch(`/data_${stream}.json?v=${data.lastUpdated || ''}`)
            if (dataRes.ok) matrixData = await dataRes.json()
          }
          
          // Merge variations of course names (e.g. "D ata Science" and "Da ta Science")
          const mergedMap = new Map()
          for (const row of matrixData) {
            const normCourse = normalizeCourse(row.course_name)
            const key = `${row.college_code.toUpperCase()}||${normCourse}||${(row.category || '').toUpperCase()}||${(row.seat_type || '').toUpperCase()}`
            if (!mergedMap.has(key)) {
              mergedMap.set(key, {
                ...row,
                course_name: row.course_name, // Keep the first name
                rounds: { ...(row.rounds || {}) }
              })
            } else {
              const existing = mergedMap.get(key)
              existing.rounds = { ...existing.rounds, ...(row.rounds || {}) }
            }
          }
          const mergedData = Array.from(mergedMap.values())
          setFullMatrixData(mergedData)
        }
      } catch (err) {
        console.error("Failed to load option generator data:", err)
        setError("Failed to load cutoff data for this stream. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    loadStreamData()
  }, [stream, shouldLoad])

  // --- Write inputs to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('op_stream', stream)
    localStorage.setItem('op_rank', rank)
    localStorage.setItem('op_cat', category)
    localStorage.setItem('op_seat', seatType)
  }, [stream, rank, category, seatType])

  useEffect(() => {
    localStorage.setItem('op_wizard_branches', JSON.stringify(wizardBranches))
  }, [wizardBranches])

  useEffect(() => {
    localStorage.setItem('op_wizard_threshold', wizardThreshold)
  }, [wizardThreshold])

  useEffect(() => {
    localStorage.setItem('op_search_branches', JSON.stringify(selectedSearchBranches))
  }, [selectedSearchBranches])

  useEffect(() => {
    localStorage.setItem('op_search_query', searchQuery)
  }, [searchQuery])

  useEffect(() => {
    localStorage.setItem('op_safety_filter', safetyFilter)
  }, [safetyFilter])

  useEffect(() => {
    localStorage.setItem('op_find_colleges_open', findCollegesOpen)
  }, [findCollegesOpen])

  // --- Helper to Extract Latest Cutoff Rank ---
  const getLatestCutoff = useCallback((rowRounds) => {
    if (!rowRounds || rounds.length === 0) return null
    for (const r of rounds) {
      const key = `${r.year}_R${r.round}`
      const cutoffVal = rowRounds[key]
      if (cutoffVal != null && cutoffVal !== '--') {
        const numeric = Number(cutoffVal)
        if (!isNaN(numeric)) {
          return {
            rank: numeric,
            label: `${r.year} R${r.round_name || r.round}`
          }
        }
      }
    }
    return null
  }, [rounds])

  // --- Dynamic Safety Status Evaluator ---
  const evaluateSafety = useCallback((cutoffRank, studentRank) => {
    if (!studentRank || isNaN(Number(studentRank))) return 'neutral'
    const sRank = Number(studentRank)
    if (sRank <= cutoffRank) return 'safe' // student's rank is better than cutoff
    if (cutoffRank * 1.15 >= sRank) return 'borderline' // within 15% cutoff increase
    return 'dream' // way above cutoff
  }, [])

  // --- Populate List from Share Params or LocalStorage ---
  useEffect(() => {
    if (fullMatrixData && fullMatrixData.length > 0 && colleges.length > 0 && branches.length > 0) {
      const listParam = searchParams.get('list')
      if (listParam) {
        // Parse shared list URL parameter (supports both old ','/':' and new '-'/'-' delimiters)
        const hasNewDelimiters = listParam.includes('_')
        const itemDelimiter = hasNewDelimiters ? '-' : ','
        const kvDelimiter = hasNewDelimiters ? '_' : ':'

        const items = listParam.split(itemDelimiter).map(item => {
          const [collegeCode, courseVal] = item.split(kvDelimiter)
          
          // Decode course name: check if it's a branch index or full course name
          let courseName = ''
          const idx = parseInt(courseVal, 10)
          if (!isNaN(idx) && branches[idx]) {
            courseName = branches[idx].raw_name
          } else {
            courseName = decodeURIComponent(courseVal || '')
          }
          
          // Match with full matrix data row
          const matchedRow = fullMatrixData.find(row => 
            row.college_code.toLowerCase() === collegeCode.toLowerCase() && 
            row.course_name.toLowerCase() === courseName.toLowerCase() && 
            row.category === category && 
            row.seat_type === seatType
          )

          const collegeObj = colleges.find(c => c.college_code.toLowerCase() === collegeCode.toLowerCase())
          
          const cutoff = matchedRow ? getLatestCutoff(matchedRow.rounds) : null
          
          return {
            college_code: collegeCode.toUpperCase(),
            college_name: collegeObj ? collegeObj.college_name : (matchedRow ? matchedRow.college_name : collegeCode),
            course_name: courseName,
            cutoff_rank: cutoff ? cutoff.rank : null,
            cutoff_label: cutoff ? cutoff.label : '',
            rounds: matchedRow ? matchedRow.rounds : {},
            safety: cutoff ? evaluateSafety(cutoff.rank, rank) : 'neutral'
          }
        })
        setOptionsList(items)
        // Clean URL to prevent double loads on changes
        const params = new URLSearchParams(window.location.search)
        params.delete('list')
        navigate(`/option-entry?${params.toString()}`, { replace: true })
      } else {
        // Load from LocalStorage
        const localList = localStorage.getItem(`op_list_${stream}`)
        if (localList) {
          try {
            const parsed = JSON.parse(localList)
            // Re-evaluate safety status and fetch cutoffs in case rank/category changed
            const updated = parsed.map(item => {
              const matchedRow = fullMatrixData.find(row => 
                row.college_code.toUpperCase() === item.college_code.toUpperCase() && 
                row.course_name.toLowerCase() === item.course_name.toLowerCase() && 
                row.category === category && 
                row.seat_type === seatType
              )
              const cutoff = matchedRow ? getLatestCutoff(matchedRow.rounds) : null
              return {
                ...item,
                cutoff_rank: cutoff ? cutoff.rank : item.cutoff_rank,
                cutoff_label: cutoff ? cutoff.label : item.cutoff_label,
                rounds: matchedRow ? matchedRow.rounds : item.rounds,
                safety: cutoff ? evaluateSafety(cutoff.rank, rank) : 'neutral'
              }
            })
            setOptionsList(updated)
          } catch(e) {
            console.error("Failed to parse local option list", e)
          }
        }
      }
    }
  }, [fullMatrixData, colleges, branches, stream, searchParams, category, seatType, rank, getLatestCutoff, evaluateSafety, navigate])

  // --- Compile Suggested Options list on click (Generate) once data is ready ---
  useEffect(() => {
    if (pendingGenerate && fullMatrixData && fullMatrixData.length > 0 && branches.length > 0) {
      setPendingGenerate(false)
      const numericRank = Number(rank)
      const multiplier = wizardThreshold === 'safe' ? 4 : 3
      
      let maxRankInData = 250000
      let maxVal = 0
      fullMatrixData.forEach(row => {
        const cutoff = getLatestCutoff(row.rounds)
        if (cutoff && cutoff.rank > maxVal) {
          maxVal = cutoff.rank
        }
      })
      if (maxVal > 0) maxRankInData = maxVal

      let maxCutoffLimit = numericRank * multiplier
      if (numericRank >= maxRankInData) {
        maxCutoffLimit = maxRankInData
      } else {
        maxCutoffLimit = Math.min(maxCutoffLimit, maxRankInData)
      }

      // Filter branches (with space/special char normalization)
      const normalizedSelected = wizardBranches.map(w => normalizeCourse(w))
      const matchedRawNormalized = new Set()
      for (const selectedNorm of normalizedSelected) {
        let expanded = false
        if (stream === 'engineering') {
          for (const b of branches) {
            if (b.parent_branches?.name && normalizeCourse(b.parent_branches.name) === selectedNorm) {
              matchedRawNormalized.add(normalizeCourse(b.raw_name))
              expanded = true
            }
          }
        }
        if (!expanded) matchedRawNormalized.add(selectedNorm)
      }

      const matchedRows = fullMatrixData.filter(row => {
        if (row.category !== category || row.seat_type !== seatType) return false
        return matchedRawNormalized.has(normalizeCourse(row.course_name))
      })

      const suggestedOptions = matchedRows.map(row => {
        const cutoff = getLatestCutoff(row.rounds)
        return {
          college_code: row.college_code,
          college_name: row.college_name || row.college_code,
          course_name: row.course_name,
          cutoff_rank: cutoff ? cutoff.rank : null,
          cutoff_label: cutoff ? cutoff.label : '',
          rounds: row.rounds,
          safety: cutoff ? evaluateSafety(cutoff.rank, rank) : 'neutral'
        }
      })
      .filter(item => {
        if (item.cutoff_rank == null) return false
        return item.cutoff_rank <= maxCutoffLimit
      })
      .sort((a, b) => a.cutoff_rank - b.cutoff_rank)

      if (suggestedOptions.length === 0) {
        setError("No suggested colleges found within the cutoff threshold. Try selecting more branches or increasing your rank.")
        return
      }

      setOptionsList(suggestedOptions)
      setActiveTab('list')
    }
  }, [pendingGenerate, fullMatrixData, branches, rank, wizardThreshold, wizardBranches, category, seatType, getLatestCutoff, evaluateSafety])

  // --- Save preference list to LocalStorage on changes ---
  useEffect(() => {
    if (optionsList.length > 0 || localStorage.getItem(`op_list_${stream}`)) {
      localStorage.setItem(`op_list_${stream}`, JSON.stringify(optionsList))
    }
  }, [optionsList, stream])

  // --- Dynamic Re-evaluation of safety when student rank changes ---
  useEffect(() => {
    if (optionsList.length > 0) {
      setOptionsList(prev => prev.map(item => {
        if (item.cutoff_rank) {
          return {
            ...item,
            safety: evaluateSafety(item.cutoff_rank, rank)
          }
        }
        return item
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank])

  // --- Derive unique parent branches for the Wizard ---
  const parentBranchesMap = useMemo(() => {
    const map = new Map()
    branches.forEach(b => {
      if (stream === 'engineering') {
        if (b.parent_branches?.name) {
          map.set(b.parent_branches.name, {
            name: b.parent_branches.name,
            alias: b.parent_branches.alias
          })
        }
      } else {
        if (b.raw_name) {
          map.set(b.raw_name, {
            name: b.raw_name,
            alias: b.alias || ''
          })
        }
      }
    })
    return Array.from(map.values())
  }, [branches, stream])

  const filteredWizardBranches = useMemo(() => {
    return parentBranchesMap.filter(pb => {
      const q = wizardBranchInput.toLowerCase()
      const isSelected = wizardBranches.includes(pb.name)
      if (isSelected) return false
      if (!q) return true
      return pb.name.toLowerCase().includes(q) || pb.alias?.toLowerCase().includes(q)
    })
  }, [parentBranchesMap, wizardBranchInput, wizardBranches])

  const toggleWizardBranch = (branchName) => {
    if (wizardBranches.includes(branchName)) {
      setWizardBranches(wizardBranches.filter(b => b !== branchName))
    } else {
      setWizardBranches([...wizardBranches, branchName])
    }
    setWizardBranchInput('')
  }

  // --- Search Options Logic ---
  const eligibleColleges = useMemo(() => {
    if (!fullMatrixData || fullMatrixData.length === 0) return []

    let data = fullMatrixData.filter(row => row.category === category && row.seat_type === seatType)

    // Filter by branch (with space/special char normalization)
    if (selectedSearchBranches.length > 0) {
      const normalizedSelected = selectedSearchBranches.map(s => normalizeCourse(s))
      const matchedRawNormalized = new Set()
      for (const selectedNorm of normalizedSelected) {
        let expanded = false
        if (stream === 'engineering') {
          for (const b of branches) {
            if (b.parent_branches?.name && normalizeCourse(b.parent_branches.name) === selectedNorm) {
              matchedRawNormalized.add(normalizeCourse(b.raw_name))
              expanded = true
            }
          }
        }
        if (!expanded) matchedRawNormalized.add(selectedNorm)
      }
      data = data.filter(row => matchedRawNormalized.has(normalizeCourse(row.course_name)))
    }

    // Filter by College Name/Code Search Query
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      const matchedCodes = colleges.filter(c => {
        return c.college_name.toLowerCase().includes(q) || 
               c.college_code.toLowerCase().includes(q) || 
               (c.search_terms && c.search_terms.toLowerCase().includes(q))
      }).map(c => c.college_code)
      data = data.filter(row => matchedCodes.includes(row.college_code))
    }

    // Process and sort
    const processed = data.map(row => {
      const cutoff = getLatestCutoff(row.rounds)
      return {
        college_code: row.college_code,
        college_name: row.college_name || row.college_code,
        course_name: row.course_name,
        cutoff_rank: cutoff ? cutoff.rank : null,
        cutoff_label: cutoff ? cutoff.label : '',
        rounds: row.rounds,
        safety: cutoff ? evaluateSafety(cutoff.rank, rank) : 'neutral'
      }
    })

    // Filter by Safety level
    let filtered = processed
    if (safetyFilter !== 'all') {
      filtered = processed.filter(item => item.safety === safetyFilter)
    }

    // Sort by latest cutoff rank ascending (highest cutoff rank first is best, i.e., lowest rank number is most competitive)
    return filtered.sort((a, b) => {
      const ra = a.cutoff_rank ?? Infinity
      const rb = b.cutoff_rank ?? Infinity
      return ra - rb
    })

  }, [fullMatrixData, category, seatType, selectedSearchBranches, branches, searchQuery, colleges, getLatestCutoff, evaluateSafety, rank, safetyFilter])

  // --- Add Option to Preference List ---
  const addOption = (item) => {
    const exists = optionsList.some(o => 
      o.college_code.toUpperCase() === item.college_code.toUpperCase() && 
      normalizeCourse(o.course_name) === normalizeCourse(item.course_name)
    )
    if (exists) return

    setOptionsList([...optionsList, {
      college_code: item.college_code.toUpperCase(),
      college_name: item.college_name,
      course_name: item.course_name,
      cutoff_rank: item.cutoff_rank,
      cutoff_label: item.cutoff_label,
      rounds: item.rounds,
      safety: item.safety
    }])
  }

  // --- Remove Option from Preference List ---
  const removeOption = (idx) => {
    setOptionsList(optionsList.filter((_, i) => i !== idx))
  }

  // --- Smart Auto-Generator Starter Wizard ---
  const handleAutoGenerate = () => {
    if (!rank || isNaN(Number(rank))) {
      setError("Please enter a valid rank first to auto-generate suggested options.")
      return
    }
    if (wizardBranches.length === 0) {
      setError("Please select at least one branch to filter suggestions.")
      return
    }

    setError(null)
    setShouldLoad(true)
    setPendingGenerate(true)
  }

  // --- Manual Priority Editing ---
  const handleEditSubmit = (origIndex) => {
    let targetIndex = parseInt(editVal, 10) - 1
    setEditingIndex(null)
    setEditVal('')

    if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= optionsList.length || targetIndex === origIndex) {
      return
    }

    const updated = [...optionsList]
    const [removed] = updated.splice(origIndex, 1)
    updated.splice(targetIndex, 0, removed)
    setOptionsList(updated)
  }

  // --- Reordering Logic ---
  const moveOption = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= optionsList.length) return
    const updated = [...optionsList]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setOptionsList(updated)
  }

  // --- Drag and Drop Logic ---
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox
    e.dataTransfer.setData('text/html', e.currentTarget)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    // Only allow drag over within the same safety category
    if (optionsList[draggedIndex]?.safety !== optionsList[index]?.safety) return
    setDragOverIndex(index)
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    // Only allow drop within the same safety category
    if (optionsList[draggedIndex]?.safety !== optionsList[index]?.safety) return

    const updated = [...optionsList]
    const [removed] = updated.splice(draggedIndex, 1)
    updated.splice(index, 0, removed)
    setOptionsList(updated)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // --- Expand / Hide Cutoff History ---
  const toggleHistory = (key) => {
    setExpandedHistory(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // --- Validation Warnings Engine ---
  const strategicWarnings = useMemo(() => {
    const warnings = []
    if (optionsList.length === 0) return warnings

    // Check 1: Safe option placed above Dream option
    // Find the first occurrence of a 'safe' option
    let firstSafeIdx = -1
    for (let i = 0; i < optionsList.length; i++) {
      if (optionsList[i].safety === 'safe') {
        firstSafeIdx = i
        break
      }
    }

    if (firstSafeIdx !== -1) {
      // Find if there are any dream options listed BELOW this safe option
      for (let i = firstSafeIdx + 1; i < optionsList.length; i++) {
        if (optionsList[i].safety === 'dream') {
          warnings.push({
            type: 'priority',
            message: `Option #${firstSafeIdx + 1} (${optionsList[firstSafeIdx].college_code} - Safe) is listed above Option #${i + 1} (${optionsList[i].college_code} - Dream). KEA allocates options sequentially. Because you are highly likely to get Option #${firstSafeIdx + 1}, your dream option #${i + 1} will never be considered. Consider dragging dream options to the top!`
          })
          break // show one warning of this type to avoid cluttering
        }
      }
    }

    // Check 2: Lack of backup options (Zero safe options)
    const safeCount = optionsList.filter(o => o.safety === 'safe').length
    if (safeCount === 0 && rank) {
      warnings.push({
        type: 'no-backup',
        message: `You have zero Safe (Green) colleges in your priority list. If cutoff ranks drop this year, you run the risk of getting no seat allocated. Add 3 to 5 backup colleges whose cutoffs are higher than your rank.`
      })
    }

    return warnings
  }, [optionsList, rank])

  // --- Option List Stats ---
  const listStats = useMemo(() => {
    const stats = { dream: 0, borderline: 0, safe: 0, neutral: 0 }
    optionsList.forEach(o => stats[o.safety]++)
    return stats
  }, [optionsList])

  // --- Clear Preference List ---
  const handleClearList = () => {
    setShowClearConfirm(true)
  }

  // --- Share Preference List via Query Params ---
  const handleShareList = () => {
    if (optionsList.length === 0) {
      setError("Please add some options to your list first before sharing.")
      return
    }

    // Compact index encoding for shorter URLs: college_code_branchIndex-college_code_branchIndex...
    const encodedItems = optionsList.map(item => {
      const branchIdx = branches.findIndex(b => b.raw_name.toLowerCase() === item.course_name.toLowerCase())
      const courseVal = branchIdx !== -1 ? branchIdx : encodeURIComponent(item.course_name)
      return `${item.college_code}_${courseVal}`
    }).join('-')

    const params = new URLSearchParams()
    params.set('stream', stream)
    params.set('rank', rank)
    params.set('cat', category)
    params.set('seat', seatType)
    params.set('list', encodedItems)

    const shareUrl = `${window.location.origin}/option-entry?${params.toString()}`

    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareStatus('Copied!')
      setTimeout(() => setShareStatus(''), 2500)
    }).catch(err => {
      console.error("Failed to copy link:", err)
      setError("Could not copy link automatically. Please manually copy the URL from your browser's address bar.")
    })
  }

  // --- Export to CSV ---
  const handleExportCSV = () => {
    if (optionsList.length === 0) return

    let csvContent = "data:text/csv;charset=utf-8," 
      + "Priority,College Code,College Name,Course Name,Latest Cutoff Rank,Cutoff Year/Round,Safety Status\n"

    optionsList.forEach((item, idx) => {
      const safetyText = item.safety.toUpperCase()
      const rowString = `${idx + 1},"${item.college_code}","${item.college_name.replace(/"/g, '""')}","${item.course_name.replace(/"/g, '""')}",${item.cutoff_rank || "N/A"},"${item.cutoff_label}",${safetyText}`
      csvContent += rowString + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `uninode_kcet_option_entry_${stream}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- Print list ---
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col print:bg-white print:min-h-0 print:p-0">
      <TabTitle 
        title={`Option Entry List Generator | Uninode KCET`} 
        description="Build, prioritize, and validate your KCET Option Entry preference list strategically based on historical cutoff ranks."
      />

      <main id="printable-area" className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col print:p-0 print:max-w-none">
        
        {/* Print Only Header */}
        <div className="hidden print:block border-b-2 border-ink pb-4 mb-6">
          <h1 className="text-2xl font-bold font-display text-ink uppercase tracking-tight">Uninode KCET Option Entry Helper</h1>
          <p className="text-sm font-semibold text-muted mt-1">
            Rank: <span className="font-mono text-ink mr-4">{Number(rank).toLocaleString('en-IN')}</span>
            Category: <span className="font-mono text-ink mr-4">{category}</span>
            Seat Type: <span className="font-mono text-ink mr-4">{seatType}</span>
            Stream: <span className="font-mono text-ink">{formattedStreamName}</span>
          </p>
        </div>

        {/* Desktop Branding Header (Hidden on Print) */}
        <div className="flex items-center justify-between gap-2 text-left mb-6 print:hidden">
          <Link to="/" className="font-display font-bold text-xl tracking-tight text-ink flex items-center">
            Uninode<span className="text-blue-600 ml-1">KCET</span>
          </Link>
          <div>
            <Link 
              to={`/${stream}`}
              className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 bg-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" /> Back to Predictor
            </Link>
          </div>
        </div>

        {/* Page Title Row (Hidden on Print) */}
        <div className="mb-6 border-b border-border/50 pb-5 print:hidden">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-ink mb-1 flex items-center gap-2">
            Option entry generator
          </h1>
        </div>

        {/* Configuration Bar */}
        <OptionConfigBar
          stream={stream}
          setStream={setStream}
          rank={rank}
          setRank={setRank}
          category={category}
          setCategory={setCategory}
          seatType={seatType}
          setSeatType={setSeatType}
          setOptionsList={setOptionsList}
          setSelectedSearchBranches={setSelectedSearchBranches}
          setWizardBranches={setWizardBranches}
        />

        {/* Wizard Panel */}
        <OptionWizard
          wizardBranches={wizardBranches}
          setWizardBranches={setWizardBranches}
          wizardBranchInput={wizardBranchInput}
          setWizardBranchInput={setWizardBranchInput}
          wizardBranchOpen={wizardBranchOpen}
          setWizardBranchOpen={setWizardBranchOpen}
          filteredWizardBranches={filteredWizardBranches}
          toggleWizardBranch={toggleWizardBranch}
          wizardThreshold={wizardThreshold}
          setWizardThreshold={setWizardThreshold}
          handleAutoGenerate={handleAutoGenerate}
          wizardBranchRef={wizardBranchRef}
        />

        {/* Global Warnings Panel (Hidden on Print) */}
        {strategicWarnings.length > 0 && (
          <div className="space-y-3 mb-6 print:hidden">
            {strategicWarnings.map((w, idx) => (
              <div key={idx} className="flex gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-miss text-xs leading-relaxed font-body">
                <AlertTriangle className="w-5 h-5 shrink-0 text-miss" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">warning</span>
                  {w.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="text-center py-20 bg-white border border-border rounded-2xl shadow-sm print:hidden">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted mb-4" />
            <p className="text-muted font-body text-sm">Loading...</p>
          </div>
        )}

        {/* Error notification */}
        {error && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 text-miss text-sm rounded-xl mb-6 print:hidden">
            {error}
          </div>
        )}

        {/* Split Screen Container */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1 min-h-0 print:block">
            
            {/* Mobile Tab Toggles (Hidden on Desktop & Print) */}
            <div className="lg:hidden flex bg-border/50 p-1 rounded-xl border border-border/80 print:hidden">
              <button 
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'search' ? 'bg-white shadow-sm text-ink' : 'text-muted'}`}
              >
                <Search className="w-4 h-4" /> Find Choices
              </button>
              <button 
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'list' ? 'bg-white shadow-sm text-ink' : 'text-muted'}`}
              >
                <ListOrdered className="w-4 h-4" /> My Priority List 
                {optionsList.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-ink text-white rounded text-[10px] font-mono font-bold leading-none">{optionsList.length}</span>
                )}
              </button>
            </div>
            {/* Left Panel: Search & Suggestions */}
            <OptionSearchPanel
              findCollegesOpen={findCollegesOpen}
              setFindCollegesOpen={setFindCollegesOpen}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              safetyFilter={safetyFilter}
              setSafetyFilter={setSafetyFilter}
              eligibleColleges={eligibleColleges}
              optionsList={optionsList}
              addOption={addOption}
              expandedHistory={expandedHistory}
              toggleHistory={toggleHistory}
              stream={stream}
              rounds={rounds}
              rank={rank}
              evaluateSafety={evaluateSafety}
              activeTab={activeTab}
            />

            {/* Right Panel: Preference List */}
            <OptionPriorityList
              optionsList={optionsList}
              listStats={listStats}
              collapsedCategories={collapsedCategories}
              setCollapsedCategories={setCollapsedCategories}
              expandedHistory={expandedHistory}
              toggleHistory={toggleHistory}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
              editVal={editVal}
              setEditVal={setEditVal}
              handleEditSubmit={handleEditSubmit}
              moveOption={moveOption}
              removeOption={removeOption}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragEnd={handleDragEnd}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              stream={stream}
              rounds={rounds}
              rank={rank}
              evaluateSafety={evaluateSafety}
              handleShareList={handleShareList}
              handleExportCSV={handleExportCSV}
              handlePrint={handlePrint}
              handleClearList={handleClearList}
              shareStatus={shareStatus}
              activeTab={activeTab}
            />
          </div>
        )}
        
        {/* Print Footer */}
        <div className="hidden print:block mt-12 border-t border-border pt-4 text-center text-xs font-body text-muted">
          Generated by kcet.uninode.in - KCET Cutoff Analyzer
        </div>

        <Footer className="print:hidden" />

        {/* Custom Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm print:hidden transition-opacity duration-200">
            <div className="bg-white border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl print:hidden transform transition-all duration-200">
              <h4 className="text-lg font-display font-bold text-ink mb-2">Clear Options List</h4>
              <p className="text-muted text-xs font-body mb-6 leading-relaxed">
                Are you sure you want to clear your current priority list? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 border border-border bg-white text-ink hover:bg-paper rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setOptionsList([])
                    localStorage.removeItem(`op_list_${stream}`)
                    setShowClearConfirm(false)
                  }}
                  className="px-4 py-2 bg-miss text-white hover:bg-miss/90 rounded-xl text-xs font-bold transition-all shadow-sm border border-red-700"
                >
                  Clear List
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
