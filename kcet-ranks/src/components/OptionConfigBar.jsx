import React from 'react'
import streamsData from '../streams.json'

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
  setWizardBranches
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-border rounded-2xl p-4 shadow-sm mb-6 print:hidden">
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
          {streamsData.map(s => {
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
          value={rank}
          onChange={e => setRank(e.target.value.replace(/-/g, ''))}
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
    </div>
  )
}
