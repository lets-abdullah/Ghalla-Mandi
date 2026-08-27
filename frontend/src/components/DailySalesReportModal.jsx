import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Printer, 
  Calendar, 
  Users, 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  Wallet, 
  Clock, 
  X, 
  CheckCircle2, 
  Filter,
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const DailySalesReportModal = ({ isOpen, onClose, initialDate = null }) => {
  const { sales = [], saleReturns = [], user } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  // Selected single date (YYYY-MM-DD) or preset
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(initialDate || getTodayStr());
  const [customerFilter, setCustomerFilter] = useState('All'); // 'All' | 'Regular Party' | 'Walk-in Customer'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Pending'

  // Helper to parse date from string (handles DD/MM/YYYY, YYYY-MM-DD, ISO)
  const isSameDay = (itemDateStr, targetYMD) => {
    if (!itemDateStr || !targetYMD) return false;
    
    // If target is YYYY-MM-DD
    const [targetY, targetM, targetD] = targetYMD.split('-').map(Number);
    
    if (itemDateStr.includes('/')) {
      const parts = itemDateStr.split('/');
      // Assume DD/MM/YYYY
      if (parts.length === 3) {
        const d = Number(parts[0]);
        const m = Number(parts[1]);
        const y = Number(parts[2]);
        return d === targetD && m === targetM && y === targetY;
      }
    } else if (itemDateStr.includes('-')) {
      const parts = itemDateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        return d === targetD && m === targetM && y === targetY;
      }
    }

    try {
      const dateObj = new Date(itemDateStr);
      return (
        dateObj.getFullYear() === targetY &&
        dateObj.getMonth() + 1 === targetM &&
        dateObj.getDate() === targetD
      );
    } catch {
      return false;
    }
  };

  // Filtered sales for the selected date and filters
  const dailySales = useMemo(() => {
    return sales.filter(s => {
      // Date match
      const dateMatches = isSameDay(s.date || s.created_at, selectedDate);
      if (!dateMatches) return false;

      // Customer type match
      const isWalkin = (s.customerType || '').toLowerCase().includes('walk-in') || 
                       (s.partyName || '').toLowerCase().includes('walk-in');
      const custType = isWalkin ? 'Walk-in Customer' : 'Regular Party';

      if (customerFilter === 'Regular Party' && isWalkin) return false;
      if (customerFilter === 'Walk-in Customer' && !isWalkin) return false;

      // Status match
      const paid = Number(s.paidAmount || 0);
      const total = Number(s.amount || s.grandTotal || 0);
      const status = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

      if (statusFilter !== 'All' && status !== statusFilter) return false;

      return true;
    });
  }, [sales, selectedDate, customerFilter, statusFilter]);

  // Filtered returns for the selected date
  const dailyReturns = useMemo(() => {
    return saleReturns.filter(r => isSameDay(r.date || r.created_at, selectedDate));
  }, [saleReturns, selectedDate]);

  // Aggregate Metrics
  const totalInvoicesCount = dailySales.length;
  const totalGrossAmount = dailySales.reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
  const totalCashCollected = dailySales.reduce((acc, s) => acc + Number(s.paidAmount || 0), 0);
  const totalRemainingDue = dailySales.reduce((acc, s) => {
    const total = Number(s.amount || s.grandTotal || 0);
    const paid = Number(s.paidAmount || 0);
    return acc + Math.max(0, total - paid);
  }, 0);
  const totalReturnsRefunded = dailyReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  const netDailyRevenue = Math.max(0, totalGrossAmount - totalReturnsRefunded);

  // Commodity / Product aggregate quantities sold
  const productAggregates = useMemo(() => {
    const map = {};
    dailySales.forEach(s => {
      const items = Array.isArray(s.cart) && s.cart.length > 0 
        ? s.cart 
        : (Array.isArray(s.items) ? s.items : []);

      items.forEach(item => {
        const name = item.name || item.productName || 'General Item';
        const qty = Number(item.qty || item.quantity || 1);
        const unit = item.unitName || item.unit || 'KG';
        const amount = Number(item.totalAmount || item.total || (qty * Number(item.rate || item.price || 0)));

        const key = `${name}-${unit}`;
        if (!map[key]) {
          map[key] = { name, unit, qty: 0, amount: 0 };
        }
        map[key].qty += qty;
        map[key].amount += amount;
      });
    });
    return Object.values(map);
  }, [dailySales]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className={`rounded-3xl max-w-4xl w-full p-6 space-y-5 card-shadow border transition-all ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header with Print & Close buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  Daily Sales & Invoices Summary Report
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {user?.shopName || 'Ghalla Mandi Trading ERP'} • Daily Sales Invoices Breakdown
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-500/20 transition cursor-pointer active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80">
          {/* 1. Date Selector */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              <span>Select Report Date</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* 2. Customer Type Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Customer Type</span>
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="All">All Customer Types</option>
              <option value="Regular Party">Regular Parties</option>
              <option value="Walk-in Customer">Walk-in Customers</option>
            </select>
          </div>

          {/* 3. Payment Status Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>Payment Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="All">All Payment Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Paid</option>
              <option value="Pending">Unpaid / Due Khata</option>
            </select>
          </div>
        </div>

        {/* Aggregate KPI Summary Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Total Sales (کل فروخت)</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-emerald-700 dark:text-emerald-300">
              Rs. {totalGrossAmount.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-bold mt-0.5">
              {totalInvoicesCount} Invoices Processed
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25">
            <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Cash Received (وصول شدہ)</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-blue-700 dark:text-blue-300">
              Rs. {totalCashCollected.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-bold mt-0.5">
              Direct Counter Cash / Bank
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Khata Due (بقایا ادھار)</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-amber-700 dark:text-amber-300">
              Rs. {totalRemainingDue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-bold mt-0.5">
              Added to Customer Khata
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25">
            <div className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Net Revenue (خالص آمدن)</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-purple-700 dark:text-purple-300">
              Rs. {netDailyRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-bold mt-0.5">
              After Rs. {totalReturnsRefunded.toLocaleString()} Returns
            </div>
          </div>
        </div>

        {/* Commodity Sold Breakdown Section */}
        {productAggregates.length > 0 && (
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-brand-500" />
              <span>Commodity & Stock Dispatch Summary (آج کی فروخت شدہ اجناس)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {productAggregates.map((p, idx) => (
                <div 
                  key={idx} 
                  className="px-3 py-1.5 rounded-xl border border-brand-500/20 bg-brand-500/5 text-xs flex items-center gap-2"
                >
                  <span className="font-black text-slate-800 dark:text-slate-200">{p.name}:</span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{p.qty} {p.unit}</span>
                  <span className="text-[10px] text-slate-400 font-mono">(Rs. {p.amount.toLocaleString()})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Invoices List Table */}
        <div className="border rounded-2xl overflow-hidden border-slate-200 dark:border-slate-700">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Invoices List ({dailySales.length})
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-bold">
              Date: {selectedDate}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer / Party</th>
                  <th className="py-2.5 px-3">Items Sold</th>
                  <th className="py-2.5 px-3 text-right">Total (Rs)</th>
                  <th className="py-2.5 px-3 text-right">Received (Rs)</th>
                  <th className="py-2.5 px-3 text-right">Due (Rs)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {dailySales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No sales found for {selectedDate} matching your filters.
                    </td>
                  </tr>
                ) : (
                  dailySales.map(s => {
                    const total = Number(s.amount || s.grandTotal || 0);
                    const paid = Number(s.paidAmount || 0);
                    const due = Math.max(0, total - paid);
                    const isWalkin = (s.customerType || '').toLowerCase().includes('walk-in') || 
                                     (s.partyName || '').toLowerCase().includes('walk-in');

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                        <td className="py-2.5 px-3 font-mono font-black text-brand-500">{s.invoiceNo}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{s.partyName}</span>
                            {isWalkin && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                Walk-in
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {s.cart && s.cart.length > 0 ? (
                            <span className="truncate max-w-xs block">
                              {s.cart.map(i => `${i.name} (${i.qty} ${i.unitName || i.unit || 'KG'})`).join(', ')}
                            </span>
                          ) : (
                            <span>{s.itemsCount || 1} Item(s)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black font-mono">
                          Rs. {total.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          Rs. {paid.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono">
                          <span className={due > 0 ? 'text-amber-500 font-black' : 'text-slate-400'}>
                            Rs. {due.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            paid >= total && total > 0
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : paid > 0
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          }`}>
                            {paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Khata'}
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-400 font-bold">
            Total Invoices: <span className="font-mono text-slate-700 dark:text-slate-200">{dailySales.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition"
          >
            {t('close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default DailySalesReportModal;
