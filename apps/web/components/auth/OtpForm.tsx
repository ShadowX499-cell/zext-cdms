'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function OtpForm() {
  const router = useRouter();
  const { pendingUserId, setUser, startSessionTimer } = useAuthStore((s) => ({
    pendingUserId: s.pendingUserId,
    setUser: s.setUser,
    startSessionTimer: s.startSessionTimer,
  }));
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!pendingUserId) router.replace('/login');
  }, [pendingUserId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUserId) return;
    setError(null);
    setIsPending(true);
    try {
      const res = await authApi.verifyOtp(pendingUserId, otp);
      setUser(
        {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role as 'SUPER_ADMIN' | 'SECRETARY',
        },
        res.accessToken,
      );
      // Lightweight cookie for SSR middleware auth check
      document.cookie = 'zext-auth-check=1; path=/; max-age=' + (30 * 60) + '; SameSite=Strict';
      startSessionTimer(
        () => {},
        () => router.replace('/login'),
      );
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      } else {
        setError('Cannot connect to server. Check your network.');
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Enter verification code
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Check your email for a 6-digit code. It expires in 10 minutes.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          One-Time Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full rounded-lg px-4 py-4 text-center text-3xl font-bold outline-none tracking-[0.3em]"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border-accent)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border)')
          }
        />
      </div>

      <button
        type="submit"
        disabled={isPending || otp.length !== 6}
        className="gradient-bg w-full rounded-lg py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
        style={{ cursor: isPending || otp.length !== 6 ? 'not-allowed' : 'pointer' }}
      >
        {isPending ? 'Verifying…' : 'Verify & Sign In'}
      </button>

      <button
        type="button"
        onClick={() => router.replace('/login')}
        className="w-full text-center text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ← Back to login
      </button>
    </form>
  );
}
