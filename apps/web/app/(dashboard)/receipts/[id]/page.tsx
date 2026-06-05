'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { receiptsApi, Receipt } from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDate, formatNaira } from '@/lib/utils';

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;
  const admin = useAuthStore(isAdmin);

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    receiptsApi.get(token, id)
      .then(setReceipt)
      .catch(() => setError('Receipt not found'))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function handleVoid() {
    if (!receipt || !voidReason.trim()) return;
    setActionLoading(true);
    try {
      const updated = await receiptsApi.void(token, id, voidReason);
      setReceipt(updated);
      setShowVoidModal(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to void receipt');
    } finally { setActionLoading(false); }
  }

  async function handleDownload() {
    if (!receipt) return;
    setPdfLoading(true);
    try {
      await receiptsApi.downloadPdf(token, id, receipt.receiptNumber);
    } catch { setError('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  }

  if (loading) return <div className="p-6" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>;
  if (error && !receipt) return <div className="p-6" style={{ color: '#ef4444' }}>{error}</div>;
  if (!receipt) return null;

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '10px 0' }}>
      <span style={{ minWidth: 160, color: 'var(--color-text-muted)', fontSize: '13px' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/receipts')} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>← Receipts</button>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{receipt.receiptNumber}</span>
      </div>

      {receipt.isVoided && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>⚠</span>
          <div>
            <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>This receipt has been VOIDED</p>
            {receipt.voidReason && <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Reason: {receipt.voidReason}</p>}
            {receipt.voidedAt && <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Voided on: {formatDate(receipt.voidedAt)}</p>}
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      {/* Receipt Preview */}
      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '28px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        {receipt.isVoided && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontSize: '80px', fontWeight: 900, color: 'rgba(239,68,68,0.08)', letterSpacing: '0.15em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            VOID
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#ef4444,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ZEXT</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>ZEXT Joint Ventures Nigeria Limited</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Abuja, FCT, Nigeria · info@zextjv.com</div>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px', color: 'var(--color-text-primary)' }}>
            {receipt.type.replace(/_/g, ' ')} RECEIPT
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px' }}>
          <div><strong style={{ color: 'var(--color-text-primary)' }}>Receipt No:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{receipt.receiptNumber}</span></div>
          <div><strong style={{ color: 'var(--color-text-primary)' }}>Date:</strong> <span style={{ color: 'var(--color-text-secondary)' }}>{formatDate(receipt.receiptDate)}</span></div>
        </div>

        {receipt.sale && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '10px' }}>Vehicle Details</div>
              {row('Make / Model', receipt.sale.vehicle?.name)}
              {row('Chassis No.', <span style={{ fontFamily: 'monospace' }}>{receipt.sale.vehicle?.chassisNumber}</span>)}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '10px' }}>Buyer</div>
              {row('Name', receipt.sale.buyerName)}
            </div>

            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Amount Paid</span>
              <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                {receipt.sale.sellingPrice ? formatNaira(parseFloat(receipt.sale.sellingPrice)) : '—'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleDownload}
          disabled={pdfLoading}
          style={{ flex: 1, padding: '11px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', border: 'none' }}
        >
          {pdfLoading ? 'Generating PDF…' : '↓ Download PDF'}
        </button>

        {admin && !receipt.isVoided && (
          <button
            onClick={() => setShowVoidModal(true)}
            style={{ padding: '11px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            Void Receipt
          </button>
        )}
      </div>

      {/* Void modal */}
      {showVoidModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '28px 32px', maxWidth: '440px', width: '90%' }}>
            <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '8px' }}>Void Receipt</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              This receipt will be marked as VOID. It will be retained in the system but excluded from revenue calculations.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Reason *</label>
              <textarea
                style={{ width: '100%', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '9px 12px', fontSize: '13px', minHeight: '72px', resize: 'vertical', outline: 'none' }}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="State the reason for voiding (min 5 chars)"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowVoidModal(false); setVoidReason(''); }} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={voidReason.trim().length < 5 || actionLoading}
                onClick={handleVoid}
                style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: voidReason.trim().length < 5 ? 'not-allowed' : 'pointer', background: voidReason.trim().length < 5 ? 'var(--color-bg-surface)' : '#ef4444', color: '#fff' }}
              >
                {actionLoading ? 'Voiding…' : 'Void Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
