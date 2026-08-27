import React, { useState, useEffect } from 'react';
import { Users, User, Search, Plus, Phone, MapPin, Edit3, Trash2, CheckCircle2, DollarSign, X } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useNavigate } from 'react-router-dom';

export const Customers = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState('All'); // 'All' | 'Receivable' | 'Settled'
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

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
    notes: ''
  });

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        else if (editingCustomer) setEditingCustomer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, editingCustomer]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert(t('customerPartyName') + ' ' + t('required'));
      return;
    }

    if (form.phone.trim()) {
      const cleanDigits = form.phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        alert(t('phoneNumberValidationAlert'));
        return;
      }
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
        notes: form.notes.trim()
      });

      setShowModal(false);
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
        notes: ''
      });
    } catch (err) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name.trim()) return;

    if (editingCustomer.phone && editingCustomer.phone.trim()) {
      const cleanDigits = editingCustomer.phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        alert(t('phoneNumberValidationAlert'));
        return;
      }
    }

    try {
      await updateCustomer(editingCustomer.id, {
        name: editingCustomer.name.trim(),
        shopName: editingCustomer.shopName ? editingCustomer.shopName.trim() : '',
        phone: editingCustomer.phone ? editingCustomer.phone.trim() : 'N/A',
        whatsapp: editingCustomer.whatsapp ? editingCustomer.whatsapp.trim() : '',
        city: editingCustomer.city ? editingCustomer.city.trim() : 'Local Mandi',
        address: editingCustomer.address ? editingCustomer.address.trim() : '',
        customerType: editingCustomer.customerType || 'Regular Party',
        balance: Math.max(0, Number(editingCustomer.balance) || 0),
        creditLimit: Math.max(0, Number(editingCustomer.creditLimit) || 0),
        paymentTerms: editingCustomer.paymentTerms || 'Cash / Credit',
        cnic: editingCustomer.cnic ? editingCustomer.cnic.trim() : '',
        notes: editingCustomer.notes ? editingCustomer.notes.trim() : ''
      });

      setEditingCustomer(null);
    } catch (err) {
      alert(err.message || 'Failed to update customer');
    }
  };

  const regularCustomers = customers.filter(c => (c.customerType || 'Regular Party') === 'Regular Party');
  const totalReceivablesAmount = regularCustomers.reduce((acc, c) => acc + Math.max(0, c.balance), 0);

  const filteredCustomers = regularCustomers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.phone.toLowerCase().includes(search.toLowerCase()) ||
                          c.city.toLowerCase().includes(search.toLowerCase());

    if (filterType === 'All') return matchesSearch;
    if (filterType === 'Receivable') return matchesSearch && c.balance > 0;
    if (filterType === 'Settled') return matchesSearch && c.balance === 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            {t('customersListTitle')}
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewRegularParty')}</span>
        </button>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterType('All')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-blue-500/30 text-white' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80 text-slate-800'
          }`}
          title="Click to view all customer parties"
        >
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" /> {t('totalRegularParties')}
          </div>
          <div className="text-2xl font-extrabold mt-1 font-mono text-blue-600 dark:text-blue-400">{regularCustomers.length}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-1">{t('activeParties')} • View All</div>
        </div>

        <div
          onClick={() => setFilterType('Receivable')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200/80 text-slate-800'
          }`}
          title="Click to filter customers with unpaid balance"
        >
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-amber-600" /> {t('amountToReceive')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-amber-600 dark:text-amber-400 font-mono">Rs. {(Number(totalReceivablesAmount) || 0).toLocaleString()}</div>
          <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-1">{t('pending')} • Filter Unpaid</div>
        </div>

        <div
          onClick={() => setFilterType('Settled')}
          className={`border rounded-2xl p-5 card-shadow card-hover transition-all cursor-pointer active:scale-98 ${
            theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200/80 text-slate-800'
          }`}
          title="Click to filter settled customer accounts"
        >
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t('settledAccounts')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
            {regularCustomers.filter(c => (Number(c.balance) || 0) === 0).length}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">{t('zeroBalance')} • Filter Settled</div>
        </div>
      </div>

      {/* Filter & Search Controls (English Dropdown) */}
      <div className={`border rounded-2xl p-4 card-shadow flex flex-col md:flex-row items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`w-full sm:w-56 border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="All">All Customer Accounts</option>
            <option value="Receivable">Pending Khata (Receivables)</option>
            <option value="Settled">Settled (Zero Balance)</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search party by name, shop or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Customer Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs font-medium">
            {t('noCustomerFound')}
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <div
              key={customer.id}
              className={`border rounded-2xl p-5 card-shadow flex flex-col justify-between space-y-4 transition ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight">{customer.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-brand-500" /> {customer.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCustomer(customer)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                      title={t('edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`${t('delete')} ${customer.name}?`)) {
                          deleteCustomer(customer.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition cursor-pointer"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-500 border border-brand-500/30">
                      {t('regularParty')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{t('receivableBalance')}</div>
                  <div className={`text-base font-extrabold ${
                    Number(customer.balance || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    Rs. {(Number(customer.balance) || 0).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/ledger')}
                  className="px-3 py-1.5 text-xs font-extrabold text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 rounded-xl transition cursor-pointer"
                >
                  {t('viewLedger')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-2xl w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-500" />
                <h3 className="text-base font-black uppercase tracking-wide">{t('addNewRegularParty')}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              {/* 1. Basic & Business Identity */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Basic & Business Identity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Aslam"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Shop / Firm Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aslam Traders"
                      value={form.shopName}
                      onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Customer Type
                    </label>
                    <select
                      value={form.customerType}
                      onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Regular Party">Regular Party</option>
                      <option value="Wholesale Buyer">Wholesale Buyer</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Farmer / Producer">Farmer / Producer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Contact & Mandi Location */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contact & Mandi Location</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Phone / Mobile *
                    </label>
                    <input
                      type="tel"
                      placeholder="03001234567"
                      maxLength={11}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      WhatsApp / Alt Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="03217654321"
                      maxLength={11}
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      City / Mandi *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sargodha"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Address / Shop #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shop # 14, Block B"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Financial & Payment Terms */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Financial & Payment Terms</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Opening Balance (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.openingBalance || ''}
                      onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Credit Limit (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 500000"
                      value={form.creditLimit || ''}
                      onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={form.paymentTerms}
                      onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Cash / Credit">Cash / Regular Khata</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="7 Days">Weekly (7 Days)</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">Monthly (30 Days)</option>
                      <option value="Seasonal">Seasonal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Identification & Notes */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      CNIC / National ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 38403-1234567-1"
                      value={form.cnic}
                      onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Notes / Guarantor Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reference: Haji Akram Shop # 4"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Customer Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditingCustomer(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-3.5 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-500" />
                <span>Edit Customer Profile</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
                title={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3">
              {/* 1. Basic & Business Identity */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400">
                  Basic & Business Identity
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.name || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Shop / Firm Name
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.shopName || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, shopName: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Customer Type
                    </label>
                    <select
                      value={editingCustomer.customerType || 'Regular Party'}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, customerType: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Regular Party">Regular Party</option>
                      <option value="Wholesale Buyer">Wholesale Buyer</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Farmer / Producer">Farmer / Producer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Contact & Location */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contact & Location</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Phone / Mobile
                    </label>
                    <input
                      type="tel"
                      maxLength={11}
                      value={editingCustomer.phone || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      WhatsApp / Alt Phone
                    </label>
                    <input
                      type="tel"
                      maxLength={11}
                      value={editingCustomer.whatsapp || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      City / Mandi
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.city || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Address / Shop #
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.address || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Financial & Payment Terms */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Financial & Payment Terms</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Receivable Balance (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editingCustomer.balance !== undefined ? editingCustomer.balance : ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, balance: Number(e.target.value) })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Credit Limit (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingCustomer.creditLimit || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, creditLimit: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={editingCustomer.paymentTerms || 'Cash / Credit'}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, paymentTerms: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Cash / Credit">Cash / Regular Khata</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="7 Days">Weekly (7 Days)</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">Monthly (30 Days)</option>
                      <option value="Seasonal">Seasonal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Identification & Notes */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      CNIC / National ID
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.cnic || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, cnic: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 font-mono ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Notes / Guarantor Reference
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.notes || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                      className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="w-1/3 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer active:scale-98"
                >
                  {t('saveChanges')}
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
