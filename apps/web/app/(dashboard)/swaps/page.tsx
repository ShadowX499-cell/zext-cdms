'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { swapsApi, Swap } from '@/lib/api-client';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate, formatNaira } from '@/lib/utils';

export default function SwapsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await swapsApi.list(token, page);
      setSwaps(res.data);
      setTotal(res.total);
    } catch { setError('Failed to load swaps'); }
    finally { setLoading(false); }
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Swap Deals</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} swaps recorded</p>
        </div>
        <button
          onClick={() => router.push('/swaps/register')}
          style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          + Register Swap
        </button>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      <div className="hidden md:block" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Outgoing Vehicle', 'Incoming Vehicle', 'Mode', 'Cash Difference', 'Date', 'Receipt', ''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</td></tr>
            ) : swaps.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No swaps recorded yet</td></tr>
            ) : swaps.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.outgoingVehicle?.name ?? '—'}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{s.outgoingVehicle?.chassisNumber}</p>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.incomingVehicle?.name ?? '—'}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{s.incomingVehicle?.chassisNumber}</p>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{s.modeOfSwap.replace(/_/g, ' ')}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  {s.cashDifference && parseFloat(s.cashDifference) > 0
                    ? <><strong>{formatNaira(parseFloat(s.cashDifference))}</strong> <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({s.cashDirection === 'CUSTOMER_PAYS' ? 'Customer pays' : 'ZEXT pays'})</span></>
                    : <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Direct swap</span>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{formatDate(s.dateOfSwap)}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: '#60a5fa' }}>
                  {s.receipt?.receiptNumber ?? '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {s.receipt && (
                    <button onClick={() => router.push(`/receipts/${s.id}`)} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Receipt →
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="block md:hidden space-y-2">
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
        ) : swaps.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No swaps recorded yet</p>
        ) : swaps.map((s) => (
          <div
            key={s.id}
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '12px 14px',
              cursor: s.receipt ? 'pointer' : 'default',
            }}
            onClick={() => s.receipt && router.push(`/receipts/${s.id}`)}
            onMouseEnter={(e) => { if (s.receipt) e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>OUT → IN</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.outgoingVehicle?.name ?? '—'} → {s.incomingVehicle?.name ?? '—'}
                </p>
              </div>
              {s.cashDifference && parseFloat(s.cashDifference) > 0 && (
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: '8px' }}>
                  {formatNaira(parseFloat(s.cashDifference))}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.modeOfSwap.replace(/_/g, ' ')} · {formatDate(s.dateOfSwap)}</p>
              {s.receipt?.receiptNumber && (
                <p style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace' }}>{s.receipt.receiptNumber}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} limit={20} total={total} onPage={setPage} />
    </div>
  );
}
