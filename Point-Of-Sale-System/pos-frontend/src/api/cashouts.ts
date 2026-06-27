import api from './client';
import { Cashout } from '../types';

export interface TodaySummary {
  cash: number;
  upi: number;
  card: number;
  credit: number;
  total: number;
  billCount: number;
  cashoutDone: boolean;
  cashoutClosedAt?: string;
}

export const getTodaySummary = async (): Promise<TodaySummary> => {
  const response = await api.get('/cashouts/today-summary');
  return response.data;
};

export const createCashout = async (data: {
  actual_cash?: number;
  denomination_breakdown?: Record<string, number>;
  notes?: string;
}): Promise<Cashout> => {
  const response = await api.post('/cashouts', data);
  return response.data;
};

export const getCashouts = async (params?: {
  start_date?: string;
  end_date?: string;
  cashier_id?: string;
}): Promise<Cashout[]> => {
  const response = await api.get('/cashouts', { params });
  return response.data;
};

export const getCashoutById = async (id: string): Promise<Cashout> => {
  const response = await api.get(`/cashouts/${id}`);
  return response.data;
};
