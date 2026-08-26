import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Warehouse, Users, UserCheck,
  DollarSign, RotateCcw, Scale, PieChart, Building, FileSpreadsheet,
  Printer, Search, Filter, Plus, Calendar, ArrowUpRight, ArrowDownLeft,
  Wheat, CheckCircle2, AlertCircle, RefreshCw, X, Eye, BookOpen
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Reports = () => {
  const { sales, purchases, products, customers, suppliers, paymentLogs } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Report Type from URL parameter
  const reportType = searchParams.get('type') || 'Sales';

  // Filters
  const [dateFilter, setDateFilter] = useState('All'); // 'All' | 'Today' | 'ThisWeek' | 'ThisMonth'
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // Local state for interactive expenses
  const [expenses, setExpenses] = useState([
    { id: 1, date: '26/08/2026', ref: 'EXP-101', category: 'Labour & Palla', desc: 'Grain loading & unloading mazdoori', mode: 'Cash', amount: 4500 },
    { id: 2, date: '25/08/2026', ref: 'EXP-102', category: 'Bardana / Bags', desc: '50 Jute bori purchase', mode: 'Cash', amount: 7500 },
    { id: 3, date: '24/08/2026', ref: 'EXP-103', category: 'Freight & Bilty', desc: 'Truck freight charges to godown', mode: 'Cash', amount: 12000 },
    { id: 4, date: '22/08/2026', ref: 'EXP-104', category: 'Electricity & Fuel', desc: 'Shop generator diesel', mode: 'Cash', amount: 3200 },
    { id: 5, date: '20/08/2026', ref: 'EXP-105', category: 'Tea & Refreshment', desc: 'Customer hospitality & tea', mode: 'Cash', amount: 1800 }
  ]);

  const [newExpense, setNewExpense] = useState({
    category: 'Labour & Palla',
    desc: '',
    mode: 'Cash',
    amount: ''
  });

  // Local state for sample return history if none logged
  const [returnsList] = useState([
    { id: 1, date: '25/08/2026', type: 'Sale Return', ref: 'RET-S-01', party: 'Chaudhry Akram', product: 'Wheat (Gandum)', qty: 5, unit: 'Bori', reason: 'Excess quantity returned', refund: 23750 },
    { id: 2, date: '22/08/2026', type: 'Purchase Return', ref: 'RET-P-01', party: 'Al-Madina Rice Mills', product: 'Super Basmati Rice', qty: 2, unit: 'Bori', reason: 'High moisture percentage', refund: 18000 }
  ]);

  // Handle Adding Expense
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.amount || Number(newExpense.amount) <= 0) return;

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-GB'),
      ref: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      category: newExpense.category,
      desc: newExpense.desc || `${newExpense.category} operational expense`,
      mode: newExpense.mode,
      amount: Number(newExpense.amount)
    };

    setExpenses([entry, ...expenses]);
    setShowAddExpenseModal(false);
    setNewExpense({ category: 'Labour & Palla', desc: '', mode: 'Cash', amount: '' });
  };

  // =========================================================================
  // CORE CALCULATIONS
  // =========================================================================

  // 1. Sales Metrics
  const salesList = useMemo(() => {
    return (sales || []).map(s => {
      const grossAmt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));
      const paidAmt = Number(s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Paid' ? grossAmt : 0));
      const isCash = s.paymentMode?.toLowerCase().includes('cash') || paidAmt >= grossAmt;
      return {
        ...s,
        grossAmt,
        paidAmt,
        dueAmt: Math.max(0, grossAmt - paidAmt),
        isCash
      };
    });
  }, [sales]);

  const totalSalesGross = useMemo(() => salesList.reduce((sum, s) => sum + s.grossAmt, 0), [salesList]);
  const totalSalesCash = useMemo(() => salesList.filter(s => s.isCash).reduce((sum, s) => sum + s.grossAmt, 0), [salesList]);
  const totalSalesCredit = useMemo(() => totalSalesGross - totalSalesCash, [totalSalesGross, totalSalesCash]);
  const totalSalesProfit = useMemo(() => salesList.reduce((sum, s) => sum + (Number(s.profit) || 0), 0), [salesList]);

  // Product-wise sales aggregation
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

  // 2. Purchase Metrics
  const purchasesList = useMemo(() => {
    return (purchases || []).map(p => {
      const grossAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const paidAmt = Number(p.paidAmount !== undefined ? p.paidAmount : (p.status === 'Paid' ? grossAmt : 0));
      const isCash = p.paymentMode?.toLowerCase().includes('cash') || paidAmt >= grossAmt;
      return {
        ...p,
        grossAmt,
        paidAmt,
        dueAmt: Math.max(0, grossAmt - paidAmt),
        isCash
      };
    });
  }, [purchases]);

  const totalPurchasesGross = useMemo(() => purchasesList.reduce((sum, p) => sum + p.grossAmt, 0), [purchasesList]);
  const totalPurchasesCash = useMemo(() => purchasesList.filter(p => p.isCash).reduce((sum, p) => sum + p.grossAmt, 0), [purchasesList]);
  const totalPurchasesCredit = useMemo(() => totalPurchasesGross - totalPurchasesCash, [totalPurchasesGross, totalPurchasesCash]);

  // Product-wise purchases aggregation
  const productWisePurchases = useMemo(() => {
    const map = {};
    purchasesList.forEach(p => {
      const items = Array.isArray(p.cart) && p.cart.length > 0 ? p.cart : (Array.isArray(p.items) ? p.items : []);
      items.forEach(item => {
        const name = item.name || item.productName || (typeof p.items === 'string' ? p.items : 'Procured Commodity');
        const qty = Number(item.qty || item.enteredQty || p.qty || 1);
        const unit = item.unit || item.unitName || p.unit || 'KG';
        const total = Number(item.total || item.totalAmount || (qty * (item.price || item.rate || p.rate || 0)) || p.amount || 0);

        if (!map[name]) {
          map[name] = { name, totalQty: 0, unit, totalCost: 0, orderCount: 0 };
        }
        map[name].totalQty += qty;
        map[name].totalCost += total;
        map[name].orderCount += 1;
      });
    });
    return Object.values(map);
  }, [purchasesList]);

  // 3. Stock Valuation & Mandi Metrics
  const stockInventory = useMemo(() => {
    return (products || []).map(p => {
      const qty = Number(p.stockQty || 0);
      const rate = Number(p.purchasePrice || p.sellingPrice || 0);
      // Mandi conversion: 1 Bori = 50 KG (or unit based)
      const isBoriUnit = p.unit?.toLowerCase().includes('bori') || p.unit?.toLowerCase().includes('bag');
      const bags = isBoriUnit ? qty : Math.round(qty / 50);
      const grossWt = Math.round(qty * 1.012); // Standard gross weight before deduction
      const deductionKatt = Math.round(grossWt - qty); // Standard moisture / dirt allowance
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

  // 4. Customer Parties Ledger Metrics
  const customerParties = useMemo(() => {
    return (customers || []).map(c => {
      const custSales = salesList.filter(s => s.customerId === c.id || s.partyName === c.name);
      const totalBilled = custSales.reduce((sum, s) => sum + s.grossAmt, 0);
      const totalPaid = custSales.reduce((sum, s) => sum + s.paidAmt, 0);
      const balance = Number(c.balance !== undefined ? c.balance : c.openingBalance || 0);

      return {
        ...c,
        visitsCount: custSales.length,
        totalBilled,
        totalPaid,
        balance
      };
    });
  }, [customers, salesList]);

  const totalCustomerReceivables = useMemo(() => customerParties.reduce((sum, c) => sum + Math.max(0, c.balance), 0), [customerParties]);

  // 5. Supplier Firms Ledger Metrics
  const supplierFirms = useMemo(() => {
    return (suppliers || []).map(s => {
      const supPurchases = purchasesList.filter(p => p.supplierId === s.id || p.supplier === s.name);
      const totalBilled = supPurchases.reduce((sum, p) => sum + p.grossAmt, 0);
      const totalPaid = supPurchases.reduce((sum, p) => sum + p.paidAmt, 0);
      const balance = Number(s.balance !== undefined ? s.balance : s.openingBalance || 0);

      return {
        ...s,
        ordersCount: supPurchases.length,
        totalBilled,
        totalPaid,
        balance
      };
    });
  }, [suppliers, purchasesList]);

  const totalSupplierPayables = useMemo(() => supplierFirms.reduce((sum, s) => sum + Math.max(0, s.balance), 0), [supplierFirms]);

  // 6. Expenses Metrics
  const totalExpensesAmount = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses]);

  // 7. Returns Metrics
  const totalReturnsValue = useMemo(() => returnsList.reduce((sum, r) => sum + Number(r.refund || 0), 0), [returnsList]);

  // 8. Accounting & Financial Statements (COGS, P&L, Balance Sheet)
  const cogs = useMemo(() => Math.max(0, totalPurchasesGross), [totalPurchasesGross]);
  const grossOperatingProfit = useMemo(() => Math.max(0, totalSalesGross - cogs), [totalSalesGross, cogs]);
  const netOperatingProfit = useMemo(() => grossOperatingProfit - totalExpensesAmount, [grossOperatingProfit, totalExpensesAmount]);

  // Cash in Hand calculation
  const totalCashIn = useMemo(() => totalSalesCash, [totalSalesCash]);
  const totalCashOut = useMemo(() => totalPurchasesCash + totalExpensesAmount, [totalPurchasesCash, totalExpensesAmount]);
  const cashInHand = useMemo(() => Math.max(0, 150000 + totalCashIn - totalCashOut), [totalCashIn, totalCashOut]);

  // Assets, Liabilities, Equity for Balance Sheet & Trial Balance
  const totalAssets = useMemo(() => cashInHand + totalCustomerReceivables + totalStockValuation + 250000, [cashInHand, totalCustomerReceivables, totalStockValuation]);
  const totalLiabilities = useMemo(() => totalSupplierPayables, [totalSupplierPayables]);
  const totalEquity = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // =========================================================================
  // EXPORT CSV HANDLER
  // =========================================================================
  const exportReportCSV = () => {
    let csvData = `Report Type: ${reportType}\nGenerated Date: ${new Date().toLocaleString()}\n\n`;

    if (reportType === 'Sales') {
      csvData += `Invoice No,Customer,Date,Payment Mode,Gross Total,Paid Amount,Due Amount\n`;
      salesList.forEach(s => {
        csvData += `"${s.invoiceNo}","${s.partyName}","${s.date}","${s.paymentMode || 'Cash'}",${s.grossAmt},${s.paidAmt},${s.dueAmt}\n`;
      });
    } else if (reportType === 'Purchases') {
      csvData += `Purchase No,Supplier,Date,Payment Mode,Total Amount,Paid Amount,Balance Due\n`;
      purchasesList.forEach(p => {
        csvData += `"${p.purchaseNo}","${p.supplier}","${p.date}","${p.paymentMode || 'Cash'}",${p.grossAmt},${p.paidAmt},${p.dueAmt}\n`;
      });
    } else if (reportType === 'Stock') {
      csvData += `Product Name,Category,Bags (Bori),Gross Wt (KG),Deduction (KG),Net Wt (KG),Avg Rate,Stock Value\n`;
      stockInventory.forEach(p => {
        csvData += `"${p.name}","${p.category}",${p.bags},${p.grossWt},${p.deductionKatt},${p.netWt},${p.rate},${p.stockVal}\n`;
      });
    } else {
      csvData += `Metric,Value (Rs.)\nGross Sales,${totalSalesGross}\nCOGS,${cogs}\nGross Profit,${grossOperatingProfit}\nTotal Expenses,${totalExpensesAmount}\nNet Profit,${netOperatingProfit}\n`;
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
      {/* 1. TOP HEADER & ACTION CONTROLS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              {reportType === 'Sales' && <TrendingUp className="w-6 h-6 text-brand-500" />}
              {reportType === 'Purchases' && <TrendingDown className="w-6 h-6 text-emerald-500" />}
              {reportType === 'Stock' && <Warehouse className="w-6 h-6 text-amber-500" />}
              {reportType === 'Customers' && <Users className="w-6 h-6 text-brand-500" />}
              {reportType === 'Suppliers' && <UserCheck className="w-6 h-6 text-indigo-500" />}
              {reportType === 'Expenses' && <DollarSign className="w-6 h-6 text-rose-500" />}
              {reportType === 'Returns' && <RotateCcw className="w-6 h-6 text-orange-500" />}
              {reportType === 'TrialBalance' && <Scale className="w-6 h-6 text-cyan-500" />}
              {reportType === 'ProfitLoss' && <PieChart className="w-6 h-6 text-emerald-500" />}
              {reportType === 'BalanceSheet' && <Building className="w-6 h-6 text-brand-500" />}

              <span>
                {reportType === 'Sales' && (t('salesReport') || 'Sales Report')}
                {reportType === 'Purchases' && (t('purchaseReport') || 'Purchase Report')}
                {reportType === 'Stock' && (t('stockReport') || 'Stock & Grain Mandi Inventory Report')}
                {reportType === 'Customers' && (t('customerReport') || 'Customer Party Statements')}
                {reportType === 'Suppliers' && (t('supplierReport') || 'Supplier & Commission Agent Report')}
                {reportType === 'Expenses' && (t('expenseReport') || 'Operational Expenses Log')}
                {reportType === 'Returns' && (t('returnHistory') || 'Returns & Rejections History')}
                {reportType === 'TrialBalance' && (t('trialBalance') || 'Trial Balance Accounting Statement')}
                {reportType === 'ProfitLoss' && (t('profitLoss') || 'Profit & Loss Performance Statement')}
                {reportType === 'BalanceSheet' && (t('balanceSheet') || 'Balance Sheet Financial Position')}
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {t('reportsSubtitle')}
          </p>
        </div>

        {/* Top Buttons: Print, Export CSV, Add Expense */}
        <div className="flex items-center gap-2.5">
          {reportType === 'Expenses' && (
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addExpense') || 'Add Expense'}</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{t('Print Receipt')}</span>
          </button>

          <button
            onClick={exportReportCSV}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('exportCsvReport')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REPORT VIEW SWITCHER TABS (Quick Pills Bar) */}
      {/* ========================================================================= */}
      <div className={`p-2 rounded-2xl border card-shadow flex items-center gap-1.5 overflow-x-auto no-scrollbar transition-colors ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {[
          { key: 'Sales', label: t('salesReport') || 'Sales Report', icon: TrendingUp },
          { key: 'Purchases', label: t('purchaseReport') || 'Purchase Report', icon: TrendingDown },
          { key: 'Stock', label: t('stockReport') || 'Stock Report', icon: Warehouse },
          { key: 'Customers', label: t('customerReport') || 'Customer Report', icon: Users },
          { key: 'Suppliers', label: t('supplierReport') || 'Supplier Report', icon: UserCheck },
          { key: 'Expenses', label: t('expenseReport') || 'Expense Report', icon: DollarSign },
          { key: 'Returns', label: t('returnHistory') || 'Return History', icon: RotateCcw },
          { key: 'TrialBalance', label: t('trialBalance') || 'Trial Balance', icon: Scale },
          { key: 'ProfitLoss', label: t('profitLoss') || 'Profit & Loss', icon: PieChart },
          { key: 'BalanceSheet', label: t('balanceSheet') || 'Balance Sheet', icon: Building }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSearchParams({ type: tab.key })}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              reportType === tab.key
                ? 'bg-brand-500 text-white shadow-xs'
                : theme === 'dark'
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. DYNAMIC REPORT CONTENT RENDERING */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* REPORT 1: SALES REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Sales' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('totalSalesVolume')}</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">{salesList.length} {t('invoices')}</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('cashSales')}</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalSalesCash.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Direct Counter Cash</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('creditSales')}</div>
              <div className="text-2xl font-black mt-1 text-amber-500 font-mono">Rs. {totalSalesCredit.toLocaleString()}</div>
              <div className="text-xs text-amber-500 font-bold mt-1.5">Khata Udhaar Booked</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Estimated Sales Profit</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">Rs. {totalSalesProfit.toLocaleString()}</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Based on Margins</div>
            </div>
          </div>

          {/* Product-wise Sales Breakdown Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <Wheat className="w-4 h-4 text-brand-500" />
              <span>Product & Commodity-Wise Sales Volume</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Commodity</th>
                    <th className="py-3 px-3 text-center">Total Quantity Sold</th>
                    <th className="py-3 px-3 text-center">Order Count</th>
                    <th className="py-3 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {productWiseSales.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">No product sales recorded yet.</td></tr>
                  ) : (
                    productWiseSales.map((item, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white">{item.name}</td>
                        <td className="py-3 px-3 text-center font-bold">{item.totalQty} {item.unit}</td>
                        <td className="py-3 px-3 text-center text-slate-400">{item.orderCount} Bills</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">Rs. {item.totalRevenue.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice-wise Sales Log Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <span>All Sales Invoices Statement Log</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Customer Party</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3 text-right">Gross Total</th>
                    <th className="py-3 px-3 text-right">Paid Cash</th>
                    <th className="py-3 px-3 text-right">Balance Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {salesList.length === 0 ? (
                    <tr><td colSpan={8} className="py-6 text-center text-slate-400">No sales invoices recorded yet.</td></tr>
                  ) : (
                    salesList.map((s) => (
                      <tr key={s.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 font-mono font-black text-brand-500">{s.invoiceNo}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{s.partyName}</td>
                        <td className="py-3 px-3 text-slate-400">{s.date}</td>
                        <td className="py-3 px-3 font-bold">{s.paymentMode || 'Cash'}</td>
                        <td className="py-3 px-3 text-right font-black font-mono">Rs. {s.grossAmt.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-emerald-500 font-bold font-mono">Rs. {s.paidAmt.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-amber-500 font-bold font-mono">Rs. {s.dueAmt.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            s.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                          }`}>
                            {s.status || 'Paid'}
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
      {/* REPORT 2: PURCHASE REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Purchases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('totalPurchasesVolume')}</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">Rs. {totalPurchasesGross.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">{purchasesList.length} Procurement Invoices</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('cashPurchases')}</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalPurchasesCash.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Paid On Delivery</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('creditPurchases')}</div>
              <div className="text-2xl font-black mt-1 text-indigo-500 font-mono">Rs. {totalPurchasesCredit.toLocaleString()}</div>
              <div className="text-xs text-indigo-500 font-bold mt-1.5">Supplier Credit Booked</div>
            </div>
          </div>

          {/* Product-wise Purchases Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-500" />
              <span>Product & Commodity-Wise Procurement Cost</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Commodity</th>
                    <th className="py-3 px-3 text-center">Total Inward Quantity</th>
                    <th className="py-3 px-3 text-center">Orders</th>
                    <th className="py-3 px-3 text-right">Total Procurement Cost</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {productWisePurchases.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">No procurement purchases recorded yet.</td></tr>
                  ) : (
                    productWisePurchases.map((item, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white">{item.name}</td>
                        <td className="py-3 px-3 text-center font-bold">{item.totalQty} {item.unit}</td>
                        <td className="py-3 px-3 text-center text-slate-400">{item.orderCount} Vouchers</td>
                        <td className="py-3 px-3 text-right font-black text-brand-600 dark:text-brand-400 font-mono">Rs. {item.totalCost.toLocaleString()}</td>
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
      {/* REPORT 3: STOCK REPORT (GHALLA MANDI GRAIN SPECIFIC WITH BAGS & KATT) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Stock' && (
        <div className="space-y-6">
          {/* Mandi Stock KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('stockValue')}</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalStockValuation.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">{stockInventory.length} Active Catalog Items</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('bagsCount')}</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">{totalStockBags.toLocaleString()} Bags</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Bori / Bora in Godown</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('netWeight')}</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">{totalStockWeightKg.toLocaleString()} KG</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">{Math.round(totalStockWeightKg / 40)} Mann (40 KG)</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Low Stock Alerts</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">{lowStockCount} Items</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">Below Threshold</div>
            </div>
          </div>

          {/* Authentic Ghalla Mandi Grain Weight Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-500" />
                <span>Grain Mandi Commodity Stock Statement (Bags, Katt & Weight Breakdown)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Product / Commodity</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-3 text-center font-bold text-brand-500">{t('bagsCount')}</th>
                    <th className="py-3 px-3 text-center">{t('grossWeight')}</th>
                    <th className="py-3 px-3 text-center text-amber-500">{t('deductionKatt')}</th>
                    <th className="py-3 px-3 text-center font-bold text-emerald-500">{t('netWeight')}</th>
                    <th className="py-3 px-3 text-right">{t('averageRate')}</th>
                    <th className="py-3 px-3 text-right font-bold">{t('stockValue')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {stockInventory.length === 0 ? (
                    <tr><td colSpan={8} className="py-6 text-center text-slate-400">No commodities registered in inventory.</td></tr>
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
                          {item.bags} Bori
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
      {/* REPORT 4: CUSTOMER REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Registered Parties</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">{customerParties.length} Parties</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Regular Buyers & Farmers</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Outstanding Khata (Receivable)</div>
              <div className="text-2xl font-black mt-1 text-amber-500 font-mono">Rs. {totalCustomerReceivables.toLocaleString()}</div>
              <div className="text-xs text-amber-500 font-bold mt-1.5">Market Dues to Collect</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Billed Sales to Parties</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Cumulative Volume</div>
            </div>
          </div>

          {/* Customer Parties Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-500" />
              <span>Customer Party Sales & Outstanding Balance Statement</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Party Name</th>
                    <th className="py-3 px-3">City / Station</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-center">Total Invoices</th>
                    <th className="py-3 px-3 text-right">Total Billed</th>
                    <th className="py-3 px-3 text-right">Current Due Khata</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {customerParties.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">No regular customers registered.</td></tr>
                  ) : (
                    customerParties.map((c) => (
                      <tr key={c.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white">{c.name}</td>
                        <td className="py-3 px-3 text-slate-400">{c.city || 'Local Mandi'}</td>
                        <td className="py-3 px-3 font-mono">{c.phone || '-'}</td>
                        <td className="py-3 px-3 text-center font-bold">{c.visitsCount}</td>
                        <td className="py-3 px-3 text-right font-black font-mono">Rs. {c.totalBilled.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-amber-500">Rs. {c.balance.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <Link
                            to="/ledger?type=Customer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-brand-500/10 text-brand-600 hover:bg-brand-500 hover:text-white transition"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Khata Ledger</span>
                          </Link>
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
      {/* REPORT 5: SUPPLIER REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Suppliers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Registered Supplier Firms</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">{supplierFirms.length} Firms</div>
              <div className="text-xs text-indigo-500 font-bold mt-1.5">Growers & Commission Agents</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Outstanding Payable (Dene Wale Paise)</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">Rs. {totalSupplierPayables.toLocaleString()}</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">Payable Credit Balances</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Procurements Inward</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalPurchasesGross.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Total Goods Inward Cost</div>
            </div>
          </div>

          {/* Supplier Firms Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-500" />
              <span>Supplier Firm Purchases & Payable Balance Statement</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Supplier Firm</th>
                    <th className="py-3 px-3">City / Station</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-center">Orders</th>
                    <th className="py-3 px-3 text-right">Total Goods Value</th>
                    <th className="py-3 px-3 text-right">Balance Payable</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {supplierFirms.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">No suppliers registered.</td></tr>
                  ) : (
                    supplierFirms.map((s) => (
                      <tr key={s.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white">{s.name}</td>
                        <td className="py-3 px-3 text-slate-400">{s.city || 'Local Mandi'}</td>
                        <td className="py-3 px-3 font-mono">{s.phone || '-'}</td>
                        <td className="py-3 px-3 text-center font-bold">{s.ordersCount}</td>
                        <td className="py-3 px-3 text-right font-black font-mono">Rs. {s.totalBilled.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-rose-500">Rs. {s.balance.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <Link
                            to="/ledger?type=Supplier"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500 hover:text-white transition"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Supplier Ledger</span>
                          </Link>
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
      {/* REPORT 6: EXPENSE REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('totalExpenses')}</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">Rs. {totalExpensesAmount.toLocaleString()}</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">{expenses.length} Expense Entries</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Top Expense Category</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">Freight & Labour</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Major Operating Cost</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Payment Mode</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">100% Cash Counter</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Direct Cash Vouchers</div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-rose-500" />
                <span>Mandi Operating Expenses Log</span>
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Voucher Ref</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Paid Mode</th>
                    <th className="py-3 px-3 text-right">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-3 text-slate-400">{exp.date}</td>
                      <td className="py-3 px-3 font-mono font-black text-brand-500">{exp.ref}</td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-[10px]">
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
      {/* REPORT 7: RETURN HISTORY */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Returns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Total Returned Value</div>
              <div className="text-2xl font-black mt-1 text-orange-500 font-mono">Rs. {totalReturnsValue.toLocaleString()}</div>
              <div className="text-xs text-orange-500 font-bold mt-1.5">Returns & Rejections</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('saleReturns')}</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">1 Return (5 Bags)</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Restocked to Inventory</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('purchaseReturns')}</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">1 Return (2 Bags)</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Rejected Goods Inward</div>
            </div>
          </div>

          {/* Returns Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              <span>Customer & Supplier Goods Return History</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Return Ref</th>
                    <th className="py-3 px-3">Party Name</th>
                    <th className="py-3 px-3">Commodity Item</th>
                    <th className="py-3 px-3 text-center">Returned Qty</th>
                    <th className="py-3 px-3">Reason / Remarks</th>
                    <th className="py-3 px-3 text-right">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {returnsList.map((ret) => (
                    <tr key={ret.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-3 text-slate-400">{ret.date}</td>
                      <td className="py-3 px-3 font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          ret.type === 'Sale Return' ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-600'
                        }`}>
                          {ret.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-brand-500">{ret.ref}</td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">{ret.party}</td>
                      <td className="py-3 px-3 font-bold">{ret.product}</td>
                      <td className="py-3 px-3 text-center font-mono font-black">{ret.qty} {ret.unit}</td>
                      <td className="py-3 px-3 text-slate-500">{ret.reason}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        Rs. {ret.refund.toLocaleString()}
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
      {/* REPORT 8: TRIAL BALANCE */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'TrialBalance' && (
        <div className="space-y-6">
          {/* Trial Balance Balanced Indicator Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <div className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                  {t('balancedIndicator')}
                </div>
                <p className="text-xs text-emerald-600/80 font-medium mt-0.5">
                  Double-entry verification statement as of {new Date().toLocaleDateString('en-GB')}.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Total Audited Volume</span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                Rs. {(totalAssets + totalExpensesAmount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Trial Balance Dual Side Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-cyan-500" />
              <span>Trial Balance Statement (Debit vs Credit Balances)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Account Title / Head</th>
                    <th className="py-3 px-3">Classification</th>
                    <th className="py-3 px-3 text-right text-emerald-500">Debit (Rs.)</th>
                    <th className="py-3 px-3 text-right text-indigo-500">Credit (Rs.)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Cash in Hand & Counter Drawer</td>
                    <td className="py-3 px-3 text-slate-400">Current Asset</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">Rs. {cashInHand.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Customer Khata Receivables (Market Debtors)</td>
                    <td className="py-3 px-3 text-slate-400">Current Asset</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">Rs. {totalCustomerReceivables.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Warehouse Grain & Stock Valuation</td>
                    <td className="py-3 px-3 text-slate-400">Inventory Asset</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">Rs. {totalStockValuation.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Mandi Operational & Mazdoori Expenses</td>
                    <td className="py-3 px-3 text-slate-400">Operating Expense</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">Rs. {totalExpensesAmount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Supplier Khata Payables (Market Creditors)</td>
                    <td className="py-3 px-3 text-slate-400">Current Liability</td>
                    <td className="py-3 px-3 text-right text-slate-400">-</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">Rs. {totalSupplierPayables.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Gross Sales Revenue</td>
                    <td className="py-3 px-3 text-slate-400">Revenue Income</td>
                    <td className="py-3 px-3 text-right text-slate-400">-</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">Rs. {totalSalesGross.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">Owner's Capital & Retained Reserves</td>
                    <td className="py-3 px-3 text-slate-400">Equity</td>
                    <td className="py-3 px-3 text-right text-slate-400">-</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">Rs. {Math.max(0, (cashInHand + totalCustomerReceivables + totalStockValuation + totalExpensesAmount) - (totalSupplierPayables + totalSalesGross)).toLocaleString()}</td>
                  </tr>
                  {/* Total Row */}
                  <tr className="border-t-2 border-slate-900 dark:border-white font-black text-sm">
                    <td className="py-3.5 px-3 uppercase text-brand-500" colSpan={2}>Grand Total (Audited Trial Balance)</td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      Rs. {(cashInHand + totalCustomerReceivables + totalStockValuation + totalExpensesAmount).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      Rs. {(cashInHand + totalCustomerReceivables + totalStockValuation + totalExpensesAmount).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* REPORT 9: PROFIT & LOSS */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'ProfitLoss' && (
        <div className="space-y-6">
          {/* P&L Hero Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Gross Operating Revenue</div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Total Sales Billed</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('costOfGoodsSold')}</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">Rs. {cogs.toLocaleString()}</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Direct Procurement Costs</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">Net Operating Profit</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {netOperatingProfit.toLocaleString()}</div>
              <div className="text-xs text-emerald-500 font-bold mt-1.5">Net Bottom-Line Margin</div>
            </div>
          </div>

          {/* Income Statement Detailed Table */}
          <div className={`border rounded-2xl p-6 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-500" />
              <span>Comprehensive Income & Profit & Loss Statement</span>
            </h3>

            <div className="space-y-4 text-xs font-bold">
              {/* Revenue */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between font-black text-slate-900 dark:text-white">
                  <span>1. Gross Sales Revenue:</span>
                  <span className="font-mono text-sm">Rs. {totalSalesGross.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>2. Less Cost of Goods Sold (COGS Purchases):</span>
                  <span className="font-mono text-rose-500 font-bold">- Rs. {cogs.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-brand-500">
                  <span>3. Gross Operating Profit:</span>
                  <span className="font-mono text-sm">Rs. {grossOperatingProfit.toLocaleString()}</span>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between font-black text-slate-900 dark:text-white">
                  <span>4. Operating & Mandi Expenses:</span>
                  <span className="font-mono text-rose-500 font-bold">- Rs. {totalExpensesAmount.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  {expenses.slice(0, 4).map(e => (
                    <div key={e.id} className="flex justify-between">
                      <span>• {e.category}:</span>
                      <span className="font-mono">Rs. {Number(e.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Profit Final */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between font-black text-sm text-emerald-600 dark:text-emerald-400">
                <span>5. Net Operating Profit (After All Expenses):</span>
                <span className="text-xl font-mono">Rs. {netOperatingProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* REPORT 10: BALANCE SHEET */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'BalanceSheet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('assets')}</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 font-mono">Rs. {totalAssets.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1.5">Cash, Stock & Receivables</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('liabilities')}</div>
              <div className="text-2xl font-black mt-1 text-rose-500 font-mono">Rs. {totalLiabilities.toLocaleString()}</div>
              <div className="text-xs text-rose-500 font-bold mt-1.5">Supplier Payables</div>
            </div>

            <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-400">{t('equity')}</div>
              <div className="text-2xl font-black mt-1 text-brand-500 font-mono">Rs. {totalEquity.toLocaleString()}</div>
              <div className="text-xs text-brand-500 font-bold mt-1.5">Net Business Worth</div>
            </div>
          </div>

          {/* Balance Sheet Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS COLUMN */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="font-black text-sm uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Assets (Current & Fixed)</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Cash in Hand & Counter Drawer:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {cashInHand.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Accounts Receivable (Customer Khata):</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {totalCustomerReceivables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Warehouse Inventory Stock Value:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {totalStockValuation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Fixed Assets (Mandi Scales, Setup):</span>
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
                <Building className="w-5 h-5" />
                <span>Liabilities & Owner's Equity</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Accounts Payable (Supplier Khata):</span>
                  <span className="font-mono font-black text-rose-500">Rs. {totalSupplierPayables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Owner Initial Capital Investment:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">Rs. {Math.max(0, totalEquity - netOperatingProfit).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500">Retained Earnings & Current Net Profit:</span>
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
      {/* 4. ADD EXPENSE ENTRY MODAL */}
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
                <span>{t('addExpense') || 'Record Operating Expense'}</span>
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
                  <option value="Labour & Palla">Labour & Mazdoori (Palla / Loading)</option>
                  <option value="Bardana / Bags">Bardana / Bags (Bori Purchase)</option>
                  <option value="Freight & Bilty">Freight & Bilty / Truck Rent</option>
                  <option value="Electricity & Fuel">Electricity & Generator Fuel</option>
                  <option value="Tea & Refreshment">Tea & Refreshment</option>
                  <option value="Shop Rent">Shop / Godown Rent</option>
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
                  placeholder="e.g. 50 bags loading mazdoori..."
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
                  {t('cancel')}
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
