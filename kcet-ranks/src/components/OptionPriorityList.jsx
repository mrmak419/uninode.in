import React from 'react'
import { Link } from 'react-router-dom'
import { 
  GraduationCap, Share2, Download, Printer, ChevronDown, 
  GripVertical, ArrowUp, ArrowDown, Trash2, ExternalLink 
} from 'lucide-react'
import CutoffHistoryTable from './CutoffHistoryTable'
import { slugify, getArticleUrl } from '../lib/url'

export default function OptionPriorityList({
  examPrefix = 'kcet',
  optionsList,
  listStats,
  collapsedCategories,
  setCollapsedCategories,
  expandedHistory,
  toggleHistory,
  editingIndex,
  setEditingIndex,
  editVal,
  setEditVal,
  handleEditSubmit,
  moveOption,
  removeOption,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  draggedIndex,
  dragOverIndex,
  stream,
  rounds,
  rank,
  evaluateSafety,
  handleShareList,
  handleExportCSV,
  handlePrint,
  handleClearList,
  shareStatus,
  activeTab,
  category
}) {
  return (
    <div className={`flex flex-col gap-4 print:block ${activeTab === 'list' ? 'block' : 'hidden'}`}>
      
      {/* Header and Stats box */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink flex items-center gap-1.5">
            My Options List
            <span className="text-xs px-2 py-0.5 bg-ink text-white rounded-md font-mono font-bold">{optionsList.length} Selected</span>
          </h2>
        </div>

        {/* Scorecards */}
        <div className="flex gap-2">
          <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-center min-w-[50px]">
            <span className="block text-[8px] font-bold text-green-700 uppercase tracking-wider leading-none">Safe</span>
            <span className="font-mono text-sm font-bold text-green-800 leading-none mt-1 inline-block">{listStats.safe}</span>
          </div>
          <div className="px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-center min-w-[50px]">
            <span className="block text-[8px] font-bold text-yellow-700 uppercase tracking-wider leading-none">Target</span>
            <span className="font-mono text-sm font-bold text-yellow-800 leading-none mt-1 inline-block">{listStats.borderline}</span>
          </div>
          <div className="px-2 py-1 bg-red-50 border border-red-200 rounded text-center min-w-[50px]">
            <span className="block text-[8px] font-bold text-red-700 uppercase tracking-wider leading-none">Dream</span>
            <span className="font-mono text-sm font-bold text-red-800 leading-none mt-1 inline-block">{listStats.dream}</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar (Hidden on Print) */}
      {optionsList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-border rounded-2xl p-3.5 shadow-sm print:hidden">
          <button
            onClick={handleShareList}
            className="flex items-center gap-1 px-4 py-2 border border-border bg-white text-ink hover:bg-paper rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <Share2 className="w-3.5 h-3.5 text-muted" /> 
            <span>{shareStatus || 'Share List'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="p-2 border border-border bg-white hover:bg-paper rounded-xl transition-all shadow-sm text-muted hover:text-ink shrink-0"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 border border-border bg-white hover:bg-paper rounded-xl transition-all shadow-sm text-muted hover:text-ink shrink-0"
              title="Print Options List"
            >
              <Printer className="w-4 h-4 text-muted" />
            </button>
            <button
              onClick={handleClearList}
              className="px-4 py-2 border border-red-200 bg-red-50 text-miss hover:bg-red-100 rounded-xl text-xs font-bold transition-all shrink-0"
            >
              Clear List
            </button>
          </div>
        </div>
      )}

      {/* Priority Ordered List */}
      <div className="border border-border rounded-2xl bg-white shadow-sm overflow-hidden">
        {optionsList.length === 0 ? (
          <div className="text-center py-20 px-4 text-muted text-sm font-body">
            <GraduationCap className="w-12 h-12 text-border mx-auto mb-4" />
            <p className="font-semibold text-ink">Your priority list is currently empty</p>
            <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
              Add colleges from the search panel on the left, or select branches to instantly compile a list!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {[
              { key: 'dream', label: 'Dream Choices', badgeClass: 'bg-red-50 text-red-700 border-red-200', textClass: 'text-red-900', headerBg: 'bg-red-50/40 hover:bg-red-50/70' },
              { key: 'borderline', label: 'Target Choices', badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200', textClass: 'text-yellow-900', headerBg: 'bg-yellow-50/40 hover:bg-yellow-50/70' },
              { key: 'safe', label: 'Safe Choices', badgeClass: 'bg-green-50 text-green-700 border-green-200', textClass: 'text-green-900', headerBg: 'bg-green-50/40 hover:bg-green-50/70' },
              { key: 'neutral', label: 'Other Choices', badgeClass: 'bg-gray-50 text-gray-700 border-gray-200', textClass: 'text-gray-900', headerBg: 'bg-gray-50/40 hover:bg-gray-50/70' },
            ].map(cat => {
              const catItems = optionsList
                .map((item, idx) => ({ ...item, originalIndex: idx }))
                .filter(item => {
                  if (cat.key === 'neutral' && item.safety === 'hidden') return true
                  return item.safety === cat.key
                })

              if (catItems.length === 0) return null

              return (
                <div key={cat.key} className="border-b border-border/60 last:border-b-0 print:break-inside-avoid">
                  {/* Section Header */}
                  <button
                    onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-border/40 ${cat.headerBg}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${cat.textClass}`}>{cat.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${cat.badgeClass}`}>
                        {catItems.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 print:hidden text-indigo-600 hover:text-indigo-800 transition-colors">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {collapsedCategories[cat.key] ? 'Show' : 'Hide'}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsedCategories[cat.key] ? '' : 'rotate-180'}`} />
                    </div>
                  </button>

                  {/* Section Items */}
                  <div className={`${collapsedCategories[cat.key] ? 'hidden' : 'block'} divide-y divide-border/60`}>
                    {catItems.map(({ originalIndex: idx, ...item }, catItemIdx) => {
                      const itemKey = `list-item-${item.college_code}||${item.course_name}`
                      const isHistoryExpanded = expandedHistory.has(itemKey)
                      const isEditing = editingIndex === idx

                      let safetyBadgeColor = 'bg-gray-50 border-border text-ink'
                      if (item.safety === 'safe') safetyBadgeColor = 'bg-green-50 border-green-200 text-green-800'
                      else if (item.safety === 'borderline') safetyBadgeColor = 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      else if (item.safety === 'dream') safetyBadgeColor = 'bg-red-50 border-red-100 text-red-800'

                      return (
                        <div 
                          key={itemKey}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={handleDragEnd}
                          onClick={() => toggleHistory(itemKey)}
                          className={`p-3 cursor-pointer transition-all ${
                            draggedIndex === idx ? 'opacity-40 scale-95' : 'opacity-100'
                          } ${
                            dragOverIndex === idx ? 'border-t-2 border-t-ink bg-gray-50' : ''
                          } ${!isHistoryExpanded ? 'hover:bg-paper/30' : ''} print:break-inside-avoid`}
                        >
                          <div className="flex items-start gap-3">
                            
                            {/* LHS: Priority Index Badge */}
                            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editVal}
                                  onChange={e => setEditVal(e.target.value)}
                                  onBlur={() => handleEditSubmit(idx)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleEditSubmit(idx) }}
                                  onClick={e => e.stopPropagation()}
                                  autoFocus
                                  className="w-10 text-center font-mono text-xs font-bold border border-ink bg-white rounded py-0.5 text-ink print:hidden"
                                />
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingIndex(idx); setEditVal(String(idx + 1)) }}
                                  title="Click to manually edit priority"
                                  className="w-7 h-7 bg-ink text-paper rounded-lg font-mono text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-accent transition-colors shrink-0"
                                >
                                  {idx + 1}
                                </button>
                              )}
                              
                              {/* Drag Handle Icon (Hidden on Print & Mobile) */}
                              <div className="hidden lg:flex cursor-grab active:cursor-grabbing text-muted hover:text-ink p-1 rounded hover:bg-gray-100 shrink-0 print:hidden" title="Drag to reorder">
                                <GripVertical className="w-4 h-4 text-muted/60" />
                              </div>
                            </div>

                            {/* Middle Panel: College Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-paper border border-border rounded text-muted">{item.college_code}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${safetyBadgeColor}`}>
                                  {item.safety === 'hidden' ? 'UNREALISTIC' : item.safety.toUpperCase()}
                                </span>
                              </div>
                              <h4 className="font-bold text-ink text-sm leading-snug break-words">{item.college_name}</h4>
                              <p className="text-muted text-xs font-body mt-0.5">{item.course_name}</p>
                              {item.cutoff_rank && (
                                <p className="text-muted font-mono text-[10px] mt-1">
                                  Cutoff: <span className="font-bold text-ink">{item.cutoff_rank.toLocaleString('en-IN')}</span> ({item.cutoff_label})
                                </p>
                              )}
                            </div>

                            {/* RHS Controls: Up/Down Buttons & Trash (Hidden on Print) */}
                            <div className="flex items-center gap-1 pt-1 shrink-0 print:hidden" onClick={e => e.stopPropagation()}>
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() => moveOption(idx, -1)}
                                  disabled={catItemIdx === 0}
                                  className="p-1 border border-border bg-white text-muted hover:text-ink hover:bg-gray-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                  aria-label="Move option up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveOption(idx, 1)}
                                  disabled={catItemIdx === catItems.length - 1}
                                  className="p-1 border border-border bg-white text-muted hover:text-ink hover:bg-gray-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                  aria-label="Move option down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeOption(idx)}
                                className="p-2 border border-red-100 hover:bg-red-50 text-muted hover:text-miss rounded-lg transition-colors ml-1"
                                aria-label="Remove option"
                                title="Remove college"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                          </div>

                          {/* Action Bar */}
                          <div className="mt-3 flex items-center justify-end gap-2 border-t border-dashed border-border/60 pt-3 print:hidden">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleHistory(itemKey); }}
                              className="px-2.5 py-1.5 rounded-md text-[10px] font-bold border border-border bg-white text-ink hover:bg-gray-50 flex items-center gap-1 transition-colors"
                            >
                              {isHistoryExpanded ? 'Hide Cutoffs' : 'Show Cutoffs'}
                              <ChevronDown className={`w-3 h-3 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            <Link
                              to={getArticleUrl(examPrefix, stream, item.college_code, item.course_name, category)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1.5 rounded-md text-[10px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                            >
                              View Analysis <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>

                          {isHistoryExpanded && (
                            <CutoffHistoryTable
                              rounds={rounds}
                              item={item}
                              studentRank={rank}
                              evaluateSafety={evaluateSafety}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
