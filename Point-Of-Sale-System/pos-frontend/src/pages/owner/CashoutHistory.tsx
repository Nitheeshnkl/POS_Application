import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCashoutHistory, editCashout, CashoutRecord } from '../../api/cashouts';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateOnly } from '../../utils/formatDate';
import toast from 'react-hot-toast';

const ROWS_PER_PAGE = 15;

// ── component ────────────────────────────────────────────────────────────────
const CashoutHistory: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cashout-history'],
    queryFn: getCashoutHistory,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [selected, setSelected]           = useState<CashoutRecord | null>(null);
  const [editForm, setEditForm]           = useState({ openingCash: '', actualCash: '', actualGpay: '', notes: '' });

  const editMutation = useMutation({
    mutationFn: (payload: any) => editCashout(selected!.id as number, payload),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
    onSuccess: () => {
      toast.success('Cashout updated');
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
      openingCash: row.opening_cash != null ? String(row.opening_cash) : '0',
      actualCash:  row.actual_cash  != null ? String(row.actual_cash)  : '',
      actualGpay:  row.actual_gpay  != null ? String(row.actual_gpay)  : '',
      notes:       row.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const actualVal   = parseFloat(editForm.actualCash);
    const openingVal  = parseFloat(editForm.openingCash) || 0;
    const gpayVal     = editForm.actualGpay !== '' ? parseFloat(editForm.actualGpay) : undefined;
    if (isNaN(actualVal) || actualVal < 0) { toast.error('Enter a valid actual cash amount'); return; }
    editMutation.mutate({ opening_cash: openingVal, actual_cash: actualVal, actual_gpay: gpayVal, notes: editForm.notes });
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
      <p className="text-red-500 mb-4">Failed to load cashout history.</p>
      <Button onClick={() => refetch()}>Retry</Button>
    </div>
  );

  // ── Guard ──
  const rows: CashoutRecord[] = Array.isArray(data) ? data : [];

  if (rows.length === 0) return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Cashout History</h1>
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-slate-400 text-lg">No cashout records yet.</p>
        <p className="text-slate-400 text-sm mt-1">Save today's cash drawer to see records here.</p>
      </div>
    </div>
  );

  // ── Pagination ──
  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const paged = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const diffColor = (diff: number | null) =>
    diff == null ? 'text-slate-400' : diff >= 0 ? 'text-green-600' : 'text-red-600';
  const diffLabel = (diff: number | null) =>
    diff == null ? '—' : `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Cashout History</h1>

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Date','Opened By','Opening','Cash Sales','GPay','Expenses','Expected','Actual','Difference','Notes',''].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((row) => {
                const diff = row.difference != null ? Number(row.difference) : null;
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(row.cashout_date)}</td>
                    <td className="px-3 py-3">{row.opened_by_name || '—'}</td>
                    <td className="px-3 py-3 font-medium">{formatCurrency(Number(row.opening_cash) || 0)}</td>
                    <td className="px-3 py-3 text-green-600">{formatCurrency(Number(row.cash_sales) || 0)}</td>
                    <td className="px-3 py-3 text-blue-600">{formatCurrency(Number(row.gpay_sales) || 0)}</td>
                    <td className="px-3 py-3 text-red-600">{formatCurrency(Number(row.expenses) || 0)}</td>
                    <td className="px-3 py-3 text-blue-700 font-medium">{formatCurrency(Number(row.expected_cash) || 0)}</td>
                    <td className="px-3 py-3 font-medium">{row.actual_cash != null ? formatCurrency(Number(row.actual_cash)) : '—'}</td>
                    <td className={`px-3 py-3 font-bold ${diffColor(diff)}`}>{diffLabel(diff)}</td>
                    <td className="px-3 py-3 text-slate-500 max-w-[120px] truncate">{row.notes || '—'}</td>
                    <td className="px-3 py-3">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
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
          return (
            <div key={row.id} className="bg-white rounded-lg shadow p-4 space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold">{formatDateOnly(row.cashout_date)}</span>
                <span className="text-xs text-slate-500">{row.opened_by_name || '—'}</span>
              </div>
              {[
                { label: 'Opening',  value: formatCurrency(Number(row.opening_cash) || 0) },
                { label: 'Cash Sales', value: formatCurrency(Number(row.cash_sales) || 0), color: 'text-green-600' },
                { label: 'GPay',     value: formatCurrency(Number(row.gpay_sales) || 0),   color: 'text-blue-600' },
                { label: 'Expenses', value: formatCurrency(Number(row.expenses) || 0),      color: 'text-red-600' },
                { label: 'Expected', value: formatCurrency(Number(row.expected_cash) || 0), color: 'text-blue-700 font-bold' },
                { label: 'Actual',   value: row.actual_cash != null ? formatCurrency(Number(row.actual_cash)) : '—' },
              ].map(({ label, value, color = '' }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-medium ${color}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Difference</span>
                <span className={`font-bold ${diffColor(diff)}`}>{diffLabel(diff)}</span>
              </div>
              {row.notes && <p className="text-xs text-slate-400 italic">{row.notes}</p>}
              <Button size="sm" className="w-full mt-1" variant="secondary" onClick={() => openEdit(row)}>
                Edit
              </Button>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-slate-500">Page {page} of {totalPages} — {rows.length} records</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1}          onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {isModalOpen && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">Edit Cashout</h2>
            <p className="text-sm text-slate-500 mb-4">
              {formatDateOnly(selected.cashout_date)} ·
              Expected: {formatCurrency(Number(selected.expected_cash) || 0)}
            </p>
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Opening Cash (₹)"
                type="number" min="0" step="0.01"
                value={editForm.openingCash}
                onChange={(e: any) => setEditForm({ ...editForm, openingCash: e.target.value })}
              />
              <Input
                label="Actual Cash (₹)"
                type="number" min="0" step="0.01"
                value={editForm.actualCash}
                onChange={(e: any) => setEditForm({ ...editForm, actualCash: e.target.value })}
                required
              />
              <Input
                label="Actual GPay / Online (₹)"
                type="number" min="0" step="0.01"
                value={editForm.actualGpay}
                onChange={(e: any) => setEditForm({ ...editForm, actualGpay: e.target.value })}
                placeholder="Optional"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Reason</label>
                <textarea
                  className="w-full border border-slate-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={editMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashoutHistory;
