import React from 'react';
import { useAuth } from '../context/AuthContext';

export const PrintHeader = ({ title, subtitle, filterSummary, stats = [] }) => {
  const { shop } = useAuth();
  const currentDate = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="print-only hidden mb-6 pb-4 border-b-2 border-slate-900">
      {/* Top Branding Strip */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
            {shop?.name || 'GHALLA MANDI TRADING ERP'}
          </h1>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            {shop?.address || shop?.city || 'Galla Mandi, Grain Market'} • Phone: {shop?.phone || 'Mandi Office'}
          </p>
        </div>
        <div className="text-right">
          <div className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-black uppercase tracking-wider text-slate-900">
            {title}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Generated: {currentDate}
          </div>
        </div>
      </div>

      {/* Subtitle & Filter Info */}
      {(subtitle || filterSummary) && (
        <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs text-slate-700">
          {subtitle && <span className="font-semibold text-slate-800">{subtitle}</span>}
          {filterSummary && (
            <span className="font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {filterSummary}
            </span>
          )}
        </div>
      )}

      {/* Optional Quick Print Summary Stat Badges */}
      {stats && stats.length > 0 && (
        <div className="mt-3 grid grid-flow-col auto-cols-fr gap-2 text-center">
          {stats.map((st, i) => (
            <div key={i} className="p-1.5 border border-slate-300 rounded bg-slate-50">
              <div className="text-[9px] uppercase font-bold text-slate-500">{st.label}</div>
              <div className="text-xs font-mono font-black text-slate-950 mt-0.5">{st.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
