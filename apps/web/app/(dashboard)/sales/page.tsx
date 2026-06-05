'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { salesApi, Sale } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate, formatNaira } from '@/lib/utils';

export default function SalesPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;
  const admin = useAuthStore(isAdmin);

  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reverseTarget, setReverseTarget] = useState<Sale | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await salesApi.list(token, { page, limit: 20 });
      setSales(res.data);
      setTotal(res.total);
    } catch { setError('Failed to load sales'); }
    finally { setLoading(false); }
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  async function handleReverse() {
    if (!reverseTarget || !reversalReason.trim()) return;
    setActionLoading(true);
    try {
      await salesApi.reverse(token, reverseTarget.id, reversalReason);
      setReverseTarget(null);
      setReversalReason('');
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to reverse sale');
    } finally { setActionLoading(false); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Sales</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} sales recorded</p>
        </div>
        <button
          onClick={() => router.push('/sales/register')}
          style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          + Register Sale
        </button>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Vehicle', 'Buyer', 'Date Sold', 'Selling Price', 'Mode', 'Receipt', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No sales recorded yet</td></tr>
            ) : sales.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.vehicle?.name ?? '—'}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{s.vehicle?.chassisNumber}</p>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{s.buyerName}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{formatDate(s.dateSold)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatNaira(parseFloat(s.sellingPrice))}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{s.modeOfSale.replace(/_/g, ' ')}</td>
                <td style={{ padding: '12px 16px' }}>
                  {s.receipt ? (
                    <button
                      onClick={() => router.push(`/receipts/${s.receipt!.id}`)}
                      style={{ fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
                    >
                      {s.receipt.receiptNumber}
                    </button>
                  ) : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {s.isReversed
                    ? <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Reversed</span>
                    : <StatusBadge status="SOLD" />}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {admin && !s.isReversed && (
                    <button
                      onClick={() => setReverseTarget(s)}
                      style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Reverse
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={20} total={total} onPage={setPage} />

      {/* Reverse sale modal */}
      {reverseTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '28px 32px', maxWidth: '440px', width: '90%' }}>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '8px' }}>Reverse Sale</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              This will return <strong>{reverseTarget.vehicle?.name}</strong> to available inventory. The sale record is preserved.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Reversal Reason *</label>
              <textarea
                style={{ width: '100%', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '9px 12px', fontSize: '13px', minHeight: '72px', resize: 'vertical', outline: 'none' }}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="State the reason for reversing this sale (min 10 chars)"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setReverseTarget(null); setReversalReason(''); }} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={reversalReason.trim().length < 10 || actionLoading}
                onClick={handleReverse}
                style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: reversalReason.trim().length < 10 ? 'var(--color-bg-surface)' : '#ef4444', color: '#fff' }}
              >
                {actionLoading ? 'Reversing…' : 'Reverse Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
