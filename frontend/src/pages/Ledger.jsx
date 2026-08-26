import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookOpen, Printer, Users, UserCheck, MapPin, Phone, DollarSign, Plus, X } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Ledger = () => {
  const { customers, suppliers, sales, purchases, paymentLogs, saleReturns = [], purchaseReturns = [], recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const typeParam = searchParams.get('type');
  const isSupplier = typeParam && (typeParam.toLowerCase() === 'supplier' || typeParam.toLowerCase() === 'suppliers');
  const ledgerType = isSupplier ? 'Supplier' : 'Customer';

  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMode: 'Cash',
    note: 'Account settlement entry'
  });

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showPaymentModal) {
        setShowPaymentModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPaymentModal]);

  const regularCustomers = customers.filter(c => (c.customerType || 'Regular Party') === 'Regular Party');
  const activeCustomer = regularCustomers.find(c => c.id === selectedCustomerId) || regularCustomers[0];
  const activeSupplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];

  const customerSales = (sales || []).filter(s => s.partyName === activeCustomer?.name || s.customerId === activeCustomer?.id);
  const supplierPurchases = (purchases || []).filter(p => p.supplier === activeSupplier?.name || p.supplierName === activeSupplier?.name || p.supplierId === activeSupplier?.id);

  const customerPayments = (paymentLogs || []).filter(p => p.type === 'Customer' && (p.partyName === activeCustomer?.name || p.partyId === activeCustomer?.id));
  const supplierPayments = (paymentLogs || []).filter(p => p.type === 'Supplier' && (p.partyName === activeSupplier?.name || p.partyId === activeSupplier?.id));

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Generate Customer Ledger Statements
  const generateCustomerStatement = () => {
    if (!activeCustomer) return [];

    const ob = Number(activeCustomer.openingBalance || 0);
    const entries = [];

    if (ob > 0) {
      entries.push({
        id: 'ob',
        date: todayStr,
        ref: 'OB-001',
        type: t('openingBalance'),
        debit: ob,
        credit: 0,
        desc: t('openingBalance')
      });
    }

    customerSales.forEach(s => {
      const itemsDesc = typeof s.items === 'string'
        ? s.items
        : (Array.isArray(s.cart) && s.cart.length > 0
          ? s.cart.map(i => `${i.qty || 1} ${i.unitName || i.unit || 'KG'} ${i.name || 'Product'}`).join(', ')
          : `${t('sales')} (${s.itemsCount || 1} ${t('items')})`);

      entries.push({
        id: `sale-${s.id}`,
        date: s.date,
        ref: s.invoiceNo,
        type: t('sales'),
        debit: Number(s.amount) || 0,
        credit: 0,
        desc: itemsDesc
      });
    });

    customerPayments.forEach(p => {
      entries.push({
        id: `pay-${p.id}`,
        date: p.date,
        ref: p.ref,
        type: `${t('Received')} (${p.mode || 'Cash'})`,
        debit: 0,
        credit: Number(p.amount) || 0,
        desc: p.note || t('cashOnCounter')
      });
    });

    // Add sale returns if not already in paymentLogs
    const custReturns = (saleReturns || []).filter(r => (r.customerId === activeCustomer.id || r.customerName === activeCustomer.name) && r.refundMode === 'Ledger');
    custReturns.forEach(r => {
      if (!entries.some(e => e.ref === r.returnNo)) {
        entries.push({
          id: `sr-${r.id}`,
          date: r.date,
          ref: r.returnNo,
          type: 'Sale Return (Credit Note)',
          debit: 0,
          credit: Number(r.refundAmount) || 0,
          desc: r.reason || 'Restocked goods credit voucher'
        });
      }
    });

    let runningBalance = 0;
    return entries.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      return { ...entry, balance: runningBalance };
    });
  };

  // Generate Supplier Ledger Statements
  const generateSupplierStatement = () => {
    if (!activeSupplier) return [];

    const ob = Number(activeSupplier.openingBalance || 0);
    const entries = [];

    if (ob > 0) {
      entries.push({
        id: 'ob',
        date: todayStr,
        ref: 'OB-001',
        type: t('openingBalance'),
        debit: 0,
        credit: ob,
        desc: t('openingBalance')
      });
    }

    supplierPurchases.forEach(p => {
      const itemsDesc = typeof p.items === 'string'
        ? p.items
        : (Array.isArray(p.items) && p.items.length > 0
          ? p.items.map(i => `${i.qty || i.enteredQty || 1} ${i.unit || i.unitName || i.enteredUnit || 'KG'} ${i.name || i.productName || 'Product'}`).join(', ')
          : (Array.isArray(p.cart) && p.cart.length > 0
            ? p.cart.map(i => `${i.qty || 1} ${i.unit || i.unitName || 'KG'} ${i.name || 'Product'}`).join(', ')
            : (p.productName || t('products'))));

      entries.push({
        id: `pur-${p.id}`,
        date: p.date,
        ref: p.purchaseNo,
        type: t('purchases'),
        debit: 0,
        credit: Number(p.amount) || 0,
        desc: itemsDesc
      });
    });

    supplierPayments.forEach(p => {
      entries.push({
        id: `pay-${p.id}`,
        date: p.date,
        ref: p.ref,
        type: `${t('totalPaid')} (${p.mode || 'Cash'})`,
        debit: Number(p.amount) || 0,
        credit: 0,
        desc: p.note || t('directPaymentSupplier')
      });
    });

    // Add purchase returns if not already in paymentLogs
    const supReturns = (purchaseReturns || []).filter(r => (r.supplierId === activeSupplier.id || r.supplierName === activeSupplier.name) && r.refundMode === 'Ledger');
    supReturns.forEach(r => {
      if (!entries.some(e => e.ref === r.returnNo)) {
        entries.push({
          id: `pr-${r.id}`,
          date: r.date,
          ref: r.returnNo,
          type: 'Purchase Return (Debit Note)',
          debit: Number(r.refundAmount) || 0,
          credit: 0,
          desc: r.reason || 'Rejected goods debit voucher'
        });
      }
    });

    let runningBalance = 0;
    return entries.map(entry => {
      runningBalance += (entry.credit - entry.debit);
      return { ...entry, balance: runningBalance };
    });
  };

  const customerStatement = generateCustomerStatement();
  const supplierStatement = generateSupplierStatement();
  const statement = ledgerType === 'Customer' ? customerStatement : supplierStatement;

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amtVal = Math.max(1, Number(paymentForm.amount) || 0);
    if (amtVal <= 0) {
      alert(t('paidAmountNegativeAlert'));
      return;
    }

    const partyId = ledgerType === 'Customer' ? (activeCustomer?.id || selectedCustomerId) : (activeSupplier?.id || selectedSupplierId);

    if (!partyId) {
      alert(t('searchCustomerParty'));
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId,
        partyType: ledgerType,
        amount: amtVal,
        paymentMode: paymentForm.paymentMode,
        note: paymentForm.note
      });

      setShowPaymentModal(false);
      setPaymentForm({ amount: 0, paymentMode: 'Cash', note: 'Account settlement entry' });
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            {isSupplier ? (
              <UserCheck className="w-6 h-6 text-brand-500" />
            ) : (
              <Users className="w-6 h-6 text-brand-500" />
            )}
            {isSupplier ? (t('supplierLedger') || 'Supplier Ledger') : (t('customerLedger') || 'Customer Ledger')}
          </h1>
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
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {isSupplier ? 'Record Payment to Supplier' : 'Record Payment from Customer'}
          </button>
        </div>
      </div>

      {/* Account Selector Bar (No Cross Tabs) */}
      <div className={`border rounded-2xl p-4 card-shadow flex flex-col md:flex-row gap-4 justify-between items-center transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="text-xs font-black text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500"></span>
          <span>{isSupplier ? 'Supplier Khata Statement Record' : 'Customer Party Khata Statement Record'}</span>
        </div>

        {/* Party Selector Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
            {isSupplier ? (t('selectSupplierAccount') || 'Select Supplier Firm') : (t('selectCustomerAccount') || 'Select Customer Party')}:
          </span>
          {isSupplier ? (
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className={`w-full md:w-80 border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.city}) — Rs. {(Number(s.balance) || 0).toLocaleString()}</option>
              ))}
            </select>
          ) : (
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className={`w-full md:w-80 border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              {regularCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.city}) — Rs. {(Number(c.balance) || 0).toLocaleString()}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Selected Account Summary Card */}
      {ledgerType === 'Customer' && activeCustomer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/customers')}
            className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200/60 text-slate-900'
            }`}
            title="Click to view Customer Directory"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" /> {t('customerParty')}
            </div>
            <div className="text-xl font-black mt-1 text-slate-900 dark:text-white truncate">{activeCustomer.name}</div>
            <div className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {activeCustomer.city} | <Phone className="w-3 h-3" /> {activeCustomer.phone} • View Directory
            </div>
          </div>

          <div
            onClick={() => setShowPaymentModal(true)}
            className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}
            title="Click to record customer payment receipt"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" /> {t('totalReceivedPayment')}
            </div>
            <div className="text-2xl font-black mt-1.5 font-mono text-emerald-600 dark:text-emerald-400">
              Rs. {customerStatement.reduce((sum, e) => sum + (Number(e.credit) || 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">{t('paid')} • Record Payment</div>
          </div>

          <div
            onClick={() => setShowPaymentModal(true)}
            className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200/60'
            }`}
            title="Click to settle customer balance"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-600" /> {t('amountToReceive')}
            </div>
            <div className="text-2xl font-black mt-1.5 font-mono text-amber-600 dark:text-amber-400">
              Rs. {(Number(activeCustomer.balance) || 0).toLocaleString()}
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-1">{t('pending')} • Settle Khata</div>
          </div>
        </div>
      )}

      {ledgerType === 'Supplier' && activeSupplier && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/suppliers')}
            className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200/60 text-slate-900'
            }`}
            title="Click to view Supplier Directory"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" /> {t('supplierFirmName')}
            </div>
            <div className="text-xl font-black mt-1 text-slate-900 dark:text-white truncate">{activeSupplier.name}</div>
            <div className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {activeSupplier.city} | <Phone className="w-3 h-3" /> {activeSupplier.phone} • View Directory
            </div>
          </div>

          <div
            onClick={() => setShowPaymentModal(true)}
            className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}
            title="Click to record payment to supplier"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" /> {t('totalPaymentsPaid')}
            </div>
            <div className="text-2xl font-black mt-1.5 font-mono text-emerald-600 dark:text-emerald-400">
              Rs. {supplierStatement.reduce((sum, e) => sum + (Number(e.debit) || 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">{t('paid')} • Pay Supplier</div>
          </div>

          <div
            onClick={() => setShowPaymentModal(true)}
            className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60'
            }`}
            title="Click to settle supplier balance"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-rose-600" /> {t('amountToPay')}
            </div>
            <div className="text-2xl font-black mt-1.5 font-mono text-rose-600 dark:text-rose-400">
              Rs. {(Number(activeSupplier.balance) || 0).toLocaleString()}
            </div>
            <div className="text-xs text-rose-700 dark:text-rose-400 font-bold mt-1">{t('pending')} • Settle Khata</div>
          </div>
        </div>
      )}

      {/* Statement Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">{t('date')}</th>
                <th className="py-3 px-4">{t('referenceNo')}</th>
                <th className="py-3 px-4">{t('transactionType')}</th>
                <th className="py-3 px-4">{t('description')}</th>
                <th className="py-3 px-4 text-right">{t('debit')} (Rs.)</th>
                <th className="py-3 px-4 text-right">{t('credit')} (Rs.)</th>
                <th className="py-3 px-4 text-right">{t('runningBalance')} (Rs.)</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {statement.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    {t('noTransactionsRecorded')}
                  </td>
                </tr>
              ) : (
                statement.map(entry => (
                  <tr key={entry.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                    }`}>
                    <td className="py-3 px-4 text-slate-400">{entry.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-brand-500">{entry.ref}</td>
                    <td className="py-3 px-4 font-bold">{entry.type}</td>
                    <td className="py-3 px-4 text-slate-400">{entry.desc}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-500">
                      {Number(entry.debit || 0) > 0 ? `Rs. ${(Number(entry.debit) || 0).toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500">
                      {Number(entry.credit || 0) > 0 ? `Rs. ${(Number(entry.credit) || 0).toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-brand-500">
                      Rs. {(Number(entry.balance) || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Direct Payment Modal */}
      {showPaymentModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">
                {t('recordPayment')}
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {t('customerParty')}: <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>{ledgerType === 'Customer' ? activeCustomer?.name : activeSupplier?.name}</strong>
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('paymentAmountReceived')} (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('paymentMethodLabel')} *
                </label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="Cash">{t('cashOnCounter')}</option>
                  <option value="Bank Transfer">{t('bankTransfer')}</option>
                  <option value="Cheque">{t('cheque')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('paymentNote')}
                </label>
                <input
                  type="text"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : t('savePayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
