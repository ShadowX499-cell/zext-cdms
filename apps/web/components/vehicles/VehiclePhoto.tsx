'use client';

import { useRef, useState } from 'react';
import { vehiclesApi } from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Photo {
  id: string;
  url: string;
}

interface Props {
  vehicleId: string;
  initialPhoto: Photo | null;
  token: string;
}

const API_HOST = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');

export function VehiclePhoto({ vehicleId, initialPhoto, token }: Props) {
  const [photo, setPhoto] = useState<Photo | null>(initialPhoto);
  const [uploading, setUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const newPhoto = await vehiclesApi.uploadPhoto(token, vehicleId, file);
      setPhoto(newPhoto);
    } finally {
      setUploading(false);
    }
  }

  async function handleReplace(file: File) {
    if (!photo) return;
    setUploading(true);
    try {
      const newPhoto = await vehiclesApi.uploadPhoto(token, vehicleId, file);
      await vehiclesApi.deletePhoto(token, vehicleId, photo.id);
      setPhoto(newPhoto);
    } finally {
      setUploading(false);
      if (replaceRef.current) replaceRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!photo) return;
    setUploading(true);
    try {
      await vehiclesApi.deletePhoto(token, vehicleId, photo.id);
      setPhoto(null);
    } finally {
      setUploading(false);
      setShowConfirm(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    background: 'var(--color-bg-elevated)',
    borderRadius: '8px',
    height: '220px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!photo) {
    return (
      <>
        <div
          style={{
            ...containerStyle,
            flexDirection: 'column',
            gap: '10px',
            border: '2px dashed var(--color-border)',
          }}
        >
          <span style={{ fontSize: '48px', opacity: 0.35 }}>🚗</span>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>No vehicle photo</p>
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            style={{
              background: uploading ? 'var(--color-bg-elevated)' : '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '7px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: uploading ? 'default' : 'pointer',
            }}
          >
            {uploading ? 'Uploading…' : '+ Upload Photo'}
          </button>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', margin: 0 }}>
            JPG · PNG · max 5 MB
          </p>
        </div>
        <input
          ref={uploadRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </>
    );
  }

  return (
    <>
      <div style={containerStyle}>
        <img
          src={`${API_HOST}${photo.url}`}
          alt="Vehicle"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
          <button
            onClick={() => replaceRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'rgba(15,23,42,0.8)',
              color: '#cbd5e0',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✏️ Replace
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={uploading}
            style={{
              background: 'rgba(185,28,28,0.85)',
              color: '#fff',
              border: '1px solid rgba(255,100,100,0.2)',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑 Delete
          </button>
        </div>
      </div>
      <input
        ref={replaceRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReplace(f);
          e.target.value = '';
        }}
      />
      {showConfirm && (
        <ConfirmModal
          title="Delete Photo"
          message="Remove the vehicle photo? You can upload a new one afterwards."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
