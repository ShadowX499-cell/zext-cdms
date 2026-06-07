'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Wordmark } from '@/components/layout/Wordmark';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { authApi } from '@/lib/api-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const showSessionWarning = useAuthStore((s) => s.showSessionWarning);
  const dismissWarning = useAuthStore((s) => s.dismissWarning);
  const startSessionTimer = useAuthStore((s) => s.startSessionTimer);

  // useState(false) here is intentional: on the server user/accessToken are
  // always null (no sessionStorage). We must wait for the client to mount and
  // Zustand to rehydrate before running the auth check, otherwise the layout
  // immediately redirects to /login on every navigation.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, user, accessToken, router]);

  useEffect(() => {
    if (user && accessToken) {
      startSessionTimer(
        () => {},
        () => {
          clearSession();
          router.replace('/login');
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    if (accessToken) {
      await authApi.logout(accessToken).catch(() => null);
    }
    clearSession();
    router.replace('/login');
  }

  if (!hydrated || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      {/* Session timeout warning banner */}
      {showSessionWarning && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 text-sm"
          style={{
            background: 'rgba(245,158,11,0.15)',
            borderBottom: '1px solid rgba(245,158,11,0.4)',
            color: '#f59e0b',
          }}
        >
          <span>⚠ Your session expires in 5 minutes due to inactivity.</span>
          <button
            onClick={dismissWarning}
            className="font-semibold"
            style={{ color: '#f59e0b' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 lg:top-0 left-0 z-40 lg:z-auto w-[220px] flex flex-col flex-shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${showSessionWarning ? 'top-[52px]' : 'top-0'}`}
        style={{
          background: '#0d0d0d',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <Wordmark size="sm" />
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItem href="/" label="Dashboard" icon="⊞" active={pathname === '/'} />
          <NavItem href="/vehicles" label="Inventory" icon="🚗" active={pathname.startsWith('/vehicles')} />
          <NavItem href="/sales" label="Sales" icon="💰" active={pathname.startsWith('/sales')} />
          <NavItem href="/swaps" label="Swaps" icon="🔁" active={pathname.startsWith('/swaps')} />
          <NavItem href="/receipts" label="Receipts" icon="🧾" active={pathname.startsWith('/receipts')} />
          <NavItem href="/accessories" label="Accessories" icon="🛠" active={pathname.startsWith('/accessories')} />
          <NavItem href="/customers" label="Customers" icon="👥" active={pathname.startsWith('/customers')} />
          {user.role === 'SUPER_ADMIN' && (
            <NavItem href="/revenue" label="Revenue" icon="📈" active={pathname.startsWith('/revenue')} />
          )}
          <NavItem href="/audit" label="Audit Log" icon="🔍" active={pathname.startsWith('/audit')} />
          {user.role === 'SUPER_ADMIN' && (
            <NavItem href="/settings" label="Settings" icon="⚙" active={pathname.startsWith('/settings')} />
          )}
        </nav>

        <div
          className="p-4 flex items-center gap-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white gradient-bg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Secretary'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-lg"
            style={{ color: 'var(--color-text-muted)' }}
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area with topbar */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          style={{
            height: 52,
            background: '#0d0d0d',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            paddingRight: '20px',
            gap: '12px',
          }}
        >
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: '20px',
              width: 52,
              height: 52,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
          <div className="flex-1" />
          <NotificationBell />
          <button
            onClick={() => router.push('/sales/register')}
            style={{
              background: 'linear-gradient(135deg,#ef4444,#f97316)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + New Record
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        background: active ? 'rgba(239,68,68,0.08)' : 'transparent',
        borderLeft: active ? '2px solid #ef4444' : '2px solid transparent',
        textDecoration: 'none',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  );
}
