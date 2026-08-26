import React from 'react';
import { FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const RecentTransactionsTable = ({ onViewInvoice }) => {
  const { sales, purchases } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const combined = [
    ...(sales || []).map(s => {
      const amt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : (s.grandtotal !== undefined ? s.grandtotal : 0)));
      return {
        id: s.id,
        type: t('sales'),
        rawType: 'Sale',
        invoiceNo: s.invoiceNo || s.invoiceno || '',
        partyName: s.partyName || s.partyname || s.customerName || 'Customer',
        date: s.date || 'N/A',
        amount: amt.toLocaleString(),
        status: s.status === 'Paid' ? t('paid') : s.status === 'Partial' ? t('partial') : t('pending'),
        rawStatus: s.status || 'Pending'
      };
    }),
    ...(purchases || []).map(p => {
      const amt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : (p.grandtotal !== undefined ? p.grandtotal : 0)));
      const isPaid = (p.status || p.paymentStatus) === 'Paid';
      const isPartial = (p.status || p.paymentStatus) === 'Partial';
      return {
        id: p.id,
        type: t('purchases'),
        rawType: 'Purchase',
        invoiceNo: p.purchaseNo || p.purchaseno || '',
        partyName: p.supplier || p.supplierName || p.suppliername || 'Supplier',
        date: p.date || 'N/A',
        amount: amt.toLocaleString(),
        status: isPaid ? t('paid') : isPartial ? t('partial') : t('pending'),
        rawStatus: p.status || p.paymentStatus || 'Pending'
      };
    })
  ].slice(0, 5);

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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      tx.rawType === 'Sale' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-brand-500/10 text-brand-500 border border-brand-500/30'
                    }`}>
                      {tx.rawType === 'Sale' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono font-semibold">
                    <button 
                      onClick={() => onViewInvoice && onViewInvoice(tx)} 
                      className="flex items-center gap-1.5 hover:text-brand-500 hover:underline text-left cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {tx.invoiceNo}
                    </button>
                  </td>
                  <td className="py-3 px-2 font-bold">{tx.partyName}</td>
                  <td className="py-3 px-2 text-slate-400">{tx.date}</td>
                  <td className="py-3 px-2 text-right font-extrabold">Rs. {tx.amount}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      tx.rawStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' :
                      tx.rawStatus === 'Partial' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                      'bg-rose-500/10 text-rose-500 border border-rose-500/30'
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
