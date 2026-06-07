# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every page of the ZEXT CDMS usable on phones (≥360px), tablets (≥768px), and desktop (≥1024px).

**Architecture:** Shell-first progressive approach — fix the layout shell (hamburger drawer) first so every page benefits immediately, then sweep page-by-page adding responsive grids, card-stack tables on mobile, and responsive form layouts. Uses Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) inline — no new abstractions or components introduced.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4 (all existing — no new packages)

**Spec:** `docs/superpowers/specs/2026-06-07-responsive-design.md`

---

## File Map

| Task | File modified |
|---|---|
| 1 | `apps/web/app/(dashboard)/layout.tsx` |
| 2 | `apps/web/app/(dashboard)/page.tsx` |
| 3 | `apps/web/app/(dashboard)/vehicles/page.tsx` |
| 4 | `apps/web/app/(dashboard)/sales/page.tsx` |
| 5 | `apps/web/app/(dashboard)/swaps/page.tsx` |
| 6 | `apps/web/app/(dashboard)/receipts/page.tsx` |
| 7 | `apps/web/app/(dashboard)/customers/page.tsx` |
| 8 | `apps/web/app/(dashboard)/accessories/page.tsx` |
| 9 | `apps/web/app/(dashboard)/audit/page.tsx` |
| 10 | `apps/web/app/(dashboard)/vehicles/register/page.tsx` |
| 11 | `apps/web/app/(dashboard)/sales/register/page.tsx` |
| 12 | `apps/web/app/(dashboard)/swaps/register/page.tsx` |
| 13 | `apps/web/app/(dashboard)/accessories/sales/register/page.tsx` |
| 14 | `apps/web/app/(dashboard)/vehicles/[id]/page.tsx`, `apps/web/app/(dashboard)/customers/[id]/page.tsx`, `apps/web/app/(dashboard)/receipts/[id]/page.tsx` |
| 15 | `apps/web/app/(auth)/layout.tsx` |

> **No tests exist** in this codebase for the frontend. Verification is visual: run `npm run dev` (kills any existing node process first with `taskkill /F /IM node.exe` on Windows), open the URL in a browser, and resize to phone/tablet/desktop widths using DevTools.

---

## Task 1: Layout Shell — Hamburger Drawer

