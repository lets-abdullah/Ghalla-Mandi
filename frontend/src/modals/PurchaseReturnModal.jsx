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
    liquidBalances,
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
              (ri.productId && (String(ri.productId) === String(it.productId || it.id))) ||
              (ri.name && ri.name.trim().toLowerCase() === (it.name || '').trim().toLowerCase())
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
          id: String(it.id || it.productId || `pur-item-${idx}`),
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

  const defaultRefundMode = useMemo(() => {
    const origMode = String(purchase?.paymentMode || purchase?.paymentmode || '').toLowerCase();
    if (origMode.includes('bank') || origMode.includes('transfer')) return 'Bank Account';
    return 'Cash';
  }, [purchase]);

  // Multi-item quantities state: { [itemId]: stringQuantity }
  const [returnQtys, setReturnQtys] = useState({});
  const [refundMode, setRefundMode] = useState('Cash');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [completedReturn, setCompletedReturn] = useState(null);
  const [showFullReceiptModal, setShowFullReceiptModal] = useState(false);

  // Available balance in user-selected refund channel
  const selectedChannelBalance = useMemo(() => {
    const balances = liquidBalances || { cashInHand: 0, bankBalance: 0, cardBalance: 0 };
    const m = String(refundMode || '').trim().toLowerCase();
    if (m.includes('bank')) return Number(balances.bankBalance || 0);
    if (m.includes('card')) return Number(balances.cardBalance || 0);
    return Number(balances.cashInHand || 0);
  }, [refundMode, liquidBalances]);

  // Initialize return quantities when purchase changes
  useEffect(() => {
    if (purchaseItems.length > 0) {
      const initial = {};
      purchaseItems.forEach(it => {
        initial[it.id] = '';
      });
      setReturnQtys(initial);
      setRefundMode(defaultRefundMode);
      setReason('');
      setSubmitError(null);
      setCompletedReturn(null);
      setShowFullReceiptModal(false);
    }
  }, [purchase, purchaseItems.length, defaultRefundMode]);

  if (!isOpen || !purchase) return null;

  // Compute selected return lines and line totals
  const selectedReturnLines = purchaseItems.map(it => {
    const rawVal = returnQtys[it.id];
    const q = parseFloat(rawVal) || 0;
    const itemTotal = Math.max(0, q * (it.rate || 0));
    return {
      ...it,
      returnQty: q,
      rawInput: rawVal ?? '',
      itemTotal
    };
  }).filter(line => line.returnQty > 0);

  // --------------------------------------------------------------------------
  // CANONICAL FINANCIAL RETURN RECONCILIATION FOR COMBINED PURCHASE RETURN:
  // Total Goods Value = Sum of (Quantity * Rate) for all returned lines
  // Cash Refund Received Back = Strictly capped at shop's prior payments
  // Payable Debt Cleared = Unpaid purchase bill debt cancelled from Khata
  // --------------------------------------------------------------------------
  const currentGoodsValue = selectedReturnLines.reduce((sum, l) => sum + l.itemTotal, 0);
  const totalReturnUnits = selectedReturnLines.reduce((sum, l) => sum + l.returnQty, 0);

  const priorMerchandiseValue = Number(purchaseFin.returnAmount || 0);
  const newNetPur = Math.max(0, purTotal - (priorMerchandiseValue + currentGoodsValue));

  // Exact cash refund received back from supplier across all items
  const cashRefundAmount = Math.max(0, Math.min(currentGoodsValue, purPaid - newNetPur - priorCashRefunds));

  // Payable debt to supplier cancelled from khata
  const dueCancelled = Math.min(purDue, Math.max(0, currentGoodsValue - cashRefundAmount));

  const isLiquidPayoutRequested = refundMode !== 'Credit' && refundMode !== 'Khata Credit' && cashRefundAmount > 0;
  const isInsufficientBalance = !isSubmitting && !completedReturn && isLiquidPayoutRequested && cashRefundAmount > selectedChannelBalance;

  // Check if every item is fully returned or out of stock
  const isAllItemsFullyReturned = purchaseItems.every(it => it.remainingQty <= 0);
  const isAllItemsOutOfStock = purchaseItems.every(it => it.availableStock <= 0);

  // Check line validation errors
  const lineValidationErrors = selectedReturnLines.map(line => {
    if (line.returnQty > line.availableStock) {
      return `Insufficient Warehouse Stock for "${line.name}" — Available: ${line.availableStock} ${line.unit}.`;
    }
    if (line.returnQty > line.remainingQty) {
      return `Return quantity for "${line.name}" exceeds purchase bill remaining (${line.remainingQty} ${line.unit}).`;
    }
    return null;
  }).filter(Boolean);

  const hasValidationError = !isSubmitting && !completedReturn && lineValidationErrors.length > 0;

  // Quantity change handler for a specific item
  const handleItemQtyChange = (itemId, val, maxLimit) => {
    const clean = String(val).replace(/[^0-9.]/g, '');
    if (clean === '') {
      setReturnQtys(prev => ({ ...prev, [itemId]: '' }));
      return;
    }
    let parsed = parseFloat(clean);
    if (isNaN(parsed)) parsed = 0;
    if (parsed > maxLimit) parsed = maxLimit;
    setReturnQtys(prev => ({ ...prev, [itemId]: parsed.toString() }));
  };

  const handleSetItemMax = (itemId, maxLimit) => {
    setReturnQtys(prev => ({ ...prev, [itemId]: maxLimit > 0 ? maxLimit.toString() : '' }));
  };

  const handleReturnAllMax = () => {
    const allMax = {};
    purchaseItems.forEach(it => {
      if (it.maxReturnableQty > 0) {
        allMax[it.id] = it.maxReturnableQty.toString();
      } else {
        allMax[it.id] = '';
      }
    });
    setReturnQtys(allMax);
  };

  const handleClearAll = () => {
    const empty = {};
    purchaseItems.forEach(it => {
      empty[it.id] = '';
    });
    setReturnQtys(empty);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || completedReturn || selectedReturnLines.length === 0 || hasValidationError || isInsufficientBalance) return;

    for (const line of selectedReturnLines) {
      if (line.returnQty > line.availableStock) {
        toast.error(`Insufficient Warehouse Stock for "${line.name}" — Available: ${line.availableStock} ${line.unit}.`);
        return;
      }
      if (line.returnQty > line.remainingQty) {
        toast.warning(`Return quantity for "${line.name}" cannot exceed remaining purchase quantity (${line.remainingQty} ${line.unit}).`);
        return;
      }
    }

    const supId = purchase.supplierId || null;
    const supName = purchase.supplierName || purchase.supplier || 'Supplier Firm';

    setIsSubmitting(true);
    setSubmitError(null);

    const activeRefundMode = cashRefundAmount > 0
      ? (refundMode === 'Bank Account' || refundMode === 'Bank' ? 'Bank' : 'Cash')
      : 'Khata Credit';

    try {
      const itemsPayload = selectedReturnLines.map(line => ({
        productId: line.productId || null,
        id: line.productId || line.id,
        name: line.name,
        qty: line.returnQty,
        unit: line.unit,
        unitName: line.unit,
        rate: line.rate,
        total: line.itemTotal,
        totalAmount: line.itemTotal
      }));

      const returnRecord = await recordPurchaseReturn({
        purchaseId: purchase.id,
        purchaseNo: purchase.purchaseNo || 'Direct Purchase Return',
        supplierId: supId,
        supplierName: supName,
        items: itemsPayload,
        totalGoodsValue: currentGoodsValue,
        refundAmount: cashRefundAmount,
        dueCleared: dueCancelled,
        refundMode: activeRefundMode,
        reason: reason.trim() || 'Purchase Return',
        date: new Date().toLocaleDateString('en-GB')
      });

      setCompletedReturn({
        ...returnRecord,
        supplierName: supName,
        purchaseNo: purchase.purchaseNo || 'Direct Return',
        items: itemsPayload,
        totalGoodsValue: currentGoodsValue,
        refundMode: activeRefundMode,
        refundAmount: cashRefundAmount,
        dueCleared: dueCancelled,
        purPaid: purPaid,
        purDue: purDue,
        reason: reason.trim() || 'Purchase Return'
      });
      toast.success(`Purchase return of ${selectedReturnLines.length} item line${selectedReturnLines.length > 1 ? 's' : ''} recorded successfully.`);
    } catch (err) {
      console.error('Failed to process purchase return:', err);
      const errMsg = err.message || 'Failed to process purchase return.';
      setSubmitError(errMsg);
      toast.error(errMsg);
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
        <div className={`rounded-3xl max-w-2xl w-full p-5 sm:p-6 card-shadow border my-auto transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black border border-orange-200/60 dark:border-orange-800/40 shrink-0">
                <RotateCcw className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Purchase Return (Multi-Item)
                </h3>
                <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-orange-600 dark:text-orange-400">
                    {purchase.purchaseNo ? `Bill #${purchase.purchaseNo}` : 'Procurement Return'}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[200px] font-bold text-slate-600 dark:text-slate-300">
                    {purchase.supplierName || purchase.supplier || 'Oil Supplier'}
                  </span>
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

          {/* Bill Financial Status 3-Column Bar Card */}
          <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 text-center">
            <div className="px-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Total Bill</span>
              <span className="font-mono font-black text-slate-900 dark:text-white text-sm sm:text-base mt-1 block">
                Rs. {purTotal.toLocaleString()}
              </span>
            </div>
            <div className="px-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">Paid to Supplier</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-1 block">
                Rs. {purPaid.toLocaleString()}
              </span>
            </div>
            <div className="px-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-orange-600 dark:text-orange-400 block">Payable Due</span>
              <span className="font-mono font-black text-orange-600 dark:text-orange-400 text-sm sm:text-base mt-1 block">
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-mono font-black text-xs">
                  <span>Voucher #:</span>
                  <span>{completedReturn.returnNo || 'Recorded'}</span>
                </div>
              </div>

              {/* Clean Summary Card */}
              <div className={`border rounded-2xl p-4 text-left space-y-3 text-xs ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Supplier Firm:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{completedReturn.supplierName}</span>
                </div>

                {/* Returned items list */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                    Returned Items ({completedReturn.items?.length || 0})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(completedReturn.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{it.name}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-rose-600 dark:text-rose-400 font-black">
                            {it.qty} {it.unit}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold">
                            Rs. {Number(it.total || it.totalAmount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-medium">Total Return Produce Value:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                    Rs. {Number(completedReturn.totalGoodsValue || currentGoodsValue).toLocaleString()}
                  </span>
                </div>

                {dueCancelled > 0 && (
                  <div className="flex justify-between items-center text-orange-600 dark:text-orange-400">
                    <span className="font-medium">Payable Due Cancelled:</span>
                    <span className="font-bold font-mono">- Rs. {dueCancelled.toLocaleString()} (Supplier Khata)</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-black">
                  <span className="text-slate-700 dark:text-slate-300">
                    {cashRefundAmount > 0 ? 'Refund Received Back:' : 'Supplier Khata Cleared:'}
                  </span>
                  <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                    {cashRefundAmount > 0
                      ? `Rs. ${cashRefundAmount.toLocaleString()} (${completedReturn.refundMode || 'Cash'})`
                      : `Rs. ${dueCancelled.toLocaleString()} (0 Cash)`}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="flex-1 py-3.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Voucher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFullReceiptModal(true)}
                    className={`flex-1 py-3.5 px-3 rounded-2xl border font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>All Sizes / A4</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full py-3 rounded-2xl font-bold text-xs transition cursor-pointer ${theme === 'dark'
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
            /* RETURN ENTRY FORM (MULTI-ITEM) */
            /* ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {isAllItemsFullyReturned ? (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-2 mt-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>This purchase bill has already been 100% fully returned.</span>
                </div>
              ) : isAllItemsOutOfStock ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 mt-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Insufficient Warehouse Stock — All purchased items are currently out of stock. Cannot return goods already sold.</span>
                </div>
              ) : (
                <>
                  {/* Multi-Item Table Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-500" />
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                          PURCHASE ITEMS ({purchaseItems.length})
                        </label>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleReturnAllMax}
                          className="font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer bg-orange-50 dark:bg-orange-950/50 px-2.5 py-1 rounded-lg border border-orange-200/60 dark:border-orange-800/60"
                        >
                          Max All Available
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="font-bold text-slate-400 hover:text-slate-600 cursor-pointer px-2 py-1"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className={`border rounded-2xl overflow-hidden ${theme === 'dark' ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50/50'
                      }`}>
                      <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className={`sticky top-0 z-10 text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-800 text-slate-400 border-b border-slate-700' : 'bg-slate-100/90 text-slate-500 border-b border-slate-200'
                            }`}>
                            <tr>
                              <th className="py-2.5 px-3">Product / Commodity</th>
                              <th className="py-2.5 px-2 text-center">Purchased</th>
                              <th className="py-2.5 px-2 text-center">Returned</th>
                              <th className="py-2.5 px-2 text-center">Stock</th>
                              <th className="py-2.5 px-2 text-center">Max Return</th>
                              <th className="py-2.5 px-3 text-right w-44">Return Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {purchaseItems.map((it) => {
                              const isLineFullyRet = it.remainingQty <= 0;
                              const isLineNoStock = it.availableStock <= 0;
                              const currentVal = returnQtys[it.id] ?? '';
                              const numVal = parseFloat(currentVal) || 0;
                              const lineTotal = numVal * (it.rate || 0);

                              return (
                                <tr key={it.id} className={theme === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-white'}>
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {it.name}
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                                      Rs. {it.rate.toLocaleString()} / {it.unit}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-mono text-slate-700 dark:text-slate-300">
                                    {it.originalQty} <span className="text-[10px] text-slate-400">{it.unit}</span>
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-mono text-purple-600 dark:text-purple-400 font-semibold">
                                    {it.alreadyReturnedQty} <span className="text-[10px] text-slate-400">{it.unit}</span>
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                    {it.availableStock} <span className="text-[10px] text-slate-400">{it.unit}</span>
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-mono font-black text-orange-600 dark:text-orange-400">
                                    {it.maxReturnableQty} <span className="text-[10px] text-slate-400">{it.unit}</span>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {isLineFullyRet ? (
                                      <span className="text-[11px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded-md">
                                        Returned
                                      </span>
                                    ) : isLineNoStock ? (
                                      <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-md">
                                        No Stock
                                      </span>
                                    ) : (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <div className="relative w-24">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder={`Max: ${it.maxReturnableQty}`}
                                            value={currentVal}
                                            onWheel={(e) => e.target.blur()}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => handleItemQtyChange(it.id, e.target.value, it.maxReturnableQty)}
                                            className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-right outline-none transition ${numVal > 0
                                              ? 'border-orange-500 ring-1 ring-orange-500/20 bg-orange-50/40 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                                              : theme === 'dark'
                                                ? 'bg-slate-900 border-slate-700 text-white'
                                                : 'bg-white border-slate-300 text-slate-900'
                                              }`}
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleSetItemMax(it.id, it.maxReturnableQty)}
                                          className="text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                                          title={`Set max ${it.maxReturnableQty} ${it.unit}`}
                                        >
                                          Max
                                        </button>
                                      </div>
                                    )}
                                    {lineTotal > 0 && (
                                      <div className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5 pr-1">
                                        = Rs. {lineTotal.toLocaleString()}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Combined Return Summary Bar (3-Column) */}
                  <div className="p-3.5 sm:p-4 rounded-2xl border bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 text-center">
                    <div className="px-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Return Value ({selectedReturnLines.length} Item{selectedReturnLines.length !== 1 ? 's' : ''})
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white text-sm sm:text-base mt-1 block">
                        Rs. {currentGoodsValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="px-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
                        Payable After Return
                      </span>
                      <span className="font-mono font-black text-orange-600 dark:text-orange-400 text-sm sm:text-base mt-1 block">
                        Rs. {Math.max(0, purDue - currentGoodsValue).toLocaleString()}
                      </span>
                    </div>
                    <div className="px-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        Refund / Cashback
                      </span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-1 block">
                        Rs. {cashRefundAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Validation Error Banner */}
                  {hasValidationError && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 space-y-1">
                      {lineValidationErrors.map((msg, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Refund / Cashback Payment Method Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                        REFUND / CASHBACK PAYMENT METHOD
                      </label>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Available Balance: Rs. {selectedChannelBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
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
                            className={`py-3 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border-2 ${isSelected
                              ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-black shadow-2xs'
                              : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isInsufficientBalance && (
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2.5 shadow-2xs mt-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>
                          Insufficient balance in {refundMode === 'Bank' ? 'Bank Account' : refundMode}. Available: Rs. {selectedChannelBalance.toLocaleString()}. Required: Rs. {cashRefundAmount.toLocaleString()}.
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Footer Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition cursor-pointer ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedReturnLines.length === 0 || isAllItemsFullyReturned || isAllItemsOutOfStock || hasValidationError || isInsufficientBalance}
                  className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isSubmitting ? (
                    <span>Processing Return...</span>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>
                        Confirm Return ({selectedReturnLines.length} Item{selectedReturnLines.length !== 1 ? 's' : ''} • Rs. {currentGoodsValue.toLocaleString()})
                      </span>
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
