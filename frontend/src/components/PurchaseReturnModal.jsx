import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Package, 
  UserCheck, 
  Printer,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const PurchaseReturnModal = ({ isOpen, onClose, initialPurchase = null, selectedPurchase = null }) => {
  const { purchases = [], suppliers = [], purchaseReturns = [], recordPurchaseReturn } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const purchase = initialPurchase || selectedPurchase || purchases[0] || null;

  // Extract purchase items and calculate exact remaining quantities
  const purchaseItems = useMemo(() => {
    if (!purchase) return [];
    
    if (Array.isArray(purchase.cart) && purchase.cart.length > 0) {
      return purchase.cart.map((it, idx) => {
        const origQty = Number(it.qty || it.enteredQty || 1);
        const matchingReturnsQty = (purchaseReturns || [])
          .filter(r => (r.purchaseId === purchase.id || r.purchaseNo === purchase.purchaseNo))
          .reduce((sum, r) => {
            const rItem = (r.items || []).find(ri => 
              (ri.productId && ri.productId === (it.productId || it.id)) ||
              (ri.name && ri.name === it.name)
            );
            return sum + (rItem ? Number(rItem.qty || 0) : 0);
          }, 0);

        const alreadyRet = Math.max(Number(it.returnedQty || 0), matchingReturnsQty);
        const remaining = Math.max(0, origQty - alreadyRet);
        const rate = Number(it.rate || it.price || it.ratePerEnteredUnit || (it.total / (origQty || 1)) || 0);

        return {
          id: it.id || `item-${idx}`,
          productId: it.productId || it.id || null,
          name: it.name || 'Commodity Item',
          unit: it.unit || it.unitName || purchase.unit || 'KG',
          originalQty: origQty,
          alreadyReturnedQty: alreadyRet,
          remainingQty: remaining,
          rate: rate
        };
      });
    }

    // Flat purchase
    const origQty = Number(purchase.qty || purchase.weight || purchase.itemsCount || 1);
    const matchingReturnsQty = (purchaseReturns || [])
      .filter(r => (r.purchaseId === purchase.id || r.purchaseNo === purchase.purchaseNo))
      .reduce((sum, r) => {
        const rItem = (r.items || [])[0];
        return sum + (rItem ? Number(rItem.qty || 0) : 0);
      }, 0);

    const alreadyRet = Math.max(Number(purchase.returnedQty || 0), matchingReturnsQty);
    const remaining = Math.max(0, origQty - alreadyRet);
    const totalAmt = Number(purchase.amount || purchase.grandTotal || 0);
    const rate = Number(purchase.rate || (origQty > 0 ? (totalAmt / origQty) : 0));

    return [{
      id: 'flat-pur-1',
      productId: purchase.productId || null,
      name: purchase.productName || (typeof purchase.items === 'string' ? purchase.items : 'Procured Commodity'),
      unit: purchase.unit || 'KG',
      originalQty: origQty,
      alreadyReturnedQty: alreadyRet,
      remainingQty: remaining,
      rate: rate
    }];
  }, [purchase, purchaseReturns]);

  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [returnQty, setReturnQty] = useState('');
  const [reason, setReason] = useState('High Moisture / Katt Dispute');
  const [refundMode, setRefundMode] = useState('Ledger'); // 'Ledger' | 'Cash'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  // Sync state whenever purchase or items change
  useEffect(() => {
    if (purchaseItems.length > 0) {
      const it = purchaseItems[selectedItemIdx] || purchaseItems[0];
      setSelectedItemIdx(0);
      setReturnQty(it.remainingQty > 0 ? it.remainingQty : 0);
      setCompletedReturn(null);
    }
  }, [purchase, purchaseItems.length]);

  if (!isOpen || !purchase) return null;

  const currentItem = purchaseItems[selectedItemIdx] || purchaseItems[0] || {};
  const origQty = Number(currentItem.originalQty || 0);
  const alreadyReturned = Number(currentItem.alreadyReturnedQty || 0);
  const remainingQty = Number(currentItem.remainingQty || 0);
  const itemRate = Number(currentItem.rate || 0);
  const itemUnit = currentItem.unit || 'KG';

  const numReturnQty = parseFloat(returnQty) || 0;
  const refundAmount = Math.max(0, numReturnQty * itemRate);
  const isFullyReturned = remainingQty <= 0;

  const handleItemSelect = (idx) => {
    setSelectedItemIdx(idx);
    const it = purchaseItems[idx] || {};
    setReturnQty(it.remainingQty > 0 ? it.remainingQty : 0);
  };

  const handleSetMaxQty = () => {
    setReturnQty(remainingQty);
  };

  const handleQtyChange = (val) => {
    if (val === '') {
      setReturnQty('');
      return;
    }
    let parsed = parseFloat(val);
    if (isNaN(parsed)) parsed = 0;
    if (parsed < 0) parsed = 0;
    if (parsed > remainingQty) parsed = remainingQty;
    setReturnQty(parsed);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || numReturnQty <= 0 || isFullyReturned) return;

    if (numReturnQty > remainingQty) {
      alert(`Return quantity cannot exceed remaining returnable quantity (${remainingQty} ${itemUnit}).`);
      return;
    }

    const supId = purchase.supplierId || null;
    const supName = purchase.supplierName || purchase.supplier || 'Supplier Firm';

    setIsSubmitting(true);
    try {
      const returnRecord = await recordPurchaseReturn({
        purchaseId: purchase.id || null,
        purchaseNo: purchase.purchaseNo || purchase.purchaseno || 'PUR-RETURN',
        supplierId: supId,
        supplierName: supName,
        items: [{
          productId: currentItem.productId || null,
          name: currentItem.name,
          qty: numReturnQty,
          unit: itemUnit,
          rate: itemRate,
          total: refundAmount
        }],
        refundAmount: refundAmount,
        refundMode: refundMode,
        reason: reason,
        date: new Date().toLocaleDateString('en-GB')
      });

      setCompletedReturn({
        ...returnRecord,
        remainingAfter: Math.max(0, remainingQty - numReturnQty),
        unit: itemUnit,
        productName: currentItem.name
      });
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
      <div className={`rounded-3xl max-w-lg w-full p-6 space-y-4 card-shadow border my-6 transition-all ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Process Purchase Return (Debit Note)</h3>
              <p className="text-[11px] text-slate-400 font-bold">Return goods to supplier & adjust dues/cash</p>
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
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Purchase Return Recorded!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Debit Note <span className="font-mono font-bold text-brand-500">#{completedReturn.returnNo}</span> has been processed.
              </p>
            </div>

            {/* Summary Card */}
            <div className={`border rounded-2xl p-4 text-left space-y-2 text-xs ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="font-bold">{purchase.supplier || purchase.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Returned Product:</span>
                <span className="font-bold">{completedReturn.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Returned Quantity:</span>
                <span className="font-bold text-rose-500">{numReturnQty} {completedReturn.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="font-bold text-emerald-500">{completedReturn.remainingAfter} {completedReturn.unit}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-600 dark:text-slate-300">Debit Adjustment Amount:</span>
                <span className="font-black text-sm font-mono text-brand-500">Rs. {refundAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Debit Note</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Close & Done
              </button>
            </div>
          </div>
        ) : (
          /* Main 5-Step Return Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* STEP 1: ORIGINAL TRANSACTION DETAILS */}
            <div className={`border rounded-2xl p-3.5 space-y-2 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-brand-500" />
                <span>1. Original Purchase Details</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Supplier / Firm</span>
                  <span className="font-extrabold text-slate-800 dark:text-white truncate block">
                    {purchase.supplier || purchase.supplierName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Purchase #</span>
                  <span className="font-mono font-bold text-brand-500 block">
                    {purchase.purchaseNo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Rate / Price</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white block">
                    Rs. {itemRate.toLocaleString()} / {itemUnit}
                  </span>
                </div>
              </div>

              {/* Multi-item selector if purchase has more than 1 item */}
              {purchaseItems.length > 1 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Item to Return:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {purchaseItems.map((it, idx) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handleItemSelect(idx)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          selectedItemIdx === idx
                            ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                        }`}
                      >
                        {it.name} ({it.remainingQty} {it.unit} left)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: REMAINING QUANTITY HIGHLIGHT CARD */}
            <div className={`border rounded-2xl p-4 ${
              isFullyReturned 
                ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700' 
                : 'bg-gradient-to-r from-brand-500/10 via-emerald-500/10 to-transparent border-brand-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    2. Returnable Balance
                  </span>
                  <div className="text-2xl font-black font-mono mt-0.5 text-slate-900 dark:text-white flex items-baseline gap-1.5">
                    <span className={isFullyReturned ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {remainingQty} {itemUnit}
                    </span>
                    <span className="text-xs font-bold text-slate-400">Remaining</span>
                  </div>
                </div>

                {/* 3-Part Quantity Pill */}
                <div className="text-right text-[11px] font-bold space-y-0.5">
                  <div className="text-slate-500">Original Qty: <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{origQty} {itemUnit}</span></div>
                  <div className="text-purple-600 dark:text-purple-400">Already Returned: <span className="font-mono font-extrabold">{alreadyReturned} {itemUnit}</span></div>
                </div>
              </div>

              {isFullyReturned && (
                <div className="mt-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>This purchase has been 100% fully returned. No remaining quantity left.</span>
                </div>
              )}
            </div>

            {!isFullyReturned && (
              <>
                {/* STEP 3: RETURN QUANTITY INPUT */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span>3. Enter Return Quantity</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSetMaxQty}
                      className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                    >
                      Return All ({remainingQty} {itemUnit})
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      max={remainingQty}
                      step="any"
                      placeholder={`Enter quantity (max ${remainingQty})`}
                      value={returnQty}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-base font-black outline-none font-mono transition focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 uppercase">
                      {itemUnit}
                    </span>
                  </div>

                  {/* Live Refund Display */}
                  <div className="flex items-center justify-between text-xs px-1 pt-0.5">
                    <span className="text-slate-400 font-medium">Debit Adjustment:</span>
                    <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      Rs. {refundAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* STEP 4: RETURN REASON & SETTLEMENT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      4. Return Reason
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="High Moisture / Katt Dispute">High Moisture / Katt Dispute</option>
                      <option value="Quality / Standard Rejection">Quality / Standard Rejection</option>
                      <option value="Damaged Packing / Bardana">Damaged Packing / Bardana</option>
                      <option value="Excess Quantity Returned">Excess Quantity Returned</option>
                      <option value="Price Dispute / Adjustment">Price Dispute / Adjustment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Settlement Mode
                    </label>
                    <select
                      value={refundMode}
                      onChange={(e) => setRefundMode(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Ledger">Supplier Khata (Recommended)</option>
                      <option value="Cash">Cash Return (Counter)</option>
                    </select>
                  </div>
                </div>

                {/* STEP 5: CONFIRM RETURN BUTTON */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || numReturnQty <= 0}
                    className="flex-2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs transition cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Return ({numReturnQty} {itemUnit} • Rs. {refundAmount.toLocaleString()})</span>
                  </button>
                </div>
              </>
            )}

            {isFullyReturned && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            )}

          </form>
        )}
      </div>
    </div>
  );
};
