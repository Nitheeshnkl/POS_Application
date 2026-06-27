import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import apiClient from './api/client';

// Layouts
import OwnerLayout from './components/layout/OwnerLayout';
import CashierLayout from './components/layout/CashierLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Setup from './pages/auth/Setup';

// Owner Pages
import Dashboard from './pages/owner/Dashboard';
import Products from './pages/owner/Products';
import Categories from './pages/owner/Categories';
import Purchases from './pages/owner/Purchases';
import StockMovements from './pages/owner/StockMovements';
import Expenses from './pages/owner/Expenses';
import Cashiers from './pages/owner/Cashiers';
import AuditLogs from './pages/owner/AuditLogs';
import Settings from './pages/owner/Settings';
import Reports from './pages/owner/Reports';

// Cashier Pages
import Billing from './pages/cashier/Billing';
import MyBills from './pages/cashier/MyBills';
import StockView from './pages/cashier/StockView';

// Protection
import { OwnerRoute, CashierRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    apiClient.get('/auth/setup-required')
      .then(res => setSetupRequired(res.data.required))
      .catch(() => setSetupRequired(false));
  }, []);

  if (setupRequired === null) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={setupRequired ? <Setup /> : <Navigate to="/login" />} />
          
          {/* Owner Routes */}
          <Route path="/owner" element={<OwnerRoute><OwnerLayout /></OwnerRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="billing" element={<Billing />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="stock-movements" element={<StockMovements />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="cashiers" element={<Cashiers />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Cashier Routes */}
          <Route path="/cashier" element={<CashierRoute><CashierLayout /></CashierRoute>}>
            <Route index element={<Billing />} />
            <Route path="billing" element={<Billing />} />
            <Route path="my-bills" element={<MyBills />} />
            <Route path="stock-view" element={<StockView />} />
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={
            setupRequired ? <Navigate to="/setup" /> : 
            user ? <Navigate to={user.role === 'owner' ? '/owner' : '/cashier'} /> : 
            <Navigate to="/login" />
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
