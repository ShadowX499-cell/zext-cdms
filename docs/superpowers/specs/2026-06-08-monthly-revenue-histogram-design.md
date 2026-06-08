# Monthly Revenue Histogram & Detail Page

**Date:** 2026-06-08  
**Status:** Approved  
**Scope:** Replace "Total Revenue (All Time)" dashboard card with a 12-month clickable histogram; add a full monthly detail page at `/dashboard/month/[yearMonth]`.

---

## 1. Overview

The admin dashboard currently shows a static "Total Revenue (All Time)" stat card in the two-card admin revenue row. This card is replaced with a compact vertical bar chart (histogram) showing the last 12 calendar months of revenue. Each bar is clickable and navigates to a dedicated monthly detail page — a full-screen performance report for that month.

---

## 2. Affected Files

### Backend (new)
- `apps/api/src/dashboard/dashboard.controller.ts` — add two GET routes
- `apps/api/src/dashboard/dashboard.service.ts` — add two service methods
- `apps/api/src/dashboard/dto/monthly-histogram-item.dto.ts` — response shape
- `apps/api/src/dashboard/dto/monthly-detail.dto.ts` — response shape

### Frontend (new)
- `apps/web/app/(dashboard)/month/[yearMonth]/page.tsx` — monthly detail page
- `apps/web/components/dashboard/MonthlyHistogram.tsx` — histogram card component

### Frontend (modified)
- `apps/web/app/(dashboard)/page.tsx` — swap "Total Revenue" card for `<MonthlyHistogram />`
- `apps/web/lib/api-client.ts` (or equivalent) — add two new API call functions

---

## 3. API Design

Both endpoints are SUPER_ADMIN only (existing JWT + role guard pattern).

### 3.1 `GET /dashboard/monthly-histogram`

Returns the last 12 complete calendar months, ordered oldest → newest.

**Response:**
```ts
Array<{
  month: string;        // display label e.g. "Jun '25"
  year: number;         // e.g. 2025
  monthNum: number;     // 1–12
  revenue: number;      // sum of confirmed sellingPrice (as JS number, naira)
  soldCount: number;    // confirmed non-reversed sales
  registeredCount: number; // vehicles created in that month
}>
```

**Implementation notes:**
- "Confirmed sale" = `Sale` where `isReversed = false` and related `Receipt.isVoided = false` (match existing revenue logic)
- Current month is included but partial
- Revenue stored as `Decimal` in DB — convert to `Number` in service before returning
- Use 12 parallel Prisma queries (one `aggregate` + one `count` per month) or a raw SQL group-by

### 3.2 `GET /dashboard/monthly-detail/:yearMonth`

`:yearMonth` format: `YYYY-MM` (e.g. `2026-05`). Returns a single object.

**Response:**
```ts
{
  label: string;           // e.g. "May 2026"
  yearMonth: string;       // echo of param, e.g. "2026-05"

  metrics: {
    totalRevenue: number;
    grossProfit: number;   // sum of (sellingPrice − purchasePrice) where purchasePrice exists
    totalSold: number;
    totalRegistered: number;
  };

  dailySales: Array<{
    day: number;           // 1–31, sparse (only days with ≥1 sale)
    revenue: number;
    count: number;
  }>;

  byCategory: Array<{
    category: 'NG_USED' | 'TOKUNBO' | 'SCOOTER_BIKE';
    soldCount: number;
    registeredCount: number;
    revenue: number;
  }>;

  byModeOfSale: Array<{
    mode: string;          // ModeOfSale enum value
    count: number;
    revenue: number;
  }>;

  topSales: Array<{
    id: string;            // Sale.id
    vehicleName: string;
    buyerName: string;
    sellingPrice: number;
    dateSold: string;      // ISO date string
    receiptId: string;     // Receipt.id for the "View →" link
  }>;
}
```

**Implementation notes:**
- Validate `:yearMonth` with a regex `^\d{4}-(0[1-9]|1[0-2])$`; return 400 if invalid
- Date range: `from = first ms of month`, `to = last ms of month` (UTC)
- `grossProfit`: only include sales where `vehicle.purchasePrice IS NOT NULL`; label in UI as "est. on known costs"
- `topSales`: ordered by `sellingPrice DESC`, no limit (all sales that month — typically small)
- `dailySales`: use `dateSold` field (not `createdAt`) for grouping

