'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { dashboardApi, MonthlyDetail } from '@/lib/api-client';
import { formatNaira, formatDate } from '@/lib/utils';

function Skeleton({ height = 60, width = '100%' }: { height?: number; width?: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      borderRadius: 8,
      height,
      width,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function DayTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { day: number; revenue: number; count: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Day {d.day}</p>
      <p style={{ color: '#4ade80' }}>{formatNaira(d.revenue)}</p>
      <p style={{ color: 'var(--color-text-muted)' }}>{d.count} {d.count === 1 ? 'sale' : 'sales'}</p>
    </div>
  );
}

const CATEGORY_COLOUR: Record<string, string> = {
  TOKUNBO: '#6366f1',
  NG_USED: '#a78bfa',
  SCOOTER_BIKE: '#38bdf8',
};

export default function MonthlyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const admin = useAuthStore(isAdmin);

  const yearMonth = params.yearMonth as string;

  const [detail, setDetail] = useState<MonthlyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSaleId, setHoveredSaleId] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) { router.replace('/'); return; }
    if (!token) return;
    dashboardApi.monthlyDetail(token, yearMonth)
      .then(setDetail)
      .catch(() => setError('Could not load monthly data. Please try again.'))
      .finally(() => setLoading(false));
  }, [token, admin, yearMonth, router]);

  const card = (label: string, value: string, sub: string, valueColour = 'var(--color-text-primary)') => (
    <div style={{
      background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: 20,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 900, color: valueColour }}>{value}</p>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</p>
    </div>
  );

  const fullDailyData = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const found = detail?.dailySales.find((d) => d.day === day);
    return { day, revenue: found?.revenue ?? 0, count: found?.count ?? 0 };
  });

  return (
    <div className="p-4 md:p-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          ← Dashboard
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {detail?.label ?? yearMonth}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Monthly Performance Report
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid #ef4444',
          borderRadius: 12, padding: 20, color: '#ef4444', fontSize: 14,
        }}>
          {error}
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              dashboardApi.monthlyDetail(token!, yearMonth)
                .then(setDetail)
                .catch(() => setError('Could not load monthly data.'))
                .finally(() => setLoading(false));
            }}
            style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} height={96} />)}
          </div>
          <Skeleton height={160} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Skeleton height={160} />
            <Skeleton height={160} />
          </div>
          <div style={{ marginTop: 16 }}><Skeleton height={200} /></div>
        </>
      )}

      {!loading && !error && detail && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {card('Total Revenue', formatNaira(detail.metrics.totalRevenue), `${detail.metrics.totalSold} confirmed sales`, '#4ade80')}
            {card('Gross Profit', formatNaira(detail.metrics.grossProfit), 'est. on known costs', '#a78bfa')}
            {card('Cars Sold', String(detail.metrics.totalSold), 'confirmed, not reversed')}
            {card('Cars Registered', String(detail.metrics.totalRegistered), 'added to inventory')}
          </div>

          <div style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Daily Sales — {detail.label}
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={fullDailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis hide />
                <Tooltip content={<DayTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                  {fullDailyData.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill={entry.revenue > 0 ? '#6366f1' : 'transparent'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 14 }}>
                By Vehicle Category
              </p>
              {detail.byCategory.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No data</p>
              ) : detail.byCategory.map((c) => (
                <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLOUR[c.category] ?? '#64748b', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>
                    {c.category.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {c.soldCount} sold · {c.registeredCount} reg.
                  </span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 14 }}>
                By Mode of Sale
              </p>
              {detail.byModeOfSale.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No data</p>
              ) : detail.byModeOfSale.map((m) => {
                const pct = detail.metrics.totalRevenue > 0
                  ? (m.revenue / detail.metrics.totalRevenue) * 100
                  : 0;
                return (
                  <div key={m.mode} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                      <span>{m.mode}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{m.count} · {formatNaira(m.revenue)}</span>
                    </div>
                    <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 3, height: 5 }}>
                      <div style={{ background: '#6366f1', borderRadius: 3, height: '100%', width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Top Sales — {detail.label}</h2>
            </div>
            {detail.topSales.length === 0 ? (
              <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>No sales recorded for this month.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Vehicle', 'Buyer', 'Selling Price', 'Date Sold', 'Receipt'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Selling Price' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.topSales.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => s.receiptId && router.push(`/receipts/${s.receiptId}`)}
                      onMouseEnter={() => setHoveredSaleId(s.id)}
                      onMouseLeave={() => setHoveredSaleId(null)}
                      style={{ borderBottom: '1px solid var(--color-border)', cursor: s.receiptId ? 'pointer' : 'default', background: hoveredSaleId === s.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{s.vehicleName}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{s.buyerName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontWeight: 700 }}>{formatNaira(s.sellingPrice)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{formatDate(s.dateSold)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {s.receiptId
                          ? <span style={{ color: '#6366f1', fontWeight: 600 }}>View →</span>
                          : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
