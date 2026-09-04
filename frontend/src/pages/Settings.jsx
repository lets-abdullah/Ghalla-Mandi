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
  Percent,
  Lightbulb,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Settings = () => {
  const { user, shop, updateProfile } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();

  // Tab State: 'shop' (Default - Mandi Profile Setup Flow) | 'profile' | 'security'
  const [activeTab, setActiveTab] = useState('shop');

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

  // Tab 3: Shop & Mandi Profile State (Structured per Profile Setup Flow)
  const [shopName, setShopName] = useState(shop?.name || shop?.shopName || 'Shaheen Traders');
  const [shopNo, setShopNo] = useState(shop?.shopNo || '');
  const [mandiName, setMandiName] = useState(shop?.mandiName || 'Ghalla Mandi Multan');
  const [mandiGate, setMandiGate] = useState(shop?.mandiGate || '');
  const [businessType, setBusinessType] = useState(shop?.businessType || 'Commission Agent (Aarthi)');
  const [licenseNo, setLicenseNo] = useState(shop?.licenseNo || '');
  const [ntnNumber, setNtnNumber] = useState(shop?.ntnNumber || '');
  const [strnNumber, setStrnNumber] = useState(shop?.strnNumber || '');
  const [businessPhone, setBusinessPhone] = useState(shop?.businessPhone || shop?.phone || '');
  const [businessWhatsapp, setBusinessWhatsapp] = useState(shop?.businessWhatsapp || '');
  const [businessEmail, setBusinessEmail] = useState(shop?.businessEmail || shop?.email || '');
  const [businessAddress, setBusinessAddress] = useState(shop?.address || shop?.businessAddress || '');
  const [shopCity, setShopCity] = useState(shop?.city || 'Multan');
  const [defaultCommission, setDefaultCommission] = useState(shop?.defaultCommission || '2.0');
  const [defaultLabourRate, setDefaultLabourRate] = useState(shop?.defaultLabourRate || '25');
  const [primaryCommodities, setPrimaryCommodities] = useState(shop?.primaryCommodities || 'Wheat, Basmati Rice, Maize, Mustard');
  const [bankName, setBankName] = useState(shop?.bankName || '');
  const [branchName, setBranchName] = useState(shop?.branchName || '');
  const [accountTitle, setAccountTitle] = useState(shop?.accountTitle || '');
  const [accountNumber, setAccountNumber] = useState(shop?.accountNumber || shop?.iban || '');
  const [taxStatus, setTaxStatus] = useState(shop?.taxStatus || 'Active Taxpayer (Filer)');

  // Real-time Field Touched State for Inline Validation
  const [touched, setTouched] = useState({});
  const markTouched = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  // =========================================================================
  // REAL-TIME VALIDATION ENGINE ACCORDING TO SETUP FLOW
  // =========================================================================
  // 1. Business Details Validation (Required: Business Name, Address, City)
  const isBusinessNameValid = Boolean(shopName && shopName.trim().length > 0);
  const isBusinessAddressValid = Boolean(businessAddress && businessAddress.trim().length > 0);
  const isCityValid = Boolean(shopCity && shopCity.trim().length > 0);
  const isBusinessDetailsValid = isBusinessNameValid && isBusinessAddressValid && isCityValid;

  // 2. Contact Details Validation (Required: Mobile 11 digits; Valid optional formats for WhatsApp & Email)
  const cleanPhone = (businessPhone || '').replace(/\D/g, '');
  const isPhoneValid = cleanPhone.length === 11;
  const cleanWhatsapp = (businessWhatsapp || '').replace(/\D/g, '');
  const isWhatsappValid = !businessWhatsapp || !businessWhatsapp.trim() || cleanWhatsapp.length === 11;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = !businessEmail || !businessEmail.trim() || emailRegex.test(businessEmail.trim());
  const isContactDetailsValid = isPhoneValid && isWhatsappValid && isEmailValid;

  // 3. Bank Details Validation (Required: Bank Name, Branch Name, Account Title, Account Number/IBAN)
  const isBankNameValid = Boolean(bankName && bankName.trim().length > 0);
  const isBranchNameValid = Boolean(branchName && branchName.trim().length > 0);
  const isAccountTitleValid = Boolean(accountTitle && accountTitle.trim().length > 0);
  const isAccountNumberValid = Boolean(accountNumber && accountNumber.trim().length > 0);
  const isBankDetailsValid = isBankNameValid && isBranchNameValid && isAccountTitleValid && isAccountNumberValid;

  // Master Validity (Data is saved ONLY when all sections are valid)
  const isAllProfileSectionsValid = isBusinessDetailsValid && isContactDetailsValid && isBankDetailsValid;

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

  // 3. Handle Save Shop & Mandi Profile (Strict Multi-Section Validation Flow)
  const handleShopProfileSave = async (e) => {
    if (e) e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    // Mark all section fields as touched to display inline validation errors immediately
    setTouched({
      shopName: true,
      businessAddress: true,
      shopCity: true,
      businessPhone: true,
      businessWhatsapp: true,
      businessEmail: true,
      bankName: true,
      branchName: true,
      accountTitle: true,
      accountNumber: true
    });

    if (!isBusinessDetailsValid) {
      setStatusMsg({
        type: 'error',
        text: 'Validation Error (Required Fields): Please provide Business Name, Business Address, and City.'
      });
      return;
    }

    if (!isContactDetailsValid) {
      setStatusMsg({
        type: 'error',
        text: 'Validation Error (Invalid Format): Please enter a valid 11-digit Mobile Number and valid WhatsApp / Email format.'
      });
      return;
    }

    if (!isBankDetailsValid) {
      setStatusMsg({
        type: 'error',
        text: 'Validation Error (Required Fields): Please provide Bank Name, Branch Name, Account Title, and Account Number / IBAN.'
      });
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
      setStatusMsg({ type: 'success', text: 'Profile Saved Successfully' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Failed to update shop profile.' });
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
      {/* TAB 3: SHOP & MANDI PROFILE SETUP FLOW */}
      {/* ========================================================================= */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          {/* Top Flow Header & Visual Stepper */}
          <div className={`p-5 sm:p-6 rounded-3xl border card-shadow space-y-4 transition-colors ${
            isDark ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      Shop & Mandi Profile Setup Flow
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Form Open
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Structured 3-step setup with real-time field validation and verified profile persistence
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
                  isAllProfileSectionsValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}>
                  {isAllProfileSectionsValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> All Sections Valid
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" /> Completion Pending
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Stepper Flow Roadline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Step 1: Business Details */}
              <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                isBusinessDetailsValid
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  isBusinessDetailsValid
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                }`}>
                  {isBusinessDetailsValid ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">1. Business Details</div>
                  <div className={`text-[11px] font-semibold truncate ${
                    isBusinessDetailsValid ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                  }`}>
                    {isBusinessDetailsValid ? '✓ Section Valid' : 'Name, Address, City'}
                  </div>
                </div>
              </div>

              {/* Step 2: Contact Details */}
              <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                isContactDetailsValid
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  isContactDetailsValid
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isContactDetailsValid ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">2. Contact Details</div>
                  <div className={`text-[11px] font-semibold truncate ${
                    isContactDetailsValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}>
                    {isContactDetailsValid ? '✓ Formats Valid' : 'Mobile, WhatsApp, Email'}
                  </div>
                </div>
              </div>

              {/* Step 3: Bank Details */}
              <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                isBankDetailsValid
                  ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  isBankDetailsValid
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                }`}>
                  {isBankDetailsValid ? <Check className="w-4 h-4 stroke-[3]" /> : '3'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">3. Bank Details</div>
                  <div className={`text-[11px] font-semibold truncate ${
                    isBankDetailsValid ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'
                  }`}>
                    {isBankDetailsValid ? '✓ Account Valid' : 'Bank, Branch, Title, IBAN'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form & Sidebar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Form Sections (8 Cols) */}
            <form onSubmit={handleShopProfileSave} className="lg:col-span-8 space-y-6">
              {/* ===================================================================== */}
              {/* SECTION 1: BUSINESS DETAILS (Soft Blue Theme) */}
              {/* ===================================================================== */}
              <div className={`border-2 rounded-3xl p-5 sm:p-6 card-shadow space-y-5 transition-all ${
                isDark
                  ? 'bg-slate-800/90 border-blue-900/50 text-white'
                  : 'bg-white border-blue-200 text-slate-800'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3.5 border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        1. Business Details
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Core legal and operational business identity
                      </p>
                    </div>
                  </div>

                  {/* Section 1 Validity Badge */}
                  <div>
                    {isBusinessDetailsValid ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    ) : (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                        touched.shopName || touched.businessAddress || touched.shopCity
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'
                      }`}>
                        {touched.shopName || touched.businessAddress || touched.shopCity ? (
                          <>
                            <AlertCircle className="w-3 h-3" /> Required Fields
                          </>
                        ) : (
                          'Required *'
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Field 1: Business Name * */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                      <span>Business Name <span className="text-rose-500">*</span></span>
                      {touched.shopName && isBusinessNameValid && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={shopName}
                        onBlur={() => markTouched('shopName')}
                        onChange={(e) => { setShopName(e.target.value); markTouched('shopName'); }}
                        placeholder="e.g. Shaheen Traders"
                        className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:ring-2 ${
                          touched.shopName && !isBusinessNameValid
                            ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                            : isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                    {/* Inline Validation Error */}
                    {touched.shopName && !isBusinessNameValid && (
                      <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Show Validation Error: Business Name is required.</span>
                      </p>
                    )}
                  </div>

                  {/* Field 2: Business Address * */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                      <span>Business Address <span className="text-rose-500">*</span></span>
                      {touched.businessAddress && isBusinessAddressValid && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={businessAddress}
                        onBlur={() => markTouched('businessAddress')}
                        onChange={(e) => { setBusinessAddress(e.target.value); markTouched('businessAddress'); }}
                        placeholder="e.g. Shop 42, Block B, New Ghalla Mandi, Vehari Road"
                        className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:ring-2 ${
                          touched.businessAddress && !isBusinessAddressValid
                            ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                            : isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                    {/* Inline Validation Error */}
                    {touched.businessAddress && !isBusinessAddressValid && (
                      <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Show Validation Error: Business Address is required.</span>
                      </p>
                    )}
                  </div>

                  {/* Field 3: City * and Mandi Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* City * */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                        <span>City <span className="text-rose-500">*</span></span>
                        {touched.shopCity && isCityValid && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={shopCity}
                          onBlur={() => markTouched('shopCity')}
                          onChange={(e) => { setShopCity(e.target.value); markTouched('shopCity'); }}
                          placeholder="e.g. Multan"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:ring-2 ${
                            touched.shopCity && !isCityValid
                              ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                          }`}
                        />
                      </div>
                      {/* Inline Validation Error */}
                      {touched.shopCity && !isCityValid && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Show Validation Error: City is required.</span>
                        </p>
                      )}
                    </div>

                    {/* Mandi Name (Supporting) */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Mandi Name (Optional)
                      </label>
                      <div className="relative">
                        <Wheat className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={mandiName}
                          onChange={(e) => setMandiName(e.target.value)}
                          placeholder="e.g. Ghalla Mandi Multan"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 2: CONTACT DETAILS (Soft Green Theme) */}
              {/* ===================================================================== */}
              <div className={`border-2 rounded-3xl p-5 sm:p-6 card-shadow space-y-5 transition-all ${
                isDark
                  ? 'bg-slate-800/90 border-emerald-900/50 text-white'
                  : 'bg-white border-emerald-200 text-slate-800'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3.5 border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                      <Phone className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        2. Contact Details
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Customer & supplier communication channels
                      </p>
                    </div>
                  </div>

                  {/* Section 2 Validity Badge */}
                  <div>
                    {isContactDetailsValid ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    ) : (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                        touched.businessPhone || touched.businessWhatsapp || touched.businessEmail
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'
                      }`}>
                        {touched.businessPhone || touched.businessWhatsapp || touched.businessEmail ? (
                          <>
                            <AlertCircle className="w-3 h-3" /> Invalid Format
                          </>
                        ) : (
                          'Mobile Required *'
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Field 1: Mobile Number * */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                      <span>Mobile Number <span className="text-rose-500">*</span></span>
                      {touched.businessPhone && isPhoneValid && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3 h-3" /> 11-digit Verified
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        required
                        value={businessPhone}
                        onBlur={() => markTouched('businessPhone')}
                        onChange={(e) => {
                          setBusinessPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                          markTouched('businessPhone');
                        }}
                        placeholder="03001234567"
                        className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:ring-2 ${
                          touched.businessPhone && !isPhoneValid
                            ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                            : isDark
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500 focus:ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
                        }`}
                      />
                    </div>
                    {/* Inline Validation Error */}
                    {touched.businessPhone && !businessPhone.trim() && (
                      <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Show Validation Error: Mobile Number is required.</span>
                      </p>
                    )}
                    {touched.businessPhone && businessPhone.trim() && !isPhoneValid && (
                      <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Show Validation Error (Invalid Format): Exactly 11 digits required (e.g. 03001234567). Current: {cleanPhone.length}/11.</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Field 2: WhatsApp Number */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                        <span>WhatsApp Number</span>
                        {businessWhatsapp && isWhatsappValid && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <MessageCircle className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={11}
                          value={businessWhatsapp}
                          onBlur={() => markTouched('businessWhatsapp')}
                          onChange={(e) => {
                            setBusinessWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11));
                            markTouched('businessWhatsapp');
                          }}
                          placeholder="03001234567 (Optional)"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:ring-2 ${
                            touched.businessWhatsapp && !isWhatsappValid
                              ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500 focus:ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                        />
                      </div>
                      {/* Inline Validation Error */}
                      {touched.businessWhatsapp && !isWhatsappValid && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Show Validation Error (Invalid Format): 11 digits required (Current: {cleanWhatsapp.length}).</span>
                        </p>
                      )}
                    </div>

                    {/* Field 3: Email Address */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                        <span>Email Address</span>
                        {businessEmail && isEmailValid && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={businessEmail}
                          onBlur={() => markTouched('businessEmail')}
                          onChange={(e) => {
                            setBusinessEmail(e.target.value);
                            markTouched('businessEmail');
                          }}
                          placeholder="shaheen@traders.com (Optional)"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:ring-2 ${
                            touched.businessEmail && !isEmailValid
                              ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500 focus:ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
                          }`}
                        />
                      </div>
                      {/* Inline Validation Error */}
                      {touched.businessEmail && !isEmailValid && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Show Validation Error (Invalid Format): Please enter a valid email format.</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 3: BANK DETAILS (Soft Purple Theme) */}
              {/* ===================================================================== */}
              <div className={`border-2 rounded-3xl p-5 sm:p-6 card-shadow space-y-5 transition-all ${
                isDark
                  ? 'bg-slate-800/90 border-purple-900/50 text-white'
                  : 'bg-white border-purple-200 text-slate-800'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3.5 border-purple-100 dark:border-purple-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                      <Landmark className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                        3. Bank Details
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Banking credentials for invoices, receipts and khata transfers
                      </p>
                    </div>
                  </div>

                  {/* Section 3 Validity Badge */}
                  <div>
                    {isBankDetailsValid ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    ) : (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                        touched.bankName || touched.branchName || touched.accountTitle || touched.accountNumber
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'
                      }`}>
                        {touched.bankName || touched.branchName || touched.accountTitle || touched.accountNumber ? (
                          <>
                            <AlertCircle className="w-3 h-3" /> Required Fields
                          </>
                        ) : (
                          'Required *'
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Field 1: Bank Name * */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                        <span>Bank Name <span className="text-rose-500">*</span></span>
                        {touched.bankName && isBankNameValid && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <Landmark className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={bankName}
                          onBlur={() => markTouched('bankName')}
                          onChange={(e) => { setBankName(e.target.value); markTouched('bankName'); }}
                          placeholder="e.g. Meezan Bank, HBL, MCB"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:ring-2 ${
                            touched.bankName && !isBankNameValid
                              ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500 focus:ring-purple-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-500 focus:ring-purple-500/20'
                          }`}
                        />
                      </div>
                      {/* Inline Validation Error */}
                      {touched.bankName && !isBankNameValid && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Show Validation Error: Bank Name is required.</span>
                        </p>
                      )}
                    </div>

                    {/* Field 2: Branch Name * */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                        <span>Branch Name <span className="text-rose-500">*</span></span>
                        {touched.branchName && isBranchNameValid && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={branchName}
                          onBlur={() => markTouched('branchName')}
                          onChange={(e) => { setBranchName(e.target.value); markTouched('branchName'); }}
                          placeholder="e.g. Ghalla Mandi Branch (0123)"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:ring-2 ${
                            touched.branchName && !isBranchNameValid
                              ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500 focus:ring-purple-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-500 focus:ring-purple-500/20'
                          }`}
                        />
                      </div>
                      {/* Inline Validation Error */}
                      {touched.branchName && !isBranchNameValid && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Show Validation Error: Branch Name is required.</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Field 3: Account Title * */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                        <span>Account Title <span className="text-rose-500">*</span></span>
                        {touched.accountTitle && isAccountTitleValid && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={accountTitle}
                          onBlur={() => markTouched('accountTitle')}
                          onChange={(e) => { setAccountTitle(e.target.value); markTouched('accountTitle'); }}
                          placeholder="e.g. Shaheen Traders"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:ring-2 ${
                            touched.accountTitle && !isAccountTitleValid
                              ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500 focus:ring-purple-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-500 focus:ring-purple-500/20'
                          }`}
                        />
                      </div>
                      {/* Inline Validation Error */}
                      {touched.accountTitle && !isAccountTitleValid && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Show Validation Error: Account Title is required.</span>
                        </p>
                      )}
                    </div>

                    {/* Field 4: Account Number / IBAN * */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                        <span>Account Number / IBAN <span className="text-rose-500">*</span></span>
                        {touched.accountNumber && isAccountNumberValid && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={accountNumber}
                          onBlur={() => markTouched('accountNumber')}
                          onChange={(e) => { setAccountNumber(e.target.value); markTouched('accountNumber'); }}
                          placeholder="e.g. PK36MEZN0001234567890101"
                          className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:ring-2 ${
                            touched.accountNumber && !isAccountNumberValid
                              ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/20'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-purple-500 focus:ring-purple-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-500 focus:ring-purple-500/20'
                          }`}
                        />
                      </div>
                      {/* Inline Validation Error */}
                      {touched.accountNumber && !isAccountNumberValid && (
                        <p className="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Show Validation Error: Account Number / IBAN is required.</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SAVE ACTION BAR & CONFIRMATION FLOW */}
              {/* ===================================================================== */}
              <div className={`p-5 rounded-3xl border card-shadow space-y-4 ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Save & Apply Mandi Profile
                    </div>
                    <div className="text-[11px] font-medium text-slate-400">
                      {isAllProfileSectionsValid
                        ? 'All sections are valid. Click save to persist business credentials.'
                        : 'Please complete all required fields and correct format errors before saving.'}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 ${
                      isAllProfileSectionsValid
                        ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving Business Profile...' : 'Save Business Profile'}</span>
                  </button>
                </div>

                {/* Profile Saved Successfully Feedback Card (From Flowchart) */}
                {statusMsg.type === 'success' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Profile Saved Successfully</div>
                      <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Your Shop, Mandi, and Banking credentials have been stored and updated across all reports and invoices.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Sidebar Guide Panel (4 Cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* KEY POINTS CALLOUT CARD (Exact replica of diagram) */}
              <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-300/80 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/20 card-shadow space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Key Points
                    </h4>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                      Setup requirements & best practices
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="text-amber-600 dark:text-amber-400 font-black text-sm leading-none mt-0.5">•</span>
                    <span>Fields marked with <strong className="text-rose-500 font-black">*</strong> are required</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-amber-600 dark:text-amber-400 font-black text-sm leading-none mt-0.5">•</span>
                    <span>Real-time validation for better user experience</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-amber-600 dark:text-amber-400 font-black text-sm leading-none mt-0.5">•</span>
                    <span>Errors shown inline for quick correction</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-amber-600 dark:text-amber-400 font-black text-sm leading-none mt-0.5">•</span>
                    <span>Data is saved only when all sections are valid</span>
                  </li>
                </ul>
              </div>

              {/* LIVE SECTION FLOW VALIDATOR */}
              <div className={`p-5 rounded-3xl border card-shadow space-y-4 ${
                isDark ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Live Section Status
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isAllProfileSectionsValid
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {isAllProfileSectionsValid ? '3 of 3 Ready' : 'Validation Active'}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Section 1 Status */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isBusinessDetailsValid
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40'
                      : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isBusinessDetailsValid ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        1
                      </div>
                      <span className="text-xs font-bold">Business Details</span>
                    </div>
                    {isBusinessDetailsValid ? (
                      <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Incomplete
                      </span>
                    )}
                  </div>

                  {/* Section 2 Status */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isContactDetailsValid
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                      : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isContactDetailsValid ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        2
                      </div>
                      <span className="text-xs font-bold">Contact Details</span>
                    </div>
                    {isContactDetailsValid ? (
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Invalid Format
                      </span>
                    )}
                  </div>

                  {/* Section 3 Status */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isBankDetailsValid
                      ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40'
                      : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isBankDetailsValid ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        3
                      </div>
                      <span className="text-xs font-bold">Bank Details</span>
                    </div>
                    {isBankDetailsValid ? (
                      <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Incomplete
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Rule:</span> When all 3 sections show <strong className="text-emerald-500">Valid</strong>, the profile is verified and ready for instant activation.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
