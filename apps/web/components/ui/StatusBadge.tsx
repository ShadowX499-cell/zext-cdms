'use client';

type Status = 'AVAILABLE' | 'SOLD' | 'SWAPPED' | 'ARCHIVED' | 'TOKUNBO' | 'NG_USED' | 'SCOOTER_BIKE';

const styles: Record<string, { bg: string; color: string; border: string; label: string }> = {
  AVAILABLE:    { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.3)',  label: 'Available' },
  SOLD:         { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)',  label: 'Sold' },
  SWAPPED:      { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)', label: 'Swapped' },
  ARCHIVED:     { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', border: 'rgba(107,114,128,0.25)',label: 'Archived' },
  TOKUNBO:      { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)', label: 'Tokunbo' },
  NG_USED:      { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)', label: 'NG Used' },
  SCOOTER_BIKE: { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7', border: 'rgba(168,85,247,0.25)', label: 'Bike' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = styles[status] ?? { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', border: 'rgba(107,114,128,0.25)', label: status };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}
