import React from 'react';
import { X, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const InvoiceDrawer = ({ invoice, onClose }) => {
  const { shop } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();

  if (!invoice) return null;

  const formatAmount = (val) => {
    if (typeof val === 'number') return val.toLocaleString();
    if (!val) return '0';
    const cleanStr = String(val).replace(/,/g, '');
    const parsed = Number(cleanStr);
    return isNaN(parsed) ? String(val) : parsed.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end p-0 md:p-4 overflow-y-auto">
      <div className={`w-full max-w-2xl min-h-full rounded-none md:rounded-3xl p-6 md:p-8 card-shadow space-y-6 flex flex-col justify-between overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
        <div>
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-extrabold rounded-full">
                {t('officialTaxInvoice')}
              </span>
              <span className="font-mono text-xs text-slate-400 font-semibold">{invoice.invoiceNo}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition cursor-pointer"
                title={t('print')}
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Invoice Header Branding */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6 mb-6">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-emerald-500">{shop?.name || t('mandiTrader')}</h2>
              <p className="text-xs text-slate-400 mt-1">{t('appSub')}</p>
              <p className="text-xs text-slate-400">{shop?.city || 'Galla Mandi, Pakistan'}</p>
            </div>
            <div className="sm:text-right">
              <div className="text-2xl font-black font-mono tracking-tight text-brand-500">{invoice.invoiceNo}</div>
              <div className="text-xs text-slate-400 mt-1">{t('date')}: <strong>{invoice.date}</strong></div>
              <div className="text-xs text-slate-400">{t('paymentTerms')}: <strong>{t('mandiLedger')}</strong></div>
            </div>
          </div>

          {/* Billed To Customer Info */}
          <div className={`p-4 rounded-2xl border mb-6 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('billedPartyCustomer')}</div>
            <div className="text-sm font-extrabold">{invoice.partyName}</div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}>
                <th className="py-2">{t('itemDescription')}</th>
                <th className="py-2 text-center">{t('unitWeight')}</th>
                <th className="py-2 text-right">{t('rate')} (Rs.)</th>
                <th className="py-2 text-right">{t('total')} (Rs.)</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {invoice.cart && invoice.cart.length > 0 ? (
                invoice.cart.map((item, idx) => {
                  const rateNum = Number(item.rate || item.price || 0);
                  const qtyNum = Number(item.qty || 1);
                  const lineTotal = Number(item.total) || (rateNum * qtyNum);
                  const unitStr = item.unitName || item.unit || t('kg');

                  return (
                    <tr key={idx}>
                      <td className="py-3 font-bold">{item.name}</td>
                      <td className="py-3 text-center font-semibold">{qtyNum} {unitStr}</td>
                      <td className="py-3 text-right font-mono">Rs. {rateNum.toLocaleString()} / {unitStr}</td>
                      <td className="py-3 text-right font-extrabold font-mono text-brand-500">Rs. {lineTotal.toLocaleString()}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-3 font-bold">{invoice.items || t('products')}</td>
                  <td className="py-3 text-center">{invoice.itemsCount || 1} {t('item')}</td>
                  <td className="py-3 text-right font-mono">Rs. {formatAmount(invoice.amount)}</td>
                  <td className="py-3 text-right font-extrabold font-mono">Rs. {formatAmount(invoice.amount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className={`w-full max-w-xs space-y-2 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>{t('grandTotal')}:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">Rs. {formatAmount(invoice.amount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-600">
                <span>{t('paid')}:</span>
                <span>Rs. {formatAmount(invoice.paidAmount !== undefined ? invoice.paidAmount : invoice.amount)}</span>
              </div>
              {Number(invoice.amount || 0) > Number(invoice.paidAmount || 0) && (
                <div className="flex justify-between text-xs font-extrabold text-rose-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>{t('remainingDueKhata')}:</span>
                  <span>Rs. {formatAmount(Number(invoice.amount || 0) - Number(invoice.paidAmount || 0))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
          <div className="text-slate-400 text-center sm:text-left">
            {t('computerGeneratedInvoice')}
          </div>
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> {t('Print Receipt')}
          </button>
        </div>
      </div>
    </div>
  );
};
