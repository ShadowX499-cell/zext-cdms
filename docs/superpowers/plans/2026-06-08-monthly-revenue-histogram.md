# Monthly Revenue Histogram & Detail Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Total Revenue (All Time)" dashboard card with a 12-month clickable revenue histogram; clicking a bar navigates to a full monthly detail page at `/dashboard/month/[yearMonth]`.

**Architecture:** Two new endpoints in the existing `DashboardController`/`DashboardService` (SUPER_ADMIN only via `@Roles` decorator). A new `MonthlyHistogram` React component replaces the static card. A new Next.js page renders the detail view using a single API call.

**Tech Stack:** NestJS 10, Prisma v7, Recharts v2.13 (already installed), Next.js 15 App Router, React 19, inline styles (project convention).

---

## File Map

### Backend — new files
- `apps/api/src/dashboard/dto/monthly-histogram-item.dto.ts` — response shape for one histogram bar
- `apps/api/src/dashboard/dto/monthly-detail.dto.ts` — response shape for the detail page
- `apps/api/src/dashboard/dashboard.service.spec.ts` — unit tests for the two new service methods

### Backend — modified files
- `apps/api/src/dashboard/dashboard.service.ts` — add `getMonthlyHistogram()` and `getMonthlyDetail()`
- `apps/api/src/dashboard/dashboard.controller.ts` — add two GET routes

### Frontend — new files
- `apps/web/components/dashboard/MonthlyHistogram.tsx` — histogram card component
- `apps/web/app/(dashboard)/month/[yearMonth]/page.tsx` — monthly detail page

### Frontend — modified files
- `apps/web/lib/api-client.ts` — add types + two API functions to `dashboardApi`
- `apps/web/app/(dashboard)/page.tsx` — swap "Total Revenue (All Time)" card for `<MonthlyHistogram />`

---

## Task 1: Backend DTOs

**Files:**
- Create: `apps/api/src/dashboard/dto/monthly-histogram-item.dto.ts`
- Create: `apps/api/src/dashboard/dto/monthly-detail.dto.ts`

- [ ] **Step 1: Create the histogram item DTO**

```typescript
// apps/api/src/dashboard/dto/monthly-histogram-item.dto.ts
export class MonthlyHistogramItemDto {
  month: string;        // display label e.g. "Jun '25"
  year: number;
  monthNum: number;     // 1–12
  revenue: number;
  soldCount: number;
  registeredCount: number;
}
```

- [ ] **Step 2: Create the monthly detail DTO**

```typescript
// apps/api/src/dashboard/dto/monthly-detail.dto.ts
export class MonthlyDetailDto {
  label: string;
  yearMonth: string;

  metrics: {
    totalRevenue: number;
    grossProfit: number;
    totalSold: number;
    totalRegistered: number;
  };

  dailySales: Array<{
    day: number;
    revenue: number;
    count: number;
  }>;

  byCategory: Array<{
    category: string;
    soldCount: number;
    registeredCount: number;
    revenue: number;
  }>;

  byModeOfSale: Array<{
    mode: string;
    count: number;
    revenue: number;
  }>;

  topSales: Array<{
    id: string;
    vehicleName: string;
    buyerName: string;
    sellingPrice: number;
    dateSold: string;
    receiptId: string;
  }>;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/dashboard/dto/
git commit -m "feat(dashboard): add monthly histogram and detail DTOs"
```

---

## Task 2: `getMonthlyHistogram` service method + tests

