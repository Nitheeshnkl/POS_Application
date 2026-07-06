import api from './client';

// NOTE: all field names are camelCase because the API client transforms
// snake_case → camelCase on every response (see api/client.ts).
export interface CashoutRecord {
  id: number | null;
  cashoutDate: string;
  openingCash: number;
  // Live-computed for current drawer; null for history (not a stored column)
  cashSales: number | null;
  gpaySales: number | null;
  // New stored snapshot field — null for records saved before migration 06
  expectedTotal: number | null;
  // Actual total = actualCash + actualGpay (computed)
  actualTotal: number | null;
  // Existing fields kept for backward compatibility
  expenses: number | null;           // 0 for current drawer; null for history
  expectedCash: number | null;       // equals expectedTotal
  actualCash: number | null;
  actualGpay: number | null;
  difference: number | null;
  gpayDifference: number | null;     // null for history
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
  data: { actual_cash?: number; actual_gpay?: number; notes?: string }
): Promise<CashoutRecord> => {
  const res = await api.put(`/cashout/${id}`, data);
  return res.data?.data ?? null;
};

export const getCashoutHistory = async (): Promise<CashoutRecord[]> => {
  const res = await api.get('/cashout/history');
  return Array.isArray(res.data?.data) ? res.data.data : [];
};
