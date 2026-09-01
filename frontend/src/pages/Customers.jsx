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
  Hash,
  Printer,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { useERP, computeCustomerKhataBalance, computeAllCustomersFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const Customers = () => {
  const { customers = [], sales = [], saleReturns = [], paymentLogs = [], addCustomer, updateCustomer, deleteCustomer } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  // View Mode: 'table' | 'card'
  const [viewMode, setViewMode] = useState('table');

  // Filters State
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [balanceFilter, setBalanceFilter] = useState('All'); // 'All' | 'Due' | 'Paid'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  // Form state for New Regular Customer with Bank Details
  const [form, setForm] = useState({
    name: '',
    shopName: '',
    phone: '',
    whatsapp: '',
    city: '',
    address: '',
    customerType: 'Regular Customer',
    openingBalance: '',
    creditLimit: '',
    paymentTerms: 'Due on Receipt',
    cnic: '',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escape key handler to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (editingCustomer) setEditingCustomer(null);
        if (viewingCustomer) setViewingCustomer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingCustomer, viewingCustomer]);

  // 1. Unified Financial Position using Centralized Accounting Engine
  const {
    allCustomers,
    registeredList: registeredCustomersList,
    walkinList: walkinCustomersList,
    totalGrossSales,
    totalPaymentsReceived,
    totalReceivables
  } = useMemo(() => {
    return computeAllCustomersFinancials(customers, sales, paymentLogs, saleReturns);
  }, [customers, sales, paymentLogs, saleReturns]);

  // Aggregate stats (Party Khata Receivables vs Walk-in Counter Dues)
  const totalCustomers = registeredCustomersList.length;
  const regularCount = registeredCustomersList.filter(c => (c.customerType || '').toLowerCase().includes('regular')).length;
  const walkinCount = walkinCustomersList.length;

  const totalOverallSales = totalGrossSales;
  const totalOverallReceived = totalPaymentsReceived;
  const totalWalkinDues = walkinCustomersList.reduce((acc, c) => acc + (c.receivableDue || 0), 0);

  // Filtered Customers Array
  const filteredCustomers = useMemo(() => {
    let baseList = [];
    const filter = (customerTypeFilter || 'All').toLowerCase();

    if (filter.includes('walk-in')) {
      baseList = walkinCustomersList;
    } else if (filter.includes('regular')) {
      baseList = registeredCustomersList;
    } else {
      // 'All' -> Display both Regular and Walk-in customers!
      baseList = [...registeredCustomersList, ...walkinCustomersList];
    }

    return baseList.filter(c => {
      // Balance Filter
      const bal = Number(c.balance || 0);
      if (balanceFilter === 'Due' && bal <= 0) return false;
      if (balanceFilter === 'Paid' && bal !== 0) return false;

      return true;
    }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }, [registeredCustomersList, walkinCustomersList, customerTypeFilter, balanceFilter]);

  const isAnyFilterActive = (
    customerTypeFilter !== 'All' ||
    balanceFilter !== 'All'
  );

  const resetAllFilters = () => {
    setCustomerTypeFilter('All');
    setBalanceFilter('All');
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
      if (editingCustomer.isRegistered) {
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
          notes: editingCustomer.notes ? editingCustomer.notes.trim() : ''
        });
      } else {
        await addCustomer({
          name: editingCustomer.name.trim(),
          shopName: editingCustomer.businessName ? editingCustomer.businessName.trim() : '',
          businessName: editingCustomer.businessName ? editingCustomer.businessName.trim() : '',
          phone: editingCustomer.phone ? editingCustomer.phone.trim() : 'N/A',
          city: editingCustomer.city ? editingCustomer.city.trim() : 'Local Mandi',
          balance: Number(editingCustomer.balance) || 0,
          customerType: editingCustomer.customerType || 'Walk-in Customer'
        });
      }

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
      {/* Page Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            <span>Customers</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            List and balance details of regular and walk-in customers
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
            <span>Add Regular Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Screen Only) */}
      <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Regular Customers */}
        <div
          onClick={() => { setCustomerTypeFilter('Regular'); setBalanceFilter('All'); }}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${customerTypeFilter === 'Regular'
            ? 'ring-2 ring-blue-500'
            : ''
            } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
            }`}
          title="Filter saved regular customers"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Regular Customers</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
            {regularCount || totalCustomers}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Registered customer profiles</div>
        </div>

        {/* 2. Walk-in Customers */}
        <div
          onClick={() => { setCustomerTypeFilter('Walk-in'); setBalanceFilter('All'); }}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${customerTypeFilter === 'Walk-in'
            ? 'ring-2 ring-indigo-500'
            : ''
            } ${theme === 'dark' ? 'bg-slate-800 border-indigo-500/30 text-white' : 'bg-gradient-to-b from-indigo-50/50 to-white border-indigo-200/80'
            }`}
          title="Filter Walk-in Counter customers"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Walk-in Customers</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-indigo-600 dark:text-indigo-400">
            {walkinCount}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Counter / spot buyer records</div>
        </div>

        {/* 3. Customer Receivables */}
        <div
          onClick={() => { setCustomerTypeFilter('Regular'); setBalanceFilter('Due'); }}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${balanceFilter === 'Due'
            ? 'ring-2 ring-amber-500'
            : ''
            } ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
            }`}
          title="Filter Customers with Outstanding Balance"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Customer Receivables</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalReceivables.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Net party receivables (Khata)</div>
        </div>

        {/* 4. Walk-in Counter Dues */}
        <div
          onClick={() => { setCustomerTypeFilter('Walk-in'); setBalanceFilter('Due'); }}
          className={`border rounded-2xl p-4 sm:p-5 card-hover card-shadow transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-teal-500/30 text-white' : 'bg-gradient-to-b from-teal-50/50 to-white border-teal-200/80'
            }`}
          title="Filter Walk-in Counter Sales with pending dues"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Walk-in Counter Dues</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-teal-600 dark:text-teal-400">
            Rs. {totalWalkinDues.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Unpaid walk-in counter balances</div>
        </div>
      </div>

      {/* Filter Toolbar (Screen Only) */}
      <div className={`no-print border rounded-3xl p-3.5 sm:p-4 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {/* 1. Customer Type */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-brand-500" />
              <span>Customer Type</span>
            </label>
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Customer Types</option>
              <option value="Regular">Regular</option>
              <option value="Walk-in">Walk-in</option>
            </select>
          </div>

          {/* 2. Balance Filter */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              <span>Balance Status</span>
            </label>
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Balances</option>
              <option value="Due">Due</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Inline Reset Filters Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-[38px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center justify-center gap-1.5"
              title="Reset all filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Customer Directory & Khata Balances"
        filterSummary={`Type: ${customerTypeFilter} | Balance: ${balanceFilter}`}
        stats={[
          { label: 'Total Customers', value: totalCustomers },
          { label: 'Regular Customers', value: regularCount },
          { label: 'Walk-in Customers', value: walkinCount },
          { label: 'Total Khata Due', value: `Rs. ${totalReceivables.toLocaleString()}` }
        ]}
      />

      {/* COMPACT TABLE VIEW */}
      <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
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
                        {cust.advanceCredit > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            Credit: Rs. {cust.advanceCredit.toLocaleString()}
                          </span>
                        ) : bal > 0 ? (
                          <span className="text-amber-500 font-black">
                            Rs. {bal.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">Rs. 0</span>
                        )}
                      </td>

                      {/* 5. Actions (Screen Only) */}
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">

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

      {/* Print Footer */}
      <PrintFooter note="Official Business Record • Ghalla Mandi Customer Directory & Balances" />

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
            <div className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              {/* Profile Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">{viewingCustomer.name}</h3>
                    <span className={`text-xs font-bold ${isWalkin
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-brand-600 dark:text-brand-400'
                      }`}>
                      • {isWalkin ? 'Walk-in Customer' : 'Regular Customer'}
                    </span>
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

              {/* Contact & Business Info Details */}
              <div className={`p-4 rounded-2xl space-y-2.5 border text-xs ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
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
          <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                        placeholder="Company or Shop Name"
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
                        City / Mandi
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Faisalabad, Okara"
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
                        placeholder="customer@example.com"
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
                      placeholder="Shop # / Street / Market address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Notes / Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="Special Mandi terms, credit terms, notes..."
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
          <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                        value={editingCustomer.businessName || editingCustomer.shopName || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, businessName: e.target.value, shopName: e.target.value })}
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
                        value={editingCustomer.phone || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
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
                        value={editingCustomer.whatsapp || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
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
                        value={editingCustomer.city || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
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
                        value={editingCustomer.email || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
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
                      value={editingCustomer.address || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                        value={editingCustomer.accountTitle || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, accountTitle: e.target.value })}
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
                        value={editingCustomer.accountNumber || editingCustomer.iban || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, accountNumber: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
