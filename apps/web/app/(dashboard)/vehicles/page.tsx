'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { vehiclesApi, Vehicle } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS = ['', 'AVAILABLE', 'SOLD', 'SWAPPED', 'ARCHIVED'];
const CATEGORY_OPTIONS = ['', 'NG_USED', 'TOKUNBO', 'SCOOTER_BIKE'];

export default function VehiclesPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await vehiclesApi.list(token, { status: status || undefined, category: category || undefined, search: search || undefined, page, limit: 20 });
      setVehicles(res.data);
      setTotal(res.total);
    } catch {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [token, status, category, search, page]);

  useEffect(() => { load(); }, [load]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    color: 'var(--color-text-primary)',
    padding: '7px 12px',
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Inventory</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} vehicles registered</p>
        </div>
        <button
          onClick={() => router.push('/vehicles/register')}
          style={{
            background: 'linear-gradient(135deg,#ef4444,#f97316)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Register Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          style={{ ...inputStyle, width: '100%' }}
          placeholder="Search name, chassis, plate..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select style={inputStyle} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
        <select style={inputStyle} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c ? c.replace('_', ' ') : 'All Categories'}</option>)}
        </select>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      {/* Table */}
      <div className="hidden md:block" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Vehicle', 'Chassis', 'Category', 'Status', 'Date Bought', 'Registered By', ''].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No vehicles found</td></tr>
            ) : vehicles.map((v) => (
              <tr
                key={v.id}
                style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                onClick={() => router.push(`/vehicles/${v.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {v.photos?.[0] ? (
                      <img src={v.photos[0].url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--color-border)' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚗</div>
                    )}
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>{v.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{v.colour}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{v.chassisNumber}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={v.category} /></td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={v.status} /></td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{formatDate(v.dateBought)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{v.registeredBy?.name ?? '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/vehicles/${v.id}`); }}
                    style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list — visible below md */}
      <div className="block md:hidden space-y-2">
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
        ) : vehicles.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No vehicles found</p>
        ) : vehicles.map((v) => (
          <div
            key={v.id}
            onClick={() => router.push(`/vehicles/${v.id}`)}
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
          >
            {v.photos?.[0] ? (
              <img src={v.photos[0].url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--color-border)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🚗</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{v.chassisNumber} · {v.colour}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
              <StatusBadge status={v.status} />
              <StatusBadge status={v.category} />
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} limit={20} total={total} onPage={setPage} />
    </div>
  );
}
