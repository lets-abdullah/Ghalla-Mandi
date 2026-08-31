import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useSidebar } from '../context/SidebarContext';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const MainLayout = ({ children }) => {
  const { user } = useAuth();
  const { t } = useLocale();
  const { isMobile } = useSidebar();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex font-sans bg-slate-50 text-slate-800">
      {/*
        Sidebar:
        - Mobile: renders as a fixed overlay drawer (out of flex flow),
          so the main area below still takes full width.
        - Desktop: renders as a sticky flex child (w-20 or w-64).
      */}
      <Sidebar />

      {/* Main Container Area — always takes flex-1 */}
      <div className="flex-1 flex flex-col h-[100dvh] min-w-0 overflow-hidden transition-all duration-300">
        {/* Fixed Header */}
        <Header />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50 text-slate-800">
          <div className="w-full max-w-[1600px] mx-auto space-y-4 md:space-y-6">
            {children}
          </div>
          <footer className="mt-6 pt-4 pb-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] font-medium text-slate-400">
            <div>{t('copyrightNotice')}</div>
            <div>{t('productionTag')}</div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
