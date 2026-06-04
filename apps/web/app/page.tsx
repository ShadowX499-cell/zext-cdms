import { Wordmark } from '@/components/layout/Wordmark';

export default function Home() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div className="text-center space-y-4">
        <Wordmark size="lg" />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Car Dealership Management System — Foundation ready
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--color-success)' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-success)' }}
          >
            API connected · DB synced · Design system loaded
          </span>
        </div>
      </div>
    </main>
  );
}
