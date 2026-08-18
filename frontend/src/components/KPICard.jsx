import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const KPICard = ({ title, amount, trend, subtext, icon: Icon, bgClass, iconClass, isPositive = true, onClick }) => {
  const { theme } = useTheme();

  return (
    <div 
      onClick={onClick}
      className={`border rounded-2xl p-4 card-shadow card-hover flex flex-col justify-between cursor-pointer group transition-all ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200/90 text-slate-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className={`text-xs font-semibold group-hover:text-brand-500 transition ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>{title}</span>
          <h3 className="text-xl font-extrabold mt-1 tracking-tight">
            {amount}
          </h3>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass} ${iconClass} group-hover:scale-105 transition`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold ${
        theme === 'dark' ? 'border-slate-700/60' : 'border-slate-100'
      }`}>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend}
          </span>
        )}
        {subtext && <span className="text-slate-400 font-normal text-[11px]">{subtext}</span>}
      </div>
    </div>
  );
};
