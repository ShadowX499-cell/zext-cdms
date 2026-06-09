'use client';

import { useRef, useState } from 'react';
import { vehiclesApi, VehicleDocument } from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDate } from '@/lib/utils';

interface Props {
  vehicleId: string;
  initialDocuments: VehicleDocument[];
  token: string;
}

const API_HOST = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docIcon(mimeType: string): string {
  return mimeType === 'application/pdf' ? '📄' : '🖼️';
}

export function VehicleDocuments({ vehicleId, initialDocuments, token }: Props) {
  const [docs, setDocs] = useState<VehicleDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const doc = await vehiclesApi.uploadDocument(token, vehicleId, file);
      setDocs((prev) => [doc, ...prev]);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!confirmId) return;
    setError(null);
    try {
      await vehiclesApi.deleteDocument(token, vehicleId, confirmId);
      setDocs((prev) => prev.filter((d) => d.id !== confirmId));
    } catch {
      setError('Delete failed. Please try again.');
    } finally {
      setConfirmId(null);
    }
  }

  const panelStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    overflow: 'hidden',
  };

  return (
    <>
      <div style={panelStyle}>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            margin: 0,
          }}
        >
          📄 Paper Documents
        </h2>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {docs.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>
              No documents yet
            </p>
          )}
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{docIcon(doc.mimeType)}</span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.originalName}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: 8 }}>
                <a
                  href={`${API_HOST}${doc.url}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Download"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ⬇️
                </a>
                <button
                  onClick={() => setConfirmId(doc.id)}
                  title="Delete"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '9px',
              border: '1.5px dashed var(--color-border)',
              background: 'transparent',
              color: uploading ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: uploading ? 'default' : 'pointer',
              marginTop: '4px',
            }}
          >
            {uploading ? 'Uploading…' : '+ Upload Document'}
          </button>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            PDF · JPG · PNG · max 10 MB
          </p>
          {error && (
            <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0', textAlign: 'center' }}>
              {error}
            </p>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
        }}
      />
      {confirmId && (
        <ConfirmModal
          title="Delete Document"
          message="Permanently delete this document? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}
