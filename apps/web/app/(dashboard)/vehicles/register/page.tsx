'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { vehiclesApi } from '@/lib/api-client';

const CATEGORIES = ['NG_USED', 'TOKUNBO', 'SCOOTER_BIKE'];
const MODES = ['OUTRIGHT', 'TRADE_IN', 'SWAP', 'AUCTION', 'CONSIGNMENT'];

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

export default function RegisterVehiclePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;
  const admin = useAuthStore(isAdmin);

  const [form, setForm] = useState({
    dateBought: '', name: '', category: 'NG_USED', chassisNumber: '',
    engineNumber: '', plateNumber: '', colour: '', ownerName: '',
    modeOfPurchase: 'OUTRIGHT', purchasePrice: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.plateNumber) delete payload.plateNumber;
      if (!form.purchasePrice || !admin) delete payload.purchasePrice;
      if (!form.notes) delete payload.notes;

      const v = await vehiclesApi.create(token, payload);
      router.push(`/vehicles/${v.id}`);
    } catch (err: unknown) {
      const e2 = err as { message?: string };
      setError(e2.message ?? 'Failed to register vehicle');
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, name: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={form[name as keyof typeof form]} onChange={(e) => set(name, e.target.value)} {...props} />
    </div>
  );

  const select = (label: string, name: string, options: string[]) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select style={inputStyle} value={form[name as keyof typeof form]} onChange={(e) => set(name, e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '8px' }}>← Back</button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Register Vehicle</h1>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Vehicle Details</h2>
          {field('Make / Model *', 'name', { required: true, placeholder: 'e.g. Toyota Camry 2019' })}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {select('Category *', 'category', CATEGORIES)}
            {field('Date Bought *', 'dateBought', { type: 'date', required: true })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Chassis Number *', 'chassisNumber', { required: true, placeholder: 'VIN / Chassis No', style: { ...inputStyle, fontFamily: 'monospace' } })}
            {field('Engine Number *', 'engineNumber', { required: true, placeholder: 'Engine No', style: { ...inputStyle, fontFamily: 'monospace' } })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Plate Number', 'plateNumber', { placeholder: 'e.g. ABC-123-XY (optional)' })}
            {field('Colour *', 'colour', { required: true, placeholder: 'e.g. Silver' })}
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Purchase Info</h2>
          {field('Previous Owner Name *', 'ownerName', { required: true, placeholder: 'Seller / dealer name' })}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {select('Mode of Purchase *', 'modeOfPurchase', MODES)}
            {admin && field('Purchase Price (₦)', 'purchasePrice', { type: 'number', placeholder: '0.00' })}
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg,#ef4444,#f97316)',
            color: '#fff', border: 'none', borderRadius: '10px', padding: '12px',
            fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Registering…' : 'Register Vehicle'}
        </button>
      </form>
    </div>
  );
}
