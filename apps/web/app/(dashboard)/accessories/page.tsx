'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { accessoriesApi, AccessoryItem } from '@/lib/api-client';
import { Pagination } from '@/components/ui/Pagination';
import { formatNaira } from '@/lib/utils';

const CATEGORIES = ['', 'CAR_ACCESSORY', 'SCOOTER_BIKE'];

export default function AccessoriesPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [tab, setTab] = useState<'items' | 'add-item'>('items');
  const [items, setItems] = useState<AccessoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add item form state
  const [form, setForm] = useState({ name: '', category: 'CAR_ACCESSORY', description: '', quantityInStock: '0', sellingPrice: '', costPrice: '', lowStockThreshold: '2', chassisNumber: '', engineNumber: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await accessoriesApi.listItems(token, search || undefined, page);
      setItems(res.data);
      setTotal(res.total);
    } catch { setError('Failed to load items'); }
    finally { setLoading(false); }
  }, [token, search, page]);

  useEffect(() => { load(); }, [load]);

  function setF(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name, category: form.category,
        quantityInStock: parseInt(form.quantityInStock),
        sellingPrice: form.sellingPrice,
        lowStockThreshold: parseInt(form.lowStockThreshold),
      };
      if (form.description) payload.description = form.description;
      if (form.costPrice) payload.costPrice = form.costPrice;
      if (form.chassisNumber) payload.chassisNumber = form.chassisNumber;
      if (form.engineNumber) payload.engineNumber = form.engineNumber;
      await accessoriesApi.createItem(token, payload);
      setTab('items');
      setForm({ name: '', category: 'CAR_ACCESSORY', description: '', quantityInStock: '0', sellingPrice: '', costPrice: '', lowStockThreshold: '2', chassisNumber: '', engineNumber: '' });
      load();
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to add item');
    } finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '9px 12px', fontSize: '14px', outline: 'none' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '6px' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Accessories & Bikes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} items in inventory</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/accessories/sales/register')} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Record Sale</button>
          <button onClick={() => setTab('add-item')} style={{ background: tab === 'add-item' ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'var(--color-bg-elevated)', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add Item</button>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      {tab === 'add-item' ? (
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', maxWidth: '600px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '20px' }}>Add New Item</h2>
          <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid grid-cols-2 gap-4">
              <div><label style={labelStyle}>Name *</label><input style={inputStyle} required value={form.name} onChange={(e) => setF('name', e.target.value)} /></div>
              <div><label style={labelStyle}>Category *</label>
                <select style={inputStyle} value={form.category} onChange={(e) => setF('category', e.target.value)}>
                  <option value="CAR_ACCESSORY">Car Accessory</option>
                  <option value="SCOOTER_BIKE">Scooter / Bike</option>
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>Description</label><input style={inputStyle} value={form.description} onChange={(e) => setF('description', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label style={labelStyle}>Qty in Stock *</label><input style={inputStyle} type="number" min="0" required value={form.quantityInStock} onChange={(e) => setF('quantityInStock', e.target.value)} /></div>
              <div><label style={labelStyle}>Low Stock Threshold *</label><input style={inputStyle} type="number" min="0" required value={form.lowStockThreshold} onChange={(e) => setF('lowStockThreshold', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label style={labelStyle}>Selling Price (₦) *</label><input style={inputStyle} type="number" min="0" step="0.01" required value={form.sellingPrice} onChange={(e) => setF('sellingPrice', e.target.value)} /></div>
              <div><label style={labelStyle}>Cost Price (₦)</label><input style={inputStyle} type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setF('costPrice', e.target.value)} /></div>
            </div>
            {form.category === 'SCOOTER_BIKE' && (
              <div className="grid grid-cols-2 gap-4">
                <div><label style={labelStyle}>Chassis Number</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.chassisNumber} onChange={(e) => setF('chassisNumber', e.target.value)} /></div>
                <div><label style={labelStyle}>Engine Number</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.engineNumber} onChange={(e) => setF('engineNumber', e.target.value)} /></div>
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setTab('items')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: saving ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                {saving ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-5">
            <input style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '7px 12px', fontSize: '13px', outline: 'none', minWidth: '220px' }}
              placeholder="Search items..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Item', 'Category', 'Stock', 'Threshold', 'Selling Price', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No items yet — add your first item</td></tr>
                ) : items.map((item) => {
                  const isLow = item.quantityInStock <= item.lowStockThreshold;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</p>
                        {item.description && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.description}</p>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{item.category.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: isLow ? '#f59e0b' : 'var(--color-text-primary)' }}>{item.quantityInStock}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>{item.lowStockThreshold}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatNaira(parseFloat(item.sellingPrice))}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {isLow
                          ? <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.3)' }}>LOW STOCK</span>
                          : <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.25)' }}>In Stock</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
