import React, { useState, useEffect } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X,
  LayoutGrid, List, User, UserPlus,
  Percent, CheckCircle2, DollarSign,
  CreditCard, Smartphone, Wallet, Edit3,
  RefreshCw, Wheat, Check, PanelLeftClose, PanelLeftOpen, Maximize2
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useSidebar } from '../context/SidebarContext';
import { ReceiptModal } from '../components/ReceiptModal';

export const CreateOrder = () => {
  const { products, categories, customers, addCustomer, createSale } = useERP();
  const { theme } = useTheme();
  const { t, locale } = useLocale();
  const { isCollapsed, toggleSidebar } = useSidebar();

  // View Mode: 'grid' | 'compact'
  const [viewMode, setViewMode] = useState('grid');

  // Search & Category Filters for Products
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart State
  // item: { id, productId, name, qty, unit, unitMultiplier, basePrice, price, discountPct, total, stockQty }
  const [cart, setCart] = useState([]);

  // Order-Level Discount & Tax
  const [orderDiscountType, setOrderDiscountType] = useState('percentage'); // 'percentage' | 'flat'
  const [orderDiscountValue, setOrderDiscountValue] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0); // 0% default

  // Customer / Party State
  const [customerType, setCustomerType] = useState('Walk-in Customer'); // 'Walk-in Customer' | 'Regular Party'
  const [walkinName, setWalkinName] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [partySearch, setPartySearch] = useState('');

  // Payment & Settlement State
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' | 'Card'
  const [amountReceived, setAmountReceived] = useState('');
  const [saleNote, setSaleNote] = useState('');

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(null); // item to edit
  const [tempNewRate, setTempNewRate] = useState('');

  // Quick Customer Creation Form
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    city: 'Faisalabad',
    openingBalance: 0
  });

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState(null);

  // Unit multiplier helpers
  const getUnitMultiplier = (unitName) => {
    switch (unitName) {
      case 'Mann':
      case 'Mann (40 KG)':
        return 40;
      case 'Bori':
      case 'Bori (50 KG)':
      case 'Bag':
        return 50;
      case 'Gram':
      case 'ML':
        return 0.001;
      case 'Dozen':
        return 12;
      case 'Ton':
        return 1000;
      default:
        return 1;
    }
  };

  // Keyboard Shortcuts (F9 or Ctrl+Enter to Checkout, Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handlePlaceOrder();
      } else if (e.key === 'Escape') {
        setShowCustomerModal(false);
        setShowDiscountModal(false);
        setShowRateModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedParty, customerType, amountReceived, orderDiscountValue, taxPercentage, paymentMode]);

  // Recalculate a single line item
  const recalculateLineItem = (item) => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const discountPct = Number(item.discountPct) || 0;
    const gross = qty * price;
    const lineDiscount = (gross * discountPct) / 100;
    const total = Math.max(0, Math.round(gross - lineDiscount));
    return { ...item, total };
  };

  // Add Product to Cart
  const addToCart = (product) => {
    if (product.stockQty <= 0) {
      alert(t('stockAlertZero'));
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const nextQty = existing.qty + 1;
        if (nextQty > product.stockQty) {
          alert(t('saleStockExceeded', { qty: nextQty, unit: existing.unit || t('kg'), stock: product.stockQty }));
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id
            ? recalculateLineItem({ ...item, qty: nextQty })
            : item
        );
      } else {
        const defaultUnit = product.unit || t('kg');
        const newItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          productId: product.id,
          name: product.name,
          qty: 1,
          unit: defaultUnit,
          unitMultiplier: 1,
          basePrice: Number(product.sellingPrice) || 0,
          price: Number(product.sellingPrice) || 0,
          discountPct: 0,
          total: Number(product.sellingPrice) || 0,
          stockQty: product.stockQty
        };
        return [...prev, recalculateLineItem(newItem)];
      }
    });
  };

  // Update Cart Quantity
  const updateItemQty = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stockQty) {
            alert(t('saleStockExceeded', { qty: newQty, unit: item.unit, stock: item.stockQty }));
            return item;
          }
          return recalculateLineItem({ ...item, qty: newQty });
        }
        return item;
      }).filter(Boolean);
    });
  };

  // Direct edit Cart Quantity
  const setDirectItemQty = (productId, val) => {
    const num = Math.max(1, Number(val) || 1);
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          if (num > item.stockQty) {
            alert(t('saleStockExceeded', { qty: num, unit: item.unit, stock: item.stockQty }));
            return recalculateLineItem({ ...item, qty: item.stockQty });
          }
          return recalculateLineItem({ ...item, qty: num });
        }
        return item;
      });
    });
  };

  // Update Item Unit
  const updateItemUnit = (productId, newUnit) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          let adjustedPrice = item.basePrice;
          if (newUnit === 'Mann' || newUnit === 'Mann (40 KG)') {
            adjustedPrice = item.basePrice * 40;
          } else if (newUnit === 'Bori' || newUnit === 'Bori (50 KG)' || newUnit === 'Bag') {
            adjustedPrice = item.basePrice * 50;
          } else if (newUnit === 'Gram' || newUnit === 'ML') {
            adjustedPrice = item.basePrice / 1000;
          } else if (newUnit === 'Dozen') {
            adjustedPrice = item.basePrice * 12;
          } else if (newUnit === 'Ton') {
            adjustedPrice = item.basePrice * 1000;
          }
          return recalculateLineItem({
            ...item,
            unit: newUnit,
            unitMultiplier: getUnitMultiplier(newUnit),
            price: adjustedPrice
          });
        }
        return item;
      });
    });
  };

  // Update Item Discount %
  const updateItemDiscountPct = (productId, discPct) => {
    const val = Math.min(100, Math.max(0, Number(discPct) || 0));
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          return recalculateLineItem({ ...item, discountPct: val });
        }
        return item;
      });
    });
  };

  // Apply Rate Override
  const handleSaveRateOverride = () => {
    if (!showRateModal) return;
    const newPrice = Math.max(0, Number(tempNewRate) || 0);
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === showRateModal.productId) {
          return recalculateLineItem({ ...item, price: newPrice });
        }
        return item;
      });
    });
    setShowRateModal(null);
  };

  // Remove Item from Cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Clear Cart
  const clearCart = (skipConfirm = false) => {
    if (!skipConfirm && cart.length > 0 && !window.confirm(t('confirmClearSaleCart'))) {
      return;
    }
    setCart([]);
    setOrderDiscountValue(0);
    setTaxPercentage(0);
    setWalkinName('');
    setSelectedParty(null);
    setCustomerType('Walk-in Customer');
    setPaymentMode('Cash');
    setAmountReceived('');
    setSaleNote('');
  };

  // Financial Calculations
  const grossSubtotal = cart.reduce((acc, item) => acc + (item.total || (item.qty * item.price)), 0);
  const totalItemsCount = cart.length;
  const totalQuantityUnits = cart.reduce((acc, item) => acc + Number(item.qty), 0);

  // Calculate Order Discount
  let orderDiscountAmount = 0;
  if (orderDiscountType === 'percentage') {
    orderDiscountAmount = (grossSubtotal * (Number(orderDiscountValue) || 0)) / 100;
  } else {
    orderDiscountAmount = Number(orderDiscountValue) || 0;
  }
  orderDiscountAmount = Math.min(grossSubtotal, Math.max(0, orderDiscountAmount));

  // Calculate Tax / GST
  const taxableAmount = Math.max(0, grossSubtotal - orderDiscountAmount);
  const taxAmount = (taxableAmount * (Number(taxPercentage) || 0)) / 100;

  // Net Grand Total
  const netGrandTotal = Math.round(taxableAmount + taxAmount);

  // Payment Received & Balance / Change Calculations
  const receivedNum = amountReceived === '' ? (paymentMode === 'Mandi Credit' ? 0 : netGrandTotal) : Number(amountReceived) || 0;
  const changeDue = Math.max(0, receivedNum - netGrandTotal);
  const remainingDue = Math.max(0, netGrandTotal - receivedNum);

  // Customer Khata balances
  const previousKhataBalance = selectedParty ? Number(selectedParty.balance || 0) : 0;
  const newKhataBalance = previousKhataBalance + remainingDue;

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Filtered Customers for Modal
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (c.phone && c.phone.includes(partySearch)) ||
    (c.city && c.city.toLowerCase().includes(partySearch.toLowerCase()))
  );

  // Handle Quick Add Customer
  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;

    try {
      const created = await addCustomer({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim() || 'N/A',
        city: newCustomerForm.city.trim() || 'Local Mandi',
        customerType: 'Regular Party',
        openingBalance: Number(newCustomerForm.openingBalance) || 0
      });

      setSelectedParty(created);
      setCustomerType('Regular Party');
      setShowNewCustomerForm(false);
      setShowCustomerModal(false);
      setNewCustomerForm({ name: '', phone: '', city: 'Faisalabad', openingBalance: 0 });
    } catch (err) {
      alert(err.message || 'Failed to create customer');
    }
  };

  // Submit and Place Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert(t('cartIsEmpty'));
      return;
    }

    if (customerType === 'Regular Party' && !selectedParty) {
      alert(t('searchCustomerParty'));
      return;
    }

    if (remainingDue > 0 && (!selectedParty || customerType !== 'Regular Party')) {
      alert('Khata (Udhaar) is only available for Saved / Permanent Customers. Please select or add a Customer to record Khata balance, or collect full cash.');
      return;
    }

    // Stock validation check
    for (const item of cart) {
      const liveProd = products.find(p => p.id === item.productId);
      const availableQty = liveProd ? Number(liveProd.stockQty ?? liveProd.stockqty ?? 0) : Number(item.stockQty ?? 0);
      if (item.qty > availableQty) {
        alert(t('saleStockExceeded', { qty: item.qty, unit: item.unit || t('kg'), stock: availableQty }));
        return;
      }
    }

    const finalCustomerName = customerType === 'Regular Party' && selectedParty
      ? selectedParty.name
      : (walkinName.trim() || t('walkInCustomer'));

    const actualPaid = Math.min(netGrandTotal, receivedNum);

    const orderPayload = {
      orderId: `GM-ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleString(locale === 'ur' ? 'ur-PK' : 'en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      customerType,
      customerId: customerType === 'Regular Party' && selectedParty ? selectedParty.id : null,
      customerName: finalCustomerName,
      customerPhone: selectedParty?.phone || '',
      customerCity: selectedParty?.city || '',
      items: cart.map(item => ({
        id: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price,
        unit: item.unit
      })),
      subtotal: grossSubtotal,
      discount: orderDiscountAmount,
      tax: taxAmount,
      grandTotal: netGrandTotal,
      paidAmount: actualPaid,
      paymentStatus: actualPaid >= netGrandTotal ? 'Paid' : actualPaid > 0 ? 'Partial' : 'Pending',
      paymentMethod: paymentMode,
      saleNote
    };

    try {
      await createSale({
        customerType,
        customerId: orderPayload.customerId,
        customerName: finalCustomerName,
        grandTotal: netGrandTotal,
        paidAmount: actualPaid,
        paymentMethod: paymentMode,
        cart: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          rate: item.price,
          unitName: item.unit
        }))
      });
    } catch (err) {
      alert(err.message || 'Order creation failed.');
      return;
    }

    setCompletedOrderData(orderPayload);
    setIsReceiptOpen(true);
    clearCart(true);
  };

  const isRTL = locale === 'ur';

  return (
    <div className="space-y-3.5 pb-10">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & CATEGORY CHIPS BAR */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl border card-shadow space-y-3 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-500 shadow-xs">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight">
                  {t('posTerminalTitle')}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('liveActiveBadge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('posTerminalSubtitle')}
              </p>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-2">
            {/* Sidebar Collapse Toggle Button */}
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${isCollapsed
                ? 'bg-brand-500/10 border-brand-500/40 text-brand-600 dark:text-brand-400'
                : theme === 'dark'
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar (Full Width POS)"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">{isCollapsed ? "Sidebar" : "Wide Mode"}</span>
            </button>

            {/* Clear / New Sale */}
            <button
              onClick={clearCart}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${theme === 'dark'
                ? 'bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('newSaleBtn')}</span>
            </button>
          </div>
        </div>

        {/* Category Quick Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100 dark:border-slate-700/80">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${selectedCategory === 'All'
              ? 'bg-brand-500 text-white shadow-sm'
              : theme === 'dark'
                ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
          >
            {t('allCategories')} ({products.length})
          </button>
          {categories.map(c => {
            const count = products.filter(p => p.category === c.name).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${selectedCategory === c.name
                  ? 'bg-brand-500 text-white shadow-sm'
                  : theme === 'dark'
                    ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {c.name} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3-PANEL RESPONSIVE POS BODY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">

        {/* ======================================================================= */}
        {/* 2. LEFT PANEL — COMMODITY PRODUCTS (4.5 Cols) */}
        {/* ======================================================================= */}
        <div className={`lg:col-span-4 border rounded-3xl p-4 card-shadow flex flex-col space-y-3 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          {/* Search Header */}
          <div className="relative">
            <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchCommoditiesPlaceholder')}
              className={`w-full border rounded-2xl py-2.5 text-xs font-bold outline-none transition focus:border-brand-500 ${isRTL ? 'pr-10 pl-8' : 'pl-10 pr-8'
                } ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer ${isRTL ? 'left-3' : 'right-3'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable Products Container */}
          <div className="max-h-[580px] overflow-y-auto pr-1 space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Wheat className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
                <p className="text-xs text-slate-400 font-medium">
                  {t('noProductsMatch')}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW: Responsive 2-column Cards */
              <div className="grid grid-cols-2 gap-2.5">
                {filteredProducts.map(p => {
                  const cartItem = cart.find(i => i.productId === p.id);
                  const isOutOfStock = p.stockQty <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`p-3 rounded-2xl border flex flex-col justify-between transition cursor-pointer relative group ${cartItem
                        ? 'border-brand-500 bg-brand-500/5 shadow-xs ring-1 ring-brand-500/30'
                        : isOutOfStock
                          ? 'opacity-60 border-slate-200 dark:border-slate-800'
                          : theme === 'dark'
                            ? 'bg-slate-900/60 border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-black text-xs leading-snug line-clamp-2 group-hover:text-brand-500 transition">
                            {p.name}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 truncate max-w-[70px]">{p.category}</span>
                          <span className={`px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ${isOutOfStock
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : p.stockQty <= (p.minStock || 10)
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
                            {p.stockQty} {p.unit || t('kg')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <div className="font-black text-xs text-brand-500">
                          Rs. {Number(p.sellingPrice).toLocaleString()}
                        </div>

                        {/* Quick +/- Action */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {cartItem ? (
                            <>
                              <button
                                onClick={() => updateItemQty(p.id, -1)}
                                className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-brand-600 dark:text-brand-400 w-4 text-center">
                                {cartItem.qty}
                              </span>
                              <button
                                onClick={() => updateItemQty(p.id, 1)}
                                className="w-5 h-5 rounded-md bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={isOutOfStock}
                              onClick={() => addToCart(p)}
                              className="w-6 h-6 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT LIST VIEW: Single column dense list */
              <div className="space-y-1.5">
                {filteredProducts.map(p => {
                  const cartItem = cart.find(i => i.productId === p.id);
                  const isOutOfStock = p.stockQty <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition cursor-pointer ${cartItem
                        ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/30'
                        : isOutOfStock
                          ? 'opacity-60 border-slate-200 dark:border-slate-800'
                          : theme === 'dark'
                            ? 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-xs truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{p.category}</span>
                          <span>•</span>
                          <span className={`font-bold ${isOutOfStock ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {p.stockQty} {p.unit || t('kg')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-black text-xs text-brand-500">
                          Rs. {Number(p.sellingPrice).toLocaleString()}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {cartItem ? (
                            <>
                              <button
                                onClick={() => updateItemQty(p.id, -1)}
                                className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-brand-600 dark:text-brand-400 w-4 text-center">
                                {cartItem.qty}
                              </span>
                              <button
                                onClick={() => updateItemQty(p.id, 1)}
                                className="w-5 h-5 rounded-md bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={isOutOfStock}
                              onClick={() => addToCart(p)}
                              className="w-6 h-6 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. CENTER PANEL — CURRENT SALE CART (4.5 Cols) */}
        {/* ======================================================================= */}
        <div className={`lg:col-span-5 border rounded-3xl p-4 card-shadow flex flex-col space-y-3 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          {/* Cart Table Area */}
          <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
            {cart.length === 0 ? (
              /* Clean Empty-Cart State */
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="font-black text-sm text-slate-700 dark:text-slate-200">
                  {t('cartIsEmpty')}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {t('cartIsEmptySub')}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                    <th className="py-2.5 px-2">{t('srNo')}</th>
                    <th className="py-2.5 px-3">{t('product')}</th>
                    <th className="py-2.5 px-2 text-center">{t('qty')}</th>
                    <th className="py-2.5 px-2 text-center">{t('unit')}</th>
                    <th className="py-2.5 px-2 text-right">{t('rate')}</th>
                    <th className="py-2.5 px-2 text-center">{t('itemDiscountPct')}</th>
                    <th className="py-2.5 px-3 text-right">{t('lineTotal')}</th>
                    <th className="py-2.5 px-1 text-center"></th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
                  }`}>
                  {cart.map((item, index) => (
                    <tr key={item.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-black text-xs max-w-[160px] truncate">{item.name}</div>
                      </td>

                      {/* Qty with inline +/- controls */}
                      <td className="py-3 px-2 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => updateItemQty(item.productId, -1)}
                            className="w-5 h-5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center font-black cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stockQty}
                            value={item.qty}
                            onChange={(e) => setDirectItemQty(item.productId, e.target.value)}
                            className="w-10 text-center bg-transparent font-black text-xs outline-none"
                          />
                          <button
                            onClick={() => updateItemQty(item.productId, 1)}
                            className="w-5 h-5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center font-black cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Unit Selector */}
                      <td className="py-3 px-2 text-center">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItemUnit(item.productId, e.target.value)}
                          className={`text-[11px] font-extrabold py-1 px-2 rounded-xl border outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                        >
                          <option value="KG">KG</option>
                          <option value="Gram">Gram</option>
                          <option value="Mann">Mann (40 KG)</option>
                          <option value="Bori">Bori (50 KG)</option>
                          <option value="Litre">Litre</option>
                          <option value="ML">ML</option>
                          <option value="Dozen">Dozen</option>
                          <option value="Pack">Pack</option>
                          <option value="Carton">Carton</option>
                          <option value="Piece">Piece</option>
                          <option value="Ton">Ton</option>
                        </select>
                      </td>

                      {/* Price / Rate with Edit Button */}
                      <td className="py-3 px-2 text-right font-black">
                        <button
                          onClick={() => {
                            setShowRateModal(item);
                            setTempNewRate(item.price);
                          }}
                          className="inline-flex items-center gap-1 hover:text-brand-500 transition group cursor-pointer"
                          title="Quick Price Override"
                        >
                          <span>Rs. {Number(item.price).toLocaleString()}</span>
                          <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-brand-500 opacity-70" />
                        </button>
                      </td>

                      {/* Discount % */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPct || 0}
                          onChange={(e) => updateItemDiscountPct(item.productId, e.target.value)}
                          className={`w-12 text-center py-1 rounded-xl border text-xs font-black outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                        />
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 text-right font-black text-xs text-brand-500">
                        Rs. {Number(item.total).toLocaleString()}
                      </td>

                      {/* Remove Button */}
                      <td className="py-3 px-1 text-center">
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded-lg cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 4. RIGHT PANEL — CHECKOUT & SETTLEMENT (Responsive Column Sizing) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3.5">

          {/* CARD A: SUMMARY */}
          <div className={`border rounded-3xl p-4 card-shadow space-y-3 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400 whitespace-nowrap">
                {t('orderSummaryTitle')}
              </span>
              <span className="font-mono text-brand-500 font-black text-[11px] whitespace-nowrap shrink-0">
                {totalItemsCount} {t('items')} • {totalQuantityUnits} {t('qty')}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 font-bold">
                <span>{t('grossSubtotal')}:</span>
                <span className="font-black text-slate-800 dark:text-slate-100">Rs. {grossSubtotal.toLocaleString()}</span>
              </div>

              {orderDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-black">
                  <span>{t('discountAmount')}:</span>
                  <span>- Rs. {orderDiscountAmount.toLocaleString()}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-amber-500 font-black">
                  <span>{t('taxGST')} ({taxPercentage}%):</span>
                  <span>+ Rs. {taxAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase text-slate-400 whitespace-nowrap shrink-0">
                  {t('netPayableTotal')}
                </span>
                <span className="text-xl font-black text-brand-500 whitespace-nowrap shrink-0">
                  Rs. {netGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* CARD B: CUSTOMER KHATA PROFILE */}
          <div className={`border rounded-3xl p-4 card-shadow space-y-2.5 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-400">
                <User className="w-4 h-4 text-brand-500" />
                <span>{t('selectedCustomerProfile')}</span>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="text-xs font-black text-brand-500 hover:underline cursor-pointer"
              >
                {selectedParty ? t('edit') : t('add')}
              </button>
            </div>

            {customerType === 'Regular Party' && selectedParty ? (
              <div className="p-3 rounded-2xl bg-brand-500/5 border border-brand-500/20 space-y-1.5 text-xs">
                <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{selectedParty.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{selectedParty.city}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-brand-500/10">
                  <span className="text-slate-400 font-bold">{t('previousKhataBalance')}:</span>
                  <span className="font-black text-amber-500">Rs. {previousKhataBalance.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder={t('walkInNamePlaceholder')}
                  className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            )}
          </div>

          {/* CARD C: PAYMENT & SETTLEMENT */}
          <div className={`border rounded-3xl p-4 card-shadow space-y-3 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {t('paymentSettlementTitle')}
            </h3>

            {/* Payment Mode Pills */}
            <div className={`grid ${customerType === 'Regular Party' && selectedParty ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
              {[
                { key: 'Cash', label: t('Cash'), icon: DollarSign },
                { key: 'Card', label: t('Card'), icon: CreditCard },
                ...(customerType === 'Regular Party' && selectedParty
                  ? [{ key: 'Khata (Udhaar)', label: t('khataCredit') || 'Khata (Udhaar)', icon: Wallet }]
                  : [])
              ].map(mode => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => {
                    setPaymentMode(mode.key);
                    if (mode.key === 'Khata (Udhaar)') {
                      setAmountReceived('0');
                    } else if (amountReceived === '0') {
                      setAmountReceived('');
                    }
                  }}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${paymentMode === mode.key
                    ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                    : theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <mode.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Received Amount Input */}
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">
                {t('amountReceivedInput')}
              </label>
              <input
                type="number"
                min="0"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={netGrandTotal.toString()}
                className={`w-full border rounded-2xl px-3.5 py-2.5 text-sm font-black outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            {/* Live Calculation: Change Due vs Khata Balance */}
            {customerType === 'Regular Party' && selectedParty ? (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs font-black">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>{t('previousKhataBalance')}:</span>
                  <span>Rs. {previousKhataBalance.toLocaleString()}</span>
                </div>
                {remainingDue > 0 ? (
                  <div className="flex items-center justify-between text-amber-500">
                    <span>{t('remainingDueKhata')}:</span>
                    <span className="text-sm font-black">+ Rs. {remainingDue.toLocaleString()}</span>
                  </div>
                ) : changeDue > 0 ? (
                  <div className="flex items-center justify-between text-emerald-500">
                    <span>{t('changeReturnDue')}:</span>
                    <span className="text-sm font-black">Rs. {changeDue.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-emerald-500 text-xs">
                    <span>{t('status')}:</span>
                    <span>{t('settled')} (100% Paid)</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-black text-xs text-brand-500">
                  <span>{t('newKhataBalanceAfterSale')}:</span>
                  <span className="text-sm">Rs. {newKhataBalance.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs font-black">
                  {changeDue > 0 ? (
                    <div className="flex items-center justify-between text-emerald-500">
                      <span>{t('changeReturnDue')}:</span>
                      <span className="text-sm font-black">Rs. {changeDue.toLocaleString()}</span>
                    </div>
                  ) : remainingDue > 0 ? (
                    <div className="flex items-center justify-between text-amber-500">
                      <span>{t('remainingDueKhata')}:</span>
                      <span className="text-sm font-black">Rs. {remainingDue.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-500 text-xs">
                      <span>{t('status')}:</span>
                      <span>{t('settled')} (100% Paid)</span>
                    </div>
                  )}
                </div>
                {remainingDue > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{t('khataOnlyForPermanentNotice')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRIMARY ACTION: COMPLETE SALE & PRINT RECEIPT */}
          <button
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
            className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black text-sm rounded-2xl transition shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer text-center"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="leading-snug">{t('completeAndPrintReceipt')}</span>
          </button>
          <div className="text-[10px] text-center text-slate-400 font-bold">
            {t('shortcutHint')}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODALS & DIALOGS */}
      {/* ========================================================================= */}

      {/* CUSTOMER SELECTION MODAL */}
      {showCustomerModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCustomerModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-lg w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black flex items-center gap-2">
                <User className="w-5 h-5 text-brand-500" />
                {t('selectCustomerModalTitle')}
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!showNewCustomerForm ? (
              <div className="space-y-3">
                {/* Search customer */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    placeholder={t('searchPartyPlaceholder')}
                    className={`w-full border rounded-2xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>

                {/* Walk-in Option */}
                <div
                  onClick={() => {
                    setCustomerType('Walk-in Customer');
                    setSelectedParty(null);
                    setShowCustomerModal(false);
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${customerType === 'Walk-in Customer' && !selectedParty
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-black'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <div>
                    <div className="font-black text-xs">{t('walkInCustomer')}</div>
                    <div className="text-[10px] text-slate-400">Cash on counter customer without khata</div>
                  </div>
                  {customerType === 'Walk-in Customer' && !selectedParty && <Check className="w-4 h-4" />}
                </div>

                {/* Customer List */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedParty(c);
                        setCustomerType('Regular Party');
                        setShowCustomerModal(false);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${selectedParty?.id === c.id
                        ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-black'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                        }`}
                    >
                      <div>
                        <div className="font-black text-xs">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.city} Mandi • {c.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{t('balance')}</div>
                        <div className="text-xs font-black text-amber-500">Rs. {Number(c.balance || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="text-xs font-black text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{t('addNewPartyQuick')}</span>
                  </button>
                  <button
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              /* Quick Add Customer Form */
              <form onSubmit={handleCreateCustomerSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('customerPartyName')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chaudhry & Sons"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                    className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">{t('phoneMobile')}</label>
                    <input
                      type="text"
                      placeholder="03001234567"
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                      className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">{t('mandiLocationCity')}</label>
                    <input
                      type="text"
                      value={newCustomerForm.city}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                      className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(false)}
                    className="w-1/2 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-2xl shadow-md cursor-pointer"
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ORDER DISCOUNT MODAL */}
      {showDiscountModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowDiscountModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-sm w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-500" />
                {t('applyDiscountModalTitle')}
              </h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderDiscountType('percentage')}
                className={`py-2 rounded-2xl text-xs font-black border transition cursor-pointer ${orderDiscountType === 'percentage'
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
              >
                {t('discountTypePercentage')}
              </button>
              <button
                type="button"
                onClick={() => setOrderDiscountType('flat')}
                className={`py-2 rounded-2xl text-xs font-black border transition cursor-pointer ${orderDiscountType === 'flat'
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
              >
                {t('discountTypeFlat')}
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                {t('discountValueInput')} ({orderDiscountType === 'percentage' ? '%' : 'Rs.'})
              </label>
              <input
                type="number"
                min="0"
                value={orderDiscountValue}
                onChange={(e) => setOrderDiscountValue(Number(e.target.value))}
                className={`w-full border rounded-2xl px-3.5 py-2.5 text-sm font-black outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowDiscountModal(false)}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-2xl shadow-md transition cursor-pointer"
            >
              {t('applyDiscountBtn')}
            </button>
          </div>
        </div>
      )}

      {/* QUICK RATE OVERRIDE MODAL */}
      {showRateModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowRateModal(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-sm w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-500" />
                {t('editItemPriceModalTitle')}
              </h3>
              <button
                onClick={() => setShowRateModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="font-black text-xs mb-2 text-brand-500">{showRateModal.name}</div>
              <label className="text-xs font-bold text-slate-400 block mb-1">{t('newRatePerUnit')}</label>
              <input
                type="number"
                min="0"
                value={tempNewRate}
                onChange={(e) => setTempNewRate(e.target.value)}
                className={`w-full border rounded-2xl px-3.5 py-2.5 text-sm font-black outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRateModal(null)}
                className="w-1/2 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveRateOverride}
                className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-2xl shadow-md transition cursor-pointer"
              >
                {t('saveRate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {isReceiptOpen && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          orderData={completedOrderData}
        />
      )}
    </div>
  );
};

export default CreateOrder;
