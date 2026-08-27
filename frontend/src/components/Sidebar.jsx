import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  Receipt, Users, UserCheck, BookOpen, FileText,
  BarChart3, Settings, Wheat, LogOut, Headphones, MessageSquare, Phone, X, PlusCircle,
  ChevronLeft, ChevronRight, ChevronDown,
  TrendingUp, DollarSign, RotateCcw, PieChart, Building,
  CreditCard
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
  const [showSupportModal, setShowSupportModal] = useState(false);

  const isRTL = locale === 'ur';
  const isDark = theme === 'dark';

  // Auto-close mobile drawer whenever route changes
  useEffect(() => {
    if (isMobile) {
      closeMobileMenu();
    }
  }, [location.pathname, location.search, isMobile, closeMobileMenu]);

  // Check active navigation areas
  const isSalesActive =
    ['/sales', '/customers', '/khata', '/sale-returns'].includes(location.pathname) ||
    (location.pathname === '/invoices' && (location.search.includes('Sales') || location.search.includes('sales') || !location.search)) ||
    (location.pathname === '/ledger' && (location.search.includes('Customer') || location.search.includes('customer') || !location.search));

  const isPurchasesActive =
    ['/purchases', '/suppliers', '/purchase-returns', '/suppliers/new'].includes(location.pathname) ||
    (location.pathname === '/invoices' && (location.search.includes('Purchases') || location.search.includes('purchases'))) ||
    (location.pathname === '/ledger' && (location.search.includes('Supplier') || location.search.includes('supplier')));

  const isReportsActive = location.pathname === '/reports';

  // Collapsible dropdown states
  const [salesOpen, setSalesOpen] = useState(true);
  const [purchasesOpen, setPurchasesOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);

  useEffect(() => {
    if (isSalesActive) setSalesOpen(true);
  }, [location.pathname, location.search, isSalesActive]);

  useEffect(() => {
    if (isPurchasesActive) setPurchasesOpen(true);
  }, [location.pathname, location.search, isPurchasesActive]);

  useEffect(() => {
    if (isReportsActive) setReportsOpen(true);
  }, [location.pathname, location.search, isReportsActive]);

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
    return location.pathname === path;
  };

  // On mobile: always show full text inside drawer
  const effectivelyCollapsed = isMobile ? false : isCollapsed;

  // ─── Sidebar Inner Content ───
  const sidebarInner = (
    <div className={`
      w-full h-full flex flex-col justify-between p-3.5 select-none overflow-y-auto transition-colors
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

          {/* Mobile: Cross (X) button with distinct click handler */}
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

          {/* Desktop: Collapse Toggle Button */}
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

        {/* Desktop: If Collapsed, show expand button */}
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

        {/* Navigation Items */}
        <nav className="space-y-1">
          {/* 1. Dashboard */}
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
            {effectivelyCollapsed && (
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('dashboard')}
              </div>
            )}
          </NavLink>

          {/* 2. Create Order (POS) */}
          <NavLink
            to="/create-order"
            onClick={handleLinkClick}
            title={effectivelyCollapsed ? t('createOrder') : undefined}
            className={({ isActive }) =>
              `flex items-center ${effectivelyCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <PlusCircle className="w-4 h-4 shrink-0 stroke-[2.2]" />
            {!effectivelyCollapsed && <span className="truncate">{t('createOrder')}</span>}
            {effectivelyCollapsed && (
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('createOrder')}
              </div>
            )}
          </NavLink>

          {/* 3. Sales ▾ (Collapsible Dropdown Group) */}
          {effectivelyCollapsed ? (
            <NavLink
              to="/sales"
              onClick={handleLinkClick}
              title={t('sales')}
              className={({ isActive }) =>
                `flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all relative group ${isSalesActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Receipt className="w-4 h-4 shrink-0 stroke-[2.2]" />
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('sales')}
              </div>
            </NavLink>
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
                  <span>{t('sales')}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${salesOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {/* Submenu Items for Sales */}
              {salesOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link
                    to="/sales"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/sales')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('sales')}</span>
                  </Link>

                  <Link
                    to="/customers"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/customers')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('customers')}</span>
                  </Link>

                  <Link
                    to="/invoices?type=Sales"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/invoices', 'Sales')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('saleInvoices')}</span>
                  </Link>

                  <Link
                    to="/ledger?type=Customer"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/ledger', 'Customer')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('customerLedger')}</span>
                  </Link>

                  <Link
                    to="/khata"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/khata')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>Khata</span>
                  </Link>

                  <Link
                    to="/sale-returns"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/sale-returns')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>Sale Returns</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 4. Purchases ▾ (Collapsible Dropdown Group) */}
          {effectivelyCollapsed ? (
            <NavLink
              to="/purchases"
              onClick={handleLinkClick}
              title={t('purchases')}
              className={({ isActive }) =>
                `flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all relative group ${isPurchasesActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <ShoppingCart className="w-4 h-4 shrink-0 stroke-[2.2]" />
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('purchases')}
              </div>
            </NavLink>
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
                  <span>{t('purchases')}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${purchasesOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {/* Submenu Items for Purchases */}
              {purchasesOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link
                    to="/purchases"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/purchases')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('purchases')}</span>
                  </Link>

                  <Link
                    to="/suppliers"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/suppliers') || isSubActive('/suppliers/new')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('suppliers')}</span>
                  </Link>

                  <Link
                    to="/invoices?type=Purchases"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/invoices', 'Purchases')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('purchaseInvoices')}</span>
                  </Link>

                  <Link
                    to="/ledger?type=Supplier"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/ledger', 'Supplier')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('supplierLedger')}</span>
                  </Link>

                  <Link
                    to="/purchase-returns"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/purchase-returns')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>Purchase Returns</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 5. Products */}
          <NavLink
            to="/products"
            onClick={handleLinkClick}
            title={effectivelyCollapsed ? t('products') : undefined}
            className={({ isActive }) =>
              `flex items-center ${effectivelyCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Package className="w-4 h-4 shrink-0 stroke-[2.2]" />
            {!effectivelyCollapsed && <span className="truncate">{t('products')}</span>}
            {effectivelyCollapsed && (
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('products')}
              </div>
            )}
          </NavLink>

          {/* 6. Inventory */}
          <NavLink
            to="/inventory"
            onClick={handleLinkClick}
            title={effectivelyCollapsed ? t('inventory') : undefined}
            className={({ isActive }) =>
              `flex items-center ${effectivelyCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Warehouse className="w-4 h-4 shrink-0 stroke-[2.2]" />
            {!effectivelyCollapsed && <span className="truncate">{t('inventory')}</span>}
            {effectivelyCollapsed && (
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('inventory')}
              </div>
            )}
          </NavLink>

          {/* 7. Reports ▾ (Collapsible Dropdown Group) */}
          {effectivelyCollapsed ? (
            <NavLink
              to="/reports"
              onClick={handleLinkClick}
              title={t('reports')}
              className={({ isActive }) =>
                `flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all relative group ${isReportsActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <BarChart3 className="w-4 h-4 shrink-0 stroke-[2.2]" />
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('reports')}
              </div>
            </NavLink>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setReportsOpen(!reportsOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isReportsActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className={`w-4 h-4 shrink-0 stroke-[2.2] ${isReportsActive ? 'text-brand-500' : ''}`} />
                  <span>{t('reports')}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${reportsOpen ? 'rotate-180 text-brand-500' : 'text-slate-400'}`} />
              </button>

              {/* Submenu Items for Reports */}
              {reportsOpen && (
                <div className={`space-y-0.5 mt-0.5 ${isRTL ? 'pr-4 border-r-2 mr-4' : 'pl-4 border-l-2 ml-4'} border-slate-200 dark:border-slate-700`}>
                  <Link
                    to="/reports?type=Stock"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'Stock') || (location.pathname === '/reports' && (!location.search || location.search === '?type=Stock'))
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Warehouse className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('stockReport') || 'Stock Report'}</span>
                  </Link>

                  <Link
                    to="/reports?type=Sales"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'Sales')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('salesReport') || 'Sales & Profit Report'}</span>
                  </Link>

                  <Link
                    to="/reports?type=Expenses"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'Expenses')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('expenseReport') || 'Expense Report'}</span>
                  </Link>

                  <Link
                    to="/reports?type=ProfitLoss"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'ProfitLoss')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <PieChart className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('profitLoss') || 'Profit & Loss'}</span>
                  </Link>

                  <Link
                    to="/reports?type=BalanceSheet"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'BalanceSheet')
                      ? 'bg-brand-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>{t('balanceSheet') || 'Balance Sheet'}</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 8. Settings */}
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
            {effectivelyCollapsed && (
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('settings')}
              </div>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Contact Support & Sign Out */}
      <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* Support Widget */}
        {!effectivelyCollapsed ? (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl p-3 text-center shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1 shadow-2xs">
              <Headphones className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('needHelp')}</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{t('dedicatedSupport')}</p>
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="w-full py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('contactSupport')}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="w-full p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center transition cursor-pointer relative group shadow-2xs"
            title={t('contactSupport')}
          >
            <Headphones className="w-4 h-4" />
            <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
              {t('contactSupport')}
            </div>
          </button>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center ${effectivelyCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-2xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer relative group`}
          title={effectivelyCollapsed ? t('signOut') : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!effectivelyCollapsed && <span>{t('signOut')}</span>}
          {effectivelyCollapsed && (
            <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-rose-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
              {t('signOut')}
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Mobile Drawer (Overlay Mode) ─── */}
      {isMobile ? (
        <div className="relative z-50">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={closeMobileMenu}
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ${
              isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden="true"
          />

          {/* Drawer Panel Container — Starts OFF-SCREEN on mobile */}
          <aside
            className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] h-full shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
              isMobileOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
            }`}
          >
            {sidebarInner}
          </aside>
        </div>
      ) : (
        /* ─── Desktop Fixed Mode ─── */
        <aside className={`${effectivelyCollapsed ? 'w-20' : 'w-64'} sticky top-0 shrink-0 h-screen z-30 transition-all duration-300`}>
          {sidebarInner}
        </aside>
      )}

      {/* Support Helpline Modal */}
      {showSupportModal && (
        <div 
          onClick={() => setShowSupportModal(false)}
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl max-w-sm w-full p-5 sm:p-6 card-shadow space-y-4 border my-auto max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base">{t('contactMandiSupport')}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSupportModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <a
                href="https://wa.me/923001234567?text=Hello%2C%20I%20need%20help%20with%20Ghallah%20Mandi%20ERP."
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-700 hover:bg-emerald-950/40 hover:border-emerald-700' : 'bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200'
                }`}
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-bold">{t('supportHelpline')}</div>
                  <div className="text-slate-400 font-mono">+92 300 1234567</div>
                </div>
              </a>

              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=support@ghallamandi.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-700 hover:bg-blue-950/40 hover:border-blue-700' : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-brand-600" />
                <div>
                  <div className="font-bold">{t('emailAssistance')}</div>
                  <div className="text-slate-400 font-mono">support@ghallamandi.com</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
