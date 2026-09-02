import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Calendar,
  Search,
  Printer,
  RotateCcw,
  Package,
  FileText,
  Clock,
  Layers,
  Sparkles,
  ShoppingBag,
  ShoppingCart
} from 'lucide-react';
import { useERP, computeProductValuation } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';
import { EmptyState } from '../components/EmptyState';

export const Inventory = () => {
  const {
    products = [],
    sales = [],
    purchases = [],
    saleReturns = [],
    purchaseReturns = []
  } = useERP();

  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // Filter States
  const [dateFilter, setDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [movementTypeFilter, setMovementTypeFilter] = useState('All'); // 'All' | 'IN' | 'OUT' | 'PURCHASE' | 'SALE' | 'RETURN'
  const [searchQuery, setSearchQuery] = useState('');

  // Safe quantity helper
  const safeQty = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
    const str = String(val).trim();
    const match = str.match(/^-?\d+(\.\d+)?/);
    if (match) {
      const n = parseFloat(match[0]);
      return isNaN(n) || !isFinite(n) ? 0 : n;
    }
    const n = parseFloat(str);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  // Unified Chronological Inventory Movement Ledger (Purchases, Sales, Returns & Opening Stock only)
  const allTransactions = useMemo(() => {
    const list = [];

    (products || []).forEach(p => {
      const val = computeProductValuation(p, purchases, sales, saleReturns, purchaseReturns);
      if (val.ledger && val.ledger.length > 0) {
        val.ledger.forEach(entry => {
          let movementCategory = 'OPENING';
          let movementLabel = 'Opening Stock';

          if (entry.type === 'Purchase') {
            movementCategory = 'PURCHASE';
            movementLabel = 'Stock In (Purchase Bill)';
          } else if (entry.type === 'Sale Invoice' || entry.type === 'POS Sale' || entry.type === 'SALE') {
            movementCategory = 'SALE';
            movementLabel = 'Stock Out (Sale Invoice)';
          } else if (entry.type === 'Sale Return' || entry.type === 'SALE_RETURN') {
            movementCategory = 'SALE_RETURN';
            movementLabel = 'Stock In (Sale Return)';
          } else if (entry.type === 'Purchase Return' || entry.type === 'PURCHASE_RETURN') {
            movementCategory = 'PURCHASE_RETURN';
            movementLabel = 'Stock Out (Purchase Return)';
          }

          list.push({
            id: `${p.id}-${entry.id}`,
            dateStr: entry.dateStr || (entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : 'Opening'),
            dateObj: new Date(entry.date || 0),
            productId: p.id,
            productName: p.name,
            direction: entry.direction,
            movementCategory,
            movementLabel,
            referenceNo: entry.ref || 'N/A',
            qtyNum: entry.qty,
            unit: p.unit || p.baseUnit || 'KG',
            signedQty: `${entry.direction === 'IN' ? '+' : '-'}${entry.qty} ${p.unit || p.baseUnit || 'KG'}`,
            runningStock: entry.runningStock
          });
        });
      }
    });

    // Return descending for display (latest on top)
    return list.sort((a, b) => b.dateObj - a.dateObj);
  }, [products, purchases, sales, saleReturns, purchaseReturns]);

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
        if (movementTypeFilter === 'PURCHASE' && item.movementCategory !== 'PURCHASE') return false;
        if (movementTypeFilter === 'SALE' && item.movementCategory !== 'SALE') return false;
        if (movementTypeFilter === 'RETURN' && !item.movementCategory.includes('RETURN')) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pMatch = (item.productName || '').toLowerCase().includes(q);
        const rMatch = (item.referenceNo || '').toLowerCase().includes(q);
        const mMatch = (item.movementLabel || '').toLowerCase().includes(q);
        const dMatch = (item.dateStr || '').toLowerCase().includes(q);
        if (!pMatch && !rMatch && !mMatch && !dMatch) return false;
      }

      return true;
    });
  }, [allTransactions, dateFilter, customStartDate, customEndDate, selectedProduct, movementTypeFilter, searchQuery]);

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

  const hasActiveFilters = dateFilter !== 'All' || selectedProduct !== 'All' || movementTypeFilter !== 'All' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setDateFilter('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedProduct('All');
    setMovementTypeFilter('All');
    setSearchQuery('');
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
            Log of purchases in, POS sales out, and verified return movements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Print List Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
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
              <option value="IN">All Stock In (+)</option>
              <option value="OUT">All Stock Out (-)</option>
              <option value="PURCHASE">Purchases In</option>
              <option value="SALE">POS Sales Out</option>
              <option value="RETURN">All Returns (Sale/Purchase)</option>
            </select>
          </div>

          {/* 4. Search Bar */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Product, reference, invoice..."
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

        {/* Custom Date Pickers */}
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

      {/* Print-Only Header */}
      <PrintHeader
        title="Stock Valuation & Inventory Statement"
        filterSummary={`Period: ${dateFilter} | Movement: ${movementTypeFilter}`}
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
                <th className="py-2.5 px-4">Item / Produce</th>
                <th className="py-2.5 px-4 w-44">Movement Type</th>
                <th className="py-2.5 px-4">Ref / Bill / Inv #</th>
                <th className="py-2.5 px-4 text-right w-32">Quantity</th>
                <th className="py-2.5 px-4 text-right w-32">On-Hand Stock</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <EmptyState
                      icon={Warehouse}
                      title="No inventory movements found"
                      description="No stock in/out movements match your active date or product filters."
                    />
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isStockIn = tx.direction === 'IN';

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

                      {/* Movement Type (Plain Text) */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-black tracking-wide ${isStockIn
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {isStockIn ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                          <span>{tx.movementLabel}</span>
                        </span>
                      </td>

                      {/* Reference No */}
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {tx.referenceNo}
                      </td>

                      {/* Signed Quantity */}
                      <td className={`py-2.5 px-4 text-right font-black font-mono text-sm whitespace-nowrap ${isStockIn
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
