import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { getTodaySummary, createCashout } from '../../api/cashouts';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const Cashout: React.FC = () => {
  const queryClient = useQueryClient();
  const [showDenominations, setShowDenominations] = useState(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>(
    Object.fromEntries(DENOMINATIONS.map(d => [d, 0]))
  );
  const [actualCashOverride, setActualCashOverride] = useState('');
  const [notes, setNotes] = useState('');

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['cashout-today-summary'],
    queryFn: getTodaySummary,
  });

  const mutation = useMutation({
    mutationFn: createCashout,
    onSuccess: () => {
      toast.success('Cashout recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['cashout-today-summary'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record cashout');
    },
  });

  const denomTotal = DENOMINATIONS.reduce((sum, d) => sum + d * (denomCounts[d] || 0), 0);

  const actualCash = showDenominations
    ? denomTotal
    : parseFloat(actualCashOverride) || 0;

  const expectedCash = Number(summary?.cash || 0);
  const difference = actualCash - expectedCash;

  const handleDenomChange = (denom: number, value: string) => {
    setDenomCounts(prev => ({ ...prev, [denom]: parseInt(value) || 0 }));
  };

  const handleSubmit = () => {
    const breakdown = showDenominations
      ? Object.fromEntries(DENOMINATIONS.map(d => [String(d), denomCounts[d]]))
      : undefined;

    mutation.mutate({
      actual_cash: actualCash || undefined,
      denomination_breakdown: breakdown,
      notes: notes || undefined,
    });
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading today's summary...</div>;
  }

  const cashoutDone = summary?.cashoutDone;

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Cash Drawer</h1>

        {/* Today's Summary */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">📊 Today's Sales Summary</h2>
            <button
              onClick={() => refetch()}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              🔄 Refresh
            </button>
          </div>
          <table className="w-full">
            <tbody>
              <SummaryRow icon="💵" label="Cash" value={Number(summary?.cash || 0)} />
              <SummaryRow icon="📱" label="UPI" value={Number(summary?.upi || 0)} />
              <SummaryRow icon="💳" label="Card" value={Number(summary?.card || 0)} />
              <SummaryRow icon="📒" label="Credit" value={Number(summary?.credit || 0)} />
              <tr className="border-t-2 bg-gray-50 font-bold">
                <td className="px-4 py-3">🧾 Total</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(Number(summary?.total || 0))}
                  <span className="text-gray-500 font-normal text-sm ml-2">
                    ({summary?.billCount || 0} bills)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {cashoutDone ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-green-700 font-semibold text-lg">✅ Cashout recorded</div>
            <div className="text-green-600 text-sm mt-1">
              Closed at {summary?.cashoutClosedAt
                ? new Date(summary.cashoutClosedAt).toLocaleTimeString()
                : '—'}
            </div>
          </div>
        ) : (
          <>
            {/* Denomination Counter */}
            <div className="bg-white rounded-lg shadow">
              <button
                onClick={() => setShowDenominations(!showDenominations)}
                className="w-full flex justify-between items-center p-4 text-left font-medium hover:bg-gray-50"
              >
                <span>Count Cash Denominations (optional)</span>
                <span>{showDenominations ? '▲' : '▼'}</span>
              </button>

              {showDenominations && (
                <div className="border-t p-4 space-y-2">
                  {DENOMINATIONS.map(denom => (
                    <div key={denom} className="flex items-center gap-3">
                      <span className="w-16 text-right font-medium">₹{denom}</span>
                      <span className="text-gray-400">×</span>
                      <input
                        type="number"
                        min="0"
                        className="w-20 border rounded px-2 py-1 text-right"
                        value={denomCounts[denom] || 0}
                        onChange={e => handleDenomChange(denom, e.target.value)}
                      />
                      <span className="text-gray-400">=</span>
                      <span className="w-24 text-right font-medium">
                        {formatCurrency(denom * (denomCounts[denom] || 0))}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex justify-between font-bold">
                    <span>Counted Cash Total:</span>
                    <span>{formatCurrency(denomTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actual Cash + Notes */}
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
              <h3 className="font-semibold text-gray-700">Record Cashout</h3>

              {!showDenominations && (
                <Input
                  label="Actual Cash in Drawer (₹)"
                  type="number"
                  placeholder="Enter actual cash amount"
                  value={actualCashOverride}
                  onChange={e => setActualCashOverride(e.target.value)}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={2}
                  placeholder="Any discrepancy notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {(actualCash > 0 || showDenominations) && (
                <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Cash:</span>
                    <span className="font-medium">{formatCurrency(expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual Cash:</span>
                    <span className="font-medium">{formatCurrency(actualCash)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Difference:</span>
                    <span className={difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'}>
                      {difference > 0 ? '+' : ''}{formatCurrency(difference)}{' '}
                      {difference > 0 ? '✅' : difference < 0 ? '❌' : ''}
                    </span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Recording...' : 'Submit Cashout'}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const SummaryRow = ({ icon, label, value }: { icon: string; label: string; value: number }) => (
  <tr className="border-b">
    <td className="px-4 py-3 text-gray-700">
      {icon} {label}
    </td>
    <td className="px-4 py-3 text-right font-medium">{formatCurrency(value)}</td>
  </tr>
);

export default Cashout;
