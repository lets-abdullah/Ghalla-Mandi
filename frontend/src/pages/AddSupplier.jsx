import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, ArrowLeft, Building2, Phone, MapPin, Package, Check, Plus, Search } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const AddSupplier = () => {
  const { products, addSupplier } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [prodSearch, setProdSearch] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: 'Sargodha',
    openingBalance: 0,
    suppliedProductIds: []
  });

  const toggleProductSelection = (productId) => {
    setForm(prev => {
      const exists = prev.suppliedProductIds.includes(productId);
      return {
        ...prev,
        suppliedProductIds: exists
          ? prev.suppliedProductIds.filter(id => id !== productId)
          : [...prev.suppliedProductIds, productId]
      };
    });
  };

  const selectAllProducts = () => {
    setForm(prev => ({
      ...prev,
      suppliedProductIds: products.map(p => p.id)
    }));
  };

  const clearProductSelection = () => {
    setForm(prev => ({
      ...prev,
      suppliedProductIds: []
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    addSupplier(form);
    navigate('/suppliers');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/suppliers"
            className={`p-2 rounded-xl border transition ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-brand-500" />
              {t('addNewSupplier')}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`p-6 rounded-3xl border card-shadow space-y-5 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
          <h2 className="text-base font-extrabold pb-3 border-b border-slate-200 dark:border-slate-700">
            {t('supplierFirmName')}
          </h2>

          {/* Firm Name */}
          <div>
            <label className="text-xs font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
              {t('supplierFirmName')} *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Sargodha Traders"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full border rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div>
              <label className="text-xs font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
                {t('phoneMobile')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="03001234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`w-full border rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            </div>

            {/* Mandi City */}
            <div>
              <label className="text-xs font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
                {t('mandiLocationCity')}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Sargodha"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={`w-full border rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Supplied Products Linkage Section */}
        <div className={`p-6 rounded-3xl border card-shadow space-y-4 transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-500" />
                {t('selectSuppliedCommodities')}
              </h2>
              <p className="text-xs text-slate-400">{t('selectCommodityProvidedSub')}</p>
            </div>
            {products.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllProducts}
                  className="font-bold text-brand-500 hover:underline cursor-pointer"
                >
                  {t('selectAll')}
                </button>
                <span className="text-slate-400">•</span>
                <button
                  type="button"
                  onClick={clearProductSelection}
                  className="font-bold text-slate-400 hover:underline cursor-pointer"
                >
                  {t('clearAll')}
                </button>
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border rounded-2xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              {t('noCommoditiesInCatalog')}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                {/* Search box inside the grid container */}
                <div className={`p-3 rounded-2xl border flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder={t('searchCommoditiesPlaceholder')}
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold outline-none text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                {products
                  .filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()))
                  .map(p => {
                    const isSelected = form.suppliedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductSelection(p.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${isSelected
                            ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 font-bold'
                            : theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                      >
                        <div>
                          <div className="text-xs font-extrabold">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.category} • Rs. {p.sellingPrice} / {p.unit || t('kg')}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/suppliers"
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t('saveSupplier')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSupplier;
