import React from 'react'
import examsData from '../exams.json'
import { Info } from 'lucide-react'

const ALL_CATEGORIES = [
  '1G','1K','1R',
  '2AG','2AK','2AR','2BG','2BK','2BR',
  '3AG','3AK','3AR','3BG','3BK','3BR',
  'GM','GMK','GMR',
  'SCG','SCK','SCR',
  'STG','STK','STR',
]

const SEAT_TYPES = [
  { value: 'ROK', label: 'Rest of Karnataka' },
  { value: 'HK',  label: 'Hyderabad Karnataka' },
]

export default function OptionConfigBar({
  examPrefix,
  onExamChange,
  stream,
  setStream,
  rank,
  setRank,
  category,
  setCategory,
  seatType,
  setSeatType,
  setOptionsList,
  setSelectedSearchBranches,
  setWizardBranches,
  showAllPossible,
  setShowAllPossible
}) {
  const [localRank, setLocalRank] = React.useState(rank)
  const [showInfo, setShowInfo] = React.useState(false)

  React.useEffect(() => {
    setLocalRank(rank)
  }, [rank])

  const currentExamObj = examsData.find(e => e.id === examPrefix)
  const availableStreams = currentExamObj ? currentExamObj.streams : []

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 bg-white border border-border rounded-2xl p-4 shadow-sm mb-6">
      <div>
        <label htmlFor="config-exam" className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Exam</label>
        <select
          id="config-exam"
          value={examPrefix}
          onChange={e => onExamChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-paper text-ink"
        >
          {examsData.map(e => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="config-stream" className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Stream</label>
        <select
          id="config-stream"
          value={stream}
          onChange={e => {
            setStream(e.target.value)
            setOptionsList([])
            setSelectedSearchBranches([])
            setWizardBranches([])
          }}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-paper text-ink"
        >
          {availableStreams.map(s => {
            const sId = typeof s === 'string' ? s : s.id
            const displayName = sId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return <option key={sId} value={sId}>{displayName}</option>
          })}
        </select>
      </div>
      <div>
        <label htmlFor="config-rank" className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Your Rank</label>
        <input
          id="config-rank"
          type="number"
          min="1"
          max="400000"
          placeholder="e.g. 15000"
          value={localRank}
          onChange={e => setLocalRank(e.target.value.replace(/-/g, ''))}
          onBlur={() => setRank(localRank)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setRank(localRank)
            }
          }}
          className="w-full px-3 py-2 border border-border rounded-lg font-mono text-sm bg-paper text-ink"
        />
      </div>
      <div>
        <label htmlFor="config-category" className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Category</label>
        <select
          id="config-category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg font-mono text-sm bg-paper text-ink"
        >
          {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="config-seattype" className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Seat Type</label>
        <select
          id="config-seattype"
          value={seatType}
          onChange={e => setSeatType(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-paper text-ink"
        >
          {SEAT_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="sm:col-span-2 md:col-span-5 border-t border-border/50 pt-3 mt-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllPossible}
              onChange={e => setShowAllPossible(e.target.checked)}
              className="w-4 h-4 rounded border-border text-ink focus:ring-ink cursor-pointer"
            />
            Show all colleges (from rank 1)
          </label>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors focus:outline-none flex items-center justify-center"
            title="More Information"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        {showInfo && (
          <div className="text-[11px] font-medium text-muted leading-relaxed bg-paper border border-border rounded-xl p-3 max-w-2xl shadow-sm">
            By default, we show a smartly filtered list based on your rank. Enabling this shows every college with an available cutoff, including those well outside your range. The KEA allotment system will automatically skip colleges you're not eligible for.
          </div>
        )}
      </div>
    </div>
  )
}
