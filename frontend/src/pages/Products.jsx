import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, Barcode, Edit3, Trash2, AlertTriangle, FolderPlus, X, Image as ImageIcon, Upload, Printer, FileSpreadsheet, Coins, TrendingUp, History } from 'lucide-react';
import { useERP, computeProductValuation } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';
import { ProductHistory } from './ProductHistory';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const Products = () => {
  const toast = useToast();
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, purchases = [], sales = [], saleReturns = [], purchaseReturns = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingHistoryProduct, setViewingHistoryProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Keyboard Esc Listener for closing active modals or history view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (viewingHistoryProduct) setViewingHistoryProduct(null);
        else if (showAddCategoryModal) setShowAddCategoryModal(false);
        else if (showAddModal) setShowAddModal(false);
        else if (editingProduct) setEditingProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddCategoryModal, showAddModal, editingProduct, viewingHistoryProduct]);

  // New Category Form State
  const [newCatData, setNewCatData] = useState({
    name: '',
    description: ''
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: categories[0]?.name || '',
    code: '',
    unit: 'KG',
    stockQty: 0,
    minStock: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    image: ''
  });

  // Handle Quick Category Creation from Products Page
  const handleCreateCategorySubmit = async (e) => {
    e.preventDefault();
    const catName = newCatData.name.trim();

    if (!catName) {
      toast.warning((t('categoryName') || 'Category name') + ' ' + (t('required') || 'is required'));
      return;
    }

    const exists = categories.some(c => c.name.toLowerCase() === catName.toLowerCase());
    if (exists) {
      toast.warning(`Category "${catName}" already exists.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const createdCat = await addCategory({
        name: catName,
        description: newCatData.description.trim() || 'Custom commodity category'
      });

      if (showAddModal) {
        setNewProduct(prev => ({ ...prev, category: createdCat?.name || catName }));
      }
      if (editingProduct) {
        setEditingProduct(prev => ({ ...prev, category: createdCat?.name || catName }));
      }

      toast.success(`Category "${catName}" created!`);
      setNewCatData({ name: '', description: '' });
      setShowAddCategoryModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim()) {
      toast.warning((t('productName') || 'Product name') + ' ' + (t('required') || 'is required'));
      return;
    }
    if (!newProduct.category) {
      toast.warning(t('selectCategory') || 'Please select a category');
      return;
    }
    if (Number(newProduct.purchasePrice) < 0) {
      toast.warning(t('purchasePrice') + ' ' + t('sellingRateNegativeAlert'));
      return;
    }
    if (Number(newProduct.sellingPrice) < 0) {
      toast.warning(t('sellingRateNegativeAlert') || 'Selling price cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      await addProduct({
        ...newProduct,
        purchasePrice: Math.max(0, Number(newProduct.purchasePrice) || 0),
        sellingPrice: Math.max(0, Number(newProduct.sellingPrice) || 0),
        stockQty: Math.max(0, Number(newProduct.stockQty) || 0),
        minStock: Math.max(0, Number(newProduct.minStock) || 0)
      });
      toast.success(`Product "${newProduct.name.trim()}" created successfully!`);
      setShowAddModal(false);
      setNewProduct({
        name: '',
        category: categories[0]?.name || '',
        code: '',
        unit: 'KG',
        stockQty: 0,
        minStock: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        image: ''
      });
    } catch (err) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) {
      toast.warning((t('productName') || 'Product name') + ' ' + (t('required') || 'is required'));
      return;
    }
    if (!editingProduct.category) {
      toast.warning(t('selectCategory') || 'Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProduct(editingProduct.id, {
        name: editingProduct.name.trim(),
        category: editingProduct.category,
        code: editingProduct.code,
        unit: editingProduct.unit || editingProduct.baseUnit || 'KG',
        purchasePrice: Math.max(0, Number(editingProduct.purchasePrice ?? editingProduct.purchaseprice) || 0),
        sellingPrice: Math.max(0, Number(editingProduct.sellingPrice ?? editingProduct.sellingprice) || 0),
        stockQty: Math.max(0, Number(editingProduct.stockQty ?? editingProduct.stockqty) || 0),
        minStock: Math.max(0, Number(editingProduct.minStock ?? editingProduct.minstock) || 0),
        image: editingProduct.image || ''
      });
      toast.success(`Product "${editingProduct.name.trim()}" updated successfully!`);
      setEditingProduct(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (viewingHistoryProduct) {
    return (
      <ProductHistory
        product={viewingHistoryProduct}
        onBack={() => setViewingHistoryProduct(null)}
      />
    );
  }

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-500" />
            {t('productsCatalog')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('productsCatalogSub')}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print List</span>
          </button>

          <button
            onClick={() => setShowAddCategoryModal(true)}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <FolderPlus className="w-4 h-4 text-emerald-600" />
            <span>{t('addCategory')}</span>
          </button>

          <button
            onClick={() => {
              if (categories.length > 0 && !newProduct.category) {
                setNewProduct(prev => ({ ...prev, category: categories[0].name }));
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/25 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addProduct')}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (Screen Only) */}
      <div className={`no-print border rounded-2xl p-4 card-shadow flex flex-col md:flex-row gap-4 justify-between items-center transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchCommoditiesPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold">{t('category')}:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
          >
            <option value="All">{t('allCategories')}</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Commodities & Products Catalog"
        filterSummary={`Category: ${categoryFilter}`}
        stats={[
          { label: 'Total Products', value: (products || []).length },
          { label: 'Matching Search/Filter', value: filtered.length }
        ]}
      />

      {/* Product Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">Image</th>
                <th className="py-3 px-4">Item / Produce</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <EmptyState
                      icon={Package}
                      title={t('noProductsMatch') || 'No products found'}
                      description="Try searching with a different commodity name or clear category filter."
                      action={
                        <button
                          type="button"
                          onClick={() => setShowAddModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-brand-600 hover:bg-brand-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add Product</span>
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(product => {
                  const val = computeProductValuation(product, purchases, sales, saleReturns, purchaseReturns);
                  const isLowStock = val.qty <= (product.minStock || 1000);
                  const sellingRate = Number(product.sellingPrice ?? product.sellingprice ?? val.sellingRate ?? 0);
                  const unit = product.unit || product.baseUnit || t('kg');

                  return (
                    <tr key={product.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                      }`}>
                      <td className="py-3 px-4">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <div>{product.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {val.activeBatches?.length || 0} active purchase {val.activeBatches?.length === 1 ? 'batch' : 'batches'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        <div>{product.code}</div>
                        <div className="text-[10px] flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-400" /> {product.barcode || product.code}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          <span className={`font-extrabold text-xs ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isLowStock && <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
                            {val.qty.toLocaleString()} {unit}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono">
                          Value: Rs. {val.stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="font-black text-slate-700 dark:text-slate-200">
                          Avg: Rs. {val.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {unit}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          Latest: Rs. {(val.latestPurchaseRate || val.avgCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-brand-500 font-extrabold font-mono">
                        Rs. {sellingRate.toLocaleString()} / {unit}
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Full Product History & FIFO Valuation */}
                          <button
                            onClick={() => setViewingHistoryProduct(product)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition font-extrabold text-xs shadow-2xs cursor-pointer active:scale-95"
                            title="View Full Product History, Batches & Valuation"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>
                          <button
                            onClick={() => setEditingProduct(product)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-brand-400' : 'hover:bg-slate-100 text-slate-600 hover:text-brand-600'
                              }`}
                            title={t('editProduct')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingProductId(product.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition cursor-pointer"
                            title={t('delete')}
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
      <PrintFooter note="Official Business Record • Ghalla Mandi Product Catalog" />

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('addProduct')}</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              {/* Image Upload Input & Preview */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('productImage')}</label>
                <div className="flex items-center gap-3">
                  {newProduct.image ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-slate-100">
                      <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewProduct({ ...newProduct, image: '' })}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition cursor-pointer"
                        title={t('delete')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <label className={`flex-1 cursor-pointer border rounded-xl py-2.5 px-3 text-center text-xs font-bold transition flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}>
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{newProduct.image ? t('edit') : t('optional')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewProduct(prev => ({ ...prev, image: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('productName')} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Super Kernel Basmati"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400">{t('category')} *</label>
                  </div>
                  <select
                    value={newProduct.category}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW_CATEGORY__') {
                        setShowAddCategoryModal(true);
                      } else {
                        setNewProduct({ ...newProduct, category: e.target.value });
                      }
                    }}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                  >
                    {categories.length === 0 ? (
                      <option value="">{t('selectCategory')}</option>
                    ) : (
                      categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    )}
                    <option value="__ADD_NEW_CATEGORY__" className="font-bold text-brand-500">
                      + {t('addCategory')}...
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('unit')}</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                  >
                    <option value="KG">KG (Kilogram)</option>
                    <option value="Gram">Gram (g)</option>
                    <option value="Litre">Litre (L)</option>
                    <option value="ML">ML (Millilitre)</option>
                    <option value="Meter">Meter (m)</option>
                    <option value="Piece">Piece (pc)</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('initialStock')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={newProduct.stockQty}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQty: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('minStockThreshold')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('purchasePrice')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    value={newProduct.purchasePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, purchasePrice: e.target.value.replace(/[^0-9]/g, '') })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('sellingPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    value={newProduct.sellingPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value.replace(/[^0-9]/g, '') })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingProduct(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('editProduct')} — {editingProduct.name}</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="space-y-3">
              {/* Image Upload Input & Preview for Editing */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('productImage')}</label>
                <div className="flex items-center gap-3">
                  {editingProduct.image ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-slate-100">
                      <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition cursor-pointer"
                        title={t('delete')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <label className={`flex-1 cursor-pointer border rounded-xl py-2.5 px-3 text-center text-xs font-bold transition flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}>
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{editingProduct.image ? t('edit') : t('optional')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingProduct(prev => ({ ...prev, image: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('productName')}</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400">{t('category')}</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[11px] font-extrabold text-brand-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> {t('add')}
                    </button>
                  </div>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW_CATEGORY__') {
                        setShowAddCategoryModal(true);
                      } else {
                        setEditingProduct({ ...editingProduct, category: e.target.value });
                      }
                    }}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="__ADD_NEW_CATEGORY__" className="font-bold text-brand-500">
                      + {t('addCategory')}...
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('unit')}</label>
                  <select
                    value={editingProduct.unit || 'KG'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                  >
                    <option value="KG">KG (Kilogram)</option>
                    <option value="Gram">Gram (g)</option>
                    <option value="Litre">Litre (L)</option>
                    <option value="ML">ML (Millilitre)</option>
                    <option value="Meter">Meter (m)</option>
                    <option value="Piece">Piece (pc)</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('purchasePrice')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    value={editingProduct.purchasePrice ?? editingProduct.purchaseprice ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, purchasePrice: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('sellingPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    value={editingProduct.sellingPrice ?? editingProduct.sellingprice ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('currentStock')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={editingProduct.stockQty ?? editingProduct.stockqty ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQty: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('minStockThreshold')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.target.blur()}
                    onFocus={(e) => e.target.select()}
                    value={editingProduct.minStock ?? editingProduct.minstock ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal (Quick Drawer/Modal on Products Page) */}
      {showAddCategoryModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddCategoryModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-extrabold">{t('addCategory')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {t('categoryName')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pulses, Grains"
                  value={newCatData.name}
                  onChange={(e) => setNewCatData({ ...newCatData, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {t('categoryDescription')} ({t('optional')})
                </label>
                <textarea
                  rows={2}
                  placeholder="Description..."
                  value={newCatData.description}
                  onChange={(e) => setNewCatData({ ...newCatData, description: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deletingProductId)}
        title="Delete Item / Produce"
        message="Are you sure you want to delete this commodity product? All associated records will be removed."
        confirmLabel="Delete Item"
        onConfirm={async () => {
          if (!deletingProductId) return;
          try {
            await deleteProduct(deletingProductId);
            toast.success('Product deleted successfully.');
          } catch (err) {
            toast.error(err.message || 'Error deleting product');
          } finally {
            setDeletingProductId(null);
          }
        }}
        onCancel={() => setDeletingProductId(null)}
      />
    </div>
  );
};

export default Products;
