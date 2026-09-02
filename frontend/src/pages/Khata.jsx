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
  UserCheck,
  Filter,
  RefreshCw,
  BookOpen,
  X,
  Edit3,
  Building2,
  Check
} from 'lucide-react';
import {
  useERP,
  computeCustomerKhataBalance,
  computeAllCustomersFinancials,
  computeSupplierKhataBalance,
  computeAllSuppliersFinancials
} from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const Khata = () => {
  const {
    customers = [],
    suppliers = [],
    sales = [],
    purchases = [],
    saleReturns = [],
    purchaseReturns = [],
    paymentLogs = [],
    recordPayment,
    updateCustomer
  } = useERP();

  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Khata Party Type: 'Customer' (Receivables) or 'Supplier' (Payables)
  const initialType = searchParams.get('type');
  const [khataPartyType, setKhataPartyType] = useState(
    initialType && (initialType.toLowerCase() === 'supplier' || initialType.toLowerCase() === 'suppliers')
      ? 'Supplier'
      : 'Customer'
  );

  const customerIdParam = searchParams.get('customerId');

  // Khata Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdParam || 'All');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState('All'); // 'All' (Outstanding Due > 0) | 'Clear' (Settled Rs. 0 Due)

  // Payment Settlement Modal State
  const [paymentModalParty, setPaymentModalParty] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with URL params
  useEffect(() => {
    if (customerIdParam) {
      setSelectedCustomerId(customerIdParam);
    }
  }, [customerIdParam]);

  // 1. Customer Khata Calculations
  const { allCustomers, registeredList, walkinList } = useMemo(() => {
    return computeAllCustomersFinancials(customers, sales, paymentLogs, saleReturns);
  }, [customers, sales, paymentLogs, saleReturns]);

  // 2. Supplier Khata Calculations
  const { allSuppliers } = useMemo(() => {
    return computeAllSuppliersFinancials(suppliers, purchases, paymentLogs, purchaseReturns);
  }, [suppliers, purchases, paymentLogs, purchaseReturns]);

  // Active Base List according to Party Type
  const isCustomer = khataPartyType === 'Customer';

  // 3. Filtered Khata Accounts with Strict Invariant (Only Due > 0 Shown by Default)
  const filteredKhata = useMemo(() => {
    const baseList = isCustomer
      ? (customerTypeFilter === 'Walk-in Customer'
        ? walkinList
        : (customerTypeFilter === 'Regular Customer' ? registeredList : allCustomers))
      : allSuppliers;

    return baseList.filter(item => {
      // Current Due extraction
      const currentDue = isCustomer
        ? Number(item.receivableDue !== undefined ? item.receivableDue : (item.balance || 0))
        : Number(item.payableDue !== undefined ? item.payableDue : (item.balance || 0));

      // STRICT KHATA INVARIANT:
      // By default ('All' or 'Outstanding'), ONLY parties with current Due > 0 are shown!
      // As soon as Due is 0, the party is automatically hidden from the Khata view.
      if (balanceStatusFilter === 'Clear') {
        if (currentDue !== 0) return false;
      } else {
        if (currentDue <= 0) return false;
      }

      // Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const phoneMatch = (item.phone || '').toLowerCase().includes(q);
        const cityMatch = (item.city || '').toLowerCase().includes(q);
        const bizMatch = (item.businessName || item.shopName || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !cityMatch && !bizMatch) return false;
      }

      // Specific Party Selection Filter
      if (selectedCustomerId !== 'All') {
        const idMatch = String(item.id) === String(selectedCustomerId);
        const nameMatch = (item.name || '').toLowerCase() === selectedCustomerId.toLowerCase();
        if (!idMatch && !nameMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const balA = isCustomer
        ? Number(a.receivableDue !== undefined ? a.receivableDue : (a.balance || 0))
        : Number(a.payableDue !== undefined ? a.payableDue : (a.balance || 0));
      const balB = isCustomer
        ? Number(b.receivableDue !== undefined ? b.receivableDue : (b.balance || 0))
        : Number(b.payableDue !== undefined ? b.payableDue : (b.balance || 0));
      if (balB !== balA) return balB - balA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [
    isCustomer,
    allCustomers,
    registeredList,
    walkinList,
    allSuppliers,
    searchTerm,
    customerTypeFilter,
    selectedCustomerId,
    balanceStatusFilter
  ]);

  // Aggregate Metrics
  const totalOutstanding = useMemo(() => {
    const list = isCustomer ? allCustomers : allSuppliers;
    return list.reduce((acc, k) => {
      const due = isCustomer
        ? Number(k.receivableDue !== undefined ? k.receivableDue : (k.balance > 0 ? k.balance : 0))
        : Number(k.payableDue !== undefined ? k.payableDue : (k.balance > 0 ? k.balance : 0));
      return acc + (due > 0 ? due : 0);
    }, 0);
  }, [isCustomer, allCustomers, allSuppliers]);

  const settledAccountsCount = useMemo(() => {
    const list = isCustomer ? allCustomers : allSuppliers;
    return list.filter(k => {
      const due = isCustomer
        ? Number(k.receivableDue !== undefined ? k.receivableDue : (k.balance || 0))
        : Number(k.payableDue !== undefined ? k.payableDue : (k.balance || 0));
      return due <= 0;
    }).length;
  }, [isCustomer, allCustomers, allSuppliers]);

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

  const openPaymentModal = (item) => {
    const due = isCustomer
      ? Number(item.receivableDue !== undefined ? item.receivableDue : (item.balance || 0))
      : Number(item.payableDue !== undefined ? item.payableDue : (item.balance || 0));
    setPaymentModalParty(item);
    setPaymentAmount(due > 0 ? due.toString() : '');
    setPaymentMode('Cash');
    setPaymentNote(`Khata clearance for ${item.name}`);
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    if (!paymentModalParty || isSubmitting) return;

    const maxDue = isCustomer
      ? Math.max(0, Number(paymentModalParty.receivableDue !== undefined ? paymentModalParty.receivableDue : (paymentModalParty.balance || 0)))
      : Math.max(0, Number(paymentModalParty.payableDue !== undefined ? paymentModalParty.payableDue : (paymentModalParty.balance || 0)));

    if (maxDue <= 0) {
      alert('This account is already settled (Rs. 0 balance). No payment is required.');
      return;
    }

    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    if (amt > maxDue) {
      alert(`Payment amount (Rs. ${amt.toLocaleString()}) cannot exceed the outstanding balance of Rs. ${maxDue.toLocaleString()}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId: paymentModalParty.id && !String(paymentModalParty.id).startsWith('walkin-') ? paymentModalParty.id : null,
        partyName: paymentModalParty.name,
        partyType: isCustomer ? 'Customer' : 'Supplier',
        amount: amt,
        paymentMode: paymentMode,
        note: paymentNote || (isCustomer ? 'Customer Khata Settlement' : 'Supplier Settlement Payment')
      });

      setPaymentModalParty(null);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err) {
      alert(err.message || 'Failed to record settlement payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Banner & Party Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            <span>{isCustomer ? 'Customer Khata (Receivables)' : 'Supplier Khata (Payables)'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Active credit register • Settled accounts (Rs. 0 Due) automatically hidden
          </p>
        </div>

        {/* Khata Mode Toggle (Customer vs Supplier) & Print */}
        <div className="no-print flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setKhataPartyType('Customer');
                setSearchParams({ type: 'customer' });
                resetAllFilters();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${isCustomer
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-500'
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer Khata</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setKhataPartyType('Supplier');
                setSearchParams({ type: 'supplier' });
                resetAllFilters();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${!isCustomer
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-500'
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Supplier Khata</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer text-slate-700 dark:text-slate-200 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Total Outstanding Dues */}
        <div
          onClick={() => setBalanceStatusFilter('All')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${balanceStatusFilter === 'All'
            ? (isCustomer ? 'ring-2 ring-amber-500' : 'ring-2 ring-rose-500')
            : ''
            } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
            }`}
          title="Active outstanding Khata accounts"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isCustomer ? 'text-amber-600' : 'text-rose-600'}`} />
              <span>{isCustomer ? 'Customer Receivables (Outstanding)' : 'Supplier Payables (Outstanding)'}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Active Khata
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 tracking-tight ${isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            Rs. {totalOutstanding.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">
            {filteredKhata.length} parties currently have Due &gt; 0
          </div>
        </div>

        {/* 2. Settled Accounts (Hidden from Khata) */}
        <div
          onClick={() => setBalanceStatusFilter(balanceStatusFilter === 'Clear' ? 'All' : 'Clear')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow card-hover transition-all cursor-pointer ${balanceStatusFilter === 'Clear'
            ? 'ring-2 ring-emerald-500'
            : ''
            } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
            }`}
          title="Click to view settled accounts"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settled Accounts (Rs. 0 Due)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {balanceStatusFilter === 'Clear' ? 'Viewing Settled' : 'Hidden from Khata'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            {settledAccountsCount} Accounts
          </div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">
            {balanceStatusFilter === 'Clear' ? 'Showing Rs. 0 balance accounts' : 'Automatically hidden (Click to view)'}
          </div>
        </div>
      </div>

      {/* Khata Filter Toolbar */}
      <div className={`no-print border rounded-3xl p-3.5 sm:p-4 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-brand-500" />
              <span>Search {isCustomer ? 'Customer' : 'Supplier'}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search by name, phone, city...`}
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

          {/* Customer Type Filter (Customer Mode Only) */}
          {isCustomer && (
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
                <option value="All">All Types</option>
                <option value="Regular Customer">Regular Customers</option>
                <option value="Walk-in Customer">Walk-in Customers</option>
              </select>
            </div>
          )}

          {/* Balance View Toggle */}
          <div className="w-full sm:w-[180px]">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Khata View Mode</span>
            </label>
            <select
              value={balanceStatusFilter}
              onChange={(e) => setBalanceStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">Outstanding Dues Only (Due &gt; 0)</option>
              <option value="Clear">Settled Accounts Only (Rs. 0 Due)</option>
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

      {/* PRINT-ONLY HEADER */}
      <PrintHeader
        title={`${isCustomer ? 'Customer' : 'Supplier'} Khata Register`}
        filterSummary={`View: ${balanceStatusFilter === 'Clear' ? 'Settled Accounts' : 'Outstanding Dues Only'}`}
        stats={[
          { label: 'Accounts', value: filteredKhata.length },
          { label: 'Total Outstanding', value: `Rs. ${totalOutstanding.toLocaleString()}` },
          { label: 'Settled Accounts', value: `${settledAccountsCount} Accounts` }
        ]}
      />

      {/* COMPACT KHATA TABLE VIEW */}
      <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">{isCustomer ? 'Customer' : 'Supplier'}</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4 text-right">{isCustomer ? 'Total Sales' : 'Total Purchases'}</th>
                <th className="py-3 px-4 text-right">{isCustomer ? 'Total Received' : 'Total Paid'}</th>
                <th className="py-3 px-4 text-right">Khata Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filteredKhata.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {balanceStatusFilter === 'Clear'
                      ? 'No settled accounts found.'
                      : '✓ All accounts are fully settled! No outstanding Khata dues remaining.'}
                  </td>
                </tr>
              ) : (
                filteredKhata.map(item => {
                  const isWalkin = item.customerType && item.customerType.toLowerCase().includes('walk-in');
                  const currentDue = isCustomer
                    ? Number(item.receivableDue !== undefined ? item.receivableDue : (item.balance || 0))
                    : Number(item.payableDue !== undefined ? item.payableDue : (item.balance || 0));
                  const totalTurnover = isCustomer
                    ? Number(item.totalSale !== undefined ? item.totalSale : (item.grossSale || 0))
                    : Number(item.totalPurchase !== undefined ? item.totalPurchase : (item.grossPurchase || 0));
                  const totalPaid = Number(item.totalPaid || 0);

                  return (
                    <tr
                      key={item.id}
                      className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* Party Name */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        {(item.city || item.businessName || item.shopName) && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            📍 {item.city || 'Mandi'} {item.businessName || item.shopName ? `• ${item.businessName || item.shopName}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Party Type */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                          {isCustomer ? (isWalkin ? 'Walk-in' : 'Regular') : 'Supplier'}
                        </span>
                      </td>

                      {/* Turnover */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        Rs. {totalTurnover.toLocaleString()}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {totalPaid.toLocaleString()}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right font-mono font-black text-xs">
                        {currentDue > 0 ? (
                          <span className={`${isCustomer ? 'text-amber-500 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} font-black`}>
                            Rs. {currentDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold">Rs. 0 (Settled)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-bold ${currentDue > 0
                          ? (isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')
                          : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                          {currentDue > 0 ? 'Due' : 'Settled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {currentDue > 0 && (
                            <button
                              onClick={() => openPaymentModal(item)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${isCustomer
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white'
                                }`}
                              title={`Settle ${isCustomer ? 'Receivable' : 'Payable'}`}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{isCustomer ? 'Receive' : 'Pay'}</span>
                            </button>
                          )}

                          {/* View Complete Ledger History */}
                          <button
                            onClick={() => {
                              if (isCustomer) {
                                navigate(item.isRegistered !== false ? `/ledger?customerId=${item.id}` : `/ledger?customerId=${encodeURIComponent(item.name)}`);
                              } else {
                                navigate(`/ledger?type=supplier&customerId=${item.id}`);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400'
                              : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                              }`}
                            title="View complete historical ledger statements"
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
      <PrintFooter note={`Official Business Record • Ghalla Mandi ${isCustomer ? 'Customer' : 'Supplier'} Khata Register`} />

      {/* Settlement Payment Modal */}
      {paymentModalParty && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalParty(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>{isCustomer ? 'Receive Customer Khata Payment' : 'Pay Supplier Khata Balance'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalParty(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Khata Summary Box */}
            <div className={`rounded-2xl p-3.5 space-y-2 border text-xs font-semibold ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between items-center text-slate-400">
                <span>{isCustomer ? 'Customer:' : 'Supplier:'}</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{paymentModalParty.name}</span>
              </div>
              <div className={`flex justify-between items-center ${isCustomer ? 'text-amber-600' : 'text-rose-600'} font-extrabold pt-1 border-t border-slate-200 dark:border-slate-700`}>
                <span>Outstanding Due:</span>
                <span className="text-sm font-black">
                  Rs. {(isCustomer
                    ? Number(paymentModalParty.receivableDue !== undefined ? paymentModalParty.receivableDue : (paymentModalParty.balance || 0))
                    : Number(paymentModalParty.payableDue !== undefined ? paymentModalParty.payableDue : (paymentModalParty.balance || 0))
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordSettlement} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Payment Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Math.max(0, isCustomer
                    ? Number(paymentModalParty.receivableDue !== undefined ? paymentModalParty.receivableDue : (paymentModalParty.balance || 0))
                    : Number(paymentModalParty.payableDue !== undefined ? paymentModalParty.payableDue : (paymentModalParty.balance || 0))
                  )}
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const maxDue = isCustomer
                      ? Math.max(0, Number(paymentModalParty.receivableDue !== undefined ? paymentModalParty.receivableDue : (paymentModalParty.balance || 0)))
                      : Math.max(0, Number(paymentModalParty.payableDue !== undefined ? paymentModalParty.payableDue : (paymentModalParty.balance || 0)));
                    if (val === '') {
                      setPaymentAmount('');
                      return;
                    }
                    const num = Number(val);
                    if (num > maxDue) {
                      setPaymentAmount(maxDue.toString());
                    } else if (num < 0) {
                      setPaymentAmount('0');
                    } else {
                      setPaymentAmount(val);
                    }
                  }}
                  placeholder="Enter payment amount"
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
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Note</label>
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
                  onClick={() => setPaymentModalParty(null)}
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
                  <span>{isSubmitting ? 'Saving...' : 'Confirm Settlement'}</span>
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
