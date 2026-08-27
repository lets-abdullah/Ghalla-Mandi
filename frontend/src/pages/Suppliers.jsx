import React, { useState, useEffect } from 'react';
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
  ShoppingCart
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';

export const Suppliers = () => {
  const { suppliers = [], products = [], purchases = [], addSupplier, updateSupplier, deleteSupplier } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // Filters & State
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const [search, setSearch] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('All');
  const [selectedProductFilter, setSelectedProductFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive' | 'Payable' | 'Settled'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for New Supplier
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

    if (form.phone.trim()) {
      const cleanDigits = form.phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        alert(t('phoneNumberValidationAlert'));
        return;
      }
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

    if (editingSupplier.phone.trim()) {
      const cleanDigits = editingSupplier.phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        alert(t('phoneNumberValidationAlert'));
        return;
      }
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
    // 1. Search filter
    const matchesSearch = 
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.businessName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.whatsapp || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.city || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Specific Supplier filter
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
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-500" />
            <span>Suppliers Directory</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Manage commodity suppliers, supplied product links, and payable balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className={`flex items-center p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-brand-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'card' ? 'bg-brand-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
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
            <span>+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => { setStatusFilter('All'); setSelectedProductFilter('All'); }}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Total Suppliers</span>
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
            {totalSuppliersCount}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            {activeSuppliersCount} Active Suppliers registered
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Payable')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-rose-600" />
            <span>Total Payable Balance</span>
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-rose-600 dark:text-rose-400">
            Rs. {totalPayablesAmount.toLocaleString()}
          </div>
          <div className="text-xs text-rose-700 dark:text-rose-400 font-medium mt-1">
            {suppliers.filter(s => (Number(s.balance) || 0) > 0).length} Suppliers with Pending Balances
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Settled')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settled / Nil Accounts</span>
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
            {suppliers.filter(s => (Number(s.balance) || 0) === 0).length}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">
            Zero Outstanding Accounts
          </div>
        </div>
      </div>

      {/* Unified Filter Toolbar: [Search] [Supplier] [Product] [Status] */}
      <div className={`p-4 rounded-2xl border card-shadow flex flex-col md:flex-row items-center justify-between gap-3 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, city, firm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto">
          {/* Supplier Selector */}
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="All">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.city || 'Mandi'})</option>
            ))}
          </select>

          {/* Product Filter */}
          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="All">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Payable">Due / Payable</option>
            <option value="Settled">Settled / Rs. 0</option>
          </select>
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
                  className={`p-5 rounded-2xl border card-shadow space-y-4 transition hover:border-brand-500/50 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                        {s.name}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAct ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
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
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-brand-400' : 'bg-brand-50 text-brand-700 border-brand-200'
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
        <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
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
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {suppliedProds.length === 0 ? (
                              <span className="text-slate-400 italic">General</span>
                            ) : (
                              suppliedProds.slice(0, 3).map((prod, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-brand-400' : 'bg-brand-50 text-brand-700 border-brand-200'
                                  }`}
                                >
                                  {prod}
                                </span>
                              ))
                            )}
                            {suppliedProds.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-bold">+{suppliedProds.length - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono">
                          <span className={bal > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                            Rs. {bal.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isAct ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                          }`}>
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
      {/* 1. DETAILED ADD SUPPLIER MODAL (2-Column Responsive Layout) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-2xl w-full p-6 space-y-4 card-shadow border my-6 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Add New Supplier</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Register commodity procurement vendor profile</p>
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {/* Row 1: Name & Business Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Supplier / Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Muhammad Aslam"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aslam Grain Traders"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Row 2: Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Row 3: City & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    City / Mandi
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Faisalabad, Sargodha, Chiniot"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="supplier@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Row 4: Address */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Full Address
                </label>
                <input
                  type="text"
                  placeholder="Shop #, Grain Market, Station Road..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Supplied Products Multi-Select Chips */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Supplied Products / Commodities
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border max-h-28 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                  {products.map(p => {
                    const isSelected = form.suppliedProducts.includes(p.name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProductSelection(p.name, false)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-brand-500 text-white shadow-xs'
                            : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Status & Opening Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Opening Payable Balance (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={form.openingBalance}
                    onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Account Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Notes */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Notes / Terms (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Special Mandi terms, credit days, commission details..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
      {/* 2. EDIT SUPPLIER MODAL */}
      {/* ========================================================================= */}
      {editingSupplier && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingSupplier(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-2xl w-full p-6 space-y-4 card-shadow border my-6 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Edit Supplier Profile</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Update vendor details and supplied commodities</p>
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

            <form onSubmit={handleUpdateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Supplier / Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.name}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.businessName || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, businessName: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.phone}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.whatsapp || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, whatsapp: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    City / Mandi
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.city}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingSupplier.email || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Full Address
                </label>
                <input
                  type="text"
                  value={editingSupplier.address || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Supplied Products Multi-Select Chips */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Supplied Products / Commodities
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border max-h-28 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                  {products.map(p => {
                    const isSelected = (editingSupplier.suppliedProducts || []).includes(p.name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProductSelection(p.name, true)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-brand-500 text-white shadow-xs'
                            : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Current Balance (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editingSupplier.balance || 0}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, balance: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    Account Status
                  </label>
                  <select
                    value={editingSupplier.status || 'Active'}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, status: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Notes / Terms (Optional)
                </label>
                <input
                  type="text"
                  value={editingSupplier.notes || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
      {viewingSupplier && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setViewingSupplier(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-xl w-full p-6 space-y-4 card-shadow border my-6 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-black text-base">
                  {viewingSupplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    {viewingSupplier.name}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (viewingSupplier.status || 'Active') === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                    }`}>
                      {viewingSupplier.status || 'Active'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">{viewingSupplier.businessName || 'Procurement Supplier'}</p>
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

            {/* Metrics overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Payable Balance</div>
                <div className={`text-lg font-black font-mono mt-0.5 ${(Number(viewingSupplier.balance) || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  Rs. {(Number(viewingSupplier.balance) || 0).toLocaleString()}
                </div>
              </div>

              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-400 uppercase">City / Location</div>
                <div className="text-sm font-extrabold mt-1 text-slate-800 dark:text-slate-200">
                  {viewingSupplier.city || 'Local Mandi'}
                </div>
              </div>
            </div>

            {/* Profile Contact Details */}
            <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'}`}>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Phone Number:</span>
                <span className="font-mono font-bold">{viewingSupplier.phone}</span>
              </div>
              {viewingSupplier.whatsapp && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">WhatsApp:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{viewingSupplier.whatsapp}</span>
                </div>
              )}
              {viewingSupplier.email && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Email:</span>
                  <span className="font-bold">{viewingSupplier.email}</span>
                </div>
              )}
              {viewingSupplier.address && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Address:</span>
                  <span className="font-bold text-right max-w-xs">{viewingSupplier.address}</span>
                </div>
              )}
              {viewingSupplier.notes && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Notes:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300 text-right max-w-xs">{viewingSupplier.notes}</span>
                </div>
              )}
            </div>

            {/* Supplied Commodities */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Supplied Commodities:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(viewingSupplier.suppliedProducts || []).length === 0 ? (
                  <span className="text-xs text-slate-400 italic">All general grains & commodities</span>
                ) : (
                  (viewingSupplier.suppliedProducts || []).map((prod, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-brand-400' : 'bg-brand-50 text-brand-700 border-brand-200'
                      }`}
                    >
                      {prod}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Linking: Ledger, Purchase, Invoices */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  setViewingSupplier(null);
                  navigate(`/ledger?type=Supplier&customerId=${viewingSupplier.id}`);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                <span>View Khata</span>
              </button>

              <button
                onClick={() => {
                  setViewingSupplier(null);
                  navigate('/purchases');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
                <span>New Purchase</span>
              </button>

              <button
                onClick={() => {
                  setViewingSupplier(null);
                  navigate('/invoices?type=purchases');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                <span>Invoices</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
