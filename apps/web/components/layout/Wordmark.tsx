interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { mark: 'text-lg', sub: 'text-[8px]' },
  md: { mark: 'text-2xl', sub: 'text-[9px]' },
  lg: { mark: 'text-4xl', sub: 'text-xs' },
} as const;

export function Wordmark({ size = 'md' }: WordmarkProps) {
  const s = sizes[size];
  return (
    <div className="flex flex-col">
      <span
        className={`gradient-text font-black tracking-tight leading-none ${s.mark}`}
      >
        ZEXT
      </span>
      <span
        className={`uppercase tracking-[0.15em] font-medium ${s.sub}`}
        style={{ color: 'var(--color-text-muted)' }}
      >
        Joint Ventures · CDMS
      </span>
    </div>
  );
}
