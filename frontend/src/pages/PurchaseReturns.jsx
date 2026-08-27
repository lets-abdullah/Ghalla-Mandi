import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, RefreshCw, Plus, Printer, CheckCircle2, DollarSign, Package, Clock, Edit3, X, CreditCard } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PurchaseReturnModal } from '../components/PurchaseReturnModal';

export const PurchaseReturns = () => {
  const { purchaseReturns = [], updatePurchaseReturn } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [modeFilter, setModeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);

  // Edit Return State
  const [editingReturn, setEditingReturn] = useState(null);
  const [editForm, setEditForm] = useState({
    refundAmount: 0,
    refundMode: 'Cash',
    reason: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEdit = (ret) => {
    setEditingReturn(ret);
    setEditForm({
      refundAmount: Number(ret.refundAmount || 0),
      refundMode: ret.refundMode || 'Cash',
      reason: ret.reason || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReturn) return;
    try {
      setIsSavingEdit(true);
      if (updatePurchaseReturn) {
        await updatePurchaseReturn(editingReturn.id, {
          refundAmount: Number(editForm.refundAmount) || 0,
          refundMode: editForm.refundMode,
          reason: editForm.reason
        });
      }
      setEditingReturn(null);
    } catch (err) {
      alert(err.message || 'Failed to update purchase return');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-rose-500" />
            <span>Purchase Returns</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Record and manage goods returned to suppliers, refunds, and balance deductions
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
            onClick={() => navigate('/purchases')}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-rose-500/20 cursor-pointer active:scale-98"
            title="Go to Purchases to pick a purchase to return"
          >
            <Plus className="w-4 h-4" />
            <span>Process Purchase Return</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Total Returned Stock</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            Rs. {totalReturnAmount.toLocaleString()}
          </div>
        </div>

        <div className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Cash Received from Suppliers</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            Rs. {totalCashRefunds.toLocaleString()}
          </div>
        </div>

        <div
          onClick={() => navigate('/ledger?type=Supplier')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'}`}
          title="Click to view Supplier Ledgers"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Supplier Dues Deducted</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalPayablesDeducted.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`border rounded-2xl p-4 card-shadow flex items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400">Filter By Mode:</label>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className={`border rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="All">All Return Modes</option>
            <option value="Cash">Cash Refunds</option>
            <option value="Ledger">Supplier Dues Deducted</option>
          </select>
        </div>

        {modeFilter !== 'All' && (
          <button
            type="button"
            onClick={() => setModeFilter('All')}
            className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        )}
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
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Purchase #</th>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4 text-center">Mode</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
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
                    <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">{ret.returnNo}</td>
                    <td className="py-3 px-4 text-slate-500">{ret.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ret.supplierName}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{ret.purchaseNo}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {ret.items && ret.items[0] ? `${ret.items[0].name} (${ret.items[0].qty} ${ret.items[0].unit})` : 'Item'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                      {ret.refundMode === 'Cash' ? 'Cash' : 'Khata'}
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-rose-600 dark:text-rose-400">
                      Rs. {Number(ret.refundAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(ret)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition cursor-pointer text-xs font-bold"
                        title="Edit Return Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Purchase Return Modal */}
      {editingReturn && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingReturn(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Edit Purchase Return</h3>
                  <p className="text-[11px] text-slate-400 font-bold font-mono">{editingReturn.returnNo} - {editingReturn.supplierName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingReturn(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Refund Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editForm.refundAmount}
                  onChange={(e) => setEditForm({ ...editForm, refundAmount: e.target.value })}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-rose-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Refund Mode</label>
                <select
                  value={editForm.refundMode}
                  onChange={(e) => setEditForm({ ...editForm, refundMode: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-rose-500 cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Cash">Cash Received</option>
                  <option value="Ledger">Khata / Supplier Payable Adjustment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Return Reason / Notes</label>
                <input
                  type="text"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  placeholder="e.g. Quality rejection, supplier return"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-rose-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setEditingReturn(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="w-1/2 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-rose-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
