'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Wordmark } from '@/components/layout/Wordmark';
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

  useEffect(() => {
    if (!user || !accessToken) {
      router.replace('/login');
    }
  }, [user, accessToken, router]);

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

  if (!user) return null;

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
        className="w-[220px] flex flex-col flex-shrink-0"
        style={{
          background: '#0d0d0d',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Wordmark size="sm" />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/" label="Dashboard" icon="⊞" active={pathname === '/'} />
          <NavItem href="/vehicles" label="Inventory" icon="🚗" active={pathname.startsWith('/vehicles')} />
          <NavItem href="/sales" label="Sales" icon="💰" active={pathname.startsWith('/sales')} />
          <NavItem href="/receipts" label="Receipts" icon="🧾" active={pathname.startsWith('/receipts')} />
          {user.role === 'SUPER_ADMIN' && (
            <NavItem href="/revenue" label="Revenue" icon="📈" active={pathname.startsWith('/revenue')} />
          )}
          <NavItem href="/audit" label="Audit Log" icon="🔍" active={pathname.startsWith('/audit')} />
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

      <main className="flex-1 overflow-y-auto">{children}</main>
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
