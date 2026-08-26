import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X,
  LayoutGrid, List, User, UserPlus,
  Percent, CheckCircle2, DollarSign,
  CreditCard, Smartphone, Wallet, Edit3,
  RefreshCw, Wheat, Check, PanelLeftClose, PanelLeftOpen, Maximize2,
  Receipt, AlertCircle, FileText, ChevronDown, Filter, Building2
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useSidebar } from '../context/SidebarContext';
import { ReceiptModal } from '../components/ReceiptModal';

export const CreateOrder = () => {
  const { products = [], categories = [], customers = [], addCustomer, createSale } = useERP();
  const { theme } = useTheme();
  const { t, locale } = useLocale();
  const isRTL = locale === 'ur';
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
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
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
  const receivedNum = amountReceived === '' ? (paymentMode === 'Credit' || paymentMode === 'Mandi Credit' || paymentMode === 'Khata (Udhaar)' ? 0 : netGrandTotal) : Number(amountReceived) || 0;
  const changeDue = Math.max(0, receivedNum - netGrandTotal);
  const remainingDue = Math.max(0, netGrandTotal - receivedNum);

  // Customer Khata balances
  const previousKhataBalance = selectedParty ? Number(selectedParty.balance || 0) : 0;
  const newKhataBalance = previousKhataBalance + remainingDue;

  // Dynamic Unique Categories directly from Products Catalog (no duplicates, no mutations)
  const availableCategories = useMemo(() => {
    const catSet = new Set();
    (products || []).forEach(p => {
      if (p && p.category && typeof p.category === 'string' && p.category.trim()) {
        catSet.add(p.category.trim());
      }
    });
    if (Array.isArray(categories)) {
      categories.forEach(c => {
        const name = typeof c === 'string' ? c : c?.name;
        if (name && name.trim()) catSet.add(name.trim());
      });
    }
    return Array.from(catSet).sort((a, b) => a.localeCompare(b));
  }, [products, categories]);

  // Product Count per Category
  const categoryCounts = useMemo(() => {
    const counts = {};
    (products || []).forEach(p => {
      const cat = p?.category && typeof p.category === 'string' && p.category.trim() ? p.category.trim() : 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Immediate filtering of products by search and category
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return (products || []).filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const matchesSearch = !term || pName.includes(term) || pCat.includes(term);
      const matchesCat = selectedCategory === 'All' || (p.category && p.category.trim() === selectedCategory.trim());
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, selectedCategory]);

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
    if (cart.length === 0 || isPlacingOrder) {
      if (cart.length === 0) alert(t('cartIsEmpty'));
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

    setIsPlacingOrder(true);
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

      setCompletedOrderData(orderPayload);
      setIsReceiptOpen(true);
      clearCart(true);
    } catch (err) {
      alert(err.message || 'Order creation failed.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-10">
      {/* ========================================================================= */}
      {/* 2-PANEL BALANCED PROFESSIONAL POS WORKSTATION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ======================================================================= */}
        {/* 1. LEFT PANEL — COMMODITY PRODUCTS SELECTION (7 Cols) */}
        {/* ======================================================================= */}
        <div className={`lg:col-span-7 xl:col-span-7 border rounded-3xl p-4 sm:p-5 card-shadow flex flex-col space-y-3.5 transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Top Controls Bar: Search + Category Chips + View Toggles */}
          <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('searchCommoditiesPlaceholder')}
                  className={`w-full border rounded-2xl py-2.5 text-xs font-bold outline-none transition focus:border-brand-500 ${
                    isRTL ? 'pr-10 pl-8' : 'pl-10 pr-8'
                  } ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
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

              {/* Category Dropdown Selector */}
              <div className="relative shrink-0 min-w-[140px]">
                <select
                  id="pos-category-dropdown"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full border rounded-2xl py-2.5 pl-3 pr-8 text-xs font-bold outline-none transition cursor-pointer appearance-none ${
                    selectedCategory !== 'All' ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-extrabold' : ''
                  } ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                >
                  <option value="All">All Categories ({products.length})</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({categoryCounts[cat] || 0})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Mode & Wide Mode Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Grid / List View Toggle */}
                <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title={t('gridView')}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'compact'
                        ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title={t('compactView')}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sidebar Collapse Toggle Button */}
                <button
                  onClick={toggleSidebar}
                  className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                    isCollapsed
                      ? 'bg-brand-500/10 border-brand-500/40 text-brand-600 dark:text-brand-400'
                      : theme === 'dark'
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isCollapsed ? "Expand Sidebar" : "Wide Mode (Full Screen)"}
                >
                  {isCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[11px] font-bold">{isCollapsed ? "Sidebar" : "Wide Mode"}</span>
                </button>

                {/* Clear / Reset */}
                <button
                  onClick={clearCart}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={t('newSaleBtn')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">{t('newSaleBtn')}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Scrollable Products Catalog Area */}
          <div className="max-h-[720px] overflow-y-auto pr-1 space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="py-24 text-center space-y-2">
                <Wheat className="w-10 h-10 text-slate-400 mx-auto stroke-[1.5]" />
                <p className="text-xs text-slate-400 font-bold">
                  {t('noProductsMatch')}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW: Responsive 2 or 3 Columns of Commodity Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map(p => {
                  const cartItem = cart.find(i => i.productId === p.id);
                  const isOutOfStock = p.stockQty <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between transition cursor-pointer relative group ${
                        cartItem
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
                        <div className="mt-1.5 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 truncate max-w-[80px]">{p.category}</span>
                          <span className={`px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ${
                            isOutOfStock
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : p.stockQty <= (p.minStock || 10)
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {p.stockQty} {p.unit || t('kg')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <div className="font-black text-xs text-brand-500 font-mono">
                          Rs. {Number(p.sellingPrice).toLocaleString()}
                        </div>

                        {/* Quick +/- Action */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {cartItem ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateItemQty(p.id, -1)}
                                className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition cursor-pointer font-bold text-xs"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-brand-600 dark:text-brand-400 w-4 text-center">
                                {cartItem.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateItemQty(p.id, 1)}
                                className="w-5 h-5 rounded-md bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition cursor-pointer font-bold text-xs"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
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
              /* COMPACT LIST VIEW */
              <div className="space-y-1.5">
                {filteredProducts.map(p => {
                  const cartItem = cart.find(i => i.productId === p.id);
                  const isOutOfStock = p.stockQty <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                        cartItem
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
                        <span className="font-black text-xs text-brand-500 font-mono">
                          Rs. {Number(p.sellingPrice).toLocaleString()}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {cartItem ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateItemQty(p.id, -1)}
                                className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition cursor-pointer font-bold text-xs"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-brand-600 dark:text-brand-400 w-4 text-center">
                                {cartItem.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateItemQty(p.id, 1)}
                                className="w-5 h-5 rounded-md bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition cursor-pointer font-bold text-xs"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
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
        {/* 2. RIGHT PANEL — UNIFIED PROFESSIONAL POS CHECKOUT FORM (5 Cols) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div className={`border rounded-3xl p-5 card-shadow flex flex-col space-y-4 transition-colors ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            
            {/* Header: Title + Summary Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-500" />
                <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white">
                  {t('checkoutAndBilling')}
                </h3>
              </div>
              <span className="font-mono text-brand-500 font-black text-xs px-2.5 py-1 rounded-xl bg-brand-500/10 border border-brand-500/20">
                {totalItemsCount} {t('items')} • {totalQuantityUnits} {t('qty')}
              </span>
            </div>

            {/* 1. Selected Cart Items List (Inside Form) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {t('cart')} ({cart.length})
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearCart(false)}
                    className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t('clearCart')}</span>
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs font-medium">
                  {t('cartIsEmptySub') || 'Click commodity products on the left to add items to bill.'}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {cart.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-2xl border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-900/60 border-slate-700/80'
                          : 'bg-slate-50/90 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-md bg-brand-500/10 text-brand-500 flex items-center justify-center font-black text-[10px] shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-black text-xs truncate text-slate-900 dark:text-white">
                            {item.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-[11px] font-black">
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.productId, -1)}
                              className="w-4 h-4 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.stockQty}
                              value={item.qty}
                              onChange={(e) => setDirectItemQty(item.productId, e.target.value)}
                              className="w-7 text-center bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.productId, 1)}
                              className="w-4 h-4 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <select
                            value={item.unit}
                            onChange={(e) => updateItemUnit(item.productId, e.target.value)}
                            className={`text-[10px] font-bold py-0.5 px-1 rounded-lg border outline-none cursor-pointer ${
                              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
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
                        </div>

                        <div className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                          Rs. {Number(item.total).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Customer Selection / Khata Profile */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {t('selectedCustomerProfile')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs font-black text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{selectedParty ? t('edit') : `+ ${t('add')}`}</span>
                </button>
              </div>

              {/* Toggle Customer Type */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs font-black">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerType('Walk-in Customer');
                    setSelectedParty(null);
                  }}
                  className={`py-1.5 rounded-xl transition cursor-pointer ${
                    customerType === 'Walk-in Customer'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t('walkInCustomer')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerType('Regular Party');
                    if (!selectedParty) setShowCustomerModal(true);
                  }}
                  className={`py-1.5 rounded-xl transition cursor-pointer ${
                    customerType === 'Regular Party'
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t('regularParty')}
                </button>
              </div>

              {/* Customer Input or Selected Party Card */}
              {customerType === 'Regular Party' && selectedParty ? (
                <div className="p-3 rounded-2xl bg-brand-500/5 border border-brand-500/20 space-y-1.5 text-xs">
                  <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="truncate">{selectedParty.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">{selectedParty.city}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-brand-500/10">
                    <span className="text-slate-400 font-bold">{t('previousKhataBalance')}:</span>
                    <span className="font-black text-amber-500 font-mono">Rs. {previousKhataBalance.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder={t('walkInNamePlaceholder') || "Customer / Farmer Name (Walk-in)"}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* 3. Live Order Calculation & Integrated Bill Discount */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
              {/* Gross Total */}
              <div className="flex justify-between text-slate-500 font-bold">
                <span>{t('grossSubtotal')}:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono">
                  Rs. {grossSubtotal.toLocaleString()}
                </span>
              </div>

              {/* Integrated Bill Discount Input */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-black text-amber-700 dark:text-amber-400">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>{t('discountAmount')}</span>
                  </span>
                  {orderDiscountAmount > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      - Rs. {orderDiscountAmount.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* % vs Rs toggle */}
                  <div className="inline-flex rounded-xl p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black shrink-0">
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('percentage')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        orderDiscountType === 'percentage'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('flat')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        orderDiscountType === 'flat'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Rs.
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max={orderDiscountType === 'percentage' ? 100 : grossSubtotal}
                    value={orderDiscountValue === 0 ? '' : orderDiscountValue}
                    onChange={(e) => setOrderDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className={`flex-1 border rounded-xl px-2.5 py-1 text-xs font-black outline-none focus:border-amber-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Tax GST (If any) */}
              {taxAmount > 0 && (
                <div className="flex justify-between text-amber-500 font-black">
                  <span>{t('taxGST')} ({taxPercentage}%):</span>
                  <span className="font-mono">+ Rs. {taxAmount.toLocaleString()}</span>
                </div>
              )}

              {/* HERO NET TOTAL PAYABLE BANNER */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-400">
                  {t('netPayableTotal')}
                </span>
                <span className="text-xl font-black text-brand-500 font-mono tracking-tight">
                  Rs. {netGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 4. Payment Mode & Cash Tender */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {t('paymentSettlementTitle')}
              </span>

              {/* Payment Mode Buttons: Cash, Bank, Credit, Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { key: 'Cash', label: 'Cash', icon: DollarSign },
                  { key: 'Bank', label: 'Bank', icon: Building2 },
                  { key: 'Credit', label: 'Credit (Khata)', icon: Wallet },
                  { key: 'Card', label: 'Card', icon: CreditCard }
                ].map(mode => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode.key);
                      if (mode.key === 'Credit') {
                        setAmountReceived('0');
                        if (customerType === 'Walk-in Customer') {
                          setCustomerType('Regular Party');
                          if (!selectedParty) setShowCustomerModal(true);
                        }
                      } else if (amountReceived === '0' || mode.key === 'Bank' || mode.key === 'Card') {
                        setAmountReceived(netGrandTotal.toString());
                      }
                    }}
                    className={`py-2 px-1.5 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                      paymentMode === mode.key
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

              {/* Quick Cash Presets */}
              {paymentMode === 'Cash' && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setAmountReceived(netGrandTotal.toString())}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition cursor-pointer shrink-0 ${
                      amountReceived === netGrandTotal.toString()
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t('exactCash')}
                  </button>
                  {[500, 1000, 2000, 5000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountReceived(val.toString())}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-black border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-500 transition cursor-pointer shrink-0 font-mono"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {/* Amount Received Input */}
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
                  className={`w-full border rounded-2xl px-3.5 py-2 text-sm font-black outline-none focus:border-brand-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Live Status Calculation */}
              {customerType === 'Regular Party' && selectedParty ? (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs font-black">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{t('previousKhataBalance')}:</span>
                    <span className="font-mono">Rs. {previousKhataBalance.toLocaleString()}</span>
                  </div>
                  {remainingDue > 0 ? (
                    <div className="flex items-center justify-between text-amber-500">
                      <span>{t('remainingDueKhata')}:</span>
                      <span className="font-mono">+ Rs. {remainingDue.toLocaleString()}</span>
                    </div>
                  ) : changeDue > 0 ? (
                    <div className="flex items-center justify-between text-emerald-500">
                      <span>{t('changeReturnDue')}:</span>
                      <span className="font-mono">Rs. {changeDue.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-500 text-xs">
                      <span>{t('status')}:</span>
                      <span>{t('settled')} (100% Paid)</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-brand-500">
                    <span>{t('newKhataBalanceAfterSale')}:</span>
                    <span className="font-mono">Rs. {newKhataBalance.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs font-black">
                  {changeDue > 0 ? (
                    <div className="flex items-center justify-between text-emerald-500">
                      <span>{t('changeReturnDue')}:</span>
                      <span className="font-mono text-sm">Rs. {changeDue.toLocaleString()}</span>
                    </div>
                  ) : remainingDue > 0 ? (
                    <div className="flex items-center justify-between text-amber-500">
                      <span>{t('remainingDueKhata')}:</span>
                      <span className="font-mono text-sm">Rs. {remainingDue.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-500 text-xs">
                      <span>{t('status')}:</span>
                      <span>{t('settled')} (100% Paid)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Sale Remarks / Gate Pass (Optional) */}
            <div>
              <input
                type="text"
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                placeholder={t('saleNotesPlaceholder') || "Gate Pass #, Truck #, remarks (optional)..."}
                className={`w-full border rounded-2xl px-3.5 py-1.5 text-xs font-medium outline-none focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {/* 6. PRIMARY ACTION: COMPLETE SALE & PRINT RECEIPT */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={cart.length === 0 || isPlacingOrder}
                className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl transition shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer text-center"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="leading-snug">{isPlacingOrder ? 'Processing...' : t('completeAndPrintReceipt')}</span>
              </button>
              <div className="text-[10px] text-center text-slate-400 font-bold">
                {t('shortcutHint')}
              </div>
            </div>
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
