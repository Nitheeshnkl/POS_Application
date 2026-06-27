import api from './client';

export const getDashboardData = async () => {
  const response = await api.get('/reports/dashboard');
  return response.data;
};

export const getSalesReport = async (params?: {
  start_date?: string;
  end_date?: string;
  cashier_id?: string;
  payment_mode?: string;
}) => {
  const response = await api.get('/reports/sales', { params });
  return response.data;
};

export const getStockReport = async () => {
  const response = await api.get('/reports/stock');
  return response.data;
};

export const getPurchasesReport = async (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const response = await api.get('/reports/purchases', { params });
  return response.data;
};

export const getProfitLossReport = async (month: number, year: number) => {
  const response = await api.get('/reports/profit-loss', { params: { month, year } });
  return response.data;
};

export const getGstReport = async (month: number, year: number) => {
  const response = await api.get('/reports/gst', { params: { month, year } });
  return response.data;
};

export const getCashierPerformance = async (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const response = await api.get('/reports/cashier-performance', { params });
  return response.data;
};

export const getTopProducts = async (params?: {
  start_date?: string;
  end_date?: string;
  limit?: number;
}) => {
  const response = await api.get('/reports/top-products', { params });
  return response.data;
};

export const getDailySales = async (days: number = 30) => {
  const response = await api.get('/reports/daily-sales', { params: { days } });
  return response.data;
};

export const getMonthlySales = async (months: number = 12) => {
  const response = await api.get('/reports/monthly-sales', { params: { months } });
  return response.data;
};
