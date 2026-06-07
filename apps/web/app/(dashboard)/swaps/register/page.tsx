'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { swapsApi, vehiclesApi, Vehicle } from '@/lib/api-client';
import { formatNaira } from '@/lib/utils';

const MODES = ['DIRECT', 'CUSTOMER_TOP_UP', 'ZEXT_TOP_UP'];

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
  borderRadius: '8px', color: 'var(--color-text-primary)', padding: '9px 12px', fontSize: '14px', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '6px',
};

function VehicleSearch({ label, status, selected, onSelect }: { label: string; status: string; selected: Vehicle | null; onSelect: (v: Vehicle) => void }) {
  const token = useAuthStore((s) => s.accessToken)!;
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const res = await vehiclesApi.list(token, { status, search: q, limit: 8 });
      setResults(res.data);
    } catch { /* ignore */ }
  }, [token, status]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  if (selected) return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>{selected.name}</p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{selected.chassisNumber} · {selected.colour}</p>
        </div>
        <button type="button" onClick={() => { setSearch(''); setResults([]); onSelect(null as any); }} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Change</button>
      </div>
    </div>
  );

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input style={inputStyle} placeholder="Search by name, chassis, colour..." value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
        {open && results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', zIndex: 10, marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {results.map((v) => (
              <button key={v.id} type="button" onClick={() => { onSelect(v); setOpen(false); }}
                style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px' }}>{v.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{v.chassisNumber} · {v.colour}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterSwapPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [outgoing, setOutgoing] = useState<Vehicle | null>(null);
  const [incoming, setIncoming] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ dateOfSwap: new Date().toISOString().split('T')[0], modeOfSwap: 'DIRECT', cashDifference: '', cashDirection: 'CUSTOMER_PAYS', witnessName: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(f: string, v: string) { setForm((prev) => ({ ...prev, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outgoing || !incoming) { setError('Please select both vehicles'); return; }
    setLoading(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        dateOfSwap: form.dateOfSwap, outgoingVehicleId: outgoing.id, incomingVehicleId: incoming.id,
        modeOfSwap: form.modeOfSwap, witnessName: form.witnessName,
      };
      if (form.cashDifference && parseFloat(form.cashDifference) > 0) {
        payload.cashDifference = form.cashDifference;
        payload.cashDirection = form.cashDirection;
      }
      if (form.notes) payload.notes = form.notes;
      const result = await swapsApi.create(token, payload);
      router.push(`/receipts/${result.receipt.id}`);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to register swap');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '8px' }}>← Back</button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Register Swap Deal</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>A swap deal receipt will be automatically generated.</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '13px' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Vehicle selection */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vehicles</h2>
          <VehicleSearch label="Outgoing Vehicle (ZEXT gives away) *" status="AVAILABLE" selected={outgoing} onSelect={setOutgoing} />
          <VehicleSearch label="Incoming Vehicle (Customer trades in — must be registered) *" status="" selected={incoming} onSelect={(v) => { if (v?.id !== outgoing?.id) setIncoming(v); else setError('Outgoing and incoming must be different vehicles'); }} />
        </div>

        {/* Swap terms */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Swap Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Date of Swap *</label>
              <input style={inputStyle} type="date" required value={form.dateOfSwap} onChange={(e) => set('dateOfSwap', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Mode of Swap *</label>
              <select style={inputStyle} value={form.modeOfSwap} onChange={(e) => set('modeOfSwap', e.target.value)}>
                {MODES.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Witness Name *</label>
            <input style={inputStyle} required value={form.witnessName} onChange={(e) => set('witnessName', e.target.value)} placeholder="Full name of witness" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Cash Difference (₦)</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.cashDifference} onChange={(e) => set('cashDifference', e.target.value)} placeholder="0.00 (leave blank for direct)" />
              {form.cashDifference && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{formatNaira(parseFloat(form.cashDifference))}</p>}
            </div>
            {form.cashDifference && parseFloat(form.cashDifference) > 0 && (
              <div>
                <label style={labelStyle}>Cash Direction *</label>
                <select style={inputStyle} value={form.cashDirection} onChange={(e) => set('cashDirection', e.target.value)}>
                  <option value="CUSTOMER_PAYS">Customer Pays ZEXT</option>
                  <option value="ZEXT_PAYS">ZEXT Pays Customer</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <button type="submit" disabled={loading || !outgoing || !incoming}
          style={{ background: loading || !outgoing || !incoming ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: loading || !outgoing || !incoming ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Registering Swap…' : 'Register Swap & Generate Receipt'}
        </button>
      </form>
    </div>
  );
}
