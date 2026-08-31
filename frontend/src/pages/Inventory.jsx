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
import { useERP, computeProductValuation } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

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
  const [movementTypeFilter, setMovementTypeFilter] = useState('All'); // 'All' | 'IN' | 'OUT' | 'RETURN'
  const [sourceFilter, setSourceFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Unified Chronological Inventory Movement Ledger
  const allTransactions = useMemo(() => {
    const list = [];

    // 1. Opening Stock from registered products
    (products || []).forEach(p => {
      const initialQty = Number(p.openingStock ?? p.initialStock ?? p.opening_stock ?? p.initial_stock ?? p.stockQty ?? p.stock_qty ?? 0);
      if (initialQty > 0) {
        list.push({
          id: `open-${p.id}`,
          dateStr: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'Opening',
          dateObj: p.created_at ? new Date(p.created_at) : new Date(0),
          productId: p.id,
          productName: p.name,
          direction: 'IN',
          movementLabel: 'Opening Stock',
          sourceCategory: 'Opening Stock',
          referenceNo: 'OPENING-STOCK',
          qtyNum: initialQty,
          unit: p.unit || p.baseUnit || 'KG',
          signedQty: `+${initialQty} ${p.unit || p.baseUnit || 'KG'}`,
          raw: p
        });
      }
    });

    // 2. Purchases (Stock In)
    (purchases || []).forEach(p => {
      const items = Array.isArray(p.items) && p.items.length > 0 ? p.items : (Array.isArray(p.cart) ? p.cart : [{ name: p.productName || 'Procured Commodity', qty: p.qty || 1, unit: p.unit || 'KG' }]);
      items.forEach((it, i) => {
        const itQty = Number(it.qty || it.enteredQty || 1);
        list.push({
          id: `pur-${p.id || p.purchaseNo}-${i}`,
          dateStr: p.date || new Date().toLocaleDateString('en-GB'),
          dateObj: p.created_at ? new Date(p.created_at) : new Date(p.date || 0),
          productId: it.productId || it.id,
          productName: it.name || p.productName || 'Commodity',
          direction: 'IN',
          movementLabel: 'Purchase In',
          sourceCategory: 'Purchases',
          referenceNo: p.purchaseNo ? `Purchase #${p.purchaseNo}` : 'Purchase Bill',
          qtyNum: itQty,
          unit: it.unit || it.unitName || p.unit || 'KG',
          signedQty: `+${itQty} ${it.unit || p.unit || 'KG'}`,
          raw: p
        });
      });
    });

    // 3. Sales (Stock Out)
    (sales || []).forEach(s => {
      const items = Array.isArray(s.items) && s.items.length > 0 ? s.items : (Array.isArray(s.cart) ? s.cart : [{ name: typeof s.items === 'string' ? s.items : (s.productName || 'Commodity'), qty: s.qty || 1, unit: s.unit || 'KG' }]);
      items.forEach((it, i) => {
        const itQty = Number(it.qty || it.enteredQty || 1);
        list.push({
          id: `sale-${s.id || s.invoiceNo}-${i}`,
          dateStr: s.date || new Date().toLocaleDateString('en-GB'),
          dateObj: s.created_at ? new Date(s.created_at) : new Date(s.date || 0),
          productId: it.productId || it.id,
          productName: it.name || 'Commodity Product',
          direction: 'OUT',
          movementLabel: 'POS Sale Out',
          sourceCategory: 'Sales',
          referenceNo: s.invoiceNo ? `Sale #${s.invoiceNo}` : 'POS Checkout',
          qtyNum: itQty,
          unit: it.unit || it.unitName || s.unit || 'KG',
          signedQty: `-${itQty} ${it.unit || s.unit || 'KG'}`,
          raw: s
        });
      });
    });

    // 4. Sale Returns (Stock In)
    (saleReturns || []).forEach(r => {
      (r.items || [{ name: 'Returned Commodity', qty: r.qty || 1, unit: 'KG' }]).forEach((it, i) => {
        const itQty = Number(it.qty || 1);
        list.push({
          id: `sr-${r.id || r.returnNo}-${i}`,
          dateStr: r.date || new Date().toLocaleDateString('en-GB'),
          dateObj: r.created_at ? new Date(r.created_at) : new Date(r.date || 0),
          productId: it.productId || it.id,
          productName: it.name || 'Returned Commodity',
          direction: 'IN',
          movementLabel: 'Customer Return In',
          sourceCategory: 'Sale Returns',
          referenceNo: r.returnNo ? `Sale Return #${r.returnNo}` : 'Credit Note',
          qtyNum: itQty,
          unit: it.unit || 'KG',
          signedQty: `+${itQty} ${it.unit || 'KG'}`,
          raw: r
        });
      });
    });

    // 5. Purchase Returns (Stock Out)
    (purchaseReturns || []).forEach(r => {
      (r.items || [{ name: 'Returned Commodity', qty: r.qty || 1, unit: 'KG' }]).forEach((it, i) => {
        const itQty = Number(it.qty || 1);
        list.push({
          id: `pr-${r.id || r.returnNo}-${i}`,
          dateStr: r.date || new Date().toLocaleDateString('en-GB'),
          dateObj: r.created_at ? new Date(r.created_at) : new Date(r.date || 0),
          productId: it.productId || it.id,
          productName: it.name || 'Returned Commodity',
          direction: 'OUT',
          movementLabel: 'Supplier Return Out',
          sourceCategory: 'Purchase Returns',
          referenceNo: r.returnNo ? `Purchase Return #${r.returnNo}` : 'Debit Note',
          qtyNum: itQty,
          unit: it.unit || 'KG',
          signedQty: `-${itQty} ${it.unit || 'KG'}`,
          raw: r
        });
      });
    });

    // 6. Manual Adjustments from stockMovements
    (stockMovements || []).forEach((m, idx) => {
      const typeUpper = (m.type || '').toUpperCase();
      const refUpper = (m.ref || '').toUpperCase();
      const isAlreadyTracked = refUpper.includes('PURCHASE') || refUpper.includes('SALE') || refUpper.includes('RETURN') || refUpper.includes('INV-') || refUpper.includes('PUR-');
      if (!isAlreadyTracked) {
        const isStockIn = typeUpper.includes('IN') || Number(m.qty || 0) > 0;
        const itQty = Math.abs(Number(m.qty || 0));
        if (itQty > 0) {
          list.push({
            id: `adj-${m.id || idx}`,
            dateStr: m.date || (m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')),
            dateObj: m.created_at ? new Date(m.created_at) : new Date(),
            productId: m.productId || m.product_id,
            productName: m.product || m.productName || 'Adjusted Stock',
            direction: isStockIn ? 'IN' : 'OUT',
            movementLabel: isStockIn ? 'Stock Adjustment In' : 'Stock Adjustment Out',
            sourceCategory: 'Stock Adjustments',
            referenceNo: m.ref || 'Manual Adjustment',
            qtyNum: itQty,
            unit: m.unit || 'KG',
            signedQty: `${isStockIn ? '+' : '-'}${itQty} ${m.unit || 'KG'}`,
            raw: m
          });
        }
      }
    });

    // Sort chronologically (oldest to newest) to compute running on-hand stock
    list.sort((a, b) => a.dateObj - b.dateObj);

    // Compute running on-hand balance per product
    const prodBalanceMap = new Map();
    const withRunningStock = list.map(item => {
      const key = (item.productName || 'General').trim().toLowerCase();
      const prevBal = prodBalanceMap.get(key) || 0;
      const change = item.direction === 'IN' ? item.qtyNum : -item.qtyNum;
      const newBal = prevBal + change;
      prodBalanceMap.set(key, newBal);

      return {
        ...item,
        runningStock: newBal
      };
    });

    // Return descending for display (latest on top)
    return withRunningStock.sort((a, b) => b.dateObj - a.dateObj);
  }, [products, purchases, sales, saleReturns, purchaseReturns, stockMovements]);

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
  const totalStockQty = useMemo(() => {
    return (products || []).reduce((acc, p) => {
      const val = computeProductValuation(p, purchases, sales, saleReturns, purchaseReturns);
      return acc + val.qty;
    }, 0);
  }, [products, purchases, sales, saleReturns, purchaseReturns]);

  const lowStockCount = useMemo(() => {
    return (products || []).filter(p => {
      const val = computeProductValuation(p, purchases, sales, saleReturns, purchaseReturns);
      const min = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : 10));
      return val.qty <= min;
    }).length;
  }, [products, purchases, sales, saleReturns, purchaseReturns]);

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
      {/* Top Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-brand-500" />
            <span>Stock & Inventory Ledger</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Complete record of stock arrivals, sales, and warehouse movements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Print List Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            <Printer className="w-4 h-4" />
            <span>Print List</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Bar (Screen Only) */}
      <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
          }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-brand-500" />
            <span>On-Hand Stock</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-brand-500">
            {totalStockQty.toLocaleString()} <span className="text-xs font-bold text-slate-400">Units</span>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
          }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Total Stock In</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            +{totalInflow.toLocaleString()} <span className="text-xs font-bold text-slate-400">Units</span>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'
          }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <span>Total Stock Out</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            -{totalOutflow.toLocaleString()} <span className="text-xs font-bold text-slate-400">Units</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/products')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
            }`}
          title="View products catalog"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Low Stock Alerts</span>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 tracking-tight ${lowStockCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {lowStockCount} <span className="text-xs font-bold text-slate-400">Items</span>
          </div>
        </div>
      </div>

      {/* Single Clean Filter Bar (Screen Only) */}
      <div className={`no-print p-3.5 rounded-2xl border card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2.5">
          {/* 1. Date Filter */}
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Movement Type */}
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Movement Type
            </label>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Movements</option>
              <option value="IN">Stock In (+)</option>
              <option value="OUT">Stock Out (-)</option>
              <option value="RETURN">Returns</option>
            </select>
          </div>

          {/* 5. Search Bar */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Product, reference, note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none focus:border-brand-500 h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Inline Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-[38px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center justify-center gap-1.5"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
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
                className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Stock Valuation & Inventory Statement"
        filterSummary={`Period: ${dateFilter} | Movement: ${movementTypeFilter} | Source: ${sourceFilter}`}
        stats={[
          { label: 'On-Hand Stock', value: `${totalStockQty.toLocaleString()} Units` },
          { label: 'Low Stock Alerts', value: `${lowStockCount} Items` },
          { label: 'Total Inflow (+)', value: `+${totalInflow.toLocaleString()}` },
          { label: 'Total Outflow (-)', value: `-${totalOutflow.toLocaleString()}` }
        ]}
      />

      {/* Compact Bank-Statement Inventory Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}>
                <th className="py-2.5 px-4 w-32">Date</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4 w-36">Movement</th>
                <th className="py-2.5 px-4">Reference</th>
                <th className="py-2.5 px-4 text-right w-32">Quantity</th>
                <th className="py-2.5 px-4 text-right w-32">On-Hand Stock</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
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
                      className={theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/70'}
                    >
                      {/* Date */}
                      <td className="py-2.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                        {tx.dateStr}
                      </td>

                      {/* Product */}
                      <td className="py-2.5 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {tx.productName}
                        </span>
                      </td>

                      {/* Movement Type Badge */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${isAdjustment
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
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {tx.referenceNo}
                      </td>

                      {/* Signed Quantity */}
                      <td className={`py-2.5 px-4 text-right font-black font-mono text-sm whitespace-nowrap ${isAdjustment
                        ? 'text-amber-600 dark:text-amber-400'
                        : isStockIn
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                        }`}>
                        {tx.signedQty}
                      </td>

                      {/* On-Hand Stock Balance */}
                      <td className="py-2.5 px-4 text-right font-black font-mono text-sm whitespace-nowrap text-brand-600 dark:text-brand-400">
                        {tx.runningStock !== undefined ? `${tx.runningStock.toLocaleString()} ${tx.unit}` : '—'}
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
      <PrintFooter note="Official Business Record • Ghalla Mandi Warehouse & Stock Register" />
    </div>
  );
};

export default Inventory;
