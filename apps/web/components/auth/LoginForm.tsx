'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function LoginForm() {
  const router = useRouter();
  const setPendingUserId = useAuthStore((s) => s.setPendingUserId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await authApi.login(email, password);
      setPendingUserId(res.userId);
      router.push('/verify-otp');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? 'Invalid email or password'
            : err.status === 403
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
          Sign in
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Enter your credentials to receive a verification code
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
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@zextjv.com"
          className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border-accent)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border)')
          }
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
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
        disabled={isPending}
        className="gradient-bg w-full rounded-lg py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
        style={{ cursor: isPending ? 'not-allowed' : 'pointer' }}
      >
        {isPending ? 'Sending OTP…' : 'Continue'}
      </button>
    </form>
  );
}
