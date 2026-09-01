import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const LowStockWidget = () => {
  const { products } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const lowStockItems = (products || []).filter(p => {
    const stock = Number(p.stockQty !== undefined ? p.stockQty : (p.stockqty !== undefined ? p.stockqty : 0));
    const min = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : 10));
    return stock <= min;
  });

  return (
    <div className={`h-full border rounded-2xl p-5 card-shadow flex flex-col justify-between transition-colors ${
      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">{t('lowStockAlerts')}</h3>
          </div>
          <Link to="/inventory" className="text-xs font-semibold text-brand-500 hover:underline">
            {t('viewAll')}
          </Link>
        </div>

        {lowStockItems.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-700/60 text-slate-300' : 'bg-slate-50/70 border-slate-200 text-slate-600'
          }`}>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{t('allStockHealthy')}</div>
            <p className="text-[11px] text-slate-400 mt-1">{t('noStockReplenish')}</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {lowStockItems.slice(0, 4).map((item) => (
              <div key={item.id} className={`flex items-center justify-between p-2 rounded-xl border border-transparent transition ${
                theme === 'dark' ? 'hover:bg-slate-700/60 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-extrabold text-xs ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    {(item.name || 'P').charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {t('currentStock')}: <span className="font-semibold">{Number(item.stockQty ?? item.stockqty ?? 0).toLocaleString()} {item.unit || item.baseUnit || t('kg')}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {t('minStockLabel')}: {Number(item.minStock ?? item.minstock ?? 10).toLocaleString()} {item.unit || item.baseUnit || t('kg')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
