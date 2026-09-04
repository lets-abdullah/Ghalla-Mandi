import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShoppingBag,
  Package,
  Info
} from 'lucide-react';
import { useERP, computeProductValuation } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../components/Toast';

export const PurchaseReturnModal = ({ isOpen, onClose, initialPurchase = null, selectedPurchase = null }) => {
  const toast = useToast();
  const {
    products = [],
    purchases = [],
    sales = [],
    saleReturns = [],
    purchaseReturns = [],
    stockMovements = [],
    recordPurchaseReturn
  } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const purchase = initialPurchase || selectedPurchase || purchases[0] || null;

  // Extract purchase items and compute exact purchased qty, bill remaining, and current available on-hand stock
  const purchaseItems = useMemo(() => {
    if (!purchase) return [];

    const getMatchedProduct = (pId, name) => {
      return (products || []).find(p =>
        (pId && (String(p.id) === String(pId) || String(p._id) === String(pId))) ||
        (name && (p.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase())
      );
    };

    const computeAvailableStock = (prod, fallbackQty = 0) => {
      if (!prod) return fallbackQty;
      const val = computeProductValuation(prod, purchases, sales, saleReturns, purchaseReturns, stockMovements);
      return Math.max(0, val.qty !== undefined ? val.qty : Number(prod.stockQty || 0));
    };

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
        const remainingBillQty = Math.max(0, origQty - alreadyRet);
        const rate = Number(it.rate || it.price || it.ratePerEnteredUnit || (it.total / (origQty || 1)) || 0);

        const matchedProd = getMatchedProduct(it.productId || it.id, it.name);
        const availableStock = computeAvailableStock(matchedProd, remainingBillQty);
        const maxReturnableQty = Math.min(remainingBillQty, availableStock);

        return {
          id: it.id || `item-${idx}`,
          productId: it.productId || it.id || null,
          name: it.name || 'Commodity Item',
          unit: it.unit || it.unitName || purchase.unit || 'KG',
          originalQty: origQty,
          alreadyReturnedQty: alreadyRet,
          remainingQty: remainingBillQty,
          availableStock: availableStock,
          maxReturnableQty: maxReturnableQty,
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
    const remainingBillQty = Math.max(0, origQty - alreadyRet);
    const totalAmt = Number(purchase.amount || purchase.grandTotal || 0);
    const rate = Number(purchase.rate || (origQty > 0 ? (totalAmt / origQty) : 0));
    const pName = purchase.productName || (typeof purchase.items === 'string' ? purchase.items : 'Procured Commodity');

    const matchedProd = getMatchedProduct(purchase.productId, pName);
    const availableStock = computeAvailableStock(matchedProd, remainingBillQty);
    const maxReturnableQty = Math.min(remainingBillQty, availableStock);

    return [{
      id: 'flat-pur-1',
      productId: purchase.productId || null,
      name: pName,
      unit: purchase.unit || 'KG',
      originalQty: origQty,
      alreadyReturnedQty: alreadyRet,
      remainingQty: remainingBillQty,
      availableStock: availableStock,
      maxReturnableQty: maxReturnableQty,
      rate: rate
    }];
  }, [purchase, purchaseReturns, products, purchases, sales, saleReturns, stockMovements]);

  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [returnQty, setReturnQty] = useState('');
  const [refundMode, setRefundMode] = useState('Cash'); // Strictly Cash
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  // Sync state whenever purchase or items change
  useEffect(() => {
    if (purchaseItems.length > 0) {
      const it = purchaseItems[selectedItemIdx] || purchaseItems[0];
      setSelectedItemIdx(0);
      setReturnQty(it.maxReturnableQty > 0 ? it.maxReturnableQty : '');
      setCompletedReturn(null);
    }
  }, [purchase, purchaseItems.length]);

  if (!isOpen || !purchase) return null;

  const currentItem = purchaseItems[selectedItemIdx] || purchaseItems[0] || {};
  const origQty = Number(currentItem.originalQty || 0); // Humne itna stock purchase kia tha
  const alreadyReturned = Number(currentItem.alreadyReturnedQty || 0);
  const remainingBillQty = Number(currentItem.remainingQty || 0); // Bill remaining
  const currentAvailableStock = Number(currentItem.availableStock !== undefined ? currentItem.availableStock : 0); // Current on-hand stock
  const maxReturnableQty = Number(currentItem.maxReturnableQty !== undefined ? currentItem.maxReturnableQty : Math.min(remainingBillQty, currentAvailableStock)); // Is se zyada return nahi ho sakta
  const itemRate = Number(currentItem.rate || 0);
  const itemUnit = currentItem.unit || 'KG';

  const numReturnQty = parseFloat(returnQty) || 0;
  const refundAmount = Math.max(0, numReturnQty * itemRate);
  const isFullyReturned = remainingBillQty <= 0;
  const isOutOfStock = currentAvailableStock <= 0;

  // Validation state
  const isExceedingStock = numReturnQty > currentAvailableStock;
  const isExceedingBill = numReturnQty > remainingBillQty;
  const hasValidationError = isExceedingStock || isExceedingBill;

  let validationErrorMessage = '';
  if (isExceedingStock) {
    validationErrorMessage = `Insufficient Stock — Available: ${currentAvailableStock} ${itemUnit}. Maximum returnable quantity: ${maxReturnableQty} ${itemUnit}.`;
  } else if (isExceedingBill) {
    validationErrorMessage = `Return quantity cannot exceed remaining purchase quantity (${remainingBillQty} ${itemUnit}).`;
  }

  const handleItemSelect = (idx) => {
    setSelectedItemIdx(idx);
    const it = purchaseItems[idx] || {};
    setReturnQty(it.maxReturnableQty > 0 ? it.maxReturnableQty : '');
  };

  const handleSetMaxQty = () => {
    setReturnQty(maxReturnableQty);
  };

  const handleQtyChange = (val) => {
    const clean = String(val).replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (clean === '') {
      setReturnQty('');
      return;
    }
    let parsed = parseInt(clean, 10);
    if (isNaN(parsed)) parsed = 0;
    setReturnQty(parsed.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || numReturnQty <= 0 || isFullyReturned || isOutOfStock) return;

    // Strict validation check before saving
    if (numReturnQty > currentAvailableStock) {
      toast.error(`Insufficient Stock — Available: ${currentAvailableStock} ${itemUnit}. Maximum returnable quantity: ${maxReturnableQty} ${itemUnit}.`);
      return;
    }

    if (numReturnQty > remainingBillQty) {
      toast.warning(`Return quantity cannot exceed remaining purchase quantity (${remainingBillQty} ${itemUnit}).`);
      return;
    }

    const supId = purchase.supplierId || null;
    const supName = purchase.supplierName || purchase.supplier || 'Supplier Firm';

    setIsSubmitting(true);
    try {
      const returnRecord = await recordPurchaseReturn({
        purchaseId: purchase.id,
        purchaseNo: purchase.purchaseNo || 'Direct Purchase Return',
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
        reason: 'Purchase Return',
        date: new Date().toLocaleDateString('en-GB')
      });

      toast.success(`Purchase return of ${numReturnQty} ${itemUnit} recorded successfully.`);
      setCompletedReturn({
        ...returnRecord,
        remainingAfter: Math.max(0, remainingBillQty - numReturnQty),
        stockAfter: Math.max(0, currentAvailableStock - numReturnQty),
        unit: itemUnit,
        productName: currentItem.name,
        supplierName: supName
      });
    } catch (err) {
      console.error('Failed to process purchase return:', err);
      toast.error(err.message || 'Failed to process purchase return.');
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Process Purchase Return</h3>
              <p className="text-[11px] text-slate-400 font-bold">
                {purchase.purchaseNo ? `Purchase #${purchase.purchaseNo}` : 'Purchase Return'} • {purchase.supplierName || purchase.supplier || 'Supplier'}
              </p>
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
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Purchase Return Recorded</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Purchase Return <span className="font-mono font-bold text-brand-500">#{completedReturn.returnNo}</span> has been processed.
              </p>
            </div>

            {/* Clean Summary */}
            <div className={`border rounded-2xl p-4 text-left space-y-2.5 text-xs ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Supplier:</span>
                <span className="font-bold">{completedReturn.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Returned Item:</span>
                <span className="font-bold">{completedReturn.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Returned Quantity:</span>
                <span className="font-bold text-rose-500 font-mono">{numReturnQty} {completedReturn.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Remaining On Purchase Bill:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{completedReturn.remainingAfter} {completedReturn.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Remaining Available Stock:</span>
                <span className={`font-bold font-mono ${completedReturn.stockAfter === 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {completedReturn.stockAfter} {completedReturn.unit} {completedReturn.stockAfter === 0 ? '(Stock Depleted to 0)' : ''}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total Refund / Debit:</span>
                <span className="font-black text-sm font-mono text-purple-600 dark:text-purple-400">Rs. {refundAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Return Voucher</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Simplified Return Form with Complete Stock Validation */
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Multi-item selector if purchase has more than 1 item */}
            {purchaseItems.length > 1 && (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Select Item to Return</label>
                <div className="flex flex-wrap gap-1.5">
                  {purchaseItems.map((it, idx) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => handleItemSelect(idx)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        selectedItemIdx === idx
                          ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                      }`}
                    >
                      {it.name} (Max: {it.maxReturnableQty} {it.unit})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transparent Stock Audit & Clarity Card */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${
              theme === 'dark' ? 'bg-slate-900/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{currentItem.name}</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-500">
                  Rate: Rs. {itemRate.toLocaleString()}/{itemUnit}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase">1. Purchased Qty</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block font-mono text-sm">
                    {origQty} {itemUnit}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase">2. Bill Remaining</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 block font-mono text-sm">
                    {remainingBillQty} {itemUnit}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase">3. Available Stock</span>
                  <span className={`font-black block font-mono text-sm ${
                    currentAvailableStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    {currentAvailableStock} {itemUnit}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase">4. Max Return Limit</span>
                  <span className="font-black font-mono text-sm text-purple-600 dark:text-purple-400 block">
                    {maxReturnableQty} {itemUnit}
                  </span>
                </div>
              </div>

              {alreadyReturned > 0 && (
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-400 flex justify-between">
                  <span>Previously returned from this purchase:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{alreadyReturned} {itemUnit}</span>
                </div>
              )}

              {/* Clear Informative Message for Stock Policy */}
              <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700/60 text-[11px] leading-relaxed">
                {isOutOfStock ? (
                  <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Zero Stock: Current warehouse/shop stock is 0 {itemUnit}. You cannot return goods because stock is exhausted.
                    </span>
                  </div>
                ) : currentAvailableStock < remainingBillQty ? (
                  <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Hamne {origQty} {itemUnit} purchase kia tha (bill remaining: {remainingBillQty} {itemUnit}), lekin shop/warehouse mein ab sirf {currentAvailableStock} {itemUnit} stock available hay. Is liye {maxReturnableQty} {itemUnit} se zyada return nahi ho sakta.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Hamne {origQty} {itemUnit} purchase kia tha. Bill remaining {remainingBillQty} {itemUnit} hay aur available stock {currentAvailableStock} {itemUnit} hay. Maximum return limit: {maxReturnableQty} {itemUnit}.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isFullyReturned ? (
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>This purchase has already been 100% fully returned.</span>
              </div>
            ) : isOutOfStock ? (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Insufficient Stock — Available: 0 {itemUnit}. Maximum returnable quantity: 0 {itemUnit}.</span>
              </div>
            ) : (
              <>
                {/* Return Quantity Input with Stock Label beside it */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Return Qty ({itemUnit}) *
                    </label>

                    {/* Stock Indicator beside Quantity Field */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        Available: <b className="text-emerald-600 dark:text-emerald-400 font-extrabold">{currentAvailableStock} {itemUnit}</b> | Max Return: <b className="text-purple-600 dark:text-purple-400 font-extrabold">{maxReturnableQty} {itemUnit}</b>
                      </span>
                      <button
                        type="button"
                        onClick={handleSetMaxQty}
                        className="text-[11px] font-black text-brand-600 dark:text-brand-400 hover:underline cursor-pointer bg-brand-500/10 px-2 py-0.5 rounded-md"
                        title="Set to maximum returnable quantity"
                      >
                        Max ({maxReturnableQty})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={`Max: ${maxReturnableQty} ${itemUnit}`}
                        value={returnQty}
                        onWheel={(e) => e.target.blur()}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === ',') e.preventDefault();
                        }}
                        onChange={(e) => handleQtyChange(e.target.value)}
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-black font-mono outline-none transition ${
                          hasValidationError
                            ? 'border-rose-500 bg-rose-500/10 text-rose-600 focus:ring-2 focus:ring-rose-500/20'
                            : theme === 'dark'
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-brand-500'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <div className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold flex items-center justify-between h-[42px] ${
                        theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-amber-400' : 'bg-amber-50/60 border-amber-200 text-amber-700'
                      }`}>
                        <span className="text-[10px] text-slate-400 uppercase">Refund Amount:</span>
                        <span className="text-sm font-black">Rs. {refundAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Error when user exceeds available stock or bill */}
                  {hasValidationError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{validationErrorMessage}</span>
                    </div>
                  )}

                  {/* Real-time remaining stock preview */}
                  {!hasValidationError && numReturnQty > 0 && numReturnQty <= maxReturnableQty && (
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-0.5 flex justify-between items-center">
                      <span>Stock after this return:</span>
                      <span className={`font-mono font-black ${
                        currentAvailableStock - numReturnQty === 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {currentAvailableStock - numReturnQty} {itemUnit} {currentAvailableStock === numReturnQty ? '(Stock will be exactly 0 KG)' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className={`w-1/3 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || numReturnQty <= 0 || isFullyReturned || isOutOfStock || hasValidationError}
                className="w-2/3 py-2.5 rounded-xl font-extrabold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Return ({numReturnQty} {itemUnit})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PurchaseReturnModal;