**Files:**
- Modify: `apps/api/src/dashboard/dashboard.service.ts`
- Create: `apps/api/src/dashboard/dashboard.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/dashboard/dashboard.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  vehicle: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  sale: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getMonthlyHistogram', () => {
    it('returns 12 items ordered oldest to newest', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { sellingPrice: null } });
      mockPrisma.sale.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);

      const result = await service.getMonthlyHistogram();

      expect(result).toHaveLength(12);
      // first item should be older than last item
      const first = result[0];
      const last = result[11];
      const firstDate = new Date(first.year, first.monthNum - 1);
      const lastDate = new Date(last.year, last.monthNum - 1);
      expect(firstDate.getTime()).toBeLessThan(lastDate.getTime());
    });

    it('converts null revenue to 0', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { sellingPrice: null } });
      mockPrisma.sale.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);

      const result = await service.getMonthlyHistogram();

      expect(result[0].revenue).toBe(0);
    });

    it('returns revenue as a number (not Decimal)', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({
        _sum: { sellingPrice: { toNumber: () => 9500000 } },
      });
      mockPrisma.sale.count.mockResolvedValue(2);
      mockPrisma.vehicle.count.mockResolvedValue(5);

      const result = await service.getMonthlyHistogram();

      expect(typeof result[0].revenue).toBe('number');
      expect(result[0].revenue).toBe(9500000);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && npx jest dashboard.service.spec --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `getMonthlyHistogram is not a function`

- [ ] **Step 3: Add `getMonthlyHistogram` to the service**

Add the following method to `apps/api/src/dashboard/dashboard.service.ts`, inside the `DashboardService` class after the existing `getMetrics` method:

```typescript
async getMonthlyHistogram() {
  const now = new Date();
  // Build array of 12 months: [11 months ago ... current month]
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() }; // month is 0-indexed
  });

  const results = await Promise.all(
    months.map(async ({ year, month }) => {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 1);

      const [revenueResult, soldCount, registeredCount] = await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            dateSold: { gte: from, lt: to },
            isReversed: false,
            receipt: { isVoided: false },
          },
          _sum: { sellingPrice: true },
        }),
        this.prisma.sale.count({
          where: {
            dateSold: { gte: from, lt: to },
            isReversed: false,
          },
        }),
        this.prisma.vehicle.count({
          where: { createdAt: { gte: from, lt: to } },
        }),
      ]);

      const monthLabel = from.toLocaleString('en-GB', { month: 'short', year: '2-digit' });

      return {
        month: monthLabel,       // e.g. "Jun '25"
        year,
        monthNum: month + 1,     // 1-indexed
        revenue: revenueResult._sum.sellingPrice
          ? Number(revenueResult._sum.sellingPrice.toString())
          : 0,
        soldCount,
        registeredCount,
      };
    }),
  );

  return results;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npx jest dashboard.service.spec --no-coverage 2>&1 | tail -20
```

Expected: `Tests: 3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/dashboard/dashboard.service.ts apps/api/src/dashboard/dashboard.service.spec.ts
git commit -m "feat(dashboard): add getMonthlyHistogram service method"
```

---

## Task 3: `getMonthlyDetail` service method + tests

**Files:**
- Modify: `apps/api/src/dashboard/dashboard.service.ts`
- Modify: `apps/api/src/dashboard/dashboard.service.spec.ts`

- [ ] **Step 1: Add the failing tests**

Add the following `describe` block to `dashboard.service.spec.ts`, inside the outer `describe('DashboardService')`:

```typescript
  describe('getMonthlyDetail', () => {
    it('throws BadRequestException for invalid yearMonth format', async () => {
      await expect(service.getMonthlyDetail('2026-13')).rejects.toThrow(BadRequestException);
      await expect(service.getMonthlyDetail('26-05')).rejects.toThrow(BadRequestException);
      await expect(service.getMonthlyDetail('not-a-date')).rejects.toThrow(BadRequestException);
    });

    it('returns correct label for valid yearMonth', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyDetail('2026-05');

      expect(result.label).toBe('May 2026');
      expect(result.yearMonth).toBe('2026-05');
    });

    it('returns zero metrics when no sales', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyDetail('2026-05');

      expect(result.metrics.totalRevenue).toBe(0);
      expect(result.metrics.grossProfit).toBe(0);
      expect(result.metrics.totalSold).toBe(0);
      expect(result.metrics.totalRegistered).toBe(0);
      expect(result.dailySales).toEqual([]);
      expect(result.byCategory).toEqual([]);
      expect(result.byModeOfSale).toEqual([]);
      expect(result.topSales).toEqual([]);
    });

    it('calculates grossProfit only from sales with purchasePrice', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        {
          id: 's-1', dateSold: new Date('2026-05-07'), buyerName: 'Buyer A',
          sellingPrice: { toNumber: () => 10000000 },
          modeOfSale: 'OUTRIGHT',
          vehicle: { name: 'Car A', category: 'TOKUNBO', purchasePrice: { toNumber: () => 7000000 } },
          receipt: { id: 'r-1' },
        },
        {
          id: 's-2', dateSold: new Date('2026-05-15'), buyerName: 'Buyer B',
          sellingPrice: { toNumber: () => 5000000 },
          modeOfSale: 'SWAP',
          vehicle: { name: 'Car B', category: 'NG_USED', purchasePrice: null },
          receipt: { id: 'r-2' },
        },
      ]);
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyDetail('2026-05');

      // grossProfit = 10M - 7M = 3M (Car B excluded — no purchasePrice)
      expect(result.metrics.grossProfit).toBe(3000000);
      expect(result.metrics.totalRevenue).toBe(15000000);
      expect(result.metrics.totalSold).toBe(2);
    });
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && npx jest dashboard.service.spec --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `getMonthlyDetail is not a function`

