import React, { useState, useEffect } from 'react';
import { User, X, Landmark, Phone } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';

export const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const { addCustomer } = useERP();
  const { theme } = useTheme();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    whatsapp: '',
    city: '',
    email: '',
    address: '',
    customerType: 'Regular Customer',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyboard Esc Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setForm({
      name: '',
      businessName: '',
      phone: '',
      whatsapp: '',
      city: '',
      email: '',
      address: '',
      customerType: 'Regular Customer',
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Customer name is required.');
      return;
    }

    const cleanPhone = (form.phone || '').trim();
    if (cleanPhone && cleanPhone.replace(/\D/g, '').length !== 11) {
      toast.warning('Phone number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    const cleanWhatsapp = (form.whatsapp || '').trim();
    if (cleanWhatsapp && cleanWhatsapp.replace(/\D/g, '').length !== 11) {
      toast.warning('WhatsApp number must be exactly 11 digits (e.g. 03001234567)');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdCustomer = await addCustomer({
        name: form.name.trim(),
        shopName: (form.businessName || '').trim(),
        businessName: (form.businessName || '').trim(),
        phone: cleanPhone || 'N/A',
        whatsapp: cleanWhatsapp,
        email: (form.email || '').trim(),
        city: (form.city || '').trim() || 'Local Mandi',
        address: (form.address || '').trim(),
        customerType: form.customerType || 'Regular Customer',
        openingBalance: 0,
        bankName: (form.bankName || '').trim(),
        accountTitle: (form.accountTitle || '').trim(),
        accountNumber: (form.accountNumber || '').trim(),
        notes: (form.notes || '').trim()
      });

      toast.success(`Customer "${form.name.trim()}" added successfully!`);
      resetForm();

      if (onSuccess) {
        onSuccess(createdCustomer);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create customer:', err);
      toast.error(err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        className={`rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Add New Customer</h3>
              <p className="text-[10px] text-slate-400 font-bold">Register customer account, contact info & bank details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* LEFT COLUMN: Customer & Contact Info */}
            <div className="space-y-3">
              <div className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                <User className="w-3.5 h-3.5" />
                <span>Customer & Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Full Customer Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    placeholder="Company or Shop Name"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="03001234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="03001234567"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    City / Mandi
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Faisalabad, Okara"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Full Address
                </label>
                <input
                  type="text"
                  placeholder="Shop # / Street / Market address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Financial, Bank & Account Details */}
            <div className="space-y-3">
              <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                <Landmark className="w-3.5 h-3.5" />
                <span>Financial & Bank Account Info</span>
              </div>



              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meezan, HBL"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Account Title
                  </label>
                  <input
                    type="text"
                    placeholder="Title of Account"
                    value={form.accountTitle}
                    onChange={(e) => setForm({ ...form, accountTitle: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Account #
                  </label>
                  <input
                    type="text"
                    placeholder="PK36MEZN..."
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-brand-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`w-1/2 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Customer Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
