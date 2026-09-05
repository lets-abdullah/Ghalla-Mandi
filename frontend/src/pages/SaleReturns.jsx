import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  RefreshCw,
  Plus,
  Printer,
  Wallet,
  Package,
  CreditCard,
  Receipt,
  FileText
} from 'lucide-react';
import { useERP, computeSaleFinancials, extractMerchandiseReturnValue } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { SaleReturnModal } from '../modals/SaleReturnModal';
import { ReturnReceiptModal } from '../modals/ReturnReceiptModal';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const SaleReturns = () => {
  const { sales = [], saleReturns = [], paymentLogs = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [selectedReceiptReturn, setSelectedReceiptReturn] = useState(null);

  const filteredReturns = useMemo(() => {
    return [...(saleReturns || [])].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }, [saleReturns]);

  // 1. Total Merchandise Sales Returned Value
  const totalReturnedSalesValue = useMemo(() => {
    return (saleReturns || []).reduce((sum, r) => sum + Number(extractMerchandiseReturnValue(r) || 0), 0);
  }, [saleReturns]);

  // 2. Total Actual Cash Refunds Paid Out to Customers
  const totalCashRefundsPaid = useMemo(() => {
    return (saleReturns || []).reduce((sum, r) => {
      const m = String(r.refundMode || r.mode || '').trim().toLowerCase();
      const isCredit = m === 'credit' || m === 'khata credit' || m === 'khata';
      const amt = Number(r.refundAmount !== undefined ? r.refundAmount : (r.refundamount !== undefined ? r.refundamount : (r.amount || 0)));
      if (!isCredit && amt > 0) return sum + amt;
      return sum;
    }, 0);
  }, [saleReturns]);

  return (
    <div className="space-y-6">
      {/* Page Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-orange-500" />
            <span>Sale Returns & Cash Refunds</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Record customer produce return items and calculate cash refund payouts vs due adjustments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-orange-500/20 cursor-pointer active:scale-98"
            title="Go to Sales to pick a sale to return"
          >
            <Plus className="w-4 h-4" />
            <span>Process Sale Return</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Screen Only) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Total Returned Sales */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-orange-500/30 text-white' : 'bg-gradient-to-b from-orange-50/50 to-white border-orange-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-orange-600" />
            <span>Total Returned Sales</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-orange-600 dark:text-orange-400">
            Rs. {Number(totalReturnedSalesValue || 0).toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">Returned produce restocked into inventory</div>
        </div>

        {/* 2. Direct Cash Payouts */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-rose-600" />
            <span>Total Cash Refunds Paid</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            Rs. {Number(totalCashRefundsPaid || 0).toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">Direct physical cash refunded out of pocket</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Sale Returns & Customer Refunds Statement"
        filterSummary="Direct Cash Refunds vs Due Adjustments"
        stats={[
          { label: 'Total Returns', value: filteredReturns.length },
          { label: 'Total Return Value', value: `Rs. ${Number(totalReturnedSalesValue || 0).toLocaleString()}` },
          { label: 'Cash Refunds Paid', value: `Rs. ${Number(totalCashRefundsPaid || 0).toLocaleString()}` }
        ]}
      />

      {/* Returns Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Return Value</th>
                <th className="py-3 px-4 text-right">Cash Refund Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                    No sale returns recorded yet.
                  </td>
                </tr>
              ) : (
                filteredReturns.map(ret => {
                  const retMerchValue = Number(extractMerchandiseReturnValue(ret) || 0);
                  const m = String(ret.refundMode || ret.mode || '').trim().toLowerCase();
                  const isCredit = m === 'credit' || m === 'khata credit' || m === 'khata';
                  const retAmt = Number(ret.refundAmount !== undefined ? ret.refundAmount : (ret.refundamount !== undefined ? ret.refundamount : (ret.amount || 0)));
                  const cashRefundPaid = !isCredit ? retAmt : 0;

                  return (
                    <tr key={ret.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">{ret.returnNo}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs">{ret.date}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{ret.invoiceNo || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ret.customerName || 'Customer'}</td>
                      <td className="py-3 px-4 text-right font-black font-mono text-purple-600 dark:text-purple-400">
                        Rs. {retMerchValue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                        Rs. {cashRefundPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-extrabold text-xs ${cashRefundPaid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                          {cashRefundPaid > 0 ? 'Cash Refunded' : 'Due Adjusted'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <button
                          onClick={() => setSelectedReceiptReturn(ret)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white transition cursor-pointer text-xs font-bold active:scale-98 shadow-xs"
                          title="View & Print Sale Return Receipt Voucher"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Return Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Footer */}
      <PrintFooter note="Official Business Record • Ghalla Mandi Sale Returns Register" />

      {/* Sale Return Voucher Receipt Modal */}
      {selectedReceiptReturn && (
        <ReturnReceiptModal
          isOpen={!!selectedReceiptReturn}
          onClose={() => setSelectedReceiptReturn(null)}
          returnData={selectedReceiptReturn}
          type="SaleReturn"
        />
      )}

      {/* Sale Return Process Modal */}
      {showModal && (
        <SaleReturnModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default SaleReturns;
