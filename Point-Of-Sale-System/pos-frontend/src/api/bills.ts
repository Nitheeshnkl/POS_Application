import api from './client';
import { Bill } from '../types';

export const getBills = async (params?: {
  start_date?: string;
  end_date?: string;
  cashier_id?: string;
  payment_mode?: string;
}) => {
  const response = await api.get<Bill[]>('/bills', { params });
  return response.data;
};

export const getBillById = async (id: string) => {
  const response = await api.get<Bill>(`/bills/${id}`);
  return response.data;
};

export const createBill = async (billData: any) => {
  const response = await api.post<Bill>('/bills', billData);
  return response.data;
};

export const cancelBill = async (id: string) => {
  const response = await api.put<{ message: string }>(`/bills/${id}/cancel`);
  return response.data;
};