- [ ] **Step 3: Add `getMonthlyDetail` to the service**

Add the following imports at the top of `dashboard.service.ts` (after existing imports):

```typescript
import { BadRequestException } from '@nestjs/common';
```

Then add the method inside `DashboardService` after `getMonthlyHistogram`:

```typescript
async getMonthlyDetail(yearMonth: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    throw new BadRequestException(`Invalid yearMonth format: ${yearMonth}. Expected YYYY-MM`);
  }

  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed for Date
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  const label = from.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  // Single query for all sales that month (confirmed, non-reversed)
  const [sales, registeredVehicles] = await Promise.all([
    this.prisma.sale.findMany({
      where: {
        dateSold: { gte: from, lt: to },
        isReversed: false,
        receipt: { isVoided: false },
      },
      select: {
        id: true,
        dateSold: true,
        buyerName: true,
        sellingPrice: true,
        modeOfSale: true,
        vehicle: { select: { name: true, category: true, purchasePrice: true } },
        receipt: { select: { id: true } },
      },
      orderBy: { sellingPrice: 'desc' },
    }),
    this.prisma.vehicle.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { category: true },
    }),
  ]);

  // ── Metrics ─────────────────────────────────────────────────────────────────
  let totalRevenue = 0;
  let grossProfit = 0;

  for (const sale of sales) {
    const sp = Number(sale.sellingPrice.toString());
    totalRevenue += sp;
    if (sale.vehicle.purchasePrice != null) {
      grossProfit += sp - Number(sale.vehicle.purchasePrice.toString());
    }
  }

  // ── Daily sales ──────────────────────────────────────────────────────────────
  const dailyMap = new Map<number, { revenue: number; count: number }>();
  for (const sale of sales) {
    const day = new Date(sale.dateSold).getDate();
    const entry = dailyMap.get(day) ?? { revenue: 0, count: 0 };
    entry.revenue += Number(sale.sellingPrice.toString());
    entry.count += 1;
    dailyMap.set(day, entry);
  }
  const dailySales = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, data]) => ({ day, ...data }));

  // ── By category ──────────────────────────────────────────────────────────────
  const categoryMap = new Map<
    string,
    { soldCount: number; revenue: number; registeredCount: number }
  >();

  for (const sale of sales) {
    const cat = sale.vehicle.category;
    const entry = categoryMap.get(cat) ?? { soldCount: 0, revenue: 0, registeredCount: 0 };
    entry.soldCount += 1;
    entry.revenue += Number(sale.sellingPrice.toString());
    categoryMap.set(cat, entry);
  }
  for (const v of registeredVehicles) {
    const cat = v.category;
    const entry = categoryMap.get(cat) ?? { soldCount: 0, revenue: 0, registeredCount: 0 };
    entry.registeredCount += 1;
    categoryMap.set(cat, entry);
  }
  const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));

  // ── By mode of sale ──────────────────────────────────────────────────────────
  const modeMap = new Map<string, { count: number; revenue: number }>();
  for (const sale of sales) {
    const mode = sale.modeOfSale;
    const entry = modeMap.get(mode) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(sale.sellingPrice.toString());
    modeMap.set(mode, entry);
  }
  const byModeOfSale = Array.from(modeMap.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([mode, data]) => ({ mode, ...data }));

  // ── Top sales ────────────────────────────────────────────────────────────────
  const topSales = sales.map((sale) => ({
    id: sale.id,
    vehicleName: sale.vehicle.name,
    buyerName: sale.buyerName,
    sellingPrice: Number(sale.sellingPrice.toString()),
    dateSold: sale.dateSold.toISOString(),
    receiptId: sale.receipt?.id ?? '',
  }));

  return {
    label,
    yearMonth,
    metrics: {
      totalRevenue,
      grossProfit,
      totalSold: sales.length,
      totalRegistered: registeredVehicles.length,
    },
    dailySales,
    byCategory,
    byModeOfSale,
    topSales,
  };
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
cd apps/api && npx jest dashboard.service.spec --no-coverage 2>&1 | tail -20
```

