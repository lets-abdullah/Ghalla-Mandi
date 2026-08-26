import React, { useState } from 'react';
import { RotateCcw, Search, Plus, Printer, CheckCircle2, DollarSign, Package } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PurchaseReturnModal } from '../components/PurchaseReturnModal';

export const PurchaseReturns = () => {
  const { purchaseReturns = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filteredReturns = purchaseReturns.filter(ret => {
    const matchSearch =
      (ret.returnNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (ret.supplierName || '').toLowerCase().includes(search.toLowerCase()) ||
      (ret.purchaseNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (ret.reason || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalReturnAmount = purchaseReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const totalCashRefunds = purchaseReturns.filter(r => r.refundMode === 'Cash').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const totalPayablesDeducted = purchaseReturns.filter(r => r.refundMode === 'Ledger').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-slate-800 dark:text-slate-200" />
            <span>Purchase Returns (Debit Notes)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Supplier rejections history, stock deduction records, and debit vouchers
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
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Process Purchase Return</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Debit Valuation</div>
          <div className="text-2xl font-black mt-1.5 text-slate-900 dark:text-white font-mono">Rs. {totalReturnAmount.toLocaleString()}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">{purchaseReturns.length} Return Records</div>
        </div>

        <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Supplier Dues Deducted</div>
          <div className="text-2xl font-black mt-1.5 text-slate-900 dark:text-white font-mono">Rs. {totalPayablesDeducted.toLocaleString()}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Supplier Ledger Reductions</div>
        </div>

        <div className={`p-5 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash Received Back</div>
          <div className="text-2xl font-black mt-1.5 text-slate-900 dark:text-white font-mono">Rs. {totalCashRefunds.toLocaleString()}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Cash Returned by Suppliers</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`border rounded-2xl p-4 card-shadow flex items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search debit #, supplier, purchase #, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-slate-800 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Purchase Returns Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3 px-4">Debit #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier Firm</th>
                <th className="py-3 px-4">Associated Purchase</th>
                <th className="py-3 px-4">Returned Commodity</th>
                <th className="py-3 px-4">Settlement Mode</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-right">Debit Valuation</th>
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
                filteredReturns.map(ret => (
                  <tr key={ret.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{ret.returnNo}</td>
                    <td className="py-3.5 px-4 text-slate-500">{ret.date}</td>
                    <td className="py-3.5 px-4 font-bold">{ret.supplierName}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-slate-300">{ret.purchaseNo}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {ret.items && ret.items[0] ? `${ret.items[0].name} (${ret.items[0].qty} ${ret.items[0].unit})` : 'Commodity Item'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                        ret.refundMode === 'Cash' ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                      }`}>
                        {ret.refundMode === 'Cash' ? 'Cash Received' : 'Supplier Khata Deducted'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">{ret.reason}</td>
                    <td className="py-3.5 px-4 text-right font-bold font-mono text-slate-900 dark:text-white">
                      Rs. {Number(ret.refundAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Return Modal */}
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
