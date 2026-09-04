import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  CheckCircle2,
  DollarSign,
  Check,
  X,
  Package,
  Mail,
  Building2,
  FileText,
  MessageSquare,
  Eye,
  LayoutGrid,
  List,
  ExternalLink,
  ChevronRight,
  ShoppingCart,
  FolderPlus,
  Landmark,
  Hash,
  ChevronDown,
  RotateCcw,
  BookOpen,
  CreditCard,
  Printer,
  AlertCircle
} from 'lucide-react';
import { useERP, computeSupplierKhataBalance, computeAllSuppliersFinancials, computePurchaseFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

// Standard Multi-Select Commodity Selector Component
const SuppliedProductsCombobox = ({
  products = [],
  selectedProducts = [],
  onChange,
  onAddNewProduct,
  theme
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const safeSelected = Array.isArray(selectedProducts) ? selectedProducts : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = (products || []).filter(p => {
    const pName = p.name || p.productName || p.title || '';
    const pCat = p.category || p.categoryName || '';
    const q = (query || '').toLowerCase().trim();
    if (!q) return true;
    return pName.toLowerCase().includes(q) || pCat.toLowerCase().includes(q);
  });

  const toggleProduct = (name) => {
    if (!name) return;
    if (safeSelected.includes(name)) {
      onChange(safeSelected.filter(n => n !== name));
    } else {
      onChange([...safeSelected, name]);
    }
  };

  const selectAll = () => {
    const allNames = filtered.map(p => p.name || p.productName || p.title).filter(Boolean);
    const combined = Array.from(new Set([...safeSelected, ...allNames]));
    onChange(combined);
  };

  const deselectAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      {/* Standard Form Label */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-slate-400">
          Supplied Products / Commodities
        </label>
        {onAddNewProduct && (
          <button
            type="button"
            onClick={onAddNewProduct}
            className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Integrated Tag Input matching other form fields */}
      <div
        onClick={() => setIsOpen(true)}
        className={`w-full border rounded-xl p-2 min-h-[38px] flex flex-wrap items-center gap-1.5 transition cursor-text ${theme === 'dark'
          ? 'bg-slate-900 border-slate-700 text-white focus-within:border-brand-500'
          : 'bg-slate-50 border-slate-200 text-slate-800 focus-within:border-brand-500'
          }`}
      >
        {/* Selected Product Badges */}
        {safeSelected.map(name => (
          <span
            key={name}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold select-none border ${theme === 'dark'
              ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
              : 'bg-brand-50 border-brand-200 text-brand-700'
              }`}
          >
            <span>{name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleProduct(name);
              }}
              className="hover:text-rose-500 rounded p-0.5 transition cursor-pointer"
              title={`Remove ${name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Search input inside the field */}
        <div className="flex-1 min-w-[130px] flex items-center gap-1">
          <input
            type="text"
            placeholder={safeSelected.length === 0 ? "Search or select commodities..." : "Add more..."}
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            className="w-full bg-transparent text-xs font-medium outline-none placeholder:font-normal placeholder-slate-400 py-0.5"
          />
          {query && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Dropdown Panel for Options */}
      {isOpen && (
        <div className={`p-2.5 rounded-2xl border space-y-1.5 shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 font-bold">
            <span>{filtered.length} products available</span>
            <div className="flex items-center gap-2">
              {filtered.length > 0 && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
              )}
              {safeSelected.length > 0 && (
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-rose-500 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 pt-1 pr-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="w-full py-2 text-center text-xs text-slate-400">
                <span>No products found matching "{query}"</span>
              </div>
            ) : (
              filtered.map(p => {
                const pName = p.name || p.productName || p.title || 'Product';
                const isSelected = safeSelected.includes(pName);

                return (
                  <button
                    key={p.id || pName}
                    type="button"
                    onClick={() => toggleProduct(pName)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer select-none border ${isSelected
                      ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                      : theme === 'dark'
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Plus className="w-3 h-3 text-slate-400" />}
                    <span>{pName}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Suppliers = () => {
  const toast = useToast();
  const { suppliers = [], products = [], categories = [], purchases = [], purchaseReturns = [], paymentLogs = [], addSupplier, updateSupplier, deleteSupplier, recordPayment, addProduct, addCategory } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // Filters & State
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('All');
  const [selectedProductFilter, setSelectedProductFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Payable' | 'Settled'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [viewingTab, setViewingTab] = useState('all'); // 'all' | 'purchases' | 'payments' | 'info'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pay Supplier Modal State
  const [payingSupplier, setPayingSupplier] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Quick Add Product & Category State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [productSuccessMsg, setProductSuccessMsg] = useState('');

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

  // Form for New Supplier with Bank Details
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    address: '',
    openingBalance: 0,
    suppliedProducts: [],
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    notes: ''
  });

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (payingSupplier) setPayingSupplier(null);
        else if (showAddModal) setShowAddModal(false);
        else if (editingSupplier) setEditingSupplier(null);
        else if (viewingSupplier) setViewingSupplier(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingSupplier, viewingSupplier, payingSupplier]);

  const handleOpenPayModal = (supplier) => {
    const fullSup = processedSuppliers.find(s => s.id === supplier.id) || supplier;
    const rawBal = Number(fullSup.balance || 0);
    const bal = rawBal < 1 ? 0 : Math.round(rawBal);
    setPayingSupplier(fullSup);
    setPayAmount(bal > 0 ? bal.toString() : '');
    setPayMode('Cash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNote(`Settlement payment to ${fullSup.name}`);
  };

  const handleExecuteSupplierPayment = async (e) => {
    e.preventDefault();
    if (!payingSupplier || isProcessingPay) return;

    const amt = parseInt(payAmount, 10) || 0;
    const rawDue = Number(payingSupplier.balance || 0);
    const maxDue = rawDue < 1 ? 0 : Math.round(rawDue);

    if (amt <= 0) {
      alert('Please enter a valid whole payment amount.');
      return;
    }

    if (maxDue <= 0) {
      alert('This supplier account is already fully settled (Rs. 0 balance). No payment is required.');
      return;
    }

    if (amt > maxDue) {
      alert(`Payment amount (Rs. ${amt.toLocaleString()}) cannot exceed the supplier's outstanding payable balance of Rs. ${maxDue.toLocaleString()}.`);
      return;
    }

    setIsProcessingPay(true);
    try {
      await recordPayment({
        partyId: payingSupplier.id,
        partyName: payingSupplier.name,
        partyType: 'Supplier',
        amount: amt,
        paymentMode: payMode,
        note: payNote
      });

      setPayingSupplier(null);
      setPayAmount('');
      setPayNote('');
    } catch (err) {
      alert(err.message || 'Failed to record payment to supplier');
    } finally {
      setIsProcessingPay(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Supplier Name is required.');
      return;
    }

    if (form.phone.trim() && form.phone.replace(/\D/g, '').length !== 11) {
      toast.warning('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }
    if (form.whatsapp.trim() && form.whatsapp.replace(/\D/g, '').length !== 11) {
      toast.warning('WhatsApp number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSupplier({
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        phone: form.phone.trim() || 'N/A',
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        city: form.city.trim() || 'Local Mandi',
        address: form.address.trim(),
        openingBalance: Math.max(0, Number(form.openingBalance) || 0),
        suppliedProducts: form.suppliedProducts || [],
        bankName: form.bankName.trim(),
        accountTitle: form.accountTitle.trim(),
        accountNumber: form.accountNumber.trim(),
        notes: form.notes.trim()
      });

      toast.success(`Supplier "${form.name.trim()}" added successfully!`);
      setShowAddModal(false);
      setForm({
        name: '',
        businessName: '',
        phone: '',
        whatsapp: '',
        email: '',
        city: '',
        address: '',
        openingBalance: 0,
        suppliedProducts: [],
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        notes: ''
      });
    } catch (err) {
      toast.error(err.message || 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;

    if (editingSupplier.phone && editingSupplier.phone !== 'N/A' && editingSupplier.phone.replace(/\D/g, '').length !== 11) {
      toast.warning('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }
    if (editingSupplier.whatsapp && editingSupplier.whatsapp.replace(/\D/g, '').length !== 11) {
      toast.warning('WhatsApp number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSupplier(editingSupplier.id, {
        name: editingSupplier.name.trim(),
        businessName: editingSupplier.businessName?.trim() || '',
        phone: editingSupplier.phone.trim() || 'N/A',
        whatsapp: editingSupplier.whatsapp?.trim() || '',
        email: editingSupplier.email?.trim() || '',
        city: editingSupplier.city.trim() || 'Local Mandi',
        address: editingSupplier.address?.trim() || '',
        balance: Math.max(0, Number(editingSupplier.balance) || 0),
        suppliedProducts: editingSupplier.suppliedProducts || [],
        bankName: editingSupplier.bankName?.trim() || '',
        accountTitle: editingSupplier.accountTitle?.trim() || '',
        accountNumber: (editingSupplier.accountNumber || editingSupplier.iban)?.trim() || '',
        notes: editingSupplier.notes?.trim() || ''
      });

      toast.success(`Supplier "${editingSupplier.name.trim()}" updated successfully!`);
      setEditingSupplier(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProductSelection = (prodName, isEdit = false) => {
    if (isEdit && editingSupplier) {
      const current = editingSupplier.suppliedProducts || [];
      const updated = current.includes(prodName)
        ? current.filter(p => p !== prodName)
        : [...current, prodName];
      setEditingSupplier({ ...editingSupplier, suppliedProducts: updated });
    } else {
      const current = form.suppliedProducts || [];
      const updated = current.includes(prodName)
        ? current.filter(p => p !== prodName)
        : [...current, prodName];
      setForm({ ...form, suppliedProducts: updated });
    }
  };

  // Quick Add Category Handler for Supplier Screen
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const catName = newCategoryForm.name.trim();
    if (!catName) {
      alert('Category name is required.');
      return;
    }

    setIsCreatingCategory(true);
    try {
      await addCategory({
        name: catName,
        description: newCategoryForm.description.trim()
      });

      setNewProductForm(prev => ({
        ...prev,
        category: catName
      }));

      setShowAddCategoryModal(false);
      setNewCategoryForm({ name: '', description: '' });
    } catch (err) {
      console.error('Failed to create category:', err);
      alert(err.message || 'Failed to save category.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Quick Add Product Handler for Supplier Screen
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

      // Automatically check and link this newly created product in the active Supplier form
      if (editingSupplier) {
        setEditingSupplier(prev => ({
          ...prev,
          suppliedProducts: prev.suppliedProducts ? [...new Set([...prev.suppliedProducts, prodName])] : [prodName]
        }));
      } else {
        setForm(prev => ({
          ...prev,
          suppliedProducts: prev.suppliedProducts ? [...new Set([...prev.suppliedProducts, prodName])] : [prodName]
        }));
      }

      setProductSuccessMsg(`✓ Product "${prodName}" saved and linked to supplier!`);
      setTimeout(() => setProductSuccessMsg(''), 4000);

      // Close ONLY Product modal and stay on active Supplier form
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

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      try {
        await deleteSupplier(id);
      } catch (err) {
        alert(err.message || 'Failed to delete supplier');
      }
    }
  };

  // Processed Suppliers with Live Financial Balances using Centralized Engine
  const { allSuppliers: processedSuppliers, totalPayables: totalPayablesAmount, settledCount: settledSuppliersCount } = useMemo(() => {
    return computeAllSuppliersFinancials(suppliers, purchases, paymentLogs, purchaseReturns);
  }, [suppliers, purchases, paymentLogs, purchaseReturns]);

  // Metrics
  const totalSuppliersCount = processedSuppliers.length;
  const activeSuppliersCount = processedSuppliers.filter(s => (s.status || 'Active') === 'Active').length;

  // Filtered Suppliers List
  const filteredSuppliers = processedSuppliers.filter(s => {
    // 1. Specific Supplier filter
    if (selectedSupplierFilter !== 'All' && s.id !== selectedSupplierFilter && s.name !== selectedSupplierFilter) {
      return false;
    }

    // 3. Product filter
    if (selectedProductFilter !== 'All') {
      const supplies = s.suppliedProducts || [];
      const suppliesIt = supplies.some(p => p.toLowerCase() === selectedProductFilter.toLowerCase());
      if (!suppliesIt) return false;
    }

    // 4. Status filter
    const bal = Number(s.balance) || 0;
    if (statusFilter === 'Payable' && bal <= 0) return false;
    if (statusFilter === 'Settled' && bal > 0) return false;

    return true;
  }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  const isAnyFilterActive = (
    selectedSupplierFilter !== 'All' ||
    selectedProductFilter !== 'All' ||
    statusFilter !== 'All'
  );

  const resetAllFilters = () => {
    setSelectedSupplierFilter('All');
    setSelectedProductFilter('All');
    setStatusFilter('All');
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-500" />
            <span>Suppliers</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Manage suppliers, supplied items, and pending payments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Print List Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            <Printer className="w-4 h-4" />
            <span>Print List</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Screen Only) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Suppliers */}
        <div
          onClick={() => { setStatusFilter('All'); setSelectedProductFilter('All'); setSelectedSupplierFilter('All'); }}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Total Suppliers</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
            {totalSuppliersCount}
          </div>
        </div>

        {/* 2. Outstanding Dues */}
        <div
          onClick={() => setStatusFilter('Payable')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-600" />
            <span>Outstanding Dues</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            Rs. {totalPayablesAmount.toLocaleString()}
          </div>
        </div>

        {/* 3. Settled Suppliers */}
        <div
          onClick={() => setStatusFilter('Settled')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settled Suppliers</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            {settledSuppliersCount}
          </div>
        </div>
      </div>

      {/* Unified Filter Toolbar: [Supplier] [Product] [Status] (Screen Only) */}
      <div className={`no-print p-3.5 sm:p-4 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2.5">
          {/* Supplier Selector */}
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
                <option key={s.id} value={s.id}>{s.name} ({s.city || 'Mandi'})</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
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

          {/* Status Filter */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Statuses</option>
              <option value="Payable">Due / Payable</option>
              <option value="Settled">Settled / Rs. 0</option>
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
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Supplier Directory & Payables Summary"
        filterSummary={`Status: ${statusFilter}`}
        stats={[
          { label: 'Total Suppliers', value: totalSuppliersCount },
          { label: 'Suppliers with Dues', value: (suppliers || []).filter(s => (Number(s.balance) || 0) > 0).length },
          { label: 'Supplier dues deducted', value: `Rs. ${totalPayablesAmount.toLocaleString()}` }
        ]}
      />

      {/* Table View */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">Supplier Firm</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Supplied Products</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <EmptyState
                      icon={UserCheck}
                      title="No suppliers found"
                      description="No supplier records match your current search and filter criteria."
                      action={
                        <button
                          type="button"
                          onClick={() => setShowAddModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-brand-600 hover:bg-brand-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add Supplier</span>
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(s => {
                  const bal = Number(s.balance) || 0;
                  const suppliedProds = s.suppliedProducts || [];
                  const isAct = (s.status || 'Active') === 'Active';

                  return (
                    <tr key={s.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">{s.name}</div>
                        {s.businessName && <div className="text-[11px] text-slate-400">{s.businessName}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold">{s.phone}</div>
                        <div className="text-[11px] text-slate-400">{s.city || 'Mandi'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-xs leading-relaxed">
                          {suppliedProds.length === 0 ? (
                            <span className="text-slate-400 italic">General</span>
                          ) : (
                            suppliedProds.slice(0, 3).map((prod, idx) => (
                              <span key={idx}>
                                {prod}{idx < Math.min(suppliedProds.length, 3) - 1 ? ', ' : ''}
                              </span>
                            ))
                          )}
                          {suppliedProds.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-bold ml-1">+{suppliedProds.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono">
                        <span className={bal > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                          Rs. {bal.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={bal > 0 ? 'Due' : 'Settled'} />
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Pay Supplier Action */}
                          {bal > 0 ? (
                            <button
                              onClick={() => handleOpenPayModal(s)}
                              className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                              title="Pay Supplier / Settle Liability"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Supplier</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3.5 h-3.5" /> Settled
                            </span>
                          )}

                          <button
                            onClick={() => setEditingSupplier({ ...s })}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                            title="Edit Supplier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      <PrintFooter note="Official Business Record • Ghalla Mandi Supplier Directory" />
      {/* ========================================================================= */}
      {/* 1. DETAILED ADD SUPPLIER MODAL (Compact 2-Column Grid - No Desktop Scroll) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Add New Supplier</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Register commodity vendor profile, bank details & supplied items</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Success Notification Banner */}
            {productSuccessMsg && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{productSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LEFT COLUMN: Vendor & Contact Details */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Supplier & Contact Info</span>
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
                        placeholder="e.g. Muhammad Aslam"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
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
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="03001234567"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Faisalabad, Multan"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="supplier@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                      placeholder="Shop #, Grain Market, Station Road..."
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Financial, Bank & Commodities */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Bank & Financial Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Meezan, HBL"
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
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
                        placeholder="Title of Account"
                        value={form.accountTitle}
                        onChange={(e) => setForm({ ...form, accountTitle: e.target.value })}
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
                        placeholder="PK36MEZN..."
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  {/* Searchable Combobox for Supplied Products */}
                  <SuppliedProductsCombobox
                    products={products}
                    selectedProducts={form.suppliedProducts}
                    onChange={(newSelection) => setForm({ ...form, suppliedProducts: newSelection })}
                    onAddNewProduct={() => setShowAddProductModal(true)}
                    theme={theme}
                  />

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Special Mandi terms, credit days, commission..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT SUPPLIER MODAL (Compact 2-Column Grid - No Desktop Scroll) */}
      {/* ========================================================================= */}
      {editingSupplier && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingSupplier(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Edit Supplier Profile</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Update vendor details, bank accounts and supplied commodities</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Success Notification Banner */}
            {productSuccessMsg && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{productSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LEFT COLUMN: Vendor & Contact Details */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Vendor & Contact Info</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Supplier / Contact Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingSupplier.name}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Business / Firm Name
                      </label>
                      <input
                        type="text"
                        value={editingSupplier.businessName || ''}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, businessName: e.target.value })}
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
                        value={editingSupplier.phone}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="03001234567"
                        value={editingSupplier.whatsapp || ''}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        City / Mandi
                      </label>
                      <input
                        type="text"
                        value={editingSupplier.city}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, city: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editingSupplier.email || ''}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
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
                      value={editingSupplier.address || ''}
                      onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Financial, Bank & Commodities */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Bank & Financial Details</span>
                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Meezan, HBL"
                        value={editingSupplier.bankName || ''}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, bankName: e.target.value })}
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
                        placeholder="Title of Account"
                        value={editingSupplier.accountTitle || ''}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, accountTitle: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Account # / IBAN
                      </label>
                      <input
                        type="text"
                        placeholder="PK36MEZN..."
                        value={editingSupplier.accountNumber || editingSupplier.iban || ''}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, accountNumber: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  {/* Searchable Combobox for Supplied Products */}
                  <SuppliedProductsCombobox
                    products={products}
                    selectedProducts={editingSupplier.suppliedProducts || []}
                    onChange={(newSelection) => setEditingSupplier({ ...editingSupplier, suppliedProducts: newSelection })}
                    onAddNewProduct={() => setShowAddProductModal(true)}
                    theme={theme}
                  />

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Notes(Optional)
                    </label>
                    <input
                      type="text"
                      value={editingSupplier.notes || ''}
                      onChange={(e) => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'Updating...' : 'Update Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW COMPLETE SUPPLIER PROFILE & TRANSACTION LEDGER MODAL */}
      {/* ========================================================================= */}
      {viewingSupplier && (() => {
        const fullSup = processedSuppliers.find(s => s.id === viewingSupplier.id) || viewingSupplier;
        const supPurchases = (purchases || []).filter(p => p.supplierId === fullSup.id || (p.supplier && p.supplier.trim().toLowerCase() === fullSup.name.trim().toLowerCase()) || (p.supplierName && p.supplierName.trim().toLowerCase() === fullSup.name.trim().toLowerCase()));
        const supPayments = (paymentLogs || []).filter(p => (p.type === 'Supplier' || p.partyType === 'Supplier') && (p.partyId === fullSup.id || (p.partyName && p.partyName.trim().toLowerCase() === fullSup.name.trim().toLowerCase())));
        const supReturns = (purchaseReturns || []).filter(r => r.supplierId === fullSup.id || (r.supplierName && r.supplierName.trim().toLowerCase() === fullSup.name.trim().toLowerCase()));

        const fin = computeSupplierKhataBalance(fullSup, purchases, paymentLogs, purchaseReturns);
        const totalPurchasesVal = Number(fin.totalPurchase ?? fin.grossPurchase ?? 0);
        const totalPaidVal = Number(fin.totalPaid ?? 0);
        const balanceDueVal = Number(fin.payableDue ?? 0);
        const isSettled = balanceDueVal === 0;

        // Chronological combined transactions
        const allTransactions = [
          ...supPurchases.map(p => {
            const pFin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
            return {
              id: `pur-${p.id}`,
              date: p.date || p.created_at || p.createdAt || '',
              type: 'Purchase',
              billNo: p.purchaseNo || p.billNumber || p.invoiceNo || `PUR-${p.id}`,
              amount: pFin.grossTotal,
              paid: pFin.paid,
              status: pFin.status,
              note: Array.isArray(p.cart || p.items) && (p.cart || p.items).length > 0
                ? (p.cart || p.items).map(i => `${i.name || 'Produce'} (${i.qty || 1} ${i.unitName || i.unit || 'KG'})`).join(', ')
                : (p.notes || p.note || 'Procurement Bill'),
              items: p.items || p.cart || []
            };
          }),
          ...supPayments.map(p => ({
            id: `pay-${p.id}`,
            date: p.date || p.created_at || p.createdAt || '',
            type: 'Payment',
            billNo: p.ref || `PAY-${p.id}`,
            amount: Number(p.amount || 0),
            paid: Number(p.amount || 0),
            status: 'Settled',
            mode: p.mode || p.paymentMode || 'Cash',
            note: p.note || (p.purchaseId ? `Payment for Bill #${p.purchaseId}` : 'Supplier Settlement Payment')
          })),
          ...supReturns.map(r => ({
            id: `ret-${r.id}`,
            date: r.date || r.created_at || r.createdAt || '',
            type: 'Return',
            billNo: r.returnNo || `PR-${r.id}`,
            amount: Number(r.refundAmount || r.totalRefund || 0),
            paid: Number(r.refundAmount || r.totalRefund || 0),
            status: 'Returned',
            note: r.reason || 'Purchase Return Credit'
          }))
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        const displayedTxs = viewingTab === 'all'
          ? allTransactions
          : viewingTab === 'purchases'
            ? allTransactions.filter(t => t.type === 'Purchase')
            : allTransactions.filter(t => t.type === 'Payment');

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setViewingSupplier(null); }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          >
            <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-5 border my-auto max-h-[90vh] overflow-y-auto shadow-2xl transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200/80 text-slate-900'
              }`}>

              {/* Top Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 via-brand-500 to-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-brand-500/20 ring-4 ring-brand-500/10">
                    {fullSup.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black tracking-tight">{fullSup.name}</h3>
                      {fullSup.businessName && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          • {fullSup.businessName}
                        </span>
                      )}
                      <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${isSettled
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                        }`}>
                        <span>•</span>
                        <span>{isSettled ? 'Settled' : 'Payable Due'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold flex-wrap">
                      {fullSup.phone && (
                        <a href={`tel:${fullSup.phone}`} className="flex items-center gap-1 hover:text-brand-500 font-mono transition">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{fullSup.phone}</span>
                        </a>
                      )}
                      {fullSup.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{fullSup.city}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        • Mandi Supplier ID: #{fullSup.id || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {balanceDueVal > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const supToPay = fullSup;
                        setViewingSupplier(null);
                        handleOpenPayModal(supToPay);
                      }}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl transition shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Supplier</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setViewingSupplier(null);
                      navigate(`/ledger?type=Supplier&partyId=${fullSup.id}`);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-2xl border transition cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    title="View in Master Ledger"
                  >
                    <BookOpen className="w-4 h-4 text-brand-500" />
                    <span className="hidden sm:inline">Ledger Statement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingSupplier(null)}
                    className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 3 Premium Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 1. Total Purchases */}
                <div className={`p-4 rounded-2xl border transition-all ${theme === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/80'
                  : 'bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 border-blue-100/90'
                  }`}>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Purchases</span>
                    <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                    Rs. {totalPurchasesVal.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {supPurchases.length} Inward Procurement Bill{supPurchases.length === 1 ? '' : 's'}
                  </div>
                </div>

                {/* 2. Total Paid Out */}
                <div className={`p-4 rounded-2xl border transition-all ${theme === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/80'
                  : 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 border-emerald-100/90'
                  }`}>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Paid Out</span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    Rs. {totalPaidVal.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {supPayments.length} Payment Settlement Record{supPayments.length === 1 ? '' : 's'}
                  </div>
                </div>

                {/* 3. Balance Due */}
                <div className={`p-4 rounded-2xl border transition-all ${balanceDueVal > 0
                  ? theme === 'dark' ? 'bg-rose-950/20 border-rose-800/60' : 'bg-gradient-to-br from-rose-50/80 via-white to-amber-50/30 border-rose-200'
                  : theme === 'dark' ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 border-slate-200'
                  }`}>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Remaining Balance</span>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${balanceDueVal > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                      {balanceDueVal > 0 ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${balanceDueVal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                    Rs. {balanceDueVal.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {balanceDueVal > 0 ? 'Pending Payable Liability' : '✓ Account Fully Settled'}
                  </div>
                </div>
              </div>

              {/* Modern Segmented Tabs */}
              <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center gap-1.5 ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100/90 border-slate-200/80'
                }`}>
                <button
                  type="button"
                  onClick={() => setViewingTab('all')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${viewingTab === 'all'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <span>All History</span>
                  <span className="text-[11px] font-bold opacity-80">
                    ({allTransactions.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTab('purchases')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${viewingTab === 'purchases'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <span>Purchases</span>
                  <span className="text-[11px] font-bold opacity-80">
                    ({supPurchases.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTab('payments')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${viewingTab === 'payments'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <span>Payments</span>
                  <span className="text-[11px] font-bold opacity-80">
                    ({supPayments.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTab('info')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${viewingTab === 'info'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Profile & Bank</span>
                </button>
              </div>

              {/* Tab 1, 2, 3: High-End Transactions Table */}
              {viewingTab !== 'info' && (
                <div className={`border rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700/80' : 'bg-white border-slate-200'}`}>
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-slate-800/90 backdrop-blur-md border-b border-slate-700 text-slate-400' : 'bg-slate-50/90 backdrop-blur-md border-b border-slate-200 text-slate-500'}`}>
                        <tr className="text-[10px] font-black uppercase tracking-wider">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Type / Ref</th>
                          <th className="py-3 px-4">Description / Note</th>
                          <th className="py-3 px-4 text-right">Bill (PKR)</th>
                          <th className="py-3 px-4 text-right">Paid Out (PKR)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        {displayedTxs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                                <FileText className="w-5 h-5" />
                              </div>
                              <span>No transaction records found for this view.</span>
                            </td>
                          </tr>
                        ) : (
                          displayedTxs.map((tx, idx) => (
                            <tr key={tx.id || idx} className={`transition ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'}`}>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{tx.date || '—'}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${tx.type === 'Purchase'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                  : tx.type === 'Payment'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                  }`}>
                                  {tx.type === 'Purchase' ? <ShoppingCart className="w-3 h-3" /> : tx.type === 'Payment' ? <CreditCard className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                                  <span>{tx.billNo}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-xs max-w-xs truncate">
                                <span className="font-semibold">{tx.note}</span>
                                {tx.mode && <span className="text-[10px] text-slate-400 block font-normal">Mode: {tx.mode}</span>}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                                {tx.type === 'Purchase' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                {tx.type === 'Payment' ? `Rs. ${tx.amount.toLocaleString()}` : (tx.paid > 0 ? `Rs. ${tx.paid.toLocaleString()}` : '—')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`text-xs font-bold uppercase ${tx.status === 'Paid' || tx.status === 'Settled'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : tx.status === 'Partial'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                  }`}>
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: 2-Column Profile & Bank Details Card */}
              {viewingTab === 'info' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column: Business & Mandi Details */}
                  <div className={`p-5 rounded-2xl space-y-3.5 border ${theme === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50/70 border-slate-200'
                    }`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-400">
                      <UserCheck className="w-4 h-4 text-brand-500" />
                      <span>Business & Contact Profile</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {fullSup.businessName && (
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Business / Shop:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{fullSup.businessName}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Phone:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{fullSup.phone || 'N/A'}</span>
                      </div>
                      {fullSup.whatsapp && (
                        <div className="flex justify-between items-center text-slate-500">
                          <span>WhatsApp:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fullSup.whatsapp}</span>
                        </div>
                      )}
                      {fullSup.email && (
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Email:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{fullSup.email}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Mandi City:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{fullSup.city || 'Local Mandi'}</span>
                      </div>
                      {fullSup.address && (
                        <div className="flex justify-between items-start text-slate-500">
                          <span>Address:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-xs">{fullSup.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Supplied Commodities */}
                    {(fullSup.suppliedProducts || []).length > 0 && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Supplied Commodities</span>
                        <div className="flex flex-wrap gap-1.5">
                          {fullSup.suppliedProducts.map((p, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-xl text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Verified Bank & Settlement Details */}
                  <div className={`p-5 rounded-2xl space-y-3.5 border ${theme === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50/70 border-slate-200'
                    }`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <Landmark className="w-4 h-4" />
                      <span>Bank & Settlement Accounts</span>
                    </div>

                    {fullSup.bankName || fullSup.accountNumber || fullSup.accountTitle || fullSup.iban ? (
                      <div className="space-y-3 text-xs">
                        {fullSup.bankName && (
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Bank Name:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{fullSup.bankName}</span>
                          </div>
                        )}
                        {fullSup.accountTitle && (
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Account Title:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{fullSup.accountTitle}</span>
                          </div>
                        )}
                        {(fullSup.accountNumber || fullSup.iban) && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Account Number / IBAN</span>
                            <div className="flex items-center justify-between font-mono font-black text-sm text-slate-900 dark:text-white">
                              <span>{fullSup.accountNumber || fullSup.iban}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <Landmark className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <span>No bank account recorded for this supplier.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. PAY SUPPLIER MODAL (Cash / Bank Settlement Drawer) */}
      {/* ========================================================================= */}
      {payingSupplier && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPayingSupplier(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Pay Supplier</h3>
                  <p className="text-[11px] text-slate-400 font-bold">Settle supplier payable liability</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingSupplier(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supplier Info Badge */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white">{payingSupplier.name}</span>
                <span className="text-[10px] font-bold text-slate-400">{payingSupplier.city || 'Local Mandi'}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 font-semibold">Outstanding Payable:</span>
                <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                  Rs. {Number(payingSupplier.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecuteSupplierPayment} className="space-y-3.5">
              {/* Payment Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400">Payment Amount (PKR) *</label>
                  {Number(payAmount || 0) === Number(payingSupplier.balance || 0) && Number(payingSupplier.balance || 0) > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Fully Settling</span>
                  ) : Number(payAmount || 0) > 0 ? (
                    <span className="text-[10px] font-bold text-amber-500">Partial Settlement</span>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    max={Math.max(0, Math.round(Number(payingSupplier.balance || 0))) > 0 ? Math.max(0, Math.round(Number(payingSupplier.balance || 0))) : undefined}
                    value={payAmount}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      const maxPayable = Math.max(0, Math.round(Number(payingSupplier?.balance || 0)));
                      if (raw === '') {
                        setPayAmount('');
                        return;
                      }
                      const num = parseInt(raw, 10) || 0;
                      if (maxPayable > 0 && num > maxPayable) {
                        setPayAmount(maxPayable.toString());
                      } else {
                        setPayAmount(num.toString());
                      }
                    }}
                    placeholder={`e.g. ${Math.round(Number(payingSupplier.balance || 0))}`}
                    autoFocus
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-brand-500 font-mono ${Number(payAmount || 0) >= Number(payingSupplier.balance || 0) && Number(payingSupplier.balance || 0) > 0
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                  <span className="text-slate-400">
                    {Number(payAmount || 0) > 0
                      ? `Remaining Payable after payment: Rs. ${Math.max(0, Number(payingSupplier.balance || 0) - Number(payAmount || 0)).toLocaleString()}`
                      : 'Enter amount to reduce supplier liability.'}
                  </span>
                  {Number(payingSupplier.balance || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(payingSupplier.balance.toString())}
                      className="text-brand-500 hover:underline font-bold cursor-pointer"
                    >
                      Pay Full (Rs. {Number(payingSupplier.balance).toLocaleString()})
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Mode Selector (Cash vs Bank vs Card) */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Payment Account / Mode *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'Bank', 'Card'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayMode(mode)}
                      className={`py-2 px-3 rounded-xl text-xs font-black transition border cursor-pointer ${payMode === mode
                        ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                    >
                      {mode === 'Bank' ? 'Bank Transfer' : mode === 'Cash' ? 'Cash in Hand' : 'Card'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              {/* Note / Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Note / Reference (Optional)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Paid via cheque #, cash voucher..."
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessingPay ? 'Recording...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. QUICK ADD NEW PRODUCT MODAL (Layered on top of Supplier dialog at z-[100]) */}
      {/* ========================================================================= */}
      {showAddProductModal && (
        <div
          onClick={(e) => {
            // Clicking backdrop closes ONLY this product modal, leaving supplier form open
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
                  <p className="text-[10px] text-slate-400 font-bold">Will automatically link to this supplier</p>
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
      {/* 5. QUICK ADD NEW CATEGORY MODAL (Layered on top of Product dialog at z-[110]) */}
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
    </div>
  );
};

export default Suppliers;
