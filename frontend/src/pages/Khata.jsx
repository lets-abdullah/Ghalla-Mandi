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
  ChevronRight
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
        const isFullSettlement = currentInputAmount >= maxDue && maxDue > 0;

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalParty(null); }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${isCustomer ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">
                      {isCustomer ? 'Receive Khata Payment' : 'Pay Supplier Balance'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      {isCustomer ? 'Record customer settlement recovery' : 'Record payment sent to supplier'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalParty(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Party Info Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{paymentModalParty.name}</span>
                  <span className="text-[10px] font-bold text-slate-400">{paymentModalParty.city || 'Local Mandi'}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 font-semibold">{isCustomer ? 'Current Outstanding Receivable:' : 'Current Outstanding Payable:'}</span>
                  <span className={`font-mono font-black text-sm ${isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    Rs. {maxDue.toLocaleString()}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRecordSettlement} className="space-y-4">
                {/* Payment Amount & Quick Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-400">Payment Amount (PKR) *</label>
                    {isFullSettlement ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">✓ Full Settlement</span>
                    ) : currentInputAmount > 0 ? (
                      <span className="text-[11px] font-bold text-amber-500">Partial Settlement</span>
                    ) : null}
                  </div>

                  <input
                    type="number"
                    required
                    min="1"
                    max={maxDue > 0 ? maxDue : undefined}
                    value={paymentAmount}
                    onChange={(e) => {
                      const val = e.target.value;
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
                    placeholder={`e.g. ${maxDue}`}
                    autoFocus
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-black outline-none focus:border-brand-500 font-mono ${isFullSettlement
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-400 dark:border-emerald-700'
                      : 'text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}
                  />

                  {/* Quick Preset Amount Buttons */}
                  {maxDue > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(maxDue.toString())}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white transition cursor-pointer border border-brand-500/20"
                      >
                        Full (Rs. {maxDue.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.round(maxDue / 2).toString())}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                      >
                        50% (Rs. {Math.round(maxDue / 2).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.round(maxDue / 4).toString())}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                      >
                        25% (Rs. {Math.round(maxDue / 4).toLocaleString()})
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Dynamic Computation Preview */}
                <div className="p-3 rounded-2xl border bg-slate-50 dark:bg-slate-900/60 text-xs space-y-1.5 font-medium border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-slate-500">
                    <span>Current Khata Due:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">Rs. {maxDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>This Payment:</span>
                    <span className="font-mono font-bold">- Rs. {currentInputAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold">
                    <span>Remaining Balance:</span>
                    <span className={`font-mono font-black ${remainingAfterPayment <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {remainingAfterPayment <= 0 ? '✓ Rs. 0 (Fully Settled)' : `Rs. ${remainingAfterPayment.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* Payment Account / Mode */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Paid Via *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Cash', 'Bank'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition border cursor-pointer ${paymentMode === mode
                          ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        {mode === 'Bank' ? 'Bank Transfer' : 'Cash in Hand'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>

                {/* Note / Reference */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Note / Reference (Optional)</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Counter cash, cheque #..."
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>

                {/* Footer Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
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
                    disabled={isSubmitting || currentInputAmount <= 0}
                    className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
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