---

## 4. Frontend — Histogram Card

**Component:** `apps/web/components/dashboard/MonthlyHistogram.tsx`

- Replaces the "Total Revenue (All Time)" `<div>` in `apps/web/app/(dashboard)/page.tsx`
- Fetches `GET /dashboard/monthly-histogram` on mount (same auth token as other dashboard calls)
- Renders using **Recharts `BarChart`** (already installed at v2.13.0)
- Bar height = revenue; tooltip shows formatted revenue + sold count on hover
- Current month bar: distinct highlight colour (`#6366f1` outline / lighter fill)
- Older months: muted indigo (`#312e81` → `#4338ca` gradient darker-to-lighter)
- On bar click: `router.push('/dashboard/month/YYYY-MM')`
- Shows a skeleton (animated placeholder bars) while loading
- Card header label: `MONTHLY REVENUE — click a bar`
- Same card shell as the existing "Revenue This Year" card (matching border-radius, padding, background)

---

## 5. Frontend — Monthly Detail Page

**Route:** `app/(dashboard)/month/[yearMonth]/page.tsx`  
**Auth:** Admin only — redirect to `/dashboard` if role is not `SUPER_ADMIN`  
**Data fetch:** Single call to `GET /dashboard/monthly-detail/:yearMonth` on mount

### 5.1 Page Header
- Back link: `← Dashboard` (uses `router.back()` or hard link to `/dashboard`)
- Title: `{label}` (e.g. "May 2026") in large bold
- Subtitle: "Monthly Performance Report"

### 5.2 Metric Cards Row (4 cards, equal width)
| Card | Value | Sub-label |
|------|-------|-----------|
| Total Revenue | `₦{totalRevenue}` (green) | `{totalSold} confirmed sales` |
| Gross Profit | `₦{grossProfit}` (purple) | `est. on known costs` |
| Cars Sold | `{totalSold}` | `confirmed, not reversed` |
| Cars Registered | `{totalRegistered}` | `added to inventory` |

### 5.3 Daily Sales Chart
- Recharts `BarChart`, x-axis = day of month (1–31), y-axis = revenue
- Sparse: days with no sales render as zero-height (bar not shown, gap visible)
- Tooltip: formatted Naira revenue + sale count for that day
- Chart label: `DAILY SALES — {MONTH YEAR}`

### 5.4 Two-Column Row: Category & Mode of Sale

**Left — By Vehicle Category**
- Simple list with colour dot, category name, `{soldCount} sold · {registeredCount} reg.`
- Colours: Tokunbo = indigo, NG Used = purple, Scooter/Bike = sky blue

**Right — By Mode of Sale**
- Horizontal progress bar per mode
- Bar width = `(revenue / totalRevenue) * 100%`
- Shows mode name, count, formatted revenue

### 5.5 Top Sales Table
Columns: Vehicle | Buyer | Selling Price | Date Sold | Receipt  
- Sorted by `sellingPrice DESC`
- Receipt column: "View →" link navigating to the existing receipt page (`/receipts/{receiptId}`)
- Clicking a row does the same as clicking "View →"
- Empty state: "No sales recorded for this month"

### 5.6 Loading & Error States
- Loading: skeleton placeholders for all sections (cards show pulsing grey boxes, chart shows placeholder bars)
- Invalid month param: show "Invalid month" message with back link
- API error: show generic error card with retry button

---

## 6. Data Flow

```
Dashboard page load
  ├── GET /dashboard/metrics          (existing, unchanged)
  └── GET /dashboard/monthly-histogram (new, parallel)

Monthly detail page load
  └── GET /dashboard/monthly-detail/:yearMonth  (new, single call)
```

The two dashboard fetches run in parallel (`Promise.all`). The histogram component manages its own loading state independently so it doesn't block the rest of the dashboard from rendering.

---

## 7. Out of Scope

- Secretary role access to this data (histogram card is already inside the admin-only revenue section; detail page redirects non-admins)
- Export (CSV/Excel) from the monthly detail page — the existing `/revenue/export` endpoints cover this separately
- Year-over-year comparison view
- Editing or reversing sales from the detail page
