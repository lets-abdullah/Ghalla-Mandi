import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, MapPin, Edit3, Trash2, CheckCircle2, DollarSign, X } from 'lucide-react';
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
    phone: '',
    city: '',
    customerType: 'Regular Party',
    openingBalance: 0
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

  const handleCreateSubmit = (e) => {
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

    addCustomer({
      name: form.name.trim(),
      phone: form.phone.trim() || 'N/A',
      city: form.city.trim() || 'Local Mandi',
      customerType: form.customerType,
      openingBalance: Math.max(0, Number(form.openingBalance) || 0)
    });

    setShowModal(false);
    setForm({
      name: '',
      phone: '',
      city: '',
      customerType: 'Regular Party',
      openingBalance: 0
    });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name.trim()) return;

    if (editingCustomer.phone.trim()) {
      const cleanDigits = editingCustomer.phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        alert(t('phoneNumberValidationAlert'));
        return;
      }
    }

    updateCustomer(editingCustomer.id, {
      name: editingCustomer.name.trim(),
      phone: editingCustomer.phone.trim() || 'N/A',
      city: editingCustomer.city.trim() || 'Local Mandi',
      customerType: editingCustomer.customerType || 'Regular Party',
      balance: Math.max(0, Number(editingCustomer.balance) || 0)
    });

    setEditingCustomer(null);
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
          <p className="text-xs text-slate-400 mt-0.5">{t('customersListSubtitle')}</p>
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
        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-brand-500" /> {t('totalRegularParties')}
          </div>
          <div className="text-2xl font-extrabold mt-1">{regularCustomers.length}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">{t('activeParties')}</div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-500" /> {t('amountToReceive')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-500">Rs. {totalReceivablesAmount.toLocaleString()}</div>
          <div className="text-xs text-emerald-500 font-bold mt-1">{t('pending')}</div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow transition-colors ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t('settledAccounts')}
          </div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-500">
            {regularCustomers.filter(c => c.balance === 0).length}
          </div>
          <div className="text-xs text-emerald-500 font-bold mt-1">{t('zeroBalance')}</div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className={`border rounded-2xl p-4 card-shadow flex flex-col md:flex-row items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Receivable', 'Settled'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === type
                  ? 'bg-brand-500 text-white shadow-sm'
                  : theme === 'dark' ? 'bg-slate-900 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'All' ? t('allCustomers') : type === 'Receivable' ? t('amountToReceive') : t('settledAccounts')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchPartyPlaceholder')}
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
                    customer.balance > 0 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    Rs. {customer.balance.toLocaleString()}
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
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('addNewRegularParty')}</h3>
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
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('customerPartyName')} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chaudhry & Sons"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('phoneMobile')}</label>
                  <input
                    type="tel"
                    placeholder="03001234567"
                    maxLength={11}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('mandiLocationCity')}</label>
                  <input
                    type="text"
                    placeholder="e.g. Sargodha"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  {t('save')}
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
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold">{t('editCustomer')}</h3>
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
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('customerPartyName')}</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('phoneMobile')}</label>
                  <input
                    type="tel"
                    placeholder="03001234567"
                    maxLength={11}
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('mandiLocationCity')}</label>
                  <input
                    type="text"
                    value={editingCustomer.city}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('receivableBalance')} (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  onWheel={(e) => e.target.blur()}
                  onFocus={(e) => e.target.select()}
                  value={editingCustomer.balance}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, balance: Number(e.target.value) })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
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
