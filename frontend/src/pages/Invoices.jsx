import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Printer,
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  Clock,
  Calendar,
  Users,
  User,
  Filter,
  RotateCcw,
  RefreshCw,
  Eye,
  Download,
  Building2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReceiptModal } from '../components/ReceiptModal';
import { PurchaseReceiptModal } from '../components/PurchaseReceiptModal';

export const Invoices = () => {
  const { sales = [], purchases = [], customers = [], suppliers = [], products = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const typeParam = searchParams.get('type');
  const isPurchases = typeParam && typeParam.toLowerCase() === 'purchases';

  // Filters
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('All');
  const [selectedProductFilter, setSelectedProductFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Pending'

  // Modals state
  const [selectedSaleReceipt, setSelectedSaleReceipt] = useState(null);
  const [selectedPurchaseReceipt, setSelectedPurchaseReceipt] = useState(null);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedSaleReceipt) setSelectedSaleReceipt(null);
        else if (selectedPurchaseReceipt) setSelectedPurchaseReceipt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSaleReceipt, selectedPurchaseReceipt]);

  // Robust Date Parser helper
  const parseInvoiceDate = (dateStr, createdAtStr) => {
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

  // Date Filter matcher
  const matchDateFilter = (item) => {
    if (dateFilterType === 'All') return true;

    const itemDate = parseInvoiceDate(item.date, item.created_at || item.createdAt);
    if (!itemDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemDay = new Date(itemDate);
    itemDay.setHours(0, 0, 0, 0);

    if (dateFilterType === 'Today') {
      return itemDay.getTime() === today.getTime();
    }

    if (dateFilterType === 'Yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return itemDay.getTime() === yesterday.getTime();
    }

    if (dateFilterType === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return itemDay >= startOfWeek && itemDay <= new Date();
    }

    if (dateFilterType === 'This Month') {
      return (
        itemDay.getFullYear() === today.getFullYear() &&
        itemDay.getMonth() === today.getMonth()
      );
    }

    if (dateFilterType === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return itemDay >= start && itemDay <= end;
      } else if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return itemDay >= start;
      } else if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return itemDay <= end;
      }
      return true;
    }

    return true;
  };

  // Formatted List Source
  const rawList = useMemo(() => {
    if (isPurchases) {
      return purchases.map(p => {
        const total = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0);
        const paid = Number(p.paidAmount ?? p.paidamount ?? 0);
        const due = Math.max(0, total - paid);
        let status = 'Pending';
        if (paid >= total && total > 0) status = 'Paid';
        else if (paid > 0 && paid < total) status = 'Partial';

        return {
          id: p.id,
          invoiceNo: p.purchaseNo || p.purchaseno || `PUR-${p.id}`,
          date: p.date || new Date().toLocaleDateString(),
          created_at: p.created_at || p.createdAt,
          partyName: p.supplier || p.supplierName || p.suppliername || 'Supplier / Vendor',
          partyId: p.supplierId,
          supplierCity: p.supplierCity,
          supplierPhone: p.supplierPhone,
          amount: total,
          paidAmount: paid,
          dueAmount: due,
          status: status,
          paymentMode: p.paymentMethod || p.paymentMode || 'Supplier Khata',
          cart: p.cart || p.items || [],
          type: 'Purchase',
          note: p.note || ''
        };
      });
    } else {
      return sales.map(s => {
        const total = Number(s.amount || s.grandTotal || 0);
        const paid = Number(s.paidAmount || 0);
        const due = Math.max(0, total - paid);
        let status = 'Pending';
        if (paid >= total && total > 0) status = 'Paid';
        else if (paid > 0 && paid < total) status = 'Partial';

        return {
          id: s.id,
          invoiceNo: s.invoiceNo || `INV-${s.id}`,
          date: s.date || new Date().toLocaleDateString(),
          created_at: s.created_at || s.createdAt,
          partyName: s.partyName || s.customerName || 'Walk-in Customer',
          partyId: s.customerId,
          customerType: s.customerType || 'Regular Party',
          customerCity: s.customerCity,
          customerPhone: s.customerPhone,
          amount: total,
          paidAmount: paid,
          dueAmount: due,
          status: status,
          paymentMode: s.paymentMode || s.paymentMethod || 'Cash',
          cart: s.cart || s.items || [],
          type: 'Sale',
          note: s.saleNote || s.note || ''
        };
      });
    }
  }, [isPurchases, sales, purchases]);

  // Filtered List
  const filteredInvoices = useMemo(() => {
    return rawList.filter(item => {
      // 1. Party Filter
      if (selectedPartyId !== 'All') {
        const matchesParty = item.partyId === selectedPartyId || item.partyName.toLowerCase() === selectedPartyId.toLowerCase();
        if (!matchesParty) return false;
      }

      // 2. Product Filter
      if (selectedProductFilter !== 'All') {
        let hasProduct = false;
        if (Array.isArray(item.cart)) {
          hasProduct = item.cart.some(c =>
            (c.name || c.productName || '').toLowerCase().includes(selectedProductFilter.toLowerCase())
          );
        } else if (typeof item.cart === 'string') {
          hasProduct = item.cart.toLowerCase().includes(selectedProductFilter.toLowerCase());
        }
        if (!hasProduct) return false;
      }

      // 3. Date Filter
      if (!matchDateFilter(item)) return false;

      // 4. Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Paid' && item.status !== 'Paid') return false;
        if (statusFilter === 'Partial' && item.status !== 'Partial') return false;
        if (statusFilter === 'Pending' && item.status !== 'Pending') return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || a.date || 0).getTime() || Number(a.id) || 0;
      const timeB = new Date(b.created_at || b.createdAt || b.date || 0).getTime() || Number(b.id) || 0;
      return timeB - timeA;
    });
  }, [rawList, selectedPartyId, selectedProductFilter, dateFilterType, customStartDate, customEndDate, statusFilter]);

  // Summary Metrics
  const totalBilledVolume = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  }, [filteredInvoices]);

  const totalSettledAmount = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
  }, [filteredInvoices]);

  const totalOutstandingDue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
  }, [filteredInvoices]);

  const isAnyFilterActive =
    dateFilterType !== 'All' ||
    selectedPartyId !== 'All' ||
    selectedProductFilter !== 'All' ||
    statusFilter !== 'All';

  const resetAllFilters = () => {
    setDateFilterType('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedPartyId('All');
    setSelectedProductFilter('All');
    setStatusFilter('All');
  };

  // Open A4 Document Modal
  const openReceiptModal = (inv) => {
    if (inv.type === 'Sale') {
      setSelectedSaleReceipt({
        orderId: inv.invoiceNo,
        date: inv.date,
        customerName: inv.partyName,
        customerPhone: inv.customerPhone,
        customerCity: inv.customerCity,
        items: inv.cart && Array.isArray(inv.cart) && inv.cart.length > 0 ? inv.cart.map(item => ({
          name: item.name || item.productName || 'Produce',
          qty: Number(item.qty || 1),
          unit: item.unit || item.unitName || 'KG',
          price: Number(item.rate || item.price || 0)
        })) : [{
          name: typeof inv.cart === 'string' ? inv.cart : 'Commodity Produce',
          qty: 1,
          unit: 'KG',
          price: Number(inv.amount || 0)
        }],
        subtotal: Number(inv.amount || 0),
        discount: 0,
        tax: 0,
        grandTotal: Number(inv.amount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        paymentMethod: inv.paymentMode || 'Cash',
        saleNote: inv.note || 'Official Sales Invoice'
      });
    } else {
      setSelectedPurchaseReceipt({
        purchaseNo: inv.invoiceNo,
        date: inv.date,
        supplierName: inv.partyName,
        supplierPhone: inv.supplierPhone,
        supplierCity: inv.supplierCity,
        items: inv.cart && Array.isArray(inv.cart) && inv.cart.length > 0 ? inv.cart.map(item => ({
          name: item.name || item.productName || 'Produce',
          qty: Number(item.qty || item.enteredQty || 1),
          unit: item.unit || item.unitName || 'KG',
          price: Number(item.rate || item.price || 0),
          total: Number(item.total || (Number(item.rate || 0) * Number(item.qty || 1)) || inv.amount || 0)
        })) : [{
          name: typeof inv.cart === 'string' ? inv.cart : 'Inward Produce',
          qty: 1,
          unit: 'KG',
          price: Number(inv.amount || 0),
          total: Number(inv.amount || 0)
        }],
        totalAmount: Number(inv.amount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        paymentMode: inv.paymentMode || 'Supplier Credit (Khata)',
        note: inv.note || 'Official Purchase Voucher'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            {isPurchases ? (
              <ShoppingCart className="w-6 h-6 text-brand-500" />
            ) : (
              <FileText className="w-6 h-6 text-brand-500" />
            )}
            <span>{isPurchases ? 'Purchase Invoices' : 'Sales Invoices'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {isPurchases
              ? 'Official supplier inward procurement vouchers, goods receipts, and payable records'
              : 'Official sales tax invoices, customer billing records, and printable A4 receipts'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
        >
          <Printer className="w-4 h-4" />
          <span>Print List</span>
        </button>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Billed Volume */}
        <div
          onClick={() => setStatusFilter('All')}
          className={`border rounded-2xl p-5 card-shadow transition-all cursor-pointer ${theme === 'dark'
            ? isPurchases ? 'bg-slate-800 border-emerald-500/30' : 'bg-slate-800 border-brand-500/30'
            : isPurchases ? 'bg-emerald-50/40 border-emerald-200/60' : 'bg-brand-50/40 border-brand-200/60'
            }`}
          title="Click to view all invoices"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            {isPurchases ? <ShoppingCart className="w-4 h-4 text-emerald-600" /> : <Receipt className="w-4 h-4 text-brand-600" />}
            <span>{isPurchases ? 'Total Purchase Billing' : 'Total Sales Invoiced'}</span>
          </div>
          <div className={`text-2xl font-black mt-1.5 font-mono ${isPurchases ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'}`}>
            Rs. {totalBilledVolume.toLocaleString()}
          </div>
        </div>

        {/* 2. Settled Payments */}
        <div
          onClick={() => setStatusFilter('Paid')}
          className={`border rounded-2xl p-5 card-shadow transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200/60'
            }`}
          title="Click to filter fully settled invoices"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>{isPurchases ? 'Total Paid to Vendors' : 'Total Cash Received'}</span>
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-emerald-600 dark:text-emerald-400">
            Rs. {totalSettledAmount.toLocaleString()}
          </div>
        </div>

        {/* 3. Pending Khata / Due */}
        <div
          onClick={() => setStatusFilter('Pending')}
          className={`border rounded-2xl p-5 card-shadow transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30' : 'bg-amber-50/40 border-amber-200/60'
            }`}
          title="Click to filter pending balance invoices"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{isPurchases ? 'Supplier Payables' : 'Customer Receivables'}</span>
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-amber-600 dark:text-amber-400">
            Rs. {totalOutstandingDue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`border rounded-3xl p-4 sm:p-5 card-shadow space-y-3.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Select Party */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>{isPurchases ? 'Supplier / Vendor' : 'Customer'}</span>
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All {isPurchases ? 'Suppliers' : 'Customers'}</option>
              {(isPurchases ? suppliers : customers).map(party => (
                <option key={party.id} value={party.id}>
                  {party.name} {party.city ? `(${party.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Product Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
              <span>Commodity / Item</span>
            </label>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Commodities</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Date Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Billing Period</span>
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>

          {/* 5. Payment Status */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Clearance Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partially Paid</option>
              <option value="Pending">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Row 2: Custom Date Pickers & Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/80">
          {dateFilterType === 'Custom' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  title="To Date"
                />
              </div>
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

      {/* Official Invoices Table */}
      <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3.5 px-4">{isPurchases ? 'Voucher #' : 'Invoice #'}</th>
                <th className="py-3.5 px-4">Billing Date</th>
                <th className="py-3.5 px-4">{isPurchases ? 'Supplier / Vendor' : 'Customer'}</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No billing records found matching your selected filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const paid = Number(inv.paidAmount || 0);
                  const total = Number(inv.amount || 0);

                  return (
                    <tr
                      key={inv.id}
                      className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* 1. Document # */}
                      <td className="py-3.5 px-4 font-mono font-black text-brand-500 text-xs">
                        {inv.invoiceNo}
                      </td>

                      {/* 2. Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs font-mono font-medium">
                        {inv.date}
                      </td>

                      {/* 3. Billed Party */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {inv.partyName}
                        </div>
                        {inv.customerCity && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            {inv.customerCity}
                          </div>
                        )}
                      </td>

                      {/* 4. Payment Mode */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-xs text-slate-600 dark:text-slate-300">
                          {inv.paymentMode}
                        </span>
                      </td>

                      {/* 5. Amount (Total Invoice Amount) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black font-mono text-xs text-slate-900 dark:text-white">
                          Rs. {total.toLocaleString()}
                        </div>
                      </td>

                      {/* 6. Paid (Paid so far) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          Rs. {paid.toLocaleString()}
                        </div>
                      </td>

                      {/* 7. Status (Paid / Partially Paid / Unpaid) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-extrabold text-xs whitespace-nowrap ${inv.status === 'Paid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : inv.status === 'Partial'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {inv.status === 'Paid' ? 'Paid' : inv.status === 'Partial' ? 'Partially Paid' : 'Unpaid'}
                        </span>
                      </td>

                      {/* 8. Actions: View / Print A4 */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openReceiptModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 transition shadow-xs cursor-pointer"
                            title="View & Print Official A4 Document"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print A4</span>
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

      {/* Sales Receipt Modal */}
      {selectedSaleReceipt && (
        <ReceiptModal
          isOpen={!!selectedSaleReceipt}
          onClose={() => setSelectedSaleReceipt(null)}
          orderData={selectedSaleReceipt}
        />
      )}

      {/* Purchase Voucher Modal */}
      {selectedPurchaseReceipt && (
        <PurchaseReceiptModal
          isOpen={!!selectedPurchaseReceipt}
          onClose={() => setSelectedPurchaseReceipt(null)}
          purchaseData={selectedPurchaseReceipt}
        />
      )}
    </div>
  );
};

export default Invoices;
