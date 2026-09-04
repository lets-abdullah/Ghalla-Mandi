import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Store, Wheat, Menu, PanelLeftClose, PanelLeftOpen, Plus, Calendar } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';

export const Header = () => {
  const { t } = useLocale();
  const { user, shop, logout } = useAuth();
  const { theme } = useTheme();
  const { isCollapsed, isMobile, toggleSidebar, toggleMobileMenu } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Dynamic Page Title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return t('dashboard');
    if (path === '/create-order') return 'New Sale (POS)';
    if (path === '/sales') return t('sales');
    if (path === '/sale-returns') return 'Sale Returns';
    if (path === '/purchases') return t('purchases');
    if (path === '/purchase-returns') return 'Purchase Returns';
    if (path === '/customers') return t('customers');
    if (path === '/suppliers' || path === '/suppliers/new') return t('suppliers');
    if (path === '/khata') return 'Khata (Dues)';
    if (path === '/ledger') return t('ledger');
    if (path === '/inventory') return t('inventory');
    if (path === '/products') return t('products');
    if (path === '/expenses') return t('expenses') || 'Expenses';
    if (path === '/reports') return t('reports');
    if (path === '/settings') return t('settings');
    return t('appName');
  };

  const todayFormatted = new Intl.DateTimeFormat('en-PK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

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
    <header className={`h-14 md:h-16 shrink-0 border-b px-3 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
      {/* Left: Sidebar Toggle & Dynamic Page Title */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile: Hamburger to open mobile drawer */}
        {isMobile ? (
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={`p-2 sm:p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-800 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            title="Open Menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        ) : (
          /* Desktop: Collapse/Expand toggle */
          <button
            type="button"
            onClick={toggleSidebar}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Wheat className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
          </div>
          <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:gap-3">
        {/* Date badge */}
        <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>

        {/* Notification Center */}
        <NotificationCenter />

        {/* Active Shop Badge — hidden on small mobile */}
        <div className={`hidden sm:flex items-center gap-2 px-2.5 md:px-3 py-1.5 border rounded-xl text-xs font-bold shadow-2xs ${theme === 'dark' ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
          <Store className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="max-w-[100px] md:max-w-none truncate">{shop?.name || t('mandiTrader')}</span>
        </div>

        {/* User Profile & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center gap-2 pl-2 border-l transition cursor-pointer ${theme === 'dark' ? 'border-slate-800 hover:opacity-80' : 'border-slate-200 hover:opacity-80'
              }`}
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-xs shadow-md shadow-emerald-500/25">
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
            <div className={`absolute right-0 mt-2 w-48 border rounded-2xl shadow-xl py-2 z-50 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
