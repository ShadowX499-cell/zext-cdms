'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiRequest } from '@/lib/api-client';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';

const CATEGORIES = ['', 'AUTHENTICATION', 'VEHICLE_REGISTRATION', 'SALES', 'SWAPS', 'RECEIPTS', 'ACCESSORIES', 'REVENUE', 'CUSTOMERS', 'USER_MANAGEMENT', 'NOTIFICATIONS', 'SYSTEM'];

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  category: string;
  action: string;
  recordId?: string | null;
  recordType?: string | null;
  ipAddress: string;
  deviceInfo: string;
  user: { name: string; role: string };
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  AUTHENTICATION: '🔐', VEHICLE_REGISTRATION: '🚗', SALES: '💰', SWAPS: '🔁',
  RECEIPTS: '🧾', ACCESSORIES: '🛠', REVENUE: '📈', CUSTOMERS: '👥',
  USER_MANAGEMENT: '👤', NOTIFICATIONS: '🔔', SYSTEM: '⚙',
};

export default function AuditLogPage() {
  const token = useAuthStore((s) => s.accessToken)!;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: '25' });
      if (category) q.set('category', category);
      const res = await apiRequest<AuditResponse>(`/audit?${q}`, { token });
      setEntries(res.data);
      setTotal(res.total);
    } catch { setError('Failed to load audit log'); }
    finally { setLoading(false); }
  }, [token, category, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Audit Log</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} entries · immutable record of all system actions</p>
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '7px 12px', fontSize: '13px' }}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Timestamp', 'Category', 'Action', 'User', 'IP Address', 'Record'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No audit entries yet</td></tr>
            ) : entries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(entry.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text-secondary)' }}>
                    <span>{CATEGORY_ICONS[entry.category] ?? '•'}</span>
                    <span>{entry.category.replace(/_/g, ' ')}</span>
                  </span>
                </td>
                <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--color-text-primary)', maxWidth: '320px' }}>
                  <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.action}</p>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{entry.user?.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{entry.userRole === 'SUPER_ADMIN' ? 'Admin' : 'Secretary'}</p>
                </td>
                <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{entry.ipAddress}</td>
                <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  {entry.recordType && entry.recordId ? `${entry.recordType}: ${entry.recordId.slice(0, 8)}…` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={25} total={total} onPage={setPage} />
    </div>
  );
}
