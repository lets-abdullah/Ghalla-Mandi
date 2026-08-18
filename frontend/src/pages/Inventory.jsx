import React, { useState, useEffect } from 'react';
import { Warehouse, ArrowUpRight, ArrowDownLeft, RefreshCw, X } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Inventory = () => {
  const { products, stockMovements, adjustStock } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [showAdjModal, setShowAdjModal] = useState(false);

  const [adjForm, setAdjForm] = useState({
    productId: products[0]?.id || '',
    qtyKg: 1,
    type: 'IN',
    reason: 'Manual Warehouse Count Audit'
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showAdjModal) {
        setShowAdjModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAdjModal]);

  const selectedProd = products.find(p => p.id === (adjForm.productId || products[0]?.id)) || products[0];

  const handleAdjSubmit = (e) => {
    e.preventDefault();
    const qtyVal = Math.max(1, Math.floor(Number(adjForm.qtyKg) || 1));
    if (!selectedProd) return;

    if (adjForm.type === 'OUT' && selectedProd.stockQty < qtyVal) {
      alert(t('cannotDeductStock', { qty: qtyVal, unit: selectedProd.unit || t('kg'), stock: selectedProd.stockQty }));
      return;
    }

    const finalQty = adjForm.type === 'IN' ? qtyVal : -qtyVal;
    adjustStock(selectedProd.id, finalQty, adjForm.type, adjForm.reason);
    setShowAdjModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-brand-500" />
            {t('Inventory Page')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('All stock are displayed here')}</p>
        </div>

        <button
          onClick={() => setShowAdjModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> {t('adjustStock')}
        </button>
      </div>

      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b text-[11px] font-bold uppercase ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
              <th className="py-3 px-4">{t('date')}</th>
              <th className="py-3 px-4">{t('product')}</th>
              <th className="py-3 px-4">{t('movementType')}</th>
              <th className="py-3 px-4">{t('referenceNo')}</th>
              <th className="py-3 px-4 text-right">{t('quantity')}</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
            }`}>
            {stockMovements.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  {t('noStockMovementsRecorded')}
                </td>
              </tr>
            ) : (
              stockMovements.map(m => (
                <tr key={m.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                  }`}>
                  <td className="py-3 px-4 text-slate-400">{m.date}</td>
                  <td className="py-3 px-4 font-bold">{m.product}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${m.type.includes('IN') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                      {m.type.includes('IN') ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {m.type.includes('IN') ? t('stockIn') : t('stockOut')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-brand-500">{m.ref}</td>
                  <td className="py-3 px-4 text-right font-extrabold">{m.qty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {showAdjModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdjModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('manualStockAdjustment')}</h3>
              <button
                type="button"
                onClick={() => setShowAdjModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('selectProduct')}</label>
                <select
                  value={adjForm.productId || products[0]?.id}
                  onChange={(e) => setAdjForm({ ...adjForm, productId: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({t('currentStock')}: {p.stockQty} {p.unit || t('kg')})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('adjustmentType')}</label>
                  <select
                    value={adjForm.type}
                    onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="IN">{t('stockAddition')}</option>
                    <option value="OUT">{t('stockDeduction')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('quantity')} ({selectedProd?.unit || t('kg')})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={adjForm.qtyKg}
                    onChange={(e) => setAdjForm({ ...adjForm, qtyKg: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('auditReason')}</label>
                <input
                  type="text"
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {t('confirmAdjustment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
