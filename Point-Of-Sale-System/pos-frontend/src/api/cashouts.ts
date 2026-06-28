import api from './client';

export interface CashoutRecord {
  id: number | null;
  cashout_date: string;
  opening_cash: number;
  cash_sales: number;
  gpay_sales: number;
  expenses: number;
  expected_cash: number;
  actual_cash: number | null;
  actual_gpay: number | null;
  difference: number | null;
  gpay_difference: number | null;
  notes: string;
  opened_by_name?: string;
}

export const getCurrentDrawer = async (): Promise<CashoutRecord> => {
  const res = await api.get('/cashout/current');
  return res.data?.data ?? null;
};

export const saveCashout = async (data: {
  opening_cash: number;
  actual_cash: number;
  actual_gpay?: number | null;
  notes?: string;
  date?: string;
}): Promise<CashoutRecord> => {
  const res = await api.post('/cashout/save', data);
  return res.data?.data ?? null;
};

export const editCashout = async (
  id: number,
  data: { opening_cash?: number; actual_cash?: number; notes?: string }
): Promise<CashoutRecord> => {
  const res = await api.put(`/cashout/${id}`, data);
  return res.data?.data ?? null;
};

export const getCashoutHistory = async (): Promise<CashoutRecord[]> => {
  const res = await api.get('/cashout/history');
  return Array.isArray(res.data?.data) ? res.data.data : [];
};