Expected: `Tests: 7 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/dashboard/dashboard.service.ts apps/api/src/dashboard/dashboard.service.spec.ts
git commit -m "feat(dashboard): add getMonthlyDetail service method"
```

---

## Task 4: Controller routes

**Files:**
- Modify: `apps/api/src/dashboard/dashboard.controller.ts`

- [ ] **Step 1: Add the two routes**

Replace the entire file content:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get dashboard metrics (revenue fields Admin-only)' })
  getMetrics(@CurrentUser() user: AuthUser) {
    return this.dashboard.getMetrics(user.role as UserRole);
  }

  @Get('monthly-histogram')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revenue histogram for last 12 months (Admin only)' })
  getMonthlyHistogram() {
    return this.dashboard.getMonthlyHistogram();
  }

  @Get('monthly-detail/:yearMonth')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Full monthly performance detail (Admin only)' })
  getMonthlyDetail(@Param('yearMonth') yearMonth: string) {
    return this.dashboard.getMonthlyDetail(yearMonth);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/dashboard/dashboard.controller.ts
git commit -m "feat(dashboard): expose monthly-histogram and monthly-detail routes"
```

---

## Task 5: Frontend API client types + functions

**Files:**
- Modify: `apps/web/lib/api-client.ts`

- [ ] **Step 1: Add the new types and API functions**

Locate the `// ── Dashboard API` section in `apps/web/lib/api-client.ts` (currently at line 295) and replace it with:

```typescript
// ── Dashboard API ─────────────────────────────────────────────────────────────

export interface MonthlyHistogramItem {
  month: string;
  year: number;
  monthNum: number;
  revenue: number;
  soldCount: number;
  registeredCount: number;
}

export interface MonthlyDetail {
  label: string;
  yearMonth: string;
  metrics: {
    totalRevenue: number;
    grossProfit: number;
    totalSold: number;
    totalRegistered: number;
  };
  dailySales: Array<{ day: number; revenue: number; count: number }>;
  byCategory: Array<{
    category: string;
    soldCount: number;
    registeredCount: number;
    revenue: number;
  }>;
  byModeOfSale: Array<{ mode: string; count: number; revenue: number }>;
  topSales: Array<{
    id: string;
    vehicleName: string;
    buyerName: string;
    sellingPrice: number;
    dateSold: string;
    receiptId: string;
  }>;
}

export const dashboardApi = {
  metrics: (token: string) =>
    apiRequest<DashboardMetrics>('/dashboard/metrics', { token }),

  monthlyHistogram: (token: string) =>
    apiRequest<MonthlyHistogramItem[]>('/dashboard/monthly-histogram', { token }),

  monthlyDetail: (token: string, yearMonth: string) =>
    apiRequest<MonthlyDetail>(`/dashboard/monthly-detail/${yearMonth}`, { token }),
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/api-client.ts
git commit -m "feat(dashboard): add MonthlyHistogramItem, MonthlyDetail types and API functions"
```

---

## Task 6: `MonthlyHistogram` component

**Files:**
- Create: `apps/web/components/dashboard/MonthlyHistogram.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/dashboard/MonthlyHistogram.tsx
git commit -m "feat(dashboard): add MonthlyHistogram component with Recharts BarChart"
```

---

## Task 7: Swap the card on the dashboard page

**Files:**
- Modify: `apps/web/app/(dashboard)/page.tsx`

- [ ] **Step 1: Import `MonthlyHistogram` and swap the card**

Open `apps/web/app/(dashboard)/page.tsx`.

**Add the import** at the top, after the existing imports:

```typescript
import { MonthlyHistogram } from '@/components/dashboard/MonthlyHistogram';
```

**Replace lines 71–76** (the admin-only revenue 2-card grid) with:

```tsx
          {admin && metrics.revenueThisYear != null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {metricCard('Revenue This Year', formatNaira(parseFloat(metrics.revenueThisYear)), 'from all confirmed sales')}
              <MonthlyHistogram />
            </div>
          )}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): replace Total Revenue card with MonthlyHistogram"
```

---

## Task 8: Monthly detail page

**Files:**
- Create: `apps/web/app/(dashboard)/month/[yearMonth]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { dashboardApi, MonthlyDetail } from '@/lib/api-client';
import { formatNaira, formatDate } from '@/lib/utils';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ height = 60, width = '100%' }: { height?: number; width?: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      borderRadius: 8,
      height,
      width,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ── Tooltip for daily chart ───────────────────────────────────────────────────
function DayTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { day: number; revenue: number; count: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Day {d.day}</p>
      <p style={{ color: '#4ade80' }}>{formatNaira(d.revenue)}</p>
      <p style={{ color: 'var(--color-text-muted)' }}>{d.count} {d.count === 1 ? 'sale' : 'sales'}</p>
    </div>
  );
}

// ── Category colours ──────────────────────────────────────────────────────────
const CATEGORY_COLOUR: Record<string, string> = {
  TOKUNBO: '#6366f1',
  NG_USED: '#a78bfa',
  SCOOTER_BIKE: '#38bdf8',
};

export default function MonthlyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const admin = useAuthStore(isAdmin);

  const yearMonth = params.yearMonth as string;

  const [detail, setDetail] = useState<MonthlyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) { router.replace('/dashboard'); return; }
    if (!token) return;
    dashboardApi.monthlyDetail(token, yearMonth)
      .then(setDetail)
      .catch(() => setError('Could not load monthly data. Please try again.'))
      .finally(() => setLoading(false));
  }, [token, admin, yearMonth, router]);

  const card = (label: string, value: string, sub: string, valueColour = 'var(--color-text-primary)') => (
    <div style={{
      background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: 20,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 900, color: valueColour }}>{value}</p>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</p>
    </div>
  );

  // ── Sparse daily data: fill all 31 days so gaps show ─────────────────────────
  const fullDailyData = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const found = detail?.dailySales.find((d) => d.day === day);
    return { day, revenue: found?.revenue ?? 0, count: found?.count ?? 0 };
  });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          ← Dashboard
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {loading ? '...' : (detail?.label ?? yearMonth)}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Monthly Performance Report
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          background: 'var(--color-bg-surface)', border: '1px solid #ef4444',
          borderRadius: 12, padding: 20, color: '#ef4444', fontSize: 14,
        }}>
          {error}
          <button
            onClick={() => { setError(null); setLoading(true); dashboardApi.monthlyDetail(token!, yearMonth).then(setDetail).catch(() => setError('Could not load monthly data.')).finally(() => setLoading(false)); }}
            style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} height={96} />)}
          </div>
          <Skeleton height={160} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Skeleton height={160} />
            <Skeleton height={160} />
          </div>
          <Skeleton height={200} width="100%" />
        </>
      )}

      {/* Content */}
      {!loading && !error && detail && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {card('Total Revenue', formatNaira(detail.metrics.totalRevenue), `${detail.metrics.totalSold} confirmed sales`, '#4ade80')}
            {card('Gross Profit', formatNaira(detail.metrics.grossProfit), 'est. on known costs', '#a78bfa')}
            {card('Cars Sold', String(detail.metrics.totalSold), 'confirmed, not reversed')}
            {card('Cars Registered', String(detail.metrics.totalRegistered), 'added to inventory')}
          </div>

          {/* Daily sales chart */}
          <div style={{
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Daily Sales — {detail.label}
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={fullDailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis hide />
                <Tooltip content={<DayTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                  {fullDailyData.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill={entry.revenue > 0 ? '#6366f1' : 'transparent'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category + Mode row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* By category */}
            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 14 }}>
                By Vehicle Category
              </p>
              {detail.byCategory.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No data</p>
              ) : detail.byCategory.map((c) => (
                <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLOUR[c.category] ?? '#64748b', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>
                    {c.category.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {c.soldCount} sold · {c.registeredCount} reg.
                  </span>
                </div>
              ))}
            </div>

            {/* By mode of sale */}
            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 14 }}>
                By Mode of Sale
              </p>
              {detail.byModeOfSale.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No data</p>
              ) : detail.byModeOfSale.map((m) => {
                const pct = detail.metrics.totalRevenue > 0
                  ? (m.revenue / detail.metrics.totalRevenue) * 100
                  : 0;
                return (
                  <div key={m.mode} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                      <span>{m.mode}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{m.count} · {formatNaira(m.revenue)}</span>
                    </div>
                    <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 3, height: 5 }}>
                      <div style={{ background: '#6366f1', borderRadius: 3, height: '100%', width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top sales table */}
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Top Sales — {detail.label}</h2>
            </div>
            {detail.topSales.length === 0 ? (
              <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>No sales recorded for this month.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Vehicle', 'Buyer', 'Selling Price', 'Date Sold', 'Receipt'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Selling Price' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.topSales.map((s) => (
                    <tr
                      key={s.id}
                      style={{ borderBottom: '1px solid var(--color-border)', cursor: s.receiptId ? 'pointer' : 'default' }}
                      onClick={() => s.receiptId && router.push(`/receipts/${s.receiptId}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{s.vehicleName}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{s.buyerName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontWeight: 700 }}>{formatNaira(s.sellingPrice)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{formatDate(s.dateSold)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {s.receiptId
                          ? <span style={{ color: '#6366f1', fontWeight: 600 }}>View →</span>
                          : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(dashboard)/month/"
git commit -m "feat(dashboard): add monthly detail page at /dashboard/month/[yearMonth]"
```

---

## Task 9: Smoke test in the running app

- [ ] **Step 1: Start the full stack**

```bash
# Kill any lingering node processes first
taskkill /F /IM node.exe
# Start everything
npm run dev
```

- [ ] **Step 2: Log in and verify the histogram renders**

Open http://localhost:3000, log in as `admin@zextjv.com` / `Admin@1234`.

On the dashboard, confirm:
- The "Total Revenue (All Time)" card is gone
- A histogram of monthly bars appears in its place, beside "Revenue This Year"
- Hovering a bar shows a tooltip with the month name, revenue, and sold/registered counts

- [ ] **Step 3: Click a bar and verify the detail page**

Click any bar. Confirm:
- The URL changes to `/dashboard/month/YYYY-MM`
- The page shows the month label in the header
- All 4 metric cards render (Revenue, Gross Profit, Cars Sold, Cars Registered)
- The daily chart renders (empty or with bars depending on seed data)
- The category and mode-of-sale sections render
- The top sales table renders with "View →" links

- [ ] **Step 4: Test the back button**

Click "← Dashboard" and confirm it returns to the dashboard with the histogram still visible.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(dashboard): monthly revenue histogram and detail page — complete"
```
