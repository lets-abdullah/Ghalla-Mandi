import React, { useState } from 'react';
import { RotateCcw, X, AlertCircle, CheckCircle2, DollarSign, Package, User, Printer } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const SaleReturnModal = ({ isOpen, onClose, selectedSale = null }) => {
  const { sales, customers, products, recordSaleReturn } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  // If selectedSale is passed, lock to that sale invoice, otherwise allow picking from sales or customer
  const [activeSaleId, setActiveSaleId] = useState(selectedSale?.id || (sales[0]?.id || ''));
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [returnedQty, setReturnedQty] = useState(1);
  const [returnRate, setReturnRate] = useState(products[0]?.sellingPrice || 0);
  const [refundMode, setRefundMode] = useState('Cash'); // 'Cash' | 'Ledger'
  const [reason, setReason] = useState('Excess Quantity Returned');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  if (!isOpen) return null;

  const currentSale = sales.find(s => s.id === activeSaleId) || selectedSale;
  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];
  const unit = currentProduct?.unit || 'KG';

  // Calculate live refund amount
  const calculatedRefund = Math.max(0, (Number(returnedQty) || 0) * (Number(returnRate) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !currentProduct || Number(returnedQty) <= 0) return;

    setIsSubmitting(true);
    try {
      const returnRecord = await recordSaleReturn({
        saleId: currentSale?.id || null,
        invoiceNo: currentSale?.invoiceNo || 'Direct Sale Return',
        customerId: currentSale?.customerId || null,
        customerName: currentSale?.partyName || currentSale?.customerName || 'Customer Party',
        items: [{
          productId: currentProduct.id,
          name: currentProduct.name,
          qty: Number(returnedQty),
          rate: Number(returnRate),
          unit: unit,
          total: calculatedRefund
        }],
        refundAmount: calculatedRefund,
        refundMode,
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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className={`rounded-3xl max-w-lg w-full p-6 space-y-4 card-shadow border ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black">Process Sale Return</h3>
              <p className="text-[11px] text-slate-400 font-medium">Restock returned goods & issue refund</p>
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
          /* Success & Voucher Screen */
          <div className="space-y-4 text-center py-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Sale Return Processed!</h4>
              <p className="text-xs text-slate-400 mt-0.5">Voucher #: <span className="font-mono font-black text-brand-500">{completedReturn.returnNo}</span></p>
            </div>

            <div className={`p-4 rounded-2xl border text-left text-xs space-y-2 ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold">{completedReturn.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Invoice:</span>
                <span className="font-mono font-bold text-brand-500">{completedReturn.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Restocked Item:</span>
                <span className="font-bold">{completedReturn.items[0]?.name} ({completedReturn.items[0]?.qty} {completedReturn.items[0]?.unit})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Refund Method:</span>
                <span className="font-bold">{completedReturn.refundMode === 'Cash' ? 'Cash Refund from Counter' : 'Deducted from Customer Khata'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm">
                <span>Total Refund Amount:</span>
                <span className="text-emerald-500 font-mono">Rs. {completedReturn.refundAmount.toLocaleString()}</span>
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
                <span>Print Voucher</span>
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
          /* Return Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Pick Sale Invoice */}
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1">
                Associated Sale Invoice
              </label>
              <select
                value={activeSaleId}
                onChange={(e) => {
                  setActiveSaleId(e.target.value);
                  const s = sales.find(x => x.id === e.target.value);
                  if (s && s.cart && s.cart[0]) {
                    setSelectedProductId(s.cart[0].productId || s.cart[0].id);
                    setReturnRate(s.cart[0].price || s.cart[0].rate || 0);
                  }
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {sales.length === 0 ? (
                  <option value="">Direct Return (No Invoices)</option>
                ) : (
                  sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.invoiceNo} • {s.partyName} (Rs. {s.amount || s.grandTotal})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Product To Restock */}
            <div>
              <label className="text-xs font-black text-slate-400 block mb-1">
                Product to Return & Restock
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find(x => x.id === e.target.value);
                  if (p) setReturnRate(p.sellingPrice || 0);
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
                  Return Rate / {unit} (Rs.)
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
                      ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                      : theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Cash Refund</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMode('Ledger')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    refundMode === 'Ledger'
                      ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
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
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
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

            {/* Live Total Banner */}
            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-orange-700 dark:text-orange-400">Total Refund Payable:</span>
              <span className="text-base font-black text-orange-600 dark:text-orange-400 font-mono">
                Rs. {calculatedRefund.toLocaleString()}
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
                disabled={isSubmitting || calculatedRefund <= 0}
                className="w-1/2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black shadow-md transition cursor-pointer"
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

export default SaleReturnModal;
