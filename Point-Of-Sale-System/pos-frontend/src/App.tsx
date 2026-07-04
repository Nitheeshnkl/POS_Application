import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import apiClient from './api/client';
import { LanguageProvider } from './i18n/LanguageContext';

import OwnerLayout from './components/layout/OwnerLayout';
import CashierLayout from './components/layout/CashierLayout';

import Setup from './pages/auth/Setup';

import { OwnerRoute, CashierRoute } from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/owner/Dashboard'));
const Products = lazy(() => import('./pages/owner/Products'));
const Categories = lazy(() => import('./pages/owner/Categories'));
const Purchases = lazy(() => import('./pages/owner/Purchases'));
const StockMovements = lazy(() => import('./pages/owner/StockMovements'));
const Expenses = lazy(() => import('./pages/owner/Expenses'));
const Cashiers = lazy(() => import('./pages/owner/Cashiers'));
const AuditLogs = lazy(() => import('./pages/owner/AuditLogs'));
const Settings = lazy(() => import('./pages/owner/Settings'));
const Reports = lazy(() => import('./pages/owner/Reports'));
const CreditManagement = lazy(() => import('./pages/owner/CreditManagement'));
const Suppliers = lazy(() => import('./pages/owner/Suppliers'));
const CashoutHistory = lazy(() => import('./pages/owner/CashoutHistory'));
const Cashout = lazy(() => import('./pages/owner/Cashout'));
const RequestedProducts = lazy(() => import('./pages/owner/RequestedProducts'));
const ExportCenter = lazy(() => import('./pages/owner/ExportCenter').then((module) => ({ default: module.ExportCenter })));

const Billing = lazy(() => import('./pages/cashier/Billing'));
const MyBills = lazy(() => import('./pages/cashier/MyBills'));
const StockView = lazy(() => import('./pages/cashier/StockView'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  },
});

const PageLoader: React.FC = () => <div className="flex h-screen items-center justify-center">Loading...</div>;

const App: React.FC = () => {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    apiClient.get('/auth/setup-required')
      .then(res => setSetupRequired(res.data.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  if (setupRequired === null) return <PageLoader />;

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup" element={setupRequired ? <Setup /> : <Navigate to="/login" />} />

              <Route path="/owner" element={<OwnerRoute><OwnerLayout /></OwnerRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="billing" element={<Billing />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="stock-movements" element={<StockMovements />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="reports" element={<Reports />} />
                <Route path="credits" element={<CreditManagement />} />
                <Route path="cashiers" element={<Cashiers />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
                <Route path="export-center" element={<ExportCenter />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="cashout" element={<Cashout />} />
                <Route path="cashout-history" element={<CashoutHistory />} />
                <Route path="notes" element={<RequestedProducts />} />
                <Route path="requested-products" element={<RequestedProducts />} />
              </Route>

              <Route path="/cashier" element={<CashierRoute><CashierLayout /></CashierRoute>}>
                <Route index element={<Billing />} />
                <Route path="billing" element={<Billing />} />
                <Route path="my-bills" element={<MyBills />} />
                <Route path="stock-view" element={<StockView />} />
                <Route path="notes" element={<RequestedProducts />} />
              </Route>

              <Route path="/" element={
                setupRequired ? <Navigate to="/setup" /> :
                user ? <Navigate to={user.role === 'owner' ? '/owner' : '/cashier'} /> :
                <Navigate to="/login" />
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </LanguageProvider>
  );
};

export default App;
