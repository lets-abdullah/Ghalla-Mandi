import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const KPICard = ({
  title,
  amount,
  trend,
  subtext,
  icon: Icon,
  color = 'brand',
  onClick
}) => {
  const { theme } = useTheme();

  // Vibrant color mappings
  const colorStyles = {
    emerald: {
      card: theme === 'dark' ? 'bg-slate-800 border-emerald-500/20' : 'bg-gradient-to-b from-emerald-50/40 to-white border-emerald-200/70',
      iconBox: 'bg-emerald-100 text-emerald-700 shadow-2xs',
      value: 'text-emerald-600 dark:text-emerald-400',
      badge: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60'
    },
    blue: {
      card: theme === 'dark' ? 'bg-slate-800 border-blue-500/20' : 'bg-gradient-to-b from-blue-50/40 to-white border-blue-200/70',
      iconBox: 'bg-blue-100 text-blue-700 shadow-2xs',
      value: 'text-blue-600 dark:text-blue-400',
      badge: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60'
    },
    brand: {
      card: theme === 'dark' ? 'bg-slate-800 border-brand-500/20' : 'bg-gradient-to-b from-brand-50/40 to-white border-brand-200/70',
      iconBox: 'bg-brand-100 text-brand-700 shadow-2xs',
      value: 'text-brand-600 dark:text-brand-400',
      badge: 'text-brand-700 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60'
    },
    amber: {
      card: theme === 'dark' ? 'bg-slate-800 border-amber-500/20' : 'bg-gradient-to-b from-amber-50/40 to-white border-amber-200/70',
      iconBox: 'bg-amber-100 text-amber-700 shadow-2xs',
      value: 'text-amber-600 dark:text-amber-400',
      badge: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60'
    },
    rose: {
      card: theme === 'dark' ? 'bg-slate-800 border-rose-500/20' : 'bg-gradient-to-b from-rose-50/40 to-white border-rose-200/70',
      iconBox: 'bg-rose-100 text-rose-700 shadow-2xs',
      value: 'text-rose-600 dark:text-rose-400',
      badge: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60'
    },
    indigo: {
      card: theme === 'dark' ? 'bg-slate-800 border-indigo-500/20' : 'bg-gradient-to-b from-indigo-50/40 to-white border-indigo-200/70',
      iconBox: 'bg-indigo-100 text-indigo-700 shadow-2xs',
      value: 'text-indigo-600 dark:text-indigo-400',
      badge: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60'
    }
  };

  const activeStyle = colorStyles[color] || colorStyles.brand;

  return (
    <div
      onClick={onClick}
      className={`border rounded-2xl p-4 card-shadow card-hover flex flex-col justify-between cursor-pointer group transition-all ${activeStyle.card}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
            {title}
          </span>
          <h3 className={`text-xl font-black mt-1 tracking-tight font-mono truncate ${activeStyle.value}`}>
            {amount}
          </h3>
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition ${activeStyle.iconBox}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${
        theme === 'dark' ? 'border-slate-700/60' : 'border-slate-100'
      }`}>
        {trend && (
          <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {trend}
          </span>
        )}
        {subtext && (
          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] truncate ${activeStyle.badge}`}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};

export default KPICard;
