import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentDrawer, saveCashout } from '../../api/cashouts';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateOnly } from '../../utils/formatDate';
import { useLanguage } from '../../i18n/LanguageContext';
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
  const { t } = useLanguage();
  const today = new Date().toISOString().split('T')[0];

  const { data: drawer, isLoading, isError, refetch } = useQuery({
    queryKey: ['cashout'],
    queryFn: getCurrentDrawer,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
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
      openingCash: drawer.openingCash != null ? String(drawer.openingCash) : '0',
      actualCash:  drawer.actualCash  != null ? String(drawer.actualCash)  : '',
      actualGpay:  drawer.actualGpay  != null ? String(drawer.actualGpay)  : '',
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
    onError:   (err: any) => toast.error(err?.response?.data?.message || err.message || t('failedToSave')),
    onSuccess: async () => { toast.success(t('cashSavedSuccessfully')); await invalidateAll(); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (isError) return (
    <div className="p-6 text-center">
      <p className="text-red-500 mb-4">{t('failedToLoadDrawer')}</p>
      <Button onClick={() => refetch()}>{t('retry')}</Button>
    </div>
  );

  // ── live computed values ──
  const opening      = Number(form.openingCash || 0);
  const actual       = parseFloat(form.actualCash);
  const actualGpay   = parseFloat(form.actualGpay);
  const cashSales    = Number(drawer?.cashSales || 0);
  const gpaySales    = Number(drawer?.gpaySales || 0);
  const expenses     = Number(drawer?.expenses || 0);
  const expectedCash = opening + cashSales - expenses;
  const cashDiff     = !isNaN(actual)     ? actual     - expectedCash : null;
  const gpayDiff     = !isNaN(actualGpay) ? actualGpay - gpaySales   : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.actualCash === '') {
      toast.error(t('actualCashRequired'));
      return;
    }
    const actualVal     = parseFloat(form.actualCash);
    const actualGpayVal = form.actualGpay !== '' ? parseFloat(form.actualGpay) : null;
    if (isNaN(actualVal) || actualVal < 0) {
      toast.error(t('enterValidActualCash'));
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
      // Errors handled by onError callback
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('cashDrawer')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDateOnly(today)}</p>
        </div>
        {drawer?.id && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            {t('savedToday')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

        {/* ── System figures (read-only) ── */}
        <div className="bg-white rounded-lg shadow p-5 space-y-1">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
            {t('todaysSystemFigures')}
          </h2>
          <InfoRow label={t('openingCash')}  value={formatCurrency(opening)} />
          <InfoRow label={t('cashSales')}    value={`+${formatCurrency(cashSales)}`}  color="text-green-600" />
          <InfoRow label={t('gpayOnline')}   value={`+${formatCurrency(gpaySales)}`}  color="text-blue-600" />
          <InfoRow label={t('expenses')}     value={`-${formatCurrency(expenses)}`}   color="text-red-600" />
          <InfoRow
            label={t('expectedCash')}
            value={formatCurrency(expectedCash)}
            color="text-blue-700"
            bold
          />

          {cashDiff !== null && (
            <InfoRow
              label={t('cashDifference')}
              value={`${cashDiff >= 0 ? '+' : ''}${formatCurrency(cashDiff)}`}
              color={cashDiff >= 0 ? 'text-green-600' : 'text-red-600'}
              bold
            />
          )}

          {gpayDiff !== null && (
            <InfoRow
              label={t('gpayDifference')}
              value={`${gpayDiff >= 0 ? '+' : ''}${formatCurrency(gpayDiff)}`}
              color={gpayDiff >= 0 ? 'text-green-600' : 'text-red-600'}
              bold
            />
          )}
        </div>

        {/* ── Form ── */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
            {drawer?.id ? t('editTodaysCash') : t('saveTodaysCash')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('openingCash') + ' (₹)'}
              type="number"
              min="0"
              step="0.01"
              value={form.openingCash}
              onChange={(e: any) => setForm({ ...form, openingCash: e.target.value })}
            />
            <Input
              label={t('actualCashInDrawer')}
              type="number"
              min="0"
              step="0.01"
              value={form.actualCash}
              onChange={(e: any) => setForm({ ...form, actualCash: e.target.value })}
              required
              placeholder={t('countPhysicalCash')}
            />
            <Input
              label={t('actualGpayReceived')}
              type="number"
              min="0"
              step="0.01"
              value={form.actualGpay}
              onChange={(e: any) => setForm({ ...form, actualGpay: e.target.value })}
              placeholder={t('optionalCheckGpay')}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('notesOptional')}</label>
              <textarea
                className="w-full border border-slate-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('discrepancyReason')}
              />
            </div>

            <Button type="submit" className="w-full" isLoading={saveMutation.isPending}>
              {drawer?.id ? t('updateTodaysCash') : t('saveTodaysCash')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Cashout;
