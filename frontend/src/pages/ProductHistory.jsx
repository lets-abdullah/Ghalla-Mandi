import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Package,
  ShoppingCart,
  Calendar,
  Search,
  Download,
  Printer,
  Barcode,
  TrendingUp,
  Coins,
  Scale,
  Clock,
  Tag,
  AlertTriangle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useERP, computeProductValuation } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

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

const safeNum = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? fallback : val;
  const str = String(val).trim();
  const match = str.match(/^-?\d+(\.\d+)?/);
  if (match) {
    const n = parseFloat(match[0]);
    return isNaN(n) || !isFinite(n) ? fallback : n;
  }
  const n = parseFloat(str);
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

export const ProductHistory = ({ product, onBack }) => {
  const { purchases = [], sales = [], saleReturns = [], purchaseReturns = [], stockMovements = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

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

  // Compute live current inventory valuation
  const valuation = useMemo(() => {
    return computeProductValuation(product, purchases, sales, saleReturns, purchaseReturns, stockMovements);
  }, [product, purchases, sales, saleReturns, purchaseReturns, stockMovements]);

  const unit = product?.unit || product?.baseUnit || t('kg');
  const sellingRate = safeNum(product?.sellingPrice ?? product?.sellingprice ?? valuation.sellingRate ?? 0, 0);
  const minStock = safeNum(product?.minStock ?? product?.minstock ?? 10, 10);
  const isLowStock = valuation.qty <= minStock;

  // Filter ONLY actual Purchase transactions for this product
  const prodId = product?.id ? String(product.id) : null;
  const prodName = (product?.name || '').trim().toLowerCase();

  const isMatch = (it) => {
    if (!it) return false;
    const itId = it.productId || it.id || it.product_id;
    if (prodId && itId && String(itId) === prodId) return true;
    const itName = (it.name || it.productName || it.item || '').trim().toLowerCase();
    return Boolean(prodName && itName && (itName === prodName || itName.includes(prodName) || prodName.includes(itName)));
  };

  const purchaseHistory = useMemo(() => {
    const list = [];
    (purchases || []).forEach(p => {
      const pDate = new Date(p.created_at || p.createdAt || p.date || 0).getTime() || 0;
      const pDateStr = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'N/A');
      const pRef = p.purchaseNo ? `PUR-#${p.purchaseNo}` : (p.id ? `PUR-${p.id}` : 'PUR-REF');
      const items = p.cart || p.items || [];

      items.forEach((it, idx) => {
        if (isMatch(it)) {
          const qty = safeQty(it.qty ?? it.quantity ?? it.enteredQty ?? 0);
          const rate = safeNum(it.rate ?? it.price ?? it.purchasePrice ?? 0, 0);
          if (qty > 0) {
            list.push({
              id: `pur-${p.id || p.purchaseNo || 'p'}-${idx}`,
              date: pDate,
              dateStr: pDateStr,
              ref: pRef,
              qty,
              rate,
              totalCost: qty * rate,
              supplierName: p.supplierName || p.partyName || p.supplierFirm || ''
            });
          }
        }
      });
    });

    // Chronological order (oldest to newest)
    return list.sort((a, b) => a.date - b.date);
  }, [purchases, product, prodId, prodName]);

  // Search filtered purchase history
  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchaseHistory;
    const q = searchQuery.toLowerCase().trim();
    return purchaseHistory.filter(item => {
      return (
        item.ref.toLowerCase().includes(q) ||
        item.dateStr.toLowerCase().includes(q) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(q))
      );
    });
  }, [purchaseHistory, searchQuery]);

  // Summary Metrics of Actual Purchases
  const totalPurchasedQty = purchaseHistory.reduce((sum, item) => sum + item.qty, 0);
  const totalPurchaseCost = purchaseHistory.reduce((sum, item) => sum + item.totalCost, 0);
  const averagePurchaseRate = totalPurchasedQty > 0 ? (totalPurchaseCost / totalPurchasedQty) : 0;

  // Export Purchase History to CSV
  const exportPurchaseHistoryCSV = () => {
    if (purchaseHistory.length === 0) {
      alert('No purchase transactions to export.');
      return;
    }

    const headers = ['Purchase Date', 'Purchase Reference', `Quantity Purchased (${unit})`, `Purchase Rate / ${unit} (Rs)`, 'Total Purchase Cost (Rs)', 'Supplier Firm'];
    const rows = purchaseHistory.map(item => [
      `"${item.dateStr}"`,
      `"${item.ref}"`,
      item.qty,
      item.rate,
      item.totalCost,
      `"${item.supplierName || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${(product?.name || 'Product').replace(/\s+/g, '_')}_Purchase_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & BREADCRUMB NAVIGATION */}
      {/* ------------------------------------------------------------------------- */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className={`p-2 px-3 rounded-xl border transition shadow-xs cursor-pointer flex items-center gap-2 text-xs font-bold ${
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
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400">
                {product?.category || 'General'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {unit}
              </span>
              {product?.code && (
                <span className="text-xs font-mono font-medium text-slate-400 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5" /> {product.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Procurement transaction log and current inventory holding summary
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportPurchaseHistoryCSV}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer ${
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-xs transition cursor-pointer active:scale-98"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <PrintHeader
        title={`Purchase History & Inventory Summary: ${product?.name}`}
        filterSummary={`Category: ${product?.category || 'General'} | Code: ${product?.code || 'N/A'} | Unit: ${unit}`}
        stats={[
          { label: 'Total Purchased', value: `${totalPurchasedQty.toLocaleString()} ${unit}` },
          { label: 'Total Purchase Cost', value: `Rs. ${totalPurchaseCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: 'Average Purchase Rate', value: `Rs. ${averagePurchaseRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${unit}` },
          { label: 'Current On-Hand Stock', value: `${valuation.qty.toLocaleString()} ${unit}` }
        ]}
      />

      {/* ------------------------------------------------------------------------- */}
      {/* 2. CURRENT INVENTORY KPIS (CLEAN, COMPACT 5-CARD GRID) */}
      {/* ------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* On-Hand Stock */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
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
          <div className="mt-1 text-[11px] font-medium text-slate-400 flex items-center gap-1">
            {isLowStock ? (
              <span className="text-rose-500 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Low Stock (Min: {minStock})
              </span>
            ) : (
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Available on hand
              </span>
            )}
          </div>
        </div>

        {/* Current Stock Value */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Current Stock Value</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              Rs. {valuation.stockValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Current inventory valuation
          </div>
        </div>

        {/* Weighted Average Cost */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
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
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Per {unit} holding cost
          </div>
        </div>

        {/* Latest Purchase Rate */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
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
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Most recent procurement
          </div>
        </div>

        {/* Current Selling Rate */}
        <div className={`p-4 rounded-2xl border transition card-shadow ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
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
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Per {unit} retail / wholesale rate
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. SINGLE SIMPLE PURCHASE HISTORY SECTION */}
      {/* ------------------------------------------------------------------------- */}
      <div className={`border rounded-2xl overflow-hidden card-shadow transition ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Section Header */}
        <div className="p-4 sm:px-5 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Purchase History
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Log of actual procurement bills and purchase orders
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold outline-none focus:border-brand-500 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>
        </div>

        {/* Purchase History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3 px-4 sm:px-5">Purchase Date</th>
                <th className="py-3 px-4">Purchase Reference</th>
                <th className="py-3 px-4 text-right">Quantity Purchased</th>
                <th className="py-3 px-4 text-right">Purchase Rate / {unit}</th>
                <th className="py-3 px-4 sm:px-5 text-right">Total Purchase Cost</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs font-semibold">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileText className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      <span>No purchase transactions found for this product.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition ${
                      theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4 sm:px-5 font-mono font-medium text-slate-600 dark:text-slate-300">
                      {item.dateStr}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                        {item.ref}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.qty.toLocaleString()} {unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      Rs. {item.rate.toLocaleString()} / {unit}
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      Rs. {item.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Summary Metrics Bar */}
        <div className={`p-4 sm:px-5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          theme === 'dark'
            ? 'bg-slate-900/60 border-slate-700 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider font-sans font-bold">Total Purchased:</span>
              <span className="text-slate-900 dark:text-white font-black text-sm">
                {totalPurchasedQty.toLocaleString()} {unit}
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider font-sans font-bold">Total Purchase Cost:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                Rs. {totalPurchaseCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider font-sans font-bold">Average Purchase Rate:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">
                Rs. {averagePurchaseRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {unit}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-sans font-medium">
            Showing {filteredPurchases.length} of {purchaseHistory.length} {purchaseHistory.length === 1 ? 'record' : 'records'}
          </div>
        </div>
      </div>

      {/* Print Footer */}
      <PrintFooter note={`Official Product Purchase Record • ${product?.name} • Ghalla Mandi Management System`} />
    </div>
  );
};

export default ProductHistory;
