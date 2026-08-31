import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, PlusCircle, Search, Calendar, Filter,
  Trash2, Receipt, TrendingDown, Clock, CheckCircle2,
  Building, User, FileText, ArrowDownRight, RefreshCw, X,
  Printer, CreditCard, Wallet, AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useERP } from '../context/ERPContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const EXPENSE_CATEGORIES = [
  'Salary (Staff / Workers)',
  'Bills (Electricity / Gas / Water)',
  'Transport & Freight (Bilty / Gaari)',
  'Shop & Godown Rent',
  'Labour & Loading (Mazdoori / Palla)',
  'Bardana & Bags Purchase',
  'Fuel & Generator Diesel',
  'Tea & Hospitality (Chai Pani)',
  'Repair & Maintenance',
  'General Miscellaneous'
];

export const Expenses = () => {
  const { theme } = useTheme();
  const { t } = useLocale();
  const { expenses = [], addExpense, deleteExpense } = useERP();

  // Form State
  const [form, setForm] = useState({
    category: 'Salary (Staff / Workers)',
    amount: '',
    mode: 'Cash',
    date: new Date().toISOString().split('T')[0],
    desc: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // 'All' | 'Today' | 'This Week' | 'This Month' | 'Custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Handle Record Expense
  const handleRecordExpense = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    setIsSubmitting(true);

    const formattedDate = form.date
      ? new Date(form.date).toLocaleDateString('en-GB')
      : new Date().toLocaleDateString('en-GB');

    const newEntry = {
      date: formattedDate,
      category: form.category,
      amount: amt,
      mode: form.mode,
      desc: form.desc.trim() || `${form.category} expense`
    };

    try {
      if (addExpense) {
        await addExpense(newEntry);
      }

      // Reset Form
      setForm({
        category: 'Salary (Staff / Workers)',
        amount: '',
        mode: 'Cash',
        date: new Date().toISOString().split('T')[0],
        desc: ''
      });

      setSuccessMessage(`Expense of Rs. ${amt.toLocaleString()} recorded successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert(err.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      try {
        if (deleteExpense) {
          await deleteExpense(id);
        }
      } catch (err) {
        alert(err.message || 'Failed to delete expense');
      }
    }
  };

  // KPIs Calculations
  const processedExpenses = useMemo(() => {
    return expenses.map(e => {
      let dObj;
      if (e.rawDate) {
        dObj = new Date(e.rawDate);
      } else if (e.date && e.date.includes('/')) {
        const [d, m, y] = e.date.split('/');
        dObj = new Date(`${y}-${m}-${d}`);
      } else {
        dObj = new Date(e.date || Date.now());
      }
      return {
        ...e,
        amount: Number(e.amount || 0),
        dateObj: dObj
      };
    });
  }, [expenses]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let todayTotal = 0;
    let monthTotal = 0;
    let cashTotal = 0;
    let bankTotal = 0;
    let allTotal = 0;

    processedExpenses.forEach(e => {
      const amt = e.amount;
      allTotal += amt;

      const eDate = new Date(e.dateObj);
      eDate.setHours(0, 0, 0, 0);

      if (eDate.getTime() === today.getTime()) {
        todayTotal += amt;
      }

      if (e.dateObj.getMonth() === currentMonth && e.dateObj.getFullYear() === currentYear) {
        monthTotal += amt;
      }

      if (e.mode === 'Cash') {
        cashTotal += amt;
      } else {
        bankTotal += amt;
      }
    });

    return {
      allTotal,
      todayTotal,
      monthTotal,
      cashTotal,
      bankTotal,
      count: expenses.length
    };
  }, [processedExpenses, expenses.length]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return processedExpenses.filter(e => {
      // 1. Search
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (e.ref || '').toLowerCase().includes(search) ||
        (e.category || '').toLowerCase().includes(search) ||
        (e.desc || '').toLowerCase().includes(search) ||
        (e.mode || '').toLowerCase().includes(search);

      // 2. Category
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;

      // 3. Payment Mode
      const matchesMode = modeFilter === 'All' || e.mode === modeFilter;

      // 4. Date
      let matchesDate = true;
      const eDate = new Date(e.dateObj);
      eDate.setHours(0, 0, 0, 0);

      if (dateFilter === 'Today') {
        matchesDate = eDate.getTime() === today.getTime();
      } else if (dateFilter === 'This Week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        matchesDate = eDate >= startOfWeek;
      } else if (dateFilter === 'This Month') {
        matchesDate = eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
      } else if (dateFilter === 'Custom' && startDate && endDate) {
        const s = new Date(startDate);
        const end = new Date(endDate);
        matchesDate = eDate >= s && eDate <= end;
      }

      return matchesSearch && matchesCategory && matchesMode && matchesDate;
    });
  }, [processedExpenses, searchTerm, categoryFilter, modeFilter, dateFilter, startDate, endDate]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, page, pageSize]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Operating Expenses</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Record, track, and manage business running expenses (Salaries, Bills, Transport, Rent, Mazdoori, etc.)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          {successMessage && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Quick Record Form, Right Vouchers Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* 1. RECORD EXPENSE FORM (Screen Only) */}
        {/* ========================================================================= */}
        <div className={`no-print lg:col-span-4 border rounded-3xl p-6 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
          <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-700">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">Record New Expense</h2>
              <p className="text-[10px] text-slate-400 font-bold">Log operational payment voucher</p>
            </div>
          </div>

          <form onSubmit={handleRecordExpense} className="space-y-4">
            {/* Category */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Expense Category *
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-rose-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Amount (Rs.) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="Enter expense amount"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm font-black font-mono outline-none focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            {/* Payment Mode & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm(prev => ({ ...prev, mode: e.target.value }))}
                  className={`w-full border rounded-xl px-2.5 py-2.5 text-xs font-bold outline-none focus:border-rose-500 cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="Cash">Cash on Counter</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Online">Online / Wallet</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Expense Date
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className={`w-full border rounded-xl px-2.5 py-2.5 text-xs font-bold outline-none focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            </div>

            {/* Description / Remarks */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Enter remarks or expense details here..."
                value={form.desc}
                onChange={(e) => setForm(prev => ({ ...prev, desc: e.target.value }))}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-rose-500 resize-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Voucher...' : 'Save Expense Voucher'}</span>
            </button>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* 2. EXPENSE REGISTER / VOUCHERS LEDGER */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-8 border rounded-3xl p-6 card-shadow space-y-4 min-h-[520px] flex flex-col justify-between ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
          {/* Header & Filter Bar (Screen Only) */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">Expense Vouchers History</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom">Custom Date Range</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-rose-500 max-w-[150px] truncate ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search bar (Screen Only) */}
          <div className="no-print relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search category, description..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className={`w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border outline-none focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
            />
          </div>

          {/* ========================================================================= */}
          {/* PRINT-ONLY HEADER */}
          {/* ========================================================================= */}
          <PrintHeader
            title="Operating Expenses Register / اخراجات"
            filterSummary={`Category: ${categoryFilter} | Period: ${dateFilter}`}
            stats={[
              { label: 'Total Vouchers', value: expenses.length },
              { label: 'Filtered Expense Total', value: `Rs. ${filteredTotal.toLocaleString()}` },
              { label: 'This Month Total', value: `Rs. ${stats.monthTotal.toLocaleString()}` },
              { label: 'Cash / Bank', value: `Rs. ${stats.cashTotal.toLocaleString()} / Rs. ${stats.bankTotal.toLocaleString()}` }
            ]}
          />

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 bg-slate-900/60 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-200'
                  }`}>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Voucher #</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description / Remarks</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3 text-right font-black">Amount (Rs.)</th>
                  <th className="py-3 px-3 text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
                }`}>
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                      <span>No expense records found. Record your first expense on the left panel.</span>
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((exp) => (
                    <tr key={exp.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'
                      }`}>
                      <td className="py-3 px-3 text-slate-500 font-medium">{exp.date}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{exp.ref}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-rose-600 dark:text-rose-400">{exp.category}</span>
                      </td>
                      <td className="py-3 px-3 max-w-[200px] truncate text-slate-600 dark:text-slate-300">
                        {exp.desc}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-500">{exp.mode}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        Rs. {Number(exp.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center no-print">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete Voucher"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Print Footer */}
          <PrintFooter note="Official Business Record • Ghalla Mandi Operating Expenses" />

          {/* Pagination (Screen Only) */}
          {totalPages > 1 && (
            <div className="no-print flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
              <span className="text-slate-400 font-medium">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Expenses;
