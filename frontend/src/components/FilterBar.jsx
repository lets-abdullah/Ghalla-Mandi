import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * FilterBar — Standard collapsible filter toolbar used across list pages
 * 
 * Props:
 *   searchValue: string
 *   onSearchChange: (val: string) => void
 *   searchPlaceholder: string
 *   activeCount: number (how many non-default filters are active)
 *   onReset: () => void
 *   statusTabs?: { key: string, label: string, count?: number }[]
 *   activeStatus?: string
 *   onStatusChange?: (key: string) => void
 *   children?: React.ReactNode (more filters when expanded)
 */
export const FilterBar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  activeCount = 0,
  onReset,
  statusTabs,
  activeStatus,
  onStatusChange,
  children
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const isDark = theme === 'dark';

  return (
    <div className={`no-print border rounded-3xl p-3 sm:p-4 card-shadow space-y-3 transition-all ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      {/* Top row: Search + Status Tabs + Filter Expand Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 justify-between">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full border rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none h-[38px] transition ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-brand-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand-500'
            }`}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange && onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs if provided */}
        {statusTabs && statusTabs.length > 0 && (
          <div className="status-tab-group overflow-x-auto shrink-0 scrollbar-none py-0.5">
            {statusTabs.map(tab => {
              const isActive = activeStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onStatusChange && onStatusChange(tab.key)}
                  className={`status-tab ${isActive ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      isActive
                        ? isDark ? 'bg-brand-500/30 text-brand-300' : 'bg-brand-100 text-brand-700'
                        : 'text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Filter Expand Button & Reset */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {children && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isExpanded || activeCount > 0
                  ? isDark
                    ? 'bg-brand-950/40 border-brand-800 text-brand-300'
                    : 'bg-brand-50 border-brand-200 text-brand-700'
                  : isDark
                    ? 'border-slate-700 hover:bg-slate-700/60 text-slate-300'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-black flex items-center justify-center">
                  {activeCount}
                </span>
              )}
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {activeCount > 0 && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Advanced Filters */}
      {isExpanded && children && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 animate-in fade-in-50 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
