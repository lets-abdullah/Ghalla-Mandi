import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const KPICard = ({
  title,
  amount,
  trend,
  subtext,
  icon: Icon,
  color = 'blue',
  onClick
}) => {
  const { theme } = useTheme();

  // Strict semantic color styles adhering to the ERP Design System
  const colorStyles = {
    emerald: {
      card: theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60',
      iconBox: 'bg-emerald-100 text-emerald-700 shadow-2xs',
      value: 'text-emerald-600 dark:text-emerald-400',
      badge: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60'
    },
    blue: {
      card: theme === 'dark' ? 'bg-slate-800 border-blue-500/30' : 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200/60',
      iconBox: 'bg-blue-100 text-blue-700 shadow-2xs',
      value: 'text-blue-600 dark:text-blue-400',
      badge: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60'
    },
    amber: {
      card: theme === 'dark' ? 'bg-slate-800 border-amber-500/30' : 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200/60',
      iconBox: 'bg-amber-100 text-amber-700 shadow-2xs',
      value: 'text-amber-600 dark:text-amber-400',
      badge: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60'
    },
    rose: {
      card: theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60',
      iconBox: 'bg-rose-100 text-rose-700 shadow-2xs',
      value: 'text-rose-600 dark:text-rose-400',
      badge: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60'
    },
    red: {
      card: theme === 'dark' ? 'bg-slate-800 border-red-500/30' : 'bg-gradient-to-br from-red-50/40 to-white border-red-200/60',
      iconBox: 'bg-red-100 text-red-700 shadow-2xs',
      value: 'text-red-600 dark:text-red-400',
      badge: 'text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200/60'
    },
    orange: {
      card: theme === 'dark' ? 'bg-slate-800 border-orange-500/30' : 'bg-gradient-to-br from-orange-50/40 to-white border-orange-200/60',
      iconBox: 'bg-orange-100 text-orange-700 shadow-2xs',
      value: 'text-orange-600 dark:text-orange-400',
      badge: 'text-orange-700 bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60'
    },
    slate: {
      card: theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-slate-50/50 to-white border-slate-200',
      iconBox: 'bg-slate-100 text-slate-700 shadow-2xs',
      value: 'text-slate-900 dark:text-white',
      badge: 'text-slate-700 bg-slate-100 dark:bg-slate-800 border border-slate-200'
    }
  };

  const activeStyle = colorStyles[color] || colorStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`border rounded-2xl p-3.5 sm:p-4 card-shadow card-hover flex flex-col justify-between cursor-pointer group transition-all ${activeStyle.card}`}
    >
      {/* Top row: Title and Icon Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block truncate" title={title}>
            {title}
          </span>
          <h3 className={`text-base sm:text-lg lg:text-xl font-bold mt-1 tracking-tight tabular-nums whitespace-nowrap overflow-visible ${activeStyle.value}`}>
            {amount}
          </h3>
        </div>
        {Icon && (
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition ${activeStyle.iconBox}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Bottom row: Subtext or Trend */}
      <div className={`mt-3 pt-2 border-t flex items-center justify-between text-xs ${
        theme === 'dark' ? 'border-slate-700/60' : 'border-slate-100'
      }`}>
        {trend && (
          <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {trend}
          </span>
        )}
        {subtext && (
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-full" title={subtext}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};

export default KPICard;
