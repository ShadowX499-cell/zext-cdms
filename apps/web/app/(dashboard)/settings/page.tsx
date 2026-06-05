'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { apiRequest } from '@/lib/api-client';

const SETTING_META: Record<string, { label: string; description: string; type: 'number' | 'text' | 'textarea' | 'boolean' }> = {
  low_stock_cars_threshold: { label: 'Low Stock Threshold — Cars', description: 'Alert when available car inventory falls below this number', type: 'number' },
  low_stock_accessories_threshold: { label: 'Low Stock Threshold — Accessories', description: 'Alert when any accessory item stock falls to or below this number', type: 'number' },
  otp_expiry_minutes: { label: 'OTP Expiry (minutes)', description: 'How long a one-time login code is valid', type: 'number' },
  session_timeout_minutes: { label: 'Session Timeout (minutes)', description: 'Inactivity timeout before auto-logout (min 10)', type: 'number' },
  ng_used_disclaimer: { label: 'NG Used Car Disclaimer Text', description: 'Printed at the bottom of NG Used Car receipts', type: 'textarea' },
  tokunbo_disclaimer: { label: 'Tokunbo Car Disclaimer Text', description: 'Printed at the bottom of Tokunbo receipts', type: 'textarea' },
  notifications_low_stock: { label: 'Low Stock Notifications', description: 'Create in-app notification when stock falls below threshold', type: 'boolean' },
  notifications_account_locked: { label: 'Account Locked Notifications', description: 'Send email when a user account is locked', type: 'boolean' },
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
  borderRadius: '8px', color: 'var(--color-text-primary)', padding: '9px 12px', fontSize: '14px', outline: 'none',
};

export default function SettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;
  const admin = useAuthStore(isAdmin);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin) { router.replace('/'); return; }
    apiRequest<Record<string, string>>('/settings', { token })
      .then(setSettings)
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [token, admin, router]);

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await apiRequest('/settings', { method: 'PATCH', body: settings, token });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save settings'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-6" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>;

  const groups = [
    { title: 'Inventory Thresholds', keys: ['low_stock_cars_threshold', 'low_stock_accessories_threshold'] },
    { title: 'Security', keys: ['otp_expiry_minutes', 'session_timeout_minutes'] },
    { title: 'Receipt Disclaimers', keys: ['ng_used_disclaimer', 'tokunbo_disclaimer'] },
    { title: 'Notification Preferences', keys: ['notifications_low_stock', 'notifications_account_locked'] },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>System Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Admin only — changes take effect immediately</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '13px' }}>{error}</div>}
      {saved && <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#10b981', fontSize: '13px' }}>Settings saved successfully.</div>}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {groups.map((group) => (
          <div key={group.title} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>{group.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {group.keys.map((key) => {
                const meta = SETTING_META[key];
                if (!meta) return null;
                const value = settings[key] ?? '';
                return (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '3px' }}>{meta.label}</label>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{meta.description}</p>
                    {meta.type === 'textarea' ? (
                      <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={value}
                        onChange={(e) => handleChange(key, e.target.value)} />
                    ) : meta.type === 'boolean' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button type="button" onClick={() => handleChange(key, value === 'true' ? 'false' : 'true')}
                          style={{
                            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
                            background: value === 'true' ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'var(--color-bg-elevated)',
                            transition: 'background 0.2s',
                          }}>
                          <span style={{ position: 'absolute', top: 3, left: value === 'true' ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </button>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{value === 'true' ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    ) : (
                      <input style={inputStyle} type="number" min="1" value={value}
                        onChange={(e) => handleChange(key, e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button type="submit" disabled={saving}
          style={{ padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
