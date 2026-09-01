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
import { SaleReturnModal } from '../modals/SaleReturnModal';
import { ReturnReceiptModal } from '../modals/ReturnReceiptModal';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const SaleReturns = () => {
  const { saleReturns = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [modeFilter, setModeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedReceiptReturn, setSelectedReceiptReturn] = useState(null);

  const filteredReturns = saleReturns.filter(ret => {
    if (modeFilter === 'Cash' && ret.refundMode !== 'Cash') return false;
    if (modeFilter === 'Ledger' && ret.refundMode !== 'Ledger') return false;
    return true;
  }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  const totalRefundAmount = saleReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const totalCashRefunds = saleReturns.filter(r => r.refundMode === 'Cash').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const totalKhataAdjustments = saleReturns.filter(r => r.refundMode === 'Ledger').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-orange-500" />
            <span>Sale Returns</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Record and manage customer return items, cash refunds, and Khata adjustments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
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
      <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Total Returned Stock */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-orange-500/30 text-white' : 'bg-gradient-to-b from-orange-50/50 to-white border-orange-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-orange-600" />
            <span>Total Returned Sales</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-orange-600 dark:text-orange-400">
            Rs. {totalRefundAmount.toLocaleString()}
          </div>
        </div>

        {/* 2. Cash Payouts */}
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-600" />
            <span>Cash Payouts</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            Rs. {totalCashRefunds.toLocaleString()}
          </div>
        </div>

        {/* 3. Khata Dues Deducted */}
        <div
          onClick={() => navigate('/ledger')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'}`}
          title="Click to view Customer Ledgers"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Khata Dues Deducted</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalKhataAdjustments.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Screen Only) */}
      <div className={`no-print border rounded-2xl p-3.5 sm:p-4 card-shadow ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
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
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[38px] ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
        title="Sale Returns & Customer Refunds Statement"
        filterSummary={`Return Mode: ${modeFilter}`}
        stats={[
          { label: 'Total Returns', value: filteredReturns.length },
          { label: 'Total Refund Value', value: `Rs. ${totalRefundAmount.toLocaleString()}` },
          { label: 'Cash Refunds Paid', value: `Rs. ${totalCashRefunds.toLocaleString()}` },
          { label: 'Khata Balance Adjusted', value: `Rs. ${totalKhataAdjustments.toLocaleString()}` }
        ]}
      />

      {/* Returns Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4 text-center">Mode</th>
                <th className="py-3 px-4 text-right">Amount</th>
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
                filteredReturns.map(ret => (
                  <tr key={ret.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">{ret.returnNo}</td>
                    <td className="py-3 px-4 text-slate-500">{ret.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ret.customerName}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{ret.invoiceNo}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {ret.items && ret.items[0] ? `${ret.items[0].name} (${ret.items[0].qty} ${ret.items[0].unit})` : 'Item'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                      {ret.refundMode === 'Cash' ? 'Cash' : 'Khata'}
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-orange-600 dark:text-orange-400">
                      Rs. {Number(ret.refundAmount || 0).toLocaleString()}
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
                ))
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
