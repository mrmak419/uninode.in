import React from 'react'
import { X } from 'lucide-react'

export default function BranchPicker({
  selectedBranches,
  setSelectedBranches,
  inputValue,
  setInputValue,
  isOpen,
  setIsOpen,
  filteredBranches,
  toggleBranch,
  containerRef
}) {
  return (
    <div className="mt-3 relative" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 border border-border bg-white rounded-lg min-h-[40px]">
        {selectedBranches.map(branchName => (
          <span key={branchName} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-bold border border-accent/20">
            {branchName}
            <button onClick={() => setSelectedBranches(selectedBranches.filter(b => b !== branchName))} className="hover:bg-accent/20 rounded p-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder={selectedBranches.length === 0 ? "Select branches (e.g. CS, IS...)" : "Add more..."}
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          className="bg-transparent border-0 outline-none text-xs flex-1 min-w-[120px] text-ink"
        />
      </div>
      {isOpen && filteredBranches.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto scrollbar-thin">
          {filteredBranches.map(pb => (
            <button
              key={pb.name}
              onMouseDown={() => toggleBranch(pb.name)}
              className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper transition-colors border-b border-border/40 last:border-0"
            >
              <span className="font-semibold">{pb.name}</span>
              {pb.alias && <span className="ml-2 text-[10px] text-muted font-mono font-medium">({pb.alias})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
