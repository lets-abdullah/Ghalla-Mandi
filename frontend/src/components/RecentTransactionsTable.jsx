import React from 'react';
import { FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useERP, computeSaleFinancials, computePurchaseFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const RecentTransactionsTable = ({ onViewInvoice }) => {
  const { sales = [], purchases = [], saleReturns = [], purchaseReturns = [], paymentLogs = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const combined = [
    ...(sales || []).map(s => {
      const { total, paid, due, status } = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
      const isPaid = status === 'Paid';
      const isPartial = status === 'Partial';

      return {
        id: s.id,
        type: t('sales'),
        rawType: 'Sale',
        invoiceNo: s.invoiceNo || s.invoiceno || `INV-${s.id}`,
        partyName: s.partyName || s.partyname || s.customerName || 'Customer',
        date: s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'),
        rawDate: s.created_at || s.createdAt || s.date,
        amount: total.toLocaleString(),
        status: isPaid ? t('paid') : isPartial ? t('partial') : t('pending'),
        rawStatus: status
      };
    }),
    ...(purchases || []).map(p => {
      const { total, paid, due, status } = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
      const isPaid = status === 'Paid';
      const isPartial = status === 'Partial';

      return {
        id: p.id,
        type: t('purchases'),
        rawType: 'Purchase',
        invoiceNo: p.purchaseNo || p.purchaseno || `PUR-${p.id}`,
        partyName: p.supplier || p.supplierName || p.suppliername || 'Supplier',
        date: p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'),
        rawDate: p.created_at || p.createdAt || p.date,
        amount: total.toLocaleString(),
        status: isPaid ? t('paid') : isPartial ? t('partial') : t('pending'),
        rawStatus: status
      };
    })
  ].sort((a, b) => {
    const timeA = new Date(a.rawDate || 0).getTime() || Number(a.id) || 0;
    const timeB = new Date(b.rawDate || 0).getTime() || Number(b.id) || 0;
    return timeB - timeA;
  }).slice(0, 5);

  return (
    <div className={`border rounded-2xl p-5 card-shadow transition-colors ${
      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm">{t('recentTransactions')}</h3>
        </div>
        <Link to="/invoices" className="text-xs font-semibold text-brand-500 hover:underline">
          {t('viewAll')}
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
              theme === 'dark' ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-400'
            }`}>
              <th className="pb-3 px-2">{t('type')}</th>
              <th className="pb-3 px-2">{t('refNo')}</th>
              <th className="pb-3 px-2">{t('partyName')}</th>
              <th className="pb-3 px-2">{t('date')}</th>
              <th className="pb-3 px-2 text-right">{t('amount')}</th>
              <th className="pb-3 px-2 text-center">{t('status')}</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs ${
            theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
          }`}>
            {combined.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  {t('noTransactionsRecorded')}
                </td>
              </tr>
            ) : (
              combined.map((tx) => (
                <tr key={tx.id} className={`transition ${
                  theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                }`}>
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                      tx.rawType === 'Sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'
                    }`}>
                      {tx.rawType === 'Sale' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono font-semibold">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tx.invoiceNo}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-bold">{tx.partyName}</td>
                  <td className="py-3 px-2 text-slate-400">{tx.date}</td>
                  <td className="py-3 px-2 text-right font-extrabold">Rs. {tx.amount}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-xs font-bold uppercase ${
                      tx.rawStatus === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' :
                      tx.rawStatus === 'Partial' ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
