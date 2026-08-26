import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp, Warehouse, DollarSign, PieChart, Building,
  FileSpreadsheet, Printer, Plus, Wheat, X, Trash2
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
  // CORE CALCULATIONS (100% Dynamic - Zero Dummy Data)
  // =========================================================================

  // 1. Sales Calculations
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

  // Product-wise sales breakdown
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

  // 2. Purchases & COGS
  const purchasesList = useMemo(() => {
    return (purchases || []).map(p => {
      const grossAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const paidAmt = Number(p.paidAmount !== undefined ? p.paidAmount : (p.status === 'Paid' ? grossAmt : 0));
      return { ...p, grossAmt, paidAmt, dueAmt: Math.max(0, grossAmt - paidAmt) };
    });
  }, [purchases]);

  const totalPurchasesGross = useMemo(() => purchasesList.reduce((sum, p) => sum + p.grossAmt, 0), [purchasesList]);
  const totalPurchasesPaid = useMemo(() => purchasesList.reduce((sum, p) => sum + p.paidAmt, 0), [purchasesList]);

  // 3. Stock & Dynamic Unit-Aware Metrics (Handles Litre, KG, Bori, Gram, Mann, Packet, Bottle, etc.)
  const stockInventory = useMemo(() => {
    return (products || []).map(p => {
      const qty = Number(p.stockQty || 0);
      const rate = Number(p.purchasePrice || p.sellingPrice || 0);
      const unit = p.unit || p.baseUnit || 'KG';
      const unitLower = unit.toLowerCase().trim();

      // Check if unit is grain weight-based or liquid/packaged
      const isLiquidOrPackaged = ['litre', 'liter', 'ltr', 'bottle', 'packet', 'pcs', 'piece', 'can', 'tin', 'box'].some(u => unitLower.includes(u));
      const isBoriUnit = ['bori', 'bag', 'bora'].some(u => unitLower.includes(u));
      const isMannUnit = unitLower.includes('mann') || unitLower.includes('mon');
      const isKgUnit = ['kg', 'kilogram'].some(u => unitLower.includes(u));

      let bags = null;
      let deductionKatt = 0;
      let grossQty = qty;

      if (!isLiquidOrPackaged) {
        if (isBoriUnit) {
          bags = qty;
        } else if (isMannUnit) {
          // 1 Mann = 40 KG, 1 standard Bori = 50 KG
          bags = Math.round((qty * 40) / 50);
        } else if (isKgUnit) {
          bags = Math.round(qty / 50);
        }

        // Standard Mandi allowance calculation if applicable
        deductionKatt = Math.round(qty * 0.01); // 1% deduction
        grossQty = qty + deductionKatt;
      }

      const stockVal = Math.round(qty * rate);

      return {
        ...p,
        qty,
        unit,
        bags,
        grossQty,
        deductionKatt,
        netQty: qty,
        rate,
        stockVal
      };
    });
  }, [products]);

  const totalStockValuation = useMemo(() => stockInventory.reduce((sum, p) => sum + p.stockVal, 0), [stockInventory]);
  const totalStockBags = useMemo(() => stockInventory.reduce((sum, p) => sum + (p.bags || 0), 0), [stockInventory]);
  const lowStockCount = useMemo(() => stockInventory.filter(p => p.qty <= (p.minStock || 10)).length, [stockInventory]);

  // 4. Receivables & Payables
  const totalCustomerReceivables = useMemo(() => {
    return (customers || []).reduce((sum, c) => sum + Math.max(0, Number(c.balance !== undefined ? c.balance : c.openingBalance || 0)), 0);
  }, [customers]);

  const totalSupplierPayables = useMemo(() => {
    return (suppliers || []).reduce((sum, s) => sum + Math.max(0, Number(s.balance !== undefined ? s.balance : s.openingBalance || 0)), 0);
  }, [suppliers]);

  // 5. Expenses
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

  // 6. P&L and Balance Sheet (100% Dynamic)
  const cogs = useMemo(() => Math.max(0, totalPurchasesGross), [totalPurchasesGross]);
  const grossOperatingProfit = useMemo(() => Math.max(0, totalSalesGross - cogs), [totalSalesGross, cogs]);
  const netOperatingProfit = useMemo(() => grossOperatingProfit - totalExpensesAmount, [grossOperatingProfit, totalExpensesAmount]);

  // Live cash in counter drawer
  const cashInHand = useMemo(() => {
    const netCash = totalSalesCash - totalPurchasesPaid - totalExpensesAmount;
    return Math.max(0, netCash);
  }, [totalSalesCash, totalPurchasesPaid, totalExpensesAmount]);

  const totalAssets = useMemo(() => cashInHand + totalCustomerReceivables + totalStockValuation, [cashInHand, totalCustomerReceivables, totalStockValuation]);
  const totalLiabilities = useMemo(() => totalSupplierPayables, [totalSupplierPayables]);
  const totalEquity = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Export CSV
  const exportReportCSV = () => {
    let csvData = `Report Type: ${reportType}\nGenerated At: ${new Date().toLocaleString()}\n\n`;

    if (reportType === 'Stock') {
      csvData += `Product,Category,Bags,Gross Qty,Deduction,Net Qty,Unit,Avg Rate,Stock Value\n`;
      stockInventory.forEach(p => {
        csvData += `"${p.name}","${p.category}",${p.bags !== null ? p.bags : 'N/A'},${p.grossQty},${p.deductionKatt},${p.netQty},"${p.unit}",${p.rate},${p.stockVal}\n`;
      });
    } else if (reportType === 'Sales') {
      csvData += `Metric,Value\nGross Sales Volume,${totalSalesGross}\nCash Sales,${totalSalesCash}\nCredit (Khata) Sales,${totalSalesCredit}\n`;
    } else if (reportType === 'Expenses') {
      csvData += `Date,Ref,Category,Description,Payment Mode,Amount\n`;
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
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            {reportType === 'Stock' && <Warehouse className="w-6 h-6 text-amber-500" />}
            {reportType === 'Sales' && <TrendingUp className="w-6 h-6 text-brand-500" />}
            {reportType === 'Expenses' && <DollarSign className="w-6 h-6 text-rose-500" />}
            {reportType === 'ProfitLoss' && <PieChart className="w-6 h-6 text-emerald-500" />}
            {reportType === 'BalanceSheet' && <Building className="w-6 h-6 text-brand-500" />}

            <span>
              {reportType === 'Stock' && 'Stock & Inventory Report'}
              {reportType === 'Sales' && 'Sales & Revenue Report'}
              {reportType === 'Expenses' && 'Operating Expenses Report'}
              {reportType === 'ProfitLoss' && 'Profit & Loss Statement'}
              {reportType === 'BalanceSheet' && 'Balance Sheet Statement'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {reportType === 'Stock' && 'Current stock quantity, unit metrics, deduction allowance, and valuation breakdown'}
            {reportType === 'Sales' && 'Gross revenue turnover, cash collections, khata credit sales, and top-selling commodities'}
            {reportType === 'Expenses' && 'Labour loading, transport freight, bardana bags, and operational expense records'}
            {reportType === 'ProfitLoss' && 'Revenue turnover minus procurement costs and operating expenses'}
            {reportType === 'BalanceSheet' && 'Cash in hand, customer receivables, and stock valuation versus supplier payables'}
          </p>
        </div>

        {/* Print & CSV Export Buttons */}
        <div className="flex items-center gap-2.5">
          {reportType === 'Expenses' && (
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={exportReportCSV}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
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
      {/* 1. STOCK REPORT (DYNAMIC UNIT HANDLING) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Stock' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Stock Value</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalStockValuation.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">{stockInventory.length} Registered Products</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Available Bags (Grain)</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">{totalStockBags.toLocaleString()} Bags</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Calculated for Grains</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Active Inventory Items</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">{stockInventory.length} Items</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Across All Categories</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Low Stock Alerts</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">{lowStockCount} Items</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">Reorder Threshold Reached</div>
            </div>
          </div>

          {/* Unit-Aware Stock Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-500" />
              <span>Product Inventory Breakdown (Dynamic Units, Bags, Deduction & Stock Value)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Product / Commodity</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-3 text-center font-black text-brand-500">Bags</th>
                    <th className="py-3 px-3 text-center">Gross Qty</th>
                    <th className="py-3 px-3 text-center text-amber-500">Deduction (Katt)</th>
                    <th className="py-3 px-3 text-center font-black text-emerald-500">Net Quantity</th>
                    <th className="py-3 px-3 text-right">Avg Rate</th>
                    <th className="py-3 px-3 text-right font-black">Stock Value</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {stockInventory.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-400">No products registered in stock.</td></tr>
                  ) : (
                    stockInventory.map((item) => (
                      <tr key={item.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3.5 px-3 font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-500" />
                          <span>{item.name}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-black text-brand-500">
                          {item.bags !== null ? `${item.bags} Bags` : '-'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                          {item.grossQty} {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {item.deductionKatt > 0 ? `- ${item.deductionKatt} ${item.unit}` : `0 ${item.unit}`}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {item.netQty} {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold">
                          Rs. {item.rate.toLocaleString()} / {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          Rs. {item.stockVal.toLocaleString()}
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
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Gross Sales Volume</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">{salesList.length} Total Invoices</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Cash Counter Collections</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalSalesCash.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Direct Cash Payments</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Credit (Khata) Receivables</div>
              <div className="text-2xl font-black mt-1 text-amber-500 font-mono">Rs. {totalSalesCredit.toLocaleString()}</div>
              <div className="text-xs text-amber-500 font-bold mt-1.5">Customer Ledger Due</div>
            </div>
          </div>

          {/* Commodity-wise Sales Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              <span>Commodity-Wise Sales Turnover</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Commodity Name</th>
                    <th className="py-3 px-3 text-center">Total Quantity Sold</th>
                    <th className="py-3 px-3 text-center">Invoices Count</th>
                    <th className="py-3 px-3 text-right">Total Revenue (Rs.)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {productWiseSales.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">No sales recorded yet.</td></tr>
                  ) : (
                    productWiseSales.map((item, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3.5 px-3 font-black text-slate-900 dark:text-white">{item.name}</td>
                        <td className="py-3.5 px-3 text-center font-bold">{item.totalQty} {item.unit}</td>
                        <td className="py-3.5 px-3 text-center text-slate-400">{item.orderCount} Orders</td>
                        <td className="py-3.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">Rs. {item.totalRevenue.toLocaleString()}</td>
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
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Operating Expenses</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">Rs. {totalExpensesAmount.toLocaleString()}</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">{expenses.length} Expense Records</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Top Cost Category</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white truncate">{topExpenseCategory}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Based on Logged Vouchers</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Logged Entries</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">{expenses.length} Entries</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Direct Expense Records</div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-500" />
                <span>Operating Expenses Log</span>
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Expense</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
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
                        <td className="py-3 px-3 text-slate-400">{exp.date}</td>
                        <td className="py-3 px-3 font-mono font-black text-brand-500">{exp.ref}</td>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-[10px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{exp.desc}</td>
                        <td className="py-3 px-3 font-bold">{exp.mode}</td>
                        <td className="py-3 px-3 text-right font-black text-rose-500 font-mono">
                          Rs. {Number(exp.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">1. Gross Revenue</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Total Sales Turnover</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">2. Cost of Goods Sold (COGS)</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">Rs. {cogs.toLocaleString()}</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Procurement Costs</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">3. Net Operating Profit</div>
              <div className={`text-2xl font-black mt-1 font-mono ${netOperatingProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                Rs. {netOperatingProfit.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Take-Home Profit Margin</div>
            </div>
          </div>

          {/* Income Statement Table */}
          <div className={`border rounded-2xl p-6 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-500" />
              <span>Profit & Loss Financial Statement</span>
            </h3>

            <div className="space-y-3.5 text-xs font-bold">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-black block text-sm">1. Gross Sales Revenue</span>
                  <span className="text-[11px] text-slate-400 font-medium">Total sales value billed from commodity orders</span>
                </div>
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">Rs. {totalSalesGross.toLocaleString()}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-black block text-sm">2. Less: Cost of Goods Sold (Purchases Cost)</span>
                  <span className="text-[11px] text-slate-400 font-medium">Procurement expenses paid or payable to suppliers</span>
                </div>
                <span className="font-mono text-base font-black text-rose-500">- Rs. {cogs.toLocaleString()}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-black block text-sm">3. Less: Operating Expenses</span>
                  <span className="text-[11px] text-slate-400 font-medium">Labour loading, transport, bardana bags, and shop utilities</span>
                </div>
                <span className="font-mono text-base font-black text-rose-500">- Rs. {totalExpensesAmount.toLocaleString()}</span>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between font-black text-base text-emerald-600 dark:text-emerald-400">
                <div>
                  <span className="block text-lg">Net Operating Profit</span>
                  <span className="text-xs text-emerald-600/80 font-medium">Net profit after all procurement and operational expenses</span>
                </div>
                <span className="text-2xl font-mono">Rs. {netOperatingProfit.toLocaleString()}</span>
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
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">1. Total Assets</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalAssets.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Cash, Godown Stock & Receivables</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">2. Total Liabilities</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">Rs. {totalLiabilities.toLocaleString()}</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">Supplier Payables Balance</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">3. Net Business Worth</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">Rs. {totalEquity.toLocaleString()}</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Total Assets Less Liabilities</div>
            </div>
          </div>

          {/* Two Column Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS COLUMN */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="font-black text-sm uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Building className="w-5 h-5" />
                <span>Business Assets</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Cash in Hand & Counter Drawer:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {cashInHand.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Customer Khata Receivables:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {totalCustomerReceivables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Warehouse Inventory Stock Value:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {totalStockValuation.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-black text-sm text-emerald-600 dark:text-emerald-400">
                  <span>TOTAL ASSETS:</span>
                  <span className="font-mono">Rs. {totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* LIABILITIES & EQUITY COLUMN */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="font-black text-sm uppercase tracking-wide text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                <span>Liabilities & Owner's Equity</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Supplier Payables (Market Creditors):</span>
                  <span className="font-mono font-black text-rose-500">Rs. {totalSupplierPayables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Net Retained Equity & Profit:</span>
                  <span className="font-mono font-black text-emerald-500">Rs. {totalEquity.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-black text-sm text-indigo-600 dark:text-indigo-400">
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
              <h3 className="text-base font-black flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-500" />
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
                <label className="text-xs font-black text-slate-400 block mb-1">
                  Expense Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
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
                <label className="text-xs font-black text-slate-400 block mb-1">
                  Amount (Rs.)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 block mb-1">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  value={newExpense.desc}
                  onChange={(e) => setNewExpense({ ...newExpense, desc: e.target.value })}
                  placeholder="e.g. Loading and unloading mazdoori..."
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={newExpense.mode}
                  onChange={(e) => setNewExpense({ ...newExpense, mode: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
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
                  className="w-1/2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black shadow-md transition cursor-pointer"
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
