import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { createCashout } from '../../api/cashouts';
import { formatCurrency } from '../../utils/formatCurrency';

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const Cashout: React.FC = () => {
  const [summary, setSummary]             = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [existingCashout, setExistingCashout]   = useState<any>(null);

  const [showDenominations, setShowDenominations] = useState(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>(
    Object.fromEntries(DENOMINATIONS.map(d => [d, 0]))
  );
  const [actualCashOverride, setActualCashOverride] = useState('');
  const [notes, setNotes] = useState('');

  async function fetchSummary() {
    setLoadingSummary(true);
    try {
      const res = await axios.get('/api/v1/cashouts/today-summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Failed to fetch summary', e);
    } finally {
      setLoadingSummary(false);
    }
  }

  async function checkExisting() {
    try {
      const res = await axios.get('/api/v1/cashouts?date=today');
      if (res.data.length > 0) {
        setAlreadySubmitted(true);
        setExistingCashout(res.data[0]);
      } else {
        setAlreadySubmitted(false);
        setExistingCashout(null);
      }
    } catch (e) {
      console.error('Failed to check existing cashout', e);
    }
  }

  useEffect(() => {
    fetchSummary();
    checkExisting();
  }, []);

  const mutation = useMutation({
    mutationFn: createCashout,
    onSuccess: () => {
      toast.success('Cashout recorded successfully!');
      checkExisting();
      fetchSummary();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record cashout');
    },
  });

  const denomTotal = DENOMINATIONS.reduce((sum, d) => sum + d * (denomCounts[d] || 0), 0);
  const actualCash = showDenominations ? denomTotal : parseFloat(actualCashOverride) || 0;
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

  return (
    <>
      <Toaster position="top-right" />
      <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>

        <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
          Cash Drawer
        </h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
          End-of-day cash settlement for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Today's Summary */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>📊 Today's Sales Summary</span>
            <button
              onClick={fetchSummary}
              disabled={loadingSummary}
              style={{
                padding: '7px 14px', fontSize: '13px', borderRadius: '6px',
                border: '1px solid #d1d5db', background: '#fff', color: '#374151',
                cursor: loadingSummary ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {loadingSummary ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { icon: '💵', label: 'Cash',   value: summary?.cash   ?? 0 },
                { icon: '📱', label: 'UPI',    value: summary?.upi    ?? 0 },
                { icon: '💳', label: 'Card',   value: summary?.card   ?? 0 },
                { icon: '📒', label: 'Credit', value: summary?.credit ?? 0 },
              ].map(row => (
                <tr key={row.label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', color: '#374151', fontSize: '14px' }}>{row.icon} {row.label}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#111827', fontSize: '14px' }}>{formatCurrency(Number(row.value))}</td>
                </tr>
              ))}
              <tr style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827', fontSize: '14px' }}>🧾 Total</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#111827', fontSize: '15px' }}>
                  {formatCurrency(Number(summary?.total || 0))}
                  <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '12px', marginLeft: '8px' }}>
                    ({summary?.bill_count || 0} bills)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {alreadySubmitted ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <p style={{ fontWeight: 600, color: '#166534', margin: '0 0 4px', fontSize: '15px' }}>Today's cashout is complete</p>
            <p style={{ fontSize: '13px', color: '#4b7c5e', margin: 0 }}>
              Recorded at {existingCashout?.closed_at
                ? new Date(existingCashout.closed_at).toLocaleTimeString('en-IN')
                : '—'}
              {existingCashout?.cashier_name ? ` by ${existingCashout.cashier_name}` : ''}
            </p>
          </div>
        ) : (
          <>
            {/* Denomination Counter */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px', overflow: 'hidden' }}>
              <button
                onClick={() => setShowDenominations(!showDenominations)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: 500, fontSize: '14px', color: '#374151', textAlign: 'left'
                }}
              >
                <span>Count Cash Denominations (optional)</span>
                <span style={{ color: '#9ca3af' }}>{showDenominations ? '▲' : '▼'}</span>
              </button>

              {showDenominations && (
                <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px' }}>
                  {DENOMINATIONS.map(denom => (
                    <div key={denom} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ width: '48px', textAlign: 'right', fontWeight: 500, color: '#374151', fontSize: '14px' }}>₹{denom}</span>
                      <span style={{ color: '#9ca3af' }}>×</span>
                      <input
                        type="number" min="0"
                        value={denomCounts[denom] || 0}
                        onChange={e => handleDenomChange(denom, e.target.value)}
                        style={{
                          width: '72px', textAlign: 'right', border: '1px solid #d1d5db',
                          borderRadius: '6px', padding: '6px 8px', fontSize: '14px',
                          color: '#111827', background: '#fff', outline: 'none'
                        }}
                      />
                      <span style={{ color: '#9ca3af' }}>=</span>
                      <span style={{ flex: 1, textAlign: 'right', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                        {formatCurrency(denom * (denomCounts[denom] || 0))}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#111827' }}>
                    <span>Counted Cash Total:</span>
                    <span>{formatCurrency(denomTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Record Cashout */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Record Cashout</h3>

              {!showDenominations && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>
                    Actual Cash in Drawer (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter actual cash amount"
                    value={actualCashOverride}
                    onChange={e => setActualCashOverride(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: '1px solid #d1d5db', borderRadius: '6px',
                      padding: '9px 12px', fontSize: '14px',
                      color: '#111827', background: '#fff', outline: 'none'
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any discrepancy notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1px solid #d1d5db', borderRadius: '6px',
                    padding: '9px 12px', fontSize: '14px',
                    color: '#111827', background: '#fff', outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              {(actualCash > 0 || (showDenominations && denomTotal > 0)) && (
                <div style={{ background: '#f9fafb', borderRadius: '6px', padding: '12px 16px', marginBottom: '14px' }}>
                  {[
                    { label: 'Expected Cash:', value: formatCurrency(expectedCash) },
                    { label: 'Actual Cash:', value: formatCurrency(actualCash) },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#374151' }}>
                      <span>{r.label}</span><span style={{ fontWeight: 500 }}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '8px', fontWeight: 700, fontSize: '14px' }}>
                    <span>Difference:</span>
                    <span style={{ color: difference > 0 ? '#16a34a' : difference < 0 ? '#dc2626' : '#374151' }}>
                      {difference > 0 ? '+' : ''}{formatCurrency(difference)} {difference > 0 ? '✅' : difference < 0 ? '❌' : ''}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                style={{
                  width: '100%', padding: '11px',
                  background: mutation.isPending ? '#6aad8a' : '#1a6b3c',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  fontSize: '14px', fontWeight: 500,
                  cursor: mutation.isPending ? 'not-allowed' : 'pointer'
                }}
              >
                {mutation.isPending ? 'Recording…' : 'Submit Cashout'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Cashout;
