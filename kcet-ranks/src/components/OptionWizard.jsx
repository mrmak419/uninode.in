import React from 'react'
import BranchPicker from './BranchPicker'
export default function OptionWizard({
  wizardBranches,
  setWizardBranches,
  wizardBranchInput,
  setWizardBranchInput,
  wizardBranchOpen,
  setWizardBranchOpen,
  filteredWizardBranches,
  toggleWizardBranch,
  handleAutoGenerate,
  wizardBranchRef,
  generating
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
      <div className="flex-1">
        <h3 className="font-display font-bold text-ink text-lg">
          Select branches
        </h3>
        
        <BranchPicker
          selectedBranches={wizardBranches}
          setSelectedBranches={setWizardBranches}
          inputValue={wizardBranchInput}
          setInputValue={setWizardBranchInput}
          isOpen={wizardBranchOpen}
          setIsOpen={setWizardBranchOpen}
          filteredBranches={filteredWizardBranches}
          toggleBranch={toggleWizardBranch}
          containerRef={wizardBranchRef}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        <button
          onClick={handleAutoGenerate}
          disabled={generating}
          className="px-5 py-2.5 bg-ink hover:bg-accent text-paper text-sm font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
