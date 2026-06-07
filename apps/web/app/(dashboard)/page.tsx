'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { dashboardApi, DashboardMetrics } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatNaira } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const admin = useAuthStore(isAdmin);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    dashboardApi.metrics(token)
      .then(setMetrics)
      .catch(() => { /* silently fail — dashboard still renders */ })
      .finally(() => setLoading(false));
  }, [token]);

  const metricCard = (label: string, value: string | number, sub?: string, href?: string, gradient = false) => (
    <div
      onClick={() => href && router.push(href)}
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        cursor: href ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        borderTop: gradient ? '2px solid #ef4444' : '1px solid var(--color-border)',
      }}
      onMouseEnter={(e) => { if (gradient) e.currentTarget.style.borderTopColor = '#f97316'; }}
      onMouseLeave={(e) => { if (gradient) e.currentTarget.style.borderTopColor = '#ef4444'; }}
    >
      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)' }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm mt-1">
          Welcome back, {user?.name}
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading metrics…</div>
      ) : metrics ? (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metricCard('Available Inventory', metrics.inventoryAvailable, `of ${metrics.inventoryTotal} total`, '/vehicles?status=AVAILABLE', true)}
            {metricCard('Sold This Month', metrics.soldThisMonth, 'confirmed sales', '/sales', true)}
            {metricCard('Registered This Month', metrics.registeredThisMonth, 'new vehicles', '/vehicles', false)}
            {admin && metrics.revenueThisMonth != null
              ? metricCard('Revenue This Month', formatNaira(parseFloat(metrics.revenueThisMonth)), 'from confirmed receipts', undefined, true)
              : metricCard('My Role', user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Secretary', 'access level')}
          </div>

          {admin && metrics.revenueThisYear != null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {metricCard('Revenue This Year', formatNaira(parseFloat(metrics.revenueThisYear)), 'from all confirmed sales')}
              {metricCard('Total Revenue (All Time)', formatNaira(parseFloat(metrics.totalRevenue ?? '0')), 'cumulative confirmed sales')}
            </div>
          )}

          {/* Recent tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent vehicles */}
            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Recent Vehicles</h2>
                <button onClick={() => router.push('/vehicles')} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              {metrics.recentVehicles.length === 0 ? (
                <p style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>No vehicles yet</p>
              ) : metrics.recentVehicles.map((v) => (
                <div
                  key={v.id}
                  onClick={() => router.push(`/vehicles/${v.id}`)}
                  style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                    {v.photos?.[0] ? <img src={v.photos[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🚗'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{v.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{formatDate(v.createdAt)}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
              ))}
            </div>

            {/* Recent sales */}
            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Recent Sales</h2>
                <button onClick={() => router.push('/sales')} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              {metrics.recentSales.length === 0 ? (
                <p style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>No sales yet</p>
              ) : metrics.recentSales.map((s) => (
                <div
                  key={s.id}
                  onClick={() => s.receipt && router.push(`/receipts/${s.id}`)}
                  style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.vehicle.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.buyerName} · {formatDate(s.dateSold)}</p>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatNaira(parseFloat(s.sellingPrice))}</p>
                  </div>
                  {s.receipt && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '3px' }}>{s.receipt.receiptNumber}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: '+ Register Vehicle', href: '/vehicles/register' },
              { label: '+ Register Sale', href: '/sales/register' },
              { label: '⊞ View Inventory', href: '/vehicles' },
              { label: '🧾 View Receipts', href: '/receipts' },
            ].map((a) => (
              <button
                key={a.href}
                onClick={() => router.push(a.href)}
                style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Could not load metrics.</p>
      )}
    </div>
  );
}
