'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/stores/auth.store';
import { dashboardApi, MonthlyHistogramItem } from '@/lib/api-client';
import { formatNaira } from '@/lib/utils';

function SkeletonBars() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 64, padding: '0 4px' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRadius: '3px 3px 0 0',
            background: 'var(--color-bg-elevated)',
            height: `${30 + Math.random() * 50}%`,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyHistogramItem }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{d.month}</p>
      <p style={{ color: '#4ade80' }}>{formatNaira(d.revenue)}</p>
      <p style={{ color: 'var(--color-text-muted)' }}>{d.soldCount} sold · {d.registeredCount} registered</p>
    </div>
  );
}

export function MonthlyHistogram() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<MonthlyHistogramItem[] | null>(null);

  useEffect(() => {
    if (!token) return;
    dashboardApi.monthlyHistogram(token).then(setData).catch(() => setData([]));
  }, [token]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  const handleBarClick = (entry: MonthlyHistogramItem) => {
    const mm = String(entry.monthNum).padStart(2, '0');
    router.push(`/dashboard/month/${entry.year}-${mm}`);
  };

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <p style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '12px',
      }}>
        Monthly Revenue — click a bar
      </p>

      {data === null ? (
        <SkeletonBars />
      ) : data.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', height: 64, display: 'flex', alignItems: 'center' }}>
          No data yet
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={80}>
          <BarChart
            data={data}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]) {
                handleBarClick(e.activePayload[0].payload as MonthlyHistogramItem);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickFormatter={(v: string) => v.slice(0, 1)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
              {data.map((entry) => {
                const isCurrent =
                  entry.year === currentYear && entry.monthNum === currentMonthNum;
                return (
                  <Cell
                    key={`${entry.year}-${entry.monthNum}`}
                    fill={isCurrent ? '#818cf8' : '#4338ca'}
                    stroke={isCurrent ? '#a5b4fc' : 'none'}
                    strokeWidth={isCurrent ? 1.5 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
