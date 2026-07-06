import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCashoutHistory, editCashout, CashoutRecord } from '../../api/cashouts';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateOnly } from '../../utils/formatDate';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

const ROWS_PER_PAGE = 15;

// ── status helpers ─────────────────────────────────────────────────────────────
const statusLabel = (diff: number | null): string => {
  if (diff === null) return '—';
  if (diff === 0)    return 'Balanced';
  if (diff > 0)      return `Excess ₹${Math.abs(diff).toFixed(2)}`;
  return `Shortage ₹${Math.abs(diff).toFixed(2)}`;
};
const statusColor = (diff: number | null): string => {
  if (diff === null) return 'text-slate-400';
  if (diff === 0)    return 'text-green-600 font-semibold';
  if (diff > 0)      return 'text-blue-600 font-semibold';
  return 'text-red-600 font-semibold';
};

// ── component ──────────────────────────────────────────────────────────────────
const CashoutHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cashout-history'],
    queryFn: getCashoutHistory,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selected, setSelected]         = useState<CashoutRecord | null>(null);
  // Edit form — only actual_cash, actual_gpay, notes are editable (snapshot fields are immutable)
  const [editForm, setEditForm] = useState({ actualCash: '', actualGpay: '', notes: '' });

  const editMutation = useMutation({
    mutationFn: (payload: any) => editCashout(selected!.id as number, payload),
    onError: (err: any) => toast.error(err?.response?.data?.message || t('failedToUpdate')),
    onSuccess: () => {
      toast.success(t('cashoutUpdated'));
      setIsModalOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cashout-history'] });
      queryClient.invalidateQueries({ queryKey: ['cashout'] });
      queryClient.invalidateQueries({ queryKey: ['reports-dashboard'] });
    },
  });

  const openEdit = (row: CashoutRecord) => {
    setSelected(row);
    setEditForm({
      actualCash:  row.actualCash  != null ? String(row.actualCash)  : '',
      actualGpay:  row.actualGpay  != null ? String(row.actualGpay)  : '',
      notes:       row.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const actualVal  = parseFloat(editForm.actualCash);
    const gpayVal    = editForm.actualGpay !== '' ? parseFloat(editForm.actualGpay) : undefined;
    if (isNaN(actualVal) || actualVal < 0) { toast.error(t('enterValidActualCash')); return; }
    // Send only editable fields — snapshot fields (opening_cash, expected_total) are immutable
    editMutation.mutate({
      actual_cash: actualVal,
      actual_gpay: gpayVal,
      notes:       editForm.notes,
    });
  };

  // ── Loading ──
  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  // ── Error ──
  if (isError) return (
    <div className="p-6 text-center">
      <p className="text-red-500 mb-4">{t('failedToLoadCashoutHistory')}</p>
      <Button onClick={() => refetch()}>{t('retry')}</Button>
    </div>
  );

  // ── Guard ──
  const rows: CashoutRecord[] = Array.isArray(data) ? data : [];

  if (rows.length === 0) return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">{t('cashoutHistory')}</h1>
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-slate-400 text-lg">{t('noCashoutRecordsYet')}</p>
        <p className="text-slate-400 text-sm mt-1">{t('saveTodaysDrawerHint')}</p>
      </div>
    </div>
  );

  // ── Pagination ──
  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const paged = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">{t('cashoutHistory')}</h1>

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                {[
                  t('date'),
                  t('openedBy'),
                  t('opening'),
                  t('expectedTotal'),
                  t('actualTotal'),
                  t('statusLabel'),
                  t('notes'),
                  '',
                ].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((row) => {
                const diff = row.difference != null ? Number(row.difference) : null;
                // Actual total: computed from stored actual_cash + actual_gpay
                const actTotal = (Number(row.actualCash ?? 0)) + (Number(row.actualGpay ?? 0));
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(row.cashoutDate)}</td>
                    <td className="px-3 py-3">{row.openedByName || '—'}</td>
                    <td className="px-3 py-3 font-medium">{formatCurrency(Number(row.openingCash) || 0)}</td>
                    {/* Expected Total — from stored DB snapshot; — if pre-migration record */}
                    <td className="px-3 py-3 text-blue-700 font-medium">
                      {row.expectedTotal != null ? formatCurrency(Number(row.expectedTotal)) : '—'}
                    </td>
                    {/* Actual Total — computed from stored actual_cash + actual_gpay */}
                    <td className="px-3 py-3 font-medium">
                      {row.actualCash != null ? formatCurrency(actTotal) : '—'}
                    </td>
                    {/* Status — derived from stored difference */}
                    <td className={`px-3 py-3 ${statusColor(diff)}`}>
                      {statusLabel(diff)}
                    </td>
                    <td className="px-3 py-3 text-slate-500 max-w-[120px] truncate">{row.notes || '—'}</td>
                    <td className="px-3 py-3">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>{t('edit')}</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3 mb-4">
        {paged.map((row) => {
          const diff = row.difference != null ? Number(row.difference) : null;
          const actTotal = (Number(row.actualCash ?? 0)) + (Number(row.actualGpay ?? 0));
          return (
            <div key={row.id} className="bg-white rounded-lg shadow p-4 space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold">{formatDateOnly(row.cashoutDate)}</span>
                <span className="text-xs text-slate-500">{row.openedByName || '—'}</span>
              </div>
              {[
                { label: t('opening'),       value: formatCurrency(Number(row.openingCash) || 0) },
                { label: t('expectedTotal'), value: row.expectedTotal != null ? formatCurrency(Number(row.expectedTotal)) : '—', color: 'text-blue-700' },
                { label: t('actualTotal'),   value: row.actualCash != null ? formatCurrency(actTotal) : '—' },
              ].map(({ label, value, color = '' }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-medium ${color}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t('statusLabel')}</span>
                <span className={statusColor(diff)}>{statusLabel(diff)}</span>
              </div>
              {row.notes && <p className="text-xs text-slate-400 italic">{row.notes}</p>}
              <Button size="sm" className="w-full mt-1" variant="secondary" onClick={() => openEdit(row)}>
                {t('edit')}
              </Button>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-slate-500">{t('pageOf')} {page} {t('of')} {totalPages} — {rows.length} {t('records')}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1}          onClick={() => setPage(p => p - 1)}>{t('prev')}</Button>
            <Button size="sm" variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>{t('next')}</Button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {isModalOpen && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">{t('editCashout')}</h2>
            <p className="text-sm text-slate-500 mb-1">
              {formatDateOnly(selected.cashoutDate)}
            </p>
            {/* Show immutable snapshot values for reference */}
            {selected.expectedTotal != null && (
              <p className="text-sm text-blue-700 font-medium mb-4">
                {t('expectedTotal')}: {formatCurrency(Number(selected.expectedTotal))}
              </p>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label={t('actualCashLabel')}
                type="number" min="0" step="0.01"
                value={editForm.actualCash}
                onChange={(e: any) => setEditForm({ ...editForm, actualCash: e.target.value })}
                required
              />
              <Input
                label={t('actualGpayOnline')}
                type="number" min="0" step="0.01"
                value={editForm.actualGpay}
                onChange={(e: any) => setEditForm({ ...editForm, actualGpay: e.target.value })}
                placeholder={t('optional')}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('notesReason')}</label>
                <textarea
                  className="w-full border border-slate-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" isLoading={editMutation.isPending}>{t('saveChanges')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashoutHistory;
