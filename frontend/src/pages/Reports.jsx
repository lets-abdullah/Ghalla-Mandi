import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp, Warehouse, DollarSign, PieChart, Building,
  FileSpreadsheet, Printer, Plus, Wheat, X, Trash2, Search, Filter,
  CheckCircle2, AlertTriangle, ArrowUpDown, Package, Eye
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Reports = () => {
  const { sales, purchases, products, customers, suppliers } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();

  // Active Report Type from URL parameter (default: Stock)
  const reportType = searchParams.get('type') || 'Stock';

  // Interactive filters for stock & sales
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All'); // 'All' | 'LowStock' | 'InStock' | 'OutOfStock'
  const [sortBy, setSortBy] = useState('valueDesc'); // 'valueDesc' | 'qtyDesc' | 'nameAsc'

  // Live expenses persisted in local storage per user/shop session
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('ghalla_mandi_operating_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ghalla_mandi_operating_expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to persist expenses:', e);
    }
  }, [expenses]);

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'Labour & Loading (Palla)',
    desc: '',
    mode: 'Cash',
    amount: ''
  });

  // Handle Adding Expense
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.amount || Number(newExpense.amount) <= 0) return;

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-GB'),
      ref: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      category: newExpense.category,
      desc: newExpense.desc || `${newExpense.category} expense`,
      mode: newExpense.mode,
      amount: Number(newExpense.amount)
    };

    setExpenses(prev => [entry, ...prev]);
    setShowAddExpenseModal(false);
    setNewExpense({ category: 'Labour & Loading (Palla)', desc: '', mode: 'Cash', amount: '' });
  };

  const handleDeleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // =========================================================================
  // 1. DYNAMIC STOCK CALCULATIONS & FILTERING
  // =========================================================================
  const allCategories = useMemo(() => {
    const set = new Set((products || []).map(p => p.category || 'General'));
    return ['All', ...Array.from(set)];
  }, [products]);

  const processedStock = useMemo(() => {
    return (products || []).map(p => {
      const qty = Number(p.stockQty || 0);
      const purchaseRate = Number(p.purchasePrice || 0);
      const sellingRate = Number(p.sellingPrice || 0);
      const minStock = Number(p.minStock || 10);
      const unit = (p.unit || p.baseUnit || 'KG').trim();
      const unitLower = unit.toLowerCase();

      // Check unit classification
      const isLiquidOrPackaged = ['litre', 'liter', 'ltr', 'bottle', 'packet', 'pcs', 'piece', 'can', 'tin', 'box', 'carton'].some(u => unitLower.includes(u));
      const isBori = ['bori', 'bag', 'bora'].some(u => unitLower.includes(u));
      const isMann = unitLower.includes('mann') || unitLower.includes('mon');
      const isKg = ['kg', 'kilogram'].some(u => unitLower.includes(u));

      let bagDetail = null;
      if (!isLiquidOrPackaged) {
        if (isBori) {
          bagDetail = `${qty} Bori`;
        } else if (isMann) {
          bagDetail = `~${Math.round((qty * 40) / 50)} Bags (50kg)`;
        } else if (isKg) {
          bagDetail = `~${Math.round(qty / 50)} Bags (50kg)`;
        }
      }

      // Status
      let status = 'In Stock';
      if (qty <= 0) status = 'Out of Stock';
      else if (qty <= minStock) status = 'Low Stock';

      // Value (Qty * Purchase Price, fallback Selling Price)
      const stockVal = Math.round(qty * (purchaseRate > 0 ? purchaseRate : sellingRate));

      return {
        ...p,
        qty,
        unit,
        bagDetail,
        isLiquidOrPackaged,
        purchaseRate,
        sellingRate,
        stockVal,
        minStock,
        status
      };
    });
  }, [products]);

  // Filtered and Sorted Stock
  const filteredStock = useMemo(() => {
    return processedStock.filter(item => {
      const matchSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
      const matchStatus = stockStatusFilter === 'All' ||
                          (stockStatusFilter === 'LowStock' && item.status === 'Low Stock') ||
                          (stockStatusFilter === 'InStock' && item.status === 'In Stock') ||
                          (stockStatusFilter === 'OutOfStock' && item.status === 'Out of Stock');
      return matchSearch && matchCat && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'valueDesc') return b.stockVal - a.stockVal;
      if (sortBy === 'qtyDesc') return b.qty - a.qty;
      if (sortBy === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
  }, [processedStock, searchTerm, categoryFilter, stockStatusFilter, sortBy]);

  const totalStockValuation = useMemo(() => processedStock.reduce((sum, p) => sum + p.stockVal, 0), [processedStock]);
  const inStockCount = useMemo(() => processedStock.filter(p => p.status === 'In Stock').length, [processedStock]);
  const lowStockCount = useMemo(() => processedStock.filter(p => p.status === 'Low Stock').length, [processedStock]);
  const outOfStockCount = useMemo(() => processedStock.filter(p => p.status === 'Out of Stock').length, [processedStock]);

  // =========================================================================
  // 2. SALES CALCULATIONS
  // =========================================================================
  const salesList = useMemo(() => {
    return (sales || []).map(s => {
      const grossAmt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));
      const paidAmt = Number(s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Paid' ? grossAmt : 0));
      const isCash = s.paymentMode?.toLowerCase().includes('cash') || paidAmt >= grossAmt;
      return { ...s, grossAmt, paidAmt, dueAmt: Math.max(0, grossAmt - paidAmt), isCash };
    });
  }, [sales]);

  const totalSalesGross = useMemo(() => salesList.reduce((sum, s) => sum + s.grossAmt, 0), [salesList]);
  const totalSalesCash = useMemo(() => salesList.filter(s => s.isCash).reduce((sum, s) => sum + s.paidAmt, 0), [salesList]);
  const totalSalesCredit = useMemo(() => salesList.reduce((sum, s) => sum + s.dueAmt, 0), [salesList]);

  // Commodity sales aggregation
  const productWiseSales = useMemo(() => {
    const map = {};
    salesList.forEach(s => {
      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : []);
      cart.forEach(item => {
        const name = item.name || item.productName || 'Commodity Item';
        const qty = Number(item.qty || item.enteredQty || 1);
        const unit = item.unit || item.unitName || item.baseUnit || 'KG';
        const total = Number(item.total || item.totalAmount || (qty * (item.price || item.rate || 0)));

        if (!map[name]) {
          map[name] = { name, totalQty: 0, unit, totalRevenue: 0, orderCount: 0 };
        }
        map[name].totalQty += qty;
        map[name].totalRevenue += total;
        map[name].orderCount += 1;
      });
    });
    return Object.values(map);
  }, [salesList]);

  // =========================================================================
  // 3. PURCHASES & EXPENSES CALCULATIONS
  // =========================================================================
  const purchasesList = useMemo(() => {
    return (purchases || []).map(p => {
      const grossAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const paidAmt = Number(p.paidAmount !== undefined ? p.paidAmount : (p.status === 'Paid' ? grossAmt : 0));
      return { ...p, grossAmt, paidAmt, dueAmt: Math.max(0, grossAmt - paidAmt) };
    });
  }, [purchases]);

  const totalPurchasesGross = useMemo(() => purchasesList.reduce((sum, p) => sum + p.grossAmt, 0), [purchasesList]);
  const totalPurchasesPaid = useMemo(() => purchasesList.reduce((sum, p) => sum + p.paidAmt, 0), [purchasesList]);

  const totalExpensesAmount = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses]);

  const topExpenseCategory = useMemo(() => {
    if (expenses.length === 0) return 'No Expenses Logged';
    const counts = {};
    expenses.forEach(e => {
      counts[e.category] = (counts[e.category] || 0) + Number(e.amount || 0);
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'None';
  }, [expenses]);

  // =========================================================================
  // 4. FINANCIAL STATEMENTS (P&L and Balance Sheet)
  // =========================================================================
  const cogs = useMemo(() => Math.max(0, totalPurchasesGross), [totalPurchasesGross]);
  const grossOperatingProfit = useMemo(() => Math.max(0, totalSalesGross - cogs), [totalSalesGross, cogs]);
  const netOperatingProfit = useMemo(() => grossOperatingProfit - totalExpensesAmount, [grossOperatingProfit, totalExpensesAmount]);

  const totalCustomerReceivables = useMemo(() => {
    return (customers || []).reduce((sum, c) => sum + Math.max(0, Number(c.balance !== undefined ? c.balance : c.openingBalance || 0)), 0);
  }, [customers]);

  const totalSupplierPayables = useMemo(() => {
    return (suppliers || []).reduce((sum, s) => sum + Math.max(0, Number(s.balance !== undefined ? s.balance : s.openingBalance || 0)), 0);
  }, [suppliers]);

  const cashInHand = useMemo(() => {
    const netCash = totalSalesCash - totalPurchasesPaid - totalExpensesAmount;
    return Math.max(0, netCash);
  }, [totalSalesCash, totalPurchasesPaid, totalExpensesAmount]);

  const totalAssets = useMemo(() => cashInHand + totalCustomerReceivables + totalStockValuation, [cashInHand, totalCustomerReceivables, totalStockValuation]);
  const totalLiabilities = useMemo(() => totalSupplierPayables, [totalSupplierPayables]);
  const totalEquity = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // =========================================================================
  // EXPORT CSV HANDLER (100% Unit Accurate)
  // =========================================================================
  const exportReportCSV = () => {
    let csvData = `Report Type: ${reportType}\nGenerated At: ${new Date().toLocaleString()}\n\n`;

    if (reportType === 'Stock') {
      csvData += `Product Name,Category,Available Stock,Unit,Bag Detail,Purchase Rate,Selling Rate,Stock Valuation,Status\n`;
      filteredStock.forEach(p => {
        csvData += `"${p.name}","${p.category}",${p.qty},"${p.unit}","${p.bagDetail || 'N/A'}",${p.purchaseRate},${p.sellingRate},${p.stockVal},"${p.status}"\n`;
      });
    } else if (reportType === 'Sales') {
      csvData += `Commodity Name,Total Quantity Sold,Unit,Invoices Count,Total Revenue (Rs.)\n`;
      productWiseSales.forEach(s => {
        csvData += `"${s.name}",${s.totalQty},"${s.unit}",${s.orderCount},${s.totalRevenue}\n`;
      });
    } else if (reportType === 'Expenses') {
      csvData += `Date,Voucher Ref,Category,Description,Payment Mode,Amount (Rs.)\n`;
      expenses.forEach(e => {
        csvData += `"${e.date}","${e.ref}","${e.category}","${e.desc}","${e.mode}",${e.amount}\n`;
      });
    } else {
      csvData += `Metric,Amount (Rs.)\nGross Revenue,${totalSalesGross}\nCOGS Purchases,${cogs}\nGross Profit,${grossOperatingProfit}\nTotal Expenses,${totalExpensesAmount}\nNet Profit,${netOperatingProfit}\n`;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ghalla_Mandi_${reportType}_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. HEADER & ACTIONS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            {reportType === 'Stock' && <Warehouse className="w-6 h-6 text-amber-500" />}
            {reportType === 'Sales' && <TrendingUp className="w-6 h-6 text-emerald-500" />}
            {reportType === 'Expenses' && <DollarSign className="w-6 h-6 text-rose-500" />}
            {reportType === 'ProfitLoss' && <PieChart className="w-6 h-6 text-brand-500" />}
            {reportType === 'BalanceSheet' && <Building className="w-6 h-6 text-indigo-500" />}
            <span>
              {reportType === 'Stock' && 'Stock & Inventory Report'}
              {reportType === 'Sales' && 'Sales & Revenue Report'}
              {reportType === 'Expenses' && 'Operating Expenses Report'}
              {reportType === 'ProfitLoss' && 'Profit & Loss Statement'}
              {reportType === 'BalanceSheet' && 'Balance Sheet Statement'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {reportType === 'Stock' && 'Live stock inventory quantities, unit measurements, and godown valuations'}
            {reportType === 'Sales' && 'Gross revenue turnover, cash counter collections, and customer khata breakdown'}
            {reportType === 'Expenses' && 'Operating overheads, labour, transport, and Mandi expenses'}
            {reportType === 'ProfitLoss' && 'Financial performance summary: Revenue minus Cost of Goods and Expenses'}
            {reportType === 'BalanceSheet' && 'Financial position: Total Godown Assets vs. Supplier Liabilities'}
          </p>
        </div>

        {/* Print & CSV Export Buttons */}
        <div className="flex items-center gap-2.5">
          {reportType === 'Expenses' && (
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={exportReportCSV}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REPORT VIEW CONTENT */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* 1. STOCK REPORT (VIBRANT & RICH COLORS) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Stock' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stock Valuation</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalStockValuation.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{processedStock.length} Total Registered Products</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">In-Stock Products</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">{inStockCount} Items</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">Available for Sale</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-amber-500/30' : 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Low Stock Warnings</div>
              <div className="text-2xl font-black mt-1.5 text-amber-600 dark:text-amber-400 font-mono">{lowStockCount} Items</div>
              <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-1">Below Minimum Threshold</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Out of Stock</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">{outOfStockCount} Items</div>
              <div className="text-xs text-rose-700 dark:text-rose-400 font-bold mt-1">0 Quantity Remaining</div>
            </div>
          </div>

          {/* Interactive Filters Bar for Stock Report */}
          <div className={`p-4 rounded-2xl border card-shadow flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search product, category, code..."
                  className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border outline-none focus:border-slate-800 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="All">All Statuses</option>
                <option value="InStock">In Stock ({inStockCount})</option>
                <option value="LowStock">Low Stock ({lowStockCount})</option>
                <option value="OutOfStock">Out of Stock ({outOfStockCount})</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="valueDesc">Highest Stock Value</option>
                <option value="qtyDesc">Highest Quantity</option>
                <option value="nameAsc">Product Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Universal Clean Stock Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-600" />
                <span>Stock Statement ({filteredStock.length} Products Displayed)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-3 text-center">Available Stock</th>
                    <th className="py-3 px-3 text-center">Bag Breakdown</th>
                    <th className="py-3 px-3 text-right">Purchase Rate</th>
                    <th className="py-3 px-3 text-right">Selling Rate</th>
                    <th className="py-3 px-3 text-right">Stock Valuation</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                        No products match your active search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((item) => (
                      <tr key={item.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{item.name}</span>
                          </div>
                          {item.code && <span className="text-[10px] text-slate-400 font-mono block">{item.code}</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {item.qty.toLocaleString()} <span className="text-[11px] font-medium text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300 font-medium">
                          {item.bagDetail ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px]">
                              {item.bagDetail}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          Rs. {item.purchaseRate.toLocaleString()} / {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          Rs. {item.sellingRate.toLocaleString()} / {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          Rs. {item.stockVal.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            item.status === 'In Stock'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Low Stock'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 2. SALES & REVENUE REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Sales Volume</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">{salesList.length} Total Invoices</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash Counter Collections</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalSalesCash.toLocaleString()}</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">Direct Cash Payments</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-amber-500/30' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Credit (Khata) Receivables</div>
              <div className="text-2xl font-black mt-1.5 text-amber-600 dark:text-amber-400 font-mono">Rs. {totalSalesCredit.toLocaleString()}</div>
              <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-1">Customer Ledger Due</div>
            </div>
          </div>

          {/* Commodity-wise Sales Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span>Commodity-Wise Sales Turnover</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Commodity Name</th>
                    <th className="py-3 px-3 text-center">Total Quantity Sold</th>
                    <th className="py-3 px-3 text-center">Invoices Count</th>
                    <th className="py-3 px-3 text-right">Total Revenue (Rs.)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {productWiseSales.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No sales recorded yet.</td></tr>
                  ) : (
                    productWiseSales.map((item, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{item.name}</td>
                        <td className="py-3.5 px-3 text-center font-bold">{item.totalQty} {item.unit}</td>
                        <td className="py-3.5 px-3 text-center text-slate-500">{item.orderCount} Orders</td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">Rs. {item.totalRevenue.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 3. OPERATING EXPENSES REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Operating Expenses</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">Rs. {totalExpensesAmount.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">{expenses.length} Expense Records</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-purple-500/30' : 'bg-gradient-to-b from-purple-50/50 to-white border-purple-200/80'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Cost Category</div>
              <div className="text-2xl font-black mt-1.5 text-purple-600 dark:text-purple-400 truncate">{topExpenseCategory}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Based on Logged Vouchers</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-blue-500/30' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Logged Entries</div>
              <div className="text-2xl font-black mt-1.5 text-blue-600 dark:text-blue-400 font-mono">{expenses.length} Entries</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Direct Expense Records</div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-rose-500" />
                <span>Operating Expenses Log</span>
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Expense</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Voucher #</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Payment Mode</th>
                    <th className="py-3 px-3 text-right">Amount (Rs.)</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {expenses.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400">No expenses recorded yet. Click "Record Expense" to add your first entry.</td></tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 text-slate-500">{exp.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{exp.ref}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{exp.desc}</td>
                        <td className="py-3 px-3 font-medium">{exp.mode}</td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          Rs. {Number(exp.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 4. PROFIT & LOSS STATEMENT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'ProfitLoss' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Gross Revenue</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Total Sales Turnover</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Cost of Goods Sold (COGS)</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">Rs. {cogs.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Procurement Costs</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Net Operating Profit</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">
                Rs. {netOperatingProfit.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">Take-Home Profit Margin</div>
            </div>
          </div>

          {/* Income Statement Table */}
          <div className={`border rounded-2xl p-6 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Profit & Loss Financial Statement</span>
            </h3>

            <div className="space-y-3.5 text-xs font-bold">
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block text-sm">1. Gross Sales Revenue</span>
                  <span className="text-[11px] text-slate-500 font-medium">Total sales value billed from commodity orders</span>
                </div>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">Rs. {totalSalesGross.toLocaleString()}</span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-slate-900/60 border border-rose-200/60 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block text-sm">2. Less: Cost of Goods Sold (Purchases Cost)</span>
                  <span className="text-[11px] text-slate-500 font-medium">Procurement expenses paid or payable to suppliers</span>
                </div>
                <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">- Rs. {cogs.toLocaleString()}</span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-slate-900/60 border border-rose-200/60 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block text-sm">3. Less: Operating Expenses</span>
                  <span className="text-[11px] text-slate-500 font-medium">Labour loading, transport, bardana bags, and shop utilities</span>
                </div>
                <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">- Rs. {totalExpensesAmount.toLocaleString()}</span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 flex items-center justify-between font-bold text-base text-slate-900 dark:text-white shadow-2xs">
                <div>
                  <span className="block text-lg text-emerald-800 dark:text-emerald-300">Net Operating Profit</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Net profit after all procurement and operational expenses</span>
                </div>
                <span className="text-2xl font-mono text-emerald-700 dark:text-emerald-300 font-black">Rs. {netOperatingProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. BALANCE SHEET */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'BalanceSheet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Total Assets</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalAssets.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Cash, Godown Stock & Receivables</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Total Liabilities</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">Rs. {totalLiabilities.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Supplier Payables Balance</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow card-hover transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-slate-50/50 to-white border-slate-200'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Net Business Worth</div>
              <div className="text-2xl font-black mt-1.5 text-slate-900 dark:text-white font-mono">Rs. {totalEquity.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Total Assets Less Liabilities</div>
            </div>
          </div>

          {/* Two Column Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS COLUMN */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-600" />
                <span>Business Assets</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Cash in Hand & Counter Drawer:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {cashInHand.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Customer Khata Receivables:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {totalCustomerReceivables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Warehouse Inventory Stock Value:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {totalStockValuation.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                  <span>TOTAL ASSETS:</span>
                  <span className="font-mono">Rs. {totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* LIABILITIES & EQUITY COLUMN */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-600" />
                <span>Liabilities & Owner's Equity</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Supplier Payables (Market Creditors):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {totalSupplierPayables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Net Retained Equity & Profit:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {totalEquity.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                  <span>TOTAL LIABILITIES & EQUITY:</span>
                  <span className="font-mono">Rs. {(totalLiabilities + totalEquity).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RECORD OPERATING EXPENSE MODAL */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddExpenseModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <DollarSign className="w-5 h-5 text-slate-700" />
                <span>Record Operating Expense</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Expense Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Labour & Loading (Palla)">Labour & Loading (Palla / Mazdoori)</option>
                  <option value="Bardana / Bags">Bardana / Bags Procurement</option>
                  <option value="Freight & Transport">Freight & Truck Transport (Bilty)</option>
                  <option value="Electricity & Fuel">Electricity & Generator Diesel</option>
                  <option value="Tea & Refreshments">Tea & Customer Hospitality</option>
                  <option value="Shop Rent">Shop & Godown Rent</option>
                  <option value="General Misc">General Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Amount (Rs.)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  value={newExpense.desc}
                  onChange={(e) => setNewExpense({ ...newExpense, desc: e.target.value })}
                  placeholder="e.g. Loading and unloading mazdoori..."
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={newExpense.mode}
                  onChange={(e) => setNewExpense({ ...newExpense, mode: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Cash">Cash (Counter Drawer)</option>
                  <option value="Bank Transfer">Bank Transfer / Online</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className={`w-1/2 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
