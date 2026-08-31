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
  AlertCircle
} from 'lucide-react';
import { useERP, computeCustomerKhataBalance } from '../context/ERPContext';
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

  // 1. Build Financial Position List for Registered Customers (Primary Party Credit Ledger)
  const registeredKhataList = useMemo(() => {
    return (customers || []).map(cust => {
      const fin = computeCustomerKhataBalance(cust, sales, paymentLogs, saleReturns);
      const isWalkin = (cust.customerType || '').toLowerCase().includes('walk-in');
      const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';

      return {
        id: cust.id,
        name: cust.name,
        businessName: cust.businessName || cust.shopName || '',
        phone: cust.phone || '',
        city: cust.city || 'Local Mandi',
        customerType: custType,
        totalSale: fin.totalSale,
        totalPaid: fin.totalPaid,
        returnAmount: fin.returnAmount,
        balance: fin.balance,
        status: fin.status,
        ordersCount: fin.ordersCount,
        isRegistered: true
      };
    });
  }, [customers, sales, saleReturns, paymentLogs]);

  // 2. Process Walk-in / Counter Sales separately (Not mixed into permanent party khata)
  const walkinKhataList = useMemo(() => {
    const walkinSalesMap = new Map();
    const registeredCustIds = new Set((customers || []).map(c => String(c.id)));
    const registeredCustNames = new Set((customers || []).map(c => (c.name || '').trim().toLowerCase()));

    (sales || []).forEach(s => {
      const sCustId = s.customerId ? String(s.customerId) : null;
      const sName = (s.partyName || s.customerName || '').trim().toLowerCase();
      const isRegisteredCust = (sCustId && registeredCustIds.has(sCustId)) ||
        (sName && registeredCustNames.has(sName) && sName !== 'walk-in customer');

      if (!isRegisteredCust) {
        const rawName = (s.partyName || s.customerName || 'Walk-in Customer').trim();
        const key = rawName.toLowerCase();
        if (!walkinSalesMap.has(key)) {
          walkinSalesMap.set(key, { name: rawName, sales: [] });
        }
        walkinSalesMap.get(key).sales.push(s);
      }
    });

    const list = [];
    walkinSalesMap.forEach((val, key) => {
      const fin = computeCustomerKhataBalance({ id: `walkin-${key}`, name: val.name }, val.sales, paymentLogs, saleReturns);
      list.push({
        id: `walkin-${val.name}`,
        name: val.name,
        businessName: 'Walk-in Party',
        phone: 'Counter Sale',
        city: 'Local Mandi',
        customerType: 'Walk-in Customer',
        totalSale: fin.totalSale,
        totalPaid: fin.totalPaid,
        returnAmount: fin.returnAmount,
        balance: fin.balance,
        status: fin.status,
        ordersCount: fin.ordersCount,
        isRegistered: false
      });
    });
    return list;
  }, [customers, sales, saleReturns, paymentLogs]);

  // Filtered Khata Accounts
  const filteredKhata = useMemo(() => {
    const baseList = customerTypeFilter === 'Walk-in Customer'
      ? walkinKhataList
      : registeredKhataList;

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
        const idMatch = item.id === selectedCustomerId;
        const nameMatch = item.name.toLowerCase() === selectedCustomerId.toLowerCase();
        if (!idMatch && !nameMatch) return false;
      }

      // 2. Balance Status Filter
      if (balanceStatusFilter === 'Outstanding' && item.balance <= 0) return false;
      if (balanceStatusFilter === 'Clear' && item.balance !== 0) return false;

      return true;
    }).sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [registeredKhataList, walkinKhataList, searchTerm, customerTypeFilter, selectedCustomerId, balanceStatusFilter]);

  // Aggregate Metrics based on Filtered Khata
  const totalVolume = filteredKhata.reduce((acc, k) => acc + k.totalSale, 0);
  const totalCollected = filteredKhata.reduce((acc, k) => acc + k.totalPaid, 0);
  const totalOutstanding = filteredKhata.reduce((acc, k) => acc + k.balance, 0);

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
      alert(err.message || 'Failed to record payment in Khata');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-500" />
            <span>Khata</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Customer balances, credit records, and payment settlements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Khata</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Row (Screen Only) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales Volume */}
        <div
          onClick={() => { setBalanceStatusFilter('All'); setCustomerTypeFilter('All'); }}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
            }`}
          title="View all customer accounts"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Total Sales</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-blue-600 dark:text-blue-400">
            Rs. {totalVolume.toLocaleString()}
          </div>
        </div>

        {/* Total Payments Collected */}
        <div
          onClick={() => setBalanceStatusFilter('Clear')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
            }`}
          title="Filter fully settled accounts"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Total Received</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            Rs. {totalCollected.toLocaleString()}
          </div>
        </div>

        {/* Total Outstanding */}
        <div
          onClick={() => setBalanceStatusFilter('Outstanding')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
            }`}
          title="Filter pending receivables"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Total Outstanding</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            Rs. {totalOutstanding.toLocaleString()}
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
          { label: 'Total Sales Volume', value: `Rs. ${totalVolume.toLocaleString()}` },
          { label: 'Total Received', value: `Rs. ${totalCollected.toLocaleString()}` },
          { label: 'Total Outstanding Due', value: `Rs. ${totalOutstanding.toLocaleString()}` }
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

                      {/* Total Paid */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {item.totalPaid.toLocaleString()}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-4 text-right font-mono font-black text-xs">
                        <span className={item.balance > 0 ? 'text-amber-500 font-black' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                          Rs. {item.balance.toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold text-xs ${item.status === 'Clear'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-500'
                          }`}>
                          {item.status === 'Clear' ? 'Clear' : 'Due'}
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

      {/* Edit Khata Account Modal */}
      {editingKhataCust && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingKhataCust(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Edit Khata Account</h3>
                  <p className="text-[11px] text-slate-400 font-bold">Review customer ledger & manage remaining balance</p>
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

            {/* Financial Ledger Metrics Banner (Total Amount, Paid Amount, Remaining Due) */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              {/* 1. Total Bill / Purchases */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Billed</span>
                  <ShoppingBag className="w-3 h-3 text-blue-500" />
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                  Rs. {Number(editingKhataCust.totalSale || 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold">Total Purchases</div>
              </div>

              {/* 2. Paid Amount */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Paid</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  Rs. {Number(editingKhataCust.totalPaid || 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold">Received so far</div>
              </div>

              {/* 3. Remaining Due Balance */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Remaining Due</span>
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                </div>
                <div className={`text-xs sm:text-sm font-black font-mono ${Number(editForm.balance) === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'
                  }`}>
                  Rs. {Number(editForm.balance || 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold">Khata Balance</div>
              </div>
            </div>

            <form onSubmit={handleSaveKhataEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Business / Shop Name</label>
                  <input
                    type="text"
                    value={editForm.businessName}
                    onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                    placeholder="e.g. Mumtaz Store"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    placeholder="03001234567"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">City / Mandi</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g. Local Mandi"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Customer Type</label>
                  <select
                    value={editForm.customerType}
                    onChange={(e) => setEditForm({ ...editForm, customerType: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="Regular Customer">Regular Party</option>
                    <option value="Walk-in Customer">Walk-in Party</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400">Receive Payment / Amount to Pay (Rs.)</label>
                    {Number(editForm.receiveAmount || 0) >= Number(editingKhataCust.initialDue || 0) && Number(editingKhataCust.initialDue || 0) > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Fully Cleared</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-500">Pending Due: Rs. {Number(editingKhataCust.initialDue || 0).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={Number(editingKhataCust.initialDue || 0)}
                      value={editForm.receiveAmount}
                      onChange={(e) => setEditForm({ ...editForm, receiveAmount: e.target.value })}
                      placeholder={`e.g. ${Number(editingKhataCust.initialDue || 0)}`}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-brand-500 font-mono ${Number(editForm.receiveAmount || 0) >= Number(editingKhataCust.initialDue || 0) && Number(editingKhataCust.initialDue || 0) > 0
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-slate-400">
                      {Number(editForm.receiveAmount || 0) > 0
                        ? `New Due after payment: Rs. ${Math.max(0, Number(editingKhataCust.initialDue || 0) - Number(editForm.receiveAmount || 0)).toLocaleString()}`
                        : 'Enter payment amount to reduce customer due.'}
                    </span>
                    {Number(editingKhataCust.initialDue || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, receiveAmount: editingKhataCust.initialDue }))}
                        className="text-brand-500 hover:underline font-bold cursor-pointer"
                      >
                        Pay Full (Rs. {Number(editingKhataCust.initialDue || 0).toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
                  disabled={isSavingEdit}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Saving...' : 'Save & Settle Payment'}</span>
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
