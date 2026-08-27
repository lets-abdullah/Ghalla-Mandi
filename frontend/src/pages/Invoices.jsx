import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Download
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReceiptModal } from '../components/ReceiptModal';
import { PurchaseReceiptModal } from '../components/PurchaseReceiptModal';

export const Invoices = () => {
  const { sales = [], purchases = [], customers = [], suppliers = [], products = [], saleReturns = [], purchaseReturns = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();

  const typeParam = searchParams.get('type');
  const isPurchases = typeParam && typeParam.toLowerCase() === 'purchases';
  const activeTab = isPurchases ? 'Purchases' : 'Sales';

  // 5-Filter State System: [Search] [Supplier/Customer] [Product] [Date] [Status]
  const [search, setSearch] = useState('');
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Party' | 'Walk-in Customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState('All'); // 'All' | specific customer id or name
  const [selectedProductFilter, setSelectedProductFilter] = useState('All'); // 'All' | specific product
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Pending'
  const [returnFilter, setReturnFilter] = useState('All'); // 'All' | 'SalesOnly' | 'WithReturns' | 'ReturnsOnly'

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

    const itemDate = parseInvoiceDate(item.date, item.created_at);
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

  // Format Sales Invoices List
  const salesInvoices = useMemo(() => {
    return (sales || []).map(s => {
      const rawAmt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : (s.grandtotal !== undefined ? s.grandtotal : 0)));
      const paidAmt = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount !== undefined ? s.paidamount : (s.status === 'Paid' ? rawAmt : 0)));
      const retAmt = Number(s.returnAmount || 0);
      const remainingDue = Math.max(0, rawAmt - paidAmt - retAmt);
      const isPaid = paidAmt >= (rawAmt - retAmt) && rawAmt > 0;
      const status = isPaid ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Pending';

      return {
        id: s.id,
        invoiceNo: s.invoiceNo || s.invoiceno || '',
        partyName: s.partyName || s.partyname || s.customerName || 'Walk-in Customer',
        customerId: s.customerId || null,
        customerType: s.customerType || (s.partyName?.toLowerCase().includes('walk-in') ? 'Walk-in Customer' : 'Regular Party'),
        customerPhone: s.customerPhone || '',
        customerCity: s.customerCity || '',
        date: s.date || 'N/A',
        created_at: s.created_at,
        amountNum: rawAmt,
        amount: rawAmt,
        paidAmount: paidAmt,
        dueAmount: remainingDue,
        returnAmount: retAmt,
        paymentMode: s.paymentMode || (isPaid ? 'Cash' : paidAmt > 0 ? 'Partial Cash' : 'Khata (Udhaar)'),
        status: status,
        itemsCount: s.itemsCount || (s.cart ? s.cart.length : 1),
        cart: s.cart,
        items: s.items,
        note: s.note || s.saleNote || '',
        type: 'Sale'
      };
    });
  }, [sales]);

  // Format Purchase Invoices List
  const purchaseInvoices = useMemo(() => {
    return (purchases || []).map(p => {
      const rawAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : (p.grandtotal !== undefined ? p.grandtotal : 0)));
      const paidAmt = Number(p.paidAmount !== undefined ? p.paidAmount : (p.paidamount !== undefined ? p.paidamount : ((p.status || p.paymentStatus) === 'Paid' ? rawAmt : 0)));
      const retAmt = Number(p.returnAmount || 0);
      const remainingDue = Math.max(0, rawAmt - paidAmt - retAmt);
      const supObj = suppliers.find(s => s.name === (p.supplier || p.supplierName) || s.id === p.supplierId);
      
      const itemsList = Array.isArray(p.cart) && p.cart.length > 0 ? p.cart : (Array.isArray(p.items) && p.items.length > 0 ? p.items : []);
      const firstItem = itemsList[0] || {};
      const itemUnit = firstItem.unit || firstItem.unitName || firstItem.enteredUnit || p.unit || p.unitName || t('kg');
      const productName = firstItem.name || firstItem.productName || (typeof p.items === 'string' ? p.items : (p.productName || t('products')));
      const qty = Number(firstItem.qty || firstItem.enteredQty || p.qty || 1);
      const rate = Number(firstItem.rate || firstItem.price || firstItem.ratePerEnteredUnit || p.rate || p.purchasePrice || (qty ? Math.round(rawAmt / qty) : rawAmt));
      const isPaid = paidAmt >= (rawAmt - retAmt) && rawAmt > 0;
      const status = isPaid ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Pending';

      return {
        id: p.id,
        invoiceNo: p.purchaseNo || p.purchaseno || '',
        partyName: p.supplier || p.supplierName || p.suppliername || 'Supplier',
        supplierId: p.supplierId || supObj?.id || null,
        supplierPhone: supObj?.phone || '',
        supplierCity: supObj?.city || '',
        supplierBalance: Number(supObj?.balance || 0),
        productName,
        qty,
        unit: itemUnit,
        rate,
        date: p.date || 'N/A',
        created_at: p.created_at,
        amountNum: rawAmt,
        amount: rawAmt,
        paidAmount: paidAmt,
        dueAmount: remainingDue,
        returnAmount: retAmt,
        paymentMode: p.paymentMode || (isPaid ? 'Cash' : paidAmt > 0 ? 'Partial Cash' : 'Supplier Credit (Khata)'),
        status: status,
        itemsCount: itemsList.length || 1,
        cart: itemsList.length > 0 ? itemsList.map(it => ({
          name: it.name || it.productName || 'Commodity Item',
          qty: Number(it.qty || it.enteredQty || 1),
          unit: it.unit || it.unitName || it.enteredUnit || itemUnit,
          unitName: it.unitName || it.unit || it.enteredUnit || itemUnit,
          rate: Number(it.rate || it.price || it.ratePerEnteredUnit || 0),
          price: Number(it.price || it.rate || it.ratePerEnteredUnit || 0),
          total: Number(it.total || it.totalAmount || 0)
        })) : null,
        type: 'Purchase'
      };
    });
  }, [purchases, suppliers, t]);

  const activeInvoicesList = isPurchases ? purchaseInvoices : salesInvoices;

  // Filtered Invoices based on the exact 5-filter system
  const filteredInvoices = useMemo(() => {
    return activeInvoicesList.filter(item => {
      // 1. Text Search
      const q = search.toLowerCase().trim();
      if (q) {
        const invMatch = item.invoiceNo.toLowerCase().includes(q);
        const partyMatch = item.partyName.toLowerCase().includes(q);
        const noteMatch = (item.note || '').toLowerCase().includes(q);
        if (!invMatch && !partyMatch && !noteMatch) return false;
      }

      // 2. Date Filter
      if (!matchDateFilter(item)) return false;

      // 3. Customer Type Filter (Sales only)
      if (!isPurchases) {
        const isWalkin = (item.customerType || '').toLowerCase().includes('walk-in') || 
                         (item.partyName || '').toLowerCase().includes('walk-in');
        if (customerTypeFilter === 'Regular Party' && isWalkin) return false;
        if (customerTypeFilter === 'Walk-in Customer' && !isWalkin) return false;
      }

      // 4. Specific Party Filter (Supplier or Customer)
      if (selectedCustomerId !== 'All') {
        const idMatch = (item.customerId === selectedCustomerId) || (item.supplierId === selectedCustomerId);
        const nameMatch = item.partyName.toLowerCase() === selectedCustomerId.toLowerCase();
        if (!idMatch && !nameMatch) return false;
      }

      // 5. Product Filter
      if (selectedProductFilter !== 'All') {
        let hasProduct = false;
        if (item.productName && item.productName.toLowerCase() === selectedProductFilter.toLowerCase()) hasProduct = true;
        if (typeof item.items === 'string' && item.items.toLowerCase().includes(selectedProductFilter.toLowerCase())) hasProduct = true;
        if (Array.isArray(item.cart)) {
          hasProduct = item.cart.some(it => 
            (it.name || it.productName || '').toLowerCase() === selectedProductFilter.toLowerCase() ||
            it.productId === selectedProductFilter
          );
        }
        if (!hasProduct) return false;
      }

      // 6. Payment Status Filter
      if (statusFilter === 'Paid' && item.status !== 'Paid') return false;
      if (statusFilter === 'Partial' && item.status !== 'Partial') return false;
      if (statusFilter === 'Pending' && item.status !== 'Pending') return false;

      return true;
    });
  }, [activeInvoicesList, isPurchases, search, dateFilterType, customStartDate, customEndDate, customerTypeFilter, selectedCustomerId, selectedProductFilter, statusFilter]);

  // Aggregate Metrics based on Filtered Invoices
  const totalInvoicedVolume = filteredInvoices.reduce((acc, i) => acc + i.amountNum, 0);
  const totalPaidAmount = filteredInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const totalPendingDue = filteredInvoices.reduce((acc, i) => acc + i.dueAmount, 0);

  // Check if any filter is active
  const isAnyFilterActive = (
    search !== '' || 
    dateFilterType !== 'All' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    customerTypeFilter !== 'All' || 
    selectedCustomerId !== 'All' || 
    statusFilter !== 'All'
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

  const openReceiptModal = (inv) => {
    if (inv.type === 'Sale') {
      setSelectedSaleReceipt({
        orderId: inv.invoiceNo,
        date: inv.date,
        customerName: inv.partyName,
        customerPhone: inv.customerPhone,
        customerCity: inv.customerCity,
        items: inv.cart && inv.cart.length > 0 ? inv.cart.map(item => ({
          name: item.name,
          qty: item.qty,
          unit: item.unitName || item.unit || t('kg'),
          price: Number(item.rate || item.price || 0)
        })) : [{
          name: inv.items || t('products'),
          qty: inv.itemsCount || 1,
          unit: t('item'),
          price: Number(inv.amount || 0)
        }],
        subtotal: Number(inv.amount || 0),
        discount: 0,
        tax: 0,
        grandTotal: Number(inv.amount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        paymentMethod: inv.paymentMode || 'Cash',
        saleNote: inv.note || 'Official Sales Tax Invoice'
      });
    } else {
      const purchaseReceiptItems = inv.cart && Array.isArray(inv.cart) && inv.cart.length > 0 ? inv.cart.map(item => ({
        name: item.name || item.productName || inv.productName || t('products'),
        qty: Number(item.qty || item.enteredQty || 1),
        unit: item.unit || item.unitName || item.enteredUnit || inv.unit || t('kg'),
        price: Number(item.rate || item.price || item.ratePerEnteredUnit || inv.rate || 0),
        total: Number(item.total || item.totalAmount || (Number(item.rate || inv.rate || 0) * Number(item.qty || 1)) || inv.amount || 0)
      })) : [{
        name: inv.productName || t('products'),
        qty: inv.qty || 1,
        unit: inv.unit || t('kg'),
        price: Number(inv.rate || inv.amount || 0),
        total: Number(inv.amount || 0)
      }];

      setSelectedPurchaseReceipt({
        purchaseNo: inv.invoiceNo,
        date: inv.date,
        supplierName: inv.partyName,
        supplierPhone: inv.supplierPhone,
        supplierCity: inv.supplierCity,
        items: purchaseReceiptItems,
        totalAmount: Number(inv.amount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        paymentMode: inv.paymentMode || 'Supplier Credit (Khata)',
        supplierBalance: inv.supplierBalance,
        note: 'Official Purchase Goods Inward Voucher'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            {isPurchases ? (
              <ShoppingCart className="w-6 h-6 text-brand-500" />
            ) : (
              <FileText className="w-6 h-6 text-brand-500" />
            )}
            <span>{isPurchases ? (t('purchaseInvoices') || 'Purchase Invoices') : (t('saleInvoices') || 'Sales Invoices')}</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {isPurchases ? 'Document records of inward supplier goods procurement vouchers' : 'Official sales tax invoice records and printable customer memos'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-4 h-4" /> 
          <span>{t('Print List') || 'Print List'}</span>
        </button>
      </div>

      {/* KPI Cards Row (Real-time Filter-Aware) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Invoiced Volume */}
        <div
          onClick={() => { setStatusFilter('All'); setReturnFilter('All'); }}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark'
              ? isPurchases ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-slate-800 border-emerald-500/30 text-white'
              : isPurchases ? 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200/60' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
          }`}
          title="Click to view all invoices"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            {isPurchases ? <ShoppingCart className="w-4 h-4 text-blue-600" /> : <ShoppingBag className="w-4 h-4 text-emerald-600" />}
            <span>{isPurchases ? t('totalPurchasesVolume') || 'Total Purchases Volume' : t('totalSalesVolume') || 'Total Invoiced Volume'}</span>
          </div>
          <div className={`text-2xl font-black mt-1.5 font-mono ${isPurchases ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Rs. {totalInvoicedVolume.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            {filteredInvoices.length} {t('invoices')} • {isAnyFilterActive ? 'Filtered Results' : 'All-time Volume'}
          </div>
        </div>

        {/* 2. Paid Amount */}
        <div
          onClick={() => setStatusFilter('Paid')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
          }`}
          title="Click to filter fully paid invoices"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>{isPurchases ? (t('totalPaidOut') || 'Total Paid to Suppliers') : (t('totalReceivedPayment') || 'Total Cash Received')}</span>
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-emerald-600 dark:text-emerald-400">
            Rs. {totalPaidAmount.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">
            {t('paid')} • Filter Paid Invoices
          </div>
        </div>

        {/* 3. Pending Khata / Due */}
        <div
          onClick={() => setStatusFilter('Pending')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200/60'
          }`}
          title="Click to filter pending due invoices"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{t('pending') || 'Pending Balance'}</span>
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-amber-600 dark:text-amber-400">
            Rs. {totalPendingDue.toLocaleString()}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
        Filter Unpaid Invoices
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5-FILTER TOOLBAR: [Search] [Supplier/Customer] [Product] [Date] [Status] */}
      {/* ========================================================================= */}
      <div className={`border rounded-3xl p-4 sm:p-5 card-shadow space-y-3.5 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Search */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-brand-500" />
              <span>Search</span>
            </label>
            <input
              type="text"
              placeholder={isPurchases ? "Search purchase #, supplier..." : "Search invoice #, customer..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          {/* 2. Select Party (Supplier or Customer) */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>{isPurchases ? 'Supplier' : 'Customer'}</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
              <span>Product</span>
            </label>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Date Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
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

          {/* 5. Payment Status */}
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
        </div>

        {/* Row 2: Custom Date Pickers (if Custom is chosen) + Reset */}
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
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-bold hidden sm:block">
              {isPurchases ? 'Official procurement vouchers and supplier billing history' : 'Complete sales invoices and tax billing register'}
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

      {/* ========================================================================= */}
      {/* INVOICES TABLE (CLEAN, FOCUSED: VIEW & PRINT ACTIONS ONLY) */}
      {/* ========================================================================= */}
      <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3.5 px-4">{isPurchases ? 'Purchase #' : 'Invoice #'}</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Buyer / Party</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${
              theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
            }`}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    {t('noInvoicesFound') || 'No invoices found matching your selected date and filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const paid = Number(inv.paidAmount || 0);
                  const total = Number(inv.amount || 0);
                  const due = Number(inv.dueAmount || 0);
                  const isWalkin = (inv.customerType || '').toLowerCase().includes('walk-in') || 
                                   (inv.partyName || '').toLowerCase().includes('walk-in');

                  return (
                    <tr 
                      key={inv.id} 
                      className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* 1. Invoice # */}
                      <td className="py-3.5 px-4 font-mono font-black text-brand-500 text-xs">
                        {inv.invoiceNo}
                      </td>

                      {/* 2. Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs font-mono font-medium">
                        {inv.date}
                      </td>

                      {/* 3. Buyer / Party */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{inv.partyName}</span>
                          {!isPurchases && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isWalkin 
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' 
                                : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                            }`}>
                              {isWalkin ? 'Walk-in' : 'Regular Party'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Amount (Total / Paid / Due) */}
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

                      {/* 5. Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap border ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : inv.status === 'Partial'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}>
                          {inv.status === 'Paid' ? t('paid') : inv.status === 'Partial' ? t('partial') : t('pending')}
                        </span>
                      </td>

                      {/* 6. Actions: View | Print / Download */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Button */}
                          <button
                            onClick={() => openReceiptModal(inv)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-2xs border ${
                              theme === 'dark' 
                                ? 'bg-slate-700 hover:bg-slate-600 text-brand-400 border-slate-600' 
                                : 'bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200'
                            }`}
                            title="View Invoice Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Print / Download Button */}
                          <button
                            onClick={() => openReceiptModal(inv)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-2xs border ${
                              theme === 'dark' 
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                            title="Print / Download Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
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
