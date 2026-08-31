import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X,
  LayoutGrid, List, User, UserPlus,
  Percent, CheckCircle2, DollarSign,
  CreditCard, Smartphone, Wallet, Edit3, Phone, MapPin,
  RefreshCw, Wheat, Check, PanelLeftClose, PanelLeftOpen, Maximize2,
  Receipt, AlertCircle, FileText, ChevronDown, ChevronUp, Filter, Building2,
  Landmark, Layers, FolderOpen
} from 'lucide-react';
import { useERP, computeCustomerKhataBalance } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useSidebar } from '../context/SidebarContext';
import { ReceiptModal } from '../modals/ReceiptModal';

export const CreateOrder = () => {
  const { products = [], categories = [], customers = [], addCustomer, createSale, sales = [], paymentLogs = [], saleReturns = [] } = useERP();
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
    shopName: '',
    phone: '',
    whatsapp: '',
    city: '',
    address: '',
    customerType: 'Regular Party',
    openingBalance: 0,
    creditLimit: '',
    paymentTerms: 'Cash / Credit',
    cnic: '',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    notes: ''
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

  // Apply Rate Override (Only allowed when Khata is active)
  const handleSaveRateOverride = () => {
    if (!showRateModal || !isKhataActive) {
      setShowRateModal(null);
      return;
    }
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

  // Live Party Financials from Centralized Accounting Engine
  const partyFinancials = useMemo(() => {
    if (!selectedParty) return null;
    return computeCustomerKhataBalance(selectedParty, sales, paymentLogs, saleReturns);
  }, [selectedParty, sales, paymentLogs, saleReturns]);

  const availableAdvanceCredit = partyFinancials ? Number(partyFinancials.advanceCredit || 0) : 0;
  const partyReceivableDue = partyFinancials ? Number(partyFinancials.receivableDue || 0) : 0;

  // Auto-apply available advance credit up to net grand total
  const appliedAdvanceCredit = customerType === 'Regular Party' && selectedParty ? Math.min(netGrandTotal, availableAdvanceCredit) : 0;
  const netPayableAfterCredit = Math.max(0, netGrandTotal - appliedAdvanceCredit);
  const remainingAdvanceCredit = Math.max(0, availableAdvanceCredit - appliedAdvanceCredit);

  // Payment Received & Balance / Change Calculations
  const receivedNum = amountReceived === ''
    ? (paymentMode === 'Credit' || paymentMode === 'Mandi Credit' || paymentMode === 'Khata (Udhaar)' ? 0 : netPayableAfterCredit)
    : (Number(amountReceived) || 0);

  const actualAdditionalCash = Math.min(netPayableAfterCredit, receivedNum);
  const totalPaidTowardsBill = appliedAdvanceCredit + actualAdditionalCash;
  const changeDue = Math.max(0, receivedNum - netPayableAfterCredit);
  const remainingDue = Math.max(0, netGrandTotal - totalPaidTowardsBill);

  // Customer Khata balances
  const previousKhataBalance = partyReceivableDue > 0 ? partyReceivableDue : (availableAdvanceCredit > 0 ? -availableAdvanceCredit : 0);
  const newKhataBalance = (previousKhataBalance + netGrandTotal) - totalPaidTowardsBill;

  // Khata Mode is active if Payment Mode is Credit or Customer Type is Regular Party with selected Khata customer
  const isKhataActive = paymentMode === 'Credit' || (customerType === 'Regular Party' && Boolean(selectedParty));

  // Reset cart item prices to catalog default when switching back to Cash / Non-Khata mode
  useEffect(() => {
    if (!isKhataActive) {
      setShowRateModal(null);
      setCart(prev => prev.map(item => {
        const prod = (products || []).find(p => p.id === item.productId);
        const catalogBasePrice = Number(prod?.sellingPrice || item.basePrice || 0);
        let adjustedPrice = catalogBasePrice;
        if (item.unit === 'Mann' || item.unit === 'Mann (40 KG)') {
          adjustedPrice = catalogBasePrice * 40;
        } else if (item.unit === 'Bori' || item.unit === 'Bori (50 KG)' || item.unit === 'Bag') {
          adjustedPrice = catalogBasePrice * 50;
        } else if (item.unit === 'Gram' || item.unit === 'ML') {
          adjustedPrice = catalogBasePrice / 1000;
        } else if (item.unit === 'Dozen') {
          adjustedPrice = catalogBasePrice * 12;
        } else if (item.unit === 'Ton') {
          adjustedPrice = catalogBasePrice * 1000;
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
  }, [isKhataActive, products]);

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

  // Handle Quick Add Customer
  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      alert('Customer / Party name is required.');
      return;
    }

    if (newCustomerForm.phone.trim() && newCustomerForm.phone.replace(/\D/g, '').length !== 11) {
      alert('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }
    if (newCustomerForm.whatsapp.trim() && newCustomerForm.whatsapp.replace(/\D/g, '').length !== 11) {
      alert('WhatsApp number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    try {
      const created = await addCustomer({
        name: newCustomerForm.name.trim(),
        shopName: newCustomerForm.shopName.trim(),
        phone: newCustomerForm.phone.trim() || 'N/A',
        whatsapp: newCustomerForm.whatsapp.trim(),
        city: newCustomerForm.city.trim() || 'Local Mandi',
        address: newCustomerForm.address.trim(),
        customerType: newCustomerForm.customerType || 'Regular Party',
        openingBalance: Number(newCustomerForm.openingBalance) || 0,
        creditLimit: Number(newCustomerForm.creditLimit) || 0,
        paymentTerms: newCustomerForm.paymentTerms || 'Cash / Credit',
        cnic: newCustomerForm.cnic.trim(),
        bankName: newCustomerForm.bankName.trim(),
        accountTitle: newCustomerForm.accountTitle.trim(),
        accountNumber: newCustomerForm.accountNumber.trim(),
        notes: newCustomerForm.notes.trim()
      });

      setSelectedParty(created);
      setCustomerType('Regular Party');
      setShowNewCustomerForm(false);
      setShowCustomerModal(false);
      setNewCustomerForm({
        name: '',
        shopName: '',
        phone: '',
        whatsapp: '',
        city: '',
        address: '',
        customerType: 'Regular Party',
        openingBalance: 0,
        creditLimit: '',
        paymentTerms: 'Cash / Credit',
        cnic: '',
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        notes: ''
      });
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
      appliedCredit: appliedAdvanceCredit,
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
        appliedCredit: appliedAdvanceCredit,
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
        <div className={`lg:col-span-7 xl:col-span-7 border rounded-3xl p-4 sm:p-5 card-shadow flex flex-col space-y-3.5 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
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
                  className={`w-full border rounded-2xl py-2.5 text-xs font-bold outline-none transition focus:border-brand-500 ${isRTL ? 'pr-10 pl-8' : 'pl-10 pr-8'
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
              <div className="relative shrink-0 min-w-[150px]">
                <select
                  id="pos-category-dropdown"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    if (e.target.value !== 'All') {
                      setCollapsedCategories(prev => ({ ...prev, [e.target.value]: false }));
                    }
                  }}
                  className={`w-full border rounded-2xl py-2.5 pl-3 pr-8 text-xs font-bold outline-none transition cursor-pointer appearance-none ${selectedCategory !== 'All' ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-extrabold' : ''
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
                    className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'grid'
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
                    className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'compact'
                        ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                    title={t('compactView')}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Clear / Reset */}
                <button
                  onClick={clearCart}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${theme === 'dark'
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
                  <div key={categoryName} className="space-y-2.5">
                    {/* Collapsible Category Header / Dropdown Banner */}
                    <div
                      onClick={() => toggleCategoryCollapse(categoryName)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition text-left cursor-pointer select-none shadow-2xs ${theme === 'dark'
                          ? 'bg-slate-900/90 border-slate-700 hover:border-slate-500'
                          : 'bg-slate-100/90 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black text-xs">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs tracking-tight text-slate-800 dark:text-white">
                            {categoryName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            {prods.length} {prods.length === 1 ? 'product' : 'products'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inCartCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {inCartCount} in Cart
                          </span>
                        )}
                        <span className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {/* Category Products (Grid or Compact List) */}
                    {!isCollapsed && (
                      viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          {prods.map(p => {
                            const cartItem = cart.find(i => i.productId === p.id);
                            const isOutOfStock = p.stockQty <= 0;

                            return (
                              <div
                                key={p.id}
                                onClick={() => !isOutOfStock && addToCart(p)}
                                className={`p-3.5 rounded-2xl border flex flex-col justify-between transition cursor-pointer relative group ${cartItem
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
                        <div className="space-y-1.5">
                          {prods.map(p => {
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
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. RIGHT PANEL — UNIFIED PROFESSIONAL POS CHECKOUT FORM (5 Cols) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div className={`border rounded-3xl p-5 card-shadow flex flex-col space-y-4 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>

            {/* Header: Title + Summary Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white">
                    {t('checkoutAndBilling')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">Fast POS Counter Billing</p>
                </div>
              </div>
              <span className="font-mono text-brand-600 dark:text-brand-400 font-black text-xs px-2.5 py-1 rounded-xl bg-brand-500/10 border border-brand-500/20">
                {cart.length} {t('items')} • {totalQuantityUnits} {t('qty')}
              </span>
            </div>

            {/* 1. Selected Cart Items List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center">1</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('cart')} ({cart.length})
                  </span>
                </div>
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
                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/80 text-center text-slate-400 text-xs font-medium space-y-1">
                  <ShoppingCart className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  <p className="font-bold text-[11px] text-slate-500 dark:text-slate-400">
                    {t('cartIsEmptySub') || 'Click items on the left catalog to add them to bill.'}
                  </p>
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {cart.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-2xl border transition-all ${theme === 'dark'
                          ? 'bg-slate-900/60 border-slate-700/80'
                          : 'bg-slate-50/90 border-slate-200'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="w-4 h-4 rounded-md bg-brand-500/10 text-brand-500 flex items-center justify-center font-black text-[9px] shrink-0">
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
                        <div className="flex items-center gap-1.5 flex-wrap">
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
                              className="w-7 text-center bg-transparent outline-none font-bold"
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
                            className={`text-[10px] font-bold py-0.5 px-1 rounded-lg border outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
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

                          {/* Unit Rate & Khata-Only Edit Control */}
                          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            <span>@Rs.{Number(item.price).toLocaleString()}</span>
                            {isKhataActive ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowRateModal(item);
                                  setTempNewRate(item.price.toString());
                                }}
                                className="p-1 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 transition cursor-pointer flex items-center gap-0.5"
                                title="Edit Selling Price (Khata Customer)"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 select-none" title="Catalog price is fixed for Cash, Bank & Card sales without Khata">
                                Fixed
                              </span>
                            )}
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

            {/* 2. Customer Selection / Khata Profile */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center">2</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('customerPartyBtn') || 'Customer'}
                  </span>
                </div>
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
                  className={`py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${customerType === 'Walk-in Customer'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <span>{t('walkInCustomer')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerType('Regular Party');
                    if (!selectedParty) setShowCustomerModal(true);
                  }}
                  className={`py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${customerType === 'Regular Party'
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <span>{t('regularParty')}</span>
                </button>
              </div>

              {/* Customer Input or Selected Party Card */}
              {customerType === 'Regular Party' && selectedParty ? (
                <div className={`p-3 rounded-2xl border space-y-1.5 text-xs ${availableAdvanceCredit > 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-brand-500/5 border-brand-500/20'}`}>
                  <div className="font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="truncate">{selectedParty.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">{selectedParty.city}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-bold">Previous Khata Position:</span>
                    {availableAdvanceCredit > 0 ? (
                      <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        Credit: Rs. {availableAdvanceCredit.toLocaleString()}
                      </span>
                    ) : partyReceivableDue > 0 ? (
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
                <div className="space-y-1">
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      placeholder="Customer / Farmer Name * (Required)"
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                        !walkinName.trim()
                          ? 'border-amber-400/80 dark:border-amber-500/50'
                          : 'focus:border-brand-500'
                      } ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                  {!walkinName.trim() && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1">
                      * Customer name is mandatory for billing & ledger
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 3. Live Order Calculation & Discount */}
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
              {/* Gross Total */}
              <div className="flex justify-between items-center text-slate-500 font-bold">
                <span>{t('grossSubtotal')}:</span>
                <span className="font-black text-slate-800 dark:text-slate-100 font-mono text-sm">
                  Rs. {grossSubtotal.toLocaleString()}
                </span>
              </div>

              {/* Clean Discount Row */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 font-bold flex items-center gap-1 shrink-0">
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('discount') || 'Discount'}:</span>
                </span>

                <div className="flex items-center gap-1.5 justify-end">
                  {/* % / Rs Toggle */}
                  <div className="inline-flex rounded-xl p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black shrink-0">
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('percentage')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${orderDiscountType === 'percentage'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('flat')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${orderDiscountType === 'flat'
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
                    className={`w-24 border rounded-xl px-2.5 py-1 text-xs font-black outline-none text-right font-mono focus:border-amber-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              {/* Tax GST (If any) */}
              {taxAmount > 0 && (
                <div className="flex justify-between text-amber-500 font-black pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>{t('taxGST')} ({taxPercentage}%):</span>
                  <span className="font-mono">+ Rs. {taxAmount.toLocaleString()}</span>
                </div>
              )}

              {/* HERO NET TOTAL PAYABLE BANNER */}
              <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wide">
                    {t('netPayableTotal')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Net Bill Total</span>
                </div>
                <span className="text-2xl font-black text-brand-600 dark:text-brand-400 font-mono tracking-tight">
                  Rs. {netGrandTotal.toLocaleString()}
                </span>
              </div>

              {/* Advance Credit Applied Banner (If Customer has Available Credit) */}
              {availableAdvanceCredit > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-extrabold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>Reusable Customer Advance Credit:</span>
                    </span>
                    <span className="font-mono font-black">Rs. {availableAdvanceCredit.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-black">
                    <span>Auto-Applied to Current Sale:</span>
                    <span className="font-mono">- Rs. {appliedAdvanceCredit.toLocaleString()}</span>
                  </div>
                  <div className="pt-1 border-t border-emerald-500/20 flex items-center justify-between font-black text-slate-800 dark:text-slate-100">
                    <span>Net Cash / Payment to Collect:</span>
                    <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400 font-extrabold">
                      Rs. {netPayableAfterCredit.toLocaleString()}
                    </span>
                  </div>
                  {remainingAdvanceCredit > 0 && (
                    <div className="text-[10px] text-slate-400 font-semibold text-right">
                      (Remaining credit for next sale: Rs. {remainingAdvanceCredit.toLocaleString()})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Payment Settlement */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center">3</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('paymentSettlementTitle') || 'Payment & Khata Settlement'}
                </span>
              </div>

              {/* Payment Mode Buttons: Clean 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'Cash', label: 'Cash', icon: DollarSign },
                  { key: 'Credit', label: 'Khata', icon: Wallet },
                  { key: 'Bank', label: 'Bank Transfer', icon: Building2 },
                  { key: 'Card', label: 'Card Payment', icon: CreditCard }
                ].map(mode => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode.key);
                      if (mode.key === 'Credit') {
                        setAmountReceived('0');
                      } else if (amountReceived === '0' || mode.key === 'Bank' || mode.key === 'Card') {
                        setAmountReceived(netGrandTotal.toString());
                      }
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${paymentMode === mode.key
                        ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                        : theme === 'dark'
                          ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    <mode.icon className="w-4 h-4 shrink-0" />
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>

              {/* Amount Received Input */}
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">
                  {t('amountReceivedInput')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={netGrandTotal.toString()}
                    className={`w-full border-2 rounded-2xl px-4 py-2.5 text-base font-black outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">PKR</span>
                </div>
              </div>

              {/* Live Status Calculation & Return Change / Due */}
              {customerType === 'Regular Party' && selectedParty ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs font-black">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{t('previousKhataBalance')}:</span>
                    <span className="font-mono">Rs. {previousKhataBalance.toLocaleString()}</span>
                  </div>
                  {remainingDue > 0 ? (
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                      <span>{t('remainingDueKhata')}:</span>
                      <span className="font-mono text-sm font-black">+ Rs. {remainingDue.toLocaleString()}</span>
                    </div>
                  ) : changeDue > 0 ? (
                    <div className="flex items-center justify-between text-emerald-600 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <span>{t('changeReturnDue')}:</span>
                      <span className="font-mono text-sm font-black">Rs. {changeDue.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-600 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-xs">
                      <span>{t('status')}:</span>
                      <span>✓ Fully Settled (100% Paid)</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-brand-500">
                    <span>{t('newKhataBalanceAfterSale')}:</span>
                    <span className="font-mono font-black">Rs. {newKhataBalance.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-xs font-black">
                  {changeDue > 0 ? (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <span>{t('changeReturnDue')}:</span>
                      <span className="font-mono text-base font-black">Rs. {changeDue.toLocaleString()}</span>
                    </div>
                  ) : remainingDue > 0 ? (
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                      <span>{t('remainingDueKhata')}:</span>
                      <span className="font-mono text-base font-black">Rs. {remainingDue.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <span>{t('status')}:</span>
                      <span>✓ Fully Paid (Settled)</span>
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
                className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-medium outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            {/* 6. PRIMARY ACTION: COMPLETE SALE & PRINT RECEIPT */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={cart.length === 0 || isPlacingOrder}
                className="w-full py-4 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl transition shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer text-center"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="leading-snug text-base">{isPlacingOrder ? 'Processing...' : (t('completeAndPrintReceipt') || 'Complete Sale')}</span>
              </button>
              <div className="text-[10px] text-center text-slate-400 font-bold">
                {t('shortcutHint') || 'Press F9 or Ctrl+Enter to Checkout'}
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
          <div className={`rounded-3xl ${showNewCustomerForm ? 'max-w-2xl' : 'max-w-lg'} w-full p-4 sm:p-6 space-y-3.5 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black flex items-center gap-2">
                <User className="w-5 h-5 text-brand-500" />
                <span>{showNewCustomerForm ? 'Add New Customer Profile' : t('selectCustomerModalTitle')}</span>
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
              /* Comprehensive Add Customer & Khata Profile Form (English Only, Clean & No Scrollbar) */
              <form onSubmit={handleCreateCustomerSubmit} className="space-y-3">
                {/* 1. Basic & Business Identity */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Basic & Business Identity</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Muhammad Aslam"
                        value={newCustomerForm.name}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Shop
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aslam & Sons Traders"
                        value={newCustomerForm.shopName}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, shopName: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Customer Type
                      </label>
                      <select
                        value={newCustomerForm.customerType}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customerType: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      >
                        <option value="Regular Party">Regular Party</option>
                        <option value="Wholesale Buyer">Wholesale Buyer</option>
                        <option value="Retailer">Retailer</option>
                        <option value="Farmer / Producer">Farmer / Producer</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Location */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Contact & Mandi Location</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="03001234567"
                        value={newCustomerForm.phone}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="03001234567"
                        value={newCustomerForm.whatsapp}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sargodha"
                        value={newCustomerForm.city}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shop # 14, Block B"
                        value={newCustomerForm.address}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Financial & Payment Terms */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Financial & Payment Terms</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Opening Balance (PKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newCustomerForm.openingBalance || ''}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, openingBalance: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Khata Limit (PKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 500000"
                        value={newCustomerForm.creditLimit || ''}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, creditLimit: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Payment Terms
                      </label>
                      <select
                        value={newCustomerForm.paymentTerms}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, paymentTerms: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      >
                        <option value="Cash / Credit">Cash / Khata</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                        <option value="7 Days">Weekly (7 Days)</option>
                        <option value="15 Days">15 Days</option>
                        <option value="30 Days">Monthly (30 Days)</option>
                        <option value="Seasonal">Seasonal</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Bank Account Details */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Bank Account Details (Optional)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Meezan, HBL"
                        value={newCustomerForm.bankName}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, bankName: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Account Title
                      </label>
                      <input
                        type="text"
                        placeholder="Title of Account"
                        value={newCustomerForm.accountTitle}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, accountTitle: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Account #
                      </label>
                      <input
                        type="text"
                        placeholder="PK36..."
                        value={newCustomerForm.accountNumber}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, accountNumber: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Identification & Notes */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        CNIC
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 38403-1234567-1"
                        value={newCustomerForm.cnic}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, cnic: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Reference: Haji Akram Shop # 4"
                        value={newCustomerForm.notes}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(false)}
                    className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Customer Profile</span>
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

      {/* QUICK RATE OVERRIDE MODAL (Only when Khata is active) */}
      {showRateModal && isKhataActive && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowRateModal(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-500" />
                {t('editItemPriceModalTitle') || 'Edit Selling Rate (Khata)'}
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
              <label className="text-xs font-bold text-slate-400 block mb-1">{t('newRatePerUnit') || 'Selling Rate (PKR)'}</label>
              <input
                type="number"
                min="0"
                value={tempNewRate}
                onChange={(e) => setTempNewRate(e.target.value)}
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
                {t('saveRate') || 'Save Rate'}
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
