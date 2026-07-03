import api from './client';

// NOTE: all field names are camelCase because the API client transforms
// snake_case → camelCase on every response (see api/client.ts).
export interface CashoutRecord {
  id: number | null;
  cashoutDate: string;
  openingCash: number;
  cashSales: number;
  gpaySales: number;
  expenses: number;
  expectedCash: number;
  actualCash: number | null;
  actualGpay: number | null;
  difference: number | null;
  gpayDifference: number | null;
  notes: string;
  openedByName?: string;
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
  data: { opening_cash?: number; actual_cash?: number; actual_gpay?: number; notes?: string }
): Promise<CashoutRecord> => {
  const res = await api.put(`/cashout/${id}`, data);
  return res.data?.data ?? null;
};

export const getCashoutHistory = async (): Promise<CashoutRecord[]> => {
  const res = await api.get('/cashout/history');
  return Array.isArray(res.data?.data) ? res.data.data : [];
};
