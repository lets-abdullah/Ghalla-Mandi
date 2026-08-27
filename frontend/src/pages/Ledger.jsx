import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Printer,
  Users,
  User,
  UserCheck,
  Package,
  X,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  CreditCard
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Ledger = () => {
  const { customers = [], suppliers = [], products = [], sales = [], purchases = [], paymentLogs = [], saleReturns = [], purchaseReturns = [], recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();

  // Ledger mode: 'Customer' (default) or 'Supplier'
  const typeParam = searchParams.get('type');
  const isSupplier = typeParam && (typeParam.toLowerCase() === 'supplier' || typeParam.toLowerCase() === 'suppliers');
  const customerIdParam = searchParams.get('customerId');

  // Filters State
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [selectedPartyId, setSelectedPartyId] = useState(customerIdParam || 'All');
  const [selectedProductFilter, setSelectedProductFilter] = useState('All');
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('All'); // 'All' | 'Sales' | 'Payments' | 'Returns'

  // Modals state
  const [viewingEntry, setViewingEntry] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    partyId: '',
    amount: '',
    paymentMode: 'Cash',
    note: 'Account settlement entry'
  });

  // Sync with customerId from URL if present
  useEffect(() => {
    if (customerIdParam) {
      setSelectedPartyId(customerIdParam);
    }
  }, [customerIdParam]);

  // Robust Date Parser helper
  const parseLedgerDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Date Filter matcher
  const matchDate = (dateStr) => {
    if (dateFilterType === 'All') return true;
    const entryDate = parseLedgerDate(dateStr);
    if (!entryDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const day = new Date(entryDate);
    day.setHours(0, 0, 0, 0);

    if (dateFilterType === 'Today') {
      return day.getTime() === today.getTime();
    }
    if (dateFilterType === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return day >= startOfWeek && day <= new Date();
    }
    if (dateFilterType === 'This Month') {
      return day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth();
    }
    if (dateFilterType === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return day >= start && day <= end;
      } else if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return day >= start;
      } else if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return day <= end;
      }
    }
    return true;
  };

  // Build Chronological Ledger Entries
  const rawLedgerEntries = useMemo(() => {
    const entries = [];

    if (!isSupplier) {
      // Customer Ledger Transactions (Both Regular & Walk-in)
      (sales || []).forEach(s => {
        const custObj = customers.find(c => c.id === s.customerId || c.name === s.partyName);
        const isWalkin = (custObj?.customerType || s.customerType || '').toLowerCase().includes('walk-in') ||
          (s.partyName || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';
        const itemsSummary = Array.isArray(s.cart) && s.cart.length > 0
          ? s.cart.map(i => `${i.name} (${i.qty} ${i.unitName || i.unit || 'KG'})`).join(', ')
          : (typeof s.items === 'string' ? s.items : 'Commodity Sale');

        entries.push({
          id: `sale-${s.id}`,
          rawDate: s.date,
          date: s.date || 'N/A',
          partyId: s.customerId || custObj?.id || null,
          partyName: s.partyName || s.customerName || 'Customer',
          customerType: custType,
          ref: s.invoiceNo || 'SALE',
          txType: 'Sales',
          desc: itemsSummary,
          debit: Number(s.amount || s.grandTotal || 0),
          credit: 0,
          notes: s.note || ''
        });

        // Direct cash payment on counter
        const paidAmt = Number(s.paidAmount || (s.status === 'Paid' ? (s.amount || s.grandTotal) : 0));
        if (paidAmt > 0) {
          entries.push({
            id: `pay-direct-${s.id}`,
            rawDate: s.date,
            date: s.date || 'N/A',
            partyId: s.customerId || custObj?.id || null,
            partyName: s.partyName || s.customerName || 'Customer',
            customerType: custType,
            ref: `RCP-${s.invoiceNo}`,
            txType: 'Payments',
            desc: `Cash Received against ${s.invoiceNo}`,
            debit: 0,
            credit: paidAmt,
            items: s.cart || s.items || [],
            productNames: ((s.cart || s.items || []).map(i => i.name || i.productName).join(' ') + ' ' + (s.productName || '')).trim(),
            notes: s.paymentMode || 'Counter Payment'
          });
        }
      });

      // Additional Standalone Payment Logs
      (paymentLogs || []).filter(p => p.type === 'Customer').forEach(p => {
        const custObj = customers.find(c => c.id === p.partyId || c.name === p.partyName);
        const isWalkin = (custObj?.customerType || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';

        entries.push({
          id: `pay-${p.id}`,
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId: p.partyId || custObj?.id || null,
          partyName: p.partyName || custObj?.name || 'Customer',
          customerType: custType,
          ref: p.ref || `PAY-${p.id}`,
          txType: 'Payments',
          desc: `Account Payment (${p.mode || 'Cash'})`,
          debit: 0,
          credit: Number(p.amount || 0),
          items: [],
          productNames: '',
          notes: p.note || ''
        });
      });

      // Sale Returns
      (saleReturns || []).forEach(r => {
        const custObj = customers.find(c => c.id === r.customerId || c.name === r.customerName);
        const isWalkin = (custObj?.customerType || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';

        entries.push({
          id: `ret-${r.id}`,
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId: r.customerId || custObj?.id || null,
          partyName: r.customerName || custObj?.name || 'Customer',
          customerType: custType,
          ref: r.returnNo || `RET-${r.id}`,
          txType: 'Returns',
          desc: `Sale Return Credit (${r.refundMode || 'Ledger'})`,
          debit: 0,
          credit: Number(r.refundAmount || 0),
          items: r.items || [],
          productNames: ((r.items || []).map(i => i.name || i.productName).join(' ')).trim(),
          notes: r.reason || ''
        });
      });
    } else {
      // Supplier Ledger Transactions
      (purchases || []).forEach(p => {
        const supObj = suppliers.find(s => s.id === p.supplierId || s.name === (p.supplier || p.supplierName));
        const pItems = p.cart || p.items || [];
        const pProdNames = (Array.isArray(pItems) ? pItems.map(i => i.name || i.productName).join(' ') : '') + ' ' + (p.productName || (typeof p.items === 'string' ? p.items : ''));

        entries.push({
          id: `pur-${p.id}`,
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId: p.supplierId || supObj?.id || null,
          partyName: p.supplier || p.supplierName || 'Supplier',
          customerType: 'Supplier',
          ref: p.purchaseNo || 'PUR',
          txType: 'Purchases',
          desc: `Purchase Inward Entry`,
          debit: 0,
          credit: Number(p.amount || 0),
          items: pItems,
          productNames: pProdNames.trim(),
          notes: ''
        });
      });

      (paymentLogs || []).filter(p => p.type === 'Supplier').forEach(p => {
        const supObj = suppliers.find(s => s.id === p.partyId || s.name === p.partyName);
        entries.push({
          id: `pay-sup-${p.id}`,
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId: p.partyId || supObj?.id || null,
          partyName: p.partyName || supObj?.name || 'Supplier',
          customerType: 'Supplier',
          ref: p.ref || `PAY-${p.id}`,
          txType: 'Payments',
          desc: `Supplier Payment Out (${p.mode || 'Cash'})`,
          debit: Number(p.amount || 0),
          credit: 0,
          items: [],
          productNames: '',
          notes: p.note || ''
        });
      });

      (purchaseReturns || []).forEach(r => {
        const supObj = suppliers.find(s => s.id === r.supplierId || s.name === r.supplierName);
        entries.push({
          id: `pret-${r.id}`,
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId: r.supplierId || supObj?.id || null,
          partyName: r.supplierName || supObj?.name || 'Supplier',
          customerType: 'Supplier',
          ref: r.returnNo || `PR-${r.id}`,
          txType: 'Returns',
          desc: `Purchase Return Debit Note (${r.refundMode || 'Ledger'})`,
          debit: Number(r.refundAmount || 0),
          credit: 0,
          items: r.items || [],
          productNames: ((r.items || []).map(i => i.name || i.productName).join(' ')).trim(),
          notes: r.reason || ''
        });
      });
    }

    // Sort chronologically by date
    entries.sort((a, b) => {
      const da = parseLedgerDate(a.rawDate) || new Date(0);
      const db = parseLedgerDate(b.rawDate) || new Date(0);
      return da - db;
    });

    return entries;
  }, [sales, purchases, paymentLogs, saleReturns, purchaseReturns, customers, suppliers, isSupplier]);

  // Filter and Calculate Running Balance
  const filteredLedger = useMemo(() => {
    let runningBalance = 0;

    return rawLedgerEntries.filter(entry => {
      // 1. Party Filter (Supplier or Customer)
      if (selectedPartyId !== 'All') {
        const idMatch = entry.partyId === selectedPartyId;
        const nameMatch = entry.partyName.toLowerCase() === selectedPartyId.toLowerCase();
        if (!idMatch && !nameMatch) return false;
      }

      // 2. Customer Type Filter
      if (!isSupplier) {
        const isWalkin = (entry.customerType || '').toLowerCase().includes('walk-in');
        if (customerTypeFilter === 'Regular Customer' && isWalkin) return false;
        if (customerTypeFilter === 'Walk-in Customer' && !isWalkin) return false;
      }

      // 3. Product Filter
      if (selectedProductFilter !== 'All') {
        const prodMatch = (entry.productNames || '').toLowerCase().includes(selectedProductFilter.toLowerCase()) ||
          (entry.items || []).some(it =>
            (it.name || it.productName || '').toLowerCase() === selectedProductFilter.toLowerCase() ||
            it.productId === selectedProductFilter
          );
        if (!prodMatch && (entry.txType === 'Sales' || entry.txType === 'Purchases' || entry.txType === 'Returns')) {
          return false;
        }
      }

      // 4. Date Filter
      if (!matchDate(entry.rawDate)) return false;

      // 5. Transaction Type Filter
      if (txTypeFilter === 'Sales' && entry.txType !== 'Sales' && entry.txType !== 'Purchases') return false;
      if (txTypeFilter === 'Payments' && entry.txType !== 'Payments') return false;
      if (txTypeFilter === 'Returns' && entry.txType !== 'Returns') return false;

      return true;
    }).map(entry => {
      runningBalance += (entry.debit - entry.credit);
      return {
        ...entry,
        runningBalance
      };
    }).reverse();
  }, [rawLedgerEntries, selectedPartyId, selectedProductFilter, customerTypeFilter, dateFilterType, customStartDate, customEndDate, txTypeFilter, isSupplier]);

  // Aggregate stats (clean terminology, no Cr / Dr)
  const totalSalesAmount = filteredLedger.reduce((sum, e) => sum + e.debit, 0);
  const totalPaymentsAmount = filteredLedger.reduce((sum, e) => sum + e.credit, 0);
  const balanceDue = Math.max(0, totalSalesAmount - totalPaymentsAmount);

  const isAnyFilterActive = (
    customerTypeFilter !== 'All' ||
    selectedPartyId !== 'All' ||
    dateFilterType !== 'All' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    txTypeFilter !== 'All'
  );

  const resetAllFilters = () => {
    setCustomerTypeFilter('All');
    setSelectedPartyId('All');
    setDateFilterType('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setTxTypeFilter('All');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.partyId || isSubmitting) return;

    const amt = Math.max(1, Number(paymentForm.amount) || 0);
    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId: paymentForm.partyId,
        partyType: isSupplier ? 'Supplier' : 'Customer',
        amount: amt,
        paymentMode: paymentForm.paymentMode,
        note: paymentForm.note
      });

      setShowPaymentModal(false);
      setPaymentForm({ partyId: '', amount: '', paymentMode: 'Cash', note: 'Account settlement entry' });
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
            <BookOpen className="w-6 h-6 text-brand-500" />
            <span>{isSupplier ? 'Supplier Ledger' : 'Customer Ledger'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Complete transaction history of sales, purchases, and payments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Clean user-friendly labels without Cr/Dr) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales / Purchases */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
          }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
            <span>{isSupplier ? 'Total Purchases' : 'Total Sales'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
            Rs. {totalSalesAmount.toLocaleString()}
          </div>
        </div>

        {/* Total Payments */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
          }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Total Payments</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            Rs. {totalPaymentsAmount.toLocaleString()}
          </div>
        </div>

        {/* Balance Due (Clean simple balance) */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
          }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Balance Due</span>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 tracking-tight ${balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-amber-600'}`}>
            {balanceDue > 0 ? `Rs. ${balanceDue.toLocaleString()}` : 'Rs. 0'}
          </div>
        </div>
      </div>

      {/* Ledger Filter Toolbar */}
      <div className={`border rounded-3xl p-4 card-shadow space-y-3.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSupplier ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3`}>
          {/* 1. Customer Type (Only if Customer Ledger) OR Supplier Selector (If Supplier Ledger) */}
          {isSupplier ? (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-brand-500" />
                <span>Supplier</span>
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Suppliers</option>
                {suppliers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.city ? `(${p.city})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-brand-500" />
                <span>Customer Type</span>
              </label>
              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Customer Types</option>
                <option value="Regular Customer">Regular Customers</option>
                <option value="Walk-in Customer">Walk-in Customers</option>
              </select>
            </div>
          )}

          {/* 2. Select Customer (if Customer Ledger) OR Product (if Supplier Ledger) */}
          {!isSupplier ? (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Customer</span>
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Customers</option>
                {customers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.city ? `(${p.city})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                <span>Product</span>
              </label>
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Product (for Customer Ledger) OR Date Filter (for Supplier Ledger) */}
          {!isSupplier ? (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                <span>Product</span>
              </label>
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Date Filter</span>
              </label>
              <select
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom">Custom Date Range</option>
              </select>
            </div>
          )}

          {/* 4. Date Filter (for Customer Ledger) OR Transaction Type (for Supplier Ledger) */}
          {!isSupplier ? (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Date Filter</span>
              </label>
              <select
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom">Custom Date Range</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span>Transaction Type</span>
              </label>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Transactions</option>
                <option value="Sales">Purchases</option>
                <option value="Payments">Payments</option>
                <option value="Returns">Returns</option>
              </select>
            </div>
          )}

          {/* 5. Transaction Type (Only for Customer Ledger) */}
          {!isSupplier && (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span>Transaction Type</span>
              </label>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Transactions</option>
                <option value="Sales">Sales</option>
                <option value="Payments">Payments</option>
                <option value="Returns">Returns</option>
              </select>
            </div>
          )}
        </div>

        {/* Row 2: Custom Date Pickers + Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="text-xs text-slate-400 font-bold hidden sm:block">
            {isSupplier ? 'Supplier purchase bills and payment records' : 'Customer sales invoices and payment records'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {dateFilterType === 'Custom' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Date Range:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            )}

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Compact Ledger Table (No Large Description Column, No Horizontal Scroll) */}
      <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Voucher #</th>
                <th className="py-3 px-4 text-right">Sale</th>
                <th className="py-3 px-4 text-right">Payment</th>
                <th className="py-3 px-4 text-right font-black">Balance</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No ledger transactions found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredLedger.map(entry => {
                  return (
                    <tr
                      key={entry.id}
                      className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* 1. Date */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {entry.date}
                      </td>

                      {/* 2. Customer */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {entry.partyName}
                        </div>
                      </td>

                      {/* 3. Voucher # */}
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {entry.ref}
                      </td>

                      {/* 4. Sale */}
                      <td className="py-3 px-4 text-right font-mono font-black">
                        {entry.debit > 0 ? (
                          <span className="text-blue-600 dark:text-blue-400">
                            Rs. {entry.debit.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* 5. Payment */}
                      <td className="py-3 px-4 text-right font-mono font-black">
                        {entry.credit > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Rs. {entry.credit.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* 6. Running Balance (Pure Price Only) */}
                      <td className="py-3 px-4 text-right font-mono font-black text-xs">
                        <span className={entry.runningBalance > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}>
                          Rs. {entry.runningBalance.toLocaleString()}
                        </span>
                      </td>

                      {/* 7. Action: View Ledger / Details */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewingEntry(entry)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400'
                            : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                            }`}
                          title="View Transaction Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Ledger</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TRANSACTION DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingEntry && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setViewingEntry(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Ledger Voucher Details</h3>
                  <p className="text-[11px] text-slate-400 font-bold">{viewingEntry.ref}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 rounded-2xl space-y-2.5 border text-xs ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between items-center text-slate-500">
                <span>Customer:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{viewingEntry.partyName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Date:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingEntry.date}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Transaction Type:</span>
                <span className="font-bold text-brand-600">{viewingEntry.txType}</span>
              </div>
              <div className="flex justify-between items-start text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Description / Items:</span>
                <span className="font-medium text-right max-w-xs text-slate-900 dark:text-white">{viewingEntry.desc}</span>
              </div>

              {viewingEntry.debit > 0 && (
                <div className="flex justify-between items-center text-blue-600 font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Sale Amount:</span>
                  <span className="font-mono text-sm">Rs. {viewingEntry.debit.toLocaleString()}</span>
                </div>
              )}

              {viewingEntry.credit > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Payment Received:</span>
                  <span className="font-mono text-sm">Rs. {viewingEntry.credit.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Account Balance:</span>
                <span className={`font-mono text-sm ${viewingEntry.runningBalance > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  Rs. {viewingEntry.runningBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingEntry(null)}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Record Ledger Payment
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Select Customer *</label>
                <select
                  required
                  value={paymentForm.partyId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, partyId: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="">Choose Customer</option>
                  {(isSupplier ? suppliers : customers).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Rs. {(Number(p.balance) || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Enter payment amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="Cash">Cash on Counter</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Payment Note</label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    placeholder="e.g. Account settlement"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Payment'}</span>
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
