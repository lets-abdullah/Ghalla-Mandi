import React, { useState, useEffect } from 'react';
import { X, Calculator, ArrowRight, Wheat, AlertCircle } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { InvoiceDrawer } from './InvoiceDrawer';

export const QuickSaleModal = ({ onClose }) => {
  const { products, customers, createSale } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const regularCustomers = customers.filter(c => (c.customerType || 'Regular Party') === 'Regular Party');

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [customerMode, setCustomerMode] = useState('Walk-in'); // 'Walk-in' | 'Regular'
  const [selectedCustomerId, setSelectedCustomerId] = useState(regularCustomers[0]?.id || '');
  const [walkInName, setWalkInName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find(p => p.id === (selectedProductId || products[0]?.id)) || products[0];
  const unitName = selectedProduct?.unit || t('kg');

  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(selectedProduct?.sellingPrice || 0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [completedInvoice, setCompletedInvoice] = useState(null);

  // Esc key press event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto update rate & paid amount when product changes
  const handleProductChange = (prodId) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setRate(prod.sellingPrice || 0);
      setQty(1);
      const total = 1 * (prod.sellingPrice || 0);
      setPaidAmount(total);
    }
  };

  const calculatedSubtotal = Math.max(0, (Number(qty) || 0) * (Number(rate) || 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (products.length === 0 || !selectedProduct) {
      alert(t('addProductFirst'));
      return;
    }

    if (customerMode === 'Regular' && regularCustomers.length === 0) {
      alert(t('addCustomerFirst'));
      return;
    }

    const qtyNum = Number(qty);
    if (qtyNum <= 0) {
      alert(t('saleQuantityMinAlert'));
      return;
    }

    if (qtyNum > selectedProduct.stockQty) {
      alert(t('saleStockExceeded', { qty: qtyNum, unit: unitName, stock: selectedProduct.stockQty }));
      return;
    }

    const rateNum = Number(rate);
    if (rateNum < 0) {
      alert(t('sellingRateNegativeAlert'));
      return;
    }

    const paidNum = Number(paidAmount);
    if (paidNum < 0) {
      alert(t('paidAmountNegativeAlert'));
      return;
    }

    if (paidNum > calculatedSubtotal) {
      alert(t('paidAmountExceedsAlert', { total: calculatedSubtotal.toLocaleString() }));
      return;
    }

    setIsSubmitting(true);

    try {
      let finalCustomerId = null;
      let finalCustomerName = t('walkInCustomer');
      let finalCustomerType = 'Walk-in Customer';

      if (customerMode === 'Walk-in') {
        finalCustomerId = null;
        finalCustomerName = walkInName.trim() || t('walkInCustomer');
        finalCustomerType = 'Walk-in Customer';
      } else {
        const selectedCust = regularCustomers.find(c => c.id === selectedCustomerId) || regularCustomers[0];
        if (selectedCust) {
          finalCustomerId = selectedCust.id;
          finalCustomerName = selectedCust.name;
          finalCustomerType = 'Regular Party';
        } else {
          alert(t('searchCustomerParty'));
          setIsSubmitting(false);
          return;
        }
      }

      const cartItem = {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        unitName,
        qty: qtyNum,
        rate: rateNum,
        total: calculatedSubtotal
      };

      const generatedSale = createSale({
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        customerType: finalCustomerType,
        cart: [cartItem],
        grandTotal: calculatedSubtotal,
        paidAmount: paidNum
      });

      const invoiceObj = {
        id: generatedSale.id,
        invoiceNo: generatedSale.invoiceNo,
        partyName: finalCustomerName,
        date: generatedSale.date,
        amount: calculatedSubtotal,
        paidAmount: paidNum,
        status: generatedSale.status,
        cart: [cartItem]
      };

      setCompletedInvoice(invoiceObj);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedInvoice) {
    return (
      <InvoiceDrawer
        invoice={completedInvoice}
        onClose={() => {
          setCompletedInvoice(null);
          onClose();
        }}
      />
    );
  }

  const isNoParty = regularCustomers.length === 0;
  const isNoProduct = products.length === 0;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end overflow-hidden"
    >
      {/* Slide-over Right Sidebar Panel */}
      <div className={`w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-5 space-y-4 overflow-y-auto border-l transition-all animate-in slide-in-from-right duration-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
        <div>
          {/* Header with Wheat Logo */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                <Wheat className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-none">{t('expressQuickPos')}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">{t('expressQuickPosSub')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              title={t('close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Customer Category */}
            <div>
              <label className="text-xs font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">
                {t('customerCategory')}
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCustomerMode('Walk-in')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${customerMode === 'Walk-in'
                    ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {t('walkInCustomer')}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('Regular')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${customerMode === 'Regular'
                    ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {t('regularParty')}
                </button>
              </div>
            </div>

            {/* Customer Name Input / Selector */}
            {customerMode === 'Walk-in' ? (
              <div>
                <label className="text-xs font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('walkInCustomerName')}
                </label>
                <input
                  type="text"
                  placeholder={t('walkInNamePlaceholder')}
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('selectCustomerKhata')} *
                </label>
                <select
                  disabled={isNoParty}
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none transition ${isNoParty
                    ? 'bg-rose-50/70 border-rose-300 text-rose-600 cursor-not-allowed dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400'
                    : (theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white focus:border-brand-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-brand-500')
                    }`}
                >
                  {isNoParty ? (
                    <option value="">⚠️ {t('noCustomerFound')}</option>
                  ) : (
                    regularCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city}) — {t('balance')}: Rs. {c.balance.toLocaleString()}
                      </option>
                    ))
                  )}
                </select>
                {isNoParty && (
                  <p className="text-[11px] text-rose-500 font-extrabold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('addCustomerFirst')}</span>
                  </p>
                )}
              </div>
            )}

            {/* Product Selection */}
            <div>
              <label className="text-xs font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">
                {t('selectProduct')}
              </label>
              <select
                disabled={isNoProduct}
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none transition ${isNoProduct
                  ? 'bg-rose-50/70 border-rose-300 text-rose-600 cursor-not-allowed dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400'
                  : (theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white focus:border-brand-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-brand-500')
                  }`}
              >
                {isNoProduct ? (
                  <option value="">⚠️ {t('noCommoditiesInCatalog')}</option>
                ) : (
                  products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stockQty <= 0}>
                      {p.name} ({p.category}) — {t('currentStock')}: {p.stockQty} {p.unit || t('kg')} {p.stockQty <= 0 ? `(${t('outOfStock')})` : ''}
                    </option>
                  ))
                )}
              </select>
              {isNoProduct && (
                <p className="text-[11px] text-rose-500 font-extrabold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('addProductFirst')}</span>
                </p>
              )}
            </div>

            {/* Quantity & Rate */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('qtyWithUnit', { unit: unitName })}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  disabled={isNoProduct}
                  max={selectedProduct?.stockQty || 999999}
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={qty}
                  onChange={(e) => {
                    const q = Math.max(1, Number(e.target.value) || 1);
                    setQty(q);
                    setPaidAmount(q * rate);
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('rateWithUnit', { unit: unitName })}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  disabled={isNoProduct}
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={rate}
                  onChange={(e) => {
                    const r = Math.max(0, Number(e.target.value) || 0);
                    setRate(r);
                    setPaidAmount(qty * r);
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            </div>

            {/* Cash Paid Amount Input */}
            <div>
              <label className="text-xs font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">
                {t('cashPaidNow')}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                disabled={isNoProduct}
                max={calculatedSubtotal}
                onWheel={(e) => e.target.blur()}
                onFocus={(e) => e.target.select()}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            {/* Live Subtotal Card */}
            <div className={`p-3.5 rounded-2xl border space-y-1.5 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-brand-500" /> {t('totalSaleAmount')}
                </span>
                <span className="font-mono font-black text-base text-brand-500">
                  Rs. {calculatedSubtotal.toLocaleString()}
                </span>
              </div>
              {customerMode === 'Regular' && (calculatedSubtotal - (Number(paidAmount) || 0)) > 0 && (
                <div className="flex items-center justify-between text-xs text-amber-500 font-extrabold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span>{t('partyReceivableAddition')}</span>
                  <span>Rs. {(calculatedSubtotal - (Number(paidAmount) || 0)).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className={`w-1/3 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isNoProduct || (customerMode === 'Regular' && isNoParty)}
                className={`w-2/3 py-2.5 font-extrabold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${(isSubmitting || isNoProduct || (customerMode === 'Regular' && isNoParty))
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                  : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25 active:scale-98'
                  }`}
              >
                <span>{isSubmitting ? t('processing') : t('completeQuickSale')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
