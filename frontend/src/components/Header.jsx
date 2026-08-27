import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Store, Wheat, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';

export const Header = () => {
  const { t } = useLocale();
  const { user, shop, logout } = useAuth();
  const { theme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`h-16 shrink-0 border-b px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs transition-colors ${
      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Sidebar Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-xl border transition cursor-pointer ${
            theme === 'dark' ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <Link to="/dashboard" className="flex items-center gap-2.5 cursor-pointer group" title={t('dashboard')}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-all">
            <Wheat className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight group-hover:text-emerald-600 transition-colors">
            {t('dashboard')}
          </h1>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* All Notifications Center */}
        <NotificationCenter />

        {/* Active Shop Badge */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-bold shadow-2xs ${
          theme === 'dark' ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{shop?.name || t('mandiTrader')}</span>
        </div>

        {/* User Profile & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center gap-2.5 pl-2 border-l transition cursor-pointer ${
              theme === 'dark' ? 'border-slate-800 hover:opacity-80' : 'border-slate-200 hover:opacity-80'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md shadow-brand-500/25">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold leading-tight">
                {user?.fullName || t('shopOwner')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {user?.role === 'Employee' ? t('employee') : t('shopOwner')}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className={`absolute right-0 mt-2 w-48 border rounded-2xl shadow-xl py-2 z-50 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                <div className="text-xs font-bold">{user?.fullName}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
