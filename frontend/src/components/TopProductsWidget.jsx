import React from 'react';
import { TrendingUp, PackagePlus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const TopProductsWidget = () => {
  const { products } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  return (
    <div className={`h-full border rounded-2xl p-5 card-shadow flex flex-col justify-between transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">{t('topSellingProducts')}</h3>
          </div>
          <Link to="/products" className="text-xs font-semibold text-brand-500 hover:underline">
            {t('catalog')}
          </Link>
        </div>

        {products.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700/60 text-slate-300' : 'bg-slate-50/70 border-slate-200 text-slate-600'
            }`}>
            <PackagePlus className="w-8 h-8 text-slate-400 mb-2" />
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{t('noCommoditiesInCatalog')}</div>
            <p className="text-[11px] text-slate-400 mt-1">{t('addProductsToTrack')}</p>
            <Link
              to="/products"
              className="mt-3 inline-flex items-center gap-1 bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> {t('addProduct')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {products.slice(0, 4).map((item, idx) => (
              <div key={item.id} className={`flex items-center justify-between p-2 rounded-xl border border-transparent transition ${theme === 'dark' ? 'hover:bg-slate-700/60 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-100'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center font-extrabold text-xs text-slate-400">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{item.name}</div>
                    <div className="text-[11px] text-slate-400">{item.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-emerald-500">Rs. {item.sellingPrice}/{item.unit || t('kg')}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{item.stockQty} {item.unit || t('kg')} {t('availableStock')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
