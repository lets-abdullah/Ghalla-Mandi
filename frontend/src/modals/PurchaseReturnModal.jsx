import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShoppingBag,
  Package,
  Info,
  Banknote,
  Landmark,
  CreditCard,
  Receipt,
  Wallet
} from 'lucide-react';
import { useERP, computeProductValuation, computePurchaseFinancials } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../components/Toast';
import { ReturnReceiptModal, printReturnReceipt } from './ReturnReceiptModal';

export const PurchaseReturnModal = ({ isOpen, onClose, initialPurchase = null, selectedPurchase = null }) => {
  const toast = useToast();
  const {
    products = [],
    purchases = [],
    sales = [],
    saleReturns = [],
    purchaseReturns = [],
    paymentLogs = [],
    stockMovements = [],
    recordPurchaseReturn
  } = useERP();
  const { shop } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();

  const purchase = initialPurchase || selectedPurchase;

  // Compute canonical financial status of active purchase bill (total, paid, due)
  const purchaseFin = useMemo(() => {
    if (!purchase) return { total: 0, paid: 0, due: 0, returnAmount: 0 };
    return computePurchaseFinancials(purchase, purchaseReturns, paymentLogs, purchases);
  }, [purchase, purchaseReturns, paymentLogs, purchases]);

  const purTotal = Number(purchaseFin.grossTotal || purchaseFin.total || 0);
  const purPaid = Number(purchaseFin.paid || 0);
  const purDue = Number(purchaseFin.due || 0);

  // Sum of prior cash refunds from supplier already received on this bill
  const priorCashRefunds = useMemo(() => {
    if (!purchase) return 0;
    return (purchaseReturns || [])
      .filter(r => (r.purchaseId === purchase.id || r.purchaseNo === purchase.purchaseNo))
      .reduce((sum, r) => {
        const m = String(r.refundMode || '').trim().toLowerCase();
        const isLiquid = m === 'cash' || m === 'bank account' || m === 'bank' || m === 'card';
        return sum + (isLiquid ? Number(r.refundAmount || 0) : 0);
      }, 0);
  }, [purchase, purchaseReturns]);

  // Maximum cash refund cannot exceed what shop historically paid to supplier minus prior cash refunds
  const maxCashRefundable = Math.max(0, purPaid - priorCashRefunds);

  // Helper: Match line item with product to compute current available stock
  const getMatchedProduct = (productId, productName) => {
    if (!productId && !productName) return null;
    return (products || []).find(p =>
      (productId && (String(p.id) === String(productId) || String(p._id) === String(productId))) ||
      (productName && (p.name || '').trim().toLowerCase() === String(productName).trim().toLowerCase())
    );
  };

  const computeAvailableStock = (matchedProd, remainingBillQty) => {
    if (!matchedProd) {
      return remainingBillQty > 0 ? remainingBillQty : 0;
    }
    const val = computeProductValuation(
      matchedProd,
      purchases,
      sales,
      saleReturns,
      purchaseReturns,
      stockMovements
    );
    return Math.max(0, val.qty !== undefined ? val.qty : Number(matchedProd.stockQty || 0));
  };

  // Build items array with exact stock tracking & validation
  const purchaseItems = useMemo(() => {
    if (!purchase) return [];

    let parsedCart = [];
    if (purchase.itemsJson && typeof purchase.itemsJson === 'string') {
      try {
        parsedCart = JSON.parse(purchase.itemsJson);
      } catch (e) {
        parsedCart = [];
      }
    } else if (Array.isArray(purchase.items) && purchase.items.length > 0) {
      parsedCart = purchase.items;
    } else if (Array.isArray(purchase.cart) && purchase.cart.length > 0) {
      parsedCart = purchase.cart;
    }

    if (parsedCart.length > 0) {
      return parsedCart.map((it, idx) => {
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
        const matchedProd = getMatchedProduct(it.productId || it.id, it.name);
        const availableStock = computeAvailableStock(matchedProd, remainingBillQty);
        const maxReturnableQty = Math.min(remainingBillQty, availableStock);
        const rate = Number(it.rate || it.price || (origQty > 0 ? (Number(it.total || 0) / origQty) : 0));

        return {
          id: it.id || `pur-item-${idx}`,
          productId: it.productId || it.id || null,
          name: it.name || 'Purchased Commodity',
          unit: it.unitName || it.unit || 'KG',
          originalQty: origQty,
          alreadyReturnedQty: alreadyRet,
          remainingQty: remainingBillQty,
          availableStock: availableStock,
          maxReturnableQty: maxReturnableQty,
          rate: rate
        };
      });
    }

    // Flat commodity purchase
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
  const [refundMode, setRefundMode] = useState('Cash');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);
  const [showFullReceiptModal, setShowFullReceiptModal] = useState(false);

  // Sync state whenever purchase or items change
  useEffect(() => {
    if (purchaseItems.length > 0) {
      const it = purchaseItems[selectedItemIdx] || purchaseItems[0];
      setSelectedItemIdx(0);
      setReturnQty(it.maxReturnableQty > 0 ? it.maxReturnableQty : '');
      setReason('');
      setCompletedReturn(null);
      setShowFullReceiptModal(false);
    }
  }, [purchase, purchaseItems.length]);

  if (!isOpen || !purchase) return null;

  const currentItem = purchaseItems[selectedItemIdx] || purchaseItems[0] || {};
  const origQty = Number(currentItem.originalQty || 0);
  const alreadyReturned = Number(currentItem.alreadyReturnedQty || 0);
  const remainingBillQty = Number(currentItem.remainingQty || 0);
  const currentAvailableStock = Number(currentItem.availableStock !== undefined ? currentItem.availableStock : 0);
  const maxReturnableQty = Number(currentItem.maxReturnableQty !== undefined ? currentItem.maxReturnableQty : Math.min(remainingBillQty, currentAvailableStock));
  const itemRate = Number(currentItem.rate || 0);
  const itemUnit = currentItem.unit || 'KG';

  const numReturnQty = parseFloat(returnQty) || 0;
  const isFullyReturned = remainingBillQty <= 0;
  const isOutOfStock = currentAvailableStock <= 0;

  // Validation state
  const isExceedingStock = numReturnQty > currentAvailableStock;
  const isExceedingBill = numReturnQty > remainingBillQty;
  const hasValidationError = isExceedingStock || isExceedingBill;

  let validationErrorMessage = '';
  if (isExceedingStock) {
    validationErrorMessage = `Insufficient Stock — Available: ${currentAvailableStock} ${itemUnit}. Maximum returnable: ${maxReturnableQty} ${itemUnit}.`;
  } else if (isExceedingBill) {
    validationErrorMessage = `Return quantity cannot exceed remaining purchase bill quantity (${remainingBillQty} ${itemUnit}).`;
  }

  // --------------------------------------------------------------------------
  // CANONICAL FINANCIAL RETURN RECONCILIATION FOR PURCHASES:
  // Total Goods Value = Quantity * Rate
  // Cash Received from Supplier = Strictly capped at shop's paid amount
  // Payable Due Cleared = Unpaid purchase bill debt cancelled
  // --------------------------------------------------------------------------
  const currentGoodsValue = Math.max(0, numReturnQty * itemRate);
  const priorMerchandiseValue = Number(purchaseFin.returnAmount || 0);
  const newNetPur = Math.max(0, purTotal - (priorMerchandiseValue + currentGoodsValue));
  
  // Exact cash refund we get from supplier
  const cashRefundAmount = Math.max(0, Math.min(currentGoodsValue, purPaid - newNetPur - priorCashRefunds));
  
  // Payable debt to supplier cancelled from khata
  const dueCancelled = Math.min(purDue, Math.max(0, currentGoodsValue - cashRefundAmount));

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

  const quickReasons = ['Quality Issue', 'Weight Shortage', 'Damaged Goods', 'Supplier Return'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || numReturnQty <= 0 || isFullyReturned || isOutOfStock) return;

    if (numReturnQty > currentAvailableStock) {
      toast.error(`Insufficient Stock — Available: ${currentAvailableStock} ${itemUnit}. Maximum returnable: ${maxReturnableQty} ${itemUnit}.`);
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
      const activeRefundMode = cashRefundAmount > 0 ? refundMode : 'Khata Credit';
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
          total: currentGoodsValue
        }],
        totalGoodsValue: currentGoodsValue,
        refundAmount: cashRefundAmount, // Strictly capped at historical paid amount!
        dueCleared: dueCancelled,
        refundMode: activeRefundMode,
        reason: reason.trim() || 'Purchase Return',
        date: new Date().toLocaleDateString('en-GB')
      });

      toast.success(`Purchase return of ${numReturnQty} ${itemUnit} recorded successfully.`);
      setCompletedReturn({
        ...returnRecord,
        supplierName: supName,
        purchaseNo: purchase.purchaseNo || 'Direct Return',
        remainingAfter: Math.max(0, remainingBillQty - numReturnQty),
        stockAfter: Math.max(0, currentAvailableStock - numReturnQty),
        unit: itemUnit,
        productName: currentItem.name,
        totalGoodsValue: currentGoodsValue,
        refundMode: activeRefundMode,
        refundAmount: cashRefundAmount,
        dueCleared: dueCancelled,
        purPaid: purPaid,
        purDue: purDue,
        reason: reason.trim() || 'Purchase Return'
      });
    } catch (err) {
      console.error('Failed to process purchase return:', err);
      toast.error(err.message || 'Failed to process purchase return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectPrint = () => {
    if (!completedReturn) return;
    printReturnReceipt(completedReturn, 'PurchaseReturn', 'thermal-80', shop);
  };

  return (
    <>
      <div
        onClick={(e) => { if (e.target === e.currentTarget && !completedReturn) onClose(); }}
        className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <div className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 card-shadow border my-auto transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black border border-amber-500/20">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Process Purchase Return
                </h3>
                <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {purchase.purchaseNo ? `Bill #${purchase.purchaseNo}` : 'Procurement Return'}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[170px]">{purchase.supplierName || purchase.supplier || 'Supplier'}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bill Financial Status Bar */}
          <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bill</span>
              <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                Rs. {purTotal.toLocaleString()}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Paid to Supplier</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                Rs. {purPaid.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Payable Due (Khata)</span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                Rs. {purDue.toLocaleString()}
              </span>
            </div>
          </div>

          {completedReturn ? (
            /* ========================================================================= */
            /* SUCCESS COMPLETION SCREEN */
            /* ========================================================================= */
            <div className="space-y-4 py-3 text-center animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Purchase Return Recorded
                </h4>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono font-black text-xs">
                  <span>Voucher #:</span>
                  <span>{completedReturn.returnNo || 'Recorded'}</span>
                </div>
              </div>

              {/* Clean Summary Card */}
              <div className={`border rounded-2xl p-4 text-left space-y-2.5 text-xs ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Supplier Firm:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{completedReturn.supplierName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Returned Item:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{completedReturn.productName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Returned Quantity:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 font-mono">
                    {numReturnQty} {completedReturn.unit} (Deducted)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Total Produce Value:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                    Rs. {Number(completedReturn.totalGoodsValue || currentGoodsValue).toLocaleString()}
                  </span>
                </div>
                {dueCancelled > 0 && (
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span className="font-medium">Payable Due Cancelled:</span>
                    <span className="font-bold font-mono">- Rs. {dueCancelled.toLocaleString()} (Supplier Khata)</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-black">
                  <span className="text-slate-700 dark:text-slate-300">
                    Supplier Refund Due:
                  </span>
                  <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                    Rs. {cashRefundAmount.toLocaleString()}
                    {cashRefundAmount === 0 && <span className="text-xs font-semibold text-slate-400 ml-1.5">(0 Cash, Dues Adjusted)</span>}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="flex-1 py-3 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 transition cursor-pointer active:scale-98"
                    title="Print Receipt immediately (Thermal 80mm)"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFullReceiptModal(true)}
                    className={`flex-1 py-3 px-3 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>All Sizes / A4 / A5</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* RETURN ENTRY FORM */
            /* ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Multi-item selector tabs */}
              {purchaseItems.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    Select Purchased Item
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {purchaseItems.map((it, idx) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handleItemSelect(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          selectedItemIdx === idx
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs font-black'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500'
                        }`}
                      >
                        {it.name} (Max: {it.maxReturnableQty} {it.unit})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Clean Summary Card */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      {currentItem.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                    Rs. {itemRate.toLocaleString()}/{itemUnit}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Purchased</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                      {origQty} {itemUnit}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Warehouse Stock</span>
                    <span className={`font-mono font-bold mt-0.5 block ${currentAvailableStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {currentAvailableStock} {itemUnit}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Max Returnable</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                      {maxReturnableQty} {itemUnit}
                    </span>
                  </div>
                </div>
              </div>

              {isFullyReturned ? (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>This purchase bill has already been 100% fully returned.</span>
                </div>
              ) : isOutOfStock ? (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Insufficient Warehouse Stock — Available: 0 {itemUnit}. Cannot return goods already sold out.</span>
                </div>
              ) : (
                <>
                  {/* Return Quantity & Refund Amount Inputs */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Return Quantity ({itemUnit}) *
                        </label>
                        <button
                          type="button"
                          onClick={handleSetMaxQty}
                          className="text-[11px] font-black text-brand-600 dark:text-brand-400 hover:underline cursor-pointer bg-brand-500/10 px-2 py-0.5 rounded-md"
                        >
                          MAX ({maxReturnableQty})
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={`Max: ${maxReturnableQty}`}
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
                              ? 'bg-slate-800 border-slate-700 text-white focus:border-brand-500'
                              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-brand-500'
                        }`}
                        required
                      />
                    </div>

                    {/* Accurate Financial Calculation Breakdown */}
                    {numReturnQty > 0 && (
                      <div className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Total Goods Value ({numReturnQty} {itemUnit} × Rs. {itemRate}):</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            Rs. {currentGoodsValue.toLocaleString()}
                          </span>
                        </div>

                        {dueCancelled > 0 && (
                          <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                            <span>Payable Due Cancelled (Supplier Khata):</span>
                            <span className="font-mono font-extrabold">- Rs. {dueCancelled.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                          <div>
                            <span className="font-black text-slate-900 dark:text-white uppercase block text-xs">
                              Supplier Refund Due:
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {cashRefundAmount > 0
                                ? `Paid Amount (Rs. ${purPaid.toLocaleString()}) − Net Payable After Return`
                                : 'Return reduces payable debt first (0 excess paid)'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                              Rs. {cashRefundAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {cashRefundAmount === 0 && (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Bill has remaining payable dues. Full return value is adjusted against supplier khata (0 cash payout).</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline Error when user exceeds available stock or bill */}
                  {hasValidationError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{validationErrorMessage}</span>
                    </div>
                  )}

                  {/* Payment Method Selector */}
                  {cashRefundAmount > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        Refund Payment Method *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'Cash', label: 'Cash', icon: Banknote },
                          { id: 'Bank Account', label: 'Bank Account', icon: Landmark },
                          { id: 'Card', label: 'Card', icon: CreditCard }
                        ].map((mode) => {
                          const Icon = mode.icon;
                          const isSelected = refundMode === mode.id || (mode.id === 'Bank Account' && refundMode === 'Bank');
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setRefundMode(mode.id)}
                              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                                isSelected
                                  ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-2xs font-extrabold ring-1 ring-amber-500/30'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{mode.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-slate-500" />
                      <span>Settlement Mode: Supplier Khata Credit / Due Adjustment</span>
                    </div>
                  )}

                  {/* Return Reason & Quick Chips */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Return Reason / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Substandard grain, Weight mismatch, Moisture content"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white focus:border-brand-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-brand-500'
                      }`}
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {quickReasons.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReason(r)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                            reason === r
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Stock Impact Note */}
                  {!hasValidationError && numReturnQty > 0 && numReturnQty <= maxReturnableQty && (
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-0.5 flex justify-between items-center">
                      <span>Warehouse stock after return:</span>
                      <span className={`font-mono font-black ${currentAvailableStock - numReturnQty === 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {currentAvailableStock - numReturnQty} {itemUnit}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Footer Actions */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-1/3 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || numReturnQty <= 0 || isFullyReturned || isOutOfStock || hasValidationError}
                  className="w-2/3 py-2.5 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isSubmitting ? (
                    <span>Processing Return...</span>
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

      {/* Full Receipt Modal for switching sizes or downloading PDF */}
      {showFullReceiptModal && completedReturn && (
        <ReturnReceiptModal
          isOpen={showFullReceiptModal}
          onClose={() => setShowFullReceiptModal(false)}
          returnData={completedReturn}
          type="PurchaseReturn"
        />
      )}
    </>
  );
};

export default PurchaseReturnModal;
