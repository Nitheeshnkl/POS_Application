import api from './client';
import { Purchase } from '../types';

export const getPurchases = async (params?: { start_date?: string; end_date?: string; supplier?: string }) => {
  const response = await api.get<Purchase[]>('/purchases', { params });
  return response.data;
};

export const createPurchase = async (data: Partial<Purchase>) => {
  const response = await api.post<Purchase>('/purchases', data);
  return response.data;
};

export const getPurchase = async (id: string) => {
  const response = await api.get<Purchase>(`/purchases/${id}`);
  return response.data;
};

export const getPurchasesSummary = async () => {
  const response = await api.get('/purchases/summary');
  return response.data;
};
