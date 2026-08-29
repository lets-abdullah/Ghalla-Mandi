import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  X, 
  CheckCircle2, 
  Printer,
  ShoppingBag
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const SaleReturnModal = ({ isOpen, onClose, selectedSale = null }) => {
  const { sales = [], saleReturns = [], recordSaleReturn } = useERP();
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
  const [reason, setReason] = useState('Kharab Maal');
  const [refundMode, setRefundMode] = useState('Ledger'); // 'Ledger' | 'Cash'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  // Sync state whenever active sale or items change
  useEffect(() => {
    if (saleItems.length > 0) {
      const it = saleItems[selectedItemIdx] || saleItems[0];
      setSelectedItemIdx(0);
      setReturnQty(it.remainingQty > 0 ? it.remainingQty : 0);
      setCompletedReturn(null);
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
      console.error('Failed to process sale return:', err);
      alert(err.message || 'Failed to process sale return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !completedReturn) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border my-6 transition-all ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Process Sale Return</h3>
              <p className="text-[11px] text-slate-400 font-bold">
                {activeSale.invoiceNo ? `Invoice #${activeSale.invoiceNo}` : 'Sale Return'} • {activeSale.partyName || 'Customer'}
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
              <h4 className="text-base font-black text-slate-900 dark:text-white">Sale Return Recorded</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Voucher <span className="font-mono font-bold text-brand-500">#{completedReturn.returnNo}</span> has been processed.
              </p>
            </div>

            {/* Clean Summary */}
            <div className={`border rounded-2xl p-3.5 text-left space-y-2 text-xs ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Customer:</span>
                <span className="font-bold">{activeSale.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Returned Item:</span>
                <span className="font-bold">{completedReturn.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Returned Quantity:</span>
                <span className="font-bold text-rose-500">{numReturnQty} {completedReturn.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Remaining Returnable:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{completedReturn.remainingAfter} {completedReturn.unit}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Refund / Credit Amount:</span>
                <span className="font-black text-sm font-mono text-brand-500">Rs. {refundAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Simplified Return Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Multi-item selector if sale has more than 1 item */}
            {saleItems.length > 1 && (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Select Item to Return</label>
                <div className="flex flex-wrap gap-1.5">
                  {saleItems.map((it, idx) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => handleItemSelect(idx)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        selectedItemIdx === idx
                          ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                      }`}
                    >
                      {it.name} ({it.remainingQty} {it.unit} left)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Single Summary Card */}
            <div className={`p-3 rounded-2xl border space-y-1.5 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Product</span>
                  <span className="font-extrabold text-slate-800 dark:text-white truncate block">{currentItem.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Rate</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block font-mono">Rs. {itemRate.toLocaleString()}/{itemUnit}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Qty</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block font-mono">{origQty} {itemUnit}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Returnable</span>
                  <span className={`font-black font-mono block ${isFullyReturned ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {remainingQty} {itemUnit}
                  </span>
                </div>
              </div>

              {alreadyReturned > 0 && (
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-400 flex justify-between">
                  <span>Previously returned:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{alreadyReturned} {itemUnit}</span>
                </div>
              )}
            </div>

            {isFullyReturned ? (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>This sale has already been 100% fully returned.</span>
              </div>
            ) : (
              <>
                {/* Return Quantity & Refund Amount in 2 Clean Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Return Qty ({itemUnit}) *
                      </label>
                      <button
                        type="button"
                        onClick={handleSetMaxQty}
                        className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        All ({remainingQty})
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0.1"
                      max={remainingQty}
                      step="any"
                      placeholder={`Max: ${remainingQty}`}
                      value={returnQty}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-sm font-bold font-mono outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Refund Amount
                    </label>
                    <div className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold flex items-center justify-between ${
                      theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-emerald-400' : 'bg-emerald-50/60 border-emerald-200 text-emerald-700'
                    }`}>
                      <span className="text-[10px] text-slate-400 uppercase">Total:</span>
                      <span className="text-sm font-black">Rs. {refundAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Return Reason & Settlement Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Return Reason
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Kharab Maal, Wazan Farq"
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Kharab Maal', 'Wazan Farq', 'Damage Bag', 'Order Cancel', 'Rate Farq'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setReason(tag)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                            reason === tag
                              ? 'bg-brand-500 text-white border-brand-600 shadow-2xs'
                              : theme === 'dark'
                              ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Settlement Mode
                    </label>
                    <select
                      value={refundMode}
                      onChange={(e) => setRefundMode(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Ledger">Customer Khata (Credit)</option>
                      <option value="Cash">Cash Refund (Counter)</option>
                    </select>
                  </div>
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
                disabled={isSubmitting || numReturnQty <= 0 || isFullyReturned}
                className="w-2/3 py-2.5 rounded-xl font-extrabold text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default SaleReturnModal;
