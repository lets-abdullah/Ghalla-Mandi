import React, { useState, useEffect } from 'react';
import { Warehouse, ArrowUpRight, ArrowDownLeft, RefreshCw, X, Package, AlertTriangle, DollarSign } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Inventory = () => {
  const { products, stockMovements, adjustStock } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const totalStockQty = (products || []).reduce((acc, p) => acc + (Number(p.stockQty ?? p.stockqty) || 0), 0);
  const totalInventoryValue = (products || []).reduce((acc, p) => acc + ((Number(p.stockQty ?? p.stockqty) || 0) * (Number(p.purchasePrice ?? p.purchaseprice) || 0)), 0);
  const lowStockCount = (products || []).filter(p => {
    const stock = Number(p.stockQty !== undefined ? p.stockQty : (p.stockqty !== undefined ? p.stockqty : 0));
    const min = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : 10));
    return stock <= min;
  }).length;

  const handleAdjSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const qtyVal = Math.max(1, Math.floor(Number(adjForm.qtyKg) || 1));
    if (!selectedProd) return;

    const currentStock = Number(selectedProd.stockQty ?? selectedProd.stockqty ?? 0);
    if (adjForm.type === 'OUT' && currentStock < qtyVal) {
      alert(t('cannotDeductStock', { qty: qtyVal, unit: selectedProd.unit || selectedProd.baseUnit || t('kg'), stock: currentStock }));
      return;
    }

    setIsSubmitting(true);
    try {
      const finalQty = adjForm.type === 'IN' ? qtyVal : -qtyVal;
      await adjustStock(selectedProd.id, finalQty, adjForm.type, adjForm.reason);
      setShowAdjModal(false);
      setAdjForm({
        productId: products[0]?.id || '',
        qtyKg: 1,
        type: 'IN',
        reason: 'Manual Warehouse Count Audit'
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Inventory KPI Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border flex items-center gap-3 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">{t('totalProducts')}</div>
            <div className="text-lg font-black">{products.length} {t('items')}</div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center gap-3 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">{t('currentStock')}</div>
            <div className="text-lg font-black">{totalStockQty.toLocaleString()} {t('itemsInStock') || 'Units'}</div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center gap-3 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">{t('stockAndInventory')}</div>
            <div className="text-lg font-black">Rs. {totalInventoryValue.toLocaleString()}</div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center gap-3 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${lowStockCount > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">{t('lowStockAlerts')}</div>
            <div className={`text-lg font-black ${lowStockCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {lowStockCount} {t('items')}
            </div>
          </div>
        </div>
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${m.type && m.type.includes('IN') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                      {m.type && m.type.includes('IN') ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {m.type && m.type.includes('IN') ? t('stockIn') : t('stockOut')}
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
                    <option key={p.id} value={p.id}>{p.name} ({t('currentStock')}: {Number(p.stockQty ?? p.stockqty ?? 0).toLocaleString()} {p.unit || p.baseUnit || t('kg')})</option>
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
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('quantity')} ({selectedProd?.unit || selectedProd?.baseUnit || t('kg')})</label>
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
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : t('confirmAdjustment')}
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
