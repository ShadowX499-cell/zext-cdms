'use client';

import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm mt-1">
          Welcome back, {user?.name}
        </p>
      </div>

      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm">
          Dashboard metrics will be added in Plan 3 (Vehicles + Sales module).
        </p>
      </div>
    </div>
  );
}
