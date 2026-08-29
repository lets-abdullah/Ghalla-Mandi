import React, { useState, useMemo } from 'react';
import {
  ShoppingBag, ShoppingCart, DollarSign,
  TrendingUp, Users, CreditCard
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
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
  const { sales = [], purchases = [], customers = [], suppliers = [], products = [], saleReturns = [], purchaseReturns = [], paymentLogs = [] } = useERP();
  const navigate = useNavigate();
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);

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

  // Combined Live Customer Receivables (Synchronized with Khata & PaymentLogs)
  const { totalCustomerDues, regularDues, walkinDues, totalDueAccountsCount } = useMemo(() => {
    const processedCustNames = new Set();
    const processedCustIds = new Set();

    // 1. Regular / Saved Customers
    let regDues = 0;
    let regDueCount = 0;

    (customers || []).forEach(cust => {
      processedCustIds.add(cust.id);
      if (cust.name) processedCustNames.add(cust.name.trim().toLowerCase());

      const custSales = (sales || []).filter(s =>
        s.customerId === cust.id ||
        (s.partyName && s.partyName.trim().toLowerCase() === (cust.name || '').trim().toLowerCase())
      );
      const totalSale = custSales.reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
      const upfrontPaid = custSales.reduce((acc, s) => acc + Number(s.paidAmount || (s.status === 'Paid' ? s.amount : 0)), 0);

      const directPaid = (paymentLogs || []).filter(p =>
        (p.type === 'Customer' || p.partyType === 'Customer') &&
        (
          (p.partyId && String(p.partyId) === String(cust.id)) ||
          (p.partyName && p.partyName.trim().toLowerCase() === (cust.name || '').trim().toLowerCase())
        )
      ).reduce((acc, p) => acc + Number(p.amount || 0), 0);

      const returnAmt = (saleReturns || []).filter(r =>
        r.customerId === cust.id ||
        (r.customerName && r.customerName.trim().toLowerCase() === (cust.name || '').trim().toLowerCase())
      ).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

      const netSaleTarget = Math.max(0, totalSale - returnAmt);
      const totalPaid = Math.min(netSaleTarget, upfrontPaid + directPaid);
      const bal = Math.max(0, netSaleTarget - totalPaid);

      if (bal > 0) {
        regDues += bal;
        regDueCount += 1;
      }
    });

    // 2. Walk-in / Counter Sales
    const walkinSalesMap = new Map();
    (sales || []).forEach(s => {
      const isRegisteredCust = (s.customerId && processedCustIds.has(s.customerId)) ||
        (s.partyName && processedCustNames.has(s.partyName.trim().toLowerCase()));

      if (!isRegisteredCust) {
        const rawName = (s.partyName || s.customerName || 'Walk-in Customer').trim();
        const key = rawName.toLowerCase();
        if (!walkinSalesMap.has(key)) {
          walkinSalesMap.set(key, { name: rawName, sales: [] });
        }
        walkinSalesMap.get(key).sales.push(s);
      }
    });

    let wDues = 0;
    let wDueCount = 0;

    walkinSalesMap.forEach((val, key) => {
      const custSales = val.sales;
      const totalSale = custSales.reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
      const upfrontPaid = custSales.reduce((acc, s) => acc + Number(s.paidAmount || (s.status === 'Paid' ? s.amount : 0)), 0);

      const directPaid = (paymentLogs || []).filter(p =>
        (p.type === 'Customer' || p.partyType === 'Customer') &&
        (
          (p.partyName && p.partyName.trim().toLowerCase() === key) ||
          (p.partyId && String(p.partyId).toLowerCase() === `walkin-${key}`)
        )
      ).reduce((acc, p) => acc + Number(p.amount || 0), 0);

      const returnAmt = (saleReturns || []).filter(r =>
        r.customerName && r.customerName.trim().toLowerCase() === key
      ).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

      const netSaleTarget = Math.max(0, totalSale - returnAmt);
      const totalPaid = Math.min(netSaleTarget, upfrontPaid + directPaid);
      const bal = Math.max(0, netSaleTarget - totalPaid);

      if (bal > 0) {
        wDues += bal;
        wDueCount += 1;
      }
    });

    return {
      totalCustomerDues: regDues + wDues,
      regularDues: regDues,
      walkinDues: wDues,
      totalDueAccountsCount: regDueCount + wDueCount
    };
  }, [customers, sales, saleReturns, paymentLogs]);

  // Combined Live Supplier Payables (Synchronized with Suppliers Directory & PaymentLogs)
  const { totalPayables, dueSuppliersCount } = useMemo(() => {
    let payables = 0;
    let dueCount = 0;

    (suppliers || []).forEach(sup => {
      const supPurchases = (purchases || []).filter(p =>
        p.supplierId === sup.id ||
        (p.supplierName && p.supplierName.trim().toLowerCase() === (sup.name || '').trim().toLowerCase()) ||
        (p.supplier && p.supplier.trim().toLowerCase() === (sup.name || '').trim().toLowerCase())
      );
      const totalPurchase = supPurchases.reduce((acc, p) => acc + Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0), 0);
      const upfrontPaid = supPurchases.reduce((acc, p) => acc + Number(p.paidAmount ?? p.paidamount ?? (p.paymentStatus === 'Paid' ? (p.amount ?? p.grandTotal ?? p.grandtotal ?? 0) : 0)), 0);

      const directPaid = (paymentLogs || []).filter(p =>
        (p.type === 'Supplier' || p.partyType === 'Supplier') &&
        (
          (p.partyId && String(p.partyId) === String(sup.id)) ||
          (p.partyName && p.partyName.trim().toLowerCase() === (sup.name || '').trim().toLowerCase())
        )
      ).reduce((acc, p) => acc + Number(p.amount || 0), 0);

      const returnAmt = (purchaseReturns || []).filter(r =>
        r.supplierId === sup.id ||
        (r.supplierName && r.supplierName.trim().toLowerCase() === (sup.name || '').trim().toLowerCase())
      ).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

      const netPurchaseTarget = Math.max(0, totalPurchase - returnAmt);
      const totalPaid = Math.min(netPurchaseTarget, upfrontPaid + directPaid);
      const bal = Math.max(0, netPurchaseTarget - totalPaid);

      if (bal > 0) {
        payables += bal;
        dueCount += 1;
      }
    });

    return {
      totalPayables: payables,
      dueSuppliersCount: dueCount
    };
  }, [suppliers, purchases, purchaseReturns, paymentLogs]);

  const totalStockQty = products.reduce((acc, p) => acc + (Number(p.stockQty ?? p.stockqty) || 0), 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + ((Number(p.stockQty ?? p.stockqty) || 0) * (Number(p.purchasePrice ?? p.purchaseprice) || 0)), 0);

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
          color="amber"
          onClick={() => navigate('/reports?type=Stock')}
        />

        {/* 4. Customer Receivables (Regular + Walk-in) */}
        <KPICard
          title="Customer Dues"
          amount={`Rs. ${totalCustomerDues.toLocaleString()}`}
          subtext={
            totalCustomerDues > 0
              ? walkinDues > 0
                ? `Regular: Rs. ${regularDues.toLocaleString()} • Walk-in: Rs. ${walkinDues.toLocaleString()}`
                : `${totalDueAccountsCount} accounts with pending dues`
              : 'All customer accounts settled (Rs. 0)'
          }
          icon={Users}
          color="amber"
          onClick={() => navigate('/khata')}
        />

        {/* 5. Supplier Payables */}
        <KPICard
          title="Supplier Dues"
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

      {/* Quick Sale Form Modal */}
      {showQuickSaleModal && (
        <QuickSaleModal onClose={() => setShowQuickSaleModal(false)} />
      )}
    </div>
  );
};

export default Dashboard;

