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
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';

export const Customers = () => {
  const { customers = [], sales = [], paymentLogs = [], addCustomer, updateCustomer, deleteCustomer } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // Filters State
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Party' | 'Walk-in Customer'
  const [balanceFilter, setBalanceFilter] = useState('All'); // 'All' | 'Due' | 'Paid'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  // Form state for New Customer
  const [form, setForm] = useState({
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
  const regularCount = customers.filter(c => (c.customerType || 'Regular Party') === 'Regular Party').length;
  const walkinCount = customers.filter(c => (c.customerType || '').toLowerCase().includes('walk-in')).length;
  const totalReceivables = customers.reduce((acc, c) => acc + Math.max(0, Number(c.balance || 0)), 0);

  // Filtered Customers Array
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase().trim();
      if (q) {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const shopMatch = (c.shopName || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').toLowerCase().includes(q);
        const cityMatch = (c.city || '').toLowerCase().includes(q);
        if (!nameMatch && !shopMatch && !phoneMatch && !cityMatch) return false;
      }

      // Customer Type Filter
      const isWalkin = (c.customerType || '').toLowerCase().includes('walk-in');
      if (customerTypeFilter === 'Regular Party' && isWalkin) return false;
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
    });
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
      alert(t('customerPartyName') + ' ' + t('required'));
      return;
    }

    try {
      await addCustomer({
        name: form.name.trim(),
        shopName: form.shopName.trim(),
        phone: form.phone.trim() || 'N/A',
        whatsapp: form.whatsapp.trim(),
        city: form.city.trim() || 'Local Mandi',
        address: form.address.trim(),
        customerType: form.customerType,
        openingBalance: Math.max(0, Number(form.openingBalance) || 0),
        creditLimit: Math.max(0, Number(form.creditLimit) || 0),
        paymentTerms: form.paymentTerms || 'Cash / Credit',
        cnic: form.cnic.trim(),
        status: form.status || 'Active',
        notes: form.notes.trim()
      });

      setShowAddModal(false);
      setForm({
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

    try {
      await updateCustomer(editingCustomer.id, {
        name: editingCustomer.name.trim(),
        shopName: editingCustomer.shopName ? editingCustomer.shopName.trim() : '',
        phone: editingCustomer.phone ? editingCustomer.phone.trim() : 'N/A',
        whatsapp: editingCustomer.whatsapp ? editingCustomer.whatsapp.trim() : '',
        city: editingCustomer.city ? editingCustomer.city.trim() : 'Local Mandi',
        address: editingCustomer.address ? editingCustomer.address.trim() : '',
        customerType: editingCustomer.customerType || 'Regular Party',
        balance: Number(editingCustomer.balance) || 0,
        creditLimit: Math.max(0, Number(editingCustomer.creditLimit) || 0),
        paymentTerms: editingCustomer.paymentTerms || 'Cash / Credit',
        cnic: editingCustomer.cnic ? editingCustomer.cnic.trim() : '',
        status: editingCustomer.status || 'Active',
        notes: editingCustomer.notes ? editingCustomer.notes.trim() : ''
      });

      setEditingCustomer(null);
    } catch (err) {
      alert(err.message || 'Failed to update customer');
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
            <span>{t('customers') || 'Customers Directory'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Master database of all Regular Parties and Walk-in Customers
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="text-xs text-slate-400 font-medium mt-0.5">
            {regularCount} Regular • {walkinCount} Walk-in
          </div>
        </div>

        {/* Regular Parties */}
        <div
          onClick={() => { setCustomerTypeFilter('Regular Party'); setBalanceFilter('All'); }}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-indigo-500/30 text-white' : 'bg-gradient-to-b from-indigo-50/50 to-white border-indigo-200/80'
          }`}
          title="Filter Regular Parties"
        >
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-indigo-600" /> Regular Parties
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-indigo-600 dark:text-indigo-400">
            {regularCount}
          </div>
          <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
            Permanent Accounts
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
          <div className="text-xs text-teal-700 dark:text-teal-400 font-medium mt-0.5">
            Counter Customers
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
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
            Pending in Khata
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className={`border rounded-3xl p-4 sm:p-5 card-shadow space-y-3 ${
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
              <option value="Regular Party">Regular Parties</option>
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
              <span>Search Party</span>
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

      {/* Main Customers Compact Table */}
      <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
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
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {cust.name}
                        </div>
                        {cust.city && (
                          <div className="text-[11px] text-slate-400 font-medium">
                            📍 {cust.city} {cust.shopName ? `• ${cust.shopName}` : ''}
                          </div>
                        )}
                      </td>

                      {/* 2. Customer Type */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          isWalkin
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                            : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                        }`}>
                          {isWalkin ? 'Walk-in' : 'Regular Party'}
                        </span>
                      </td>

                      {/* 3. Phone */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-slate-300">
                        {cust.phone && cust.phone !== 'N/A' ? cust.phone : '-'}
                      </td>

                      {/* 4. Balance */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {bal > 0 ? (
                          <span className="font-black text-amber-500 text-xs">
                            Rs. {bal.toLocaleString()} Due
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            Rs. 0 (Clear)
                          </span>
                        )}
                      </td>

                      {/* 5. Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {status}
                        </span>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Profile */}
                          <button
                            onClick={() => setViewingCustomer(cust)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                              theme === 'dark' 
                                ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400' 
                                : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                            }`}
                            title="View Complete Customer Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Edit Customer */}
                          <button
                            onClick={() => setEditingCustomer(cust)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* 1. VIEW CUSTOMER PROFILE MODAL */}
      {/* ========================================================================= */}
      {viewingCustomer && (() => {
        const metrics = getCustomerMetrics(viewingCustomer);
        const isWalkin = (viewingCustomer.customerType || '').toLowerCase().includes('walk-in');

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setViewingCustomer(null); }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className={`rounded-3xl max-w-lg w-full p-6 space-y-5 card-shadow border ${
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
                        {viewingCustomer.customerType || 'Regular Party'}
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
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Outstanding</div>
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
                <div className="flex justify-between items-center text-slate-500">
                  <span>Shop / Firm:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{viewingCustomer.shopName || '-'}</span>
                </div>
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
                {viewingCustomer.cnic && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>CNIC / NTN:</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{viewingCustomer.cnic}</span>
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
      {/* 2. ADD CUSTOMER MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-lg w-full p-6 space-y-4 card-shadow border my-8 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-500" /> Add New Customer / Party
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Customer Type *</label>
                  <select
                    value={form.customerType}
                    onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Regular Party">Regular Party</option>
                    <option value="Walk-in Customer">Walk-in Customer</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Account Status</label>
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

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Customer / Party Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmad Traders / Ali Khan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number</label>
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
                  <label className="text-xs font-bold text-slate-400 block mb-1">City / Mandi</label>
                  <input
                    type="text"
                    placeholder="e.g. Faisalabad / Okara"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Shop / Firm Name</label>
                  <input
                    type="text"
                    placeholder="Shop # / Grain Market"
                    value={form.shopName}
                    onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Opening Khata Balance (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.openingBalance}
                    onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
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
      {/* 3. EDIT CUSTOMER MODAL */}
      {/* ========================================================================= */}
      {editingCustomer && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingCustomer(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-lg w-full p-6 space-y-4 card-shadow border my-8 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" /> Edit Customer Profile
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Customer Type *</label>
                  <select
                    value={editingCustomer.customerType || 'Regular Party'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, customerType: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Regular Party">Regular Party</option>
                    <option value="Walk-in Customer">Walk-in Customer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Status</label>
                  <select
                    value={editingCustomer.status || 'Active'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, status: e.target.value })}
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
                <label className="text-xs font-bold text-slate-400 block mb-1">Customer / Party Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">City / Mandi</label>
                  <input
                    type="text"
                    value={editingCustomer.city}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Shop / Firm</label>
                  <input
                    type="text"
                    value={editingCustomer.shopName || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, shopName: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Current Khata Balance (Rs.)</label>
                  <input
                    type="number"
                    value={editingCustomer.balance || 0}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, balance: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
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
