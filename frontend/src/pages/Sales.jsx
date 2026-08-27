import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  CheckCircle2, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  X, 
  Check, 
  RotateCcw, 
  Calendar, 
  Users, 
  User,
  Filter, 
  FileSpreadsheet, 
  RefreshCw, 
  Edit3,
  Eye
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReceiptModal } from '../components/ReceiptModal';
import { SaleReturnModal } from '../components/SaleReturnModal';
import { DailySalesReportModal } from '../components/DailySalesReportModal';
import { EditSaleModal } from '../components/EditSaleModal';

export const Sales = () => {
  const { sales = [], saleReturns = [], customers = [], recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Party' | 'Walk-in Customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState('All'); // 'All' | specific customer id
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Pending'
  const [returnFilter, setReturnFilter] = useState('All'); // 'All' | 'SalesOnly' | 'WithReturns' | 'ReturnsOnly'

  // Modals state
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnSale, setSelectedReturnSale] = useState(null);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

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
        else if (showDailyReportModal) setShowDailyReportModal(false);
        else if (showReturnModal) setShowReturnModal(false);
        else if (editingSale) setEditingSale(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentModalSale, activeReceiptModal, showDailyReportModal, showReturnModal, editingSale]);

  // Robust Date Parser helper for any sale record
  const parseSaleDate = (dateStr, createdAtStr) => {
    if (createdAtStr) {
      const d = new Date(createdAtStr);
      if (!isNaN(d.getTime())) return d;
    }
    if (!dateStr) return null;

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper to check if sale date falls within active Date Filter
  const matchDateFilter = (s) => {
    if (dateFilterType === 'All') return true;

    const saleDate = parseSaleDate(s.date, s.created_at);
    if (!saleDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const saleDay = new Date(saleDate);
    saleDay.setHours(0, 0, 0, 0);

    if (dateFilterType === 'Today') {
      return saleDay.getTime() === today.getTime();
    }

    if (dateFilterType === 'Yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return saleDay.getTime() === yesterday.getTime();
    }

    if (dateFilterType === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return saleDay >= startOfWeek && saleDay <= new Date();
    }

    if (dateFilterType === 'This Month') {
      return (
        saleDay.getFullYear() === today.getFullYear() &&
        saleDay.getMonth() === today.getMonth()
      );
    }

    if (dateFilterType === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return saleDay >= start && saleDay <= end;
      } else if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return saleDay >= start;
      } else if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return saleDay <= end;
      }
      return true;
    }

    return true;
  };

  // Filtered Sales Array
  const filteredSales = useMemo(() => {
    return (sales || []).filter(s => {
      // 1. Text Search (Invoice #, Party Name, Cart Items, Notes)
      const q = search.toLowerCase().trim();
      if (q) {
        const invMatch = (s.invoiceNo || s.invoiceno || '').toLowerCase().includes(q);
        const partyMatch = (s.partyName || s.partyname || s.customerName || '').toLowerCase().includes(q);
        const noteMatch = (s.note || s.saleNote || '').toLowerCase().includes(q);
        
        let itemMatch = false;
        if (Array.isArray(s.cart)) {
          itemMatch = s.cart.some(item => (item.name || '').toLowerCase().includes(q));
        } else if (typeof s.items === 'string') {
          itemMatch = s.items.toLowerCase().includes(q);
        }

        if (!invMatch && !partyMatch && !noteMatch && !itemMatch) {
          return false;
        }
      }

      // 2. Date Filter
      if (!matchDateFilter(s)) return false;

      // 3. Customer Type Filter
      const isWalkin = (s.customerType || '').toLowerCase().includes('walk-in') || 
                       (s.partyName || '').toLowerCase().includes('walk-in');
      if (customerTypeFilter === 'Regular Party' && isWalkin) return false;
      if (customerTypeFilter === 'Walk-in Customer' && !isWalkin) return false;

      // 4. Specific Customer Filter
      if (selectedCustomerId !== 'All') {
        const matchesId = s.customerId && s.customerId === selectedCustomerId;
        const matchesName = (s.partyName || '').toLowerCase() === selectedCustomerId.toLowerCase();
        if (!matchesId && !matchesName) return false;
      }

      // 5. Payment Status Filter
      const paid = Number(s.paidAmount ?? s.paidamount ?? 0);
      const total = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? 0);
      const status = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

      if (statusFilter === 'Paid' && status !== 'Paid') return false;
      if (statusFilter === 'Partial' && status !== 'Partial') return false;
      if (statusFilter === 'Pending' && status !== 'Pending') return false;

      // 6. Return Filter
      const hasReturns = Number(s.returnAmount || 0) > 0 || (saleReturns || []).some(r => r.saleId === s.id || r.invoiceNo === s.invoiceNo);
      if (returnFilter === 'SalesOnly' && hasReturns) return false;
      if (returnFilter === 'WithReturns' && !hasReturns) return false;

      return true;
    });
  }, [sales, saleReturns, search, dateFilterType, customStartDate, customEndDate, customerTypeFilter, selectedCustomerId, statusFilter, returnFilter]);

  // Filtered Sale Returns (for when Processed Returns Only is selected)
  const filteredSaleReturns = useMemo(() => {
    return (saleReturns || []).filter(r => {
      const q = search.toLowerCase().trim();
      if (q) {
        const retMatch = (r.returnNo || '').toLowerCase().includes(q);
        const invMatch = (r.invoiceNo || '').toLowerCase().includes(q);
        const custMatch = (r.customerName || '').toLowerCase().includes(q);
        if (!retMatch && !invMatch && !custMatch) return false;
      }
      if (selectedCustomerId !== 'All') {
        const matchesId = r.customerId && r.customerId === selectedCustomerId;
        const matchesName = (r.customerName || '').toLowerCase() === selectedCustomerId.toLowerCase();
        if (!matchesId && !matchesName) return false;
      }
      return true;
    });
  }, [saleReturns, search, selectedCustomerId]);

  // Aggregate Metrics based on Filtered Sales
  const totalFilteredSalesVolume = filteredSales.reduce(
    (acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0), 
    0
  );
  const totalFilteredCashReceived = filteredSales.reduce(
    (acc, s) => acc + (Number(s.paidAmount ?? s.paidamount) || 0), 
    0
  );
  const totalFilteredOutstandingDue = filteredSales.reduce((acc, s) => {
    const amt = Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0;
    const paid = Number(s.paidAmount ?? s.paidamount) || 0;
    const ret = Number(s.returnAmount || 0);
    return acc + Math.max(0, amt - paid - ret);
  }, 0);

  // Check if any filter is active
  const isAnyFilterActive = (
    search !== '' || 
    dateFilterType !== 'All' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    customerTypeFilter !== 'All' || 
    selectedCustomerId !== 'All' || 
    statusFilter !== 'All' ||
    returnFilter !== 'All'
  );

  const resetAllFilters = () => {
    setSearch('');
    setDateFilterType('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setCustomerTypeFilter('All');
    setSelectedCustomerId('All');
    setStatusFilter('All');
    setReturnFilter('All');
  };

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

  const openReceiptForSale = (s) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-500" />
            <span>{t('salesInvoicesTab') || 'Sales'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Complete sale transaction records with Edit & Return workflows
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Daily Sales Report Button */}
          <button
            onClick={() => setShowDailyReportModal(true)}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-brand-500/20 transition cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('dailySalesReport') || 'Daily Sales Report'}</span>
          </button>

          {/* Process Return Button */}
          <button
            onClick={() => {
              setSelectedReturnSale(null);
              setShowReturnModal(true);
            }}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Process Sale Return</span>
          </button>

          {/* Print Current Filtered List */}
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Printer className="w-4 h-4" /> 
            <span>{t('print') || 'Print List'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Real-time Filter-Aware) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Total Sales Volume */}
        <div
          onClick={() => { setStatusFilter('All'); setReturnFilter('All'); }}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' 
              ? 'bg-slate-800 border-emerald-500/30 text-white' 
              : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
          }`}
          title="Click to view all sales"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-600" /> 
            <span>{t('totalSalesVolume') || 'Total Sales Volume'}</span>
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-emerald-600 dark:text-emerald-400">
            Rs. {totalFilteredSalesVolume.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">
            {filteredSales.length} {t('invoices') || 'Sales'} • {isAnyFilterActive ? 'Filtered Results' : 'All-time Volume'}
          </div>
        </div>

        {/* 2. Cash Received */}
        <div
          onClick={() => setStatusFilter('Paid')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' 
              ? 'bg-slate-800 border-blue-500/30 text-white' 
              : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
          }`}
          title="Click to filter paid sales"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-blue-600" /> 
            <span>{t('cashReceived') || 'Cash Received'}</span>
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-blue-600 dark:text-blue-400">
            Rs. {totalFilteredCashReceived.toLocaleString()}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-1">
            Direct Payments Collected
          </div>
        </div>

        {/* 3. Pending Khata / Receivable */}
        <div
          onClick={() => setStatusFilter('Pending')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' 
              ? 'bg-slate-800 border-amber-500/30 text-white' 
              : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
          }`}
          title="Click to filter pending khata sales"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" /> 
            <span>{t('amountToReceive') || 'Current Amount to Receive'}</span>
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-amber-600 dark:text-amber-400">
            Rs. {totalFilteredOutstandingDue.toLocaleString()}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-1">
            Pending in Customer Khata
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5-FILTER TOOLBAR (DATE, CUSTOMER TYPE, PARTY, PAYMENT STATUS, SALE RETURNS) */}
      {/* ========================================================================= */}
      <div className={`border rounded-3xl p-4 sm:p-5 card-shadow space-y-3.5 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Date Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              <span>Date Filter</span>
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>

          {/* 2. Customer Type */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Customer Type</span>
            </label>
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Customer Types</option>
              <option value="Regular Party">Regular Parties</option>
              <option value="Walk-in Customer">Walk-in Customers</option>
            </select>
          </div>

          {/* 3. Select Party */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Select Party</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Individual Parties</option>
              {customers.map(cust => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} {cust.city ? `(${cust.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Payment Status */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Payment Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Paid</option>
              <option value="Pending">Unpaid / Due</option>
            </select>
          </div>

          {/* 5. Sale Returns (Separate Filter) */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
              <span>Sale Returns</span>
            </label>
            <select
              value={returnFilter}
              onChange={(e) => setReturnFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Transactions</option>
              <option value="SalesOnly">Sales Only (No Returns)</option>
              <option value="WithReturns">Sales with Returns</option>
              <option value="ReturnsOnly">Processed Returns ({saleReturns.length})</option>
            </select>
          </div>
        </div>

        {/* Row 2: Custom Date Pickers (if Custom is chosen) + Search Bar + Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/80">
          {/* Custom Date Pickers */}
          {dateFilterType === 'Custom' ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  title="From Date"
                />
              </div>
              <span className="text-xs text-slate-400 font-bold">to</span>
              <div>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  title="To Date"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-bold hidden sm:block">
              Filter sales by date range, customer type, party, payment status, and returns
            </div>
          )}

          {/* Search Box & Reset Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sale ID, buyer, commodity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center gap-1.5"
                title="Reset All Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SALES TABLE VIEW (OR PROCESSED RETURNS VIEW) */}
      {/* ========================================================================= */}
      {returnFilter === 'ReturnsOnly' ? (
        /* Sale Returns History Table */
        <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-black text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              <span>Processed Customer Sale Returns ({filteredSaleReturns.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3.5 px-4">Return #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Buyer / Party</th>
                  <th className="py-3.5 px-4">Original Sale ID</th>
                  <th className="py-3.5 px-4">Commodity Returned</th>
                  <th className="py-3.5 px-4 text-center">Refund Mode</th>
                  <th className="py-3.5 px-4 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {filteredSaleReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No processed sale returns match the filter.
                    </td>
                  </tr>
                ) : (
                  filteredSaleReturns.map(ret => (
                    <tr key={ret.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">{ret.returnNo}</td>
                      <td className="py-3.5 px-4 text-slate-500">{ret.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{ret.customerName}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{ret.invoiceNo}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {ret.items && ret.items[0] ? `${ret.items[0].name} (${ret.items[0].qty} ${ret.items[0].unit})` : 'Commodity Item'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                          ret.refundMode === 'Cash' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {ret.refundMode === 'Cash' ? 'Cash' : 'Khata'}
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
        <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3.5 px-4">Sale ID</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Buyer / Party</th>
                  <th className="py-3.5 px-4">Commodity</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${
                theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      {t('noSalesFoundForFilters') || 'No sales found matching your selected date and filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map(s => {
                    const paid = Number(s.paidAmount || 0);
                    const total = Number(s.amount || s.grandTotal || 0);
                    const retAmt = Number(s.returnAmount || 0);
                    const due = Math.max(0, total - paid - retAmt);
                    const status = paid >= (total - retAmt) && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
                    const isWalkin = (s.customerType || '').toLowerCase().includes('walk-in') || 
                                     (s.partyName || '').toLowerCase().includes('walk-in');

                    return (
                      <tr 
                        key={s.id} 
                        className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                      >
                        {/* 1. Sale ID */}
                        <td className="py-3.5 px-4 font-mono font-black text-brand-500 text-xs">
                          {s.invoiceNo}
                        </td>

                        {/* 2. Date */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs font-mono font-medium">
                          {s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : '-')}
                        </td>

                        {/* 3. Buyer / Party */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{s.partyName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isWalkin 
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' 
                                : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                            }`}>
                              {isWalkin ? 'Walk-in' : 'Regular Party'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Commodity */}
                        <td className="py-3.5 px-4">
                          {s.cart && s.cart.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {s.cart.map((item, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-[11px] border border-brand-500/20 whitespace-nowrap"
                                >
                                  {item.name} ({item.qty} {item.unitName || item.unit || t('kg')})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold">
                              {typeof s.items === 'string' 
                                ? s.items 
                                : (Array.isArray(s.items) ? s.items.map(i => i.name || i.productName).join(', ') : t('products'))}
                            </span>
                          )}
                        </td>

                        {/* 5. Amount (Total / Paid / Due) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black font-mono text-xs text-slate-900 dark:text-white">
                            Rs. {total.toLocaleString()}
                          </div>
                          {due > 0 ? (
                            <div className="text-[10px] font-mono text-amber-500 font-bold">
                              Due: Rs. {due.toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              Paid: Rs. {paid.toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* 6. Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap border ${
                            status === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : status === 'Partial'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}>
                            {status === 'Paid' ? t('paid') : status === 'Partial' ? t('partial') : t('pending')}
                          </span>
                        </td>

                        {/* 7. Actions: View | Edit | Return Sale */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Action */}
                            <button
                              onClick={() => openReceiptForSale(s)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                                theme === 'dark' 
                                  ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400' 
                                  : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                              }`}
                              title="View Sale Receipt / Invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Edit Action */}
                            <button
                              onClick={() => setEditingSale(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition cursor-pointer text-xs font-bold"
                              title="Edit Sale / Update Items"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* Return Sale Action */}
                            <button
                              onClick={() => {
                                setSelectedReturnSale(s);
                                setShowReturnModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs font-bold"
                              title="Process Return for this Sale"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>

                            {/* Quick Receive Payment (if due > 0) */}
                            {due > 0 && (
                              <button
                                onClick={() => openPaymentModal(s)}
                                className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-2 py-1.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                                title="Receive Outstanding Payment"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>{t('Received') || 'Pay'}</span>
                              </button>
                            )}
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

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Daily Sales Summary Report Modal */}
      {showDailyReportModal && (
        <DailySalesReportModal
          isOpen={showDailyReportModal}
          onClose={() => setShowDailyReportModal(false)}
        />
      )}

      {/* 2. Payment Received Modal */}
      {paymentModalSale && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalSale(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{t('Received') || 'Receive Payment'}</h3>
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
            <div className={`rounded-2xl p-3.5 space-y-2 border text-xs font-semibold ${
              theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
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
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-brand-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('paymentMethodLabel')}</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalSale(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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

      {/* 3. Receipt / View Modal */}
      {activeReceiptModal && (
        <ReceiptModal
          isOpen={!!activeReceiptModal}
          onClose={() => setActiveReceiptModal(null)}
          orderData={activeReceiptModal}
        />
      )}

      {/* 4. Sale Return Modal */}
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

      {/* 5. Edit Sale Modal */}
      {editingSale && (
        <EditSaleModal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
        />
      )}
    </div>
  );
};

export default Sales;
