'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { apiRequest } from '@/lib/api-client';
import { formatDate, formatNaira } from '@/lib/utils';

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  sales: Array<{ id: string; dateSold: string; sellingPrice: string; vehicle: { name: string } }>;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    apiRequest<CustomerDetail>(`/customers/${id}`, { token })
      .then(setCustomer)
      .catch(() => setError('Customer not found'))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <div className="p-6" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>;
  if (error || !customer) return <div className="p-6" style={{ color: '#ef4444' }}>{error || 'Not found'}</div>;

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '10px 0' }}>
      <span style={{ minWidth: 140, color: 'var(--color-text-muted)', fontSize: '13px' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  );

  const totalSpend = customer.sales.reduce((sum, s) => sum + parseFloat(s.sellingPrice), 0);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/customers')} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>← Customers</button>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{customer.name}</span>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Profile */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '20px', flexShrink: 0 }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{customer.name}</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          {row('Phone', customer.phone)}
          {row('Address', customer.address)}
          {customer.notes && row('Notes', customer.notes)}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Total Purchases', value: customer.sales.length.toString() },
            { label: 'Total Spend', value: formatNaira(totalSpend) },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{s.label}</p>
              <p style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase history */}
      {customer.sales.length > 0 && (
        <div style={{ marginTop: '24px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Purchase History</h2>
          </div>
          {customer.sales.map((sale) => (
            <div key={sale.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{sale.vehicle.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{formatDate(sale.dateSold)}</p>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatNaira(parseFloat(sale.sellingPrice))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
