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
  const { sales, purchases, customers, suppliers } = useERP();
  const navigate = useNavigate();
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);

  const totalSales = sales.reduce((acc, s) => acc + s.amount, 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + p.amount, 0);
  const totalProfit = sales.reduce((acc, s) => acc + (s.profit || 0), 0);
  const totalReceivables = customers.reduce((acc, c) => acc + Math.max(0, c.balance), 0);
  const totalPayables = suppliers.reduce((acc, s) => acc + Math.max(0, s.balance), 0);

  return (
    <div className="space-y-6">
      {/* Fully Interactive KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          title={t('todaySales')}
          amount={`Rs. ${totalSales.toLocaleString()}`}
          subtext={t('salesTodayCount', { count: sales.length })}
          icon={ShoppingBag}
          bgClass="bg-emerald-50"
          iconClass="text-emerald-600"
          isPositive={true}
          onClick={() => navigate('/sales')}
        />
        <KPICard
          title={t('todayPurchases')}
          amount={`Rs. ${totalPurchases.toLocaleString()}`}
          subtext={t('purchasesTodayCount', { count: purchases.length })}
          icon={ShoppingCart}
          bgClass="bg-brand-50"
          iconClass="text-brand-600"
          isPositive={false}
          onClick={() => navigate('/purchases')}
        />
        <KPICard
          title={t('todayProfit')}
          amount={`Rs. ${totalProfit.toLocaleString()}`}
          subtext={t('grossProfit')}
          icon={DollarSign}
          bgClass="bg-emerald-50"
          iconClass="text-emerald-600"
          isPositive={true}
          onClick={() => navigate('/reports')}
        />
        <KPICard
          title={t('monthlyRevenue')}
          amount={`Rs. ${totalSales.toLocaleString()}`}
          subtext={t('totalSalesVolume')}
          icon={TrendingUp}
          bgClass="bg-brand-50"
          iconClass="text-brand-600"
          isPositive={true}
          onClick={() => navigate('/reports')}
        />
        <KPICard
          title={t('outstandingReceivables')}
          amount={`Rs. ${totalReceivables.toLocaleString()}`}
          subtext={t('fromCustomersCount', { count: customers.length })}
          icon={Users}
          bgClass="bg-amber-50"
          iconClass="text-amber-600"
          onClick={() => navigate('/customers')}
        />
        <KPICard
          title={t('outstandingPayables')}
          amount={`Rs. ${totalPayables.toLocaleString()}`}
          subtext={t('toSuppliersCount', { count: suppliers.length })}
          icon={CreditCard}
          bgClass="bg-rose-50"
          iconClass="text-rose-600"
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

      {/* Bottom Row: Recent Transactions & Business Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <RecentTransactionsTable onViewInvoice={(inv) => setActiveInvoice(inv)} />
        </div>

        {/* Business Summary Monthly Card */}
        <div
          onClick={() => navigate('/reports')}
          className="lg:col-span-4 bg-white border border-slate-200 hover:border-brand-300 rounded-2xl p-5 card-shadow flex flex-col justify-between cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition">
                {t('businessSummary')} <span className="text-slate-400 text-xs font-normal">{t('thisMonth')}</span>
              </h3>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-500">{t('totalSalesVolume')}</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">Rs. {totalSales.toLocaleString()}</div>
              </div>

              <div className="bg-brand-50/60 border border-brand-100 p-3 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-500">{t('totalPurchasesVolume')}</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">Rs. {totalPurchases.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50/60 border border-purple-100 p-3 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-500">{t('grossProfit')}</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">Rs. {totalProfit.toLocaleString()}</div>
              </div>

              <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-500">{t('netOperatingProfit')}</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">Rs. {totalProfit.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-400 group-hover:text-brand-600 font-semibold transition">
            {t('clickDetailedReport')}
          </div>
        </div>
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
