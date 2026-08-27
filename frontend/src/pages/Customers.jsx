import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  User, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2,
  CheckCircle2, 
  DollarSign, 
  X, 
  Eye, 
  BookOpen, 
  CreditCard,
  Building2,
  RefreshCw,
  ShieldCheck,
  LayoutGrid,
  List,
  Mail,
  FileText,
  Landmark,
  Hash
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';

export const Customers = () => {
  const { customers = [], sales = [], addCustomer, updateCustomer, deleteCustomer } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // View Mode: 'table' | 'card'
  const [viewMode, setViewMode] = useState('table');

  // Filters State
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [balanceFilter, setBalanceFilter] = useState('All'); // 'All' | 'Due' | 'Paid'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  // Form state for New Regular Customer with Bank Details
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    address: '',
    customerType: 'Regular Customer',
    openingBalance: 0,
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
        else if (editingCustomer) setEditingCustomer(null);
        else if (viewingCustomer) setViewingCustomer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingCustomer, viewingCustomer]);

  // Aggregate stats
  const totalCustomers = customers.length;
  const regularCount = customers.filter(c => {
    const type = (c.customerType || '').toLowerCase();
    return type.includes('regular') || !type.includes('walk-in');
  }).length;
  const walkinCount = customers.filter(c => (c.customerType || '').toLowerCase().includes('walk-in')).length;
  const totalReceivables = customers.reduce((acc, c) => acc + Math.max(0, Number(c.balance || 0)), 0);

  // Filtered Customers Array
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase().trim();
      if (q) {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const businessMatch = (c.businessName || c.shopName || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').toLowerCase().includes(q);
        const cityMatch = (c.city || '').toLowerCase().includes(q);
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        if (!nameMatch && !businessMatch && !phoneMatch && !cityMatch && !emailMatch) return false;
      }

      // Customer Type Filter
      const isWalkin = (c.customerType || '').toLowerCase().includes('walk-in');
      if (customerTypeFilter === 'Regular Customer' && isWalkin) return false;
      if (customerTypeFilter === 'Walk-in Customer' && !isWalkin) return false;

      // Balance Filter
      const bal = Number(c.balance || 0);
      if (balanceFilter === 'Due' && bal <= 0) return false;
      if (balanceFilter === 'Paid' && bal !== 0) return false;

      // Status Filter
      const custStatus = c.status || 'Active';
      if (statusFilter === 'Active' && custStatus !== 'Active') return false;
      if (statusFilter === 'Inactive' && custStatus !== 'Inactive') return false;

      return true;
    }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }, [customers, search, customerTypeFilter, balanceFilter, statusFilter]);

  const isAnyFilterActive = (
    search !== '' ||
    customerTypeFilter !== 'All' ||
    balanceFilter !== 'All' ||
    statusFilter !== 'All'
  );

  const resetAllFilters = () => {
    setSearch('');
    setCustomerTypeFilter('All');
    setBalanceFilter('All');
    setStatusFilter('All');
  };

  // Create Customer Handler
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Customer name is required');
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

    try {
      await addCustomer({
        name: form.name.trim(),
        shopName: form.businessName.trim(),
        businessName: form.businessName.trim(),
        phone: form.phone.trim() || 'N/A',
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        city: form.city.trim() || 'Local Mandi',
        address: form.address.trim(),
        customerType: form.customerType,
        openingBalance: Number(form.openingBalance) || 0,
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
        customerType: 'Regular Customer',
        openingBalance: 0,
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        status: 'Active',
        notes: ''
      });
    } catch (err) {
      alert(err.message || 'Failed to create customer');
    }
  };

  // Update Customer Handler
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name.trim()) return;

    if (editingCustomer.phone && editingCustomer.phone !== 'N/A' && editingCustomer.phone.replace(/\D/g, '').length !== 11) {
      alert('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }
    if (editingCustomer.whatsapp && editingCustomer.whatsapp.replace(/\D/g, '').length !== 11) {
      alert('WhatsApp number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    try {
      await updateCustomer(editingCustomer.id, {
        name: editingCustomer.name.trim(),
        shopName: editingCustomer.businessName ? editingCustomer.businessName.trim() : (editingCustomer.shopName ? editingCustomer.shopName.trim() : ''),
        businessName: editingCustomer.businessName ? editingCustomer.businessName.trim() : (editingCustomer.shopName ? editingCustomer.shopName.trim() : ''),
        phone: editingCustomer.phone ? editingCustomer.phone.trim() : 'N/A',
        whatsapp: editingCustomer.whatsapp ? editingCustomer.whatsapp.trim() : '',
        email: editingCustomer.email ? editingCustomer.email.trim() : '',
        city: editingCustomer.city ? editingCustomer.city.trim() : 'Local Mandi',
        address: editingCustomer.address ? editingCustomer.address.trim() : '',
        customerType: editingCustomer.customerType || 'Regular Customer',
        balance: Number(editingCustomer.balance) || 0,
        bankName: editingCustomer.bankName ? editingCustomer.bankName.trim() : '',
        accountTitle: editingCustomer.accountTitle ? editingCustomer.accountTitle.trim() : '',
        accountNumber: (editingCustomer.accountNumber || editingCustomer.iban) ? (editingCustomer.accountNumber || editingCustomer.iban).trim() : '',
        status: editingCustomer.status || 'Active',
        notes: editingCustomer.notes ? editingCustomer.notes.trim() : ''
      });

      setEditingCustomer(null);
    } catch (err) {
      alert(err.message || 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        alert(err.message || 'Failed to delete customer');
      }
    }
  };

  // Calculate customer metrics for profile view
  const getCustomerMetrics = (cust) => {
    if (!cust) return { totalSales: 0, totalPaid: 0, balance: 0, ordersCount: 0 };
    const custSales = (sales || []).filter(s => s.customerId === cust.id || s.partyName === cust.name);
    const totalSales = custSales.reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
    const totalPaid = custSales.reduce((acc, s) => acc + Number(s.paidAmount || (s.status === 'Paid' ? s.amount : 0)), 0);
    const balance = Number(cust.balance !== undefined ? cust.balance : Math.max(0, totalSales - totalPaid));
    return {
      totalSales,
      totalPaid,
      balance,
      ordersCount: custSales.length
    };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            <span>Customers</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Master directory of all Regular Customers and Walk-in Customers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Table / Card View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Regular Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div
          onClick={() => { setCustomerTypeFilter('All'); setBalanceFilter('All'); }}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
          }`}
          title="View all customers"
        >
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
            <Users className="w-4 h-4 text-blue-600" /> Total Customers
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
            {totalCustomers}
          </div>
        </div>

        {/* Regular Customers */}
        <div
          onClick={() => { setCustomerTypeFilter('Regular Customer'); setBalanceFilter('All'); }}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-indigo-500/30 text-white' : 'bg-gradient-to-b from-indigo-50/50 to-white border-indigo-200/80'
          }`}
          title="Filter Regular Customers"
        >
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-indigo-600" /> Regular Customers
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-indigo-600 dark:text-indigo-400">
            {regularCount}
          </div>
        </div>

        {/* Walk-in Customers */}
        <div
          onClick={() => { setCustomerTypeFilter('Walk-in Customer'); setBalanceFilter('All'); }}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-teal-500/30 text-white' : 'bg-gradient-to-b from-teal-50/50 to-white border-teal-200/80'
          }`}
          title="Filter Walk-in Customers"
        >
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
            <User className="w-4 h-4 text-teal-600" /> Walk-in Customers
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-teal-600 dark:text-teal-400">
            {walkinCount}
          </div>
        </div>

        {/* Total Receivables */}
        <div
          onClick={() => { setBalanceFilter('Due'); }}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
          }`}
          title="Filter Customers with Outstanding Balance"
        >
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
            <DollarSign className="w-4 h-4 text-amber-600" /> Total Receivables
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
            Rs. {totalReceivables.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className={`border rounded-3xl p-4 card-shadow space-y-3 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* 1. Customer Type */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-brand-500" />
              <span>Customer Type</span>
            </label>
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Customer Types</option>
              <option value="Regular Customer">Regular Customers</option>
              <option value="Walk-in Customer">Walk-in Customers</option>
            </select>
          </div>

          {/* 2. Balance Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              <span>Balance Status</span>
            </label>
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Balances</option>
              <option value="Due">Due / Outstanding</option>
              <option value="Paid">Paid / Zero Balance</option>
            </select>
          </div>

          {/* 3. Account Status Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Account Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* 4. Search Box */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Customers</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>
        </div>

        {isAnyFilterActive && (
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/80">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE: TABLE VIEW OR CARD VIEW */}
      {viewMode === 'card' ? (
        /* ========================================================================= */
        /* COMPACT CARD VIEW (No horizontal scroll, fully responsive) */
        /* ========================================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No customers found matching your filter criteria.
            </div>
          ) : (
            filteredCustomers.map(cust => {
              const bal = Number(cust.balance || 0);
              const isWalkin = (cust.customerType || '').toLowerCase().includes('walk-in');
              const status = cust.status || 'Active';

              return (
                <div
                  key={cust.id}
                  className={`p-4 rounded-2xl border card-shadow flex flex-col justify-between transition ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {cust.name}
                        </h4>
                        {(cust.businessName || cust.shopName) && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {cust.businessName || cust.shopName}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {isWalkin ? 'Walk-in' : 'Regular'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                      {cust.phone && cust.phone !== 'N/A' && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                      {cust.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Balance</div>
                      <div className="font-mono font-black text-xs">
                        <span className={bal > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}>
                          Rs. {bal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingCustomer(cust)}
                        className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400' 
                            : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                        }`}
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingCustomer(cust)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Edit Customer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                        className="p-1.5 rounded-xl border border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition cursor-pointer"
                        title="Delete Customer"
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
        /* ========================================================================= */
        /* COMPACT TABLE VIEW (No horizontal scroll, fully responsive) */
        /* ========================================================================= */
        <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${
                theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No customers found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(cust => {
                    const bal = Number(cust.balance || 0);
                    const isWalkin = (cust.customerType || '').toLowerCase().includes('walk-in');
                    const status = cust.status || 'Active';

                    return (
                      <tr 
                        key={cust.id} 
                        className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                      >
                        {/* 1. Customer Name + City */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {cust.name}
                          </div>
                          {(cust.city || cust.businessName || cust.shopName) && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              📍 {cust.city || 'Local Mandi'} {cust.businessName || cust.shopName ? `• ${cust.businessName || cust.shopName}` : ''}
                            </div>
                          )}
                        </td>

                        {/* 2. Customer Type */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                            {isWalkin ? 'Walk-in' : 'Regular'}
                          </span>
                        </td>

                        {/* 3. Phone */}
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {cust.phone && cust.phone !== 'N/A' ? cust.phone : '-'}
                        </td>

                        {/* 4. Balance */}
                        <td className="py-3 px-4 text-right font-mono font-black text-xs">
                          <span className={bal > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}>
                            Rs. {bal.toLocaleString()}
                          </span>
                        </td>

                        {/* 5. Status */}
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold text-xs ${
                            status === 'Active'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            {status}
                          </span>
                        </td>

                        {/* 6. Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Profile */}
                            <button
                              onClick={() => setViewingCustomer(cust)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                                theme === 'dark' 
                                   ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400' 
                                  : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                              }`}
                              title="View Customer Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Edit Customer */}
                            <button
                              onClick={() => setEditingCustomer(cust)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                              title="Edit Customer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Customer */}
                            <button
                              onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                              className="p-1.5 rounded-xl border border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition cursor-pointer"
                              title="Delete Customer"
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
      {/* 1. VIEW CUSTOMER PROFILE MODAL */}
      {/* ========================================================================= */}
      {viewingCustomer && (() => {
        const metrics = getCustomerMetrics(viewingCustomer);
        const isWalkin = (viewingCustomer.customerType || '').toLowerCase().includes('walk-in');

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setViewingCustomer(null); }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              {/* Profile Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">{viewingCustomer.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        isWalkin 
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' 
                          : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                      }`}>
                        {isWalkin ? 'Walk-in Customer' : 'Regular Customer'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Status: {viewingCustomer.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingCustomer(null)}
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
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Sales</div>
                  <div className="font-mono font-extrabold text-xs text-slate-900 dark:text-white mt-0.5">
                    Rs. {metrics.totalSales.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</div>
                  <div className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Rs. {metrics.totalPaid.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Khata Balance</div>
                  <div className={`font-mono font-extrabold text-xs mt-0.5 ${
                    metrics.balance > 0 ? 'text-amber-500' : 'text-emerald-600'
                  }`}>
                    Rs. {metrics.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Contact & Business Info Details */}
              <div className={`p-4 rounded-2xl space-y-2.5 border text-xs ${
                theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
              }`}>
                {(viewingCustomer.businessName || viewingCustomer.shopName) && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Business / Shop:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{viewingCustomer.businessName || viewingCustomer.shopName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-500">
                  <span>Phone Number:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingCustomer.phone || '-'}</span>
                </div>
                {viewingCustomer.whatsapp && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>WhatsApp:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingCustomer.whatsapp}</span>
                  </div>
                )}
                {viewingCustomer.email && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Email:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{viewingCustomer.email}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-500">
                  <span>City / Mandi:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{viewingCustomer.city || 'Local Mandi'}</span>
                </div>
                {viewingCustomer.address && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Address:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingCustomer.address}</span>
                  </div>
                )}
                {(viewingCustomer.bankName || viewingCustomer.accountNumber || viewingCustomer.accountTitle) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Landmark className="w-3 h-3" />
                      <span>Bank Account Details</span>
                    </div>
                    {viewingCustomer.bankName && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Bank Name:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{viewingCustomer.bankName}</span>
                      </div>
                    )}
                    {viewingCustomer.accountTitle && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Account Title:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{viewingCustomer.accountTitle}</span>
                      </div>
                    )}
                    {(viewingCustomer.accountNumber || viewingCustomer.iban) && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Account # / IBAN:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingCustomer.accountNumber || viewingCustomer.iban}</span>
                      </div>
                    )}
                  </div>
                )}
                {viewingCustomer.notes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-400 italic">
                    Note: {viewingCustomer.notes}
                  </div>
                )}
              </div>

              {/* Action Jump Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setViewingCustomer(null);
                    navigate(`/ledger?customerId=${viewingCustomer.id}`);
                  }}
                  className="py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View Ledger</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingCustomer(null);
                    navigate(`/khata?customerId=${viewingCustomer.id}`);
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
      {/* 2. ADD REGULAR CUSTOMER MODAL (Compact 2-Column Grid - No Desktop Scroll) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Add New Customer</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Register customer account, credit info & bank details</p>
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

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LEFT COLUMN: Customer & Contact Info */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Customer & Contact Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Customer Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Full Customer Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Business / Firm Name
                      </label>
                      <input
                        type="text"
                        placeholder="Company or Shop Name"
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
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
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="03001234567"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        placeholder="e.g. Faisalabad, Okara"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="customer@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      placeholder="Shop # / Street / Market address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Financial, Bank & Account Details */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Financial & Bank Account Info</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Customer Type
                      </label>
                      <select
                        value={form.customerType}
                        onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="Regular Customer">Regular Customer</option>
                        <option value="Walk-in Customer">Walk-in Customer</option>
                      </select>
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
                        value={form.openingBalance}
                        onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
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
                        placeholder="Title of Account"
                        value={form.accountTitle}
                        onChange={(e) => setForm({ ...form, accountTitle: e.target.value })}
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
                        placeholder="PK36MEZN..."
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
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
                      placeholder="Special Mandi terms, credit terms, notes..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                  onClick={() => setShowAddModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT CUSTOMER MODAL (Compact 2-Column Grid - No Desktop Scroll) */}
      {/* ========================================================================= */}
      {editingCustomer && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingCustomer(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Edit Customer Profile</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Update customer identity, credit balance & bank accounts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LEFT COLUMN: Customer & Contact Info */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Customer & Contact Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Customer Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingCustomer.name}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Business / Firm Name
                      </label>
                      <input
                        type="text"
                        value={editingCustomer.businessName || editingCustomer.shopName || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, businessName: e.target.value, shopName: e.target.value })}
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
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="03001234567"
                        value={editingCustomer.phone || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        value={editingCustomer.whatsapp || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        value={editingCustomer.city || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editingCustomer.email || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      value={editingCustomer.address || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Financial, Bank & Account Details */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Financial & Bank Account Info</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Customer Type
                      </label>
                      <select
                        value={editingCustomer.customerType || 'Regular Customer'}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, customerType: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="Regular Customer">Regular Customer</option>
                        <option value="Walk-in Customer">Walk-in Customer</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Current Balance (PKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editingCustomer.balance || 0}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, balance: Number(e.target.value) })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
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
                        value={editingCustomer.bankName || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, bankName: e.target.value })}
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
                        placeholder="Title of Account"
                        value={editingCustomer.accountTitle || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, accountTitle: e.target.value })}
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
                        placeholder="PK36MEZN..."
                        value={editingCustomer.accountNumber || editingCustomer.iban || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, accountNumber: e.target.value })}
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
                      placeholder="Special Mandi terms, credit terms, notes..."
                      value={editingCustomer.notes || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
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
                  onClick={() => setEditingCustomer(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
