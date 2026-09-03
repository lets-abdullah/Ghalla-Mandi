import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart,
  Receipt, Users, Settings, Wheat, LogOut, X,
  ChevronLeft, ChevronRight, ChevronDown,
  DollarSign, RotateCcw, CreditCard, BarChart3, BookOpen, UserCheck, PlusCircle
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';

export const Sidebar = () => {
  const { t, locale } = useLocale();
  const { logout } = useAuth();
  const { theme } = useTheme();
  const { isCollapsed, isMobile, isMobileOpen, toggleSidebar, closeMobileMenu } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const isRTL = locale === 'ur';
  const isDark = theme === 'dark';

  // Auto-close mobile drawer whenever route changes
  useEffect(() => {
    if (isMobile) {
      closeMobileMenu();
    }
  }, [location.pathname, location.search, isMobile, closeMobileMenu]);

  // Active group checks
  const isSalesActive = ['/sales', '/sale-returns'].includes(location.pathname);
  const isPurchasesActive = ['/purchases', '/purchase-returns'].includes(location.pathname);
  const isPartiesActive = ['/customers', '/suppliers', '/suppliers/new', '/khata', '/ledger'].includes(location.pathname);
  const isMoneyActive = ['/expenses'].includes(location.pathname) || (location.pathname === '/reports' && location.search.includes('CashFlow'));
  const isInventoryActive = ['/products', '/inventory'].includes(location.pathname) || (location.pathname === '/reports' && location.search.includes('Stock'));
  const isReportsActive = location.pathname === '/reports' && !location.search.includes('CashFlow') && !location.search.includes('Stock');

  // Collapsible dropdown states (5 main groups max)
  const [salesOpen, setSalesOpen] = useState(true);
  const [purchasesOpen, setPurchasesOpen] = useState(true);
  const [partiesOpen, setPartiesOpen] = useState(true);
  const [moneyOpen, setMoneyOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);

  useEffect(() => {
    if (isSalesActive) setSalesOpen(true);
    if (isPurchasesActive) setPurchasesOpen(true);
    if (isPartiesActive) setPartiesOpen(true);
    if (isMoneyActive) setMoneyOpen(true);
    if (isInventoryActive) setInventoryOpen(true);
  }, [location.pathname, location.search, isSalesActive, isPurchasesActive, isPartiesActive, isMoneyActive, isInventoryActive]);

  const handleLogout = () => {
    if (isMobile) closeMobileMenu();
    logout();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (isMobile) {
      closeMobileMenu();
    }
  };

  // Helper to check exact active match for sub-items with search params
  const isSubActive = (path, searchParam = null) => {
    if (searchParam) {
      return location.pathname === path && location.search.toLowerCase().includes(searchParam.toLowerCase());
    }
    return location.pathname === path && (!location.search || location.search === '');
  };

  const effectivelyCollapsed = isMobile ? false : isCollapsed;

  const sidebarInner = (
    <div className={`
      w-full h-full flex flex-col justify-between p-3.5 select-none transition-colors
      ${effectivelyCollapsed ? 'overflow-visible' : 'overflow-y-auto'}
      ${isDark ? 'bg-slate-900 border-r border-slate-800 text-white' : 'bg-white border-r border-slate-200 text-slate-800'}
    `}>
      {/* Brand Header */}
      <div>
        <div className={`flex items-center ${effectivelyCollapsed ? 'justify-center' : 'justify-between'} mb-6 pt-1`}>
          <Link
            to="/dashboard"
            onClick={handleLinkClick}
            className={`flex items-center gap-3 overflow-hidden cursor-pointer group ${effectivelyCollapsed ? 'justify-center' : ''}`}
            title={t('dashboard')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-all">
              <Wheat className="w-5 h-5 stroke-[2.5]" />
            </div>
            {!effectivelyCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-none uppercase truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('appName')}
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                  {t('appSub')}
                </p>
              </div>
            )}
          </Link>

          {/* Mobile: Close X */}
          {isMobile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeMobileMenu();
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition cursor-pointer"
              title="Close Menu"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop: Collapse Toggle */}
          {!isMobile && !effectivelyCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              title="Collapse Sidebar"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {!isMobile && effectivelyCollapsed && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Expand Sidebar"
            >
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Navigation Tree */}
        <nav className="space-y-1">
          {/* 1. Dashboard (Direct Link) */}
          <NavLink
            to="/dashboard"
            onClick={handleLinkClick}
            title={effectivelyCollapsed ? t('dashboard') : undefined}
            className={({ isActive }) =>
              `flex items-center ${effectivelyCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 stroke-[2.2]" />
            {!effectivelyCollapsed && <span className="truncate">{t('dashboard')}</span>}
          </NavLink>

          {/* 2. Create Order / POS (Direct Link immediately under Dashboard) */}
          <NavLink
            to="/create-order"
            onClick={handleLinkClick}
            title={effectivelyCollapsed ? 'New Sale (POS)' : undefined}
            className={({ isActive }) =>
              `flex items-center ${effectivelyCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black'
                : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white'
              }`
            }
          >
            <PlusCircle className="w-4 h-4 shrink-0 stroke-[2.2]" />
            {!effectivelyCollapsed && <span className="truncate font-black">New Sale (POS)</span>}
          </NavLink>

          {/* 2. Sales Group */}
          {effectivelyCollapsed ? (
            <div className="relative group/menu">
              <button
                type="button"
                className={`w-full flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isSalesActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0 stroke-[2.2]" />
              </button>
              <div className={`absolute top-0 ${isRTL ? 'right-full mr-3.5' : 'left-full ml-3.5'} w-48 hidden group-hover/menu:block hover:block z-50`}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 space-y-1">
                  <Link to="/sales" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/sales') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Sales</Link>
                  <Link to="/sale-returns" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/sale-returns') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Sale Returns</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSalesOpen(!salesOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isSalesActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Receipt className={`w-4 h-4 shrink-0 stroke-[2.2] ${isSalesActive ? 'text-brand-500' : ''}`} />
                  <span>Sales</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${salesOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {salesOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link to="/sales" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/sales') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Sales</span>
                  </Link>
                  <Link to="/sale-returns" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/sale-returns') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Sale Returns</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 3. Purchases Group */}
          {effectivelyCollapsed ? (
            <div className="relative group/menu">
              <button
                type="button"
                className={`w-full flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isPurchasesActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4 shrink-0 stroke-[2.2]" />
              </button>
              <div className={`absolute top-0 ${isRTL ? 'right-full mr-3.5' : 'left-full ml-3.5'} w-48 hidden group-hover/menu:block hover:block z-50`}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 space-y-1">
                  <Link to="/purchases" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/purchases') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Purchases</Link>
                  <Link to="/purchase-returns" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/purchase-returns') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Purchase Returns</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setPurchasesOpen(!purchasesOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isPurchasesActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className={`w-4 h-4 shrink-0 stroke-[2.2] ${isPurchasesActive ? 'text-brand-500' : ''}`} />
                  <span>Purchases</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${purchasesOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {purchasesOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link to="/purchases" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/purchases') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Purchases</span>
                  </Link>
                  <Link to="/purchase-returns" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/purchase-returns') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Purchase Returns</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 4. Parties Group (Unified Customers, Suppliers, Khata, Ledger) */}
          {effectivelyCollapsed ? (
            <div className="relative group/menu">
              <button
                type="button"
                className={`w-full flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isPartiesActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 stroke-[2.2]" />
              </button>
              <div className={`absolute top-0 ${isRTL ? 'right-full mr-3.5' : 'left-full ml-3.5'} w-52 hidden group-hover/menu:block hover:block z-50`}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 space-y-1">
                  <Link to="/customers" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/customers') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Customers</Link>
                  <Link to="/suppliers" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/suppliers') || isSubActive('/suppliers/new') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Suppliers</Link>
                  <Link to="/khata?type=Customer" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/khata', 'Customer') || (isSubActive('/khata') && !location.search.includes('Supplier')) ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Customer Khata</Link>
                  <Link to="/khata?type=Supplier" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/khata', 'Supplier') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Supplier Khata</Link>
                  <Link to="/ledger?type=Customer" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/ledger', 'Customer') || (isSubActive('/ledger') && !location.search.includes('Supplier')) ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Customer Ledger</Link>
                  <Link to="/ledger?type=Supplier" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/ledger', 'Supplier') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Supplier Ledger</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setPartiesOpen(!partiesOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isPartiesActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`w-4 h-4 shrink-0 stroke-[2.2] ${isPartiesActive ? 'text-brand-500' : ''}`} />
                  <span>Parties</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${partiesOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {partiesOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link to="/customers" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/customers') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Customers</span>
                  </Link>
                  <Link to="/suppliers" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/suppliers') || isSubActive('/suppliers/new') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Suppliers</span>
                  </Link>
                  <Link to="/khata?type=Customer" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/khata', 'Customer') || (isSubActive('/khata') && !location.search.includes('Supplier')) ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Customer Khata</span>
                  </Link>
                  <Link to="/khata?type=Supplier" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/khata', 'Supplier') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Supplier Khata</span>
                  </Link>
                  <Link to="/ledger?type=Customer" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/ledger', 'Customer') || (isSubActive('/ledger') && !location.search.includes('Supplier')) ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Customer Ledger</span>
                  </Link>
                  <Link to="/ledger?type=Supplier" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/ledger', 'Supplier') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Supplier Ledger</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 5. Money Group */}
          {effectivelyCollapsed ? (
            <div className="relative group/menu">
              <button
                type="button"
                className={`w-full flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isMoneyActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0 stroke-[2.2]" />
              </button>
              <div className={`absolute top-0 ${isRTL ? 'right-full mr-3.5' : 'left-full ml-3.5'} w-48 hidden group-hover/menu:block hover:block z-50`}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 space-y-1">
                  <Link to="/reports?type=CashFlow" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/reports', 'CashFlow') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Cash Flow</Link>
                  <Link to="/expenses" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/expenses') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Expenses</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setMoneyOpen(!moneyOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isMoneyActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className={`w-4 h-4 shrink-0 stroke-[2.2] ${isMoneyActive ? 'text-brand-500' : ''}`} />
                  <span>Money</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moneyOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {moneyOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link to="/reports?type=CashFlow" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'CashFlow') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Cash Flow</span>
                  </Link>
                  <Link to="/expenses" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/expenses') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Expenses</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 6. Inventory Group */}
          {effectivelyCollapsed ? (
            <div className="relative group/menu">
              <button
                type="button"
                className={`w-full flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isInventoryActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 shrink-0 stroke-[2.2]" />
              </button>
              <div className={`absolute top-0 ${isRTL ? 'right-full mr-3.5' : 'left-full ml-3.5'} w-48 hidden group-hover/menu:block hover:block z-50`}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 space-y-1">
                  <Link to="/products" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/products') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Products</Link>
                  <Link to="/inventory" onClick={handleLinkClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${isSubActive('/inventory') ? 'bg-brand-500 text-white font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Stock</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setInventoryOpen(!inventoryOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isInventoryActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className={`w-4 h-4 shrink-0 stroke-[2.2] ${isInventoryActive ? 'text-brand-500' : ''}`} />
                  <span>Inventory</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${inventoryOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {inventoryOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link to="/products" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/products') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Products</span>
                  </Link>
                  <Link to="/inventory" onClick={handleLinkClick} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/inventory') ? 'bg-brand-500 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <span>Stock</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 7. Reports (Direct Link) */}
          <NavLink
            to="/reports"
            onClick={handleLinkClick}
            title={effectivelyCollapsed ? t('reports') : undefined}
            className={({ isActive }) =>
              `flex items-center ${effectivelyCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isReportsActive
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <BarChart3 className="w-4 h-4 shrink-0 stroke-[2.2]" />
            {!effectivelyCollapsed && <span className="truncate">{t('reports')}</span>}
          </NavLink>

          {/* 8. Settings (Direct Link) */}
          <NavLink
            to="/settings"
            onClick={handleLinkClick}
            title={effectivelyCollapsed ? t('settings') : undefined}
            className={({ isActive }) =>
              `flex items-center ${effectivelyCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0 stroke-[2.2]" />
            {!effectivelyCollapsed && <span className="truncate">{t('settings')}</span>}
          </NavLink>
        </nav>
      </div>

      {/* Sign Out */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center ${effectivelyCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-2xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer relative group`}
          title={effectivelyCollapsed ? t('signOut') : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!effectivelyCollapsed && <span>{t('signOut')}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobile ? (
        <div className="relative z-50">
          <div
            onClick={closeMobileMenu}
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ${
              isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden="true"
          />
          <aside
            className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] h-full shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
              isMobileOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
            }`}
          >
            {sidebarInner}
          </aside>
        </div>
      ) : (
        /* Desktop Fixed */
        <aside className={`${effectivelyCollapsed ? 'w-20' : 'w-64'} sticky top-0 shrink-0 h-screen z-30 transition-all duration-300`}>
          {sidebarInner}
        </aside>
      )}
    </>
  );
};

export default Sidebar;