**Files:**
- Modify: `apps/web/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add `sidebarOpen` state and close-on-overlay logic**

  In `DashboardLayout`, add `sidebarOpen` after the existing `hydrated` state:

  ```tsx
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  ```

- [ ] **Step 2: Update the `<aside>` element to support drawer behaviour**

  Replace the current `<aside ...>` opening tag (currently `className="w-[220px] flex flex-col flex-shrink-0"`) with:

  ```tsx
  <aside
    className={`fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto w-[220px] flex flex-col flex-shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${
      sidebarOpen ? 'translate-x-0' : '-translate-x-full'
    }`}
    style={{
      background: '#0d0d0d',
      borderRight: '1px solid var(--color-border)',
    }}
  >
  ```

  Inside the sidebar header `<div className="p-5 border-b" ...>`, add a close button visible only on mobile:

  ```tsx
  <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
    <Wordmark size="sm" />
    <button
      className="lg:hidden"
      onClick={() => setSidebarOpen(false)}
      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
      aria-label="Close navigation"
    >
      ✕
    </button>
  </div>
  ```

- [ ] **Step 3: Add the dark overlay and hamburger button to the main area**

  In the JSX return, directly after the session-warning banner and before the `<aside>`, add the overlay:

  ```tsx
  {sidebarOpen && (
    <div
      className="fixed inset-0 z-30 bg-black/60 lg:hidden"
      onClick={() => setSidebarOpen(false)}
    />
  )}
  ```

  Replace the existing `<header style={{ ... }}>` with one that includes a hamburger button:

  ```tsx
  <header
    style={{
      height: 52,
      background: '#0d0d0d',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      paddingRight: '20px',
      gap: '12px',
    }}
  >
    <button
      className="lg:hidden"
      onClick={() => setSidebarOpen((o) => !o)}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
        fontSize: '20px',
        width: 52,
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="Toggle navigation"
    >
      ☰
    </button>
    <div className="flex-1" />
    <NotificationBell />
    <button
      onClick={() => router.push('/sales/register')}
      style={{
        background: 'linear-gradient(135deg,#ef4444,#f97316)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      + New Record
    </button>
  </header>
  ```

  Also add `min-w-0` to the main area wrapper to prevent flex overflow:

  ```tsx
  <div className="flex-1 flex flex-col overflow-hidden min-w-0">
  ```

- [ ] **Step 4: Verify visually**

  ```powershell
  taskkill /F /IM node.exe; npm run dev
  ```

  Open http://localhost:3000. In browser DevTools, set viewport to 375px wide. Confirm:
  - Sidebar is hidden by default
  - ☰ button appears in topbar
  - Clicking ☰ slides sidebar in from the left with a dark overlay
  - Clicking the overlay or ✕ closes it
  - At ≥1024px sidebar is always visible, hamburger is hidden

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/layout.tsx
  git commit -m "feat: responsive shell — hamburger drawer for mobile/tablet"
  ```

---

## Task 2: Dashboard Page — Responsive Grids

**Files:**
- Modify: `apps/web/app/(dashboard)/page.tsx`

- [ ] **Step 1: Fix outer page padding**

  Line 49 — change `className="p-6"` to `className="p-4 md:p-6"`.

- [ ] **Step 2: Fix metric cards grid (4-column)**

  Line 62 — change:
  ```tsx
  <div className="grid grid-cols-4 gap-4 mb-6">
  ```
  to:
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  ```

- [ ] **Step 3: Fix revenue cards grid (2-column, admin only)**

  Line 71 — change:
  ```tsx
  <div className="grid grid-cols-2 gap-4 mb-6">
  ```
  to:
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
  ```

- [ ] **Step 4: Fix recent tables row (inline style → Tailwind)**

  Line 79 — replace:
  ```tsx
  <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
  ```
  with:
  ```tsx
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  ```

- [ ] **Step 5: Verify visually**

  With dev server running, open http://localhost:3000. Resize viewport to:
  - 375px: metric cards stack 1 column, recent tables stack 1 column
  - 640px: metric cards go 2 columns
  - 1024px+: metric cards go 4 columns, recent tables side-by-side

- [ ] **Step 6: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/page.tsx
  git commit -m "feat: responsive dashboard grids (1→2→4 column metric cards)"
  ```

---

## Task 3: Vehicles List Page — Card Stack

**Files:**
- Modify: `apps/web/app/(dashboard)/vehicles/page.tsx`

- [ ] **Step 1: Fix page padding and header**

  Line 56 — change `className="p-6"` to `className="p-4 md:p-6"`.

  Lines 57–77 — change the header `<div className="flex items-center justify-between mb-6">` to:
  ```tsx
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
  ```

- [ ] **Step 2: Remove min-width from search input**

  In the filter bar (line 82), change `minWidth: '220px'` to remove it (or set `minWidth: 0`):
  ```tsx
  <input
    style={{ ...inputStyle, width: '100%' }}
    ...
  ```
  Wrap the filter bar div in `<div className="flex gap-3 mb-5 flex-wrap">` (already has `flex-wrap`, just verify it's there).

- [ ] **Step 3: Wrap existing table in `hidden md:block`**

  Find the `<div style={{ background: 'var(--color-bg-surface)', border: ... }}>` that wraps the `<table>` (line 98). Change it to:

  ```tsx
  <div className="hidden md:block" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
    <table ...>
      ...
    </table>
  </div>
  ```

- [ ] **Step 4: Add mobile card list**

  Directly after the table wrapper div (before `<Pagination>`), add:

  ```tsx
  {/* Mobile card list — visible below md */}
  <div className="block md:hidden space-y-2">
    {loading ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
    ) : vehicles.length === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No vehicles found</p>
    ) : vehicles.map((v) => (
      <div
        key={v.id}
        onClick={() => router.push(`/vehicles/${v.id}`)}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
      >
        {v.photos?.[0] ? (
          <img src={v.photos[0].url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--color-border)', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🚗</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{v.chassisNumber} · {v.colour}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          <StatusBadge status={v.status} />
          <StatusBadge status={v.category} />
        </div>
      </div>
    ))}
  </div>
  ```

- [ ] **Step 5: Verify visually**

  Open http://localhost:3000/vehicles. At 375px: table is hidden, cards are shown. At 768px+: table appears, cards hidden.

- [ ] **Step 6: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/vehicles/page.tsx
  git commit -m "feat: responsive vehicles list — card stack on mobile"
  ```

---

## Task 4: Sales List Page — Card Stack

**Files:**
- Modify: `apps/web/app/(dashboard)/sales/page.tsx`

- [ ] **Step 1: Fix padding and header**

  Change `className="p-6"` → `className="p-4 md:p-6"`.

  Change `<div className="flex items-center justify-between mb-6">` → `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">`.

- [ ] **Step 2: Wrap table in `hidden md:block`**

  Wrap the outer `<div style={{ background: 'var(--color-bg-surface)', ... }}>` that contains the sales `<table>` with `className="hidden md:block"`.

- [ ] **Step 3: Add mobile card list after the table wrapper**

  ```tsx
  <div className="block md:hidden space-y-2">
    {loading ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
    ) : sales.length === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No sales recorded yet</p>
    ) : sales.map((s) => (
      <div
        key={s.id}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '12px 14px',
          cursor: s.receipt ? 'pointer' : 'default',
        }}
        onClick={() => s.receipt && router.push(`/receipts/${s.receipt.id}`)}
        onMouseEnter={(e) => { if (s.receipt) e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.vehicle?.name ?? '—'}</p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: '8px' }}>{formatNaira(parseFloat(s.sellingPrice))}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.buyerName} · {formatDate(s.dateSold)}</p>
          {s.isReversed
            ? <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>Reversed</span>
            : <StatusBadge status="SOLD" />}
        </div>
        {s.receipt && (
          <p style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace', marginTop: '3px' }}>{s.receipt.receiptNumber}</p>
        )}
      </div>
    ))}
  </div>
  ```

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/sales at 375px. Cards show buyer name, vehicle, price, date, and receipt number. Table hidden.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/sales/page.tsx
  git commit -m "feat: responsive sales list — card stack on mobile"
  ```

---

## Task 5: Swaps List Page — Card Stack

**Files:**
- Modify: `apps/web/app/(dashboard)/swaps/page.tsx`

- [ ] **Step 1: Fix padding and header**

  Change `className="p-6"` → `className="p-4 md:p-6"`.

  Change `<div className="flex items-center justify-between mb-6">` → `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">`.

- [ ] **Step 2: Wrap table in `hidden md:block`**

  Wrap the outer `<div style={{ background: 'var(--color-bg-surface)', ... }}>` containing the swaps `<table>` with `className="hidden md:block"`.

- [ ] **Step 3: Add mobile card list**

  ```tsx
  <div className="block md:hidden space-y-2">
    {loading ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
    ) : swaps.length === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No swaps recorded yet</p>
    ) : swaps.map((s) => (
      <div
        key={s.id}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '12px 14px',
          cursor: s.receipt ? 'pointer' : 'default',
        }}
        onClick={() => s.receipt && router.push(`/receipts/${s.id}`)}
        onMouseEnter={(e) => { if (s.receipt) e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>OUT → IN</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.outgoingVehicle?.name ?? '—'} → {s.incomingVehicle?.name ?? '—'}
            </p>
          </div>
          {s.cashDifference && parseFloat(s.cashDifference) > 0 && (
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: '8px' }}>
              {formatNaira(parseFloat(s.cashDifference))}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.modeOfSwap.replace(/_/g, ' ')} · {formatDate(s.dateOfSwap)}</p>
          {s.receipt?.receiptNumber && (
            <p style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace' }}>{s.receipt.receiptNumber}</p>
          )}
        </div>
      </div>
    ))}
  </div>
  ```

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/swaps at 375px. Cards show outgoing → incoming vehicles, cash difference, mode, date.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/swaps/page.tsx
  git commit -m "feat: responsive swaps list — card stack on mobile"
  ```

---

## Task 6: Receipts List Page — Card Stack

**Files:**
- Modify: `apps/web/app/(dashboard)/receipts/page.tsx`

- [ ] **Step 1: Fix padding and header**

  Change `className="p-6"` → `className="p-4 md:p-6"`.

  Change `<div className="flex items-center justify-between mb-6">` → `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">`.

- [ ] **Step 2: Wrap table in `hidden md:block`**

  Wrap the outer `<div style={{ background: 'var(--color-bg-surface)', ... }}>` containing the receipts `<table>` with `className="hidden md:block"`.

- [ ] **Step 3: Add mobile card list**

  ```tsx
  <div className="block md:hidden space-y-2">
    {loading ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
    ) : receipts.length === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No receipts yet</p>
    ) : receipts.map((r) => (
      <div
        key={r.id}
        onClick={() => router.push(`/receipts/${r.id}`)}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '12px 14px',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{r.receiptNumber}</p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginLeft: '8px', flexShrink: 0 }}>
            {r.sale?.sellingPrice ? formatNaira(parseFloat(r.sale.sellingPrice)) : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {r.sale?.vehicle?.name ?? '—'} · {r.sale?.buyerName ?? ''} · {formatDate(r.receiptDate)}
          </p>
          {r.isVoided
            ? <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>VOIDED</span>
            : <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Valid</span>}
        </div>
      </div>
    ))}
  </div>
  ```

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/receipts at 375px. Cards show receipt number, vehicle, buyer, amount, date, status.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/receipts/page.tsx
  git commit -m "feat: responsive receipts list — card stack on mobile"
  ```

---

## Task 7: Customers List Page — Card Stack

**Files:**
- Modify: `apps/web/app/(dashboard)/customers/page.tsx`

- [ ] **Step 1: Fix padding, header, and search input**

  Change `className="p-6"` → `className="p-4 md:p-6"`.

  Change `<div className="flex items-center justify-between mb-6">` → `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">`.

  Remove `minWidth: '260px'` from the search input style (or set to `0`), add `width: '100%'`:
  ```tsx
  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '7px 12px', fontSize: '13px', outline: 'none', width: '100%' }}
  ```

- [ ] **Step 2: Wrap table in `hidden md:block`**

  Wrap the outer `<div style={{ background: 'var(--color-bg-surface)', ... }}>` containing the customers `<table>` with `className="hidden md:block"`.

- [ ] **Step 3: Add mobile card list**

  ```tsx
  <div className="block md:hidden space-y-2">
    {loading ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
    ) : customers.length === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No customers yet</p>
    ) : customers.map((c) => (
      <div
        key={c.id}
        onClick={() => router.push(`/customers/${c.id}`)}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '12px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
      >
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{c.phone} · {formatDate(c.createdAt)}</p>
        </div>
        <span style={{ fontSize: '12px', color: '#ef4444' }}>→</span>
      </div>
    ))}
  </div>
  ```

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/customers at 375px. Cards show avatar, name, phone, join date.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/customers/page.tsx
  git commit -m "feat: responsive customers list — card stack on mobile"
  ```

---

## Task 8: Accessories List Page — Card Stack

**Files:**
- Modify: `apps/web/app/(dashboard)/accessories/page.tsx`

- [ ] **Step 1: Fix padding and header**

  Change `className="p-6"` → `className="p-4 md:p-6"`.

  Change `<div className="flex items-center justify-between mb-6">` → `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">`.

  The header has two buttons in a `<div className="flex gap-3">` — leave that inner div as-is (it wraps correctly already).

- [ ] **Step 2: Fix Add Item form grid (already has `grid-cols-2`)**

  Inside the add-item form, the existing `<div className="grid grid-cols-2 gap-4">` blocks need to become `md:` responsive. Change each instance of `className="grid grid-cols-2 gap-4"` in the form to `className="grid grid-cols-1 md:grid-cols-2 gap-4"`. There are 4 such divs in the form.

- [ ] **Step 3: Wrap item table in `hidden md:block`**

  Wrap the outer `<div style={{ background: 'var(--color-bg-surface)', ... }}>` containing the accessories `<table>` with `className="hidden md:block"`.

- [ ] **Step 4: Add mobile card list (after table wrapper, before `<Pagination>`)**

  ```tsx
  <div className="block md:hidden space-y-2">
    {loading ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
    ) : items.length === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No items yet — add your first item</p>
    ) : items.map((item) => {
      const isLow = item.quantityInStock <= item.lowStockThreshold;
      return (
        <div
          key={item.id}
          style={{
            background: 'var(--color-bg-surface)',
            border: `1px solid ${isLow ? 'rgba(245,158,11,0.4)' : 'var(--color-border)'}`,
            borderRadius: '10px',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.category.replace(/_/g, ' ')}</p>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', flexShrink: 0, marginLeft: '8px' }}>{formatNaira(parseFloat(item.sellingPrice))}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Stock: <strong style={{ color: isLow ? '#f59e0b' : 'var(--color-text-primary)' }}>{item.quantityInStock}</strong> / threshold {item.lowStockThreshold}</p>
            {isLow
              ? <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.12)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.3)' }}>LOW STOCK</span>
              : <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.25)' }}>In Stock</span>}
          </div>
        </div>
      );
    })}
  </div>
  ```

- [ ] **Step 5: Verify visually**

  Open http://localhost:3000/accessories at 375px. Cards show item name, category, price, stock count, status badge. Add Item form fields stack single-column on mobile.

- [ ] **Step 6: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/accessories/page.tsx
  git commit -m "feat: responsive accessories list — card stack on mobile, responsive add-item form"
  ```

---

## Task 9: Audit Log Page — Card Stack

**Files:**
- Modify: `apps/web/app/(dashboard)/audit/page.tsx`

- [ ] **Step 1: Fix padding and header**

  Change `className="p-6"` → `className="p-4 md:p-6"`.

  Change `<div className="flex items-center justify-between mb-6">` → `<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">`.

- [ ] **Step 2: Wrap table in `hidden md:block`**

  Wrap the outer `<div style={{ background: 'var(--color-bg-surface)', ... }}>` containing the audit `<table>` with `className="hidden md:block"`.

- [ ] **Step 3: Add mobile card list**

  ```tsx
  <div className="block md:hidden space-y-2">
    {loading ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading…</p>
    ) : entries.length === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '32px', textAlign: 'center' }}>No audit entries yet</p>
    ) : entries.map((entry) => (
      <div
        key={entry.id}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '12px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>{CATEGORY_ICONS[entry.category] ?? '•'}</span>
          <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', flex: 1 }}>{entry.action}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {entry.user?.name} · {new Date(entry.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
          {entry.recordType && entry.recordId && (
            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{entry.recordType}: {entry.recordId.slice(0, 8)}…</p>
          )}
        </div>
      </div>
    ))}
  </div>
  ```

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/audit at 375px. Cards show category icon, action text, user name, timestamp.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/audit/page.tsx
  git commit -m "feat: responsive audit log — card stack on mobile"
  ```

---

## Task 10: Register Vehicle Form — Responsive Fields

**Files:**
- Modify: `apps/web/app/(dashboard)/vehicles/register/page.tsx`

- [ ] **Step 1: Fix outer padding**

  Line 86 — change `className="p-6 max-w-2xl"` to `className="p-4 md:p-6 max-w-2xl"`.

- [ ] **Step 2: Make all field-pair grids responsive**

  The form has four `<div className="grid grid-cols-2 gap-4">` blocks. Change every one to `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`. Occurrences are at approximately lines 102, 106, 110, 119.

  Confirm by searching for `grid-cols-2` in the file — there should be 4 matches (all inside the form, not the outer layout).

- [ ] **Step 3: Verify visually**

  Open http://localhost:3000/vehicles/register at 375px. All fields stack single-column. At 768px fields pair up in two columns.

- [ ] **Step 4: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/vehicles/register/page.tsx
  git commit -m "feat: responsive register vehicle form"
  ```

---

## Task 11: Register Sale Form — Responsive Fields

**Files:**
- Modify: `apps/web/app/(dashboard)/sales/register/page.tsx`

- [ ] **Step 1: Fix outer padding**

  Find the outermost `<div className="p-6 ...">` (or `className="p-6"`) and change to `className="p-4 md:p-6"`. If it also has `max-w-2xl`, keep that.

- [ ] **Step 2: Make all field-pair grids responsive**

  Search for `grid-cols-2` in this file. Change every `<div className="grid grid-cols-2 gap-4">` to `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`.

- [ ] **Step 3: Make cancel + submit button row responsive**

  Find the div containing the Cancel and Submit buttons (likely `className="flex gap-3 justify-end"` or similar). Change to:
  ```tsx
  className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
  ```
  Buttons inside do not need width changes — they'll be full-width in column mode and auto in row mode.

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/sales/register at 375px. All fields stack. Cancel/Submit buttons stack vertically (Submit on top).

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/sales/register/page.tsx
  git commit -m "feat: responsive register sale form"
  ```

---

## Task 12: Register Swap Form — Responsive Fields

**Files:**
- Modify: `apps/web/app/(dashboard)/swaps/register/page.tsx`

- [ ] **Step 1: Fix outer padding**

  Change `className="p-6 ..."` → `className="p-4 md:p-6 ..."` on the outer page wrapper.

- [ ] **Step 2: Make all field-pair grids responsive**

  Search for `grid-cols-2` in this file. Change every `<div className="grid grid-cols-2 gap-4">` to `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`.

- [ ] **Step 3: Make cancel + submit button row responsive**

  Find the button row (likely `className="flex gap-3 justify-end"` or `className="flex gap-3"`). Change to:
  ```tsx
  className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
  ```

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/swaps/register at 375px. Fields stack. Buttons stack vertically.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/swaps/register/page.tsx
  git commit -m "feat: responsive register swap form"
  ```

---

## Task 13: Register Accessory Sale Form — Responsive Fields

**Files:**
- Modify: `apps/web/app/(dashboard)/accessories/sales/register/page.tsx`

- [ ] **Step 1: Fix outer padding**

  Change `className="p-6 ..."` → `className="p-4 md:p-6 ..."` on the outer page wrapper.

- [ ] **Step 2: Make all field-pair grids responsive**

  Search for `grid-cols-2` in this file. Change every `<div className="grid grid-cols-2 gap-4">` to `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`.

- [ ] **Step 3: Make cancel + submit button row responsive**

  Find the button row and change to:
  ```tsx
  className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
  ```

- [ ] **Step 4: Verify visually**

  Open http://localhost:3000/accessories/sales/register at 375px. Fields stack. Buttons stack vertically.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/accessories/sales/register/page.tsx
  git commit -m "feat: responsive register accessory sale form"
  ```

---

## Task 14: Detail Pages — Padding and 2-Column Grid Fix

**Files:**
- Modify: `apps/web/app/(dashboard)/vehicles/[id]/page.tsx`
- Modify: `apps/web/app/(dashboard)/customers/[id]/page.tsx`
- Modify: `apps/web/app/(dashboard)/receipts/[id]/page.tsx`

- [ ] **Step 1: Vehicle detail — fix padding and 2-column grid**

  In `apps/web/app/(dashboard)/vehicles/[id]/page.tsx`:

  Change outermost `className="p-6"` → `className="p-4 md:p-6"`.

  Find the two-column grid (line ~57):
  ```tsx
  <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
  ```
  Replace with:
  ```tsx
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  ```

- [ ] **Step 2: Customer detail — fix padding and 2-column grid**

  In `apps/web/app/(dashboard)/customers/[id]/page.tsx`:

  Change outermost `className="p-6 max-w-3xl"` → `className="p-4 md:p-6 max-w-3xl"`.

  Find the two-column grid (line ~56):
  ```tsx
  <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
  ```
  Replace with:
  ```tsx
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  ```

- [ ] **Step 3: Receipt detail — fix padding**

  In `apps/web/app/(dashboard)/receipts/[id]/page.tsx`:

  Change outermost `className="p-6 ..."` → `className="p-4 md:p-6 ..."`.

  Search for any `style={{ gridTemplateColumns: '1fr 1fr' }}` or `grid-cols-2` — if found, change to `grid-cols-1 lg:grid-cols-2`.

- [ ] **Step 4: Verify visually**

  Open a vehicle detail page at 375px. Photo + info should stack vertically. At 1024px+ they sit side-by-side. Same for customer detail.

- [ ] **Step 5: Commit**

  ```powershell
  git add apps/web/app/(dashboard)/vehicles/[id]/page.tsx apps/web/app/(dashboard)/customers/[id]/page.tsx apps/web/app/(dashboard)/receipts/[id]/page.tsx
  git commit -m "feat: responsive detail pages — stack to single column on mobile"
  ```

---

## Task 15: Auth Layout — Phone Padding

**Files:**
- Modify: `apps/web/app/(auth)/layout.tsx`

- [ ] **Step 1: Tighten card padding on phones**

  In `apps/web/app/(auth)/layout.tsx`, the inner card has `p-8`. Change to `p-6 sm:p-8`:

  ```tsx
  <div
    className="w-full max-w-md rounded-xl p-6 sm:p-8"
    style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
    }}
  >
    {children}
  </div>
  ```

- [ ] **Step 2: Verify visually**

  Open http://localhost:3000/login at 375px. Login card should fit the screen with comfortable padding, no horizontal overflow.

- [ ] **Step 3: Commit**

  ```powershell
  git add apps/web/app/(auth)/layout.tsx
  git commit -m "feat: responsive auth layout — tighter card padding on phones"
  ```

---

## Done

All 15 tasks complete. The ZEXT CDMS now works across phones (≥360px), tablets (≥768px), and desktop (≥1024px):

- Layout shell: hamburger drawer on mobile/tablet, persistent sidebar on desktop
- Dashboard: 1→2→4 column metric cards, stacked recent tables on mobile
- All 7 list pages: card stack on phone, full table on tablet+
- All 4 register forms: single-column on phone, 2-column on tablet+
- All 3 detail pages: stacked on phone, 2-column on desktop
- Auth: comfortable padding on all sizes
