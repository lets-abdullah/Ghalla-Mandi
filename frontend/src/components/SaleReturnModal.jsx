import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Package, 
  User, 
  Printer,
  ShoppingBag,
  Info,
  Check
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const SaleReturnModal = ({ isOpen, onClose, selectedSale = null }) => {
  const { sales = [], customers = [], products = [], recordSaleReturn } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  // Active selected sale
  const [activeSaleId, setActiveSaleId] = useState(selectedSale?.id || (sales[0]?.id || ''));

  // Items return states: array of { id, productId, name, unit, purchasedQty, alreadyReturnedQty, returnableQty, rate, returnQty }
  const [returnItems, setReturnItems] = useState([]);
  const [refundMode, setRefundMode] = useState('Cash'); // 'Cash' | 'Ledger'
  const [reason, setReason] = useState('Excess Quantity Returned');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  // Synchronize when selectedSale changes or modal opens
  useEffect(() => {
    if (selectedSale) {
      setActiveSaleId(selectedSale.id);
    } else if (sales.length > 0 && !activeSaleId) {
      setActiveSaleId(sales[0].id);
    }
  }, [selectedSale, sales]);

  // Find currently active sale object
  const currentSale = useMemo(() => {
    return sales.find(s => s.id === activeSaleId) || selectedSale || null;
  }, [sales, activeSaleId, selectedSale]);

  // Populate return items whenever currentSale changes
  useEffect(() => {
    if (!currentSale) {
      setReturnItems([]);
      return;
    }

    let items = [];
    if (Array.isArray(currentSale.cart) && currentSale.cart.length > 0) {
      items = currentSale.cart.map((cItem, index) => {
        const pQty = Number(cItem.qty || cItem.enteredQty || 1);
        const retQty = Number(cItem.returnedQty || 0);
        const returnable = Math.max(0, pQty - retQty);
        const rate = Number(cItem.price || cItem.rate || (cItem.total / (pQty || 1)) || 0);

        return {
          id: cItem.id || `item-${index}`,
          productId: cItem.productId || cItem.id || null,
          name: cItem.name || 'Commodity Product',
          unit: cItem.unitName || cItem.unit || 'KG',
          purchasedQty: pQty,
          alreadyReturnedQty: retQty,
          returnableQty: returnable,
          rate: rate,
          returnQty: 0
        };
      });
    } else {
      // Fallback for flat sale objects
      const pQty = Number(currentSale.qty || currentSale.weight || currentSale.itemsCount || 1);
      const retQty = Number(currentSale.returnedQty || 0);
      const returnable = Math.max(0, pQty - retQty);
      const rate = Number(currentSale.rate || (Number(currentSale.amount || currentSale.grandTotal || 0) / (pQty || 1)));

      items = [{
        id: 'item-flat-1',
        productId: currentSale.productId || null,
        name: typeof currentSale.items === 'string' ? currentSale.items : (currentSale.productName || 'Commodity Sale'),
        unit: currentSale.unit || 'KG',
        purchasedQty: pQty,
        alreadyReturnedQty: retQty,
        returnableQty: returnable,
        rate: rate,
        returnQty: 0
      }];
    }

    setReturnItems(items);
    setCompletedReturn(null);
  }, [currentSale]);

  if (!isOpen) return null;

  // Handle quantity change for a line item
  const handleItemQtyChange = (index, value) => {
    setReturnItems(prev => {
      const copy = [...prev];
      const target = copy[index];
      let num = parseFloat(value);
      if (isNaN(num) || num < 0) num = 0;
      if (num > target.returnableQty) num = target.returnableQty;
      copy[index] = { ...target, returnQty: num };
      return copy;
    });
  };

  // Full return toggle for a single line item
  const handleSetFullReturnItem = (index) => {
    setReturnItems(prev => {
      const copy = [...prev];
      const target = copy[index];
      const newQty = target.returnQty === target.returnableQty ? 0 : target.returnableQty;
      copy[index] = { ...target, returnQty: newQty };
      return copy;
    });
  };

  // Full return for all items in this sale
  const handleReturnAllItems = () => {
    setReturnItems(prev => prev.map(item => ({
      ...item,
      returnQty: item.returnableQty
    })));
  };

  // Calculate live total refund
  const totalRefundAmount = returnItems.reduce((sum, item) => {
    return sum + (Number(item.returnQty) || 0) * (Number(item.rate) || 0);
  }, 0);

  const totalReturnQty = returnItems.reduce((sum, item) => sum + (Number(item.returnQty) || 0), 0);

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || totalReturnQty <= 0 || !currentSale) return;

    // Filter items that have return quantity > 0
    const itemsToReturn = returnItems
      .filter(item => Number(item.returnQty) > 0)
      .map(item => ({
        productId: item.productId,
        name: item.name,
        qty: Number(item.returnQty),
        unit: item.unit,
        rate: Number(item.rate),
        total: Number(item.returnQty) * Number(item.rate)
      }));

    setIsSubmitting(true);
    try {
      const returnRecord = await recordSaleReturn({
        saleId: currentSale.id,
        invoiceNo: currentSale.invoiceNo || `INV-${currentSale.id}`,
        customerId: currentSale.customerId || null,
        customerName: currentSale.partyName || currentSale.customerName || 'Customer Party',
        items: itemsToReturn,
        refundAmount: totalRefundAmount,
        refundMode: refundMode,
        reason: `${reason}${notes ? ' - ' + notes : ''}`,
        date: new Date().toLocaleDateString('en-GB')
      });

      setCompletedReturn(returnRecord);
    } catch (err) {
      alert(err.message || 'Failed to process sale return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !completedReturn) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className={`rounded-3xl max-w-xl w-full p-6 space-y-4 card-shadow border my-8 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Return Sale</h3>
              <p className="text-[11px] text-slate-400 font-bold">
                Process partial or full goods return, restock inventory & adjust customer balance
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
          /* ========================================================================= */
          /* SUCCESS SCREEN & VOUCHER */
          /* ========================================================================= */
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Sale Return Processed!</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Voucher #: <span className="font-mono font-black text-brand-500">{completedReturn.returnNo}</span>
              </p>
            </div>

            <div className={`p-4 rounded-2xl border text-left text-xs space-y-2.5 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Customer:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{completedReturn.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Original Invoice:</span>
                <span className="font-mono font-bold text-brand-500">{completedReturn.invoiceNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Refund Settlement:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {completedReturn.refundMode === 'Cash' ? 'Cash Refund from Counter' : 'Deducted from Customer Khata / Ledger'}
                </span>
              </div>

              {/* Items returned summary */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Restocked Items:</div>
                {completedReturn.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                    <span>{it.name} ({it.qty} {it.unit} @ Rs. {it.rate})</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rs. {it.total.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm">
                <span>Total Refund Amount:</span>
                <span className="text-emerald-500 font-mono">
                  Rs. {completedReturn.refundAmount.toLocaleString()}
                </span>
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
                <span>Print Return Voucher</span>
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
          /* ========================================================================= */
          /* RETURN FORM */
          /* ========================================================================= */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sale Details Banner */}
            <div className={`p-3.5 rounded-2xl border space-y-2 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Sale ID: </span>
                  <span className="font-mono font-black text-brand-500">
                    {currentSale?.invoiceNo || `SALE-${currentSale?.id}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Date: </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {currentSale?.date || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 font-semibold">Buyer / Party: </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {currentSale?.partyName || currentSale?.customerName || 'Walk-in'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Original Billed: </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    Rs. {Number(currentSale?.amount || currentSale?.grandTotal || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {currentSale?.returnStatus && (
                <div className="text-[11px] font-bold text-amber-500 pt-1">
                  Status: {currentSale.returnStatus} (Already Returned: Rs. {Number(currentSale.returnAmount || 0).toLocaleString()})
                </div>
              )}
            </div>

            {/* Line Items Return Table */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase text-slate-400 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-orange-500" />
                  <span>Items to Return</span>
                </label>
                <button
                  type="button"
                  onClick={handleReturnAllItems}
                  className="text-[11px] font-extrabold text-orange-600 hover:text-orange-700 cursor-pointer underline"
                >
                  Return All Items (Full Return)
                </button>
              </div>

              <div className={`border rounded-2xl overflow-hidden ${
                theme === 'dark' ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white'
              }`}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-extrabold uppercase ${
                      theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-2.5 px-3">Item / Product</th>
                      <th className="py-2.5 px-2 text-right">Purchased</th>
                      <th className="py-2.5 px-2 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Return Qty</th>
                      <th className="py-2.5 px-3 text-right">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {returnItems.map((item, idx) => {
                      const itemRefund = (Number(item.returnQty) || 0) * (Number(item.rate) || 0);

                      return (
                        <tr key={item.id} className={theme === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}>
                          {/* Item Name */}
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {item.name}
                            </div>
                            {item.alreadyReturnedQty > 0 && (
                              <div className="text-[10px] text-amber-500 font-bold">
                                Prev returned: {item.alreadyReturnedQty} {item.unit}
                              </div>
                            )}
                          </td>

                          {/* Purchased Qty */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                            {item.purchasedQty} {item.unit}
                          </td>

                          {/* Rate */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            Rs. {item.rate}
                          </td>

                          {/* Return Qty Input */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max={item.returnableQty}
                                step="any"
                                value={item.returnQty === 0 ? '' : item.returnQty}
                                placeholder="0"
                                onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                                className={`w-20 border rounded-lg px-2 py-1 text-xs font-mono font-black text-right outline-none focus:border-orange-500 ${
                                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleSetFullReturnItem(idx)}
                                className={`px-1.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                                  item.returnQty === item.returnableQty && item.returnableQty > 0
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title="Set full quantity for this item"
                              >
                                Max
                              </button>
                            </div>
                          </td>

                          {/* Item Refund */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-orange-600 dark:text-orange-400">
                            Rs. {itemRefund.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund Settlement Mode */}
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1">
                Refund Settlement Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMode('Cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    refundMode === 'Cash'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Cash Refund (Counter)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMode('Ledger')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    refundMode === 'Ledger'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Deduct Khata Balance</span>
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
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-500 cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="Excess Quantity Returned">Excess Quantity Returned</option>
                <option value="Quality / Grade Rejection">Quality / Grade Rejection</option>
                <option value="Damaged Bags / Packaging">Damaged Bags / Packaging</option>
                <option value="Customer Exchange Request">Customer Exchange Request</option>
                <option value="Other Reason">Other Custom Reason</option>
              </select>
            </div>

            {/* Live Total Refund Summary */}
            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-orange-700 dark:text-orange-400">Total Refund Payable:</div>
                <div className="text-[11px] text-slate-400 font-bold">
                  {totalReturnQty > 0 ? `${totalReturnQty} units being returned` : 'Enter quantity to return'}
                </div>
              </div>
              <span className="text-lg font-black text-orange-600 dark:text-orange-400 font-mono">
                Rs. {totalRefundAmount.toLocaleString()}
              </span>
            </div>

            {/* Submit & Cancel Buttons */}
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
                disabled={isSubmitting || totalRefundAmount <= 0}
                className="w-1/2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isSubmitting ? 'Processing...' : 'Confirm Return'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SaleReturnModal;
