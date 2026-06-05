'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { notificationsApi, Notification } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export function NotificationBell() {
  const token = useAuthStore((s) => s.accessToken)!;
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    notificationsApi.unreadCount(token).then((r) => setUnread(r.unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      notificationsApi.unreadCount(token).then((r) => setUnread(r.unreadCount)).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function toggleOpen() {
    if (!open) {
      setLoading(true);
      try {
        const res = await notificationsApi.list(token);
        setNotifications(res.data);
        setUnread(res.unreadCount);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    setOpen((p) => !p);
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead(token);
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  }

  const typeIcon: Record<string, string> = {
    LOW_STOCK: '⚠',
    ACCOUNT_LOCKED: '🔒',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggleOpen}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: 'var(--color-text-muted)', fontSize: '18px' }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#ef4444', color: '#fff',
            borderRadius: '50%', width: 16, height: 16,
            fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          width: '340px', maxHeight: '420px', overflowY: 'auto',
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
            )}
          </div>

          {loading ? (
            <p style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>Loading…</p>
          ) : notifications.length === 0 ? (
            <p style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>No notifications</p>
          ) : notifications.map((n) => (
            <div key={n.id} style={{
              padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
              background: n.isRead ? 'transparent' : 'rgba(239,68,68,0.05)',
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{typeIcon[n.type] ?? '🔔'}</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: n.isRead ? 400 : 700, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{n.title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4, marginTop: '2px' }}>{n.body}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{formatDate(n.createdAt)}</p>
                </div>
                {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: '4px' }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
