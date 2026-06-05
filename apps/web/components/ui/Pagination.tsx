'use client';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, limit, total, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2 mt-4 justify-end">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        style={{
          padding: '4px 12px',
          borderRadius: '6px',
          border: '1px solid var(--color-border)',
          background: page <= 1 ? 'transparent' : 'var(--color-bg-elevated)',
          color: page <= 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          fontSize: '13px',
        }}
      >
        ← Prev
      </button>

      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        Page {page} of {totalPages} ({total} records)
      </span>

      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        style={{
          padding: '4px 12px',
          borderRadius: '6px',
          border: '1px solid var(--color-border)',
          background: page >= totalPages ? 'transparent' : 'var(--color-bg-elevated)',
          color: page >= totalPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          fontSize: '13px',
        }}
      >
        Next →
      </button>
    </div>
  );
}
