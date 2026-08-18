import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  Receipt, Users, UserCheck, BookOpen, FileText,
  BarChart3, Settings, Wheat, LogOut, Headphones, MessageSquare, Phone, X, PlusCircle,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

export const Sidebar = () => {
  const { t, locale } = useLocale();
  const { logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [showSupportModal, setShowSupportModal] = useState(false);

  const isRTL = locale === 'ur';

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/create-order', label: t('createOrder'), icon: PlusCircle },
    { path: '/products', label: t('products'), icon: Package },
    { path: '/inventory', label: t('inventory'), icon: Warehouse },
    { path: '/purchases', label: t('purchases'), icon: ShoppingCart },
    { path: '/suppliers', label: t('suppliers'), icon: UserCheck },
    { path: '/sales', label: t('sales'), icon: Receipt },
    { path: '/customers', label: t('customers'), icon: Users },
    { path: '/invoices', label: t('invoices'), icon: FileText },
    { path: '/ledger', label: t('ledger'), icon: BookOpen },
    { path: '/reports', label: t('reports'), icon: BarChart3 },
    { path: '/settings', label: t('settings'), icon: Settings }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <aside className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col justify-between p-3.5 select-none shrink-0 z-30 overflow-y-auto transition-all duration-300`}>
        {/* Brand Header */}
        <div>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-6 pt-1`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
                <Wheat className="w-6 h-6 stroke-[2.5]" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <h1 className="font-black text-slate-900 text-sm tracking-tight leading-none uppercase truncate">
                    {t('appName')}
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                    {t('appSub')}
                  </p>
                </div>
              )}
            </div>

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
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold transition-all relative group ${isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}

                  {/* Floating tooltip when collapsed */}
                  {isCollapsed && (
                    <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-lg`}>
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Contact Support & Sign Out */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          {/* Support Widget */}
          {!isCollapsed ? (
            <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3 text-center">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-1">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">{t('needHelp')}</h4>
              <p className="text-[10px] text-slate-500 mb-2">{t('dedicatedSupport')}</p>
              <button
                onClick={() => setShowSupportModal(true)}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('contactSupport')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSupportModal(true)}
              className="w-full p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition cursor-pointer relative group"
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
