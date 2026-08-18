import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Store, User, Lock, Mail, Phone, MapPin, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Settings = () => {
  const { user, shop, updateProfile } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'shop'

  // Profile details state
  const [fullName, setFullName] = useState(user?.fullName || shop?.ownerName || '');
  const [phone, setPhone] = useState(user?.phone || shop?.phone || '');
  const [email, setEmail] = useState(user?.email || shop?.email || '');
  const [address, setAddress] = useState(shop?.address || '');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Shop details state
  const [shopName, setShopName] = useState(shop?.name || 'My Mandi Shop');
  const [city, setCity] = useState(shop?.city || 'Faisalabad Mandi');

  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!fullName.trim() || !email.trim()) {
      setStatusMsg({ type: 'error', text: t('fullName') + ' & ' + t('emailAddress') + ' ' + t('required') });
      return;
    }

    if (phone.trim()) {
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        setStatusMsg({ type: 'error', text: t('phoneNumberValidationAlert') });
        return;
      }
    }

    setIsSaving(true);
    const res = await updateProfile({
      fullName,
      phone,
      email,
      shopName,
      city,
      address
    });
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: t('detailsUpdatedSuccess') });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Failed to update details.' });
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusMsg({ type: 'error', text: t('fillAllPasswordFields') });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: t('passwordsDoNotMatch') });
      return;
    }

    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: t('passwordMinLengthAlert') });
      return;
    }

    setIsSaving(true);
    const res = await updateProfile({
      currentPassword,
      newPassword
    });
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: t('passwordChangedSuccess') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Password update failed.' });
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-brand-500" />
            {t('settingsTitle')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('settingsSubtitle')}
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMsg.text && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border shadow-sm ${statusMsg.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'profile'
            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <User className="w-4 h-4" />
          <span>{t('changePersonalDetails')}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'security'
            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <Lock className="w-4 h-4" />
          <span>{t('passwordSecurity')}</span>
        </button>

        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'shop'
            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <Store className="w-4 h-4" />
          <span>{t('shopMandiProfile')}</span>
        </button>
      </div>

      {/* Tab 1: Change Your Details */}
      {activeTab === 'profile' && (
        <div className={`border rounded-2xl p-6 card-shadow space-y-5 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
            <User className="w-5 h-5 text-brand-500" />
            <div>
              <h3 className="font-extrabold text-base">{t('changePersonalDetails')}</h3>
              <p className="text-[11px] text-slate-400">{t('updateNameEmailSub')}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('fullName')}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('phoneMobile')}</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="03001234567"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('emailAddress')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t('mandiLocationCity')}</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Grain Market Sector B, Faisalabad"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? t('processing') : t('saveProfileDetails')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Password & Security */}
      {activeTab === 'security' && (
        <div className={`border rounded-2xl p-6 card-shadow space-y-5 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-5 h-5 text-brand-500" />
            <div>
              <h3 className="font-extrabold text-base">{t('passwordSecurity')}</h3>
              <p className="text-[11px] text-slate-400">{t('keepAccountSecureSub')}</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSave} className="space-y-4 max-w-lg">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">{t('currentPassword')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">{t('newPassword')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">{t('confirmPassword')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? t('processing') : t('updatePassword')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Shop & Mandi Settings */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          <div className={`border rounded-2xl p-6 card-shadow space-y-4 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <Store className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-base">{t('shopMandiProfile')}</h3>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('shopName')}</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">{t('mandiLocationCity')}</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {t('save')}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};

export default Settings;
