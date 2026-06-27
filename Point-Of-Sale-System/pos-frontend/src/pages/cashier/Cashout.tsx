import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatCurrency';

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const Cashout: React.FC = () => {
  const [actualCash, setActualCash] = useState('');
  const [actualGpay, setActualGpay] = useState('');
  const [notes, setNotes]           = useState('');
  const [summary, setSummary]       = useState<any>(null);
  const [existing, setExisting]     = useState<any>(null);
  const [isEditing, setIsEditing]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(false);

  const [showDenominations, setShowDenominations] = useState(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>(
    Object.fromEntries(DENOMINATIONS.map(d => [d, 0]))
  );

  const denomTotal = DENOMINATIONS.reduce((sum, d) => sum + d * (denomCounts[d] || 0), 0);
  const finalCashout = (Number(actualCash) || 0) + (Number(actualGpay) || 0);

  async function fetchSummary() {
    setFetching(true);
    try {
      const [sumRes, existRes] = await Promise.all([
        axios.get('/api/v1/cashouts/today-summary'),
        axios.get('/api/v1/cashouts?date=today'),
      ]);
      setSummary(sumRes.data);
      if (existRes.data.length > 0) {
        const c = existRes.data[0];
        setExisting(c);
        setActualCash(c.actual_cash ?? '');
        setActualGpay(c.actual_gpay ?? '');
        setNotes(c.notes ?? '');
        setIsEditing(false);
      } else {
        setExisting(null);
        setIsEditing(true);
      }
    } catch (e) {
      console.error('Failed to fetch summary', e);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { fetchSummary(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const breakdown = showDenominations
        ? Object.fromEntries(DENOMINATIONS.map(d => [String(d), denomCounts[d]]))
        : undefined;
      await axios.post('/api/v1/cashouts', {
        actual_cash: actualCash !== '' ? Number(actualCash) : (showDenominations ? denomTotal : null),
        actual_gpay: actualGpay !== '' ? Number(actualGpay) : null,
        denomination_breakdown: breakdown,
        notes: notes || null,
      });
      await fetchSummary();
      setIsEditing(false);
      toast.success('Cashout saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save cashout');
    } finally {
      setLoading(false);
    }
  }

  const expectedCash = Number(summary?.cash ?? 0);
  const cashDiff = (Number(actualCash) || 0) - expectedCash;

  return (
    <>
      <Toaster position="top-right" />
      <div style={{ padding: '24px', maxWidth: '680px', margin: '0 auto' }}>

        <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
          Cash Drawer
        </h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px' }}>
          End-of-day settlement — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Today's Summary */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>📊 Today's Sales Summary</span>
            <button
              onClick={fetchSummary}
              disabled={fetching}
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: fetching ? 'not-allowed' : 'pointer' }}
            >
              {fetching ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Mode</th>
                <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>System (expected)</th>
                <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actual (you count)</th>
              </tr>
            </thead>
            <tbody>
              {/* Cash row — editable */}
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 16px', color: '#374151', fontSize: '14px' }}>💵 Cash</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#111827', fontSize: '14px' }}>{formatCurrency(Number(summary?.cash ?? 0))}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  {isEditing ? (
                    <div>
                      <input
                        type="number"
                        placeholder="₹ 0.00"
                        value={actualCash}
                        onChange={e => setActualCash(e.target.value)}
                        style={{ width: '110px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', color: '#111827', background: '#fff', textAlign: 'right' }}
                      />
                      {actualCash !== '' && (
                        <div style={{ fontSize: '12px', marginTop: '3px', color: cashDiff >= 0 ? '#166534' : '#b91c1c', fontWeight: 500 }}>
                          {cashDiff >= 0 ? '+' : ''}₹{cashDiff.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>
                      {existing?.actual_cash != null ? formatCurrency(Number(existing.actual_cash)) : '—'}
                    </span>
                  )}
                </td>
              </tr>
              {/* GPay row — editable */}
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 16px', color: '#374151', fontSize: '14px' }}>📱 GPay / UPI</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#111827', fontSize: '14px' }}>{formatCurrency(Number(summary?.upi ?? 0))}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  {isEditing ? (
                    <input
                      type="number"
                      placeholder="₹ 0.00"
                      value={actualGpay}
                      onChange={e => setActualGpay(e.target.value)}
                      style={{ width: '110px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', color: '#111827', background: '#fff', textAlign: 'right' }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>
                      {existing?.actual_gpay != null ? formatCurrency(Number(existing.actual_gpay)) : '—'}
                    </span>
                  )}
                </td>
              </tr>
              {/* Card — info only */}
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 16px', color: '#374151', fontSize: '14px' }}>💳 Card</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#111827', fontSize: '14px' }}>{formatCurrency(Number(summary?.card ?? 0))}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#9ca3af', fontSize: '13px' }}>auto-matched</td>
              </tr>
              {/* Credit — info only */}
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 16px', color: '#374151', fontSize: '14px' }}>📒 Credit</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#111827', fontSize: '14px' }}>{formatCurrency(Number(summary?.credit ?? 0))}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#9ca3af', fontSize: '13px' }}>receivable</td>
              </tr>
              {/* Final cashout total row */}
              <tr style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827', fontSize: '14px' }}>🧾 Grand Total</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#111827', fontSize: '14px' }}>
                  {formatCurrency(Number(summary?.total ?? 0))}
                  <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '12px', marginLeft: '6px' }}>({summary?.bill_count ?? 0} bills)</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#111827', fontSize: '14px' }}>
                  {isEditing
                    ? formatCurrency(finalCashout)
                    : (existing ? formatCurrency(Number(existing.actual_cash ?? 0) + Number(existing.actual_gpay ?? 0)) : '—')
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Existing cashout banner (read mode) */}
        {existing && !isEditing && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#166534' }}>✅ Today's cashout recorded</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#4b7c5e' }}>
                Cash: {existing.actual_cash != null ? formatCurrency(Number(existing.actual_cash)) : '—'} | GPay: {existing.actual_gpay != null ? formatCurrency(Number(existing.actual_gpay)) : '—'} | Saved at {existing.closed_at ? new Date(existing.closed_at).toLocaleTimeString('en-IN') : '—'}
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              style={{ padding: '7px 16px', border: '1px solid #166534', borderRadius: '6px', background: '#fff', color: '#166534', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              Edit
            </button>
          </div>
        )}

        {/* Cashout form (edit/new mode) */}
        {isEditing && (
          <form onSubmit={handleSubmit}>
            {/* Denomination counter */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '16px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowDenominations(!showDenominations)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px', color: '#374151', textAlign: 'left' }}
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
                        onChange={e => setDenomCounts(prev => ({ ...prev, [denom]: parseInt(e.target.value) || 0 }))}
                        style={{ width: '72px', textAlign: 'right', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '14px', color: '#111827', background: '#fff', outline: 'none' }}
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

            {/* Notes */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any discrepancy notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', padding: '9px 12px', fontSize: '14px', color: '#111827', background: '#fff', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? '#6aad8a' : '#1a6b3c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Saving…' : existing ? 'Update Cashout' : 'Submit Cashout'}
            </button>

            {existing && (
              <button
                type="button"
                onClick={() => { setIsEditing(false); }}
                style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </div>
    </>
  );
};

export default Cashout;
