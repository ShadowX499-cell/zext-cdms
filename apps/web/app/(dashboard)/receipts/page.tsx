'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { receiptsApi, Receipt } from '@/lib/api-client';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate, formatNaira } from '@/lib/utils';

const RECEIPT_TYPES = ['', 'NG_USED_CAR', 'TOKUNBO_CAR', 'SWAP_DEAL', 'ACCESSORIES_BIKE'];

export default function ReceiptsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await receiptsApi.list(token, { type: type || undefined, page, limit: 20 });
      setReceipts(res.data);
      setTotal(res.total);
    } catch { setError('Failed to load receipts'); }
    finally { setLoading(false); }
  }, [token, type, page]);

  useEffect(() => { load(); }, [load]);

  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Receipts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} receipts issued</p>
        </div>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '7px 12px', fontSize: '13px' }}
        >
          {RECEIPT_TYPES.map((t) => <option key={t} value={t}>{t ? typeLabel(t) : 'All Types'}</option>)}
        </select>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Receipt No.', 'Type', 'Vehicle / Buyer', 'Amount', 'Date', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No receipts yet</td></tr>
            ) : receipts.map((r) => (
              <tr
                key={r.id}
                style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                onClick={() => router.push(`/receipts/${r.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>{r.receiptNumber}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{typeLabel(r.type)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{r.sale?.vehicle?.name ?? '—'}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.sale?.buyerName}</p>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {r.sale?.sellingPrice ? formatNaira(parseFloat(r.sale.sellingPrice)) : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{formatDate(r.receiptDate)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {r.isVoided
                    ? <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>VOIDED</span>
                    : <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Valid</span>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={20} total={total} onPage={setPage} />
    </div>
  );
}
