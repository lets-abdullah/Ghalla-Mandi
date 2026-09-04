import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  X,
  CheckCircle2,
  Printer,
  ShoppingBag,
  Banknote,
  Landmark,
  CreditCard,
  Package,
  FileText,
  AlertTriangle,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../components/Toast';
import { ReturnReceiptModal, printReturnReceipt } from './ReturnReceiptModal';

export const SaleReturnModal = ({ isOpen, onClose, selectedSale = null }) => {
  const toast = useToast();
  const { sales = [], saleReturns = [], recordSaleReturn } = useERP();
  const { shop } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();

  // Find active sale object
  const activeSale = useMemo(() => {
    if (!selectedSale) return sales[0] || null;
    return sales.find(s => s.id === selectedSale.id || s.invoiceNo === selectedSale.invoiceNo) || selectedSale;
  }, [sales, selectedSale]);

  // Extract products in this sale
  const saleItems = useMemo(() => {
    if (!activeSale) return [];
    if (Array.isArray(activeSale.cart) && activeSale.cart.length > 0) {
      return activeSale.cart.map((it, idx) => {
        const origQty = Number(it.qty || it.enteredQty || 1);
        const matchingReturnsQty = (saleReturns || [])
          .filter(r => (r.saleId === activeSale.id || r.invoiceNo === activeSale.invoiceNo))
          .reduce((sum, r) => {
            const rItem = (r.items || []).find(ri =>
              (ri.productId && ri.productId === (it.productId || it.id)) ||
              (ri.name && ri.name === it.name)
            );
            return sum + (rItem ? Number(rItem.qty || 0) : 0);
          }, 0);

        const alreadyRet = Math.max(Number(it.returnedQty || 0), matchingReturnsQty);
        const remaining = Math.max(0, origQty - alreadyRet);
        const rate = Number(it.rate || it.price || (it.total / (origQty || 1)) || 0);

        return {
          id: it.id || `item-${idx}`,
          productId: it.productId || it.id || null,
          name: it.name || 'Commodity Product',
          unit: it.unitName || it.unit || 'KG',
          originalQty: origQty,
          alreadyReturnedQty: alreadyRet,
          remainingQty: remaining,
          rate: rate
        };
      });
    }

    // Flat single commodity sale
    const origQty = Number(activeSale.qty || activeSale.weight || activeSale.itemsCount || 1);
    const matchingReturnsQty = (saleReturns || [])
      .filter(r => (r.saleId === activeSale.id || r.invoiceNo === activeSale.invoiceNo))
      .reduce((sum, r) => {
        const rItem = (r.items || [])[0];
        return sum + (rItem ? Number(rItem.qty || 0) : 0);
      }, 0);

    const alreadyRet = Math.max(Number(activeSale.returnedQty || 0), matchingReturnsQty);
    const remaining = Math.max(0, origQty - alreadyRet);
    const totalAmt = Number(activeSale.amount || activeSale.grandTotal || 0);
    const rate = Number(activeSale.rate || (origQty > 0 ? (totalAmt / origQty) : 0));

    return [{
      id: 'flat-item-1',
      productId: activeSale.productId || null,
      name: typeof activeSale.items === 'string' ? activeSale.items : (activeSale.productName || 'Commodity Sale'),
      unit: activeSale.unit || 'KG',
      originalQty: origQty,
      alreadyReturnedQty: alreadyRet,
      remainingQty: remaining,
      rate: rate
    }];
  }, [activeSale, saleReturns]);

  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [returnQty, setReturnQty] = useState('');
  const [refundMode, setRefundMode] = useState('Cash');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);
  const [showFullReceiptModal, setShowFullReceiptModal] = useState(false);

  // Sync state whenever active sale or items change
  useEffect(() => {
    if (saleItems.length > 0) {
      const it = saleItems[selectedItemIdx] || saleItems[0];
      setSelectedItemIdx(0);
      setReturnQty(it.remainingQty > 0 ? it.remainingQty : '');
      setReason('');
      setCompletedReturn(null);
      setShowFullReceiptModal(false);
    }
  }, [activeSale, saleItems.length]);

  if (!isOpen || !activeSale) return null;

  const currentItem = saleItems[selectedItemIdx] || saleItems[0] || {};
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
    const it = saleItems[idx] || {};
    setReturnQty(it.remainingQty > 0 ? it.remainingQty : '');
  };

  const handleSetMaxQty = () => {
    setReturnQty(remainingQty);
  };

  const handleQtyChange = (val) => {
    const clean = String(val).replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (clean === '') {
      setReturnQty('');
      return;
    }
    let parsed = parseInt(clean, 10);
    if (isNaN(parsed)) parsed = 0;
    if (parsed > remainingQty) parsed = remainingQty;
    setReturnQty(parsed.toString());
  };

  const quickReasons = ['Quality Issue', 'Weight Shortage', 'Moisture / Wet', 'Customer Request'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || numReturnQty <= 0 || isFullyReturned) return;

    if (numReturnQty > remainingQty) {
      toast.warning(`Return quantity cannot exceed returnable limit (${remainingQty} ${itemUnit}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const returnRecord = await recordSaleReturn({
        saleId: activeSale.id,
        invoiceNo: activeSale.invoiceNo || 'Direct Sale Return',
        customerId: activeSale.customerId || null,
        customerName: activeSale.partyName || activeSale.customerName || 'Customer Party',
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
        reason: reason.trim() || 'Sale Return',
        date: new Date().toLocaleDateString('en-GB')
      });

      toast.success(`Sale return of ${numReturnQty} ${itemUnit} recorded successfully.`);
      setCompletedReturn({
        ...returnRecord,
        customerName: activeSale.partyName || activeSale.customerName || 'Customer',
        invoiceNo: activeSale.invoiceNo || 'Direct Return',
        remainingAfter: Math.max(0, remainingQty - numReturnQty),
        unit: itemUnit,
        productName: currentItem.name,
        refundMode: refundMode,
        refundAmount: refundAmount,
        reason: reason.trim() || 'Sale Return'
      });
    } catch (err) {
      console.error('Failed to process sale return:', err);
      toast.error(err.message || 'Failed to process sale return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectPrint = () => {
    if (!completedReturn) return;
    printReturnReceipt(completedReturn, 'SaleReturn', 'thermal-80', shop);
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
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black border border-orange-500/20">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Process Sale Return
                </h3>
                <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                    {activeSale.invoiceNo ? `Invoice #${activeSale.invoiceNo}` : 'Direct Sale'}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[170px]">{activeSale.partyName || activeSale.customerName || 'Customer Party'}</span>
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
                  Sale Return Completed
                </h4>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-mono font-black text-xs">
                  <span>Voucher #:</span>
                  <span>{completedReturn.returnNo || 'Recorded'}</span>
                </div>
              </div>

              {/* Clean Summary Card */}
              <div className={`border rounded-2xl p-4 text-left space-y-2.5 text-xs ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Customer Party:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{completedReturn.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Returned Produce:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{completedReturn.productName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Returned Quantity:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 font-mono">
                    {numReturnQty} {completedReturn.unit} (Restocked)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Remaining on Invoice:</span>
                  <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                    {completedReturn.remainingAfter} {completedReturn.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Payment Mode:</span>
                  <span className="font-extrabold text-orange-600 dark:text-orange-400 uppercase">
                    {completedReturn.refundMode}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-black">
                  <span className="text-slate-700 dark:text-slate-300">Total Refund / Credit:</span>
                  <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                    Rs. {refundAmount.toLocaleString()}
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
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {/* Multi-item selector tabs */}
              {saleItems.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    Select Produce Item
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {saleItems.map((it, idx) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handleItemSelect(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          selectedItemIdx === idx
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs font-black'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-500'
                        }`}
                      >
                        {it.name} ({it.remainingQty} {it.unit} left)
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
                    <Package className="w-4 h-4 text-orange-500" />
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
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Original Sold</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                      {origQty} {itemUnit}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Previously Ret.</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
                      {alreadyReturned} {itemUnit}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Returnable</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      {remainingQty} {itemUnit}
                    </span>
                  </div>
                </div>
              </div>

              {isFullyReturned ? (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>This commodity sale has already been 100% fully returned.</span>
                </div>
              ) : (
                <>
                  {/* Return Quantity & Refund Amount Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Return Qty ({itemUnit}) *
                        </label>
                        <button
                          type="button"
                          onClick={handleSetMaxQty}
                          className="text-[11px] font-black text-brand-600 dark:text-brand-400 hover:underline cursor-pointer bg-brand-500/10 px-2 py-0.5 rounded-md"
                        >
                          MAX ({remainingQty})
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={`Max: ${remainingQty}`}
                        value={returnQty}
                        onWheel={(e) => e.target.blur()}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === ',') e.preventDefault();
                        }}
                        onChange={(e) => handleQtyChange(e.target.value)}
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-black font-mono outline-none transition ${
                          theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-white focus:border-brand-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-brand-500'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                        Refund / Credit Total
                      </label>
                      <div className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold flex items-center justify-between h-[42px] ${
                        theme === 'dark' ? 'bg-slate-800/90 border-slate-700 text-emerald-400' : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                      }`}>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Total:</span>
                        <span className="text-base font-black">Rs. {refundAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Payment / Settlement Mode *
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
                                ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 shadow-2xs font-extrabold ring-1 ring-orange-500/30'
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

                  {/* Return Reason & Quick Chips */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Return Reason / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Moisture / Damp produce, Bag damaged"
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
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
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
                  disabled={isSubmitting || numReturnQty <= 0 || isFullyReturned}
                  className="w-2/3 py-2.5 rounded-xl font-black text-xs bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
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
          type="SaleReturn"
        />
      )}
    </>
  );
};

export default SaleReturnModal;
