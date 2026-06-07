import { Wordmark } from '@/components/layout/Wordmark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div className="mb-10">
        <Wordmark size="lg" />
      </div>
      <div
        className="w-full max-w-md rounded-xl p-6 sm:p-8"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
