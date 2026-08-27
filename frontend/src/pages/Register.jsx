import React, { useState } from 'react';
import { Wheat, Store, User, Mail, Lock, Phone, MapPin, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export const Register = () => {
  const navigate = useNavigate();
  const { registerAccount } = useAuth();
  const { t } = useLocale();

  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    mobile: '',
    email: '',
    password: '',
    city: 'Faisalabad Mandi',
    address: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.ownerName.trim() || !formData.shopName.trim() || !formData.email.trim() || !formData.password.trim()) {
      setErrorMsg(t('registerErrorRequired'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMsg(t('loginErrorInvalidFormat'));
      return;
    }

    if (formData.mobile.trim()) {
      const cleanDigits = formData.mobile.replace(/\D/g, '');
      if (cleanDigits.length !== 11) {
        setErrorMsg(t('registerErrorPhone') || 'Phone number must be exactly 11 digits (e.g. 03001234567).');
        return;
      }
    }

    if (formData.password.length < 6) {
      setErrorMsg(t('registerErrorPasswordLen'));
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerAccount(formData);
      setIsLoading(false);

      if (res.success) {
        setSuccessMsg(t('registerSuccess'));
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        setErrorMsg(res.message || t('registerErrorGeneral'));
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(t('registerErrorGeneral'));
    }
  };

  return (
    <div className="min-h-screen bg-[#090a16] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Blurred Mandi Grain Sacks Background Image & Dark Gradient Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/mandi-background.png"
          alt="Mandi Grain Sacks Background"
          className="w-full h-full object-cover scale-105 filter blur-md brightness-50 opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090a16]/85 via-[#0d0f26]/70 to-[#090a16]/90"></div>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center space-y-6">
        {/* Registration Card */}
        <div className="w-full bg-[#10132b]/90 border border-white/10 rounded-3xl p-8 card-shadow backdrop-blur-xl space-y-5 relative overflow-hidden">
          {/* Brand Header Inside Card */}
          <div className="flex flex-col items-center text-center space-y-2">
            {/* Glowing Rounded Square Logo Badge */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-purple-600 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-20 h-20 bg-[#0d0f23] border border-white/20 rounded-2xl flex items-center justify-center shadow-2xl">
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Wheat className="w-8 h-8 stroke-[2.5]" />
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-widest text-white uppercase font-sans">
                {t('appName')}
              </h1>
              <p className="text-[10px] font-bold tracking-[0.25em] text-indigo-300/80 uppercase mt-0.5">
                {t('newCustomerRegistration')}
              </p>
            </div>
          </div>

          {/* Divider Line */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Alerts */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('fullName')} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chaudhry Ahmad"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('shopBusinessName')} *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madina Traders"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('phoneMobile')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="03001234567"
                    maxLength={11}
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('emailAddress')} *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ahmad@traders.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('password')} *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('mandiLocationCity')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Faisalabad Mandi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 mt-2 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? t('creatingAccount') : t('registerAccount')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-400 pt-2">
          {t('alreadyRegistered')}{' '}
          <Link to="/login" className="font-extrabold text-indigo-400 hover:underline">
            {t('signInToAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
