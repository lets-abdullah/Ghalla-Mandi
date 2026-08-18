import React from 'react';
import { BarChart3, FileSpreadsheet, Printer } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Reports = () => {
  const { sales, purchases, products } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const grossSales = sales.reduce((acc, s) => acc + s.amount, 0);
  const grossProfit = sales.reduce((acc, s) => acc + (s.profit || 0), 0);
  const cogs = Math.max(0, grossSales - grossProfit);
  const netProfit = grossProfit;

  const exportCSV = () => {
    const csvContent = `Metric,Value\nGross Sales,${grossSales}\nCost of Goods Sold,${cogs}\nGross Operating Profit,${grossProfit}\nNet Profit,${netProfit}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Mandi_Financial_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-500" />
            {t('reportsTitle')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('reportsSubtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            <Printer className="w-4 h-4" /> {t('Print Receipt')}
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> {t('exportCsvReport')}
          </button>
        </div>
      </div>

      {/* P&L Dynamic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400">{t('totalSalesVolume')}</div>
          <div className="text-2xl font-extrabold mt-1">Rs. {grossSales.toLocaleString()}</div>
          <div className="text-xs text-emerald-500 font-bold mt-2">{t('basedOnSales')}</div>
        </div>
        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400">{t('costOfGoodsSold')}</div>
          <div className="text-2xl font-extrabold mt-1">Rs. {cogs.toLocaleString()}</div>
          <div className="text-xs text-brand-500 font-bold mt-2">{t('basedOnPurchaseMargins')}</div>
        </div>
        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400">{t('netOperatingProfit')}</div>
          <div className="text-2xl font-extrabold text-emerald-500 mt-1">Rs. {netProfit.toLocaleString()}</div>
          <div className="text-xs text-emerald-500 font-bold mt-2">{t('grossProfit')}</div>
        </div>
      </div>

      {/* Product Catalog Breakdown Table */}
      <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <h3 className="font-extrabold text-sm mb-4">{t('commodityCatalogBreakdown')}</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-400'
              }`}>
              <th className="pb-3">{t('productName')}</th>
              <th className="pb-3 text-center">{t('category')}</th>
              <th className="pb-3 text-center">{t('currentStock')}</th>
              <th className="pb-3 text-right">{t('sellingPrice')}</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
            }`}>
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                  {t('noCommoditiesInCatalog')}
                </td>
              </tr>
            ) : (
              products.map(p => (
                <tr key={p.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                  }`}>
                  <td className="py-3 font-bold">{p.name}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 text-center font-bold">{p.stockQty} {p.unit || t('kg')}</td>
                  <td className="py-3 text-right text-slate-400">Rs. {p.sellingPrice}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
