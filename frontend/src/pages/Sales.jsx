import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Eye,
  Plus
} from 'lucide-react';
import { useERP, computeSaleFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReceiptModal } from '../components/ReceiptModal';
import { SaleReturnModal } from '../components/SaleReturnModal';
import { EditSaleModal } from '../components/EditSaleModal';

export const Sales = () => {
  const { sales = [], saleReturns = [], customers = [], paymentLogs = [], recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  // Filters State
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Party' | 'Walk-in Customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState('All'); // 'All' | specific customer id
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Pending'

  // Modals state
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnSale, setSelectedReturnSale] = useState(null);
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
        else if (showReturnModal) setShowReturnModal(false);
        else if (editingSale) setEditingSale(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentModalSale, activeReceiptModal, showReturnModal, editingSale]);

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
      // 1. Date Filter
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
      const { status, isReturned } = computeSaleFinancials(s, saleReturns);

      if (statusFilter === 'Returned') {
        if (!isReturned) return false;
      } else if (statusFilter !== 'All') {
        if (statusFilter !== status) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || a.date || 0).getTime() || Number(a.id) || 0;
      const timeB = new Date(b.created_at || b.createdAt || b.date || 0).getTime() || Number(b.id) || 0;
      return timeB - timeA;
    });
  }, [sales, saleReturns, dateFilterType, customStartDate, customEndDate, customerTypeFilter, selectedCustomerId, statusFilter]);

  // Filtered Sale Returns (for when Processed Returns Only is selected)
  const filteredSaleReturns = useMemo(() => {
    return (saleReturns || []).filter(r => {
      if (selectedCustomerId !== 'All') {
        const matchesId = r.customerId && r.customerId === selectedCustomerId;
        const matchesName = (r.customerName || '').toLowerCase() === selectedCustomerId.toLowerCase();
        if (!matchesId && !matchesName) return false;
      }
      return true;
    }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }, [saleReturns, selectedCustomerId]);

  // Aggregate Metrics based on Filtered Sales (Synchronized with Khata & Invoices)
  const totalFilteredSalesVolume = filteredSales.reduce(
    (acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0),
    0
  );

  const { totalFilteredCashReceived, totalFilteredOutstandingDue } = useMemo(() => {
    let totalCollected = 0;
    let totalOutstanding = 0;

    filteredSales.forEach(s => {
      const fin = computeSaleFinancials(s, saleReturns);
      totalCollected += fin.paid;
      totalOutstanding += fin.due;
    });

    return {
      totalFilteredCashReceived: totalCollected,
      totalFilteredOutstandingDue: totalOutstanding
    };
  }, [filteredSales, saleReturns]);

  // Check if any filter is active
  const isAnyFilterActive = (
    dateFilterType !== 'All' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    customerTypeFilter !== 'All' ||
    selectedCustomerId !== 'All' ||
    statusFilter !== 'All'
  );

  const resetAllFilters = () => {
    setDateFilterType('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setCustomerTypeFilter('All');
    setSelectedCustomerId('All');
    setStatusFilter('All');
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

    const val = Math.max(1, Number(paymentAmount) || 0);
    const paid = Number(paymentModalSale.paidAmount || 0);
    const total = Number(paymentModalSale.amount || 0);
    const retAmt = Number(paymentModalSale.returnAmount || 0);
    const due = Math.max(0, total - paid - retAmt);

    if (val > due) {
      alert(`Amount exceeds remaining due balance of Rs. ${due.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId: paymentModalSale.customerId,
        partyType: 'Customer',
        amount: val,
        paymentMode: paymentMode,
        note: paymentNote || `Payment for sale ${paymentModalSale.invoiceNo}`,
        saleId: paymentModalSale.id
      });
      setPaymentModalSale(null);
    } catch (err) {
      console.error('Payment error:', err);
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receipt Modal View Helper
  const openReceiptForSale = (s) => {
    const receiptData = {
      orderId: s.invoiceNo,
      date: s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : '-'),
      customerName: s.partyName,
      customerPhone: s.customerPhone,
      customerCity: s.customerCity,
      items: s.cart && s.cart.length > 0 ? s.cart.map(item => ({
        name: item.name,
        qty: item.qty,
        unit: item.unitName || item.unit || t('kg'),
        price: Number(item.rate || item.price || 0)
      })) : [{
        name: typeof s.items === 'string' ? s.items : (Array.isArray(s.items) ? s.items.map(i => i.name).join(', ') : t('products')),
        qty: s.itemsCount || 1,
        unit: t('item'),
        price: Number(s.amount || 0)
      }],
      subtotal: Number(s.amount || 0),
      discount: 0,
      tax: 0,
      grandTotal: Number(s.amount || 0),
      paidAmount: Number(s.paidAmount || 0),
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
            <span>Sales & Orders</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Track customer sales, cash payments, balances, and returns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Print Current Filtered List */}
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark'
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print List</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Real-time Filter-Aware) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Sales Volume */}
        <div
          onClick={() => setStatusFilter('All')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark'
            ? 'bg-slate-800 border-emerald-500/30 text-white'
            : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}
          title="Click to view all sales"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>{t('totalSalesVolume') || 'Total Sales'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            Rs. {totalFilteredSalesVolume.toLocaleString()}
          </div>
        </div>

        {/* 2. Cash Received */}
        <div
          onClick={() => setStatusFilter('Paid')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark'
            ? 'bg-slate-800 border-blue-500/30 text-white'
            : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
            }`}
          title="Click to filter paid sales"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>{t('cashReceived') || 'Cash Received'}</span>
          </div>

          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
            Rs. {totalFilteredCashReceived.toLocaleString()}
          </div>
        </div>

        {/* 3. Pending Khata / Receivable */}
        <div
          onClick={() => setStatusFilter('Pending')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark'
            ? 'bg-slate-800 border-amber-500/30 text-white'
            : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
            }`}
          title="Click to filter pending khata sales"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{t('amountToReceive') || 'Current Amount to Receive'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalFilteredOutstandingDue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-FILTER TOOLBAR (DATE, CUSTOMER TYPE, PARTY, PAYMENT STATUS) */}
      {/* ========================================================================= */}
      <div className={`border rounded-3xl p-3.5 sm:p-4 card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
          {/* 1. Date Filter */}
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              <span>Date Filter</span>
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Customer Type</span>
            </label>
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Customer Types</option>
              <option value="Regular Party">Regular Parties</option>
              <option value="Walk-in Customer">Walk-in Customers</option>
            </select>
          </div>

          {/* 3. Select Party */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Select Party</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Payment Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Paid</option>
              <option value="Pending">Unpaid / Due</option>
              <option value="Returned">Returned Sales</option>
            </select>
          </div>

          {/* Inline Reset Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-[38px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center justify-center gap-1.5"
              title="Reset All Filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Custom Date Pickers (if Custom is chosen) */}
        {dateFilterType === 'Custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400">Date Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              title="From Date"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              title="To Date"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SALES TABLE VIEW */}
      {/* ========================================================================= */}
      <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3.5 px-4">Sale ID</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Commodity</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {t('noSalesFoundForFilters') || 'No sales found matching your selected date and filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredSales.map(s => {
                  const { total, paid, returnAmount: retAmt, due, status, isReturned } = computeSaleFinancials(s, saleReturns);
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

                      {/* 3. Buyer / Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {s.partyName}
                        </div>
                      </td>

                      {/* 4. Commodity */}
                      <td className="py-3.5 px-4">
                        {s.cart && s.cart.length > 0 ? (
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-xs leading-relaxed">
                            {s.cart.map((item, idx) => (
                              <span key={idx}>
                                {item.name} ({item.qty} {item.unitName || item.unit || t('kg')}){idx < s.cart.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300 font-semibold text-xs">
                            {typeof s.items === 'string'
                              ? s.items
                              : (Array.isArray(s.items) ? s.items.map(i => i.name || i.productName).join(', ') : t('products'))}
                          </span>
                        )}
                      </td>

                      {/* 5. Amount (Total Price Only) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black font-mono text-xs text-slate-900 dark:text-white">
                          Rs. {total.toLocaleString()}
                        </div>
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-extrabold text-xs whitespace-nowrap ${status === 'Paid'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : status === 'Partial'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                            }`}>
                            {status === 'Paid' ? 'Paid' : status === 'Partial' ? 'Partially Paid' : 'Unpaid'}
                          </span>

                          {/* Return Status if partially or fully returned */}
                          {(s.returnStatus || s.returnAmount > 0) && (
                            <span className={`font-bold text-[11px] whitespace-nowrap ${s.returnStatus === 'Fully Returned'
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-orange-600 dark:text-orange-400'
                              }`}>
                              ({s.returnStatus || 'Partially Returned'})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions: Edit | Return Sale */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Action */}
                          <button
                            onClick={() => setEditingSale(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition cursor-pointer text-xs font-bold"
                            title="Edit Sale / Modify Items"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Return Sale Action */}
                          {(s.returnStatus === 'Fully Returned' || (Number(s.returnAmount || 0) >= (total - 1) && total > 0)) ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-400 text-xs font-bold select-none cursor-not-allowed"
                              title="This sale is fully returned"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                              <span>Fully Returned</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedReturnSale(s);
                                setShowReturnModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs font-bold"
                              title="Return Sale (Partial or Full)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return Sale</span>
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

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Payment Received Modal */}
      {paymentModalSale && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalSale(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('paymentMethodLabel')}</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
