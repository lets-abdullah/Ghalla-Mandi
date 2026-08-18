import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Printer, CheckCircle2, Clock, DollarSign, X } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PurchaseReceiptModal } from '../components/PurchaseReceiptModal';

export const Purchases = () => {
  const { suppliers, products, purchases, createPurchase, recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [filterType, setFilterType] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Due'
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [payModalPurchase, setPayModalPurchase] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for New Purchase
  const [form, setForm] = useState({
    supplierId: suppliers[0]?.id || '',
    supplierName: suppliers[0]?.name || '',
    productId: products[0]?.id || '',
    enteredQty: 1,
    rate: products[0]?.purchasePrice || 0
  });

  // Form for Pay Balance
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMode: 'Cash'
  });

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        else if (payModalPurchase) setPayModalPurchase(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, payModalPurchase]);

  // Available products catalog
  const availableProducts = products;
  const selectedProduct = availableProducts.find(p => p.id === form.productId) || availableProducts[0];
  const productUnit = selectedProduct?.unit || t('kg');

  // Calculate live totals for the new purchase form
  const calculatedTotal = Math.max(0, (Number(form.enteredQty) || 0) * (Number(form.rate) || 0));

  const handleRecordSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const supplierObj = suppliers.find(s => s.id === form.supplierId) || suppliers[0];
    if (!supplierObj) {
      alert(t('addSupplierFirst'));
      return;
    }

    if (!selectedProduct) {
      alert(t('addProductFirst'));
      return;
    }

    const qtyVal = Math.max(1, Math.floor(Number(form.enteredQty) || 1));
    const rateVal = Math.max(0, Number(form.rate) || 0);

    setIsSubmitting(true);
    try {
      const created = createPurchase({
        supplierId: supplierObj.id,
        supplier: supplierObj.name,
        supplierName: supplierObj.name,
        productId: selectedProduct.id,
        qtyKg: qtyVal,
        rate: rateVal,
        items: `${qtyVal} ${productUnit} ${selectedProduct?.name || 'Product'}`,
        amount: calculatedTotal,
        paidAmount: 0,
        cart: [
          {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            unitName: productUnit,
            qty: qtyVal,
            rate: rateVal,
            total: calculatedTotal
          }
        ]
      });

      setShowModal(false);
      setForm({
        supplierId: suppliers[0]?.id || '',
        supplierName: suppliers[0]?.name || '',
        productId: products[0]?.id || '',
        enteredQty: 1,
        rate: products[0]?.purchasePrice || 0
      });

      // Automatically generate & display Purchase Receipt Voucher
      setSelectedReceipt({
        purchaseNo: created?.purchaseNo || `PUR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: created?.date || new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'medium' }),
        supplierName: supplierObj.name,
        supplierPhone: supplierObj.phone,
        supplierCity: supplierObj.city,
        items: [{
          name: selectedProduct.name,
          qty: qtyVal,
          unit: productUnit,
          price: rateVal,
          total: calculatedTotal
        }],
        totalAmount: calculatedTotal,
        paidAmount: 0,
        paymentMode: 'Supplier Khata (Credit Payable)',
        supplierBalance: (Number(supplierObj.balance) || 0) + calculatedTotal,
        note: 'Procurement arrival entry verified in Mandi stock register.'
      });
    } catch (err) {
      console.error(err);
      alert("Error saving purchase entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayModal = (purchase) => {
    const remainingDue = Math.max(0, purchase.amount - (purchase.paidAmount || 0));
    setPayModalPurchase(purchase);
    setPayForm({
      amount: remainingDue,
      paymentMode: 'Cash'
    });
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    if (!payModalPurchase) return;

    const remainingDue = Math.max(0, payModalPurchase.amount - (payModalPurchase.paidAmount || 0));
    const payVal = Math.max(1, Number(payForm.amount) || 0);

    if (payVal > remainingDue) {
      alert(t('paidAmountExceedsAlert', { total: remainingDue.toLocaleString() }));
      return;
    }

    const supplierObj = suppliers.find(s => s.name === payModalPurchase.supplier) || suppliers[0];

    recordPayment({
      partyId: supplierObj ? supplierObj.id : payModalPurchase.supplierId,
      partyType: 'Supplier',
      amount: payVal,
      paymentMode: payForm.paymentMode,
      note: `Payment for purchase ${payModalPurchase.purchaseNo}`
    });

    setPayModalPurchase(null);
  };

  // Calculations for KPI Header Cards
  const totalPurchaseVolume = purchases.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPaidOut = purchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const totalOutstandingPayable = purchases.reduce((acc, p) => acc + Math.max(0, p.amount - (p.paidAmount || 0)), 0);

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = (p.purchaseNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.items || '').toLowerCase().includes(search.toLowerCase());

    const paid = Number(p.paidAmount || 0);
    const total = Number(p.amount || 0);
    const status = paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Due';

    if (filterType === 'All') return matchesSearch;
    if (filterType === 'Paid') return matchesSearch && status === 'Paid';
    if (filterType === 'Partial') return matchesSearch && status === 'Partial';
    if (filterType === 'Due') return matchesSearch && status === 'Due';
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-500" />
            {t('purchasesTitle')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('All Purchase History')}</p>
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
            onClick={() => {
              if (suppliers.length === 0) {
                alert(t('addSupplierFirst'));
                return;
              }
              if (products.length === 0) {
                alert(t('addProductFirst'));
                return;
              }
              setForm({
                supplierId: suppliers[0]?.id || '',
                supplierName: suppliers[0]?.name || '',
                productId: products[0]?.id || '',
                enteredQty: 1,
                rate: products[0]?.purchasePrice || 0,
                paidAmount: 0
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('recordNewPurchase')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-500" /> {t('totalPurchasesVolume')}
          </div>
          <div className="text-2xl font-extrabold mt-1">Rs. {totalPurchaseVolume.toLocaleString()}</div>
          <div className="text-xs text-emerald-500 font-bold mt-1">{purchases.length} {t('invoices')}</div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-brand-500" /> {t('Paid')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-500">Rs. {totalPaidOut.toLocaleString()}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">{t('paid')}</div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-500" /> {t('amountToPay')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-rose-500">Rs. {totalOutstandingPayable.toLocaleString()}</div>
          <div className="text-xs text-rose-500 font-bold mt-1">{t('pending')}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={`border rounded-2xl p-4 card-shadow flex flex-col md:flex-row items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Paid', 'Partial', 'Due'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${filterType === type
                ? 'bg-brand-500 text-white shadow-sm'
                : theme === 'dark' ? 'bg-slate-900 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {type === 'All' ? t('All') : type === 'Due' ? t('pending') : t(type.toLowerCase())}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchPurchasePlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
          />
        </div>
      </div>

      {/* Purchase Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">{t('purchaseNo')}</th>
                <th className="py-3 px-4">{t('supplierFirmName')}</th>
                <th className="py-3 px-4">{t('itemsSold')}</th>
                <th className="py-3 px-4 text-right">{t('totalAmount')}</th>
                <th className="py-3 px-4 text-right">{t('paid')}</th>
                <th className="py-3 px-4 text-right">{t('remainingDue')}</th>
                <th className="py-3 px-4 text-center">{t('status')}</th>
                <th className="py-3 px-4 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    {t('noPurchasesFound')}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => {
                  const paid = p.paidAmount || 0;
                  const due = Math.max(0, p.amount - paid);
                  const status = due === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due';

                  return (
                    <tr key={p.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                      }`}>
                      <td className="py-3 px-4 font-mono font-bold text-brand-500">{p.purchaseNo}</td>
                      <td className="py-3 px-4 font-bold">{p.supplier}</td>
                      <td className="py-3 px-4 text-slate-400">{p.items}</td>
                      <td className="py-3 px-4 text-right font-extrabold">Rs. {p.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-500">Rs. {paid.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-500">Rs. {due.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : status === 'Partial'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                          }`}>
                          {status === 'Paid' ? t('paid') : status === 'Partial' ? t('partial') : t('pending')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {due > 0 ? (
                            <button
                              onClick={() => openPayModal(p)}
                              className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition shadow-xs active:scale-98 flex items-center gap-1 cursor-pointer"
                            >
                              {t('payBalance')}
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-500 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t('fullyPaid')}
                            </span>
                          )}

                          <button
                            onClick={() => {
                              const totalAmt = Number(p.amount || 0);
                              const paidAmt = Number(p.paidAmount || 0);
                              const supplierObj = suppliers.find(s => s.name === p.supplier || s.id === p.supplierId);

                              let purchaseItems = [];
                              if (p.cart && Array.isArray(p.cart) && p.cart.length > 0) {
                                purchaseItems = p.cart.map(item => ({
                                  name: item.name || 'Commodity Product',
                                  qty: Number(item.qty || 1),
                                  unit: item.unitName || item.unit || t('kg'),
                                  price: Number(item.rate || item.price || (totalAmt / (item.qty || 1))),
                                  total: Number(item.total) || (Number(item.rate || item.price || 0) * Number(item.qty || 1)) || totalAmt
                                }));
                              } else {
                                purchaseItems = [{
                                  name: p.productName || p.items || t('products'),
                                  qty: Number(p.qty || p.qtyKg || 1),
                                  unit: p.unit || p.unitName || t('kg'),
                                  price: Number(p.rate || p.purchasePrice || (p.qty ? Math.round(totalAmt / p.qty) : totalAmt)),
                                  total: totalAmt
                                }];
                              }

                              const receiptData = {
                                purchaseNo: p.purchaseNo,
                                date: p.date,
                                supplierName: p.supplier,
                                supplierPhone: supplierObj?.phone || '',
                                supplierCity: supplierObj?.city || '',
                                items: purchaseItems,
                                totalAmount: totalAmt,
                                paidAmount: paidAmt,
                                paymentMode: paidAmt >= totalAmt ? 'Cash' : paidAmt > 0 ? 'Partial Cash' : 'Supplier Credit (Khata)',
                                supplierBalance: supplierObj ? supplierObj.balance : 0,
                                note: 'Official Purchase Arrival Voucher'
                              };
                              setSelectedReceipt(receiptData);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer shadow-2xs ${theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-emerald-400 border-slate-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            title={t('Print Receipt')}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{t('Print Receipt')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-500" />
                {t('recordNewPurchase')}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('supplierFirmName')} *
                </label>
                <select
                  value={form.supplierId}
                  onChange={(e) => {
                    const sup = suppliers.find(s => s.id === e.target.value);
                    setForm({
                      ...form,
                      supplierId: e.target.value,
                      supplierName: sup ? sup.name : ''
                    });
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('selectProduct')} *
                </label>
                <select
                  value={form.productId}
                  onChange={(e) => {
                    const prod = products.find(p => p.id === e.target.value);
                    setForm({
                      ...form,
                      productId: e.target.value,
                      rate: prod ? (prod.purchasePrice || 0) : form.rate
                    });
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category}) — {t('unit')}: {p.unit || t('kg')}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    {t('qtyWithUnit', { unit: productUnit })} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={form.enteredQty}
                    onChange={(e) => setForm({ ...form, enteredQty: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    {t('rateWithUnit', { unit: productUnit })} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex justify-between text-xs font-extrabold">
                  <span>{t('totalPurchasesVolume')}:</span>
                  <span className="text-brand-500">Rs. {calculatedTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? t('processing') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Balance Modal */}
      {payModalPurchase && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPayModalPurchase(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('payBalance')}</h3>
              <button
                type="button"
                onClick={() => setPayModalPurchase(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {t('supplierFirmName')}: <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>{payModalPurchase.supplier}</strong> ({payModalPurchase.purchaseNo})
            </p>

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('paidAmount')} (Rs.)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  max={payModalPurchase.amount - (payModalPurchase.paidAmount || 0)}
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('paymentMethodLabel')}</label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="Cash">{t('cashOnCounter')}</option>
                  <option value="Bank Transfer">{t('bankTransfer')}</option>
                  <option value="Cheque">{t('cheque')}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalPurchase(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {t('savePayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Receipt Modal */}
      {selectedReceipt && (
        <PurchaseReceiptModal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          purchaseData={selectedReceipt}
        />
      )}
    </div>
  );
};

export default Purchases;
