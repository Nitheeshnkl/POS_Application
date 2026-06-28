import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentDrawer, saveCashout } from '../../api/cashouts';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateOnly } from '../../utils/formatDate';
import toast from 'react-hot-toast';

// ── helper row ───────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string; color?: string; bold?: boolean }> = ({
  label, value, color = 'text-slate-800', bold = false
}) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`text-sm ${bold ? 'font-bold text-base' : 'font-medium'} ${color}`}>{value}</span>
  </div>
);

const Cashout: React.FC = () => {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: drawer, isLoading, isError, refetch } = useQuery({
    queryKey: ['cashout'],
    queryFn: getCurrentDrawer,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const [form, setForm] = useState({
    openingCash: '0',
    actualCash:  '',
    actualGpay:  '',
    notes:       '',
  });

  useEffect(() => {
    if (!drawer) return;
    setForm({
      openingCash: drawer.opening_cash != null ? String(drawer.opening_cash) : '0',
      actualCash:  drawer.actual_cash  != null ? String(drawer.actual_cash)  : '',
      actualGpay:  drawer.actual_gpay  != null ? String(drawer.actual_gpay)  : '',
      notes:       drawer.notes || '',
    });
  }, [drawer]);

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['cashout'] });
    await queryClient.invalidateQueries({ queryKey: ['cashout-history'] });
    await queryClient.invalidateQueries({ queryKey: ['reports-dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: saveCashout,
    onError:   (err: any) => toast.error(err?.response?.data?.message || err.message || 'Failed to save'),
    onSuccess: async () => { toast.success('Cash saved successfully'); await invalidateAll(); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (isError) return (
    <div className="p-6 text-center">
      <p className="text-red-500 mb-4">Failed to load cash drawer data.</p>
      <Button onClick={() => refetch()}>Retry</Button>
    </div>
  );

  // ── live computed values ──
  const opening       = parseFloat(form.openingCash) || 0;
  const actual        = parseFloat(form.actualCash);
  const actualGpay    = parseFloat(form.actualGpay);
  const cashSales     = drawer?.cash_sales  ?? 0;
  const gpaySales     = drawer?.gpay_sales  ?? 0;
  const expenses      = drawer?.expenses    ?? 0;
  const expectedCash  = opening + cashSales - expenses;
  const cashDiff      = !isNaN(actual)     ? actual     - expectedCash : null;
  const gpayDiff      = !isNaN(actualGpay) ? actualGpay - gpaySales   : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.actualCash === '') {
      toast.error('Actual cash amount is required');
      return;
    }
    const actualVal     = parseFloat(form.actualCash);
    const actualGpayVal = form.actualGpay !== '' ? parseFloat(form.actualGpay) : null;
    if (isNaN(actualVal) || actualVal < 0) {
      toast.error('Enter a valid actual cash amount');
      return;
    }
    try {
      await saveMutation.mutateAsync({
        opening_cash: opening,
        actual_cash:  actualVal,
        actual_gpay:  actualGpayVal,
        notes:        form.notes,
        date:         today,
      });
    } catch (e) {
      // Errors are handled by onError callback in useMutation
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cash Drawer</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDateOnly(today)}</p>
        </div>
        {drawer?.id && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            Saved Today
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

        {/* ── System figures (read-only) ── */}
        <div className="bg-white rounded-lg shadow p-5 space-y-1">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Today's System Figures
          </h2>
          <InfoRow label="Opening Cash"    value={formatCurrency(opening)} />
          <InfoRow label="Cash Sales"      value={`+${formatCurrency(cashSales)}`}  color="text-green-600" />
          <InfoRow label="GPay / Online"   value={`+${formatCurrency(gpaySales)}`}  color="text-blue-600" />
          <InfoRow label="Expenses"        value={`-${formatCurrency(expenses)}`}   color="text-red-600" />
          <InfoRow
            label="Expected Cash"
            value={formatCurrency(expectedCash)}
            color="text-blue-700"
            bold
          />

          {/* Cash difference */}
          {cashDiff !== null && (
            <InfoRow
              label="Cash Difference"
              value={`${cashDiff >= 0 ? '+' : ''}${formatCurrency(cashDiff)}`}
              color={cashDiff >= 0 ? 'text-green-600' : 'text-red-600'}
              bold
            />
          )}

          {/* GPay difference */}
          {gpayDiff !== null && (
            <InfoRow
              label="GPay Difference"
              value={`${gpayDiff >= 0 ? '+' : ''}${formatCurrency(gpayDiff)}`}
              color={gpayDiff >= 0 ? 'text-green-600' : 'text-red-600'}
              bold
            />
          )}
        </div>

        {/* ── Form ── */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
            {drawer?.id ? "Edit Today's Cash" : "Save Today's Cash"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Opening Cash (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.openingCash}
              onChange={(e: any) => setForm({ ...form, openingCash: e.target.value })}
            />
            <Input
              label="Actual Cash in Drawer (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.actualCash}
              onChange={(e: any) => setForm({ ...form, actualCash: e.target.value })}
              required
              placeholder="Count physical cash and enter"
            />
            <Input
              label="Actual GPay / Online Received (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.actualGpay}
              onChange={(e: any) => setForm({ ...form, actualGpay: e.target.value })}
              placeholder="Optional — check GPay app"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <textarea
                className="w-full border border-slate-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any discrepancy reason..."
              />
            </div>

            <Button type="submit" className="w-full" isLoading={saveMutation.isPending}>
              {drawer?.id ? "Update Today's Cash" : "Save Today's Cash"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Cashout;
