'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { vehiclesApi, salesApi, Vehicle } from '@/lib/api-client';
import { formatNaira } from '@/lib/utils';

const MODES = ['OUTRIGHT', 'HIRE_PURCHASE', 'PART_PAYMENT', 'SWAP_CASH', 'AUCTION'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  padding: '9px 12px',
  fontSize: '14px',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
  marginBottom: '6px',
};

export default function RegisterSalePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [form, setForm] = useState({
    dateSold: new Date().toISOString().split('T')[0],
    vehicleId: '',
    buyerName: '',
    buyerPhone: '',
    buyerAddress: '',
    witnessName: '',
    sellingPrice: '',
    modeOfSale: 'OUTRIGHT',
    notes: '',
  });

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchVehicles = useCallback(async (q: string) => {
    if (!q.trim()) { setVehicles([]); return; }
    try {
      const res = await vehiclesApi.list(token, { status: 'AVAILABLE', search: q, limit: 8 });
      setVehicles(res.data);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => searchVehicles(vehicleSearch), 300);
    return () => clearTimeout(t);
  }, [vehicleSearch, searchVehicles]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId) { setError('Please select a vehicle'); return; }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.notes) delete payload.notes;
      const result = await salesApi.create(token, payload);
      router.push(`/receipts/${result.receipt.id}`);
    } catch (err: unknown) {
      const e2 = err as { message?: string };
      setError(e2.message ?? 'Failed to register sale');
    } finally { setLoading(false); }
  }

  const field = (label: string, name: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={form[name as keyof typeof form]} onChange={(e) => set(name, e.target.value)} {...props} />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '8px' }}>← Back</button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Register Sale</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>A receipt will be automatically generated.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Vehicle selection */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Vehicle</h2>

          {selectedVehicle ? (
            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>{selectedVehicle.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{selectedVehicle.chassisNumber} · {selectedVehicle.colour}</p>
              </div>
              <button type="button" onClick={() => { setSelectedVehicle(null); setForm((f) => ({ ...f, vehicleId: '' })); setVehicleSearch(''); }} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                style={inputStyle}
                placeholder="Search available vehicles by name, chassis, colour..."
                value={vehicleSearch}
                onChange={(e) => { setVehicleSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && vehicles.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', zIndex: 10, marginTop: '4px', maxHeight: '240px', overflowY: 'auto' }}>
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setSelectedVehicle(v); setForm((f) => ({ ...f, vehicleId: v.id })); setShowDropdown(false); setVehicleSearch(v.name); }}
                      style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                    >
                      <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px' }}>{v.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{v.chassisNumber} · {v.colour}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buyer info */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Buyer Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('Buyer Name *', 'buyerName', { required: true })}
            {field('Buyer Phone *', 'buyerPhone', { required: true })}
          </div>
          {field('Buyer Address *', 'buyerAddress', { required: true, placeholder: 'Full address' })}
          {field('Witness Name *', 'witnessName', { required: true })}
        </div>

        {/* Sale terms */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sale Terms</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('Date of Sale *', 'dateSold', { type: 'date', required: true })}
            <div>
              <label style={labelStyle}>Mode of Sale *</label>
              <select style={inputStyle} value={form.modeOfSale} onChange={(e) => set('modeOfSale', e.target.value)}>
                {MODES.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Selling Price (₦) *</label>
            <input
              style={inputStyle}
              type="number"
              required
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={(e) => set('sellingPrice', e.target.value)}
              placeholder="0.00"
            />
            {form.sellingPrice && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{formatNaira(parseFloat(form.sellingPrice))}</p>}
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !form.vehicleId}
          style={{ background: loading || !form.vehicleId ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: loading || !form.vehicleId ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Registering Sale…' : 'Register Sale & Generate Receipt'}
        </button>
      </form>
    </div>
  );
}
