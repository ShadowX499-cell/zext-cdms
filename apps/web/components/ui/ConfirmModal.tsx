'use client';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '28px 32px',
          maxWidth: '420px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '8px' }}>{title}</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontSize: '14px',
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: danger ? '#ef4444' : 'linear-gradient(135deg,#ef4444,#f97316)',
              color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
