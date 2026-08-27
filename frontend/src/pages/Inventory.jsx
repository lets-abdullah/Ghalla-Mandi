import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Warehouse, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  X, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  Search, 
  Calendar, 
  Filter, 
  SlidersHorizontal,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Inventory = () => {
  const { 
    products = [], 
    stockMovements = [], 
    sales = [], 
    purchases = [], 
    saleReturns = [], 
    purchaseReturns = [], 
    adjustStock 
  } = useERP();
  
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // Filter States
  const [dateFilter, setDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [movementTypeFilter, setMovementTypeFilter] = useState('All'); // 'All' | 'IN' | 'OUT' | 'ADJUST' | 'RETURN'
  const [sourceFilter, setSourceFilter] = useState('All'); // 'All' | 'Sales' | 'Purchases' | 'Sale Returns' | 'Purchase Returns' | 'Stock Adjustments' | 'Manual Adjustments'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [selectedMovementDetail, setSelectedMovementDetail] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjustment Form State
  const [adjForm, setAdjForm] = useState({
    productId: products[0]?.id || '',
    qtyKg: 1,
    type: 'IN',
    reason: 'Manual Warehouse Count Audit'
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAdjModal(false);
        setSelectedMovementDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync selected product when products load
  useEffect(() => {
    if (products.length > 0 && !adjForm.productId) {
      setAdjForm(prev => ({ ...prev, productId: products[0].id }));
    }
  }, [products]);

  // Unified Chronological Bank-Statement Transactions
  const allTransactions = useMemo(() => {
    // 1. Process explicit stockMovements if available
    const parsedMovements = (stockMovements || []).map((m, idx) => {
      const rawDateStr = m.date || (m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
      
      // Parse ISO or DD/MM/YYYY date
      let parsedDate = new Date();
      if (m.created_at) {
        parsedDate = new Date(m.created_at);
      } else if (m.date && m.date.includes('/')) {
        const parts = m.date.split('/');
        if (parts.length === 3) {
          parsedDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }

      // Parse quantity number & unit
      let numQty = 0;
      let unit = 'KG';
      if (typeof m.qty === 'number') {
        numQty = Math.abs(m.qty);
      } else if (typeof m.qty === 'string') {
        const match = m.qty.match(/([0-9.]+)\s*([A-Za-z]+)?/);
        if (match) {
          numQty = parseFloat(match[1]) || 0;
          unit = match[2] || 'KG';
        }
      }

      // Determine movement type and category
      const typeUpper = (m.type || '').toUpperCase();
      const refUpper = (m.ref || '').toUpperCase();

      let isStockIn = false;
      let isAdjustment = false;
      let isReturn = false;
      let sourceCategory = 'Manual Adjustments';

      if (typeUpper.includes('IN') || typeUpper === 'STOCK IN') {
        isStockIn = true;
      } else if (typeUpper.includes('OUT') || typeUpper === 'STOCK OUT') {
        isStockIn = false;
      }

      if (refUpper.includes('SALE RETURN') || refUpper.includes('SR-') || refUpper.includes('CUSTOMER RETURN')) {
        sourceCategory = 'Sale Returns';
        isStockIn = true;
        isReturn = true;
      } else if (refUpper.includes('PURCHASE RETURN') || refUpper.includes('PR-') || refUpper.includes('DEBIT NOTE') || refUpper.includes('SUPPLIER RETURN')) {
        sourceCategory = 'Purchase Returns';
        isStockIn = false;
        isReturn = true;
      } else if (refUpper.includes('PURCHASE') || refUpper.includes('PUR-') || refUpper.includes('BILL')) {
        sourceCategory = 'Purchases';
        isStockIn = true;
      } else if (refUpper.includes('POS') || refUpper.includes('SALE') || refUpper.includes('INV-')) {
        sourceCategory = 'Sales';
        isStockIn = false;
      } else if (refUpper.includes('AUDIT') || refUpper.includes('ADJUST') || typeUpper === 'ADJUSTMENT') {
        sourceCategory = 'Stock Adjustments';
        isAdjustment = true;
      }

      return {
        id: m.id || `mov-${idx}`,
        dateStr: rawDateStr,
        dateObj: parsedDate,
        productName: m.product || 'General Commodity',
        direction: isAdjustment ? 'ADJUST' : isStockIn ? 'IN' : 'OUT',
        movementLabel: isAdjustment ? 'Adjustment' : isStockIn ? 'Stock In' : 'Stock Out',
        sourceCategory,
        referenceNo: m.ref || 'Manual Adjustment',
        qtyNum: numQty,
        unit: unit,
        signedQty: `${isStockIn ? '+' : '-'}${numQty} ${unit}`,
        raw: m
      };
    });

    // If movements exist, sort descending by date
    if (parsedMovements.length > 0) {
      return parsedMovements.sort((a, b) => b.dateObj - a.dateObj);
    }

    // Fallback: If stock_movements table is completely empty, construct dynamically from sales, purchases, and returns
    const dynamicList = [];

    (purchases || []).forEach(p => {
      const items = Array.isArray(p.items) && p.items.length > 0 ? p.items : (Array.isArray(p.cart) ? p.cart : [{ name: p.productName || 'Procured Commodity', qty: p.qty || 1, unit: p.unit || 'KG' }]);
      items.forEach((it, i) => {
        dynamicList.push({
          id: `pur-${p.id || p.purchaseNo}-${i}`,
          dateStr: p.date || new Date().toLocaleDateString('en-GB'),
          dateObj: p.created_at ? new Date(p.created_at) : new Date(),
          productName: it.name || p.productName || 'Commodity',
          direction: 'IN',
          movementLabel: 'Stock In',
          sourceCategory: 'Purchases',
          referenceNo: p.purchaseNo ? `Purchase #${p.purchaseNo}` : 'Purchase Bill',
          qtyNum: Number(it.qty || it.enteredQty || 1),
          unit: it.unit || it.unitName || p.unit || 'KG',
          signedQty: `+${Number(it.qty || it.enteredQty || 1)} ${it.unit || p.unit || 'KG'}`,
          raw: p
        });
      });
    });

    (sales || []).forEach(s => {
      const items = Array.isArray(s.items) && s.items.length > 0 ? s.items : (Array.isArray(s.cart) ? s.cart : [{ name: typeof s.items === 'string' ? s.items : (s.productName || 'Commodity'), qty: s.qty || 1, unit: s.unit || 'KG' }]);
      items.forEach((it, i) => {
        dynamicList.push({
          id: `sale-${s.id || s.invoiceNo}-${i}`,
          dateStr: s.date || new Date().toLocaleDateString('en-GB'),
          dateObj: s.created_at ? new Date(s.created_at) : new Date(),
          productName: it.name || 'Commodity Product',
          direction: 'OUT',
          movementLabel: 'Stock Out',
          sourceCategory: 'Sales',
          referenceNo: s.invoiceNo ? `Sale #${s.invoiceNo}` : 'POS Checkout',
          qtyNum: Number(it.qty || it.enteredQty || 1),
          unit: it.unit || it.unitName || s.unit || 'KG',
          signedQty: `-${Number(it.qty || it.enteredQty || 1)} ${it.unit || s.unit || 'KG'}`,
          raw: s
        });
      });
    });

    (saleReturns || []).forEach(r => {
      (r.items || [{ name: 'Returned Commodity', qty: r.qty || 1, unit: 'KG' }]).forEach((it, i) => {
        dynamicList.push({
          id: `sr-${r.id || r.returnNo}-${i}`,
          dateStr: r.date || new Date().toLocaleDateString('en-GB'),
          dateObj: r.created_at ? new Date(r.created_at) : new Date(),
          productName: it.name || 'Returned Commodity',
          direction: 'IN',
          movementLabel: 'Stock In',
          sourceCategory: 'Sale Returns',
          referenceNo: r.returnNo ? `Sale Return #${r.returnNo}` : 'Sale Return',
          qtyNum: Number(it.qty || 1),
          unit: it.unit || 'KG',
          signedQty: `+${Number(it.qty || 1)} ${it.unit || 'KG'}`,
          raw: r
        });
      });
    });

    (purchaseReturns || []).forEach(r => {
      (r.items || [{ name: 'Returned Commodity', qty: r.qty || 1, unit: 'KG' }]).forEach((it, i) => {
        dynamicList.push({
          id: `pr-${r.id || r.returnNo}-${i}`,
          dateStr: r.date || new Date().toLocaleDateString('en-GB'),
          dateObj: r.created_at ? new Date(r.created_at) : new Date(),
          productName: it.name || 'Returned Commodity',
          direction: 'OUT',
          movementLabel: 'Stock Out',
          sourceCategory: 'Purchase Returns',
          referenceNo: r.returnNo ? `Purchase Return #${r.returnNo}` : 'Debit Note',
          qtyNum: Number(it.qty || 1),
          unit: it.unit || 'KG',
          signedQty: `-${Number(it.qty || 1)} ${it.unit || 'KG'}`,
          raw: r
        });
      });
    });

    return dynamicList.sort((a, b) => b.dateObj - a.dateObj);
  }, [stockMovements, purchases, sales, saleReturns, purchaseReturns]);

  // Date Filtering Helper
  const matchesDate = (itemDate) => {
    if (dateFilter === 'All') return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const txDay = new Date(itemDate);
    txDay.setHours(0, 0, 0, 0);

    if (dateFilter === 'Today') {
      return txDay.getTime() === today.getTime();
    }

    if (dateFilter === 'Yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return txDay.getTime() === yesterday.getTime();
    }

    if (dateFilter === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return txDay >= startOfWeek && txDay <= new Date();
    }

    if (dateFilter === 'This Month') {
      return (
        txDay.getFullYear() === today.getFullYear() &&
        txDay.getMonth() === today.getMonth()
      );
    }

    if (dateFilter === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return txDay >= start && txDay <= end;
      } else if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return txDay >= start;
      } else if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return txDay <= end;
      }
      return true;
    }

    return true;
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(item => {
      // 1. Date Filter
      if (!matchesDate(item.dateObj)) return false;

      // 2. Product Filter
      if (selectedProduct !== 'All' && item.productName.toLowerCase() !== selectedProduct.toLowerCase()) {
        return false;
      }

      // 3. Movement Type Filter
      if (movementTypeFilter !== 'All') {
        if (movementTypeFilter === 'IN' && item.direction !== 'IN') return false;
        if (movementTypeFilter === 'OUT' && item.direction !== 'OUT') return false;
        if (movementTypeFilter === 'ADJUST' && item.direction !== 'ADJUST') return false;
        if (movementTypeFilter === 'RETURN' && !item.sourceCategory.includes('Return')) return false;
      }

      // 4. Reference / Source Filter
      if (sourceFilter !== 'All' && item.sourceCategory !== sourceFilter) {
        return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pMatch = (item.productName || '').toLowerCase().includes(q);
        const rMatch = (item.referenceNo || '').toLowerCase().includes(q);
        const sMatch = (item.sourceCategory || '').toLowerCase().includes(q);
        const dMatch = (item.dateStr || '').toLowerCase().includes(q);
        if (!pMatch && !rMatch && !sMatch && !dMatch) return false;
      }

      return true;
    });
  }, [allTransactions, dateFilter, customStartDate, customEndDate, selectedProduct, movementTypeFilter, sourceFilter, searchQuery]);

  // Overall KPI Metrics
  const totalStockQty = (products || []).reduce((acc, p) => acc + (Number(p.stockQty ?? p.stockqty) || 0), 0);
  const lowStockCount = (products || []).filter(p => {
    const stock = Number(p.stockQty !== undefined ? p.stockQty : (p.stockqty !== undefined ? p.stockqty : 0));
    const min = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : 10));
    return stock <= min;
  }).length;

  const totalInflow = useMemo(() => {
    return filteredTransactions
      .filter(t => t.direction === 'IN')
      .reduce((sum, t) => sum + (t.qtyNum || 0), 0);
  }, [filteredTransactions]);

  const totalOutflow = useMemo(() => {
    return filteredTransactions
      .filter(t => t.direction === 'OUT')
      .reduce((sum, t) => sum + (t.qtyNum || 0), 0);
  }, [filteredTransactions]);

  const hasActiveFilters = dateFilter !== 'All' || selectedProduct !== 'All' || movementTypeFilter !== 'All' || sourceFilter !== 'All' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setDateFilter('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedProduct('All');
    setMovementTypeFilter('All');
    setSourceFilter('All');
    setSearchQuery('');
  };

  // Handle Adjustment Submit
  const handleAdjSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const prod = products.find(p => p.id === (adjForm.productId || products[0]?.id));
    if (!prod) return;

    const qtyVal = Math.max(1, Math.floor(Number(adjForm.qtyKg) || 1));
    const currentStock = Number(prod.stockQty ?? prod.stockqty ?? 0);

    if (adjForm.type === 'OUT' && currentStock < qtyVal) {
      alert(`Cannot deduct ${qtyVal} ${prod.unit || 'KG'}. Current stock is only ${currentStock} ${prod.unit || 'KG'}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalQty = adjForm.type === 'IN' ? qtyVal : -qtyVal;
      await adjustStock(prod.id, finalQty, adjForm.type, adjForm.reason);
      setShowAdjModal(false);
      setAdjForm({
        productId: products[0]?.id || '',
        qtyKg: 1,
        type: 'IN',
        reason: 'Manual Warehouse Count Audit'
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-brand-500" />
            <span>Inventory Stock Statement</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Chronological bank-statement ledger of all commodity movements & warehouse records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjModal(true)}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Adjust Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 card-shadow ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
            <Warehouse className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">On-Hand Stock</div>
            <div className="text-base font-black font-mono text-brand-500">
              {totalStockQty.toLocaleString()} <span className="text-xs font-normal">Units</span>
            </div>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 card-shadow ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Stock In</div>
            <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
              +{totalInflow.toLocaleString()} <span className="text-xs font-normal">Units</span>
            </div>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 card-shadow ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Stock Out</div>
            <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
              -{totalOutflow.toLocaleString()} <span className="text-xs font-normal">Units</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/products')}
          className={`p-3.5 rounded-2xl border flex items-center gap-3 card-shadow cursor-pointer transition hover:border-amber-500/50 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
            lowStockCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Low Stock Alerts</div>
            <div className={`text-base font-black font-mono ${lowStockCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {lowStockCount} <span className="text-xs font-normal">Items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Single Clean Filter Bar */}
      <div className={`p-3.5 rounded-2xl border card-shadow space-y-3 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-center">
          
          {/* 1. Date Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
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

          {/* 2. Product Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Movement Type */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Movement Type
            </label>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Movements</option>
              <option value="IN">Stock In (+)</option>
              <option value="OUT">Stock Out (-)</option>
              <option value="ADJUST">Adjustments</option>
              <option value="RETURN">Returns</option>
            </select>
          </div>

          {/* 4. Reference / Source */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Reference / Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Sources</option>
              <option value="Sales">Sales</option>
              <option value="Purchases">Purchases</option>
              <option value="Sale Returns">Sale Returns</option>
              <option value="Purchase Returns">Purchase Returns</option>
              <option value="Stock Adjustments">Stock Adjustments</option>
              <option value="Manual Adjustments">Manual Adjustments</option>
            </select>
          </div>

          {/* 5. Search Bar */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Product, reference, note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Custom Date Pickers (Shown only when dateFilter is 'Custom') */}
        {dateFilter === 'Custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>
        )}

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-800 dark:text-white font-mono">{filteredTransactions.length}</span> of {allTransactions.length} movements
            </span>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Compact Bank-Statement Inventory Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
              }`}>
                <th className="py-2.5 px-4 w-32">Date</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4 w-36">Movement</th>
                <th className="py-2.5 px-4">Reference</th>
                <th className="py-2.5 px-4 text-right w-36">Quantity</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${
              theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
            }`}>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-bold">No inventory movements match your filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isStockIn = tx.direction === 'IN';
                  const isAdjustment = tx.direction === 'ADJUST';

                  return (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedMovementDetail(tx)}
                      className={`transition cursor-pointer group ${
                        theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-2.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                        {tx.dateStr}
                      </td>

                      {/* Product */}
                      <td className="py-2.5 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                          {tx.productName}
                        </span>
                      </td>

                      {/* Movement Type Badge */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                          isAdjustment
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : isStockIn
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {isAdjustment ? (
                            <RefreshCw className="w-3 h-3" />
                          ) : isStockIn ? (
                            <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                          )}
                          <span>{tx.movementLabel}</span>
                        </span>
                      </td>

                      {/* Reference No */}
                      <td className="py-2.5 px-4 font-mono font-bold">
                        <span className="text-brand-600 dark:text-brand-400 group-hover:underline flex items-center gap-1">
                          <span>{tx.referenceNo}</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </td>

                      {/* Signed Quantity */}
                      <td className={`py-2.5 px-4 text-right font-black font-mono text-sm whitespace-nowrap ${
                        isAdjustment
                          ? 'text-amber-600 dark:text-amber-400'
                          : isStockIn
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.signedQty}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedMovementDetail && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedMovementDetail(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  selectedMovementDetail.direction === 'IN' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-rose-500/10 text-rose-500'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">Movement Statement Detail</h3>
                  <p className="text-[11px] text-slate-400 font-bold">{selectedMovementDetail.referenceNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovementDetail(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className={`border rounded-2xl p-4 space-y-2.5 text-xs ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Date & Time:</span>
                <span className="font-bold font-mono">{selectedMovementDetail.dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Commodity / Product:</span>
                <span className="font-extrabold">{selectedMovementDetail.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Movement Type:</span>
                <span className={`font-black ${
                  selectedMovementDetail.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {selectedMovementDetail.movementLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Source / Module:</span>
                <span className="font-bold">{selectedMovementDetail.sourceCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Reference Number:</span>
                <span className="font-mono font-bold text-brand-500">{selectedMovementDetail.referenceNo}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Quantity Transacted:</span>
                <span className={`font-black text-sm font-mono ${
                  selectedMovementDetail.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {selectedMovementDetail.signedQty}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Record</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMovementDetail(null)}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {showAdjModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdjModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-base font-black">Manual Stock Adjustment</h3>
                <p className="text-[11px] text-slate-400 font-bold">Add or deduct warehouse stock count</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Select Product *</label>
                <select
                  value={adjForm.productId || products[0]?.id}
                  onChange={(e) => setAdjForm({ ...adjForm, productId: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {Number(p.stockQty ?? p.stockqty ?? 0).toLocaleString()} {p.unit || 'KG'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Adjustment Type *</label>
                  <select
                    value={adjForm.type}
                    onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="IN">Stock Addition (+)</option>
                    <option value="OUT">Stock Deduction (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={adjForm.qtyKg}
                    onChange={(e) => setAdjForm({ ...adjForm, qtyKg: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Audit Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Manual Warehouse Count Audit, Spoilage, etc."
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
