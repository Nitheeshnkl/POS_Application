import api from './client';
import { Product, StockMovement } from '../types';

export const getCurrentStock = async () => {
  const response = await api.get<(Product & { value: number })[]>('/stock/current');
  return response.data;
};

export const getLowStockAlerts = async () => {
  const response = await api.get<Product[]>('/stock/low-alert');
  return response.data;
};

export const getStockMovements = async (params?: { product_id?: string; page?: number; limit?: number }) => {
  const response = await api.get<{ movements: StockMovement[]; total: number }>('/stock/movements', { params });
  return response.data;
};

export const adjustStock = async (data: { productId: string; qty: number; reason?: string }) => {
  const response = await api.post('/stock/adjust', data);
  return response.data;
};

export const markDamaged = async (data: { productId: string; qty: number; reason?: string }) => {
  const response = await api.post('/stock/mark-damaged', data);
  return response.data;
};

export const getStockValuation = async () => {
  const response = await api.get<{ totalValue: number; productCount: number }>('/stock/valuation');
  return response.data;
};
