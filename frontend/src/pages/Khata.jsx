import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Printer,
  DollarSign,
  Clock,
  CheckCircle2,
  Users,
  User,
  Filter,
  RefreshCw,
  BookOpen,
  Check,
  X,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Edit3,
  ShoppingBag,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { useERP, computeCustomerKhataBalance, computeAllCustomersFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const Khata = () => {
  const { customers = [], sales = [], saleReturns = [], paymentLogs = [], recordPayment, updateCustomer, addCustomer } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const customerIdParam = searchParams.get('customerId');

  // View Mode: 'table' | 'card'
  const [viewMode, setViewMode] = useState('table');

  // Khata Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdParam || 'All');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState('All'); // 'All' | 'Outstanding' | 'Clear'

  // Payment Modal State
  const [paymentModalCust, setPaymentModalCust] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Khata Customer State
  const [editingKhataCust, setEditingKhataCust] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    city: '',
    balance: 0,
    customerType: 'Regular Customer'
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEditModal = (item) => {
    const fullCust = customers.find(c => String(c.id) === String(item.id)) || item;
    const fin = computeCustomerKhataBalance(fullCust, sales, paymentLogs, saleReturns);

    setEditingKhataCust({
      ...item,
      totalSale: fin.totalSale,
      totalPaid: fin.totalPaid,
      initialDue: fin.balance
    });
    setEditForm({
      name: fullCust.name || item.name || '',
      businessName: fullCust.businessName || fullCust.shopName || item.businessName || '',
      phone: fullCust.phone || item.phone || '',
      city: fullCust.city || item.city || '',
      receiveAmount: '',
      paymentMode: 'Cash',
      customerType: fullCust.customerType || item.customerType || 'Regular Customer'
    });
  };

  const handleSaveKhataEdit = async (e) => {
    e.preventDefault();
    if (!editingKhataCust) return;
    if (editForm.phone && editForm.phone.trim() && editForm.phone.replace(/\D/g, '').length !== 11) {
      alert('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    const payAmt = Number(editForm.receiveAmount) || 0;
    const fullCust = customers.find(c => String(c.id) === String(editingKhataCust.id)) || editingKhataCust;
    const fin = computeCustomerKhataBalance(fullCust, sales, paymentLogs, saleReturns);
    const initialDue = fin.balance;

    if (payAmt < 0) {
      alert('Payment amount cannot be negative.');
      return;
    }

    if (payAmt > initialDue && initialDue > 0) {
      alert(`Payment amount (Rs. ${payAmt.toLocaleString()}) cannot exceed the outstanding balance of Rs. ${initialDue.toLocaleString()}.`);
      return;
    }

    try {
      setIsSavingEdit(true);

      // Record the payment received
      if (recordPayment && payAmt > 0) {
        await recordPayment({
          partyId: fullCust.id && !String(fullCust.id).startsWith('walkin-') ? fullCust.id : null,
          partyName: editForm.name.trim() || fullCust.name,
          partyType: 'Customer',
          amount: payAmt,
          paymentMode: editForm.paymentMode || 'Cash',
          note: payAmt >= initialDue ? 'Full Khata Clearance' : 'Khata Payment Settlement'
        });
      }

      // Update customer profile details
      if (updateCustomer && fullCust.id && !String(fullCust.id).startsWith('walkin-')) {
        await updateCustomer(fullCust.id, {
          ...fullCust,
          name: editForm.name.trim(),
          businessName: editForm.businessName.trim(),
          phone: editForm.phone ? editForm.phone.trim() : 'N/A',
          city: editForm.city.trim(),
          customerType: editForm.customerType
        });
      } else if (editingKhataCust.isRegistered === false || String(editingKhataCust.id).startsWith('walkin-')) {
        if (addCustomer) {
          const newBal = Math.max(0, initialDue - payAmt);
          if (newBal > 0) {
            await addCustomer({
              name: editForm.name.trim(),
              shopName: editForm.businessName.trim(),
              phone: editForm.phone ? editForm.phone.trim() : 'N/A',
              city: editForm.city.trim() || 'Local Mandi',
              openingBalance: newBal,
              balance: newBal,
              customerType: editForm.customerType || 'Walk-in Customer'
            });
          }
        }
      }

      setEditingKhataCust(null);
    } catch (err) {
      alert(err.message || 'Failed to update Khata account');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Sync with URL param
  useEffect(() => {
    if (customerIdParam) {
      setSelectedCustomerId(customerIdParam);
    }
  }, [customerIdParam]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && paymentModalCust) {
        setPaymentModalCust(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paymentModalCust]);

  // 1. Unified Financial Position List using Centralized Accounting Engine
  const { allCustomers, registeredList, walkinList } = useMemo(() => {
    return computeAllCustomersFinancials(customers, sales, paymentLogs, saleReturns);
  }, [customers, sales, paymentLogs, saleReturns]);

  // Filtered Khata Accounts
  const filteredKhata = useMemo(() => {
    const baseList = customerTypeFilter === 'Walk-in Customer'
      ? walkinList
      : (customerTypeFilter === 'Regular Customer' ? registeredList : allCustomers);

    return baseList.filter(item => {
      // 0. Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const phoneMatch = (item.phone || '').toLowerCase().includes(q);
        const cityMatch = (item.city || '').toLowerCase().includes(q);
        const bizMatch = (item.businessName || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !cityMatch && !bizMatch) return false;
      }

      // 1. Selected Customer Filter
      if (selectedCustomerId !== 'All') {
        const idMatch = String(item.id) === String(selectedCustomerId);
        const nameMatch = (item.name || '').toLowerCase() === selectedCustomerId.toLowerCase();
        if (!idMatch && !nameMatch) return false;
      }

      // 2. Balance Status Filter
      if (balanceStatusFilter === 'Outstanding' && (item.receivableDue || item.balance) <= 0) return false;
      if (balanceStatusFilter === 'Clear' && (item.receivableDue || item.balance) !== 0) return false;

      return true;
    }).sort((a, b) => {
      const balA = Number(a.receivableDue !== undefined ? a.receivableDue : (a.balance || 0));
      const balB = Number(b.receivableDue !== undefined ? b.receivableDue : (b.balance || 0));
      if (balB !== balA) return balB - balA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [allCustomers, registeredList, walkinList, searchTerm, customerTypeFilter, selectedCustomerId, balanceStatusFilter]);

  // Aggregate Metrics based on Filtered Khata
  const totalOutstanding = filteredKhata.reduce((acc, k) => acc + (Number(k.receivableDue !== undefined ? k.receivableDue : (k.balance > 0 ? k.balance : 0)) || 0), 0);
  const totalAdvanceCredit = filteredKhata.reduce((acc, k) => acc + (Number(k.advanceCredit !== undefined ? k.advanceCredit : (k.balance < 0 ? Math.abs(k.balance) : 0)) || 0), 0);

  const isAnyFilterActive = (
    searchTerm.trim() !== '' ||
    customerTypeFilter !== 'All' ||
    selectedCustomerId !== 'All' ||
    balanceStatusFilter !== 'All'
  );

  const resetAllFilters = () => {
    setSearchTerm('');
    setCustomerTypeFilter('All');
    setSelectedCustomerId('All');
    setBalanceStatusFilter('All');
  };

  const openReceiveModal = (khataItem) => {
    setPaymentModalCust(khataItem);
    setPaymentAmount(khataItem.balance > 0 ? khataItem.balance : '');
    setPaymentMode('Cash');
    setPaymentNote(`Khata settlement for ${khataItem.name}`);
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    if (!paymentModalCust || isSubmitting) return;

    const maxDue = Math.max(0, Number(paymentModalCust.balance || 0));
    if (maxDue <= 0) {
      alert('This customer account is already fully settled (Rs. 0 balance). No payment is required.');
      return;
    }

    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    if (amt > maxDue) {
      alert(`Payment amount (Rs. ${amt.toLocaleString()}) cannot exceed the customer's outstanding balance of Rs. ${maxDue.toLocaleString()}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId: paymentModalCust.isRegistered ? paymentModalCust.id : null,
        partyName: paymentModalCust.name,
        partyType: 'Customer',
        amount: amt,
        paymentMode: paymentMode,
        note: paymentNote
      });

      setPaymentModalCust(null);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            <span>Customer Khata Ledger</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Real-time balance tracking, credit limits & payment recovery
          </p>
        </div>

        <div className="no-print flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer text-slate-700 dark:text-slate-200 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Khata</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Row (Screen Only) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Customer Receivables */}
        <div
          onClick={() => setBalanceStatusFilter(balanceStatusFilter === 'Outstanding' ? 'All' : 'Outstanding')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${balanceStatusFilter === 'Outstanding'
            ? 'ring-2 ring-amber-500'
            : ''
            } ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
            }`}
          title="Filter pending receivables"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Customer Receivables</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalOutstanding.toLocaleString()}
          </div>
        </div>

        {/* 2. Customer Credit / Advance */}
        <div
          onClick={() => setBalanceStatusFilter(balanceStatusFilter === 'Clear' ? 'All' : 'Clear')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${balanceStatusFilter === 'Clear'
            ? 'ring-2 ring-emerald-500'
            : ''
            } ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}
          title="Filter customer advance & clear accounts"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Customer Credit / Advance</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            Rs. {totalAdvanceCredit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Khata Filter Toolbar (Screen Only) */}
      <div className={`no-print border rounded-3xl p-3.5 sm:p-4 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-brand-500" />
              <span>Search Customer</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, city..."
                className={`w-full border rounded-xl pl-3 pr-8 py-2 text-xs font-bold outline-none focus:border-brand-500 h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 1. Customer Type */}
          <div className="w-full sm:w-[170px]">
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
              <option value="Regular Customer">Regular Customers</option>
              <option value="Walk-in Customer">Walk-in Customers</option>
            </select>
          </div>

          {/* 2. Balance Status */}
          <div className="w-full sm:w-[170px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Balance Status</span>
            </label>
            <select
              value={balanceStatusFilter}
              onChange={(e) => setBalanceStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">All Balances</option>
              <option value="Outstanding">Due / Outstanding</option>
              <option value="Clear">Clear (Zero Balance)</option>
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
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY HEADER */}
      {/* ========================================================================= */}
      <PrintHeader
        title="Khata Accounts & Credit Register"
        filterSummary={`Type: ${customerTypeFilter} | Status: ${balanceStatusFilter}`}
        stats={[
          { label: 'Total Accounts', value: filteredKhata.length },
          { label: 'Customer Receivables', value: `Rs. ${totalOutstanding.toLocaleString()}` },
          { label: 'Customer Credit / Advance', value: `Rs. ${totalAdvanceCredit.toLocaleString()}` }
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
                <th className="py-3 px-4 text-right">Total Sale</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredKhata.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No customer accounts found matching the selected Khata filter criteria.
                  </td>
                </tr>
              ) : (
                filteredKhata.map(item => {
                  const isWalkin = item.customerType.toLowerCase().includes('walk-in');

                  return (
                    <tr
                      key={item.id}
                      className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* Customer Name */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        {(item.city || item.businessName) && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            📍 {item.city} {item.businessName ? `• ${item.businessName}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Customer Type */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                          {isWalkin ? 'Walk-in' : 'Regular'}
                        </span>
                      </td>

                      {/* Total Sale */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        Rs. {item.totalSale.toLocaleString()}
                      </td>

                      {/* Total Paid out */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {item.totalPaid.toLocaleString()}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-4 text-right font-mono font-black text-xs">
                        {item.advanceCredit > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            Credit: Rs. {item.advanceCredit.toLocaleString()}
                          </span>
                        ) : item.receivableDue > 0 ? (
                          <span className="text-amber-500 dark:text-amber-400 font-black">
                            Rs. {item.receivableDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">Rs. 0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-bold ${item.advanceCredit > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.receivableDue > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500'
                          }`}>
                          {item.advanceCredit > 0 ? 'Advance' : item.receivableDue > 0 ? 'Due' : 'Clear'}
                        </span>
                      </td>

                      {/* Actions: Edit | Receive Payment | View Ledger (Screen Only) */}
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Khata Account */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition cursor-pointer text-xs font-bold shadow-2xs"
                            title="Edit Khata & Manage Balance"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* View Ledger */}
                          <button
                            onClick={() => navigate(item.isRegistered ? `/ledger?customerId=${item.id}` : `/ledger?customerId=${encodeURIComponent(item.name)}`)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400'
                              : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                              }`}
                            title="View Full Ledger for this Customer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Ledger</span>
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
      <PrintFooter note="Official Business Record • Ghalla Mandi Customer Khata & Balances" />

      {/* Receive Khata Payment Modal */}
      {paymentModalCust && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalCust(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" /> Receive Khata Settlement
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalCust(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Khata Summary Box */}
            <div className={`rounded-2xl p-3.5 space-y-2 border text-xs font-semibold ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between items-center text-slate-400">
                <span>Customer:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{paymentModalCust.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Billed:</span>
                <span className="font-bold text-slate-900 dark:text-white">Rs. {paymentModalCust.totalSale.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-rose-500 font-extrabold pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Outstanding Khata Due:</span>
                <span className="text-sm font-black">Rs. {paymentModalCust.balance.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleReceivePayment} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Amount Received (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="Cash">Cash on Counter</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Payment Note</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Khata clearance"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalCust(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Khata / Customer Settlement Modal (Matching Pay Supplier Style) */}
      {editingKhataCust && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingKhataCust(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Receive Customer Payment</h3>
                  <p className="text-[11px] text-slate-400 font-bold">Settle customer outstanding balance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingKhataCust(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Info Badge */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{editingKhataCust.name}</span>
                  {editingKhataCust.businessName && (
                    <span className="text-slate-400 font-semibold">• {editingKhataCust.businessName}</span>
                  )}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{editingKhataCust.city || 'Karachi'}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 font-semibold">Outstanding Due:</span>
                <span className={`font-mono font-black ${Number(editingKhataCust.initialDue || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  Rs. {Number(editingKhataCust.initialDue || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveKhataEdit} className="space-y-3.5">
              {Number(editingKhataCust.initialDue || 0) <= 0 ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-xs font-extrabold">✓ Account Already Cleared</div>
                    <div className="text-[11px] font-medium text-emerald-600/90 dark:text-emerald-400/90">
                      This customer has no pending dues remaining (Rs. 0 Balance).
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Payment Amount Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-400">Payment Amount (PKR) *</label>
                      {Number(editForm.receiveAmount || 0) >= Number(editingKhataCust.initialDue || 0) ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Fully Settling</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-500">Partial Settlement</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="1"
                        max={Number(editingKhataCust.initialDue || 0)}
                        value={editForm.receiveAmount}
                        onChange={(e) => setEditForm({ ...editForm, receiveAmount: e.target.value })}
                        placeholder={`e.g. ${Number(editingKhataCust.initialDue || 0)}`}
                        autoFocus
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-brand-500 font-mono ${Number(editForm.receiveAmount || 0) >= Number(editingKhataCust.initialDue || 0) && Number(editingKhataCust.initialDue || 0) > 0
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-slate-400">
                        {Number(editForm.receiveAmount || 0) > 0
                          ? `Remaining Due after payment: Rs. ${Math.max(0, Number(editingKhataCust.initialDue || 0) - Number(editForm.receiveAmount || 0)).toLocaleString()}`
                          : 'Enter amount to reduce customer liability.'}
                      </span>
                      {Number(editingKhataCust.initialDue || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, receiveAmount: editingKhataCust.initialDue.toString() }))}
                          className="text-brand-500 hover:underline font-bold cursor-pointer"
                        >
                          Pay Full (Rs. {Number(editingKhataCust.initialDue).toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Account / Mode Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Payment Account / Mode *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Cash', label: 'Cash in Hand' },
                        { id: 'Bank', label: 'Bank Transfer' },
                        { id: 'Card', label: 'Card' }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, paymentMode: mode.id }))}
                          className={`py-2 px-2 rounded-xl text-xs font-black transition border cursor-pointer text-center ${editForm.paymentMode === mode.id
                            ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={editForm.paymentDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>

                  {/* Note / Reference */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Note / Reference (Optional)</label>
                    <input
                      type="text"
                      value={editForm.paymentNote || ''}
                      onChange={(e) => setEditForm({ ...editForm, paymentNote: e.target.value })}
                      placeholder={`Settlement payment from ${editingKhataCust.name}`}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setEditingKhataCust(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || (Number(editingKhataCust.initialDue || 0) <= 0)}
                  className={`w-1/2 py-2.5 font-extrabold text-xs rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${Number(editingKhataCust.initialDue || 0) <= 0
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                    }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Recording...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Khata;
