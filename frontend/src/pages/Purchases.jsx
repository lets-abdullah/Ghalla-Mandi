import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  DollarSign,
  X,
  RotateCcw,
  Package,
  FolderPlus,
  Tag,
  Scale,
  Sparkles,
  Check,
  UserCheck,
  User,
  Landmark,
  Hash,
  Edit3,
  Receipt,
  Eye
} from 'lucide-react';
import { useERP, computePurchaseFinancials, computeSupplierKhataBalance, computeAllSuppliersFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PurchaseReceiptModal } from '../modals/PurchaseReceiptModal';
import { PurchaseReturnModal } from '../modals/PurchaseReturnModal';
import { EditPurchaseModal } from '../modals/EditPurchaseModal';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const Purchases = () => {
  const toast = useToast();
  const {
    suppliers = [],
    products = [],
    categories = [],
    purchases = [],
    purchaseReturns = [],
    paymentLogs = [],
    createPurchase,
    updatePurchase,
    recordPayment,
    addProduct,
    addCategory,
    addSupplier
  } = useERP();

  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Due' | 'Returns'
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('All');
  const [selectedProductFilter, setSelectedProductFilter] = useState('All');
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnPurchase, setSelectedReturnPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [payModalPurchase, setPayModalPurchase] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Inline Modals State for Supplier, Product & Category Creation
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [productSuccessMsg, setProductSuccessMsg] = useState('');

  // New Supplier Form State with Bank Details
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    city: '',
    address: '',
    openingBalance: 0,
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    suppliedProducts: [],
    notes: ''
  });

  // New Product Form State
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: categories[0]?.name || 'Grains & Cereals',
    unit: 'KG',
    code: '',
    purchasePrice: '',
    sellingPrice: '',
    description: ''
  });

  // New Category Form State
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    description: ''
  });

  // Form for New Purchase (Auto-moves to Supplier Khata)
  const [form, setForm] = useState({
    supplierId: suppliers[0]?.id || '',
    supplierName: suppliers[0]?.name || '',
    productId: products[0]?.id || '',
    enteredQty: '1',
    rate: products[0]?.purchasePrice || 0
  });

  // Form for Pay Balance
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMode: 'Cash',
    note: ''
  });

  // Keyboard Escape listener - closes ONLY the topmost active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddCategoryModal) {
          setShowAddCategoryModal(false);
        } else if (showAddProductModal) {
          setShowAddProductModal(false);
        } else if (payModalPurchase) {
          setPayModalPurchase(null);
        } else if (showModal) {
          setShowModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddCategoryModal, showAddProductModal, showModal, payModalPurchase]);

  // Keep initial defaults if form is empty on first load
  useEffect(() => {
    if (!form.supplierId && suppliers.length > 0) {
      setForm(prev => ({
        ...prev,
        supplierId: suppliers[0].id,
        supplierName: suppliers[0].name
      }));
    }
    if (!form.productId && products.length > 0) {
      setForm(prev => ({
        ...prev,
        productId: products[0].id,
        rate: products[0].purchasePrice || 0
      }));
    }
  }, [suppliers, products]);

  // Available products catalog
  const availableProducts = products;
  const selectedProduct = availableProducts.find(p => p.id === form.productId) || availableProducts[0];
  const productUnit = selectedProduct?.unit || t('kg');

  // Calculate live totals for the new purchase form
  const calculatedTotal = Math.max(0, (Number(form.enteredQty) || 0) * (Number(form.rate) || 0));

  // 1. Quick Add Category Handler (Does NOT close or reset Purchase or Product forms)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const catName = newCategoryForm.name.trim();
    if (!catName) {
      alert('Category name is required.');
      return;
    }

    const duplicate = categories.some(c => c.name.toLowerCase() === catName.toLowerCase());
    if (duplicate) {
      setNewProductForm(prev => ({ ...prev, category: catName }));
      setShowAddCategoryModal(false);
      return;
    }

    setIsCreatingCategory(true);
    try {
      const created = await addCategory({
        name: catName,
        description: newCategoryForm.description.trim() || 'Custom commodity category'
      });

      const assignedCategoryName = created?.name || catName;
      // Auto-select newly created category in the New Product Form
      setNewProductForm(prev => ({
        ...prev,
        category: assignedCategoryName
      }));

      // Close ONLY the Category popup and return immediately to the Product form
      setShowAddCategoryModal(false);
      setNewCategoryForm({ name: '', description: '' });
    } catch (err) {
      console.error('Failed to create category:', err);
      alert(err.message || 'Failed to save category.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // 2. Quick Add Product Handler (Does NOT close or reset Purchase form)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const prodName = newProductForm.name.trim();
    if (!prodName) {
      alert('Product name is required.');
      return;
    }

    const catName = newProductForm.category || (categories[0]?.name || 'Grains & Cereals');
    const pPrice = Math.max(0, Number(newProductForm.purchasePrice) || 0);
    const sPrice = Math.max(0, Number(newProductForm.sellingPrice) || pPrice);

    setIsCreatingProduct(true);
    try {
      const createdProd = await addProduct({
        name: prodName,
        category: catName,
        code: newProductForm.code.trim(),
        unit: newProductForm.unit || 'KG',
        defaultUnit: newProductForm.unit || 'KG',
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        stockQty: 0,
        minStock: 10,
        description: newProductForm.description.trim()
      });

      // Auto-select newly created product in the active New Purchase Form while strictly keeping all entered data (supplier, enteredQty) intact!
      if (createdProd && createdProd.id) {
        setForm(prev => ({
          ...prev,
          productId: createdProd.id,
          rate: pPrice > 0 ? pPrice : (Number(createdProd.purchasePrice) || prev.rate)
        }));
      }

      setProductSuccessMsg(`✓ "${prodName}" saved and selected in purchase!`);
      setTimeout(() => setProductSuccessMsg(''), 4000);

      // Close ONLY the Product popup and return immediately to the SAME New Purchase form
      setShowAddProductModal(false);
      setNewProductForm({
        name: '',
        category: categories[0]?.name || 'Grains & Cereals',
        unit: 'KG',
        code: '',
        purchasePrice: '',
        sellingPrice: '',
        description: ''
      });
    } catch (err) {
      console.error('Failed to create product:', err);
      alert(err.message || 'Failed to save product.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // 3. Quick Add Supplier Handler (Does NOT close or reset Purchase form)
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    const supName = newSupplierForm.name.trim();
    if (!supName) {
      alert('Supplier name is required.');
      return;
    }

    if (newSupplierForm.phone.trim() && newSupplierForm.phone.replace(/\D/g, '').length !== 11) {
      alert('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    setIsCreatingSupplier(true);
    try {
      const createdSup = await addSupplier({
        name: supName,
        businessName: newSupplierForm.businessName.trim(),
        phone: newSupplierForm.phone.trim() || 'N/A',
        city: newSupplierForm.city.trim() || 'Local Mandi',
        address: newSupplierForm.address.trim(),
        openingBalance: Number(newSupplierForm.openingBalance) || 0,
        bankName: newSupplierForm.bankName.trim(),
        accountTitle: newSupplierForm.accountTitle.trim(),
        accountNumber: newSupplierForm.accountNumber.trim(),
        suppliedProducts: newSupplierForm.suppliedProducts || [],
        status: 'Active',
        notes: newSupplierForm.notes.trim()
      });

      // Auto-select newly created supplier in active New Purchase Form
      if (createdSup && createdSup.id) {
        setForm(prev => ({
          ...prev,
          supplierId: createdSup.id,
          supplierName: createdSup.name
        }));
      }

      setProductSuccessMsg(`✓ Supplier "${supName}" saved & selected in purchase!`);
      setTimeout(() => setProductSuccessMsg(''), 4000);

      // Close ONLY the Supplier popup and return immediately to the SAME New Purchase form
      setShowAddSupplierModal(false);
      setNewSupplierForm({
        name: '',
        businessName: '',
        phone: '',
        city: '',
        address: '',
        openingBalance: 0,
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        suppliedProducts: [],
        notes: ''
      });
    } catch (err) {
      console.error('Failed to create supplier:', err);
      alert(err.message || 'Failed to save supplier.');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  // 3. Main New Purchase Record Handler
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const supplierObj = suppliers.find(s => s.id === form.supplierId) || suppliers[0];
    if (!supplierObj) {
      alert(t('addSupplierFirst'));
      return;
    }

    if (!selectedProduct) {
      alert(t('addProductFirst'));
      return;
    }

    const qtyVal = Math.max(1, Math.floor(Number(form.enteredQty) || 1));
    const rateVal = Math.max(0, Number(form.rate) || 0);

    // All purchases automatically move to Supplier Khata by default (Payable / Credit)
    const actualPaid = 0;
    const paymentModeVal = 'Supplier Khata';
    const paymentStatusVal = 'Pending';

    setIsSubmitting(true);
    try {
      const created = await createPurchase({
        supplierId: supplierObj.id,
        supplier: supplierObj.name,
        supplierName: supplierObj.name,
        productId: selectedProduct.id,
        qtyKg: qtyVal,
        rate: rateVal,
        items: `${qtyVal} ${productUnit} ${selectedProduct?.name || 'Product'}`,
        amount: calculatedTotal,
        paidAmount: actualPaid,
        paymentMode: paymentModeVal,
        paymentStatus: paymentStatusVal,
        cart: [
          {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            unit: productUnit,
            unitName: productUnit,
            qty: qtyVal,
            rate: rateVal,
            total: calculatedTotal
          }
        ]
      });

      setShowModal(false);
      setForm({
        supplierId: suppliers[0]?.id || '',
        supplierName: suppliers[0]?.name || '',
        productId: products[0]?.id || '',
        enteredQty: '1',
        rate: products[0]?.purchasePrice || 0
      });

      // Automatically generate & display Purchase Receipt Voucher
      setSelectedReceipt({
        purchaseNo: created?.purchaseNo || `PUR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: created?.date || new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'medium' }),
        supplierName: supplierObj.name,
        supplierPhone: supplierObj.phone,
        supplierCity: supplierObj.city,
        items: [{
          name: selectedProduct.name,
          qty: qtyVal,
          unit: productUnit,
          price: rateVal,
          total: calculatedTotal
        }],
        totalAmount: calculatedTotal,
        paidAmount: 0,
        paymentMode: 'Supplier Khata',
        supplierBalance: (Number(supplierObj.balance) || 0) + calculatedTotal,
        note: 'Added to Supplier Khata (Credit Payable)'
      });
      toast.success(`Purchase recorded! Added Rs. ${calculatedTotal.toLocaleString()} to ${supplierObj.name}'s Khata.`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error saving purchase entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReceiptForPurchase = (p) => {
    const rawItems = Array.isArray(p.cart) && p.cart.length > 0 ? p.cart : (Array.isArray(p.items) ? p.items : []);
    const formattedItems = rawItems.map(it => ({
      name: it.name || it.productName || 'Produce',
      qty: Number(it.qty || it.enteredQty || 1),
      unit: it.unit || it.unitName || 'KG',
      price: Number(it.rate || it.price || 0),
      total: Number(it.total || (Number(it.rate || 0) * Number(it.qty || 1)) || 0)
    }));

    setSelectedReceipt({
      purchaseNo: p.purchaseNo || `PUR-${p.id}`,
      date: p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'N/A'),
      supplierName: p.supplierName || p.supplier || 'Supplier Vendor',
      supplierPhone: p.supplierPhone || p.phone || '',
      supplierCity: p.supplierCity || p.city || '',
      items: formattedItems.length > 0 ? formattedItems : [{
        name: typeof p.items === 'string' ? p.items : 'Commodity Purchase',
        qty: Number(p.qtyKg || 1),
        unit: 'KG',
        price: Number(p.rate || p.amount || 0),
        total: Number(p.amount || 0)
      }],
      totalAmount: Number(p.amount || 0),
      paidAmount: Number(p.paidAmount || 0),
      paymentMode: p.paymentMode || p.paymentMethod || 'Supplier Khata',
      note: p.note || 'Inward commodity arrival record.'
    });
  };

  const openPayModal = (purchase) => {
    const fin = computePurchaseFinancials(purchase, purchaseReturns, paymentLogs, purchases);
    setPayModalPurchase(purchase);
    setPayForm({
      amount: fin.due,
      paymentMode: 'Cash',
      note: `Payment for ${purchase.purchaseNo || 'bill'}`
    });
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payModalPurchase || isSubmitting) return;

    const fin = computePurchaseFinancials(payModalPurchase, purchaseReturns, paymentLogs, purchases);
    const payVal = Math.max(1, Number(payForm.amount) || 0);

    if (payVal > fin.due) {
      toast.error(`Paid amount cannot exceed remaining due of Rs. ${fin.due.toLocaleString()}`);
      return;
    }

    const supplierObj = suppliers.find(s => s.name === payModalPurchase.supplier || s.id === payModalPurchase.supplierId) || suppliers[0];

    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId: supplierObj ? supplierObj.id : payModalPurchase.supplierId,
        partyType: 'Supplier',
        amount: payVal,
        paymentMode: payForm.paymentMode,
        note: payForm.note || `Payment for purchase ${payModalPurchase.purchaseNo}`,
        purchaseId: payModalPurchase.id
      });
      toast.success(`Payment of Rs. ${payVal.toLocaleString()} recorded for ${payModalPurchase.purchaseNo}`);
      setPayModalPurchase(null);
    } catch (err) {
      console.error('Payment record error:', err);
      toast.error(err.message || 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for KPI Header Cards using Centralized Engine
  const {
    totalGrossPurchases,
    totalReturns: totalPurchaseReturnsVal,
    totalNetPurchases,
    totalPaymentsPaid: totalPaidOut,
    totalPayables: totalOutstandingPayable
  } = useMemo(() => {
    return computeAllSuppliersFinancials(suppliers, purchases, paymentLogs, purchaseReturns);
  }, [suppliers, purchases, paymentLogs, purchaseReturns]);

  // Robust Date Parser helper
  const parsePurchaseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const matchPurchaseDate = (dateStr) => {
    if (dateFilterType === 'All') return true;
    const pDate = parsePurchaseDate(dateStr);
    if (!pDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const day = new Date(pDate);
    day.setHours(0, 0, 0, 0);

    if (dateFilterType === 'Today') {
      return day.getTime() === today.getTime();
    }
    if (dateFilterType === 'Yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      return day.getTime() === yest.getTime();
    }
    if (dateFilterType === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return day >= startOfWeek && day <= new Date();
    }
    if (dateFilterType === 'This Month') {
      return day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth();
    }
    if (dateFilterType === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return day >= start && day <= end;
      } else if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return day >= start;
      } else if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return day <= end;
      }
    }
    return true;
  };

  const filteredPurchases = purchases.filter(p => {
    // 0. Search Filter (Bill #, Supplier Name, Commodity Item)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const numMatch = (p.purchaseNo || p.billNo || `pur-${p.id}`).toLowerCase().includes(q);
      const supMatch = (p.supplier || p.supplierName || '').toLowerCase().includes(q);
      const cart = Array.isArray(p.cart) && p.cart.length > 0 ? p.cart : (Array.isArray(p.items) ? p.items : []);
      const itemMatch = cart.some(it => (it.name || it.productName || '').toLowerCase().includes(q)) ||
        (p.productName && p.productName.toLowerCase().includes(q));
      if (!numMatch && !supMatch && !itemMatch) return false;
    }

    // 1. Supplier Filter
    if (selectedSupplierFilter !== 'All') {
      const supMatch = (p.supplierId === selectedSupplierFilter) ||
        ((p.supplier || p.supplierName || '').toLowerCase() === selectedSupplierFilter.toLowerCase());
      if (!supMatch) return false;
    }

    // 3. Product Filter
    if (selectedProductFilter !== 'All') {
      let containsProd = false;
      if (p.productId && p.productId === selectedProductFilter) containsProd = true;
      if (p.productName && p.productName.toLowerCase() === selectedProductFilter.toLowerCase()) containsProd = true;
      if (typeof p.items === 'string' && p.items.toLowerCase().includes(selectedProductFilter.toLowerCase())) containsProd = true;
      if (Array.isArray(p.cart)) {
        containsProd = p.cart.some(item =>
          (item.name || item.productName || '').toLowerCase() === selectedProductFilter.toLowerCase() ||
          item.productId === selectedProductFilter
        );
      }
      if (Array.isArray(p.items)) {
        containsProd = containsProd || p.items.some(item =>
          (item.name || item.productName || '').toLowerCase() === selectedProductFilter.toLowerCase() ||
          item.productId === selectedProductFilter
        );
      }
      if (!containsProd) return false;
    }

    // 4. Date Filter
    if (!matchPurchaseDate(p.date || p.createdAt)) return false;

    // 5. Payment / Status Filter using Canonical Financial Engine
    const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
    const { status, isReturned } = fin;

    if (filterType === 'Returns' || filterType === 'Returned') {
      if (!isReturned) return false;
    } else {
      if (filterType === 'Paid' && status !== 'Paid') return false;
      if (filterType === 'Partial' && status !== 'Partial') return false;
      if (filterType === 'Due' && status !== 'Due' && status !== 'Pending') return false;
    }

    return true;
  }).sort((a, b) => {
    const timeA = new Date(a.created_at || a.createdAt || a.date || 0).getTime() || Number(a.id) || 0;
    const timeB = new Date(b.created_at || b.createdAt || b.date || 0).getTime() || Number(b.id) || 0;
    return timeB - timeA;
  });

  const isAnyFilterActive = (
    searchTerm.trim() !== '' ||
    selectedSupplierFilter !== 'All' ||
    selectedProductFilter !== 'All' ||
    dateFilterType !== 'All' ||
    filterType !== 'All' ||
    customStartDate !== '' ||
    customEndDate !== ''
  );

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedSupplierFilter('All');
    setSelectedProductFilter('All');
    setDateFilterType('All');
    setFilterType('All');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header Banner (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-500" />
            <span>Purchases / Stock Inward</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Record incoming stock, weight, bags, and supplier purchase deals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print List</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Screen Only) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Purchases */}
        <div
          onClick={() => setFilterType('All')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>{t('totalPurchases') || 'Total Purchases'}</span>
          </div>

          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
            Rs. {totalNetPurchases.toLocaleString()}
          </div>
        </div>

        {/* 2. Total Paid Out */}
        <div
          onClick={() => setFilterType('Paid')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>{t('totalPaidOut') || 'Total Paid Out'}</span>
          </div>

          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            Rs. {totalPaidOut.toLocaleString()}
          </div>
        </div>

        {/* 3. Purchase Returns */}
        <div
          onClick={() => setFilterType('Returns')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-purple-50/50 to-white border-purple-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-600" />
            <span>Purchase Returns</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-purple-600 dark:text-purple-400">
            Rs. {totalPurchaseReturnsVal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Unified Filter Toolbar: [Search] [Supplier] [Product] [Date] [Status] (Screen Only) */}
      <div className={`no-print p-3.5 sm:p-4 rounded-3xl border card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
          {/* 0. Search Purchases */}
          <div className="flex-[2] min-w-[180px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-brand-500" />
              <span>Search Purchases</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search bill #, supplier, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-brand-500 h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 1. Supplier */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Supplier</span>
            </label>
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
              ))}
            </select>
          </div>

          {/* 2. Product */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>Product</span>
            </label>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Date Filter */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Date Filter</span>
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          {/* 4. Status */}
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Status</span>
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Paid</option>
              <option value="Due">Pending / Due</option>
              <option value="Returns">Show Returns</option>
            </select>
          </div>

          {/* Inline Reset Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-[38px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center justify-center gap-1.5"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Custom Date Pickers (if Custom is selected) */}
        {dateFilterType === 'Custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-400">Date Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER (Mandi branding, title, stats) */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Purchases & Inward Goods Statement"
        filterSummary={`Period: ${dateFilterType} | Status: ${filterType}`}
        stats={[
          { label: 'Total Purchases', value: filteredPurchases.length },
          { label: 'Purchases Volume', value: `Rs. ${totalNetPurchases.toLocaleString()}` },
          { label: 'Total Paid Out', value: `Rs. ${totalPaidOut.toLocaleString()}` },
          { label: 'Purchase Returns', value: `Rs. ${totalPurchaseReturnsVal.toLocaleString()}` }
        ]}
      />

      {/* Main Purchase Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">Bill #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Returned</th>
                <th className="py-3 px-4 text-right">Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <EmptyState
                      icon={ShoppingCart}
                      title="No purchases found"
                      description="No purchases match your current search and filter criteria."
                      action={
                        <button
                          type="button"
                          onClick={() => setShowModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-brand-600 hover:bg-brand-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Record Purchase</span>
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => {
                  const {
                    total,
                    grossTotal,
                    netTotal,
                    paid,
                    returnAmount: retAmt,
                    due,
                    status,
                    isReturned,
                    isFullyReturned,
                    isPartiallyReturned
                  } = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);

                  return (
                    <tr key={p.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                      }`}>
                      {/* 1. Bill # */}
                      <td className="py-3.5 px-4 font-mono font-black text-brand-500 text-xs">
                        {p.purchaseNo || p.purchaseno}
                      </td>

                      {/* 2. Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs font-mono font-medium">
                        {p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '-'))}
                      </td>

                      {/* 3. Supplier */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {p.supplier || p.supplierName || 'General Supplier'}
                        </div>
                      </td>

                      {/* 4. Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        Rs. {grossTotal.toLocaleString()}
                      </td>

                      {/* 5. Paid */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        Rs. {paid.toLocaleString()}
                      </td>

                      {/* 6. Returned */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        Rs. {retAmt.toLocaleString()}
                      </td>

                      {/* 7. Payable */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-rose-500">
                        Rs. {due.toLocaleString()}
                      </td>

                      {/* 8. Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={isFullyReturned ? 'Returned' : status} />
                      </td>

                      {/* 9. Actions: Consistent View + Action Cluster */}
                      <td className="py-3.5 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer text-xs font-bold active:scale-98"
                            title="View / Print Purchase Bill"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>

                          {!isFullyReturned && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReturnPurchase(p);
                                setShowReturnModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs font-bold active:scale-98"
                              title="Return Items"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Print Footer */}
      <PrintFooter note="Official Business Record • Ghalla Mandi Purchases & Inward Commodities Register" />

      {/* ========================================================================= */}
      {/* 1. MAIN NEW PURCHASE MODAL (Base Layer: z-50) */}
      {/* ========================================================================= */}
      {showModal && (
        <div
          onClick={(e) => {
            // Only close if user clicked directly on this backdrop AND no child modal is active
            if (e.target === e.currentTarget && !showAddProductModal && !showAddCategoryModal) {
              setShowModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-500" />
                {t('recordNewPurchase')}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success notification banner if product was just created */}
            {productSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{productSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRecordSubmit} className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Supplier Firm *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Supplier</span>
                  </button>
                </div>

                <select
                  value={form.supplierId}
                  onChange={(e) => {
                    const sup = suppliers.find(s => s.id === e.target.value);
                    setForm({
                      ...form,
                      supplierId: e.target.value,
                      supplierName: sup ? sup.name : ''
                    });
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              {/* Product Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Select Product *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Product</span>
                  </button>
                </div>

                <select
                  value={form.productId}
                  onChange={(e) => {
                    const prod = products.find(p => p.id === e.target.value);
                    setForm(prev => ({
                      ...prev,
                      productId: e.target.value,
                      rate: prod ? (prod.purchasePrice || 0) : prev.rate
                    }));
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category}) — {p.unit || t('kg')}</option>
                  ))}
                </select>
              </div>

              {/* Quantity & Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    {t('qtyWithUnit', { unit: productUnit }).replace(/\s*\*+\s*$/, '')} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={form.enteredQty}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                      e.target.value = clean;
                      setForm({ ...form, enteredQty: clean });
                    }}
                    onBlur={() => {
                      if (!form.enteredQty || Number(form.enteredQty) <= 0) {
                        setForm(prev => ({ ...prev, enteredQty: '1' }));
                      }
                    }}
                    placeholder="1"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    {t('rateWithUnit', { unit: productUnit }).replace(/\s*\*+\s*$/, '')} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    value={form.rate}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
                      e.target.value = clean;
                      setForm({ ...form, rate: clean });
                    }}
                    onBlur={() => {
                      if (form.rate === '') {
                        setForm(prev => ({ ...prev, rate: '0' }));
                      }
                    }}
                    placeholder="0"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* Calculated Volume */}
              <div className={`p-3 rounded-xl border space-y-1 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex justify-between text-xs font-extrabold">
                  <span>{t('totalPurchasesVolume')}:</span>
                  <span className="text-brand-500 font-mono text-sm">Rs. {calculatedTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? t('processing') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUICK ADD SUPPLIER MODAL (Compact 2-Column Grid - No Desktop Scroll) */}
      {/* ========================================================================= */}
      {showAddSupplierModal && (
        <div
          onClick={() => setShowAddSupplierModal(false)}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto relative shadow-2xl ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Quick Add Supplier</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Save supplier and auto-select into current purchase record</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LEFT COLUMN: Identity & Contact */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Identity & Contact</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Supplier Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="e.g. Aslam Chaudhry"
                        value={newSupplierForm.name}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Business Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aslam Grain Traders"
                        value={newSupplierForm.businessName}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, businessName: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="03001234567"
                        value={newSupplierForm.phone}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Faisalabad"
                        value={newSupplierForm.city}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, city: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Full Address
                    </label>
                    <input
                      type="text"
                      placeholder="Shop #, Grain Market..."
                      value={newSupplierForm.address}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Financial & Bank Details */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Financial & Bank Account Info</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Meezan, HBL"
                        value={newSupplierForm.bankName}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, bankName: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Account Title
                      </label>
                      <input
                        type="text"
                        placeholder="Account Title"
                        value={newSupplierForm.accountTitle}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, accountTitle: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Account #
                      </label>
                      <input
                        type="text"
                        placeholder="PK36..."
                        value={newSupplierForm.accountNumber}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, accountNumber: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Special Mandi notes or terms..."
                      value={newSupplierForm.notes}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, notes: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSupplier}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCreatingSupplier ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Supplier</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. QUICK ADD NEW PRODUCT MODAL (Layered on top of New Purchase dialog at z-[100]) */}
      {/* ========================================================================= */}
      {showAddProductModal && (
        <div
          onClick={(e) => {
            // Clicking backdrop closes ONLY this product modal, leaving purchase form open
            if (e.target === e.currentTarget && !showAddCategoryModal) {
              setShowAddProductModal(false);
            }
          }}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto relative shadow-2xl ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Add New Product</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Will automatically select in current purchase</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              {/* Product Name */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Super Basmati Rice, Wheat 1121"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              {/* Category Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add New Category</span>
                  </button>
                </div>

                <select
                  value={newProductForm.category}
                  onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  {categories.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Unit & Optional Product Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Standard Unit *
                  </label>
                  <select
                    value={newProductForm.unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="KG">Kilogram (KG)</option>
                    <option value="Gram">Gram (g)</option>
                    <option value="Litre">Litre (L)</option>
                    <option value="ML">Millilitre (ML)</option>
                    <option value="Meter">Meter (m)</option>
                    <option value="Piece">Piece (pc)</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Product Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRD-101"
                    value={newProductForm.code}
                    onChange={(e) => setNewProductForm({ ...newProductForm, code: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* Default Purchase Rate & Selling Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Purchase Rate (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newProductForm.purchasePrice}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    onChange={(e) => setNewProductForm({ ...newProductForm, purchasePrice: e.target.value.replace(/[^0-9]/g, '') })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Selling Rate (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newProductForm.sellingPrice}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sellingPrice: e.target.value.replace(/[^0-9]/g, '') })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Grade, moisture level, harvest season, etc."
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCreatingProduct ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. QUICK ADD NEW CATEGORY MODAL (Layered on top of Product dialog at z-[110]) */}
      {/* ========================================================================= */}
      {showAddCategoryModal && (
        <div
          onClick={(e) => {
            // Clicking backdrop closes ONLY category modal, leaving product form open
            if (e.target === e.currentTarget) {
              setShowAddCategoryModal(false);
            }
          }}
          className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 110 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto relative shadow-2xl ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Add New Category</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Auto-selects in product form</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Pulses, Oilseeds, Basmati Grains"
                  value={newCategoryForm.name}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief description of this commodity category"
                  value={newCategoryForm.description}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, description: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCategory}
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCreatingCategory ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Category</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Balance Modal (Symmetrical with Sales Received Modal) */}
      {payModalPurchase && (() => {
        const fin = computePurchaseFinancials(payModalPurchase, purchaseReturns, paymentLogs, purchases);
        const maxDue = Math.max(0, Number(fin.due || 0));
        const currentPayAmt = Number(payForm.amount) || 0;
        const remainingAfterPayment = Math.max(0, maxDue - currentPayAmt);
        const isFullSettlement = currentPayAmt >= maxDue && maxDue > 0;

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setPayModalPurchase(null); }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">{t('payBalance') || 'Pay Balance'}</h3>
                    <p className="text-[11px] text-slate-400 font-mono font-bold">{payModalPurchase.purchaseNo}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayModalPurchase(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                  title={t('close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bill Breakdown Summary Card */}
              <div className={`rounded-2xl p-3.5 space-y-2 border text-xs font-semibold ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{t('partyName') || 'Party Name'}:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{payModalPurchase.supplier || payModalPurchase.supplierName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('totalInvoiceAmount') || 'Total Bill Amount'}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Rs. {Number(fin.grossTotal || payModalPurchase.amount || 0).toLocaleString()}</span>
                </div>
                {fin.returns > 0 && (
                  <div className="flex justify-between items-center text-purple-600 dark:text-purple-400">
                    <span>Returns Deducted:</span>
                    <span className="font-bold">-Rs. {Number(fin.returns).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span>{t('alreadyPaid') || 'Already Paid'}:</span>
                  <span className="font-bold">Rs. {Number(fin.paid || payModalPurchase.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700 text-rose-500 font-extrabold text-xs">
                  <span>{t('remainingDue') || 'Remaining Due'}:</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                    Rs. {maxDue.toLocaleString()}
                  </span>
                </div>
              </div>

              <form onSubmit={handlePaySubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400">
                      Payment Amount to Pay (Rs.) *
                    </label>
                    {isFullSettlement && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Fully Settling</span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    max={maxDue > 0 ? maxDue : 1}
                    step="1"
                    autoFocus
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={payForm.amount}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      if (raw === '') {
                        setPayForm({ ...payForm, amount: '' });
                        return;
                      }
                      const num = parseInt(raw, 10) || 0;
                      if (maxDue > 0 && num > maxDue) {
                        setPayForm({ ...payForm, amount: maxDue });
                      } else {
                        setPayForm({ ...payForm, amount: num });
                      }
                    }}
                    placeholder={`Max Rs. ${maxDue.toLocaleString()}`}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />

                  {/* Live Remaining Balance Calculation Preview */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                    <span className="text-slate-500 dark:text-slate-400">Balance after payment:</span>
                    <span className={`font-mono ${remainingAfterPayment === 0
                      ? 'text-emerald-600 dark:text-emerald-400 font-black'
                      : 'text-amber-600 dark:text-amber-400 font-black'
                      }`}>
                      Rs. {remainingAfterPayment.toLocaleString()}
                      {remainingAfterPayment === 0 && ' (Fully Settled)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">{t('paymentMode') || 'Payment Method'}</label>
                    <select
                      value={payForm.paymentMode}
                      onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Note / Remarks</label>
                    <input
                      type="text"
                      value={payForm.note || ''}
                      onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                      placeholder="e.g. Counter cash"
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayModalPurchase(null)}
                    className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || Number(payForm.amount) <= 0 || Number(payForm.amount) > maxDue}
                    className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? t('processing') : 'Save Payment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Purchase Return Modal */}
      <PurchaseReturnModal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setSelectedReturnPurchase(null);
        }}
        initialPurchase={selectedReturnPurchase}
      />

      {/* Official Voucher Receipt Modal */}
      <PurchaseReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        purchaseData={selectedReceipt}
      />

      {/* Edit Purchase Modal */}
      {editingPurchase && (
        <EditPurchaseModal
          isOpen={!!editingPurchase}
          onClose={() => setEditingPurchase(null)}
          purchase={editingPurchase}
        />
      )}
    </div>
  );
};

export default Purchases;
