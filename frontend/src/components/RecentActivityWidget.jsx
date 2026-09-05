import React, { useMemo } from 'react';
import { TrendingUp, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useERP, computeSaleFinancials, computePurchaseFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const RecentActivityWidget = () => {
  const { sales = [], purchases = [], products = [], saleReturns = [], purchaseReturns = [], paymentLogs = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const activities = useMemo(() => {
    const list = [];

    // 1. Sales activities
    (sales || []).forEach(s => {
      const fin = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
      const rawDate = s.created_at || s.createdAt || s.date;
      const parsedDate = new Date(rawDate);
      const isValidDate = !isNaN(parsedDate.getTime());
      
      list.push({
        id: `sale-${s.id}`,
        type: 'sale',
        title: `Sale completed - Rs. ${fin.netTotal.toLocaleString()}`,
        subtitle: `Invoice: ${s.invoiceNo || `INV-${s.id}`}`,
        timestamp: isValidDate ? parsedDate.getTime() : Number(s.id) || 0,
        timeStr: isValidDate ? parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
        icon: TrendingUp,
        color: 'emerald'
      });
    });

    // 2. Purchases activities
    (purchases || []).forEach(p => {
      const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
      const rawDate = p.created_at || p.createdAt || p.date;
      const parsedDate = new Date(rawDate);
      const isValidDate = !isNaN(parsedDate.getTime());

      list.push({
        id: `purch-${p.id}`,
        type: 'purchase',
        title: `Purchase recorded - Rs. ${fin.netTotal.toLocaleString()}`,
        subtitle: `Invoice: ${p.purchaseNo || `PUR-${p.id}`}`,
        timestamp: isValidDate ? parsedDate.getTime() : Number(p.id) || 0,
        timeStr: isValidDate ? parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
        icon: ShoppingCart,
        color: 'blue'
      });
    });

    // 3. Low stock alert activities
    (products || []).forEach(p => {
      const stock = Number(p.stockQty !== undefined ? p.stockQty : (p.stockqty !== undefined ? p.stockqty : 0));
      const min = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : 10));
      if (stock <= min) {
        list.push({
          id: `lowstock-${p.id}`,
          type: 'alert',
          title: `Low stock alert for ${p.name}`,
          subtitle: `Current stock: ${stock.toLocaleString()} ${p.unit || 'Litre'} (Min: ${min.toLocaleString()} ${p.unit || 'Litre'})`,
          timestamp: Date.now() - 3600000,
          timeStr: 'Recent',
          icon: AlertTriangle,
          color: 'orange'
        });
      }
    });

    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [sales, purchases, products, saleReturns, purchaseReturns, paymentLogs]);

  return (
    <div className={`h-full border rounded-2xl p-5 card-shadow flex flex-col justify-between transition-colors ${
      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm sm:text-base tracking-tight">Recent Activity</h3>
          <Link to="/invoices" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            {t('viewAll')}
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            No recent activity recorded today
          </div>
        ) : (
          <div className="space-y-3.5 flex-1">
            {activities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      act.color === 'emerald'
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        : act.color === 'blue'
                        ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{act.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{act.subtitle}</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                    {act.timeStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivityWidget;
