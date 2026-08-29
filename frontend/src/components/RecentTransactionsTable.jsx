import React from 'react';
import { FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const RecentTransactionsTable = ({ onViewInvoice }) => {
  const { sales = [], purchases = [], paymentLogs = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const combined = [
    ...(sales || []).map(s => {
      const upfrontPaid = Number(s.paidAmount ?? s.paidamount ?? (s.status === 'Paid' ? (s.amount ?? s.grandTotal ?? s.grandtotal ?? 0) : 0));
      const directPaid = (paymentLogs || []).filter(p =>
        (p.type === 'Customer' || p.partyType === 'Customer') &&
        (
          (s.customerId && p.partyId && String(p.partyId) === String(s.customerId)) ||
          (s.partyName && p.partyName && p.partyName.trim().toLowerCase() === (s.partyName || '').trim().toLowerCase()) ||
          (s.id && p.saleId && String(p.saleId) === String(s.id)) ||
          (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
        )
      ).reduce((acc, p) => acc + Number(p.amount || 0), 0);

      const total = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? 0);
      const retAmt = Number(s.returnAmount || 0);
      const netTotal = Math.max(0, total - retAmt);
      const paid = Math.min(netTotal, upfrontPaid + directPaid);
      const due = Math.max(0, netTotal - paid);
      const isPaid = (due === 0 && total > 0) || s.status === 'Paid';
      const isPartial = !isPaid && paid > 0;

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
        rawStatus: isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'
      };
    }),
    ...(purchases || []).map(p => {
      const upfrontPaid = Number(p.paidAmount ?? p.paidamount ?? (p.paymentStatus === 'Paid' ? (p.amount ?? p.grandTotal ?? p.grandtotal ?? 0) : 0));
      const directPaid = (paymentLogs || []).filter(pl =>
        (pl.type === 'Supplier' || pl.partyType === 'Supplier') &&
        (
          (p.supplierId && pl.partyId && String(pl.partyId) === String(p.supplierId)) ||
          (p.supplier && pl.partyName && pl.partyName.trim().toLowerCase() === (p.supplier || '').trim().toLowerCase()) ||
          (p.id && pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
          (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
        )
      ).reduce((acc, pl) => acc + Number(pl.amount || 0), 0);

      const total = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0);
      const retAmt = Number(p.returnAmount || 0);
      const netTotal = Math.max(0, total - retAmt);
      const paid = Math.min(netTotal, upfrontPaid + directPaid);
      const due = Math.max(0, netTotal - paid);
      const isPaid = (due === 0 && total > 0) || p.paymentStatus === 'Paid';
      const isPartial = !isPaid && paid > 0;

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
        rawStatus: isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'
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
