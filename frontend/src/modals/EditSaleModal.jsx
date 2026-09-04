import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  DollarSign, 
  Package, 
  User, 
  Percent, 
  AlertCircle 
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const EditSaleModal = ({ isOpen, onClose, sale }) => {
  const { products = [], customers = [], updateSale } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('flat'); // 'flat' | 'percentage'
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sale) {
      setCustomerName(sale.partyName || sale.customerName || 'Walk-in Customer');
      setCustomerId(sale.customerId || null);
      
      const cartItems = Array.isArray(sale.cart) && sale.cart.length > 0
        ? sale.cart
        : (Array.isArray(sale.items) ? sale.items : []);

      const mappedItems = cartItems.map(it => {
        const prod = products.find(p => p.id === (it.productId || it.id)) || {};
        return {
          productId: it.productId || it.id || prod.id,
          name: it.name || it.productName || prod.name || 'Commodity Item',
          qty: Number(it.qty || it.enteredQty || 1),
          rate: Number(it.rate || it.price || prod.sellingPrice || 0),
          unit: prod.unit || it.unit || it.unitName || 'KG',
          unitName: prod.unit || it.unitName || it.unit || 'KG'
        };
      });

      setItems(mappedItems.length > 0 ? mappedItems : [{
        productId: products[0]?.id || '',
        name: products[0]?.name || '',
        qty: 1,
        rate: Number(products[0]?.sellingPrice || 0),
        unit: products[0]?.unit || 'KG',
        unitName: products[0]?.unit || 'KG'
      }]);

      setPaidAmount(Number(sale.paidAmount || 0));
      setDiscount(Number(sale.discount || 0));
      setPaymentMethod(sale.paymentMode || sale.paymentMethod || 'Cash');
    }
  }, [sale, products]);

  if (!isOpen || !sale) return null;

  const handleAddItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setItems([
      ...items,
      {
        productId: firstProd.id,
        name: firstProd.name,
        qty: 1,
        rate: Number(firstProd.sellingPrice || 0),
        unit: firstProd.unit || 'KG',
        unitName: firstProd.unit || 'KG'
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert("At least one commodity item is required in the sale invoice.");
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
          rate: Number(prod.sellingPrice || 0),
          unit: prod.unit || 'KG',
          unitName: prod.unit || 'KG'
        };
      }
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.rate || 0)), 0);
  const calculatedDiscount = discountType === 'percentage'
    ? (subtotal * (Number(discount) || 0)) / 100
    : (Number(discount) || 0);
  const grandTotal = Math.max(0, subtotal - calculatedDiscount);
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
      await updateSale(sale.id, {
        customerName,
        customerId,
        items,
        paidAmount: Number(paidAmount) || 0,
        discount: calculatedDiscount,
        paymentMethod
      });

      onClose();
    } catch (err) {
      console.error('Update sale error:', err);
      alert(err.message || "Failed to update sale invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className={`rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 card-shadow border transition-all ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Edit Sale Invoice</span>
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                  • {sale.invoiceNo}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Adjust customer party, commodity items, rates, and cash collections
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
          {/* Customer Selection Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Customer / Regular Party</span>
              </label>
              <select
                value={customerId || 'walkin'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'walkin') {
                    setCustomerId(null);
                    setCustomerName('Walk-in Customer');
                  } else {
                    const cust = customers.find(c => c.id === val);
                    if (cust) {
                      setCustomerId(cust.id);
                      setCustomerName(cust.name);
                    }
                  }
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="walkin">Walk-in Customer (Counter Cash)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city})` : ''} - Balance: Rs. {Number(c.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {!customerId && (
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Walk-in Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Counter Buyer / Farmer"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Commodity Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-brand-500" />
                <span>Commodity Sale Items</span>
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
                    className={`grid grid-cols-12 gap-2 p-2.5 rounded-2xl border items-center ${
                      theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Product Selector */}
                    <div className="col-span-5 sm:col-span-5">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
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

          {/* Invoice Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-black uppercase text-slate-400">Total Items</div>
                <div className="font-mono font-black text-sm text-slate-800 dark:text-slate-200 mt-0.5">{items.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-black uppercase text-slate-400">Subtotal</div>
                <div className="font-mono font-black text-sm text-slate-800 dark:text-slate-200 mt-0.5">Rs. {subtotal.toLocaleString()}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-black uppercase text-slate-400">Paid Amount</div>
                <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">Rs. {Number(sale.paidAmount || 0).toLocaleString()}</div>
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
              <span>{isSubmitting ? 'Updating...' : 'Save & Update Sale Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EditSaleModal;
