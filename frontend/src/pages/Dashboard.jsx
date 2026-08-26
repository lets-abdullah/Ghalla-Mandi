import React, { useState } from 'react';
import {
  ShoppingBag, ShoppingCart, DollarSign,
  TrendingUp, Users, CreditCard, Sparkles
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
  const { sales, purchases, customers, suppliers, products, saleReturns = [], purchaseReturns = [] } = useERP();
  const navigate = useNavigate();
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);

  const grossSales = (sales || []).reduce((acc, s) => acc + (Number(s.amount ?? s.grandTotal ?? s.grandtotal) || 0), 0);
  const totalSaleReturnsVal = (saleReturns || []).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netSales = Math.max(0, grossSales - totalSaleReturnsVal);

  const grossPurchases = (purchases || []).reduce((acc, p) => acc + (Number(p.amount ?? p.grandTotal ?? p.grandtotal) || 0), 0);
  const totalPurchaseReturnsVal = (purchaseReturns || []).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const netPurchases = Math.max(0, grossPurchases - totalPurchaseReturnsVal);

  const totalReceivables = (customers || []).reduce((acc, c) => acc + Math.max(0, Number(c.balance) || 0), 0);
  const totalPayables = (suppliers || []).reduce((acc, s) => acc + Math.max(0, Number(s.balance) || 0), 0);
  const totalStockQty = (products || []).reduce((acc, p) => acc + (Number(p.stockQty ?? p.stockqty) || 0), 0);
  const totalInventoryValue = (products || []).reduce((acc, p) => acc + ((Number(p.stockQty ?? p.stockqty) || 0) * (Number(p.purchasePrice ?? p.purchaseprice) || 0)), 0);

  return (
    <div className="space-y-6">
      {/* 5 Essential High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title={t('todaySales')}
          amount={`Rs. ${netSales.toLocaleString()}`}
          subtext={t('salesTodayCount', { count: sales.length })}
          icon={ShoppingBag}
          color="emerald"
          onClick={() => navigate('/sales')}
        />
        <KPICard
          title={t('todayPurchases')}
          amount={`Rs. ${netPurchases.toLocaleString()}`}
          subtext={t('purchasesTodayCount', { count: purchases.length })}
          icon={ShoppingCart}
          color="blue"
          onClick={() => navigate('/purchases')}
        />
        <KPICard
          title={t('stockAndInventory')}
          amount={`Rs. ${totalInventoryValue.toLocaleString()}`}
          subtext={`${totalStockQty.toLocaleString()} ${t('itemsInStock') || 'units in stock'}`}
          icon={TrendingUp}
          color="amber"
          onClick={() => navigate('/reports?type=Stock')}
        />
        <KPICard
          title={t('outstandingReceivables')}
          amount={`Rs. ${totalReceivables.toLocaleString()}`}
          subtext={t('fromCustomersCount', { count: customers.length })}
          icon={Users}
          color="amber"
          onClick={() => navigate('/customers')}
        />
        <KPICard
          title={t('outstandingPayables')}
          amount={`Rs. ${totalPayables.toLocaleString()}`}
          subtext={t('toSuppliersCount', { count: suppliers.length })}
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
