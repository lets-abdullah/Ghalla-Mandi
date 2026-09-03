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
import { useERP, computeSaleFinancials, computeCustomerKhataBalance, computeWalkinUncollectedDues } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReceiptModal } from '../modals/ReceiptModal';
import { SaleReturnModal } from '../modals/SaleReturnModal';
import { EditSaleModal } from '../modals/EditSaleModal';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const Sales = () => {
  const { sales = [], saleReturns = [], customers = [], paymentLogs = [], recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const toast = useToast();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
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
      // 0. Search Term (Invoice #, Customer Name, Commodity Item)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const invMatch = (s.invoiceNo || `inv-${s.id}`).toLowerCase().includes(q);
        const partyMatch = (s.partyName || s.customerName || '').toLowerCase().includes(q);
        const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : []);
        const itemMatch = cart.some(it => (it.name || it.productName || '').toLowerCase().includes(q));
        if (!invMatch && !partyMatch && !itemMatch) return false;
      }

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
      const { status, isReturned } = computeSaleFinancials(s, saleReturns, paymentLogs, sales);

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
  }, [sales, saleReturns, paymentLogs, searchTerm, dateFilterType, customStartDate, customEndDate, customerTypeFilter, selectedCustomerId, statusFilter]);

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

  const { totalFilteredCashReceived, totalFilteredOutstandingDue, totalFilteredReturnAmount, totalPartyKhataReceivables, totalWalkinUncollected } = useMemo(() => {
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalReturns = 0;

    filteredSales.forEach(s => {
      const fin = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
      totalCollected += fin.paid;
      totalOutstanding += fin.due;
      totalReturns += (fin.returnAmount || 0);
    });

    let partyDue = 0;
    if (selectedCustomerId !== 'All') {
      const targetCust = customers.find(c => String(c.id) === String(selectedCustomerId) || c.name.toLowerCase() === selectedCustomerId.toLowerCase());
      if (targetCust) {
        partyDue = computeCustomerKhataBalance(targetCust, sales, paymentLogs, saleReturns).balance;
      }
    } else {
      partyDue = customers.reduce((sum, c) => sum + computeCustomerKhataBalance(c, sales, paymentLogs, saleReturns).balance, 0);
    }

    const walkinDue = computeWalkinUncollectedDues(sales, saleReturns, paymentLogs);

    return {
      totalFilteredCashReceived: totalCollected,
      totalFilteredOutstandingDue: selectedCustomerId !== 'All' ? partyDue : (customerTypeFilter === 'Walk-in Customer' ? walkinDue : (customerTypeFilter === 'Regular Customer' ? partyDue : (partyDue + walkinDue))),
      totalFilteredReturnAmount: totalReturns,
      totalPartyKhataReceivables: partyDue,
      totalWalkinUncollected: walkinDue
    };
  }, [filteredSales, sales, saleReturns, customers, paymentLogs, selectedCustomerId, customerTypeFilter]);

  // Check if any filter is active
  const isAnyFilterActive = (
    searchTerm.trim() !== '' ||
    dateFilterType !== 'All' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    customerTypeFilter !== 'All' ||
    selectedCustomerId !== 'All' ||
    statusFilter !== 'All'
  );

  const resetAllFilters = () => {
    setSearchTerm('');
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

    const val = Math.max(1, parseInt(paymentAmount, 10) || 0);
    const paid = Math.round(Number(paymentModalSale.paidAmount || 0));
    const total = Math.round(Number(paymentModalSale.amount || 0));
    const retAmt = Math.round(Number(paymentModalSale.returnAmount || 0));
    const rawDue = total - paid - retAmt;
    const due = rawDue < 1 ? 0 : Math.round(rawDue);

    if (val > due) {
      toast.error(`Amount exceeds remaining due balance of Rs. ${due.toLocaleString()}`);
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
      toast.success(`Payment of Rs. ${val.toLocaleString()} recorded successfully for ${paymentModalSale.invoiceNo}`);
      setPaymentModalSale(null);
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Failed to record payment');
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
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <Link
            to="/create-order"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Sale</span>
          </Link>

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

      {/* KPI Cards Row (Real-time Filter-Aware - Screen Only) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Sales */}
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
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Gross merchandise sales
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
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Realized cash & payments
          </div>
        </div>

        {/* 3. Sale Returns */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Returned' ? 'All' : 'Returned')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark'
            ? 'bg-slate-800 border-purple-500/30 text-white'
            : 'bg-gradient-to-b from-purple-50/50 to-white border-purple-200/80'
            }`}
          title="Click to filter returned sales"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Sale Returns</span>
          </div>

          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-purple-600 dark:text-purple-400">
            Rs. {totalFilteredReturnAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Total goods returned / refunded
          </div>
        </div>

        {/* 4. Pending Khata / Receivable */}
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
            <span>{t('amountToReceive') || 'Customer Receivables'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalFilteredOutstandingDue.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {selectedCustomerId !== 'All'
              ? 'Customer Ledger Khata balance'
              : `Party Khata: Rs. ${totalPartyKhataReceivables.toLocaleString()} • Walk-in: Rs. ${totalWalkinUncollected.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-FILTER TOOLBAR (DATE, CUSTOMER TYPE, PARTY, PAYMENT STATUS - SCREEN ONLY) */}
      {/* ========================================================================= */}
      <div className={`no-print border rounded-3xl p-3.5 sm:p-4 card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
          {/* 0. Search Sales */}
          <div className="flex-[2] min-w-[180px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-brand-500" />
              <span>Search Orders</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search invoice #, customer, commodity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-brand-500 h-[38px] ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

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
      {/* PRINT-ONLY HEADER (Mandi branding, title, filter stats) */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Sales & Orders Statement"
        filterSummary={`Period: ${dateFilterType} | Customer: ${customerTypeFilter} | Status: ${statusFilter}`}
        stats={[
          { label: 'Total Invoices', value: filteredSales.length },
          { label: 'Total Sales', value: `Rs. ${totalFilteredSalesVolume.toLocaleString()}` },
          { label: 'Cash Received', value: `Rs. ${totalFilteredCashReceived.toLocaleString()}` },
          { label: 'Pending Due (Khata)', value: `Rs. ${totalFilteredOutstandingDue.toLocaleString()}` }
        ]}
      />

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
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Returned</th>
                <th className="py-3.5 px-4 text-right">Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <EmptyState
                      icon={ShoppingBag}
                      title="No sales found"
                      description="No sales match your current filter criteria."
                      action={
                        <Link
                          to="/create-order"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>New Sale</span>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredSales.map(s => {
                  const {
                    total,
                    grossTotal,
                    netTotal,
                    paid,
                    returnAmount: retAmt,
                    due,
                    status,
                    isReturned,
                    isFullyReturned,
                    isPartiallyReturned
                  } = computeSaleFinancials(s, saleReturns, paymentLogs, sales);

                  return (
                    <tr
                      key={s.id}
                      className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* 1. Invoice # */}
                      <td className="py-3.5 px-4 font-mono font-black text-brand-500 text-xs">
                        {s.invoiceNo}
                      </td>

                      {/* 2. Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs font-mono font-medium">
                        {s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : '-')}
                      </td>

                      {/* 3. Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {s.partyName}
                        </div>
                      </td>

                      {/* 4. Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        Rs. {grossTotal.toLocaleString()}
                      </td>

                      {/* 5. Paid */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        Rs. {paid.toLocaleString()}
                      </td>

                      {/* 6. Returned */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        Rs. {retAmt.toLocaleString()}
                      </td>

                      {/* 7. Due */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-rose-500">
                        Rs. {due.toLocaleString()}
                      </td>

                      {/* 8. Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={isFullyReturned ? 'Returned' : status} />
                      </td>

                      {/* 9. Actions: Consistent View + Action Cluster */}
                      <td className="py-3.5 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openReceiptForSale(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer text-xs font-bold active:scale-98"
                            title="View Details / Print Receipt"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>

                          {!isFullyReturned && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReturnSale(s);
                                setShowReturnModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs font-bold active:scale-98"
                              title="Return Items"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
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


      {/* Print Footer */}
      <PrintFooter note="Official Business Record • Ghalla Mandi Sales & Orders Register" />

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
                  max={Math.max(1, Math.round(Number(paymentModalSale?.amount || 0) - Number(paymentModalSale?.paidAmount || 0)))}
                  step="1"
                  autoFocus
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={paymentAmount}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const maxDue = Math.max(0, Math.round(Number(paymentModalSale?.amount || 0) - Number(paymentModalSale?.paidAmount || 0)));
                    if (raw === '') {
                      setPaymentAmount('');
                      return;
                    }
                    const num = parseInt(raw, 10) || 0;
                    if (maxDue > 0 && num > maxDue) {
                      setPaymentAmount(maxDue.toString());
                    } else {
                      setPaymentAmount(num.toString());
                    }
                  }}
                  placeholder={t('enterPaymentAmount')}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />

                {/* Live Remaining Balance Calculation Preview */}
                {paymentModalSale && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                    <span className="text-slate-500 dark:text-slate-400">Balance after payment:</span>
                    <span className={`font-mono ${
                      Math.max(0, (Number(paymentModalSale.amount || 0) - Number(paymentModalSale.paidAmount || 0)) - (Number(paymentAmount) || 0)) === 0
                        ? 'text-emerald-600 dark:text-emerald-400 font-black'
                        : 'text-amber-600 dark:text-amber-400 font-black'
                    }`}>
                      Rs. {Math.max(0, (Number(paymentModalSale.amount || 0) - Number(paymentModalSale.paidAmount || 0)) - (Number(paymentAmount) || 0)).toLocaleString()}
                      {Math.max(0, (Number(paymentModalSale.amount || 0) - Number(paymentModalSale.paidAmount || 0)) - (Number(paymentAmount) || 0)) === 0 && ' (Fully Settled)'}
                    </span>
                  </div>
                )}
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
