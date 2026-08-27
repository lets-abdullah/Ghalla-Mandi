import React, { useState, useEffect } from 'react';
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
  Hash
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PurchaseReceiptModal } from '../components/PurchaseReceiptModal';
import { PurchaseReturnModal } from '../components/PurchaseReturnModal';

export const Purchases = () => {
  const { 
    suppliers = [], 
    products = [], 
    categories = [], 
    purchases = [], 
    purchaseReturns = [], 
    createPurchase, 
    recordPayment,
    addProduct,
    addCategory,
    addSupplier
  } = useERP();

  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Due' | 'Returns'
  const [search, setSearch] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('All');
  const [selectedProductFilter, setSelectedProductFilter] = useState('All');
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnPurchase, setSelectedReturnPurchase] = useState(null);
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

  // Form for New Purchase
  const [form, setForm] = useState({
    supplierId: suppliers[0]?.id || '',
    supplierName: suppliers[0]?.name || '',
    productId: products[0]?.id || '',
    enteredQty: 1,
    rate: products[0]?.purchasePrice || 0
  });

  // Form for Pay Balance
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMode: 'Cash'
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
        paidAmount: 0,
        cart: [
          {
            productId: selectedProduct.id,
            name: selectedProduct.name,
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
        enteredQty: 1,
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
        paymentMode: 'Supplier Khata (Credit Payable)',
        supplierBalance: (Number(supplierObj.balance) || 0) + calculatedTotal,
        note: 'Procurement arrival entry verified in Mandi stock register.'
      });
    } catch (err) {
      console.error(err);
      alert("Error saving purchase entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayModal = (purchase) => {
    const totalAmt = Number(purchase.amount !== undefined ? purchase.amount : (purchase.grandTotal !== undefined ? purchase.grandTotal : 0));
    const paidAmt = Number(purchase.paidAmount || 0);
    const remainingDue = Math.max(0, totalAmt - paidAmt);
    setPayModalPurchase(purchase);
    setPayForm({
      amount: remainingDue,
      paymentMode: 'Cash'
    });
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payModalPurchase || isSubmitting) return;

    const totalAmt = Number(payModalPurchase.amount !== undefined ? payModalPurchase.amount : (payModalPurchase.grandTotal !== undefined ? payModalPurchase.grandTotal : 0));
    const paidAmt = Number(payModalPurchase.paidAmount || 0);
    const remainingDue = Math.max(0, totalAmt - paidAmt);
    const payVal = Math.max(1, Number(payForm.amount) || 0);

    if (payVal > remainingDue) {
      alert(t('paidAmountExceedsAlert', { total: remainingDue.toLocaleString() }));
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
        note: `Payment for purchase ${payModalPurchase.purchaseNo}`,
        purchaseId: payModalPurchase.id
      });
      setPayModalPurchase(null);
    } catch (err) {
      console.error('Payment record error:', err);
      alert(err.message || 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for KPI Header Cards
  const totalGrossPurchases = purchases.reduce((acc, p) => acc + (Number(p.amount ?? p.grandTotal ?? p.grandtotal) || 0), 0);
  const totalPurchaseReturnsVal = (purchaseReturns || []).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  const totalNetPurchases = Math.max(0, totalGrossPurchases - totalPurchaseReturnsVal);
  const totalPaidOut = purchases.reduce((acc, p) => acc + (Number(p.paidAmount ?? p.paidamount) || 0), 0);
  const totalOutstandingPayable = purchases.reduce((acc, p) => {
    const amt = Number(p.amount ?? p.grandTotal ?? p.grandtotal) || 0;
    const paid = Number(p.paidAmount ?? p.paidamount) || 0;
    const ret = Number(p.returnAmount || 0);
    return acc + Math.max(0, amt - paid - ret);
  }, 0);

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
    // 1. Search Filter
    const matchesSearch = (p.purchaseNo || p.purchaseno || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier || p.supplierName || p.suppliername || '').toLowerCase().includes(search.toLowerCase()) ||
      (typeof p.items === 'string' ? p.items.toLowerCase() : '').includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Supplier Filter
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

    // 5. Payment / Status Filter
    const paid = Number(p.paidAmount ?? p.paidamount ?? 0);
    const total = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0);
    const status = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due';

    if (filterType === 'Paid' && status !== 'Paid') return false;
    if (filterType === 'Partial' && status !== 'Partial') return false;
    if (filterType === 'Due' && status !== 'Due') return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-500" />
            <span>Goods Inward & Procurement</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Record inward truck arrivals, weighing scale entries, bags, and supplier deal booking
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
            <span>Record Inward Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterType('All')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-blue-600" /> {t('totalPurchasesVolume')}
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
            Rs. {totalNetPurchases.toLocaleString()}
          </div>
        </div>

        <div
          onClick={() => setFilterType('Paid')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" /> {t('totalPaidOut')}
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
            Rs. {totalPaidOut.toLocaleString()}
          </div>
        </div>

        <div
          onClick={() => setFilterType('Due')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-600" /> {t('outstandingPayables')}
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-rose-600 dark:text-rose-400">
            Rs. {totalOutstandingPayable.toLocaleString()}
          </div>
        </div>

        <div
          onClick={() => setFilterType('Returns')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-purple-50/50 to-white border-purple-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-purple-600" /> Purchase Returns
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-purple-600 dark:text-purple-400">
            Rs. {totalPurchaseReturnsVal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Unified Filter Toolbar: [Search] [Supplier] [Product] [Date] [Status] */}
      <div className={`p-4 rounded-3xl border card-shadow space-y-3 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Search */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-brand-500" />
              <span>Search</span>
            </label>
            <input
              type="text"
              placeholder="Search #, supplier, items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          {/* 2. Supplier */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Supplier</span>
            </label>
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
              ))}
            </select>
          </div>

          {/* 3. Product */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>Product</span>
            </label>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Date Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Date Filter</span>
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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

          {/* 5. Status */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Status</span>
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Paid</option>
              <option value="Due">Pending / Due</option>
              <option value="Returns">Show Returns</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers (if Custom is selected) */}
        {dateFilterType === 'Custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-400">Date Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>
        )}
      </div>

      {/* Main Table View */}
      {filterType === 'Returns' ? (
        /* Purchase Returns Table */
        <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Orig. Purchase</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Returned Item</th>
                  <th className="py-3 px-4 text-center">Refund Mode</th>
                  <th className="py-3 px-4 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {(purchaseReturns || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No purchase returns processed yet.
                    </td>
                  </tr>
                ) : (
                  (purchaseReturns || []).map(ret => (
                    <tr key={ret.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-3 px-4 font-mono font-bold text-rose-500">{ret.returnNo}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{ret.purchaseNo}</td>
                      <td className="py-3 px-4 text-slate-400">{ret.date}</td>
                      <td className="py-3 px-4 font-bold">{ret.supplierName}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {ret.items && ret.items[0] ? `${ret.items[0].name} (${ret.items[0].qty} ${ret.items[0].unit})` : 'Item'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${ret.refundMode === 'Cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {ret.refundMode === 'Cash' ? 'Cash' : 'Khata'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-rose-600 dark:text-rose-400">
                        Rs. {Number(ret.refundAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Purchase Table */
        <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                  <th className="py-3 px-4">Purchase #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
                }`}>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      {t('noPurchasesFound')}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => {
                    const paid = Number(p.paidAmount ?? p.paidamount ?? 0);
                    const total = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0);
                    const due = Math.max(0, total - paid);
                    const status = due === 0 && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due';

                    return (
                      <tr key={p.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                        }`}>
                        <td className="py-3 px-4 font-mono font-bold text-brand-500">{p.purchaseNo || p.purchaseno}</td>
                        <td className="py-3 px-4 font-bold">{p.supplier || p.supplierName || p.suppliername}</td>
                        <td className="py-3 px-4 text-slate-400">{typeof p.items === 'string' ? p.items : (Array.isArray(p.items) ? p.items.map(i => i.name || i.productName).join(', ') : 'Commodity Items')}</td>
                        <td className="py-3 px-4 text-right font-extrabold">Rs. {total.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-500">Rs. {paid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-500">Rs. {due.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            : status === 'Partial'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                            }`}>
                            {status === 'Paid' ? t('paid') : status === 'Partial' ? t('partial') : t('pending')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {due > 0 ? (
                              <button
                                onClick={() => openPayModal(p)}
                                className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition shadow-xs active:scale-98 flex items-center gap-1 cursor-pointer"
                              >
                                {t('payBalance')}
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-500 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {t('fullyPaid')}
                              </span>
                            )}

                            {/* Return Action Button */}
                            {(p.returnStatus === 'Fully Returned' || (Number(p.returnAmount || 0) >= (total - 1) && total > 0)) ? (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-400 text-xs font-bold select-none cursor-not-allowed"
                                title="This purchase is fully returned"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                                <span>Fully Returned</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedReturnPurchase(p);
                                  setShowReturnModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold"
                                title="Return Purchase"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Return Purchase</span>
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
      )}

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
                    {t('qtyWithUnit', { unit: productUnit })} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={form.enteredQty}
                    onChange={(e) => setForm({ ...form, enteredQty: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    {t('rateWithUnit', { unit: productUnit })} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
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
            className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto relative shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                        Supplier / Contact Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="e.g. Aslam Chaudhry"
                        value={newSupplierForm.name}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Firm / Business Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aslam Grain Traders"
                        value={newSupplierForm.businessName}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, businessName: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        type="text"
                        placeholder="03001234567"
                        value={newSupplierForm.phone}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        City / Mandi
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Faisalabad"
                        value={newSupplierForm.city}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, city: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Full Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Shop #, Grain Market..."
                      value={newSupplierForm.address}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Opening Balance (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={newSupplierForm.openingBalance}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, openingBalance: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
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
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Account # / IBAN
                      </label>
                      <input
                        type="text"
                        placeholder="PK36..."
                        value={newSupplierForm.accountNumber}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, accountNumber: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Notes / Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="Special Mandi notes or terms..."
                      value={newSupplierForm.notes}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, notes: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
            className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto relative shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="KG">Kilogram (KG)</option>
                    <option value="Maund">Maund / Mann (من)</option>
                    <option value="Bag">Bag / Bori (بوری)</option>
                    <option value="Gram">Gram (g)</option>
                    <option value="Liter">Liter (L)</option>
                    <option value="Quintal">Quintal (100 KG)</option>
                    <option value="Ton">Ton (1000 KG)</option>
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
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    step="any"
                    placeholder="0"
                    value={newProductForm.purchasePrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, purchasePrice: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    step="any"
                    placeholder="0"
                    value={newProductForm.sellingPrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sellingPrice: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
            className={`rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto relative shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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

      {/* Pay Balance Modal */}
      {payModalPurchase && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPayModalPurchase(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('payBalance')}</h3>
              <button
                type="button"
                onClick={() => setPayModalPurchase(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {t('supplierFirmName')}
                </label>
                <div className="text-sm font-extrabold">{payModalPurchase.supplier || payModalPurchase.supplierName}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {t('amountPaid')} (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {t('paymentMode')}
                </label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="Cash">Cash on Counter</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Online">Online Payment</option>
                  <option value="Cheque">Cheque</option>
                </select>
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
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? t('processing') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Purchases;
