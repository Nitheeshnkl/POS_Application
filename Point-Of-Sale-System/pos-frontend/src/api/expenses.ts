import api from './client';
import { Expense } from '../types';

export const getExpenses = async (params?: {
  start_date?: string;
  end_date?: string;
  category?: string;
}) => {
  const response = await api.get<Expense[]>('/expenses', { params });
  return response.data;
};

export const createExpense = async (expense: Omit<Expense, 'id'>) => {
  const response = await api.post<Expense>('/expenses', expense);
  return response.data;
};

export const getMonthlyExpenses = async () => {
  const response = await api.get('/expenses/monthly');
  return response.data;
};
