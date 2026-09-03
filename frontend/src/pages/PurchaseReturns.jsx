import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  RefreshCw,
  Plus,
  Printer,
  DollarSign,
  Package,
  CreditCard,
  Receipt,
  FileText
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PurchaseReturnModal } from '../modals/PurchaseReturnModal';
import { ReturnReceiptModal } from '../modals/ReturnReceiptModal';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const PurchaseReturns = () => {
  const { purchaseReturns = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [modeFilter, setModeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedReceiptReturn, setSelectedReceiptReturn] = useState(null);

  const filteredReturns = purchaseReturns.filter(ret => {
    if (modeFilter === 'Cash' && ret.refundMode !== 'Cash') return false;
    if (modeFilter === 'Ledger' && ret.refundMode !== 'Ledger') return false;
    return true;
  }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  const totalReturnAmount = purchaseReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const totalCashRefunds = purchaseReturns.filter(r => r.refundMode === 'Cash').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const totalPayablesDeducted = purchaseReturns.filter(r => r.refundMode === 'Ledger').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-rose-500" />
            <span>Purchase Returns</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Record supplier commodity returns, cash refunds, and Khata liability deductions
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
            onClick={() => navigate('/purchases')}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-rose-500/20 cursor-pointer active:scale-98"
            title="Go to Purchases to pick a purchase to return"
          >
            <Plus className="w-4 h-4" />
            <span>Process Purchase Return</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Screen Only) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Total Returned Stock */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Total Returned Stock</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            Rs. {totalReturnAmount.toLocaleString()}
          </div>
        </div>

        {/* 2. Cash Received */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Cash Received</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            Rs. {totalCashRefunds.toLocaleString()}
          </div>
        </div>

        {/* 3. Supplier Dues Deducted */}
        <div
          onClick={() => navigate('/ledger?type=Supplier')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'}`}
          title="Click to view Supplier Ledgers"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Khata Dues Adjusted</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalPayablesDeducted.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Screen Only) */}
      <div className={`no-print border rounded-2xl p-3.5 sm:p-4 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-brand-500" />
              <span>Filter By Return Mode</span>
            </label>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Return Modes</option>
              <option value="Cash">Cash Refunds</option>
              <option value="Ledger">Khata Adjustments</option>
            </select>
          </div>

          {modeFilter !== 'All' && (
            <button
              onClick={() => setModeFilter('All')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition cursor-pointer self-end"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Purchase Returns & Adjustments Statement"
        filterSummary={`Return Mode: ${modeFilter}`}
        stats={[
          { label: 'Total Returns', value: filteredReturns.length },
          { label: 'Total Return Value', value: `Rs. ${totalReturnAmount.toLocaleString()}` },
          { label: 'Cash Refunds Received', value: `Rs. ${totalCashRefunds.toLocaleString()}` },
          { label: 'Khata Dues Adjusted', value: `Rs. ${totalPayablesDeducted.toLocaleString()}` }
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
                <th className="py-3 px-4">Bill #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Return Amount</th>
                <th className="py-3 px-4 text-right">Cash Refund Received</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                    No purchase returns recorded yet.
                  </td>
                </tr>
              ) : (
                filteredReturns.map(ret => {
                  const retAmt = Number(ret.refundAmount || 0);
                  const cashRefund = ret.refundMode === 'Cash' ? retAmt : 0;

                  return (
                    <tr key={ret.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">{ret.returnNo}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs">{ret.date}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{ret.purchaseNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ret.supplierName}</td>
                      <td className="py-3 px-4 text-right font-black font-mono text-purple-600 dark:text-purple-400">
                        Rs. {retAmt.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                        Rs. {cashRefund.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                          Cash Received
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <button
                          onClick={() => setSelectedReceiptReturn(ret)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white transition cursor-pointer text-xs font-bold active:scale-98 shadow-xs"
                          title="View & Print Purchase Return Receipt Voucher"
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
      <PrintFooter note="Official Business Record • Ghalla Mandi Purchase Returns Register" />

      {/* Purchase Return Voucher Receipt Modal */}
      {selectedReceiptReturn && (
        <ReturnReceiptModal
          isOpen={!!selectedReceiptReturn}
          onClose={() => setSelectedReceiptReturn(null)}
          returnData={selectedReceiptReturn}
          type="PurchaseReturn"
        />
      )}

      {/* Purchase Return Process Modal */}
      {showModal && (
        <PurchaseReturnModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default PurchaseReturns;
