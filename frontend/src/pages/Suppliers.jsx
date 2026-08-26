import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Plus, Phone, MapPin, Edit3, Trash2, CheckCircle2, DollarSign, Check, X, ChevronDown } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';

export const Suppliers = () => {
  const { suppliers, products, addSupplier, updateSupplier, deleteSupplier } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState('All'); // 'All' | 'Payable' | 'Settled'
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [prodSearch, setProdSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form for New Supplier
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    openingBalance: 0,
    suppliedProducts: []
  });

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        else if (editingSupplier) setEditingSupplier(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingSupplier]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert(t('supplierFirmName') + ' ' + t('required'));
      return;
    }

    if (form.phone.trim()) {
      const cleanDigits = form.phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        alert(t('phoneNumberValidationAlert'));
        return;
      }
    }

    try {
      await addSupplier({
        name: form.name.trim(),
        phone: form.phone.trim() || 'N/A',
        city: form.city.trim() || 'Local Mandi',
        openingBalance: Math.max(0, Number(form.openingBalance) || 0),
        suppliedProducts: form.suppliedProducts
      });

      setShowAddModal(false);
      setForm({
        name: '',
        phone: '',
        city: '',
        openingBalance: 0,
        suppliedProducts: []
      });
    } catch (err) {
      alert(err.message || 'Failed to create supplier');
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;

    if (editingSupplier.phone.trim()) {
      const cleanDigits = editingSupplier.phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        alert(t('phoneNumberValidationAlert'));
        return;
      }
    }

    try {
      await updateSupplier(editingSupplier.id, {
        name: editingSupplier.name.trim(),
        phone: editingSupplier.phone.trim() || 'N/A',
        city: editingSupplier.city.trim() || 'Local Mandi',
        balance: Math.max(0, Number(editingSupplier.balance) || 0),
        suppliedProducts: editingSupplier.suppliedProducts || []
      });

      setEditingSupplier(null);
    } catch (err) {
      alert(err.message || 'Failed to update supplier');
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
      const current = form.suppliedProducts;
      const updated = current.includes(prodName)
        ? current.filter(p => p !== prodName)
        : [...current, prodName];
      setForm({ ...form, suppliedProducts: updated });
    }
  };

  const totalSuppliersCount = suppliers.length;
  const totalPayablesAmount = suppliers.reduce((acc, s) => acc + Math.max(0, s.balance), 0);

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase());

    if (filterType === 'All') return matchesSearch;
    if (filterType === 'Payable') return matchesSearch && s.balance > 0;
    if (filterType === 'Settled') return matchesSearch && s.balance === 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-500" />
            {t('Suppliers List')}
          </h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewSupplier')}</span>
        </button>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterType('All')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80 text-slate-800'
          }`}
          title="Click to view all suppliers"
        >
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-blue-600" /> {t('Total Suppliers')}
          </div>
          <div className="text-2xl font-extrabold mt-1 font-mono text-blue-600 dark:text-blue-400">{totalSuppliersCount}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-1">{t('suppliers')} • View All</div>
        </div>

        <div
          onClick={() => setFilterType('Payable')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80 text-slate-800'
          }`}
          title="Click to filter suppliers with unpaid balance"
        >
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-rose-600" /> {t('Amount To Pay')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-rose-600 dark:text-rose-400 font-mono">Rs. {(Number(totalPayablesAmount) || 0).toLocaleString()}</div>
          <div className="text-xs text-rose-700 dark:text-rose-400 font-bold mt-1">{t('pending')} • Filter Unpaid</div>
        </div>

        <div
          onClick={() => setFilterType('Settled')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80 text-slate-800'
          }`}
          title="Click to filter settled supplier accounts"
        >
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t('settledAccounts')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
            {suppliers.filter(s => (Number(s.balance) || 0) === 0).length}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">{t('zeroBalance')} • Filter Settled</div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className={`border rounded-2xl p-4 card-shadow flex flex-col md:flex-row items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Payable', 'Settled'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${filterType === type
                ? 'bg-brand-500 text-white shadow-sm'
                : theme === 'dark' ? 'bg-slate-900 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {type === 'All' ? t('allSuppliers') : type === 'Payable' ? t('amountToPay') : t('settledAccounts')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchSupplierPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
          />
        </div>
      </div>

      {/* Supplier Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs font-medium">
            {t('noSupplierFound')}
          </div>
        ) : (
          filteredSuppliers.map(supplier => (
            <div
              key={supplier.id}
              className={`border rounded-2xl p-5 card-shadow flex flex-col justify-between space-y-4 transition ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight">{supplier.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-brand-500" /> {supplier.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingSupplier(supplier)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      title={t('edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`${t('delete')} ${supplier.name}?`)) {
                          deleteSupplier(supplier.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition cursor-pointer"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-1 pt-1">
                    {(supplier.suppliedProducts || []).map((prod, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-md font-bold text-[10px]">
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{t('payableBalance')}</div>
                  <div className={`text-base font-extrabold ${Number(supplier.balance || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                    Rs. {(Number(supplier.balance) || 0).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/ledger')}
                  className="px-3 py-1.5 text-xs font-extrabold text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 rounded-xl transition cursor-pointer"
                >
                  {t('viewLedger')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('addNewSupplier')}</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('supplierFirmName')} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sargodha Traders"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('phoneMobile')}</label>
                  <input
                    type="tel"
                    placeholder="03001234567"
                    maxLength={11}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('mandiLocationCity')}</label>
                  <input
                    type="text"
                    placeholder="e.g. Sargodha"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* Searchable Multiselect Dropdown */}
              <div className="relative">
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('selectSuppliedCommodities')} *</label>

                {/* Select Box Trigger */}
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-between cursor-pointer transition select-none ${isDropdownOpen ? 'border-brand-500 ring-2 ring-brand-500/20' : ''
                    } ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                    {form.suppliedProducts.length === 0 ? (
                      <span className="text-slate-400 font-normal">-- {t('selectProduct')} --</span>
                    ) : (
                      form.suppliedProducts.map(pName => (
                        <span key={pName} className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-brand-500 text-white flex items-center gap-1">
                          {pName}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProductSelection(pName);
                            }}
                            className="hover:text-rose-200 text-white/80 cursor-pointer text-xs"
                          >
                            ×
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown Menu Overlay */}
                {isDropdownOpen && (
                  <div className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border card-shadow overflow-hidden p-2 space-y-1.5 animate-in fade-in-50 zoom-in-95 duration-150 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        placeholder={t('searchCommoditiesPlaceholder')}
                        value={prodSearch}
                        onChange={(e) => setProdSearch(e.target.value)}
                        className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                      {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase())).length === 0 ? (
                        <div className="py-3 text-center text-xs text-slate-400">
                          {t('noProductsMatch')}
                        </div>
                      ) : (
                        products
                          .filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()))
                          .map(p => {
                            const isSelected = form.suppliedProducts.includes(p.name);
                            return (
                              <div
                                key={p.id}
                                onClick={() => toggleProductSelection(p.name)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center justify-between ${isSelected
                                  ? 'bg-brand-500 text-white'
                                  : theme === 'dark' ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-white text-brand-500 border-white' : 'border-slate-400'
                                    }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span>{p.name} ({p.category})</span>
                                </div>
                                <span className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                  Rs. {p.sellingPrice} / {p.unit || t('kg')}
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
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
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {t('saveSupplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingSupplier(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('editSupplier')}</h3>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('supplierFirmName')}</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('phoneMobile')}</label>
                  <input
                    type="tel"
                    placeholder="03001234567"
                    maxLength={11}
                    value={editingSupplier.phone}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('mandiLocationCity')}</label>
                  <input
                    type="text"
                    value={editingSupplier.city}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('payableBalance')} (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={editingSupplier.balance}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, balance: Number(e.target.value) })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
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
    </div>
  );
};

export default Suppliers;
