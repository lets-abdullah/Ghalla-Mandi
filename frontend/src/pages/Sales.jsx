import React, { useState, useEffect } from 'react';
import { Receipt, Search, Printer, CheckCircle2, ShoppingBag, DollarSign, Clock, X, Check, RotateCcw } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReceiptModal } from '../components/ReceiptModal';
import { SaleReturnModal } from '../components/SaleReturnModal';

export const Sales = () => {
  const { sales, saleReturns = [], recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Pending' | 'Returns'
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);

  // Return Modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnSale, setSelectedReturnSale] = useState(null);

  // Payment Received Modal state
  const [paymentModalSale, setPaymentModalSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (paymentModalSale) setPaymentModalSale(null);
        else if (activeReceiptModal) setActiveReceiptModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentModalSale, activeReceiptModal]);

  const openPaymentModal = (sale) => {
    const paid = Number(sale.paidAmount || 0);
    const total = Number(sale.amount || 0);
    const due = Math.max(0, total - paid);

    setPaymentModalSale(sale);
    setPaymentAmount(due > 0 ? due : '');
    setPaymentMode('Cash');
    setPaymentNote(`Payment for ${sale.invoiceNo}`);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalSale || isSubmitting) return;

    const amt = Math.max(1, Number(paymentAmount) || 0);
    const paid = Number(paymentModalSale.paidAmount || 0);
    const total = Number(paymentModalSale.amount || 0);
    const due = Math.max(0, total - paid);

    if (amt <= 0) {
      alert(t('paidAmountNegativeAlert'));
      return;
    }

    if (amt > due) {
      if (!confirm(`Amount exceeds remaining due of Rs. ${(Number(due) || 0).toLocaleString()}. Continue?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId: paymentModalSale.customerId || null,
        partyType: 'Customer',
        amount: amt,
        paymentMode: paymentMode,
        note: paymentNote,
        saleId: paymentModalSale.id
      });

      setPaymentModalSale(null);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalGrossSales = (sales || []).reduce((acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0), 0);
  const totalPaidCollected = (sales || []).reduce((acc, s) => acc + (Number(s.paidAmount ?? s.paidamount) || 0), 0);
  const totalOutstandingReceivable = Math.max(0, totalGrossSales - totalPaidCollected);

  const filteredSales = (sales || []).filter(s => {
    const matchesSearch = (s.invoiceNo || s.invoiceno || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.partyName || s.partyname || s.customerName || '').toLowerCase().includes(search.toLowerCase());

    const paid = Number(s.paidAmount ?? s.paidamount ?? 0);
    const total = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? 0);
    const status = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

    if (filterType === 'Paid') return matchesSearch && status === 'Paid';
    if (filterType === 'Partial') return matchesSearch && status === 'Partial';
    if (filterType === 'Pending') return matchesSearch && status === 'Pending';
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-500" />
            {t('Sales History')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('All sales are displayed here')}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedReturnSale(null);
              setShowReturnModal(true);
            }}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Process Sale Return</span>
          </button>

          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            <Printer className="w-4 h-4" /> {t('Print Receipt')}
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-500" /> {t('totalSalesVolume')}
          </div>
          <div className="text-2xl font-extrabold mt-1">Rs. {totalGrossSales.toLocaleString()}</div>
          <div className="text-xs text-emerald-500 font-bold mt-1">{sales.length} {t('invoices')}</div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-brand-500" /> {t('Cash Received')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-500">Rs. {totalPaidCollected.toLocaleString()}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">{t('paid')}</div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" /> {t('amountToReceive')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-amber-500">Rs. {totalOutstandingReceivable.toLocaleString()}</div>
          <div className="text-xs text-amber-500 font-bold mt-1">{t('pending')}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={`border rounded-2xl p-4 card-shadow flex flex-col md:flex-row items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Paid', 'Partial', 'Pending', 'Returns'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${filterType === type
                ? 'bg-brand-500 text-white shadow-sm'
                : theme === 'dark' ? 'bg-slate-900 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {type === 'All' ? t('All') : type === 'Returns' ? `Sale Returns (${saleReturns.length})` : t(type.toLowerCase())}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchInvoicePlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
          />
        </div>
      </div>

      {/* Sale Returns History Table if Filtered */}
      {filterType === 'Returns' ? (
        <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-black text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              <span>Processed Customer Sale Returns</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Party</th>
                  <th className="py-3 px-4">Associated Invoice</th>
                  <th className="py-3 px-4">Restocked Commodity</th>
                  <th className="py-3 px-4">Refund Mode</th>
                  <th className="py-3 px-4 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {saleReturns.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No sale returns recorded yet.</td></tr>
                ) : (
                  saleReturns.map(ret => (
                    <tr key={ret.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-mono font-black text-orange-500">{ret.returnNo}</td>
                      <td className="py-3.5 px-4 text-slate-400">{ret.date}</td>
                      <td className="py-3.5 px-4 font-bold">{ret.customerName}</td>
                      <td className="py-3.5 px-4 font-mono text-brand-500 font-bold">{ret.invoiceNo}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {ret.items && ret.items[0] ? `${ret.items[0].name} (${ret.items[0].qty} ${ret.items[0].unit})` : 'Commodity Item'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ret.refundMode === 'Cash' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-brand-500/10 text-brand-600'}`}>
                          {ret.refundMode === 'Cash' ? 'Cash Refund' : 'Khata Ledger Credit'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black font-mono text-orange-600 dark:text-orange-400">
                        Rs. {Number(ret.refundAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Regular Sales Table */
        <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                  <th className="py-3.5 px-4">{t('invoiceNo')}</th>
                  <th className="py-3.5 px-4">{t('customerParty')}</th>
                  <th className="py-3.5 px-4">{t('itemsSold')}</th>
                  <th className="py-3.5 px-4 text-right">{t('totalAmount')}</th>
                  <th className="py-3.5 px-4 text-right">{t('remainingDue')}</th>
                  <th className="py-3.5 px-4 text-center">{t('status')}</th>
                  <th className="py-3.5 px-4 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
                }`}>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      {t('noSalesFound')}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map(s => {
                    const paid = Number(s.paidAmount || 0);
                    const total = Number(s.amount || 0);
                    const due = Math.max(0, total - paid);
                    const status = paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

                    return (
                      <tr key={s.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                        }`}>
                        <td className="py-3.5 px-4 font-mono font-black text-brand-500">{s.invoiceNo}</td>
                        <td className="py-3.5 px-4 font-extrabold text-xs">{s.partyName}</td>
                        <td className="py-3.5 px-4">
                          {s.cart && s.cart.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {s.cart.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-extrabold text-xs border border-brand-500/20 whitespace-nowrap">
                                  {item.name} ({item.qty} {item.unitName || item.unit || t('kg')})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold">{typeof s.items === 'string' ? s.items : (Array.isArray(s.items) ? s.items.map(i => i.name || i.productName).join(', ') : t('products'))}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-xs">Rs. {total.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-xs">
                          <span className={due > 0 ? 'text-rose-500 font-black' : 'text-slate-400'}>
                            Rs. {due.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap border ${status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : status === 'Partial'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}>
                            {status === 'Paid' ? t('paid') : status === 'Partial' ? t('partial') : t('pending')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {due > 0 ? (
                              <button
                                onClick={() => openPaymentModal(s)}
                                className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                                title={t('Received') || 'Receive Payment'}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>{t('Received') || 'Receive Payment'}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <Check className="w-3.5 h-3.5" /> {t('fullyPaid')}
                              </span>
                            )}

                            {/* Return Button */}
                            <button
                              onClick={() => {
                                setSelectedReturnSale(s);
                                setShowReturnModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs font-bold"
                              title="Process Return"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>

                            <button
                              onClick={() => {
                                const receiptData = {
                                  orderId: s.invoiceNo,
                                  date: s.date,
                                  customerName: s.partyName,
                                  customerPhone: s.customerPhone || '',
                                  customerCity: s.customerCity || '',
                                  items: s.cart && s.cart.length > 0 ? s.cart.map(item => ({
                                    name: item.name,
                                    qty: item.qty,
                                    unit: item.unitName || item.unit || t('kg'),
                                    price: Number(item.rate || item.price || 0)
                                  })) : [{
                                    name: s.items || t('products'),
                                    qty: s.itemsCount || 1,
                                    unit: t('item'),
                                    price: Number(s.amount || 0)
                                  }],
                                  subtotal: Number(s.amount || 0),
                                  discount: 0,
                                  tax: 0,
                                  grandTotal: Number(s.amount || 0),
                                  paidAmount: Number(s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Paid' ? s.amount : 0)),
                                  paymentMethod: s.paymentMode || (Number(s.paidAmount) >= Number(s.amount) ? 'Cash' : Number(s.paidAmount) > 0 ? 'Partial Cash' : 'Khata (Udhaar)'),
                                  saleNote: s.note || ''
                                };
                                setActiveReceiptModal(receiptData);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${theme === 'dark' ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400' : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
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
      )}

      {/* Payment Received Modal */}
      {paymentModalSale && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalSale(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{t('Received')}</h3>
                  <p className="text-[11px] text-slate-400 font-mono font-bold">{paymentModalSale.invoiceNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalSale(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Breakdown Summary */}
            <div className={`rounded-2xl p-3.5 space-y-2 border text-xs font-semibold ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between items-center text-slate-400">
                <span>{t('customerParty')}:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{paymentModalSale.partyName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('totalInvoiceAmount')}:</span>
                <span className="font-bold text-slate-900 dark:text-white">Rs. {Number(paymentModalSale.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                <span>{t('alreadyPaid')}:</span>
                <span className="font-bold">Rs. {Number(paymentModalSale.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700 text-rose-500 font-extrabold text-xs">
                <span>{t('remainingDue')}:</span>
                <span className="text-sm font-black">
                  Rs. {Math.max(0, Number(paymentModalSale.amount || 0) - Number(paymentModalSale.paidAmount || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {t('paymentAmountReceived')} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  autoFocus
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={t('enterPaymentAmount')}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('paymentMethodLabel')}</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="Cash">{t('cashOnCounter')}</option>
                    <option value="Bank Transfer">{t('bankTransfer')}</option>
                    <option value="Online">{t('onlineTransfer')}</option>
                    <option value="Cheque">{t('cheque')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('paymentNote')}</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Cash payment"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalSale(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? 'Saving...' : t('savePayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {activeReceiptModal && (
        <ReceiptModal
          isOpen={!!activeReceiptModal}
          onClose={() => setActiveReceiptModal(null)}
          orderData={activeReceiptModal}
        />
      )}

      {/* Sale Return Modal */}
      {showReturnModal && (
        <SaleReturnModal
          isOpen={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedReturnSale(null);
          }}
          selectedSale={selectedReturnSale}
        />
      )}
    </div>
  );
};

export default Sales;
