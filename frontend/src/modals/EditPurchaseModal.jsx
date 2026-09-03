import React, { useState, useEffect } from 'react';
import {
  Edit3,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Package,
  Truck,
  CreditCard
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const EditPurchaseModal = ({ isOpen, onClose, purchase }) => {
  const { products = [], suppliers = [], updatePurchase } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [supplierName, setSupplierName] = useState('');
  const [supplierId, setSupplierId] = useState(null);
  const [items, setItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (purchase) {
      setSupplierName(purchase.supplier || purchase.supplierName || 'Supplier');
      setSupplierId(purchase.supplierId || null);

      const cartItems = Array.isArray(purchase.cart) && purchase.cart.length > 0
        ? purchase.cart
        : (Array.isArray(purchase.items) ? purchase.items : []);

      const mappedItems = cartItems.map(it => {
        const prod = products.find(p => p.id === (it.productId || it.id)) || {};
        return {
          productId: it.productId || it.id || prod.id,
          name: it.name || it.productName || prod.name || 'Commodity Item',
          qty: Number(it.qty || it.enteredQty || 1),
          rate: Number(it.rate || it.ratePerEnteredUnit || it.price || prod.purchasePrice || 0),
          unitName: it.unitName || it.unit || prod.unit || 'KG'
        };
      });

      setItems(mappedItems.length > 0 ? mappedItems : [{
        productId: products[0]?.id || '',
        name: products[0]?.name || '',
        qty: 1,
        rate: Number(products[0]?.purchasePrice || 0),
        unitName: products[0]?.unit || 'KG'
      }]);

      setPaidAmount(Number(purchase.paidAmount || purchase.paidamount || 0));
      setNotes(purchase.notes || purchase.note || '');
    }
  }, [purchase, products]);

  if (!isOpen || !purchase) return null;

  const handleAddItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setItems([
      ...items,
      {
        productId: firstProd.id,
        name: firstProd.name,
        qty: 1,
        rate: Number(firstProd.purchasePrice || 0),
        unitName: firstProd.unit || 'KG'
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert("At least one commodity item is required in the purchase voucher.");
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[index] = {
          ...updated[index],
          productId: prod.id,
          name: prod.name,
          rate: Number(prod.purchasePrice || 0),
          unitName: prod.unit || 'KG'
        };
      }
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  // Calculations
  const grandTotal = items.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.rate || 0)), 0);
  const remainingDue = Math.max(0, grandTotal - Number(paidAmount || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    for (const it of items) {
      if (Number(it.qty) <= 0) {
        alert(`Quantity for ${it.name} must be greater than 0.`);
        return;
      }
      if (Number(it.rate) < 0) {
        alert(`Rate for ${it.name} cannot be negative.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await updatePurchase(purchase.id, {
        supplierName,
        supplierId,
        items,
        paidAmount: Number(paidAmount) || 0,
        notes
      });

      onClose();
    } catch (err) {
      console.error('Update purchase error:', err);
      alert(err.message || "Failed to update purchase voucher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className={`rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 card-shadow border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Edit Purchase Voucher</span>
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                  • {purchase.purchaseNo}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Adjust supplier details, commodity items, rates, and payment amounts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier Selection Row */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-brand-500" />
                <span>Supplier</span>
              </label>
              <select
                value={supplierId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const sup = suppliers.find(s => s.id === val);
                  if (sup) {
                    setSupplierId(sup.id);
                    setSupplierName(sup.name);
                  } else {
                    setSupplierId(null);
                    setSupplierName(val || 'Supplier');
                  }
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.businessName ? `(${s.businessName})` : ''} - Balance: Rs. {Number(s.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Commodity Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-brand-500" />
                <span>Commodity Inward Items</span>
              </span>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-black text-brand-500 hover:text-brand-600 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const lineTotal = Number(item.qty || 0) * Number(item.rate || 0);
                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-12 gap-2 p-2.5 rounded-2xl border items-center ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                  >
                    {/* Product Selector */}
                    <div className="col-span-5 sm:col-span-5">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit || 'KG'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty */}
                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.qty}
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === ',') e.preventDefault();
                        }}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Qty"
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    {/* Rate */}
                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.rate}
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === ',') e.preventDefault();
                        }}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Rate"
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    {/* Line Total */}
                    <div className="col-span-11 sm:col-span-2 text-right font-black font-mono text-xs text-brand-600 dark:text-brand-400">
                      Rs. {lineTotal.toLocaleString()}
                    </div>

                    {/* Delete Button */}
                    <div className="col-span-1 sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-black uppercase text-slate-400">Total Items</div>
                <div className="font-mono font-black text-sm text-slate-800 dark:text-slate-200 mt-0.5">{items.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-black uppercase text-slate-400">Paid Amount</div>
                <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">Rs. {Number(purchase.paidAmount || purchase.paidamount || 0).toLocaleString()}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800">
                <div className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400">Grand Total</div>
                <div className="font-mono font-black text-sm text-brand-600 dark:text-brand-400 mt-0.5">Rs. {grandTotal.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Save & Update Purchase'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPurchaseModal;
