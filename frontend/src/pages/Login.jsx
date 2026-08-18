import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Wheat, AlertCircle, UserPlus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export const Login = () => {
  const navigate = useNavigate();
  const { authenticate } = useAuth();
  const { t } = useLocale();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();

    // 1. Empty Check Validation
    if (!trimmedEmail || !password) {
      setErrorMsg(t('loginErrorEmpty'));
      return;
    }

    // 2. Email Syntax Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg(t('loginErrorInvalidFormat'));
      return;
    }

    setIsLoading(true);

    // 3. Secure Authentication Logic (Exact Match Check)
    setTimeout(async () => {
      const res = await authenticate(trimmedEmail, password);
      setIsLoading(false);

      if (res.success) {
        navigate('/dashboard');
      } else {
        // Display exact required error message
        setErrorMsg(t('loginErrorInvalidCreds'));
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#090a16] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Blurred Mandi Grain Sacks Background Image & Dark Gradient Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/mandi-background.png"
          alt="Mandi Grain Sacks Background"
          className="w-full h-full object-cover scale-105 filter blur-md brightness-60 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090a16]/70 via-[#0d0f26]/50 to-[#090a16]/75"></div>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center space-y-6">
        {/* Login Card */}
        <div className="w-full bg-[#10132b]/90 border border-white/10 rounded-3xl p-8 card-shadow backdrop-blur-xl space-y-5 relative overflow-hidden">
          {/* Brand Header Inside Card */}
          <div className="flex flex-col items-center text-center space-y-2">
            {/* Glowing Rounded Square Logo Badge */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-purple-600 rounded-3xl blur-md opacity-90 group-hover:opacity-100 transition duration-500"></div>
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
                {t('customerLoginPortal')}
              </p>
            </div>
          </div>

          {/* Divider Line */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Error Message Alert Box */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-[#181b39] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 mt-2 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? t('authenticating') : t('signIn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Registration Prompt Section */}
          <div className="pt-3 border-t border-white/10 text-center flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">{t('dontHaveAccount')}</span>
            <Link
              to="/register"
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-xs font-bold text-indigo-300 hover:text-white transition flex items-center justify-center gap-2 group"
            >
              <UserPlus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>{t('registerNewAccount')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;