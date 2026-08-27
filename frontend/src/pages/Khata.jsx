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
  Phone
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Khata = () => {
  const { customers = [], sales = [], saleReturns = [], recordPayment } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const customerIdParam = searchParams.get('customerId');

  // View Mode: 'table' | 'card'
  const [viewMode, setViewMode] = useState('table');

  // Khata Filters State
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdParam || 'All');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState('All'); // 'All' | 'Outstanding' | 'Clear'
  const [search, setSearch] = useState('');

  // Payment Modal State
  const [paymentModalCust, setPaymentModalCust] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Build Financial Position List for each Customer
  const customerKhataList = useMemo(() => {
    return customers.map(cust => {
      const custSales = (sales || []).filter(s => s.customerId === cust.id || s.partyName === cust.name);
      const totalSale = custSales.reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
      const totalPaid = custSales.reduce((acc, s) => acc + Number(s.paidAmount || (s.status === 'Paid' ? s.amount : 0)), 0);
      const returnAmt = (saleReturns || []).filter(r => r.customerId === cust.id || r.customerName === cust.name).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
      
      const balance = Number(cust.balance !== undefined ? cust.balance : Math.max(0, totalSale - totalPaid - returnAmt));
      const isWalkin = (cust.customerType || '').toLowerCase().includes('walk-in');
      const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';

      // Status determination
      const status = balance > 0 ? 'Due' : 'Clear';

      return {
        id: cust.id,
        name: cust.name,
        businessName: cust.businessName || cust.shopName || '',
        phone: cust.phone || '',
        city: cust.city || 'Local Mandi',
        customerType: custType,
        totalSale,
        totalPaid,
        returnAmount: returnAmt,
        balance,
        status,
        ordersCount: custSales.length
      };
    });
  }, [customers, sales, saleReturns]);

  // Filtered Khata Accounts
  const filteredKhata = useMemo(() => {
    return customerKhataList.filter(item => {
      // 1. Text Search
      const q = search.toLowerCase().trim();
      if (q) {
        const nameMatch = item.name.toLowerCase().includes(q);
        const businessMatch = item.businessName.toLowerCase().includes(q);
        const phoneMatch = item.phone.toLowerCase().includes(q);
        const cityMatch = item.city.toLowerCase().includes(q);
        if (!nameMatch && !businessMatch && !phoneMatch && !cityMatch) return false;
      }

      // 2. Customer Type Filter
      const isWalkin = item.customerType.toLowerCase().includes('walk-in');
      if (customerTypeFilter === 'Regular Customer' && isWalkin) return false;
      if (customerTypeFilter === 'Walk-in Customer' && !isWalkin) return false;

      // 3. Selected Customer Filter
      if (selectedCustomerId !== 'All') {
        const idMatch = item.id === selectedCustomerId;
        const nameMatch = item.name.toLowerCase() === selectedCustomerId.toLowerCase();
        if (!idMatch && !nameMatch) return false;
      }

      // 4. Balance Status Filter
      if (balanceStatusFilter === 'Outstanding' && item.balance <= 0) return false;
      if (balanceStatusFilter === 'Clear' && item.balance !== 0) return false;

      return true;
    });
  }, [customerKhataList, search, customerTypeFilter, selectedCustomerId, balanceStatusFilter]);

  // Aggregate Metrics based on Filtered Khata
  const totalVolume = filteredKhata.reduce((acc, k) => acc + k.totalSale, 0);
  const totalCollected = filteredKhata.reduce((acc, k) => acc + k.totalPaid, 0);
  const totalOutstanding = filteredKhata.reduce((acc, k) => acc + k.balance, 0);

  const isAnyFilterActive = (
    search !== '' ||
    customerTypeFilter !== 'All' ||
    selectedCustomerId !== 'All' ||
    balanceStatusFilter !== 'All'
  );

  const resetAllFilters = () => {
    setSearch('');
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

    const amt = Math.max(1, Number(paymentAmount) || 0);
    setIsSubmitting(true);
    try {
      await recordPayment({
        partyId: paymentModalCust.id,
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-500" />
            <span>Khata</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Customer balance settlement and credit accounts
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
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Khata</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales Volume */}
        <div
          onClick={() => { setBalanceStatusFilter('All'); setCustomerTypeFilter('All'); }}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
          }`}
          title="View all customer accounts"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" /> Total Sales
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
            Rs. {totalVolume.toLocaleString()}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-0.5">
            {filteredKhata.length} Active Accounts
          </div>
        </div>

        {/* Total Payments Collected */}
        <div
          onClick={() => setBalanceStatusFilter('Clear')}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80'
          }`}
          title="Filter fully settled accounts"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Total Received
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
            Rs. {totalCollected.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
            {filteredKhata.filter(k => k.balance === 0).length} Accounts Settled
          </div>
        </div>

        {/* Total Outstanding */}
        <div
          onClick={() => setBalanceStatusFilter('Outstanding')}
          className={`border rounded-2xl p-4 card-shadow card-hover transition-all cursor-pointer ${
            theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80'
          }`}
          title="Filter pending receivables"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" /> Total Outstanding
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
            Rs. {totalOutstanding.toLocaleString()}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-0.5">
            {filteredKhata.filter(k => k.balance > 0).length} Accounts with Due
          </div>
        </div>
      </div>

      {/* Khata Filter Toolbar */}
      <div className={`border rounded-3xl p-4 card-shadow space-y-3 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* 2. Balance Status */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Balance Status</span>
            </label>
            <select
              value={balanceStatusFilter}
              onChange={(e) => setBalanceStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Balances</option>
              <option value="Outstanding">Due / Outstanding</option>
              <option value="Clear">Clear (Zero Balance)</option>
            </select>
          </div>

          {/* 3. Search Box */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Khata</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer, phone, city..."
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
        /* COMPACT CARD VIEW (No horizontal scroll, clean cards) */
        /* ========================================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredKhata.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No customer accounts found matching the selected Khata filters.
            </div>
          ) : (
            filteredKhata.map(item => {
              const isWalkin = item.customerType.toLowerCase().includes('walk-in');

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border card-shadow flex flex-col justify-between transition ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {item.name}
                        </h4>
                        {item.businessName && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {item.businessName}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold shrink-0 border ${
                        isWalkin
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                          : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                      }`}>
                        {isWalkin ? 'Walk-in' : 'Regular'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                      {item.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.phone}</span>
                        </div>
                      )}
                      {item.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.city}</span>
                        </div>
                      )}
                    </div>

                    {/* Sales / Paid summary */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Total Sales:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          Rs. {item.totalSale.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Total Paid:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rs. {item.totalPaid.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Balance</div>
                      <div className="font-mono font-black text-xs">
                        {item.balance > 0 ? (
                          <span className="text-amber-500">Rs. {item.balance.toLocaleString()} Due</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">Rs. 0 Clear</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.balance > 0 ? (
                        <button
                          onClick={() => openReceiveModal(item)}
                          className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                          title="Receive Payment"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Receive</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <Check className="w-3 h-3" /> Clear
                        </span>
                      )}

                      <button
                        onClick={() => navigate(`/ledger?customerId=${item.id}`)}
                        className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-brand-400' 
                            : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
                        }`}
                        title="View Ledger"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
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
        /* COMPACT TABLE VIEW (No horizontal scroll) */
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
                  <th className="py-3 px-4 text-right">Total Sale</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right font-black">Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${
                theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isWalkin
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                              : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                          }`}>
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

                        {/* Balance Due */}
                        <td className="py-3 px-4 text-right font-mono font-black text-xs">
                          {item.balance > 0 ? (
                            <span className="text-amber-500 font-black">
                              Rs. {item.balance.toLocaleString()} Due
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Rs. 0 (Clear)
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                            item.status === 'Clear'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }`}>
                            {item.status === 'Clear' ? 'Clear' : 'Due'}
                          </span>
                        </td>

                        {/* Actions: Receive Payment | View Ledger */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Receive Payment */}
                            {item.balance > 0 ? (
                              <button
                                onClick={() => openReceiveModal(item)}
                                className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                                title="Receive Payment for this Khata"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Receive</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <Check className="w-3 h-3" /> Clear
                              </span>
                            )}

                            {/* View Ledger */}
                            <button
                              onClick={() => navigate(`/ledger?customerId=${item.id}`)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                                theme === 'dark' 
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
      )}

      {/* Receive Khata Payment Modal */}
      {paymentModalCust && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalCust(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
            <div className={`rounded-2xl p-3.5 space-y-2 border text-xs font-semibold ${
              theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
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
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-extrabold outline-none focus:border-brand-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalCust(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
    </div>
  );
};

export default Khata;
