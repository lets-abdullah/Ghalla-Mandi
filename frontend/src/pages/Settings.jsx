import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Store,
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Camera,
  Trash2,
  CreditCard,
  Building2,
  Wheat,
  Landmark,
  Eye,
  EyeOff,
  Hash,
  Home,
  Check,
  X,
  FileText,
  BadgePercent,
  Briefcase,
  Receipt,
  Scale,
  Sparkles,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Settings = () => {
  const { user, shop, updateProfile } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();

  // Tab State: 'profile' | 'security' | 'shop'
  const [activeTab, setActiveTab] = useState('profile');

  // Tab 1: Personal Details State
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [fullName, setFullName] = useState(user?.fullName || shop?.ownerName || '');
  const [phone, setPhone] = useState(user?.phone || shop?.phone || '');
  const [email, setEmail] = useState(user?.email || shop?.email || '');
  const [cnic, setCnic] = useState(user?.cnic || '');
  const [address, setAddress] = useState(user?.address || shop?.address || '');
  const [city, setCity] = useState(user?.city || shop?.city || 'Multan');

  // Tab 2: Password & Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Tab 3: Shop & Mandi Profile State (Expanded with rich Mandi details)
  const [shopName, setShopName] = useState(shop?.name || 'Shaheen Traders');
  const [shopNo, setShopNo] = useState(shop?.shopNo || '');
  const [mandiName, setMandiName] = useState(shop?.mandiName || 'Ghalla Mandi Multan');
  const [mandiGate, setMandiGate] = useState(shop?.mandiGate || '');
  const [businessType, setBusinessType] = useState(shop?.businessType || 'Commission Agent (Aarthi / آڑھتی)');
  const [licenseNo, setLicenseNo] = useState(shop?.licenseNo || '');
  const [ntnNumber, setNtnNumber] = useState(shop?.ntnNumber || '');
  const [strnNumber, setStrnNumber] = useState(shop?.strnNumber || '');
  const [businessPhone, setBusinessPhone] = useState(shop?.businessPhone || shop?.phone || '');
  const [businessWhatsapp, setBusinessWhatsapp] = useState(shop?.businessWhatsapp || '');
  const [businessEmail, setBusinessEmail] = useState(shop?.businessEmail || shop?.email || '');
  const [businessAddress, setBusinessAddress] = useState(shop?.address || '');
  const [shopCity, setShopCity] = useState(shop?.city || 'Multan');
  const [defaultCommission, setDefaultCommission] = useState(shop?.defaultCommission || '2.0');
  const [defaultLabourRate, setDefaultLabourRate] = useState(shop?.defaultLabourRate || '25');
  const [primaryCommodities, setPrimaryCommodities] = useState(shop?.primaryCommodities || 'Wheat, Basmati Rice, Maize, Mustard');
  const [bankName, setBankName] = useState(shop?.bankName || '');
  const [branchName, setBranchName] = useState(shop?.branchName || '');
  const [accountTitle, setAccountTitle] = useState(shop?.accountTitle || '');
  const [accountNumber, setAccountNumber] = useState(shop?.accountNumber || shop?.iban || '');
  const [taxStatus, setTaxStatus] = useState(shop?.taxStatus || 'Active Taxpayer (Filer)');

  // Notifications / Saving state
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const isDark = theme === 'dark';

  // CNIC Formatter: 35201-1234567-1
  const formatCnic = (val) => {
    const raw = val.replace(/\D/g, '').slice(0, 13);
    if (raw.length <= 5) return raw;
    if (raw.length <= 12) return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    return `${raw.slice(0, 5)}-${raw.slice(5, 12)}-${raw.slice(12, 13)}`;
  };

  // Image Upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Image size should be less than 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePicture(reader.result);
      setStatusMsg({ type: 'success', text: 'Profile picture selected! Click save to apply changes.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3500);
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setProfilePicture('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStatusMsg({ type: 'success', text: 'Profile picture removed. Click save to apply changes.' });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 3500);
  };

  // =========================================================================
  // PASSWORD VALIDATION LOGIC (MUST have 1 upper, 1 lower, min 8 chars, 1 number, 1 special)
  // =========================================================================
  const passwordCriteria = {
    minLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)
  };

  const isPasswordValid =
    passwordCriteria.minLength &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSpecial;

  // Calculate Strength Score (0 to 5)
  const strengthScore = Object.values(passwordCriteria).filter(Boolean).length;
  const getStrengthLabel = () => {
    if (!newPassword) return { text: '', color: 'bg-slate-300 dark:bg-slate-700', textClass: 'text-slate-400' };
    if (strengthScore <= 2) return { text: 'Weak', color: 'bg-rose-500', textClass: 'text-rose-500' };
    if (strengthScore <= 4) return { text: 'Moderate', color: 'bg-amber-500', textClass: 'text-amber-500' };
    return { text: 'Strong & Enterprise-Grade', color: 'bg-emerald-500', textClass: 'text-emerald-500' };
  };

  // 1. Handle Save Personal Details
  const handlePersonalDetailsSave = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!fullName.trim() || !email.trim()) {
      setStatusMsg({ type: 'error', text: 'Full Name and Email Address are required.' });
      return;
    }

    if (phone.trim()) {
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 11) {
        setStatusMsg({ type: 'error', text: 'Please enter a valid 11-digit mobile/WhatsApp number.' });
        return;
      }
    }

    setIsSaving(true);
    const res = await updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      cnic: cnic.trim(),
      address: address.trim(),
      city: city.trim(),
      profilePicture
    });
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Personal details updated successfully!' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Failed to update personal details.' });
    }
  };

  // 2. Handle Save Password & Security (Strict 5-Rule Enforcement)
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }

    if (!isPasswordValid) {
      const missing = [];
      if (!passwordCriteria.minLength) missing.push('minimum 8 characters');
      if (!passwordCriteria.hasUpper) missing.push('1 uppercase letter (A-Z)');
      if (!passwordCriteria.hasLower) missing.push('1 lowercase letter (a-z)');
      if (!passwordCriteria.hasNumber) missing.push('1 number (0-9)');
      if (!passwordCriteria.hasSpecial) missing.push('1 special character (!@#$%^&*)');

      setStatusMsg({
        type: 'error',
        text: `Password requirements missing: ${missing.join(', ')}.`
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setIsSaving(true);
    const res = await updateProfile({
      currentPassword,
      newPassword
    });
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Password has been changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Password update failed. Check your current password.' });
    }
  };

  // 3. Handle Save Shop & Mandi Profile
  const handleShopProfileSave = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!shopName.trim()) {
      setStatusMsg({ type: 'error', text: 'Shop / Business Name is required.' });
      return;
    }

    if (businessPhone.trim() && businessPhone.replace(/\D/g, '').length !== 11) {
      setStatusMsg({ type: 'error', text: 'Business phone number must be exactly 11 digits (e.g. 03001234567).' });
      return;
    }

    if (businessWhatsapp.trim() && businessWhatsapp.replace(/\D/g, '').length !== 11) {
      setStatusMsg({ type: 'error', text: 'Business WhatsApp number must be exactly 11 digits (e.g. 03001234567).' });
      return;
    }

    setIsSaving(true);
    const res = await updateProfile({
      shopName: shopName.trim(),
      shopNo: shopNo.trim(),
      mandiName: mandiName.trim(),
      mandiGate: mandiGate.trim(),
      businessType: businessType.trim(),
      licenseNo: licenseNo.trim(),
      ntnNumber: ntnNumber.trim(),
      strnNumber: strnNumber.trim(),
      businessPhone: businessPhone.trim(),
      businessWhatsapp: businessWhatsapp.trim(),
      businessEmail: businessEmail.trim(),
      businessAddress: businessAddress.trim(),
      city: shopCity.trim(),
      defaultCommission: defaultCommission.trim(),
      defaultLabourRate: defaultLabourRate.trim(),
      primaryCommodities: primaryCommodities.trim(),
      bankName: bankName.trim(),
      branchName: branchName.trim(),
      accountTitle: accountTitle.trim(),
      accountNumber: accountNumber.trim(),
      taxStatus: taxStatus.trim()
    });
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Shop & Mandi Profile details saved successfully!' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Failed to update shop details.' });
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const strength = getStrengthLabel();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold shadow-2xs">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Account & Settings
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Manage your personal profile details, enterprise security credentials, and Mandi shop profile
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Status Alert Banner */}
      {statusMsg.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border shadow-sm transition-all animate-fade-in ${statusMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          )}
          <span className="flex-1">{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 Main Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => { setActiveTab('profile'); setStatusMsg({ type: '', text: '' }); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'profile'
              ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <User className="w-4 h-4" />
          <span>Personal Details</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('security'); setStatusMsg({ type: '', text: '' }); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'security'
              ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Password & Security</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('shop'); setStatusMsg({ type: '', text: '' }); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${activeTab === 'shop'
              ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop & Mandi Profile</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERSONAL DETAILS (Change Your Details) */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className={`border rounded-3xl p-6 md:p-8 card-shadow space-y-6 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          {/* Profile Picture Header */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-brand-500/30 flex items-center justify-center bg-slate-100 dark:bg-slate-900 shadow-md">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
                    {getInitials(fullName)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-md transition cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Profile Picture</h3>
              <p className="text-xs text-slate-400 font-medium">PNG, JPG, or WebP up to 2MB. Square ratio recommended.</p>

              <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition cursor-pointer"
                >
                  Upload New
                </button>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Personal Info Form */}
          <form onSubmit={handlePersonalDetailsSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* Phone / WhatsApp Number */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Phone / WhatsApp Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="03001234567"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* CNIC */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  CNIC Number
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="35201-1234567-1"
                    maxLength={15}
                    value={cnic}
                    onChange={(e) => setCnic(formatCnic(e.target.value))}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* Complete Address */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Complete Address
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Street, Area, Tehsil, District"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>

              {/* City / Mandi Location */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  City / Mandi Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Multan, Faisalabad Mandi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-6 py-3 rounded-2xl transition shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Profile...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PASSWORD & SECURITY (Strict Mandatory 5-Point Validation) */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className={`border rounded-3xl p-6 md:p-8 card-shadow space-y-6 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Password & Security</h3>
            </div>
          </div>

          <form onSubmit={handlePasswordSave} className="space-y-6 max-w-xl">
            {/* Current Password */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={`w-full border rounded-2xl pl-10 pr-10 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong password (e.g. Mandi@2026)"
                  className={`w-full border rounded-2xl pl-10 pr-10 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Real-time Password Strength Meter */}
              {newPassword && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className={`font-black ${strength.textClass}`}>{strength.text}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 h-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`rounded-full transition-all duration-300 ${strengthScore >= level ? strength.color : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* MUST Password Requirements Checklist */}
              <div className={`mt-3.5 p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                  <span>Mandatory Password Rules (MUST satisfy all):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                  {/* Rule 1: Min 8 chars */}
                  <div className={`flex items-center gap-2 transition-colors ${passwordCriteria.minLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordCriteria.minLength ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                      {passwordCriteria.minLength ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[2]" />}
                    </div>
                    <span>Minimum 8 Characters</span>
                  </div>

                  {/* Rule 2: 1 Uppercase */}
                  <div className={`flex items-center gap-2 transition-colors ${passwordCriteria.hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordCriteria.hasUpper ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                      {passwordCriteria.hasUpper ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[2]" />}
                    </div>
                    <span>1 Uppercase Letter (A-Z)</span>
                  </div>

                  {/* Rule 3: 1 Lowercase */}
                  <div className={`flex items-center gap-2 transition-colors ${passwordCriteria.hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordCriteria.hasLower ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                      {passwordCriteria.hasLower ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[2]" />}
                    </div>
                    <span>1 Lowercase Letter (a-z)</span>
                  </div>

                  {/* Rule 4: 1 Number */}
                  <div className={`flex items-center gap-2 transition-colors ${passwordCriteria.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordCriteria.hasNumber ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                      {passwordCriteria.hasNumber ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[2]" />}
                    </div>
                    <span>1 Number (0-9)</span>
                  </div>

                  {/* Rule 5: 1 Special Character */}
                  <div className={`flex items-center gap-2 sm:col-span-2 transition-colors ${passwordCriteria.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordCriteria.hasSpecial ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                      {passwordCriteria.hasSpecial ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[2]" />}
                    </div>
                    <span>1 Special Symbol (!@#$%^&*()_+...)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full border rounded-2xl pl-10 pr-10 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword && newPassword && (
                <div className="mt-1.5 text-xs font-bold flex items-center gap-1.5">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match perfectly
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Update Password Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving || (newPassword.length > 0 && !isPasswordValid)}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-6 py-3 rounded-2xl transition shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SHOP & MANDI PROFILE (Business Identity, Contacts & Banking) */}
      {/* ========================================================================= */}
      {activeTab === 'shop' && (
        <div className={`border rounded-3xl p-6 md:p-8 card-shadow space-y-8 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Shop & Mandi Profile</h3>
              <p className="text-xs text-slate-400 font-medium">
                Configure your business details, contacts, and banking information for receipts and invoices
              </p>
            </div>
          </div>

          <form onSubmit={handleShopProfileSave} className="space-y-8">
            {/* PART 1: Business Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
                <Store className="w-4 h-4" />
                <span>1. Business Identity</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Business Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Business Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shaheen Traders"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Trade Type */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Trade Type
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    >
                      <option value="Commission Agent (Aarthi / آڑھتی)">Commission Agent (Aarthi / آڑھتی)</option>
                      <option value="Grain Wholesaler (تھوک ڈیلر)">Grain Wholesaler (تھوک ڈیلر)</option>
                      <option value="Grain Broker (دلال / بروکر)">Grain Broker (دلال / بروکر)</option>
                      <option value="Mandi Input Supplier (کھاد، بیج، ادویات)">Mandi Input Supplier (کھاد، بیج، ادویات)</option>
                      <option value="Warehouse / Silo Operator (گودام)">Warehouse / Silo Operator (گودام)</option>
                    </select>
                  </div>
                </div>

                {/* Khata Number */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Khata Number
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Shop 42, Block B"
                      value={shopNo}
                      onChange={(e) => setShopNo(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Mandi Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Mandi Name
                  </label>
                  <div className="relative">
                    <Wheat className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Ghalla Mandi Multan"
                      value={mandiName}
                      onChange={(e) => setMandiName(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Mandi Gate */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Mandi Gate
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Gate 2, Block C"
                      value={mandiGate}
                      onChange={(e) => setMandiGate(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Primary Commodities */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Primary Commodities
                  </label>
                  <div className="relative">
                    <Wheat className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Wheat, Basmati Rice, Maize, Mustard"
                      value={primaryCommodities}
                      onChange={(e) => setPrimaryCommodities(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PART 2: Contact Information */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
                <Phone className="w-4 h-4" />
                <span>2. Contact Information</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="03001234567"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="03001234567"
                      value={businessWhatsapp}
                      onChange={(e) => setBusinessWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="shaheen@traders.com"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Business Address */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Business Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Shop 42, Block B, New Ghalla Mandi, Vehari Road, Multan"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    City
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Multan"
                      value={shopCity}
                      onChange={(e) => setShopCity(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PART 3: Banking Details */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
                <Landmark className="w-4 h-4" />
                <span>3. Banking Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Bank Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Bank Name
                  </label>
                  <div className="relative">
                    <Landmark className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank, HBL"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Branch Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Branch Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Ghalla Mandi Branch (0123)"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Account Title */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Account Title
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Shaheen Traders"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Account Number
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. PK36MEZN0001234567890101"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-6 py-3 rounded-2xl transition shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Shop Profile...' : 'Save Shop & Mandi Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
