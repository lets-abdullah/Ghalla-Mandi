import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X,
  LayoutGrid, List, User, UserPlus,
  Percent, CheckCircle2, DollarSign,
  CreditCard, Smartphone, Wallet, Edit3, Phone, MapPin,
  RefreshCw, Wheat, Check, PanelLeftClose, PanelLeftOpen, Maximize2,
  Receipt, AlertCircle, FileText, ChevronDown, ChevronUp, Filter, Building2,
  Landmark, Layers, FolderOpen, Sparkles, Banknote, ShieldCheck, Package
} from 'lucide-react';
import { useERP, computeCustomerKhataBalance, computeProductValuation } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useSidebar } from '../context/SidebarContext';
import { ReceiptModal } from '../modals/ReceiptModal';
import { AddCustomerModal } from '../modals/AddCustomerModal';
import { useToast } from '../components/Toast';

export const CreateOrder = () => {
  const toast = useToast();
  const { products = [], categories = [], customers = [], addCustomer, createSale, sales = [], paymentLogs = [], saleReturns = [], purchases = [], purchaseReturns = [], stockMovements = [] } = useERP();
  const { theme } = useTheme();
  const { t, locale } = useLocale();
  const isRTL = locale === 'ur';
  const { isCollapsed, toggleSidebar } = useSidebar();

  // View Mode: 'grid' | 'compact'
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart State
  const [cart, setCart] = useState([]);
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
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(null); // item to edit
  const [tempNewRate, setTempNewRate] = useState('');

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState(null);

  // Unit multiplier helpers (Genuine Base Units Only - Rule 1)
  const getUnitMultiplier = (unitName) => {
    switch (unitName) {
      case 'Gram':
      case 'ML':
        return 0.001;
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
      toast.warning(t('stockAlertZero') || 'This product is out of stock.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const nextQty = existing.qty + 1;
        if (nextQty > product.stockQty) {
          toast.warning(t('saleStockExceeded', { qty: nextQty, unit: existing.unit || t('kg'), stock: product.stockQty }));
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id
            ? recalculateLineItem({ ...item, qty: nextQty })
            : item
        );
      } else {
        const defaultUnit = product.unit || product.baseUnit || product.productUnit || 'KG';
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

  // Direct manual edit of Selling Price per unit
  const setDirectItemRate = (productId, val) => {
    const raw = String(val).replace(/[^0-9]/g, '');
    const newPrice = Math.max(0, parseInt(raw, 10) || 0);
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          return recalculateLineItem({ ...item, price: newPrice, basePrice: newPrice });
        }
        return item;
      });
    });
  };

  // Apply Rate Override via Modal (Available for all sales: Cash, Walk-in, Card, Bank, Khata)
  const handleSaveRateOverride = () => {
    if (!showRateModal) {
      setShowRateModal(null);
      return;
    }
    const raw = String(tempNewRate).replace(/[^0-9]/g, '');
    const newPrice = Math.max(0, parseInt(raw, 10) || 0);
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === showRateModal.productId) {
          return recalculateLineItem({ ...item, price: newPrice, basePrice: newPrice });
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

  // Live Party Financials from Centralized Accounting Engine
  const partyFinancials = useMemo(() => {
    if (!selectedParty) return null;
    return computeCustomerKhataBalance(selectedParty, sales, paymentLogs, saleReturns);
  }, [selectedParty, sales, paymentLogs, saleReturns]);

  const partyReceivableDue = partyFinancials ? Number(partyFinancials.receivableDue || 0) : 0;

  // Payment Received & Balance / Change Calculations (Rules 2 & 3: No auto customer advance credit)
  const receivedNum = amountReceived === ''
    ? (paymentMode === 'Credit' || paymentMode === 'Mandi Credit' || paymentMode === 'Khata (Udhaar)' ? 0 : netGrandTotal)
    : (Number(amountReceived) || 0);

  const actualAdditionalCash = Math.min(netGrandTotal, receivedNum);
  const totalPaidTowardsBill = actualAdditionalCash;
  const changeDue = Math.max(0, receivedNum - netGrandTotal);
  const remainingDue = Math.max(0, netGrandTotal - totalPaidTowardsBill);

  // Customer Khata balances (receivable due >= 0)
  const previousKhataBalance = partyReceivableDue;
  const newKhataBalance = previousKhataBalance + remainingDue;

  // Khata Mode is active if Payment Mode is Credit or Customer Type is Regular Party with selected Khata customer
  const isKhataActive = paymentMode === 'Credit' || (customerType === 'Regular Party' && Boolean(selectedParty));

  // Live Dynamic Stock Evaluation for all products in POS to ensure 100% sync with Inventory & Products pages
  const syncedProducts = useMemo(() => {
    return (products || []).map(p => {
      const val = computeProductValuation(p, purchases, sales, saleReturns, purchaseReturns, stockMovements);
      const sellingPrice = Number(p.sellingPrice ?? p.sellingprice ?? val.sellingRate ?? 0);
      const purchasePrice = Number(p.purchasePrice ?? p.purchaseprice ?? val.purchaseRate ?? 0);
      return {
        ...p,
        stockQty: val.qty,
        stockqty: val.qty,
        sellingPrice,
        sellingprice: sellingPrice,
        purchasePrice,
        purchaseprice: purchasePrice,
        activeBatches: val.activeBatches || []
      };
    });
  }, [products, purchases, sales, saleReturns, purchaseReturns, stockMovements]);

  // Reset cart item prices to catalog default when switching back to Cash / Non-Khata mode
  useEffect(() => {
    if (!isKhataActive) {
      setShowRateModal(null);
      setCart(prev => prev.map(item => {
        const prod = (syncedProducts || []).find(p => p.id === item.productId);
        const catalogBasePrice = Number(prod?.sellingPrice || item.basePrice || 0);
        let adjustedPrice = catalogBasePrice;
        if (item.unit === 'Gram' || item.unit === 'ML') {
          adjustedPrice = catalogBasePrice / 1000;
        }
        if (item.price !== adjustedPrice || item.basePrice !== catalogBasePrice) {
          return recalculateLineItem({
            ...item,
            basePrice: catalogBasePrice,
            price: adjustedPrice
          });
        }
        return item;
      }));
    }
  }, [isKhataActive, syncedProducts]);

  // Dynamic Unique Categories directly from Products Catalog (no duplicates, no mutations)
  const availableCategories = useMemo(() => {
    const catSet = new Set();
    (syncedProducts || []).forEach(p => {
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
  }, [syncedProducts, categories]);

  // Product Count per Category
  const categoryCounts = useMemo(() => {
    const counts = {};
    (syncedProducts || []).forEach(p => {
      const cat = p?.category && typeof p.category === 'string' && p.category.trim() ? p.category.trim() : 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [syncedProducts]);

  // Immediate filtering of products by search and category
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return (syncedProducts || []).filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const matchesSearch = !term || pName.includes(term) || pCat.includes(term);
      const matchesCat = selectedCategory === 'All' || (p.category && p.category.trim() === selectedCategory.trim());
      return matchesSearch && matchesCat;
    });
  }, [syncedProducts, searchTerm, selectedCategory]);

  // Group filtered products by Category
  const groupedProducts = useMemo(() => {
    const groups = {};
    (filteredProducts || []).forEach(p => {
      const cat = p.category && typeof p.category === 'string' && p.category.trim() ? p.category.trim() : 'General / Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const [collapsedCategories, setCollapsedCategories] = useState({});

  const toggleCategoryCollapse = (catName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  // Filtered Customers for Modal
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (c.phone && c.phone.includes(partySearch)) ||
    (c.city && c.city.toLowerCase().includes(partySearch.toLowerCase()))
  );

  // Submit and Place Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isPlacingOrder) {
      if (cart.length === 0) alert(t('cartIsEmpty'));
      return;
    }

    if (customerType === 'Regular Party' && !selectedParty) {
      alert(t('searchCustomerParty') || 'Please select a customer / regular party.');
      return;
    }

    if (customerType === 'Walk-in Customer') {
      const trimmed = walkinName.trim();
      const isGeneric = (
        !trimmed ||
        trimmed.toLowerCase() === 'walk-in customer' ||
        trimmed.toLowerCase() === 'walk in customer' ||
        trimmed.toLowerCase() === 'walk-in' ||
        trimmed.toLowerCase() === 'walkin' ||
        trimmed.toLowerCase() === 'walk in' ||
        trimmed.toLowerCase() === 'walk-in-customer'
      );
      if (isGeneric) {
        alert('Customer / Farmer Name is mandatory. Please enter a valid customer name before placing order.');
        return;
      }
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
      ? selectedParty.name.trim()
      : walkinName.trim();

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
      paidAmount: totalPaidTowardsBill,
      cashReceived: actualAdditionalCash,
      paymentStatus: totalPaidTowardsBill >= netGrandTotal ? 'Paid' : totalPaidTowardsBill > 0 ? 'Partial' : 'Pending',
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
        paidAmount: totalPaidTowardsBill,
        cashReceived: actualAdditionalCash,
        paymentMethod: paymentMode,
        paymentStatus: orderPayload.paymentStatus,
        cart: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          rate: item.price,
          unitName: item.unit
        })),
        saleNote,
        discount: orderDiscountAmount,
        tax: taxAmount
      });

      setCompletedOrderData(orderPayload);
      setIsReceiptOpen(true);
      toast.success(`Sale recorded successfully! Invoice ${orderPayload.invoiceNo || ''}`);
      clearCart(true);
    } catch (err) {
      toast.error(err.message || 'Order creation failed.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* ========================================================================= */}
      {/* 2-PANEL BALANCED PROFESSIONAL POS WORKSTATION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ======================================================================= */}
        {/* 1. LEFT PANEL — PRODUCTS SECTION (7 Cols) */}
        {/* ======================================================================= */}
        <div className={`lg:col-span-7 xl:col-span-7 border rounded-3xl p-4 sm:p-5 card-shadow flex flex-col space-y-4 transition-colors ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          {/* Top Controls Bar: Search + Category Dropdown + Grid Toggle */}
          <div className="space-y-2.5 pb-2">
            <div className="flex items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search product by name / barcode"
                  className={`w-full border rounded-2xl py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500 ${isRTL ? 'pr-10 pl-8' : 'pl-10 pr-8'
                    } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50/70 border-slate-200 text-slate-800'}`}
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
              <div className="relative shrink-0 min-w-[160px]">
                <select
                  id="pos-category-dropdown"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    if (e.target.value !== 'All') {
                      setCollapsedCategories(prev => ({ ...prev, [e.target.value]: false }));
                    }
                  }}
                  className={`w-full border rounded-2xl py-2.5 pl-3.5 pr-8 text-xs font-bold outline-none transition cursor-pointer appearance-none ${selectedCategory !== 'All' ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold' : ''
                    } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                >
                  <option value="All">All Categories ({availableCategories.length})</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({categoryCounts[cat] || 0})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setViewMode(prev => prev === 'grid' ? 'compact' : 'grid')}
                className="p-2.5 rounded-2xl border border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30 hover:bg-blue-100/50 transition cursor-pointer shrink-0"
                title={viewMode === 'grid' ? t('compactView') : t('gridView')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* + New Sale action */}
            <div className="flex items-center justify-end">
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer py-0.5"
                title={t('newSaleBtn') || 'New Sale'}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Sale</span>
              </button>
            </div>
          </div>

          {/* Scrollable Products Catalog Area (Grouped by Category) */}
          <div className="max-h-[720px] overflow-y-auto pr-1 space-y-4">
            {Object.keys(groupedProducts).length === 0 ? (
              <div className="py-24 text-center space-y-2">
                <Wheat className="w-10 h-10 text-slate-400 mx-auto stroke-[1.5]" />
                <p className="text-xs text-slate-400 font-bold">
                  {t('noProductsMatch')}
                </p>
              </div>
            ) : (
              Object.entries(groupedProducts).map(([categoryName, prods]) => {
                const isCollapsed = Boolean(collapsedCategories[categoryName]) && !searchTerm;
                const inCartCount = cart.filter(ci => prods.some(p => p.id === ci.productId)).length;

                return (
                  <div key={categoryName} className="space-y-3">
                    {/* Collapsible Category Header / Dropdown Banner */}
                    <div
                      onClick={() => toggleCategoryCollapse(categoryName)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition text-left cursor-pointer select-none ${theme === 'dark'
                        ? 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {categoryName}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            ({prods.length})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inCartCount > 0 && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            • {inCartCount} in Cart
                          </span>
                        )}
                        <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {/* Category Products */}
                    {!isCollapsed && (
                      <div className="space-y-3">
                        {prods.map(p => {
                          const cartItem = cart.find(i => i.productId === p.id);
                          const isOutOfStock = p.stockQty <= 0;

                          return (
                            <div
                              key={p.id}
                              onClick={() => !isOutOfStock && addToCart(p)}
                              className={`p-3.5 sm:p-4 rounded-3xl border flex items-center justify-between gap-4 transition cursor-pointer relative group ${cartItem
                                ? 'border-blue-500 bg-blue-50/15 dark:bg-blue-950/20 ring-1 ring-blue-500/30'
                                : isOutOfStock
                                  ? 'opacity-60 border-slate-200 dark:border-slate-800'
                                  : theme === 'dark'
                                    ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800'
                                    : 'bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-xs'
                                }`}
                            >
                              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                                {/* Product Image Thumbnail */}
                                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                  {p.image ? (
                                    <img
                                      src={p.image}
                                      alt={p.name}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                      <Package className="w-8 h-8 stroke-[1.5]" />
                                    </div>
                                  )}
                                </div>

                                {/* Product Info */}
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition">
                                    {p.name}
                                  </h4>
                                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                                    {p.category}
                                  </p>
                                  <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-2">
                                    Rs. {Number(p.sellingPrice).toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              {/* Plus Action / Cart Stepper */}
                              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {cartItem ? (
                                  <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 p-1 rounded-full border border-blue-200 dark:border-blue-900/50">
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(p.id, -1)}
                                      className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition cursor-pointer font-bold shadow-2xs"
                                      title="Decrease"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 w-5 text-center">
                                      {cartItem.qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(p.id, 1)}
                                      className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition cursor-pointer font-bold shadow-2xs"
                                      title="Increase"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => addToCart(p)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
                                    title="Add to Cart"
                                  >
                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. RIGHT PANEL — CHECKOUT & BILLING (5 Cols) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div className={`border rounded-3xl p-5 sm:p-6 card-shadow flex flex-col space-y-5 transition-colors ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>

            {/* Header: Title + Fast POS Counter Billing */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    {t('checkoutAndBilling') || 'Checkout & Billing'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Fast POS Counter Billing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (completedOrderData) {
                    setIsReceiptOpen(true);
                  }
                }}
                disabled={!completedOrderData}
                className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer disabled:opacity-40"
                title="View Receipt / Invoice"
              >
                <FileText className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* 1. Cart Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Cart ({cart.length})
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearCart(false)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-7 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2.5 bg-slate-50/40 dark:bg-slate-800/20">
                  <ShoppingCart className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                    Scan barcode or click items from product catalog on the left to build the sale bill.
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {cart.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all ${theme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/80'
                        : 'bg-slate-50/90 border-slate-200'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-extrabold text-xs truncate text-slate-900 dark:text-white">
                            {item.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-[11px] font-black">
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.productId, -1)}
                              className="w-5 h-5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.stockQty}
                              value={item.qty}
                              onChange={(e) => setDirectItemQty(item.productId, e.target.value)}
                              className="w-8 text-center bg-transparent outline-none font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.productId, 1)}
                              className="w-5 h-5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <span
                            className={`text-[10px] font-extrabold py-1 px-2 rounded-lg border select-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                          >
                            {item.unit || 'KG'}
                          </span>

                          <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400 mr-0.5">@Rs.</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.price}
                              onKeyDown={(e) => {
                                if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => setDirectItemRate(item.productId, e.target.value)}
                              className="w-14 text-right bg-transparent outline-none font-black font-mono text-blue-600 dark:text-blue-400"
                              placeholder="Price"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setShowRateModal(item);
                                setTempNewRate(item.price.toString());
                              }}
                              className="ml-1 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                          Rs. {Number(item.total).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Customer Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Customer
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {selectedParty ? (
                <div className="p-3.5 rounded-2xl border space-y-1.5 text-xs bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                  <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="truncate">{selectedParty.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedParty(null)}
                      className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Previous Khata:</span>
                    {partyReceivableDue > 0 ? (
                      <span className="font-black text-amber-500 font-mono">
                        Due: Rs. {partyReceivableDue.toLocaleString()}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-400">
                        Settled (Rs. 0)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 p-1 pl-3.5 focus-within:border-emerald-500 transition">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      placeholder="Customer / Farmer Name"
                      className="w-full bg-transparent px-2 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 transition cursor-pointer shadow-sm"
                    >
                      Select
                    </button>
                  </div>
                  <p className="text-[11px] font-semibold text-amber-500 dark:text-amber-400 px-1">
                    * Customer name is mandatory for billing & ledger
                  </p>
                </div>
              )}
            </div>

            {/* 3. Bill Summary Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Bill Summary
                </span>
              </div>

              {/* Gross Total */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-800 dark:text-slate-200 font-extrabold">Gross Total</span>
                <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
                  Rs. {grossSubtotal.toLocaleString()}
                </span>
              </div>

              {/* Discount Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Discount
                </span>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={orderDiscountType}
                      onChange={(e) => setOrderDiscountType(e.target.value)}
                      className="appearance-none border border-slate-200 dark:border-slate-700 rounded-xl pl-2.5 pr-6 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer outline-none focus:border-emerald-500"
                    >
                      <option value="flat">Rs.</option>
                      <option value="percentage">%</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={orderDiscountType === 'percentage' ? 100 : grossSubtotal}
                    value={orderDiscountValue === 0 ? '' : orderDiscountValue}
                    onChange={(e) => setOrderDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-right font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Tax GST (If applicable) */}
              {taxAmount > 0 && (
                <div className="flex justify-between text-amber-500 font-black text-xs">
                  <span>Tax / GST ({taxPercentage}%):</span>
                  <span className="font-mono">+ Rs. {taxAmount.toLocaleString()}</span>
                </div>
              )}

              {/* Highlight Box: Net Total Payable */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                    Net Total Payable
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Net Bill Total
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  Rs. {netGrandTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 4. Payment & Settlement Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  4
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Payment & Settlement
                </span>
              </div>

              {/* Payment Mode Buttons */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('Cash');
                    }}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${paymentMode === 'Cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <Banknote className="w-4 h-4 shrink-0" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('Bank');
                      if (amountReceived === '' || amountReceived === '0') {
                        setAmountReceived(netGrandTotal.toString());
                      }
                    }}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${paymentMode === 'Bank'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <Landmark className="w-4 h-4 shrink-0" />
                    <span>Bank Transfer</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('Card');
                    if (amountReceived === '' || amountReceived === '0') {
                      setAmountReceived(netGrandTotal.toString());
                    }
                  }}
                  className={`w-full py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${paymentMode === 'Card'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>Card Payment</span>
                </button>
              </div>

              {/* Amount Received Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Amount Received (Rs.)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amountReceived}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => setAmountReceived(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    className={`w-full border rounded-2xl px-4 py-2.5 text-sm font-black outline-none focus:border-emerald-500 font-mono ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    PKR
                  </span>
                </div>
              </div>

              {/* Change to Return box */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Change to Return
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  Rs. {changeDue.toLocaleString()}
                </span>
              </div>

              {/* Khata / Due notice if Regular Party has remaining amount */}
              {customerType === 'Regular Party' && selectedParty && remainingDue > 0 && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <span>{t('remainingDueKhata') || 'Remaining Due (Khata)'}:</span>
                  <span className="font-mono text-sm font-black">+ Rs. {remainingDue.toLocaleString()}</span>
                </div>
              )}

              {/* Security text */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium py-1">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>All transactions are secure and encrypted</span>
              </div>

              {/* Complete Sale Button */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0 || isPlacingOrder}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer text-center"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="leading-snug text-base">
                    {isPlacingOrder ? 'Processing...' : (t('completeAndPrintReceipt') || 'Complete Sale')}
                  </span>
                </button>
                <div className="text-[10px] text-center text-slate-400 font-bold">
                  {t('shortcutHint') || 'Press F9 or Ctrl+Enter to Checkout'}
                </div>
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
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-3.5 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black flex items-center gap-2">
                <User className="w-5 h-5 text-brand-500" />
                <span>{t('selectCustomerModalTitle')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                      <div className="font-black text-xs">{c.name} {c.shopName ? `(${c.shopName})` : ''}</div>
                      <div className="text-[10px] text-slate-400">{c.city || 'Mandi'} • {c.phone || 'No Phone'}</div>
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
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setShowAddCustomerModal(true);
                  }}
                  className="text-xs font-black text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('addNewPartyQuick')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE ADD CUSTOMER MODAL */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSuccess={(createdCustomer) => {
          setSelectedParty(createdCustomer);
          setCustomerType('Regular Party');
          setShowCustomerModal(false);
        }}
      />

      {/* ORDER DISCOUNT MODAL */}
      {showDiscountModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowDiscountModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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

      {/* QUICK RATE OVERRIDE MODAL (Available for all sales) */}
      {showRateModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowRateModal(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-500" />
                {t('editItemPriceModalTitle') || 'Manual Selling Price (Rate)'}
              </h3>
              <button
                onClick={() => setShowRateModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="font-black text-xs mb-1 text-brand-500">{showRateModal.name}</div>
              <div className="text-[11px] text-slate-400 font-medium mb-2">
                Override catalog price for this sale. COGS and inventory valuation remain based on actual purchase cost.
              </div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                {t('newRatePerUnit') || 'Selling Rate (PKR)'} / {showRateModal.unit || 'Unit'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={tempNewRate}
                onKeyDown={(e) => {
                  if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setTempNewRate(e.target.value.replace(/[^0-9]/g, ''))}
                className={`w-full border rounded-2xl px-3.5 py-2.5 text-sm font-black outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                autoFocus
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
                {t('saveRate') || 'Apply Price'}
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
