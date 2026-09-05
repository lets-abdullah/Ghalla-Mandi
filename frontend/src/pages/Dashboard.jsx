import React, { useState, useMemo } from 'react';
import {
  ShoppingBag, ShoppingCart, DollarSign,
  TrendingUp, Users, CreditCard, Wallet, Receipt, Package
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useERP, computeCustomerKhataBalance, computeSupplierKhataBalance, computeAllCustomersFinancials, computeAllSuppliersFinancials, computeProductValuation, computeSaleFinancials, computePurchaseFinancials, extractMerchandiseReturnValue } from '../context/ERPContext';
import { KPICard } from '../components/KPICard';
import { SalesChart } from '../components/SalesChart';
import { LowStockWidget } from '../components/LowStockWidget';
import { TopProductsWidget } from '../components/TopProductsWidget';
import { RecentActivityWidget } from '../components/RecentActivityWidget';
import { InvoiceDrawer } from '../components/InvoiceDrawer';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { t } = useLocale();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { sales = [], purchases = [], customers = [], suppliers = [], products = [], saleReturns = [], purchaseReturns = [], paymentLogs = [], stockMovements = [] } = useERP();
  const navigate = useNavigate();
  const [activeInvoice, setActiveInvoice] = useState(null);

  const isDark = theme === 'dark';

  // Helper to accurately check if a record's date is today
  const isToday = (dateVal, createdVal) => {
    if (!dateVal && !createdVal) return false;
    const raw = String(dateVal || createdVal || '').trim();
    if (!raw) return false;

    if (raw.toLowerCase() === 'today') return true;
    if (raw.toLowerCase() === 'yesterday') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Match DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      const d = new Date(year, month, day);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }

    // Match YYYY-MM-DD
    const yyyymmddMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (yyyymmddMatch) {
      const year = parseInt(yyyymmddMatch[1], 10);
      const month = parseInt(yyyymmddMatch[2], 10) - 1;
      const day = parseInt(yyyymmddMatch[3], 10);
      const d = new Date(year, month, day);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }

    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed.getTime() === today.getTime();
    }
    return false;
  };

  // Strictly Today's Sales (Net of Today's Returns)
  const todaySales = sales.filter(s => isToday(s.date, s.created_at || s.createdAt));
  const todaySaleReturns = saleReturns.filter(r => isToday(r.date, r.created_at || r.createdAt));
  const grossTodaySales = todaySales.reduce((acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0), 0);
  const todaySaleReturnsVal = todaySaleReturns.reduce((sum, r) => sum + extractMerchandiseReturnValue(r), 0);
  const netTodaySales = Math.max(0, grossTodaySales - todaySaleReturnsVal);

  // Strictly Today's Purchases (Net of Today's Returns)
  const todayPurchases = purchases.filter(p => isToday(p.date, p.created_at || p.createdAt));
  const todayPurchaseReturns = purchaseReturns.filter(r => isToday(r.date, r.created_at || r.createdAt));
  const grossTodayPurchases = todayPurchases.reduce((acc, p) => acc + (Number(p.amount ?? p.grandTotal ?? p.grandtotal) || 0), 0);
  const todayPurchaseReturnsVal = todayPurchaseReturns.reduce((sum, r) => sum + extractMerchandiseReturnValue(r), 0);
  const netTodayPurchases = Math.max(0, grossTodayPurchases - todayPurchaseReturnsVal);

  // Combined Live Customer Receivables using Centralized Engine
  const { totalReceivables: totalCustomerDues } = useMemo(() => {
    return computeAllCustomersFinancials(customers, sales, paymentLogs, saleReturns);
  }, [customers, sales, paymentLogs, saleReturns]);

  // Combined Live Supplier dues deducted using Centralized Engine
  const { totalPayables } = useMemo(() => {
    return computeAllSuppliersFinancials(suppliers, purchases, paymentLogs, purchaseReturns);
  }, [suppliers, purchases, paymentLogs, purchaseReturns]);

  // Total Inventory on hand and FIFO Valuation
  const { totalInventoryValue } = useMemo(() => {
    let valSum = 0;
    products.forEach(p => {
      const val = computeProductValuation(p, purchases, sales, saleReturns, purchaseReturns);
      valSum += val.stockValue;
    });
    return { totalInventoryValue: valSum };
  }, [products, purchases, sales, saleReturns, purchaseReturns]);

  // Today's Bottom Summary Metrics
  const todayNetCash = netTodaySales - netTodayPurchases;
  const todayTransactionsCount = todaySales.length + todayPurchases.length;

  const { totalTodayQtySold, primaryTodayUnit, distinctItemsSoldToday } = useMemo(() => {
    let totalQty = 0;
    const itemSet = new Set();
    let mainUnit = 'Litre';

    todaySales.forEach(s => {
      const items = s.cart || s.items || [];
      if (Array.isArray(items)) {
        items.forEach(it => {
          totalQty += Number(it.qty || it.enteredQty || 1);
          if (it.name || it.productName) itemSet.add((it.name || it.productName).toLowerCase());
          if (it.unit || it.unitName) mainUnit = it.unit || it.unitName;
        });
      }
    });

    return {
      totalTodayQtySold: totalQty,
      primaryTodayUnit: mainUnit,
      distinctItemsSoldToday: itemSet.size || 1
    };
  }, [todaySales]);

  return (
    <div className="space-y-6">
      {/* 5 Essential High-Impact KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* 1. TODAY'S SALES */}
        <KPICard
          title="TODAY'S SALES"
          amount={`Rs. ${netTodaySales.toLocaleString()}`}
          icon={ShoppingBag}
          color="emerald"
          onClick={() => navigate('/sales')}
        />

        {/* 2. TODAY'S PURCHASES */}
        <KPICard
          title="TODAY'S PURCHASES"
          amount={`Rs. ${netTodayPurchases.toLocaleString()}`}
          icon={ShoppingCart}
          color="blue"
          onClick={() => navigate('/purchases')}
        />

        {/* 3. STOCK & INVENTORY */}
        <KPICard
          title="STOCK & INVENTORY"
          amount={`Rs. ${totalInventoryValue.toLocaleString()}`}
          icon={Package}
          color="blue"
          onClick={() => navigate('/reports?type=Stock')}
        />

        {/* 4. CUSTOMER RECEIVABLES */}
        <KPICard
          title="CUSTOMER RECEIVABLES"
          amount={`Rs. ${totalCustomerDues.toLocaleString()}`}
          icon={Users}
          color="orange"
          onClick={() => navigate('/khata')}
        />

        {/* 5. SUPPLIER PAYABLES */}
        <KPICard
          title="SUPPLIER PAYABLES"
          amount={`Rs. ${totalPayables.toLocaleString()}`}
          icon={Wallet}
          color="red"
          onClick={() => navigate('/suppliers')}
        />
      </div>

      {/* Main Charts & Widgets Grid (3 Columns) */}
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

      {/* Bottom Summary & Activity Row (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Today's Financial Summary Card - 7 columns */}
        <div className="lg:col-span-7 flex flex-col">
          <div className={`h-full border rounded-2xl p-5 card-shadow flex items-center ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700/60">
              {/* 1. TODAY'S NET CASH */}
              <div className="flex items-center gap-3.5 pt-3 md:pt-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">TODAY'S NET CASH</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    Rs. {todayNetCash.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Sales - Purchases</div>
                </div>
              </div>

              {/* 2. TOTAL TRANSACTIONS */}
              <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-6">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">TOTAL TRANSACTIONS</div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {todayTransactionsCount}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Today</div>
                </div>
              </div>

              {/* 3. ITEMS SOLD */}
              <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-6">
                <div className="w-11 h-11 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">ITEMS SOLD</div>
                  <div className="text-xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                    {totalTodayQtySold.toLocaleString()} {primaryTodayUnit}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Across {distinctItemsSoldToday} Items</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - 5 columns */}
        <div className="lg:col-span-5 flex flex-col">
          <RecentActivityWidget />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium gap-2">
        <div>© 2026 Ghalla Mandi. All rights reserved.</div>
        <div>Production Multi-Tenant SaaS v1.0.0</div>
      </footer>

      {/* Invoice Drawer Modal */}
      {activeInvoice && (
        <InvoiceDrawer invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
      )}
    </div>
  );
};

export default Dashboard;

