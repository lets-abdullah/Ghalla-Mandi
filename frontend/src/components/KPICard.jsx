import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const KPICard = ({ title, amount, trend, subtext, icon: Icon, onClick }) => {
  const { theme } = useTheme();

  return (
    <div 
      onClick={onClick}
      className={`border rounded-2xl p-4 card-shadow flex flex-col justify-between cursor-pointer group transition-all ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-750' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
            {title}
          </span>
          <h3 className="text-xl font-bold mt-1 tracking-tight font-mono text-slate-900 dark:text-white truncate">
            {amount}
          </h3>
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 group-hover:bg-slate-200 transition">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${
        theme === 'dark' ? 'border-slate-700' : 'border-slate-100'
      }`}>
        {subtext && <span className="text-slate-500 font-medium text-[11px] truncate">{subtext}</span>}
      </div>
    </div>
  );
};
