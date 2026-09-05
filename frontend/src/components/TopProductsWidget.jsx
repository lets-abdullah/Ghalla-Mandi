import React, { useMemo } from 'react';
import { TrendingUp, PackagePlus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const TopProductsWidget = () => {
  const { products = [], sales = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const topProducts = useMemo(() => {
    const productStats = new Map();

    (products || []).forEach(p => {
      productStats.set(String(p.id), {
        ...p,
        totalSoldQty: 0,
        totalRevenue: 0
      });
    });

    (sales || []).forEach(s => {
      const items = s.cart || s.items || [];
      if (Array.isArray(items)) {
        items.forEach(it => {
          const pId = String(it.productId || it.id);
          const found = productStats.get(pId) || (products || []).find(p => p.name?.toLowerCase() === (it.name || it.productName || '').toLowerCase());
          if (found) {
            const key = String(found.id);
            if (!productStats.has(key)) {
              productStats.set(key, { ...found, totalSoldQty: 0, totalRevenue: 0 });
            }
            const stat = productStats.get(key);
            stat.totalSoldQty += Number(it.qty || it.enteredQty || 1);
            stat.totalRevenue += Number(it.total || ((it.qty || 1) * (it.rate || it.price || 0)));
          }
        });
      }
    });

    const list = Array.from(productStats.values());
    return list.sort((a, b) => {
      if (b.totalSoldQty !== a.totalSoldQty) return b.totalSoldQty - a.totalSoldQty;
      if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
      return (Number(b.stockQty) || 0) - (Number(a.stockQty) || 0);
    }).slice(0, 4);
  }, [products, sales]);

  return (
    <div className={`h-full border rounded-2xl p-5 card-shadow flex flex-col justify-between transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base tracking-tight">{t('topSellingProducts')}</h3>
          </div>
          <Link to="/products" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            {t('catalog')}
          </Link>
        </div>

        {topProducts.length === 0 ? (
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
            {topProducts.map((item, idx) => (
              <div key={item.id} className={`flex items-center justify-between p-2 rounded-xl border border-transparent transition ${theme === 'dark' ? 'hover:bg-slate-700/60 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-100'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs text-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {item.totalSoldQty > 0 ? `${item.totalSoldQty.toLocaleString()} ${item.unit || 'Litre'} sold` : (item.category || 'Commodity')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Rs. {(Number(item.sellingPrice ?? item.sellingprice) || 0).toLocaleString()}/{item.unit || item.baseUnit || t('kg')}</div>
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{(Number(item.stockQty ?? item.stockqty) || 0).toLocaleString()} {item.unit || item.baseUnit || t('kg')} Available</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopProductsWidget;
