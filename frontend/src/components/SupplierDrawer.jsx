import React, { useState } from 'react';
import { X, Truck, Building2, Phone, MapPin, Plus } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const SupplierDrawer = ({ isOpen, onClose, onSaveSuccess }) => {
  const { addSupplier } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: 'Sargodha',
    openingBalance: 0
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const newSupplier = addSupplier(form);
    setForm({ name: '', phone: '', city: 'Sargodha', openingBalance: 0 });

    if (onSaveSuccess) {
      onSaveSuccess(newSupplier);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={`pointer-events-auto w-screen max-w-md transform transition duration-300 ease-in-out card-shadow ${theme === 'dark' ? 'bg-slate-800 border-l border-slate-700 text-white' : 'bg-white border-l border-slate-200 text-slate-900'
          }`}>
          <div className="flex h-full flex-col justify-between p-6">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">{t('addNewSupplier')}</h2>
                    <p className="text-xs text-slate-400">{t('addNewSupplierAccountSub')}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-xl transition cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Fields */}
              <form id="supplier-drawer-form" onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    {t('supplierFirmName')} *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Sargodha Traders"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
                      {t('phoneMobile')}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="03001234567"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
                      {t('mandiLocationCity')}
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Sargodha"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none focus:border-brand-500 transition ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                      />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="supplier-drawer-form"
                className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('saveSupplier')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
