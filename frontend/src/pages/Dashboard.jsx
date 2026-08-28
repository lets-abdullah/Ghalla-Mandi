import React, { useState } from 'react';
import {
  ShoppingBag, ShoppingCart, DollarSign,
  TrendingUp, Users, CreditCard, Calendar,
  SlidersHorizontal, RefreshCw, Layers
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useERP } from '../context/ERPContext';
import { KPICard } from '../components/KPICard';
import { SalesChart } from '../components/SalesChart';
import { LowStockWidget } from '../components/LowStockWidget';
import { TopProductsWidget } from '../components/TopProductsWidget';
import { RecentTransactionsTable } from '../components/RecentTransactionsTable';
import { InvoiceDrawer } from '../components/InvoiceDrawer';
import { QuickSaleModal } from '../components/QuickSaleModal';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { t } = useLocale();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { sales = [], purchases = [], customers = [], suppliers = [], products = [], saleReturns = [], purchaseReturns = [] } = useERP();
  const navigate = useNavigate();
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);

  // Date Filter State: 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [dateFilter, setDateFilter] = useState('Today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Helper to parse dates from sales, purchases, returns
  const parseItemDate = (dateVal, createdVal) => {
    if (!dateVal && !createdVal) return null;
    const raw = String(dateVal || createdVal || '').trim();
    if (!raw) return null;

    if (raw.toLowerCase() === 'today') {
      return new Date();
    }
    if (raw.toLowerCase() === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    }

    // Match DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      return new Date(year, month, day);
    }

    // Match YYYY-MM-DD
    const yyyymmddMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (yyyymmddMatch) {
      const year = parseInt(yyyymmddMatch[1], 10);
      const month = parseInt(yyyymmddMatch[2], 10) - 1;
      const day = parseInt(yyyymmddMatch[3], 10);
      return new Date(year, month, day);
    }

    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  const isWithinDateFilter = (dateVal, createdVal) => {
    const itemDate = parseItemDate(dateVal, createdVal);
    if (!itemDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemDay = new Date(itemDate);
    itemDay.setHours(0, 0, 0, 0);

    if (dateFilter === 'Today') {
      return itemDay.getTime() === today.getTime();
    }

    if (dateFilter === 'Yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return itemDay.getTime() === yesterday.getTime();
    }

    if (dateFilter === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      return itemDay >= startOfWeek && itemDay <= endOfToday;
    }

    if (dateFilter === 'This Month') {
      return (
        itemDay.getFullYear() === today.getFullYear() &&
        itemDay.getMonth() === today.getMonth()
      );
    }

    if (dateFilter === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return itemDay >= start && itemDay <= end;
      } else if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return itemDay >= start;
      } else if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return itemDay <= end;
      }
      return true;
    }

    return true;
  };

  // Period Filtered Metrics
  const filteredSales = (sales || []).filter(s => isWithinDateFilter(s.date, s.created_at || s.createdAt));
  const filteredSaleReturns = (saleReturns || []).filter(r => isWithinDateFilter(r.date, r.created_at || r.createdAt));
  const filteredGrossSales = filteredSales.reduce((acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0), 0);
  const filteredSaleReturnsVal = filteredSaleReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netFilteredSales = Math.max(0, filteredGrossSales - filteredSaleReturnsVal);

  const filteredPurchases = (purchases || []).filter(p => isWithinDateFilter(p.date, p.created_at || p.createdAt));
  const filteredPurchaseReturns = (purchaseReturns || []).filter(r => isWithinDateFilter(r.date, r.created_at || r.createdAt));
  const filteredGrossPurchases = filteredPurchases.reduce((acc, p) => acc + (Number(p.amount ?? p.grandTotal ?? p.grandtotal) || 0), 0);
  const filteredPurchaseReturnsVal = filteredPurchaseReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netFilteredPurchases = Math.max(0, filteredGrossPurchases - filteredPurchaseReturnsVal);

  // Overall / All-Time Totals
  const allTimeGrossSales = (sales || []).reduce((acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0), 0);
  const allTimeSaleReturnsVal = (saleReturns || []).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netAllTimeSales = Math.max(0, allTimeGrossSales - allTimeSaleReturnsVal);

  const totalReceivables = (customers || []).reduce((acc, c) => acc + Math.max(0, Number(c.balance) || 0), 0);
  const totalPayables = (suppliers || []).reduce((acc, s) => acc + Math.max(0, Number(s.balance) || 0), 0);
  const totalStockQty = (products || []).reduce((acc, p) => acc + (Number(p.stockQty ?? p.stockqty) || 0), 0);
  const totalInventoryValue = (products || []).reduce((acc, p) => acc + ((Number(p.stockQty ?? p.stockqty) || 0) * (Number(p.purchasePrice ?? p.purchaseprice) || 0)), 0);

  // Dynamic Card Titles and Labels based on active Date Filter
  const getPeriodMeta = () => {
    switch (dateFilter) {
      case 'Today':
        return {
          salesTitle: "Today's Sales",
          purchasesTitle: "Today's Purchases",
          salesSubtext: `${filteredSales.length} ${filteredSales.length === 1 ? 'sale' : 'sales'} today`,
          purchasesSubtext: `${filteredPurchases.length} ${filteredPurchases.length === 1 ? 'purchase' : 'purchases'} today`,
          badge: `Today (${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`
        };
      case 'Yesterday': {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        return {
          salesTitle: "Yesterday's Sales",
          purchasesTitle: "Yesterday's Purchases",
          salesSubtext: `${filteredSales.length} ${filteredSales.length === 1 ? 'sale' : 'sales'} yesterday`,
          purchasesSubtext: `${filteredPurchases.length} ${filteredPurchases.length === 1 ? 'purchase' : 'purchases'} yesterday`,
          badge: `Yesterday (${yest.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`
        };
      }
      case 'This Week':
        return {
          salesTitle: "This Week's Sales",
          purchasesTitle: "This Week's Purchases",
          salesSubtext: `${filteredSales.length} ${filteredSales.length === 1 ? 'sale' : 'sales'} this week`,
          purchasesSubtext: `${filteredPurchases.length} ${filteredPurchases.length === 1 ? 'purchase' : 'purchases'} this week`,
          badge: "Past 7 Days"
        };
      case 'This Month':
        return {
          salesTitle: "This Month's Sales",
          purchasesTitle: "This Month's Purchases",
          salesSubtext: `${filteredSales.length} ${filteredSales.length === 1 ? 'sale' : 'sales'} this month`,
          purchasesSubtext: `${filteredPurchases.length} ${filteredPurchases.length === 1 ? 'purchase' : 'purchases'} this month`,
          badge: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      case 'Custom':
        return {
          salesTitle: "Period Sales",
          purchasesTitle: "Period Purchases",
          salesSubtext: `${filteredSales.length} ${filteredSales.length === 1 ? 'sale' : 'sales'} in range`,
          purchasesSubtext: `${filteredPurchases.length} ${filteredPurchases.length === 1 ? 'purchase' : 'purchases'} in range`,
          badge: customStartDate || customEndDate ? `${customStartDate || '...'} to ${customEndDate || '...'}` : 'Custom Range'
        };
      default:
        return {
          salesTitle: "Today's Sales",
          purchasesTitle: "Today's Purchases",
          salesSubtext: `${filteredSales.length} sales`,
          purchasesSubtext: `${filteredPurchases.length} purchases`,
          badge: "Today"
        };
    }
  };

  const periodMeta = getPeriodMeta();

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className={`border rounded-2xl p-3 sm:p-4 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Date Filter:</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                {periodMeta.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Date Options Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['Today', 'Yesterday', 'This Week', 'This Month', 'Custom'].map((opt) => {
            const isSelected = dateFilter === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setDateFilter(opt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-xs'
                    : theme === 'dark'
                      ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-750'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt === 'Custom' && <SlidersHorizontal className="w-3 h-3" />}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Pickers (Shown when dateFilter === 'Custom') */}
      {dateFilter === 'Custom' && (
        <div className={`border rounded-2xl p-3.5 card-shadow flex flex-wrap items-center gap-3 transition-colors ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>
          {(customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
            >
              Clear Range
            </button>
          )}
        </div>
      )}

      {/* 6 Essential High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Filtered Period Sales */}
        <KPICard
          title={periodMeta.salesTitle}
          amount={`Rs. ${netFilteredSales.toLocaleString()}`}
          subtext={periodMeta.salesSubtext}
          icon={ShoppingBag}
          color="emerald"
          onClick={() => navigate('/sales')}
        />

        {/* 2. Filtered Period Purchases */}
        <KPICard
          title={periodMeta.purchasesTitle}
          amount={`Rs. ${netFilteredPurchases.toLocaleString()}`}
          subtext={periodMeta.purchasesSubtext}
          icon={ShoppingCart}
          color="blue"
          onClick={() => navigate('/purchases')}
        />

        {/* 3. Overall / Total All-Time Sales */}
        <KPICard
          title="Total Sales (All Time)"
          amount={`Rs. ${netAllTimeSales.toLocaleString()}`}
          subtext={`${sales.length} total sales overall`}
          icon={DollarSign}
          color="orange"
          onClick={() => navigate('/sales')}
        />

        {/* 4. Stock & Inventory Value */}
        <KPICard
          title="Stock & Inventory"
          amount={`Rs. ${totalInventoryValue.toLocaleString()}`}
          subtext={`${totalStockQty.toLocaleString()} units in stock`}
          icon={TrendingUp}
          color="amber"
          onClick={() => navigate('/reports?type=Stock')}
        />

        {/* 5. Customer Receivables */}
        <KPICard
          title="Customer Dues"
          amount={`Rs. ${totalReceivables.toLocaleString()}`}
          subtext={`${customers.length} total customers`}
          icon={Users}
          color="amber"
          onClick={() => navigate('/customers')}
        />

        {/* 6. Supplier Payables */}
        <KPICard
          title="Supplier Dues"
          amount={`Rs. ${totalPayables.toLocaleString()}`}
          subtext={`${suppliers.length} total suppliers`}
          icon={CreditCard}
          color="rose"
          onClick={() => navigate('/suppliers')}
        />
      </div>

      {/* Main Charts & Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Sales Chart - 6 columns */}
        <div className="lg:col-span-6 flex flex-col">
          <SalesChart />
        </div>

        {/* Low Stock Alerts - 3 columns */}
        <div className="lg:col-span-3 flex flex-col">
          <LowStockWidget />
        </div>

        {/* Top Products - 3 columns */}
        <div className="lg:col-span-3 flex flex-col">
          <TopProductsWidget />
        </div>
      </div>

      {/* Full Width Clean Recent Transactions Table */}
      <div className="w-full">
        <RecentTransactionsTable onViewInvoice={(inv) => setActiveInvoice(inv)} />
      </div>

      {/* Invoice Drawer Modal */}
      {activeInvoice && (
        <InvoiceDrawer invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
      )}

      {/* Quick Sale Form Modal */}
      {showQuickSaleModal && (
        <QuickSaleModal onClose={() => setShowQuickSaleModal(false)} />
      )}
    </div>
  );
};

export default Dashboard;

