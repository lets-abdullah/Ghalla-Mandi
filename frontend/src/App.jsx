import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider, useLocale } from './context/LocaleContext';
import { ERPProvider } from './context/ERPContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { ToastProvider } from './components/Toast';

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
import { Ledger } from './pages/Ledger';
import { Khata } from './pages/Khata';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { SaleReturns } from './pages/SaleReturns';
import { PurchaseReturns } from './pages/PurchaseReturns';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MainLayout } from './layouts/MainLayout';

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocaleProvider>
          <ERPProvider>
            <SidebarProvider>
              <ToastProvider>
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
                    <Route path="/ledger" element={<MainLayout><Ledger /></MainLayout>} />
                    <Route path="/khata" element={<MainLayout><Khata /></MainLayout>} />
                    <Route path="/expenses" element={<MainLayout><Expenses /></MainLayout>} />
                    <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
                    <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Router>
              </ToastProvider>
            </SidebarProvider>
          </ERPProvider>
        </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
