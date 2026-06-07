# Responsive Design — ZEXT CDMS

**Date:** 2026-06-07  
**Scope:** All screens — phones (≥360px), tablets (≥768px), desktop (≥1024px)  
**Approach:** Shell-first, progressive — fix layout shell, then grids, tables, and forms page by page using Tailwind responsive prefixes

---

## Breakpoints

| Name | Width | Sidebar | Tables | Grids |
|---|---|---|---|---|
| default (phone) | < 768px | Hidden, hamburger toggle | Card stack | 1 column |
| `md` (tablet) | 768px–1023px | Hidden, hamburger toggle | Full table | 2 columns |
| `lg` (desktop) | ≥ 1024px | Always visible (no change) | Full table | 3–4 columns |

---

## 1. Layout Shell (`apps/web/app/(dashboard)/layout.tsx`)

**Current state:** Fixed 220px `<aside>` always rendered. No hamburger. No mobile topbar.

**Changes:**
- Add `sidebarOpen` boolean state (default `false`)
- Sidebar gets `fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto w-[220px] transform transition-transform duration-200 lg:translate-x-0`. On mobile/tablet: `-translate-x-full` when `sidebarOpen=false`, `translate-x-0` when `sidebarOpen=true`. On desktop: `lg:relative` rejoins the flex flow and `lg:translate-x-0` forces it always visible regardless of state — no JS resize handling needed.
- Dark overlay `fixed inset-0 z-30 bg-black/60 lg:hidden` rendered when `sidebarOpen` — clicking it closes the sidebar and sets `sidebarOpen=false`
- Topbar gains a hamburger button on the left (`lg:hidden`) — toggles `sidebarOpen`; swaps to `✕` when open
- ZEXT wordmark added to topbar (visible on `< lg` since sidebar is hidden)
- Sidebar close button (`✕`) shown inside drawer on mobile (`lg:hidden`)
- Session timeout warning banner already uses `fixed top-0` — no change needed; it appears above the drawer

**No changes** to desktop layout — sidebar width, topbar height, and nav items remain identical at `≥ 1024px`.

---

## 2. Dashboard Page (`apps/web/app/(dashboard)/page.tsx`)

**Metric cards grid:**
- `grid-cols-4` → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

**Revenue cards (admin only):**
- `grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2`

**Recent tables row (Vehicles + Sales):**
- `gridTemplateColumns: '1fr 1fr'` (inline style) → Tailwind `grid grid-cols-1 lg:grid-cols-2`

**Quick actions:** Already `flex flex-wrap` — no change needed.

**Page padding:** `p-6` → `p-4 md:p-6` so phones get slightly more breathing room.

---

## 3. List Pages

Applies to: Vehicles, Sales, Swaps, Receipts, Customers, Accessories, Audit Log.

### Page header
`flex items-center justify-between` → `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`

### Filter bar
Already `flex gap-3 flex-wrap` — no change. Search input `minWidth: 220px` → remove min-width on mobile.

### Table (hidden on phone)
Wrap existing `<table>` in `<div className="hidden md:block">`.

### Card list (shown on phone only)
Add `<div className="block md:hidden space-y-2">` with one card per row:

```
[photo/icon]  Vehicle Name · Colour          [STATUS badge]
              chassis · date bought          [CATEGORY badge]
```

Card is a `<div onClick>` with hover state matching existing table row hover. Tapping navigates to the detail page (same as clicking a table row).

Each list page gets its own card shape — Sales cards show buyer name + price + receipt number; Receipts cards show receipt number + vehicle + amount; Customers cards show name + phone + email; Audit cards show action + user + timestamp.

### Pagination
`Pagination` component already uses `flex flex-wrap` internally — verify and leave as-is.

---

## 4. Register / Form Pages

Applies to: Register Vehicle, Register Sale, Register Swap, Register Accessory Sale.

### Field grid
Fields currently rendered as individual `<div>` stacks — wrap in `grid grid-cols-1 md:grid-cols-2 gap-4`. Long fields (description, notes, textarea) get `md:col-span-2` to span full width.

### Photo/file upload sections
Already block-level — no change needed.

### Submit button row
`flex justify-end` → `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`

### Page padding
`p-6` → `p-4 md:p-6`

---

## 5. Detail Pages

Applies to: Vehicle Detail (`/vehicles/[id]`), Customer Detail (`/customers/[id]`), Receipt Detail (`/receipts/[id]`).

These pages are already single-column. Changes are minimal:
- Page padding: `p-6` → `p-4 md:p-6`
- Any side-by-side `flex` rows that hold info + action button: `flex-col gap-3 sm:flex-row sm:items-center`

---

## 6. Auth Pages

`AuthLayout` is already responsive (`max-w-md`, `px-4`, `min-h-screen flex items-center justify-center`). The card uses `p-8` — change to `p-6 sm:p-8` for tighter phone padding. No structural changes.

---

## Out of Scope

- Tablet-specific sidebar (icon-only rail) — not selected; hamburger covers tablet too
- Bottom tab navigation — not selected
- Dark/light theme toggle
- Any backend / API changes

---

## Implementation Order

1. Layout shell (hamburger drawer + overlay) — unblocks all other pages
2. Dashboard page (grid adjustments)
3. Vehicles page (card stack + header)
4. Sales page
5. Swaps page
6. Receipts page
7. Customers page
8. Accessories page
9. Audit page
10. Register Vehicle form
11. Register Sale form
12. Register Swap form
13. Register Accessory Sale form
14. Detail pages (Vehicle, Customer, Receipt)
15. Auth layout padding tweak
