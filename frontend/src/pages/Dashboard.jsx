import React, { useState, useMemo } from 'react';
import {
  ShoppingBag, ShoppingCart, DollarSign,
  TrendingUp, Users, CreditCard, PlusCircle, Plus, BookOpen, Receipt, ArrowRight, Sparkles
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useERP, computeCustomerKhataBalance, computeSupplierKhataBalance, computeAllCustomersFinancials, computeAllSuppliersFinancials, computeProductValuation } from '../context/ERPContext';
import { KPICard } from '../components/KPICard';
import { SalesChart } from '../components/SalesChart';
import { LowStockWidget } from '../components/LowStockWidget';
import { TopProductsWidget } from '../components/TopProductsWidget';
import { RecentTransactionsTable } from '../components/RecentTransactionsTable';
import { InvoiceDrawer } from '../components/InvoiceDrawer';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { t } = useLocale();
  const { user } = useAuth();
  const { sales = [], purchases = [], customers = [], suppliers = [], products = [], saleReturns = [], purchaseReturns = [], paymentLogs = [], stockMovements = [] } = useERP();
  const navigate = useNavigate();
  const [activeInvoice, setActiveInvoice] = useState(null);

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
  const todaySaleReturnsVal = todaySaleReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netTodaySales = Math.max(0, grossTodaySales - todaySaleReturnsVal);

  // Strictly Today's Purchases (Net of Today's Returns)
  const todayPurchases = purchases.filter(p => isToday(p.date, p.created_at || p.createdAt));
  const todayPurchaseReturns = purchaseReturns.filter(r => isToday(r.date, r.created_at || r.createdAt));
  const grossTodayPurchases = todayPurchases.reduce((acc, p) => acc + (Number(p.amount ?? p.grandTotal ?? p.grandtotal) || 0), 0);
  const todayPurchaseReturnsVal = todayPurchaseReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netTodayPurchases = Math.max(0, grossTodayPurchases - todayPurchaseReturnsVal);

  // Overall / All-Time Totals
  const allTimeGrossSales = sales.reduce((acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0), 0);
  const allTimeSaleReturnsVal = saleReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netAllTimeSales = Math.max(0, allTimeGrossSales - allTimeSaleReturnsVal);

  const allTimeGrossPurchases = purchases.reduce((acc, p) => acc + (Number(p.amount ?? p.grandTotal ?? p.grandtotal) || 0), 0);
  const allTimePurchaseReturnsVal = purchaseReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netAllTimePurchases = Math.max(0, allTimeGrossPurchases - allTimePurchaseReturnsVal);

  // Combined Live Customer Receivables using Centralized Engine
  const { totalReceivables: totalCustomerDues, allCustomers, registeredList, walkinList } = useMemo(() => {
    return computeAllCustomersFinancials(customers, sales, paymentLogs, saleReturns);
  }, [customers, sales, paymentLogs, saleReturns]);

  const regularDues = (registeredList || []).reduce((acc, c) => acc + Number(c.receivableDue || 0), 0);
  const walkinDues = (walkinList || []).reduce((acc, c) => acc + Number(c.receivableDue || 0), 0);
  const regDueCount = (registeredList || []).filter(c => c.receivableDue > 0).length;
  const totalDueAccountsCount = (allCustomers || []).filter(c => c.receivableDue > 0).length;

  // Combined Live Supplier dues deducted using Centralized Engine
  const { totalPayables, allSuppliers } = useMemo(() => {
    return computeAllSuppliersFinancials(suppliers, purchases, paymentLogs, purchaseReturns);
  }, [suppliers, purchases, paymentLogs, purchaseReturns]);

  const dueSuppliersCount = allSuppliers.filter(s => s.payableDue > 0).length;

  // Total Inventory on hand and FIFO Valuation
  const { totalStockQty, totalInventoryValue } = useMemo(() => {
    let qtySum = 0;
    let valSum = 0;
    products.forEach(p => {
      const val = computeProductValuation(p, purchases, sales, saleReturns, purchaseReturns);
      qtySum += val.qty;
      valSum += val.stockValue;
    });
    return { totalStockQty: qtySum, totalInventoryValue: valSum };
  }, [products, purchases, sales, saleReturns, purchaseReturns]);

  return (
    <div className="space-y-6">
      {/* 5 Essential High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* 1. Strictly Today's Sales */}
        <KPICard
          title="Today's Sales"
          amount={`Rs. ${netTodaySales.toLocaleString()}`}
          subtext={
            netTodaySales > 0
              ? `${todaySales.length} sale${todaySales.length === 1 ? '' : 's'} today • Net Total: Rs. ${netAllTimeSales.toLocaleString()}`
              : `Total Sales: Rs. ${netAllTimeSales.toLocaleString()} (${sales.length} orders)`
          }
          icon={ShoppingBag}
          color="emerald"
          onClick={() => navigate('/sales')}
        />

        {/* 2. Strictly Today's Purchases */}
        <KPICard
          title="Today's Purchases"
          amount={`Rs. ${netTodayPurchases.toLocaleString()}`}
          subtext={
            netTodayPurchases > 0
              ? `${todayPurchases.length} purchase${todayPurchases.length === 1 ? '' : 's'} today • Net Total: Rs. ${netAllTimePurchases.toLocaleString()}`
              : `Total Purchases: Rs. ${netAllTimePurchases.toLocaleString()} (${purchases.length} inward)`
          }
          icon={ShoppingCart}
          color="blue"
          onClick={() => navigate('/purchases')}
        />

        {/* 3. Stock & Inventory Value */}
        <KPICard
          title="Stock & Inventory"
          amount={`Rs. ${totalInventoryValue.toLocaleString()}`}
          subtext={`${totalStockQty.toLocaleString()} units • ${products.length} commodities`}
          icon={TrendingUp}
          color="slate"
          onClick={() => navigate('/reports?type=Stock')}
        />

        {/* 4. Customer Receivables (Total Dues) */}
        <KPICard
          title="Customer Receivables"
          amount={`Rs. ${totalCustomerDues.toLocaleString()}`}
          subtext={
            walkinDues > 0
              ? `Party Khata: Rs. ${regularDues.toLocaleString()} • Counter: Rs. ${walkinDues.toLocaleString()}`
              : (totalCustomerDues > 0 ? `${totalDueAccountsCount} customer accounts with dues` : 'All customer accounts settled (Rs. 0)')
          }
          icon={Users}
          color="amber"
          onClick={() => navigate('/khata')}
        />

        {/* 5. Supplier Payables */}
        <KPICard
          title="Supplier Payables"
          amount={`Rs. ${totalPayables.toLocaleString()}`}
          subtext={
            totalPayables > 0
              ? `${dueSuppliersCount} suppliers with pending dues`
              : 'All supplier accounts settled (Rs. 0)'
          }
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
    </div>
  );
};

export default Dashboard;

