import React, { useState } from 'react';
import { RotateCcw, X, AlertCircle, CheckCircle2, DollarSign, Package, UserCheck, Printer } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const PurchaseReturnModal = ({ isOpen, onClose, selectedPurchase = null }) => {
  const { purchases, suppliers, products, recordPurchaseReturn } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [activePurchaseId, setActivePurchaseId] = useState(selectedPurchase?.id || (purchases[0]?.id || ''));
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [returnedQty, setReturnedQty] = useState(1);
  const [returnRate, setReturnRate] = useState(products[0]?.purchasePrice || 0);
  const [refundMode, setRefundMode] = useState('Ledger'); // 'Ledger' | 'Cash'
  const [reason, setReason] = useState('High Moisture / Katt Dispute');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  if (!isOpen) return null;

  const currentPurchase = purchases.find(p => p.id === activePurchaseId) || selectedPurchase;
  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];
  const unit = currentProduct?.unit || 'KG';

  // Calculate live return value
  const calculatedReturnTotal = Math.max(0, (Number(returnedQty) || 0) * (Number(returnRate) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !currentProduct || Number(returnedQty) <= 0) return;

    setIsSubmitting(true);
    try {
      const returnRecord = await recordPurchaseReturn({
        purchaseId: currentPurchase?.id || null,
        purchaseNo: currentPurchase?.purchaseNo || 'Direct Purchase Return',
        supplierId: currentPurchase?.supplierId || null,
        supplierName: currentPurchase?.supplierName || currentPurchase?.supplier || 'Supplier Firm',
        items: [{
          productId: currentProduct.id,
          name: currentProduct.name,
          qty: Number(returnedQty),
          rate: Number(returnRate),
          unit: unit,
          total: calculatedReturnTotal
        }],
        refundAmount: calculatedReturnTotal,
        refundMode,
        reason: `${reason}${notes ? ' - ' + notes : ''}`,
        date: new Date().toLocaleDateString('en-GB')
      });

      setCompletedReturn(returnRecord);
    } catch (err) {
      alert(err.message || 'Failed to process purchase return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !completedReturn) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className={`rounded-3xl max-w-lg w-full p-6 space-y-4 card-shadow border ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black">Process Purchase Return (Debit Note)</h3>
              <p className="text-[11px] text-slate-400 font-medium">Return rejected stock to supplier & adjust dues</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedReturn ? (
          /* Success Screen */
          <div className="space-y-4 text-center py-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Purchase Return Recorded!</h4>
              <p className="text-xs text-slate-400 mt-0.5">Debit Note #: <span className="font-mono font-black text-rose-500">{completedReturn.returnNo}</span></p>
            </div>

            <div className={`p-4 rounded-2xl border text-left text-xs space-y-2 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier Firm:</span>
                <span className="font-bold">{completedReturn.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purchase Ref:</span>
                <span className="font-mono font-bold text-brand-500">{completedReturn.purchaseNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Returned Item:</span>
                <span className="font-bold">{completedReturn.items[0]?.name} ({completedReturn.items[0]?.qty} {completedReturn.items[0]?.unit})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settlement Method:</span>
                <span className="font-bold">{completedReturn.refundMode === 'Ledger' ? 'Deducted from Supplier Khata' : 'Cash Received Back from Supplier'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm">
                <span>Total Return Value:</span>
                <span className="text-rose-500 font-mono">Rs. {completedReturn.refundAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className={`w-1/2 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Print Debit Note</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-black shadow-md transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Purchase Return Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Pick Purchase */}
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1">
                Associated Purchase Order
              </label>
              <select
                value={activePurchaseId}
                onChange={(e) => {
                  setActivePurchaseId(e.target.value);
                  const p = purchases.find(x => x.id === e.target.value);
                  if (p && p.items && p.items[0]) {
                    setSelectedProductId(p.items[0].productId || p.items[0].id);
                    setReturnRate(p.items[0].rate || p.items[0].price || 0);
                  }
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {purchases.length === 0 ? (
                  <option value="">Direct Return (No Purchase Orders)</option>
                ) : (
                  purchases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.purchaseNo} • {p.supplierName || p.supplier} (Rs. {p.amount || p.grandTotal})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Product To Deduct */}
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1">
                Product to Return to Supplier
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find(x => x.id === e.target.value);
                  if (p) setReturnRate(p.purchasePrice || 0);
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stockQty} {p.unit || 'KG'})
                  </option>
                ))}
              </select>
            </div>

            {/* Qty and Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-400 block mb-1">
                  Returned Quantity ({unit})
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={returnedQty}
                  onChange={(e) => setReturnedQty(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 block mb-1">
                  Purchase Rate / {unit} (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={returnRate}
                  onChange={(e) => setReturnRate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Settlement Mode */}
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1">
                Settlement Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMode('Ledger')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    refundMode === 'Ledger'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Deduct Supplier Payable</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMode('Cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    refundMode === 'Cash'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Cash Refund Received</span>
                </button>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1">
                Return Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="High Moisture / Katt Dispute">High Moisture / Katt Dispute</option>
                <option value="Low Grain Grade / Quality Rejection">Low Grain Grade / Quality Rejection</option>
                <option value="Damaged Bardana / Packing">Damaged Bardana / Packing</option>
                <option value="Incorrect Goods Shipped">Incorrect Goods Shipped</option>
                <option value="Other Disagreement">Other Custom Reason</option>
              </select>
            </div>

            {/* Live Total Banner */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-rose-700 dark:text-rose-400">Total Return Valuation:</span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                Rs. {calculatedReturnTotal.toLocaleString()}
              </span>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className={`w-1/2 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || calculatedReturnTotal <= 0}
                className="w-1/2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-black shadow-md transition cursor-pointer"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PurchaseReturnModal;
