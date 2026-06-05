'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { revenueApi, RevenueSummary, apiRequest } from '@/lib/api-client';
import { formatNaira } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const CATEGORY_LABELS: Record<string, string> = {
  NG_USED: 'NG Used Cars',
  TOKUNBO: 'Tokunbo Cars',
  SCOOTER_BIKE: 'Bikes',
};

export default function RevenuePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;
  const admin = useAuthStore(isAdmin);

  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);

  useEffect(() => {
    if (!admin) { router.replace('/'); return; }
    if (!token) return;
    setLoading(true);
    revenueApi.summary(token, from || undefined, to || undefined)
      .then(setSummary)
      .catch(() => setError('Failed to load revenue data'))
      .finally(() => setLoading(false));
  }, [token, admin, from, to, router]);

  const maxRevenue = summary ? Math.max(...Object.values(summary.byCategory), 1) : 1;
  const maxMonthly = summary ? Math.max(...summary.monthlyTrend.map((m) => m.revenue), 1) : 1;

  const metricCard = (label: string, value: string, sub?: string) => (
    <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', borderTop: '2px solid #ef4444' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)' }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Revenue Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Admin view — confirmed, non-voided receipts only</p>
        </div>
        {/* Date range filter */}
        <div className="flex gap-3 items-center">
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text-primary)', padding: '5px 10px', fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text-primary)', padding: '5px 10px', fontSize: '13px' }} />
          </div>
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} style={{ marginTop: '16px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {(['csv', 'excel'] as const).map((fmt) => (
            <button key={fmt} disabled={!!exporting}
              onClick={async () => {
                setExporting(fmt);
                try {
                  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
                  const q = new URLSearchParams();
                  if (from) q.set('from', from);
                  if (to) q.set('to', to);
                  const res = await fetch(`${BASE_URL}/revenue/export/${fmt}?${q}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `zext-revenue.${fmt === 'excel' ? 'xlsx' : 'csv'}`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch { setError('Export failed'); }
                finally { setExporting(null); }
              }}
              style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', cursor: !!exporting ? 'not-allowed' : 'pointer' }}>
              {exporting === fmt ? 'Exporting…' : `↓ ${fmt.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}
      {loading ? <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</p> : summary && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {metricCard('Total Revenue (All Time)', formatNaira(parseFloat(summary.totalRevenue)), `${summary.totalSalesCount} sales`)}
            {metricCard('Revenue This Month', formatNaira(parseFloat(summary.revenueThisMonth)), `${summary.salesCountThisMonth} sales`)}
            {metricCard('Revenue This Year', formatNaira(parseFloat(summary.revenueThisYear)), `${summary.salesCountThisYear} sales`)}
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '24px' }}>
            {/* Revenue by category */}
            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Revenue by Category</h2>
              {Object.entries(summary.byCategory).length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No data yet</p>
              ) : Object.entries(summary.byCategory).map(([cat, rev]) => (
                <div key={cat} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatNaira(rev)}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(rev / maxRevenue) * 100}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly trend */}
            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Monthly Trend (Last 6 Months)</h2>
              {summary.monthlyTrend.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
                  {summary.monthlyTrend.map((m) => (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                        {m.revenue > 0 ? formatNaira(m.revenue).replace('₦ ', '₦') : '—'}
                      </div>
                      <div style={{
                        width: '100%',
                        height: `${m.revenue > 0 ? Math.max((m.revenue / maxMonthly) * 100, 4) : 4}%`,
                        background: m.revenue > 0 ? 'linear-gradient(180deg,#ef4444,#f97316)' : 'var(--color-bg-elevated)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease',
                      }} />
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '5px', textAlign: 'center', lineHeight: 1.2 }}>{m.month}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
