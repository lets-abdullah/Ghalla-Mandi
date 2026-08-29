import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';

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
        className={`w-full border rounded-xl p-2 min-h-[38px] flex flex-wrap items-center gap-1.5 transition cursor-text ${
          theme === 'dark' 
            ? 'bg-slate-900 border-slate-700 text-white focus-within:border-brand-500' 
            : 'bg-slate-50 border-slate-200 text-slate-800 focus-within:border-brand-500'
        }`}
      >
        {/* Selected Product Badges */}
        {safeSelected.map(name => (
          <span
            key={name}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold select-none border ${
              theme === 'dark'
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
        <div className={`p-2.5 rounded-2xl border space-y-1.5 shadow-sm ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
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
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer select-none border ${
                      isSelected
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
  const { suppliers = [], products = [], categories = [], purchases = [], addSupplier, updateSupplier, deleteSupplier, addProduct, addCategory } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // Filters & State
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('All');
  const [selectedProductFilter, setSelectedProductFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive' | 'Payable' | 'Settled'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    status: 'Active',
    notes: ''
  });

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        else if (editingSupplier) setEditingSupplier(null);
        else if (viewingSupplier) setViewingSupplier(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingSupplier, viewingSupplier]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Supplier Name is required.');
      return;
    }

    if (form.phone.trim() && form.phone.replace(/\D/g, '').length !== 11) {
      alert('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }
    if (form.whatsapp.trim() && form.whatsapp.replace(/\D/g, '').length !== 11) {
      alert('WhatsApp number must be exactly 11 digits (e.g. 03001234567)');
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
        status: form.status || 'Active',
        notes: form.notes.trim()
      });

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
        status: 'Active',
        notes: ''
      });
    } catch (err) {
      alert(err.message || 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;

    if (editingSupplier.phone && editingSupplier.phone !== 'N/A' && editingSupplier.phone.replace(/\D/g, '').length !== 11) {
      alert('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }
    if (editingSupplier.whatsapp && editingSupplier.whatsapp.replace(/\D/g, '').length !== 11) {
      alert('WhatsApp number must be exactly 11 digits (e.g. 03001234567)');
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
        status: editingSupplier.status || 'Active',
        notes: editingSupplier.notes?.trim() || ''
      });

      setEditingSupplier(null);
    } catch (err) {
      alert(err.message || 'Failed to update supplier');
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

  // Metrics
  const totalSuppliersCount = suppliers.length;
  const totalPayablesAmount = suppliers.reduce((acc, s) => acc + Math.max(0, Number(s.balance) || 0), 0);
  const activeSuppliersCount = suppliers.filter(s => (s.status || 'Active') === 'Active').length;

  // Filtered Suppliers List
  const filteredSuppliers = suppliers.filter(s => {
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
    const isAct = (s.status || 'Active') === 'Active';

    if (statusFilter === 'Active' && !isAct) return false;
    if (statusFilter === 'Inactive' && isAct) return false;
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          {/* View Mode Toggle */}
          <div className={`flex items-center p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${viewMode === 'table' ? 'bg-brand-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${viewMode === 'card' ? 'bg-brand-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <div
          onClick={() => setStatusFilter('Payable')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-600" />
            <span>Total Payable Balance</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            Rs. {totalPayablesAmount.toLocaleString()}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Settled')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settled</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            {suppliers.filter(s => (Number(s.balance) || 0) === 0).length}
          </div>
        </div>
      </div>

      {/* Unified Filter Toolbar: [Supplier] [Product] [Status] */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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

      {/* Main Content: Table View vs Card View */}
      {viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No suppliers found matching the criteria.
            </div>
          ) : (
            filteredSuppliers.map(s => {
              const bal = Number(s.balance) || 0;
              const isAct = (s.status || 'Active') === 'Active';
              const suppliedProds = s.suppliedProducts || [];

              return (
                <div
                  key={s.id}
                  className={`p-5 rounded-2xl border card-shadow space-y-4 transition hover:border-brand-500/50 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                        {s.name}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAct ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                          }`}>
                          {isAct ? 'Active' : 'Inactive'}
                        </span>
                      </h3>
                      {s.businessName && (
                        <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {s.businessName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Balance</div>
                      <div className={`font-mono font-black text-sm ${bal > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        Rs. {bal.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{s.phone}</span>
                      {s.whatsapp && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                          WA: {s.whatsapp}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.city || 'Local Mandi'}{s.address ? ` — ${s.address}` : ''}</span>
                    </div>
                  </div>

                  {/* Supplied Products Chips */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Supplied Products:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {suppliedProds.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">All general commodities</span>
                      ) : (
                        suppliedProds.map((prod, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-brand-400' : 'bg-brand-50 text-brand-700 border-brand-200'
                              }`}
                          >
                            {prod}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingSupplier(s)}
                      className="px-2.5 py-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white transition text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Profile</span>
                    </button>

                    <div className="flex items-center gap-1">
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
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View */
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
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => {
                    const bal = Number(s.balance) || 0;
                    const isAct = (s.status || 'Active') === 'Active';
                    const suppliedProds = s.suppliedProducts || [];

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
                          <span className={`font-bold text-xs ${isAct ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {isAct ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingSupplier(s)}
                              className="px-2.5 py-1 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white transition text-xs font-bold cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => setEditingSupplier({ ...s })}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition cursor-pointer"
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
      )}
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
                        Business / Firm Name
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
                        City / Mandi Location
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
                        Email Address (Optional)
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Opening Balance (PKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={form.openingBalance}
                        onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Account Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
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
                        Account # / IBAN
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
                      Notes / Terms (Optional)
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Current Balance (PKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editingSupplier.balance || 0}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, balance: Number(e.target.value) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Account Status
                      </label>
                      <select
                        value={editingSupplier.status || 'Active'}
                        onChange={(e) => setEditingSupplier({ ...editingSupplier, status: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
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
                      Notes / Terms (Optional)
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
      {/* 3. VIEW COMPLETE SUPPLIER PROFILE MODAL */}
      {/* ========================================================================= */}
      {viewingSupplier && (() => {
        const supplierPurchases = (purchases || []).filter(p => p.supplier === viewingSupplier.name || p.supplierId === viewingSupplier.id);
        const totalPurchases = supplierPurchases.reduce((acc, p) => acc + Number(p.amount || p.grandTotal || 0), 0);
        
        const supplierPayments = (paymentLogs || []).filter(p => (p.type === 'Supplier' || p.partyType === 'Supplier') && (p.partyId === viewingSupplier.id || p.partyName === viewingSupplier.name));
        const totalPaidLogs = supplierPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const directPaidPurchases = supplierPurchases.reduce((acc, p) => acc + Number(p.paidAmount || (p.status === 'Paid' ? (p.amount || p.grandTotal) : 0)), 0);
        const totalPaid = totalPaidLogs + directPaidPurchases;
        const balance = Number(viewingSupplier.balance !== undefined ? viewingSupplier.balance : Math.max(0, totalPurchases - totalPaid));

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setViewingSupplier(null); }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              {/* Profile Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">{viewingSupplier.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                        Supplier
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Status: {viewingSupplier.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingSupplier(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className={`p-3 rounded-2xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Purchases</div>
                  <div className="font-mono font-extrabold text-xs text-slate-900 dark:text-white mt-0.5">
                    Rs. {totalPurchases.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</div>
                  <div className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Rs. {totalPaid.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Khata Balance</div>
                  <div className={`font-mono font-extrabold text-xs mt-0.5 ${balance > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    Rs. {balance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Contact & Business Info Details */}
              <div className={`p-4 rounded-2xl space-y-2.5 border text-xs ${
                theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
              }`}>
                {viewingSupplier.businessName && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Business / Shop:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{viewingSupplier.businessName}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-500">
                  <span>Phone Number:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingSupplier.phone || '-'}</span>
                </div>

                {viewingSupplier.whatsapp && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>WhatsApp:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingSupplier.whatsapp}</span>
                  </div>
                )}

                {viewingSupplier.email && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Email:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{viewingSupplier.email}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-500">
                  <span>City / Mandi:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{viewingSupplier.city || 'Local Mandi'}</span>
                </div>

                {viewingSupplier.address && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Address:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingSupplier.address}</span>
                  </div>
                )}

                {(viewingSupplier.suppliedProducts || []).length > 0 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Supplied Products:</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400">
                      {viewingSupplier.suppliedProducts.join(', ')}
                    </span>
                  </div>
                )}

                {(viewingSupplier.bankName || viewingSupplier.accountNumber || viewingSupplier.accountTitle) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Landmark className="w-3 h-3" />
                      <span>Bank Account Details</span>
                    </div>
                    {viewingSupplier.bankName && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Bank Name:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{viewingSupplier.bankName}</span>
                      </div>
                    )}
                    {viewingSupplier.accountTitle && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Account Title:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{viewingSupplier.accountTitle}</span>
                      </div>
                    )}
                    {(viewingSupplier.accountNumber || viewingSupplier.iban) && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Account # / IBAN:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingSupplier.accountNumber || viewingSupplier.iban}</span>
                      </div>
                    )}
                  </div>
                )}

                {viewingSupplier.notes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-400 italic">
                    Note: {viewingSupplier.notes}
                  </div>
                )}
              </div>

              {/* Action Jump Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setViewingSupplier(null);
                    navigate(`/ledger?type=Supplier&customerId=${viewingSupplier.id}`);
                  }}
                  className="py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View Ledger</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingSupplier(null);
                    navigate(`/ledger?type=Supplier&customerId=${viewingSupplier.id}`);
                  }}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>View Khata</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                    <option value="Maund">Maund (Mann - 40 KG)</option>
                    <option value="Bag">Bag (Bori - 50 KG)</option>
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
                    step="any"
                    placeholder="0"
                    value={newProductForm.purchasePrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, purchasePrice: e.target.value })}
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
                    step="any"
                    placeholder="0"
                    value={newProductForm.sellingPrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sellingPrice: e.target.value })}
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
