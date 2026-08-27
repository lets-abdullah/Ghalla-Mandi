import React, { useState, useEffect } from 'react';
import { RotateCcw, X, AlertCircle, CheckCircle2, DollarSign, Package, UserCheck, Printer } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const PurchaseReturnModal = ({ isOpen, onClose, initialPurchase = null, selectedPurchase = null }) => {
  const { purchases = [], suppliers = [], products = [], recordPurchaseReturn } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const purchase = initialPurchase || selectedPurchase || purchases[0] || null;

  // Extract items from purchase
  const purchaseItems = Array.isArray(purchase?.cart) && purchase.cart.length > 0 
    ? purchase.cart 
    : (Array.isArray(purchase?.items) && purchase.items.length > 0 
        ? purchase.items 
        : [{
            productId: purchase?.productId,
            name: purchase?.productName || (typeof purchase?.items === 'string' ? purchase.items : 'Commodity Item'),
            qty: Number(purchase?.qty || purchase?.qtyKg || 1),
            rate: Number(purchase?.rate || purchase?.purchasePrice || (purchase?.amount ? purchase.amount / (purchase.qty || 1) : 0)),
            unit: purchase?.unit || purchase?.unitName || 'KG',
            returnedQty: Number(purchase?.returnedQty || 0)
          }]);

  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [returnQty, setReturnQty] = useState(1);
  const [returnRate, setReturnRate] = useState(0);
  const [refundMode, setRefundMode] = useState('Ledger'); // 'Ledger' | 'Cash'
  const [reason, setReason] = useState('High Moisture / Katt Dispute');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  // Sync with selected purchase
  useEffect(() => {
    if (purchase && purchaseItems.length > 0) {
      const it = purchaseItems[0] || {};
      const origQty = Number(it.qty || it.enteredQty || 1);
      const prevReturned = Number(it.returnedQty || 0);
      const availableToReturn = Math.max(1, origQty - prevReturned);
      const itRate = Number(it.rate || it.price || it.ratePerEnteredUnit || 0);

      setSelectedItemIdx(0);
      setReturnQty(availableToReturn > 0 ? availableToReturn : 1);
      setReturnRate(itRate);
      setCompletedReturn(null);
    }
  }, [purchase]);

  if (!isOpen) return null;

  const currentItem = purchaseItems[selectedItemIdx] || purchaseItems[0] || {};
  const origPurchasedQty = Number(currentItem.qty || currentItem.enteredQty || 1);
  const alreadyReturned = Number(currentItem.returnedQty || 0);
  const maxReturnableQty = Math.max(0, origPurchasedQty - alreadyReturned);
  const itemUnit = currentItem.unit || currentItem.unitName || purchase?.unit || 'KG';

  // Live return amount calculation
  const calculatedRefundTotal = Math.max(0, (Number(returnQty) || 0) * (Number(returnRate) || 0));

  const handleItemSelect = (idx) => {
    setSelectedItemIdx(idx);
    const it = purchaseItems[idx] || {};
    const itQty = Number(it.qty || it.enteredQty || 1);
    const itPrevRet = Number(it.returnedQty || 0);
    const itMax = Math.max(1, itQty - itPrevRet);
    const itRate = Number(it.rate || it.price || 0);

    setReturnQty(itMax > 0 ? itMax : 1);
    setReturnRate(itRate);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numReturnQty = Number(returnQty);
    if (numReturnQty <= 0) {
      alert('Return quantity must be greater than zero.');
      return;
    }

    if (maxReturnableQty > 0 && numReturnQty > maxReturnableQty) {
      alert(`Return quantity cannot exceed purchased returnable quantity (${maxReturnableQty} ${itemUnit}).`);
      return;
    }

    const prodId = currentItem.productId || currentItem.id || purchase?.productId || null;
    const supId = purchase?.supplierId || null;
    const supName = purchase?.supplierName || purchase?.supplier || 'Supplier Firm';

    setIsSubmitting(true);
    try {
      const returnRecord = await recordPurchaseReturn({
        purchaseId: purchase?.id || null,
        purchaseNo: purchase?.purchaseNo || purchase?.purchaseno || 'PUR-RETURN',
        supplierId: supId,
        supplierName: supName,
        items: [{
          productId: prodId,
          name: currentItem.name || currentItem.productName || 'Commodity Item',
          qty: numReturnQty,
          rate: Number(returnRate),
          unit: itemUnit,
          total: calculatedRefundTotal
        }],
        refundAmount: calculatedRefundTotal,
        refundMode,
        reason: `${reason}${notes ? ' - ' + notes : ''}`,
        date: new Date().toLocaleDateString('en-GB')
      });

      setCompletedReturn(returnRecord);
    } catch (err) {
      console.error('Failed to process purchase return:', err);
      alert(err.message || 'Failed to process purchase return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !completedReturn) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className={`rounded-3xl max-w-lg w-full p-6 space-y-4 card-shadow border my-6 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black">Process Purchase Return (Debit Note)</h3>
              <p className="text-[10px] text-slate-400 font-bold">Return goods to supplier & adjust dues/cash</p>
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
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Purchase Return Recorded!</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Debit Note #: <span className="font-mono font-black text-rose-500">{completedReturn.returnNo}</span>
              </p>
            </div>

            <div className={`p-4 rounded-2xl border text-left text-xs space-y-2 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="font-bold">{completedReturn.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Purchase #:</span>
                <span className="font-mono font-bold text-brand-500">{completedReturn.purchaseNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Returned Item:</span>
                <span className="font-bold">{completedReturn.items[0]?.name} ({completedReturn.items[0]?.qty} {completedReturn.items[0]?.unit})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settlement Method:</span>
                <span className="font-bold">{completedReturn.refundMode === 'Ledger' ? 'Deducted from Supplier Khata' : 'Cash Received Back'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm">
                <span>Total Return Amount:</span>
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
          /* Pre-filled Purchase Return Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Purchase & Supplier Context Banner */}
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Selected Purchase:</span>
                <span className="font-mono font-black text-brand-500 text-xs">{purchase?.purchaseNo || purchase?.purchaseno || 'PUR-ORIGINAL'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Supplier Firm:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{purchase?.supplierName || purchase?.supplier || 'Supplier'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Purchase Date:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{purchase?.date || 'N/A'}</span>
              </div>
            </div>

            {/* Select Item to Return if multi-item */}
            {purchaseItems.length > 1 && (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Select Purchased Item to Return
                </label>
                <select
                  value={selectedItemIdx}
                  onChange={(e) => handleItemSelect(Number(e.target.value))}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {purchaseItems.map((it, idx) => (
                    <option key={idx} value={idx}>
                      {it.name || it.productName} ({it.qty || it.enteredQty} {it.unit || 'KG'}) — Rate: Rs. {it.rate || it.price}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Return Quantity & Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-400">
                    Return Qty ({itemUnit}) *
                  </label>
                  {maxReturnableQty > 0 && (
                    <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                      Max: {maxReturnableQty}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0.1"
                  max={maxReturnableQty > 0 ? maxReturnableQty : undefined}
                  step="any"
                  required
                  value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Purchase Rate / {itemUnit} (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={returnRate}
                  onChange={(e) => setReturnRate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Settlement Method */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Settlement Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMode('Ledger')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    refundMode === 'Ledger'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Deduct Supplier Khata</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMode('Cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    refundMode === 'Cash'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Cash Received Back</span>
                </button>
              </div>
            </div>

            {/* Return Reason */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Return Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
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

            {/* Live Total Refund Banner */}
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Total Return Refund Amount:</span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                Rs. {calculatedRefundTotal.toLocaleString()}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
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
                disabled={isSubmitting || calculatedRefundTotal <= 0}
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
