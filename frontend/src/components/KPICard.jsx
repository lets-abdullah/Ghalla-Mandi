import React from 'react';
import { ArrowUpRight } from 'lucide-react';
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
  const isDark = theme === 'dark';

  // Semantic color styles matching mockup design
  const colorStyles = {
    emerald: {
      card: isDark ? 'bg-slate-800 border-emerald-500/30' : 'bg-white border-slate-200/80',
      iconBox: 'bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
      value: 'text-emerald-600 dark:text-emerald-400',
      wave: 'text-emerald-400/40 dark:text-emerald-500/30'
    },
    blue: {
      card: isDark ? 'bg-slate-800 border-blue-500/30' : 'bg-white border-slate-200/80',
      iconBox: 'bg-blue-100/70 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
      value: 'text-blue-600 dark:text-blue-400',
      wave: 'text-blue-400/40 dark:text-blue-500/30'
    },
    orange: {
      card: isDark ? 'bg-slate-800 border-orange-500/30' : 'bg-white border-slate-200/80',
      iconBox: 'bg-orange-100/70 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
      value: 'text-orange-600 dark:text-orange-400',
      wave: 'text-orange-400/40 dark:text-orange-500/30'
    },
    red: {
      card: isDark ? 'bg-slate-800 border-red-500/30' : 'bg-white border-slate-200/80',
      iconBox: 'bg-red-100/70 text-red-600 dark:bg-red-950/50 dark:text-red-400',
      value: 'text-red-600 dark:text-red-400',
      wave: 'text-red-400/40 dark:text-red-500/30'
    },
    amber: {
      card: isDark ? 'bg-slate-800 border-amber-500/30' : 'bg-white border-slate-200/80',
      iconBox: 'bg-amber-100/70 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
      value: 'text-amber-600 dark:text-amber-400',
      wave: 'text-amber-400/40 dark:text-amber-500/30'
    },
    rose: {
      card: isDark ? 'bg-slate-800 border-rose-500/30' : 'bg-white border-slate-200/80',
      iconBox: 'bg-rose-100/70 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
      value: 'text-rose-600 dark:text-rose-400',
      wave: 'text-rose-400/40 dark:text-rose-500/30'
    },
    slate: {
      card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/80',
      iconBox: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      value: 'text-slate-900 dark:text-white',
      wave: 'text-slate-300/40 dark:text-slate-600/30'
    }
  };

  const activeStyle = colorStyles[color] || colorStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`border rounded-2xl p-4 card-shadow card-hover flex flex-col justify-between cursor-pointer group transition-all relative overflow-hidden ${activeStyle.card}`}
    >
      {/* Top row: Title and Icon Badge */}
      <div className="flex items-start justify-between gap-2 z-10">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block truncate" title={title}>
            {title}
          </span>
          <h3 className={`text-xl sm:text-2xl font-black mt-2 tracking-tight whitespace-nowrap overflow-visible ${activeStyle.value}`}>
            {amount}
          </h3>
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-all ${activeStyle.iconBox}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Subtext if provided */}
      {subtext && (
        <div className="mt-2 text-[11px] font-bold text-slate-400 truncate z-10">
          {subtext}
        </div>
      )}

      {/* Bottom Wave Graphic */}
      <div className="mt-3 -mb-2 -mx-4 overflow-hidden pointer-events-none">
        <svg viewBox="0 0 120 20" className="w-full h-5 preserve-3d" fill="none">
          <path
            d="M 0 14 Q 30 6 60 14 T 120 10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className={activeStyle.wave}
          />
        </svg>
      </div>
    </div>
  );
};

export default KPICard;
