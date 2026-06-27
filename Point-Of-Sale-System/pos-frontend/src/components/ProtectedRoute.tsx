import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRole: 'owner' | 'cashier';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();

  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== allowedRole && !(user.role === 'owner' && allowedRole === 'cashier')) {
    // Owner can access cashier routes
    return <Navigate to={user.role === 'owner' ? '/owner' : '/cashier'} replace />;
  }

  return children;
};

export const OwnerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <ProtectedRoute allowedRole="owner">{children}</ProtectedRoute>
);

export const CashierRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <ProtectedRoute allowedRole="cashier">{children}</ProtectedRoute>
);
