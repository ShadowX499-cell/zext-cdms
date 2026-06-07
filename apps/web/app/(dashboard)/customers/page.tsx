'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { customersApi, Customer } from '@/lib/api-client';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';

export default function CustomersPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await customersApi.list(token, search || undefined, page);
      setCustomers(res.data);
      setTotal(res.total);
    } catch { setError('Failed to load customers'); }
    finally { setLoading(false); }
  }, [token, search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} customers registered</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <input
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '7px 12px', fontSize: '13px', outline: 'none', width: '100%' }}
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      <div className="hidden md:block" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Name', 'Phone', 'Address', 'Member Since', ''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No customers yet — they are created when registering sales</td></tr>
            ) : customers.map((c) => (
              <tr
                key={c.id}
                style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                onClick={() => router.push(`/customers/${c.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '13px', marginRight: '10px', verticalAlign: 'middle' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{c.phone}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>{c.address ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>{formatDate(c.createdAt)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="block md:hidden space-y-2">
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
        ) : customers.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No customers yet — they are created when registering sales</p>
        ) : customers.map((c) => (
          <div
            key={c.id}
            onClick={() => router.push(`/customers/${c.id}`)}
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{c.phone} · {formatDate(c.createdAt)}</p>
            </div>
            <span style={{ fontSize: '12px', color: '#ef4444' }}>→</span>
          </div>
        ))}
      </div>

      <Pagination page={page} limit={20} total={total} onPage={setPage} />
    </div>
  );
}
