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
  Filter,
  RefreshCw,
  BookOpen,
  X,
  ArrowRight,
  TrendingDown,
  Building,
  Phone,
  MapPin,
  Check,
  ChevronRight,
  Banknote,
  AlertTriangle,
  Landmark
} from 'lucide-react';
import {
  useERP,
  computeCustomerKhataBalance,
  computeAllCustomersFinancials,
  computeSupplierKhataBalance,
  computeAllSuppliersFinancials,
  computeLiquidBalances
} from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const Khata = () => {
  const toast = useToast();
  const {
    customers = [],
    suppliers = [],
    sales = [],
    purchases = [],
    saleReturns = [],
    purchaseReturns = [],
    paymentLogs = [],
    expenses = [],
    liquidBalances,
    recordPayment
  } = useERP();

  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Khata Party Type: 'Customer' (Receivables) or 'Supplier' (Payables) derived reactively from URL
  const typeParam = searchParams.get('type');
  const [khataPartyType, setKhataPartyType] = useState(
    typeParam && (typeParam.toLowerCase() === 'supplier' || typeParam.toLowerCase() === 'suppliers')
      ? 'Supplier'
      : 'Customer'
  );

  useEffect(() => {
    const currentType = searchParams.get('type');
    if (currentType) {
      if (currentType.toLowerCase() === 'supplier' || currentType.toLowerCase() === 'suppliers') {
        setKhataPartyType('Supplier');
      } else {
        setKhataPartyType('Customer');
      }
    } else {
      setKhataPartyType('Customer');
    }
  }, [searchParams]);

  const isCustomer = khataPartyType === 'Customer';
  const customerIdParam = searchParams.get('customerId');

  // Khata Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdParam || 'All');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState('All'); // 'All' (Due > 0) | 'Clear' (Settled Rs. 0) | 'Total' (All parties)

  // Payment Settlement Modal State
  const [paymentModalParty, setPaymentModalParty] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available liquid balance for selected payment channel
  const availableLiquidForPayMode = useMemo(() => {
    const current = liquidBalances || (computeLiquidBalances ? computeLiquidBalances(sales, purchases || [], saleReturns || [], purchaseReturns || [], paymentLogs, expenses || []) : { cashInHand: 0, bankBalance: 0, cardBalance: 0 });
    const m = String(paymentMode || 'Cash').toLowerCase();
    if (m.includes('bank') || m.includes('transfer')) return { label: 'Bank Account', amount: Number(current.bankBalance || 0) };
    if (m.includes('card') || m.includes('pos')) return { label: 'Card Account', amount: Number(current.cardBalance || 0) };
    return { label: 'Cash in Hand', amount: Number(current.cashInHand || 0) };
  }, [liquidBalances, sales, purchases, saleReturns, purchaseReturns, paymentLogs, expenses, paymentMode]);

  // Sync with URL params
  useEffect(() => {
    if (customerIdParam) {
      setSelectedCustomerId(customerIdParam);
    }
  }, [customerIdParam]);

  // 1. Customer Khata Calculations
  const {
    allCustomers,
    registeredList,
    walkinList,
    totalGrossSales,
    totalPaymentsReceived,
    totalReceivables
  } = useMemo(() => {
    return computeAllCustomersFinancials(customers, sales, paymentLogs, saleReturns);
  }, [customers, sales, paymentLogs, saleReturns]);

  // 2. Supplier Khata Calculations
  const {
    allSuppliers,
    totalGrossPurchases,
    totalPaymentsPaid,
    totalPayables
  } = useMemo(() => {
    return computeAllSuppliersFinancials(suppliers, purchases, paymentLogs, purchaseReturns);
  }, [suppliers, purchases, paymentLogs, purchaseReturns]);

  // 3. Filtered Khata Accounts
  const filteredKhata = useMemo(() => {
    const baseList = isCustomer ? allCustomers : allSuppliers;

    return baseList.filter(item => {
      // Current Due extraction
      const currentDue = isCustomer
        ? Number(item.receivableDue !== undefined ? item.receivableDue : (item.balance || 0))
        : Number(item.payableDue !== undefined ? item.payableDue : (item.balance || 0));

      if (balanceStatusFilter === 'Clear') {
        if (currentDue !== 0) return false;
      } else if (balanceStatusFilter === 'All') {
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
    return isCustomer ? totalReceivables : totalPayables;
  }, [isCustomer, totalReceivables, totalPayables]);

  const totalGrossTurnover = useMemo(() => {
    return isCustomer ? totalGrossSales : totalGrossPurchases;
  }, [isCustomer, totalGrossSales, totalGrossPurchases]);

  const totalPaidAmount = useMemo(() => {
    return isCustomer ? totalPaymentsReceived : totalPaymentsPaid;
  }, [isCustomer, totalPaymentsReceived, totalPaymentsPaid]);

  const settledAccountsCount = useMemo(() => {
    const list = isCustomer ? allCustomers : allSuppliers;
    return list.filter(k => {
      const due = isCustomer
        ? Number(k.receivableDue !== undefined ? k.receivableDue : (k.balance || 0))
        : Number(k.payableDue !== undefined ? k.payableDue : (k.balance || 0));
      return due <= 0;
    }).length;
  }, [isCustomer, allCustomers, allSuppliers]);

  const activeDueCount = useMemo(() => {
    const list = isCustomer ? allCustomers : allSuppliers;
    return list.filter(k => {
      const due = isCustomer
        ? Number(k.receivableDue !== undefined ? k.receivableDue : (k.balance || 0))
        : Number(k.payableDue !== undefined ? k.payableDue : (k.balance || 0));
      return due > 0;
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
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote(isCustomer ? `Khata settlement from ${item.name}` : `Khata settlement payment to ${item.name}`);
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    if (!paymentModalParty || isSubmitting) return;

    const maxDue = isCustomer
      ? Math.max(0, Number(paymentModalParty.receivableDue !== undefined ? paymentModalParty.receivableDue : (paymentModalParty.balance || 0)))
      : Math.max(0, Number(paymentModalParty.payableDue !== undefined ? paymentModalParty.payableDue : (paymentModalParty.balance || 0)));

    if (maxDue <= 0) {
      toast.warning('This account is already settled (Rs. 0 balance).');
      return;
    }

    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) {
      toast.warning('Please enter a valid payment amount.');
      return;
    }

    if (amt > maxDue) {
      toast.error(`Payment amount (Rs. ${amt.toLocaleString()}) cannot exceed outstanding balance of Rs. ${maxDue.toLocaleString()}.`);
      return;
    }

    if (!isCustomer && amt > availableLiquidForPayMode.amount) {
      toast.error(`Insufficient Balance in ${availableLiquidForPayMode.label} — Available: Rs. ${availableLiquidForPayMode.amount.toLocaleString()}`);
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
        date: paymentDate,
        note: paymentNote || (isCustomer ? 'Customer Khata Settlement' : 'Supplier Settlement Payment')
      });
      toast.success(`Payment of Rs. ${amt.toLocaleString()} recorded for ${paymentModalParty.name}!`);

      setPaymentModalParty(null);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err) {
      toast.error(err.message || 'Failed to record settlement payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>{isCustomer ? 'Customer Khata (Receivables)' : 'Supplier Khata (Payables)'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {isCustomer ? 'Real-time customer dues and payment settlements' : 'Real-time supplier payables and payment settlements'}
          </p>
        </div>

        <div className="no-print flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          >
            <Printer className="w-4 h-4" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Focused Outstanding Dues KPI Banner */}
      <div className="no-print">
        <div
          onClick={() => setBalanceStatusFilter('All')}
          className={`border rounded-2xl p-4 sm:p-5 card-shadow transition ${isCustomer ? 'bg-amber-500/5 border-amber-500/20' : 'bg-rose-500/5 border-rose-500/20'
            }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Clock className={`w-4 h-4 ${isCustomer ? 'text-amber-500' : 'text-rose-500'}`} />
                <span>{isCustomer ? 'Total Outstanding Receivables' : 'Total Outstanding Payables'}</span>
              </div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 font-mono tracking-tight ${isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                Rs. {totalOutstanding.toLocaleString()}
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-right">
              <span className="font-bold text-slate-900 dark:text-white text-base">{activeDueCount}</span> {isCustomer ? 'customers with active dues' : 'suppliers with pending payments'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`no-print border rounded-2xl p-3 sm:p-4 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${isCustomer ? 'customer' : 'supplier'} by name, phone, city...`}
              className={`w-full border rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-brand-500 h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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

          {/* Customer Type Filter (Customer Only) */}
          {isCustomer && (
            <div className="w-full sm:w-[170px]">
              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Customer Types</option>
                <option value="Regular Customer">Regular Customer</option>
                <option value="Walk-in Customer">Walk-in Customer</option>
              </select>
            </div>
          )}

          {/* Balance Status Filter Dropdown */}
          <div className="w-full sm:w-[180px]">
            <select
              value={balanceStatusFilter}
              onChange={(e) => setBalanceStatusFilter(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              <option value="All">Active Dues ({activeDueCount})</option>
              <option value="Clear">Settled ({settledAccountsCount})</option>
              <option value="Total">All Accounts ({activeDueCount + settledAccountsCount})</option>
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
        title={`Khata Statement — ${isCustomer ? 'Customer Receivables' : 'Supplier Payables'}`}
        filterSummary={`Status: ${balanceStatusFilter} | Search: ${searchTerm || 'None'}`}
        stats={[
          { label: isCustomer ? 'Total Receivables' : 'Total Payables', value: `Rs. ${totalOutstanding.toLocaleString()}` },
          { label: isCustomer ? 'Total Sales' : 'Total Purchases', value: `Rs. ${totalGrossTurnover.toLocaleString()}` },
          { label: isCustomer ? 'Total Received' : 'Total Paid Out', value: `Rs. ${totalPaidAmount.toLocaleString()}` },
          { label: 'Active Accounts', value: filteredKhata.length }
        ]}
      />

      {/* Redesigned Khata Register Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3 px-4">{isCustomer ? 'Customer / Shop' : 'Supplier / Vendor'}</th>
                <th className="py-3 px-4 text-right">{isCustomer ? 'Total Sales' : 'Total Purchases'}</th>
                <th className="py-3 px-4 text-right">Returns Deducted</th>
                <th className="py-3 px-4 text-right">{isCustomer ? 'Total Received' : 'Total Paid Out'}</th>
                <th className="py-3 px-4 text-right font-black">Khata Due</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
              {filteredKhata.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <EmptyState
                      icon={CheckCircle2}
                      title={balanceStatusFilter === 'Clear' ? 'No settled accounts found' : 'All accounts settled!'}
                      description={
                        balanceStatusFilter === 'Clear'
                          ? 'Accounts with zero balance will appear here once settled.'
                          : 'No accounts have pending dues matching your active search.'
                      }
                    />
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
                  const returnAmt = Number(item.returnAmount || 0);
                  const totalPaid = Number(item.totalPaid || 0);
                  const isZero = currentDue === 0;

                  return (
                    <tr
                      key={item.id}
                      className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* 1. Party Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                            {item.name}
                          </div>
                          {isWalkin && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Walk-in
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                          {item.phone && item.phone !== 'Counter Sale' && (
                            <span>📞 {item.phone}</span>
                          )}
                          {(item.city || item.businessName || item.shopName) && (
                            <span>📍 {item.city || item.businessName || item.shopName}</span>
                          )}
                        </div>
                      </td>

                      {/* 2. Total Billed Volume */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        Rs. {totalTurnover.toLocaleString()}
                      </td>

                      {/* 3. Returns Deducted */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {returnAmt > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">
                            -Rs. {returnAmt.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* 4. Total Paid */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {totalPaid.toLocaleString()}
                      </td>

                      {/* 5. Khata Due */}
                      <td className="py-3 px-4 text-right font-mono font-black text-xs">
                        {isZero ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            ✓ Rs. 0 (Settled)
                          </span>
                        ) : (
                          <span className={`text-sm ${isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                            Rs. {currentDue.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={currentDue > 0 ? (totalPaid > 0 ? 'PARTIAL' : 'UNPAID') : 'PAID'} />
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

      {/* Settlement Payment Modal with Live Dynamic Preview & Quick Chips */}
      {paymentModalParty && (() => {
        const maxDue = Math.max(0, isCustomer
          ? Number(paymentModalParty.receivableDue !== undefined ? paymentModalParty.receivableDue : (paymentModalParty.balance || 0))
          : Number(paymentModalParty.payableDue !== undefined ? paymentModalParty.payableDue : (paymentModalParty.balance || 0)));

        const currentInputAmount = Number(paymentAmount) || 0;
        const remainingAfterPayment = Math.max(0, maxDue - currentInputAmount);
        const isInsufficientBalance = currentInputAmount > availableLiquidForPayMode.amount;

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalParty(null); }}
            className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 card-shadow border my-auto transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                    <DollarSign className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      {isCustomer ? 'Receive Customer Payment' : 'Pay Supplier'}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{paymentModalParty.name}</span>
                      <span>•</span>
                      <span className="text-slate-400 font-semibold">{paymentModalParty.city || (isCustomer ? 'Customer Account' : 'Supplier Account')}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalParty(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3-Column Financial Summary Card */}
              <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 text-center">
                <div className="px-2">
                  <span className={`text-[10px] uppercase font-black tracking-wider block ${isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isCustomer ? 'Outstanding Due' : 'Outstanding Payable'}
                  </span>
                  <span className={`font-mono font-black text-sm sm:text-base mt-1 block ${isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    Rs. {maxDue.toLocaleString()}
                  </span>
                </div>
                <div className="px-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">Payment Amount</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-1 block">
                    Rs. {currentInputAmount.toLocaleString()}
                  </span>
                </div>
                <div className="px-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                    {isCustomer ? 'Remaining Due' : 'Remaining Payable'}
                  </span>
                  <span className={`font-mono font-black text-sm sm:text-base mt-1 block ${remainingAfterPayment === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                    Rs. {remainingAfterPayment.toLocaleString()}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRecordSettlement} className="space-y-4 mt-4">
                {/* Payment Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      PAYMENT AMOUNT (RS.) *
                    </label>
                    {maxDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(maxDue.toString())}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Full Amount (Rs. {maxDue.toLocaleString()})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      autoFocus
                      value={paymentAmount}
                      onWheel={(e) => e.target.blur()}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw === '') {
                          setPaymentAmount('');
                          return;
                        }
                        const num = parseInt(raw, 10) || 0;
                        if (maxDue > 0 && num > maxDue) {
                          setPaymentAmount(maxDue.toString());
                        } else {
                          setPaymentAmount(num.toString());
                        }
                      }}
                      placeholder={`Max Rs. ${maxDue.toLocaleString()}`}
                      className={`w-full border-2 rounded-2xl px-4 py-3 text-base font-black font-mono outline-none transition ${theme === 'dark'
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                    />
                  </div>
                </div>

                {/* Payment Method Selector Cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      PAYMENT METHOD *
                    </label>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Avail: Rs. {availableLiquidForPayMode.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'Cash', label: 'Cash in Hand', icon: Banknote },
                      { id: 'Bank', label: 'Bank Transfer', icon: Landmark },
                      { id: 'Card', label: 'Card', icon: CreditCard }
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const isSelected = paymentMode === mode.id || (mode.id === 'Bank' && (paymentMode === 'Bank Transfer' || paymentMode === 'Bank Account'));
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMode(mode.id)}
                          className={`relative py-3 px-2 sm:px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border-2 ${isSelected
                              ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black shadow-2xs'
                              : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{mode.label}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 absolute top-1.5 right-1.5 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Insufficient Balance Alert Banner */}
                {isInsufficientBalance && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2.5 shadow-2xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>⚠️ Insufficient Balance — Available: Rs. {availableLiquidForPayMode.amount.toLocaleString()} ({availableLiquidForPayMode.label})</span>
                  </div>
                )}

                {/* Settlement Banner */}
                {remainingAfterPayment === 0 && currentInputAmount > 0 && !isInsufficientBalance && (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>✓ Balance after payment: Rs. 0 (Fully Settled)</span>
                  </div>
                )}

                {/* Date & Note Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      PAYMENT DATE
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className={`w-full border-2 rounded-2xl px-3.5 py-2 text-xs font-bold outline-none transition ${theme === 'dark'
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
                      NOTE / REFERENCE (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g. Counter cash, cheque ref..."
                      className={`w-full border-2 rounded-2xl px-3.5 py-2 text-xs font-semibold outline-none transition ${theme === 'dark'
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentModalParty(null)}
                    className={`w-1/2 py-3 rounded-2xl font-bold text-xs transition cursor-pointer ${theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || currentInputAmount <= 0 || (!isCustomer && isInsufficientBalance)}
                    className="w-1/2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Recording...' : 'Confirm Payment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Khata;
