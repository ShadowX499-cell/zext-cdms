'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { vehiclesApi, Vehicle } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatNaira } from '@/lib/utils';

const EVENT_ICONS: Record<string, string> = {
  REGISTERED: '📋',
  STATUS_CHANGED: '🔄',
  SALE_RECORDED: '💰',
  SWAP_RECORDED: '🔁',
  RECEIPT_ISSUED: '🧾',
  RECORD_EDITED: '✏️',
  ARCHIVED: '📦',
};

export default function VehicleDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const admin = useAuthStore(isAdmin);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    vehiclesApi.get(token, id)
      .then((v) => { setVehicle(v); if (v.photos?.[0]) setSelectedPhoto(v.photos[0].url); })
      .catch(() => setError('Failed to load vehicle'))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <div className="p-6" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>;
  if (error || !vehicle) return <div className="p-6" style={{ color: '#ef4444' }}>{error || 'Vehicle not found'}</div>;

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '10px 0' }}>
      <span style={{ minWidth: 160, color: 'var(--color-text-muted)', fontSize: '13px' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/vehicles')} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>← Inventory</button>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{vehicle.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Photo gallery */}
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', overflow: 'hidden' }}>
              {selectedPhoto ? (
                <img src={selectedPhoto} alt={vehicle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '48px', color: 'var(--color-text-muted)' }}>🚗</span>
              )}
            </div>
            {(vehicle.photos?.length ?? 0) > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {vehicle.photos!.map((p) => (
                  <img
                    key={p.id} src={p.url} alt=""
                    onClick={() => setSelectedPhoto(p.url)}
                    style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', border: selectedPhoto === p.url ? '2px solid #ef4444' : '2px solid var(--color-border)' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Vehicle info */}
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{vehicle.name}</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>{vehicle.colour}</p>
              </div>
              <StatusBadge status={vehicle.status} />
            </div>
            {row('Category', <StatusBadge status={vehicle.category} />)}
            {row('Chassis No.', <span style={{ fontFamily: 'monospace' }}>{vehicle.chassisNumber}</span>)}
            {row('Engine No.', <span style={{ fontFamily: 'monospace' }}>{vehicle.engineNumber}</span>)}
            {row('Plate No.', vehicle.plateNumber)}
            {row('Owner (at purchase)', vehicle.ownerName)}
            {row('Mode of Purchase', vehicle.modeOfPurchase?.replace(/_/g, ' '))}
            {admin && vehicle.purchasePrice != null && row('Purchase Price', formatNaira(parseFloat(vehicle.purchasePrice)))}
            {row('Date Bought', formatDate(vehicle.dateBought))}
            {row('Registered By', vehicle.registeredBy?.name)}
            {vehicle.notes && row('Notes', vehicle.notes)}
          </div>

          {/* Sale info if sold */}
          {vehicle.sale && (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444', marginBottom: '10px' }}>Sale Record</h3>
              {row('Buyer', vehicle.sale.buyerName)}
              {row('Date Sold', formatDate(vehicle.sale.dateSold))}
              {row('Selling Price', formatNaira(parseFloat(vehicle.sale.sellingPrice)))}
              {row('Mode of Sale', vehicle.sale.modeOfSale?.replace(/_/g, ' '))}
              {vehicle.sale.isReversed && <div style={{ marginTop: '8px', fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>⚠ This sale was reversed</div>}
            </div>
          )}
        </div>

        {/* Right column — history timeline */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Vehicle History</h2>
          {(vehicle.history?.length ?? 0) === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No history yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {vehicle.history!.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {EVENT_ICONS[entry.event] ?? '•'}
                    </div>
                    {i < vehicle.history!.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: 'var(--color-border)', marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ paddingTop: '4px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{entry.description}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                      {formatDate(entry.createdAt)} · {entry.performedBy?.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
