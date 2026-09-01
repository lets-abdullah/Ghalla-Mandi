import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Package,
  Layers,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  Barcode,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Tag,
  ShieldCheck,
  Percent,
  Receipt,
  Scale
} from 'lucide-react';
import { useERP, computeProductValuation } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const ProductHistory = ({ product, onBack }) => {
  const { purchases = [], sales = [], saleReturns = [], purchaseReturns = [], stockMovements = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'lots' | 'ledger'
  const [lotFilter, setLotFilter] = useState('all'); // 'all' | 'active' | 'consumed'
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all'); // 'all' | 'in' | 'out' | 'adjustments'
  const [searchQuery, setSearchQuery] = useState('');

  // Handle ESC key to navigate back
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Compute live FIFO valuation & transaction ledger
  const valuation = useMemo(() => {
    return computeProductValuation(product, purchases, sales, saleReturns, purchaseReturns, stockMovements);
  }, [product, purchases, sales, saleReturns, purchaseReturns, stockMovements]);

  const unit = product?.unit || product?.baseUnit || t('kg');
  const sellingRate = Number(product?.sellingPrice ?? product?.sellingprice ?? valuation.sellingRate ?? 0);
  const minStock = Number(product?.minStock ?? product?.minstock ?? 10);
  const isLowStock = valuation.qty <= minStock;

  const allBatches = valuation.batches || [];
  const activeBatches = valuation.activeBatches || [];
  const consumedBatches = allBatches.filter(b => (b.remainingQty || 0) === 0);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return allBatches.filter(b => {
      if (lotFilter === 'active' && (b.remainingQty || 0) <= 0) return false;
      if (lotFilter === 'consumed' && (b.remainingQty || 0) > 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const refMatch = (b.batchId || '').toLowerCase().includes(q);
        const typeMatch = (b.type || '').toLowerCase().includes(q);
        const dateMatch = (b.dateStr || '').toLowerCase().includes(q);
        return refMatch || typeMatch || dateMatch;
      }
      return true;
    });
  }, [allBatches, lotFilter, searchQuery]);

  // Filtered Movement Ledger
  const rawLedger = valuation.ledger || [];
  const filteredLedger = useMemo(() => {
    return rawLedger.filter(item => {
      if (ledgerTypeFilter === 'in' && item.direction !== 'IN') return false;
      if (ledgerTypeFilter === 'out' && item.direction !== 'OUT') return false;
      if (ledgerTypeFilter === 'adjustments' && !item.type?.toLowerCase().includes('adjustment')) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const refMatch = (item.ref || '').toLowerCase().includes(q);
        const typeMatch = (item.type || '').toLowerCase().includes(q);
        const dateMatch = (item.dateStr || '').toLowerCase().includes(q);
        return refMatch || typeMatch || dateMatch;
      }
      return true;
    });
  }, [rawLedger, ledgerTypeFilter, searchQuery]);

  // Export Ledger to CSV
  const exportLedgerToCSV = () => {
    if (!rawLedger || rawLedger.length === 0) {
      alert('No ledger transactions to export.');
      return;
    }

    const headers = ['Date', 'Reference / Voucher', 'Movement Type', 'Direction', `Quantity (${unit})`, 'Unit Rate (Rs)', 'Total Value (Rs)', `Running Stock (${unit})`];
    const rows = rawLedger.map(item => [
      `"${item.dateStr}"`,
      `"${item.ref || 'N/A'}"`,
      `"${item.type || 'N/A'}"`,
      `"${item.direction || 'IN'}"`,
      item.qty,
      item.rate,
      item.total,
      item.runningStock
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${product.name.replace(/\s+/g, '_')}_Stock_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Profit Margin calculation
  const marginPerUnit = sellingRate - valuation.avgCost;
  const marginPercent = valuation.avgCost > 0 ? ((marginPerUnit / valuation.avgCost) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className={`p-2.5 rounded-2xl border transition shadow-xs cursor-pointer flex items-center gap-2 text-xs font-black ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title="Back to Products Catalog (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-brand-500" />
            <span>Back to Products</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {product?.name}
              </h1>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400">
                {product?.category || 'General'}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {unit}
              </span>
              {product?.code && (
                <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5" /> {product.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              FIFO Purchase Lot Allocation, Real-time Cost Valuation & Movement History Ledger
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportLedgerToCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25 transition cursor-pointer active:scale-98"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <PrintHeader
        title={`Product Inventory & Valuation Audit: ${product?.name}`}
        filterSummary={`Category: ${product?.category || 'General'} | Code: ${product?.code || 'N/A'} | Unit: ${unit}`}
        stats={[
          { label: 'Current On-Hand Stock', value: `${valuation.qty.toLocaleString()} ${unit}` },
          { label: 'Total Valuation (FIFO)', value: `Rs. ${valuation.stockValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: 'Average Cost Rate', value: `Rs. ${valuation.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${unit}` },
          { label: 'Active Purchase Lots', value: activeBatches.length }
        ]}
      />

      {/* 5 KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. On Hand Stock */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">On-Hand Stock</span>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              isLowStock ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
            }`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono tracking-tight ${
              isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
            }`}>
              {valuation.qty.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">{unit}</span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            {isLowStock ? (
              <span className="text-rose-500 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Low Stock (Min: {minStock})
              </span>
            ) : (
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sufficient In Stock
              </span>
            )}
          </div>
        </div>

        {/* 2. Total FIFO Stock Value */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">FIFO Stock Value</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              Rs. {valuation.stockValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400">
            Based on active procurement lots
          </div>
        </div>

        {/* 3. Average Purchase Cost */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Weighted Avg Cost</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              Rs. {valuation.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400">
            Per {unit} inventory holding cost
          </div>
        </div>

        {/* 4. Latest Procurement Rate */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Latest Purchase Rate</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
              Rs. {(valuation.latestPurchaseRate || valuation.avgCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400">
            Most recent batch procurement
          </div>
        </div>

        {/* 5. Selling Rate & Profit Margin */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Current Selling Rate</span>
            <div className="w-7 h-7 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-brand-600 dark:text-brand-400">
              Rs. {sellingRate.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold flex items-center gap-1">
            {marginPerUnit >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{marginPercent.toFixed(1)}% (Rs. {marginPerUnit.toFixed(1)} margin)
              </span>
            ) : (
              <span className="text-rose-500 font-bold">
                {marginPercent.toFixed(1)}% (Below cost)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FIFO Cost Equation & Inventory Breakdown Formula Box */}
      <div className={`p-5 rounded-3xl border transition card-shadow ${
        theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-gradient-to-r from-slate-50 via-indigo-50/20 to-blue-50/30 border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Active Inventory Lot Breakdown & FIFO Valuation Equation
            </h2>
          </div>
          <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
            {activeBatches.length} Active {activeBatches.length === 1 ? 'Lot' : 'Lots'} Comprising On-Hand Stock
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
          {allBatches.length === 0 ? (
            <span className="text-slate-400 font-sans text-xs">
              No distinct purchase batches recorded yet. Direct initial stock rate applies.
            </span>
          ) : (
            <>
              {allBatches.map((b, i) => {
                const isActive = (b.remainingQty || 0) > 0;
                return (
                  <React.Fragment key={b.id || i}>
                    {i > 0 && <span className="text-slate-400 font-normal">+</span>}
                    <span className={`px-3 py-1.5 rounded-xl border transition shadow-2xs ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-300 shadow-indigo-500/5'
                        : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-400 line-through'
                    }`}>
                      {b.initialQty.toLocaleString()} {unit} @ Rs. {b.rate.toLocaleString()} → Rs. {b.initialTotalCost.toLocaleString()}
                      {isActive && b.remainingQty < b.initialQty && (
                        <span className="ml-1.5 text-[10px] font-black text-amber-500 not-italic">
                          ({b.remainingQty.toLocaleString()} {unit} rem.)
                        </span>
                      )}
                    </span>
                  </React.Fragment>
                );
              })}
              <span className="text-slate-400 font-normal">=</span>
              <span className="px-3.5 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 font-black shadow-xs">
                Total: {valuation.qty.toLocaleString()} {unit} → Rs. {valuation.stockValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} (Avg: Rs. {valuation.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })})
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div className="no-print flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview & Both Tables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lots')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lots'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Purchase Lots ({allBatches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Transaction Ledger ({rawLedger.length})</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lot, voucher, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold outline-none focus:border-brand-500 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* SECTION 1: FIFO PURCHASE LOTS TABLE */}
      {(activeTab === 'all' || activeTab === 'lots') && (
        <div className={`border rounded-3xl overflow-hidden card-shadow transition ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  FIFO Procurement Batches & Lot Cost Tracking
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Tracks remaining balance and valuation of each procurement lot in FIFO sequence
                </p>
              </div>
            </div>

            {/* Lot Status Filter Pills */}
            <div className="no-print flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setLotFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  lotFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({allBatches.length})
              </button>
              <button
                type="button"
                onClick={() => setLotFilter('active')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  lotFilter === 'active'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Active ({activeBatches.length})
              </button>
              <button
                type="button"
                onClick={() => setLotFilter('consumed')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  lotFilter === 'consumed'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Consumed ({consumedBatches.length})
              </button>
            </div>
          </div>

          {/* Batches Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Batch / Lot Ref</th>
                  <th className="py-3 px-4">Lot Source Type</th>
                  <th className="py-3 px-4 text-right">Initial Procured</th>
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Initial Lot Cost</th>
                  <th className="py-3 px-4 text-right">Consumed</th>
                  <th className="py-3 px-4 text-right">Remaining On-Hand</th>
                  <th className="py-3 px-4 text-right">Remaining Value</th>
                  <th className="py-3 px-4 text-center">Lot Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs font-bold">
                      No procurement lots match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch, idx) => {
                    const isFullyConsumed = (batch.remainingQty || 0) <= 0;
                    const consumedQty = Math.max(0, (batch.initialQty || 0) - (batch.remainingQty || 0));
                    const isPartial = (batch.remainingQty || 0) > 0 && (batch.remainingQty || 0) < (batch.initialQty || 0);

                    return (
                      <tr key={batch.id || idx} className={`transition ${
                        theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/70'
                      }`}>
                        <td className="py-3 px-4 font-mono">
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                            {batch.batchId}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium ml-3">
                            {batch.dateStr}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${
                            batch.type === 'Opening Stock'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : batch.type === 'Purchase'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : batch.type === 'Sale Return In'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {batch.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          {batch.initialQty.toLocaleString()} {unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                          Rs. {batch.rate.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-500 dark:text-slate-400">
                          Rs. {batch.initialTotalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {consumedQty.toLocaleString()} {unit}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-black ${
                          isFullyConsumed ? 'text-slate-400 line-through' : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {batch.remainingQty.toLocaleString()} {unit}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-black ${
                          isFullyConsumed ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          Rs. {batch.remainingValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isFullyConsumed
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                              : isPartial
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {isFullyConsumed ? 'Fully Consumed' : isPartial ? 'Partially Sold' : 'Active Lot'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: COMPLETE TRANSACTION & MOVEMENT HISTORY LEDGER */}
      {(activeTab === 'all' || activeTab === 'ledger') && (
        <div className={`border rounded-3xl overflow-hidden card-shadow transition ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Chronological Inventory Movement Ledger & Audit Trail
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Detailed ledger of all purchases, sales, customer returns, supplier returns, and audits
                </p>
              </div>
            </div>

            {/* Movement Type Filter Tabs */}
            <div className="no-print flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex-wrap">
              <button
                type="button"
                onClick={() => setLedgerTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  ledgerTypeFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({rawLedger.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerTypeFilter('in')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  ledgerTypeFilter === 'in'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" /> Inflow
              </button>
              <button
                type="button"
                onClick={() => setLedgerTypeFilter('out')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  ledgerTypeFilter === 'out'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" /> Outflow
              </button>
              <button
                type="button"
                onClick={() => setLedgerTypeFilter('adjustments')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  ledgerTypeFilter === 'adjustments'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                }`}
              >
                Audits
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Transaction Date</th>
                  <th className="py-3 px-4">Reference / Voucher</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Direction</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Running Stock Balance</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-bold">
                      No stock movement ledger transactions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((tx, idx) => {
                    const isIn = tx.direction === 'IN';

                    return (
                      <tr key={tx.id || idx} className={`transition ${
                        theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/70'
                      }`}>
                        <td className="py-3 px-4 font-mono font-medium text-slate-600 dark:text-slate-300">
                          {tx.dateStr}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {tx.ref || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${
                            tx.type?.includes('Opening')
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : tx.type?.includes('Purchase')
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : tx.type?.includes('Sale')
                              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            isIn
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}>
                            {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isIn ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-black ${
                          isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIn ? '+' : '-'}{tx.qty.toLocaleString()} {unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-800 dark:text-slate-200">
                          Rs. {tx.rate.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                          Rs. {tx.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                          {tx.runningStock.toLocaleString()} {unit}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Footer */}
      <PrintFooter note={`Official Inventory Audit Ledger • Product: ${product?.name} • Ghalla Mandi System`} />
    </div>
  );
};

export default ProductHistory;
