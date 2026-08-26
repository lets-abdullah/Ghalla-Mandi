import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp, Warehouse, DollarSign, PieChart, Building,
  FileSpreadsheet, Printer, Plus, Wheat, X
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

  // Local state for interactive expenses
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenses, setExpenses] = useState([
    { id: 1, date: '26/08/2026', ref: 'EXP-101', category: 'Labour & Loading (Palla)', desc: 'Grain loading and unloading mazdoori', mode: 'Cash', amount: 4500 },
    { id: 2, date: '25/08/2026', ref: 'EXP-102', category: 'Bardana / Bags', desc: '50 Jute bori procurement', mode: 'Cash', amount: 7500 },
    { id: 3, date: '24/08/2026', ref: 'EXP-103', category: 'Freight & Transport', desc: 'Truck freight charges to godown', mode: 'Cash', amount: 12000 },
    { id: 4, date: '22/08/2026', ref: 'EXP-104', category: 'Electricity & Fuel', desc: 'Shop generator diesel refuel', mode: 'Cash', amount: 3200 },
    { id: 5, date: '20/08/2026', ref: 'EXP-105', category: 'Tea & Refreshments', desc: 'Customer hospitality and tea', mode: 'Cash', amount: 1800 }
  ]);

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

    setExpenses([entry, ...expenses]);
    setShowAddExpenseModal(false);
    setNewExpense({ category: 'Labour & Loading (Palla)', desc: '', mode: 'Cash', amount: '' });
  };

  // =========================================================================
  // CORE CALCULATIONS
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
  const totalSalesCash = useMemo(() => salesList.filter(s => s.isCash).reduce((sum, s) => sum + s.grossAmt, 0), [salesList]);
  const totalSalesCredit = useMemo(() => totalSalesGross - totalSalesCash, [totalSalesGross, totalSalesCash]);

  // Product-wise sales
  const productWiseSales = useMemo(() => {
    const map = {};
    salesList.forEach(s => {
      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : []);
      cart.forEach(item => {
        const name = item.name || item.productName || 'Commodity Item';
        const qty = Number(item.qty || item.enteredQty || 1);
        const unit = item.unit || item.unitName || 'KG';
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
  const totalPurchasesGross = useMemo(() => {
    return (purchases || []).reduce((sum, p) => {
      const amt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      return sum + amt;
    }, 0);
  }, [purchases]);

  // 3. Stock & Mandi Specific Metrics
  const stockInventory = useMemo(() => {
    return (products || []).map(p => {
      const qty = Number(p.stockQty || 0);
      const rate = Number(p.purchasePrice || p.sellingPrice || 0);
      const isBoriUnit = p.unit?.toLowerCase().includes('bori') || p.unit?.toLowerCase().includes('bag');
      const bags = isBoriUnit ? qty : Math.round(qty / 50);
      const grossWt = Math.round(qty * 1.012);
      const deductionKatt = Math.round(grossWt - qty);
      const stockVal = Math.round(qty * rate);

      return {
        ...p,
        qty,
        bags: Math.max(0, bags),
        grossWt,
        deductionKatt,
        netWt: qty,
        rate,
        stockVal
      };
    });
  }, [products]);

  const totalStockValuation = useMemo(() => stockInventory.reduce((sum, p) => sum + p.stockVal, 0), [stockInventory]);
  const totalStockBags = useMemo(() => stockInventory.reduce((sum, p) => sum + p.bags, 0), [stockInventory]);
  const totalStockWeightKg = useMemo(() => stockInventory.reduce((sum, p) => sum + p.qty, 0), [stockInventory]);
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

  // 6. P&L and Balance Sheet
  const cogs = useMemo(() => Math.max(0, totalPurchasesGross), [totalPurchasesGross]);
  const grossOperatingProfit = useMemo(() => Math.max(0, totalSalesGross - cogs), [totalSalesGross, cogs]);
  const netOperatingProfit = useMemo(() => grossOperatingProfit - totalExpensesAmount, [grossOperatingProfit, totalExpensesAmount]);

  const cashInHand = useMemo(() => Math.max(0, 150000 + totalSalesCash - (totalPurchasesGross + totalExpensesAmount)), [totalSalesCash, totalPurchasesGross, totalExpensesAmount]);
  const totalAssets = useMemo(() => cashInHand + totalCustomerReceivables + totalStockValuation + 250000, [cashInHand, totalCustomerReceivables, totalStockValuation]);
  const totalLiabilities = useMemo(() => totalSupplierPayables, [totalSupplierPayables]);
  const totalEquity = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Export CSV
  const exportReportCSV = () => {
    let csvData = `Report Type: ${reportType}\nGenerated At: ${new Date().toLocaleString()}\n\n`;

    if (reportType === 'Stock') {
      csvData += `Product,Category,Bags,Gross Wt (KG),Katt Deduction (KG),Net Wt (KG),Avg Rate,Stock Value\n`;
      stockInventory.forEach(p => {
        csvData += `"${p.name}","${p.category}",${p.bags},${p.grossWt},${p.deductionKatt},${p.netWt},${p.rate},${p.stockVal}\n`;
      });
    } else if (reportType === 'Sales') {
      csvData += `Metric,Value\nGross Sales Volume,${totalSalesGross}\nCash Sales,${totalSalesCash}\nCredit (Khata) Sales,${totalSalesCredit}\n`;
    } else if (reportType === 'Expenses') {
      csvData += `Date,Ref,Category,Description,Mode,Amount\n`;
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
      {/* 1. HEADER & ACTIONS (Pure English, No Top Filter Pills Bar) */}
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
              {reportType === 'Stock' && 'Stock & Grain Inventory Report'}
              {reportType === 'Sales' && 'Sales & Revenue Report'}
              {reportType === 'Expenses' && 'Operating Expenses Report'}
              {reportType === 'ProfitLoss' && 'Profit & Loss Statement'}
              {reportType === 'BalanceSheet' && 'Balance Sheet Statement'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {reportType === 'Stock' && 'Warehouse commodity stock, total bags, deduction katt, and net valuation breakdown'}
            {reportType === 'Sales' && 'Gross revenue turnover, cash collections, khata credit sales, and top-selling commodities'}
            {reportType === 'Expenses' && 'Labour, loading mazdoori, bardana bags, freight transport, and utility expense log'}
            {reportType === 'ProfitLoss' && 'Revenue turnover minus purchases cost of goods and operating expenses'}
            {reportType === 'BalanceSheet' && 'Cash in hand, customer receivables, and godown stock versus supplier payables'}
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
      {/* 1. STOCK REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Stock' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Stock Value</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalStockValuation.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">{stockInventory.length} Registered Items</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Available Bags</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">{totalStockBags.toLocaleString()} Bags</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Bori in Warehouse</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Net Weight</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">{totalStockWeightKg.toLocaleString()} KG</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">{Math.round(totalStockWeightKg / 40)} Mann (40 KG/Mann)</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Low Stock Alerts</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">{lowStockCount} Items</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">Reorder Needed</div>
            </div>
          </div>

          {/* Grain Weight Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-500" />
              <span>Commodity Stock Breakdown (Bags, Gross Weight, Deduction Katt & Net Valuation)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Product / Commodity</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-3 text-center font-black text-brand-500">Bags</th>
                    <th className="py-3 px-3 text-center">Gross Wt.</th>
                    <th className="py-3 px-3 text-center text-amber-500">Deduction (Katt)</th>
                    <th className="py-3 px-3 text-center font-black text-emerald-500">Net Wt.</th>
                    <th className="py-3 px-3 text-right">Avg Rate</th>
                    <th className="py-3 px-3 text-right font-black">Stock Value</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {stockInventory.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-400">No commodities registered in stock.</td></tr>
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
                          {item.bags} Bags
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                          {item.grossWt} KG
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                          - {item.deductionKatt} KG
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {item.netWt} {item.unit || 'KG'}
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
              <div className="text-xs font-bold text-slate-400">Cash Counter Sales</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalSalesCash.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Direct Counter Cash</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Credit (Khata) Sales</div>
              <div className="text-2xl font-black mt-1 text-amber-500 font-mono">Rs. {totalSalesCredit.toLocaleString()}</div>
              <div className="text-xs text-amber-500 font-bold mt-1.5">Booked into Party Khata</div>
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
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">Labour & Freight</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Primary Operational Cost</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Payment Channel</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">100% Counter Cash</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Direct Cash Settlement</div>
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
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {expenses.map((exp) => (
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
                    </tr>
                  ))}
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
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {netOperatingProfit.toLocaleString()}</div>
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
                  <span className="text-slate-900 dark:text-white font-black block text-sm">3. Less: Operating & Mandi Expenses</span>
                  <span className="text-[11px] text-slate-400 font-medium">Labour loading, bardana bags, freight, fuel, and shop utilities</span>
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
                <span>Business Assets (Current & Fixed)</span>
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
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Fixed Assets (Mandi Setup & Scales):</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. 250,000</span>
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
                  <span className="text-slate-500">Owner Initial Capital:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {Math.max(0, totalEquity - netOperatingProfit).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Retained Earnings & Current Profit:</span>
                  <span className="font-mono font-black text-emerald-500">Rs. {netOperatingProfit.toLocaleString()}</span>
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
                  placeholder="e.g. 50 bags unloading labour..."
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
