import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, ShoppingBag,
  Receipt, Users, UserCheck, BookOpen, FileText,
  BarChart3, Settings, Wheat, LogOut, Headphones, MessageSquare, Phone, X, PlusCircle,
  ChevronLeft, ChevronRight, ChevronDown, Circle,
  TrendingUp, TrendingDown, DollarSign, RotateCcw, Scale, PieChart, Building, FileSpreadsheet
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

export const Sidebar = () => {
  const { t, locale } = useLocale();
  const { logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSupportModal, setShowSupportModal] = useState(false);

  const isRTL = locale === 'ur';

  // Check which sub-menus should be highlighted / active
  const isSalesActive =
    ['/sales', '/customers', '/khata'].includes(location.pathname) ||
    (location.pathname === '/invoices' && (location.search.includes('Sales') || location.search.includes('sales') || !location.search)) ||
    (location.pathname === '/ledger' && (location.search.includes('Customer') || location.search.includes('customer') || !location.search));

  const isPurchasesActive =
    ['/purchases', '/suppliers'].includes(location.pathname) ||
    (location.pathname === '/invoices' && (location.search.includes('Purchases') || location.search.includes('purchases'))) ||
    (location.pathname === '/ledger' && (location.search.includes('Supplier') || location.search.includes('supplier')));

  const isReportsActive = location.pathname === '/reports';

  // Collapsible dropdown states (open by default or when active)
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
    logout();
    navigate('/login');
  };

  // Helper to check exact active match for sub-items with search params
  const isSubActive = (path, searchParam = null) => {
    if (searchParam) {
      return location.pathname === path && location.search.toLowerCase().includes(searchParam.toLowerCase());
    }
    return location.pathname === path;
  };

  return (
    <>
      <aside className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col justify-between p-3.5 select-none shrink-0 z-30 overflow-y-auto transition-all duration-300`}>
        {/* Brand Header */}
        <div>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-6 pt-1`}>
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 overflow-hidden cursor-pointer group ${isCollapsed ? 'justify-center' : ''}`}
              title={t('dashboard')}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-all">
                <Wheat className="w-5 h-5 stroke-[2.5]" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <h1 className="font-black text-slate-900 text-sm tracking-tight leading-none uppercase truncate group-hover:text-emerald-600 transition-colors">
                    {t('appName')}
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                    {t('appSub')}
                  </p>
                </div>
              )}
            </Link>

            {/* Collapse Toggle Button */}
            {!isCollapsed && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title="Collapse Sidebar"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* If Collapsed, show expand button */}
          {isCollapsed && (
            <div className="flex justify-center mb-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
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
              title={isCollapsed ? t('dashboard') : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 stroke-[2.2]" />
              {!isCollapsed && <span className="truncate">{t('dashboard')}</span>}
              {isCollapsed && (
                <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                  {t('dashboard')}
                </div>
              )}
            </NavLink>

            {/* 2. Create Order (POS) */}
            <NavLink
              to="/create-order"
              title={isCollapsed ? t('createOrder') : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <PlusCircle className="w-4 h-4 shrink-0 stroke-[2.2]" />
              {!isCollapsed && <span className="truncate">{t('createOrder')}</span>}
              {isCollapsed && (
                <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                  {t('createOrder')}
                </div>
              )}
            </NavLink>

            {/* 3. Sales ▾ (Collapsible Dropdown Group) */}
            {isCollapsed ? (
              <NavLink
                to="/sales"
                title={t('sales')}
                className={({ isActive }) =>
                  `flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all relative group ${isSalesActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                    ? 'bg-brand-500/10 text-brand-600 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/sales')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('sales')}</span>
                    </Link>

                    <Link
                      to="/customers"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/customers')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('customers')}</span>
                    </Link>

                    <Link
                      to="/invoices?type=Sales"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/invoices', 'Sales')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('saleInvoices')}</span>
                    </Link>

                    <Link
                      to="/ledger?type=Customer"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/ledger', 'Customer')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('customerLedger')}</span>
                    </Link>

                    <Link
                      to="/khata"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/khata')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>Khata & Balance</span>
                    </Link>

                    <Link
                      to="/sale-returns"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/sale-returns')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
            {isCollapsed ? (
              <NavLink
                to="/purchases"
                title={t('purchases')}
                className={({ isActive }) =>
                  `flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all relative group ${isPurchasesActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                    ? 'bg-brand-500/10 text-brand-600 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/purchases')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('purchases')}</span>
                    </Link>

                    <Link
                      to="/suppliers"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/suppliers')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('suppliers')}</span>
                    </Link>

                    <Link
                      to="/invoices?type=Purchases"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/invoices', 'Purchases')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('purchaseInvoices')}</span>
                    </Link>

                    <Link
                      to="/ledger?type=Supplier"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/ledger', 'Supplier')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('supplierLedger')}</span>
                    </Link>

                    <Link
                      to="/purchase-returns"
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isSubActive('/purchase-returns')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
              title={isCollapsed ? t('products') : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Package className="w-4 h-4 shrink-0 stroke-[2.2]" />
              {!isCollapsed && <span className="truncate">{t('products')}</span>}
              {isCollapsed && (
                <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                  {t('products')}
                </div>
              )}
            </NavLink>

            {/* 6. Inventory */}
            <NavLink
              to="/inventory"
              title={isCollapsed ? t('inventory') : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Warehouse className="w-4 h-4 shrink-0 stroke-[2.2]" />
              {!isCollapsed && <span className="truncate">{t('inventory')}</span>}
              {isCollapsed && (
                <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                  {t('inventory')}
                </div>
              )}
            </NavLink>

            {/* 7. Reports ▾ (Collapsible Dropdown Group) */}
            {isCollapsed ? (
              <NavLink
                to="/reports"
                title={t('reports')}
                className={({ isActive }) =>
                  `flex items-center justify-center px-2 py-3 rounded-2xl text-xs font-bold transition-all relative group ${isReportsActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                    ? 'bg-brand-500/10 text-brand-600 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'Stock') || (location.pathname === '/reports' && (!location.search || location.search === '?type=Stock'))
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Warehouse className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('stockReport') || 'Stock Report'}</span>
                    </Link>

                    <Link
                      to="/reports?type=Sales"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'Sales')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('salesReport') || 'Sales & Profit Report'}</span>
                    </Link>

                    <Link
                      to="/reports?type=Expenses"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'Expenses')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('expenseReport') || 'Expense Report'}</span>
                    </Link>

                    <Link
                      to="/reports?type=ProfitLoss"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'ProfitLoss')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <PieChart className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                      <span>{t('profitLoss') || 'Profit & Loss'}</span>
                    </Link>

                    <Link
                      to="/reports?type=BalanceSheet"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSubActive('/reports', 'BalanceSheet')
                        ? 'bg-brand-500 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
              title={isCollapsed ? t('settings') : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Settings className="w-4 h-4 shrink-0 stroke-[2.2]" />
              {!isCollapsed && <span className="truncate">{t('settings')}</span>}
              {isCollapsed && (
                <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                  {t('settings')}
                </div>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Contact Support & Sign Out */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          {/* Support Widget */}
          {!isCollapsed ? (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 rounded-2xl p-3 text-center shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-1 shadow-2xs">
                <Headphones className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">{t('needHelp')}</h4>
              <p className="text-[10px] text-slate-500 mb-2">{t('dedicatedSupport')}</p>
              <button
                onClick={() => setShowSupportModal(true)}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('contactSupport')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSupportModal(true)}
              className="w-full p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition cursor-pointer relative group shadow-2xs"
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
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-2xl text-xs font-black text-rose-600 hover:bg-rose-50 transition cursor-pointer relative group`}
            title={isCollapsed ? t('signOut') : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>{t('signOut')}</span>}
            {isCollapsed && (
              <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-rose-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                {t('signOut')}
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Support Interactive Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 card-shadow space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">{t('contactMandiSupport')}</h3>
              </div>
              <button onClick={() => setShowSupportModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <a
                href="https://wa.me/923001234567?text=Hello%2C%20I%20need%20help%20with%20Ghallah%20Mandi%20ERP."
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-bold text-slate-900">{t('supportHelpline')}</div>
                  <div className="text-slate-500 font-mono">+92 300 1234567</div>
                </div>
              </a>

              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=support@ghallamandi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-brand-600" />
                <div>
                  <div className="font-bold text-slate-900">{t('emailAssistance')}</div>
                  <div className="text-slate-500 font-mono">support@ghallamandi.com</div>
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
