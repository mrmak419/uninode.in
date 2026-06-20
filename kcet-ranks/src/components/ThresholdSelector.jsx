import React from 'react'

export default function ThresholdSelector({ value, onChange }) {
  return (
    <div className="flex bg-paper border border-border rounded-lg p-0.5 shrink-0 self-center">
      <button 
        onClick={() => onChange('balanced')}
        className={`px-3 py-1 rounded text-xs font-bold transition-all ${value === 'balanced' ? 'bg-ink text-paper shadow-sm' : 'text-muted hover:text-ink'}`}
      >
        Balanced List
      </button>
      <button 
        onClick={() => onChange('safe')}
        className={`px-3 py-1 rounded text-xs font-bold transition-all ${value === 'safe' ? 'bg-ink text-paper shadow-sm' : 'text-muted hover:text-ink'}`}
      >
        Extra-Safe List
      </button>
    </div>
  )
}
