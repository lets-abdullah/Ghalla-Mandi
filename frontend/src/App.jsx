import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider, useLocale } from './context/LocaleContext';
import { ERPProvider } from './context/ERPContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { Dashboard } from './pages/Dashboard';
import { CreateOrder } from './pages/CreateOrder';
import { Products } from './pages/Products';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { AddSupplier } from './pages/AddSupplier';
import { Customers } from './pages/Customers';
import { Invoices } from './pages/Invoices';
import { Ledger } from './pages/Ledger';
import { Khata } from './pages/Khata';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { SaleReturns } from './pages/SaleReturns';
import { PurchaseReturns } from './pages/PurchaseReturns';
import { Settings } from './pages/Settings';
import { Employees } from './pages/Employees';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const MainLayout = ({ children }) => {
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

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocaleProvider>
          <ERPProvider>
            <SidebarProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
                  <Route path="/create-order" element={<MainLayout><CreateOrder /></MainLayout>} />
                  <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
                  <Route path="/inventory" element={<MainLayout><Inventory /></MainLayout>} />
                  <Route path="/sales/new" element={<MainLayout><Sales /></MainLayout>} />
                  <Route path="/sales" element={<MainLayout><Sales /></MainLayout>} />
                  <Route path="/sale-returns" element={<MainLayout><SaleReturns /></MainLayout>} />
                  <Route path="/purchases" element={<MainLayout><Purchases /></MainLayout>} />
                  <Route path="/purchase-returns" element={<MainLayout><PurchaseReturns /></MainLayout>} />
                  <Route path="/suppliers/new" element={<MainLayout><AddSupplier /></MainLayout>} />
                  <Route path="/suppliers" element={<MainLayout><Suppliers /></MainLayout>} />
                  <Route path="/customers" element={<MainLayout><Customers /></MainLayout>} />
                  <Route path="/invoices" element={<MainLayout><Invoices /></MainLayout>} />
                  <Route path="/ledger" element={<MainLayout><Ledger /></MainLayout>} />
                  <Route path="/khata" element={<MainLayout><Khata /></MainLayout>} />
                  <Route path="/expenses" element={<MainLayout><Expenses /></MainLayout>} />
                  <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
                  <Route path="/employees" element={<MainLayout><Employees /></MainLayout>} />
                  <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Router>
            </SidebarProvider>
          </ERPProvider>
        </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
