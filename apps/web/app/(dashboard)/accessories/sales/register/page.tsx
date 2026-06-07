'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { accessoriesApi, AccessoryItem } from '@/lib/api-client';
import { formatNaira } from '@/lib/utils';

const PAYMENT_MODES = ['CASH', 'TRANSFER', 'POS'];

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
  borderRadius: '8px', color: 'var(--color-text-primary)', padding: '9px 12px', fontSize: '14px', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '6px',
};

interface CartItem {
  item: AccessoryItem;
  quantity: number;
}

export default function RegisterAccessorySalePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<AccessoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState({
    dateSold: new Date().toISOString().split('T')[0],
    buyerName: '',
    buyerPhone: '',
    paymentMode: 'CASH',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await accessoriesApi.listItems(token, q);
      setSearchResults(res.data.filter((item) => item.quantityInStock > 0));
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  function addToCart(item: AccessoryItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantityInStock) return prev;
        return prev.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
    setSearch('');
    setSearchResults([]);
  }

  function setQty(itemId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.item.id !== itemId));
    } else {
      setCart((prev) => prev.map((c) => c.item.id === itemId ? { ...c, quantity: Math.min(qty, c.item.quantityInStock) } : c));
    }
  }

  const total = cart.reduce((sum, c) => sum + parseFloat(c.item.sellingPrice) * c.quantity, 0);

  function set(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) { setError('Add at least one item to the cart'); return; }
    setLoading(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        dateSold: form.dateSold,
        buyerName: form.buyerName,
        paymentMode: form.paymentMode,
        items: cart.map((c) => ({ accessoryItemId: c.item.id, quantity: c.quantity })),
      };
      if (form.buyerPhone) payload.buyerPhone = form.buyerPhone;
      const result = await accessoriesApi.createSale(token, payload);
      router.push(`/receipts/${result.receipt.id}`);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to record sale');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.push('/accessories')} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '8px' }}>← Accessories</button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Record Accessory Sale</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>A receipt will be generated and stock decremented automatically.</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '13px' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Item search */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Items</h2>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input style={inputStyle} placeholder="Search in-stock items..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', zIndex: 10, marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                {searchResults.map((item) => (
                  <button key={item.id} type="button" onClick={() => addToCart(item)}
                    style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px' }}>{item.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.quantityInStock} in stock</p>
                      </div>
                      <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '13px' }}>{formatNaira(parseFloat(item.sellingPrice))}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Search and add items above</p>
          ) : (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              {cart.map((c, i) => (
                <div key={c.item.id} style={{ padding: '10px 14px', borderBottom: i < cart.length - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.item.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatNaira(parseFloat(c.item.sellingPrice))} each</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" onClick={() => setQty(c.item.id, c.quantity - 1)}
                      style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ width: 28, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{c.quantity}</span>
                    <button type="button" onClick={() => setQty(c.item.id, c.quantity + 1)}
                      disabled={c.quantity >= c.item.quantityInStock}
                      style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: c.quantity >= c.item.quantityInStock ? 'var(--color-text-muted)' : 'var(--color-text-primary)', cursor: c.quantity >= c.item.quantityInStock ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <span style={{ width: 90, textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatNaira(parseFloat(c.item.sellingPrice) * c.quantity)}</span>
                  <button type="button" onClick={() => setQty(c.item.id, 0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '16px', padding: '2px' }}>✕</button>
                </div>
              ))}
              <div style={{ padding: '12px 14px', background: 'var(--color-bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Total</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-text-primary)' }}>{formatNaira(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Buyer & payment */}
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Buyer & Payment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label style={labelStyle}>Buyer Name *</label><input style={inputStyle} required value={form.buyerName} onChange={(e) => set('buyerName', e.target.value)} placeholder="Customer name" /></div>
            <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.buyerPhone} onChange={(e) => set('buyerPhone', e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label style={labelStyle}>Date of Sale *</label><input style={inputStyle} type="date" required value={form.dateSold} onChange={(e) => set('dateSold', e.target.value)} /></div>
            <div><label style={labelStyle}>Payment Mode *</label>
              <select style={inputStyle} value={form.paymentMode} onChange={(e) => set('paymentMode', e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading || cart.length === 0}
          style={{ background: loading || cart.length === 0 ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: loading || cart.length === 0 ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Recording Sale…' : `Record Sale & Generate Receipt (${formatNaira(total)})`}
        </button>
      </form>
    </div>
  );
}
