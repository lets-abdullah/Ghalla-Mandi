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
  Check
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

  // Tab 3: Shop & Mandi Profile State
  const [shopName, setShopName] = useState(shop?.name || 'Shaheen Traders');
  const [shopNo, setShopNo] = useState(shop?.shopNo || '');
  const [mandiName, setMandiName] = useState(shop?.mandiName || 'Ghalla Mandi Multan');
  const [businessAddress, setBusinessAddress] = useState(shop?.address || '');
  const [bankName, setBankName] = useState(shop?.bankName || '');
  const [accountTitle, setAccountTitle] = useState(shop?.accountTitle || '');
  const [accountNumber, setAccountNumber] = useState(shop?.accountNumber || shop?.iban || '');

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

  // 2. Handle Save Password & Security
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
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

    setIsSaving(true);
    const res = await updateProfile({
      shopName: shopName.trim(),
      shopNo: shopNo.trim(),
      mandiName: mandiName.trim(),
      businessAddress: businessAddress.trim(),
      bankName: bankName.trim(),
      accountTitle: accountTitle.trim(),
      accountNumber: accountNumber.trim(),
      city: city.trim()
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
              Manage your personal profile details, security credentials, and shop configuration
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Status Alert Banner */}
      {statusMsg.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border shadow-sm transition-all animate-fade-in ${
          statusMsg.type === 'success'
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

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2.5 pb-1">
        {/* Tab 1: Personal Details / Change Your Details */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs ${
            activeTab === 'profile'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
              : isDark
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Change Your Details</span>
        </button>

        {/* Tab 2: Password & Security */}
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs ${
            activeTab === 'security'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
              : isDark
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Password & Security</span>
        </button>

        {/* Tab 3: Shop & Mandi Profile */}
        <button
          type="button"
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs ${
            activeTab === 'shop'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
              : isDark
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop & Mandi Profile</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHANGE YOUR DETAILS (PERSONAL DETAILS) */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className={`border rounded-3xl p-6 md:p-8 card-shadow space-y-6 transition-colors ${
          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Change Your Details</h3>
              <p className="text-xs text-slate-400 font-medium">Update your name, mobile number, email, and location</p>
            </div>
          </div>

          <form onSubmit={handlePersonalDetailsSave} className="space-y-6">
            {/* 1. Profile Picture Upload & Avatar Preview */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="relative shrink-0">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-brand-500 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-600 text-white font-black flex items-center justify-center text-xl shadow-md tracking-wider">
                    {getInitials(fullName)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-md transition cursor-pointer"
                  title="Upload profile picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-white">Profile Picture</div>
                <p className="text-[11px] text-slate-400">
                  Upload your photo to personalize your account. PNG, JPG or WebP up to 2MB.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload New Photo</span>
                  </button>
                  {profilePicture && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields Grid */}
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
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
      {/* TAB 2: PASSWORD & SECURITY */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className={`border rounded-3xl p-6 md:p-8 card-shadow space-y-6 transition-colors ${
          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Password & Security</h3>
              <p className="text-xs text-slate-400 font-medium">Keep your account secure with a strong password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSave} className="space-y-5 max-w-xl">
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
                  className={`w-full border rounded-2xl pl-10 pr-10 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  placeholder="Enter new password (min. 6 characters)"
                  className={`w-full border rounded-2xl pl-10 pr-10 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  className={`w-full border rounded-2xl pl-10 pr-10 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
            </div>

            {/* Security Tip Box */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Security Recommendations:
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Use a minimum of 6 characters with a combination of uppercase letters, numbers, and special symbols to prevent unauthorized access.
              </p>
            </div>

            {/* Update Password Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-6 py-3 rounded-2xl transition shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SHOP & MANDI PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'shop' && (
        <div className={`border rounded-3xl p-6 md:p-8 card-shadow space-y-8 transition-colors ${
          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Section Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Shop & Mandi Profile</h3>
              <p className="text-xs text-slate-400 font-medium">
                Configure your business identity, mandi location, and banking details for receipts and invoices
              </p>
            </div>
          </div>

          <form onSubmit={handleShopProfileSave} className="space-y-8">
            {/* Part 1: Business Identity & Mandi Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">
                <Store className="w-4 h-4" />
                <span>Shop & Location Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Shop / Business Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Shop / Business Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shaheen Grain Commission Agent"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Shop Number */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Shop Number
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Shop # 42, Block B"
                      value={shopNo}
                      onChange={(e) => setShopNo(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      placeholder="e.g. Ghalla Mandi Multan, Grain Market Faisalabad"
                      value={mandiName}
                      onChange={(e) => setMandiName(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Business Address */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Business Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Near Gate # 2, New Grain Market, Multan"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Part 2: Bank & Account Details for Receipts & Settlements */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Landmark className="w-4 h-4" />
                <span>Banking & Payment Details (Receipts & Invoices)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* Bank Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Bank Name
                  </label>
                  <div className="relative">
                    <Landmark className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank, HBL, MCB"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      placeholder="e.g. Shaheen Traders Commission Agent"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Account Number / IBAN */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Account Number / IBAN
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. PK36MEZN0001234567890101"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                <span>{isSaving ? 'Saving Shop Profile...' : 'Save Shop Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
