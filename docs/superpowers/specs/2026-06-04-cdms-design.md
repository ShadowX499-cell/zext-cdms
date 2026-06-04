# ZEXT JOINT VENTURES — Car Dealership Management System (CDMS)
## Full System Design Specification
**Date:** 2026-06-04
**Scope:** All 3 phases (complete system)
**Status:** Approved — ready for implementation planning

---

## 1. Decisions Made During Design

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Full 3-phase system | Design schema and architecture once; avoids rework |
| Visual theme | Bold Automotive | Near-black + red-orange gradient, premium dealership aesthetic |
| Monorepo tool | Turborepo | Native Next.js + NestJS support, built-in caching, minimal config |
| Docker mode | Services only (dev) | PostgreSQL + Redis + Mailhog in Docker; apps run natively for fast HMR |
| Branding | ZEXT wordmark | Inter 900-weight, red-orange gradient `background-clip: text` |
| API style | REST + OpenAPI codegen | NestJS Swagger → `openapi-typescript` → typed client in Next.js |

---

## 2. Monorepo Structure

```
zext-cdms/
├── apps/
│   ├── web/                        # Next.js 15 (React 19) — frontend
│   └── api/                        # NestJS — backend
├── packages/
│   └── types/                      # Shared TypeScript types + OpenAPI-generated client
├── docker/
│   ├── docker-compose.yml
│   └── .env.docker
├── turbo.json
├── package.json                    # npm workspaces root
├── .env.example
└── .gitignore
```

### Turborepo pipeline (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "packages/types/generated/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:push": { "cache": false },
    "db:migrate": { "cache": false },
    "db:generate": { "cache": false },
    "lint": { "outputs": [] },
    "test": { "outputs": [] }
  }
}
```

**Dev commands:**
- `turbo dev` — starts NestJS on :3001 and Next.js on :3000 simultaneously
- `turbo db:push` — `prisma db push` (development schema sync)
- `turbo db:migrate` — `prisma migrate deploy` (production migrations)
- `turbo build` — generates Prisma client → generates OpenAPI types → builds web

---

## 3. Docker Compose (Development Services)

```yaml
# docker/docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: zext_cdms
      POSTGRES_USER: zext
      POSTGRES_PASSWORD: zext_dev_secret
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --requirepass redis_dev_secret

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"    # SMTP
      - "8025:8025"    # Web UI — view all sent emails at http://localhost:8025

volumes:
  postgres_data:
```

**Start services:** `docker compose -f docker/docker-compose.yml up -d`

---

## 4. Environment Variables

### `apps/api/.env`
```
DATABASE_URL="postgresql://zext:zext_dev_secret@localhost:5432/zext_cdms"
REDIS_URL="redis://:redis_dev_secret@localhost:6379"
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_ACCESS_EXPIRY="30m"
JWT_REFRESH_EXPIRY="7d"
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
OTP_EXPIRY_MINUTES=10
UPLOAD_DIR="./uploads"
NODE_ENV="development"
PORT=3001
```

### `apps/web/.env.local`
```
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-nextauth"
```

---

## 5. Prisma Database Schema

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum UserRole {
  SUPER_ADMIN
  SECRETARY
}

enum VehicleCategory {
  NG_USED
  TOKUNBO
  SCOOTER_BIKE
}

enum VehicleStatus {
  AVAILABLE
  SOLD
  SWAPPED
  ARCHIVED
}

enum ModeOfPurchase {
  OUTRIGHT
  TRADE_IN
  SWAP
  AUCTION
  CONSIGNMENT
}

enum ModeOfSale {
  OUTRIGHT
  HIRE_PURCHASE
  PART_PAYMENT
  SWAP_CASH
  AUCTION
}

enum ModeOfSwap {
  DIRECT
  CUSTOMER_TOP_UP
  ZEXT_TOP_UP
}

enum CashDirection {
  CUSTOMER_PAYS
  ZEXT_PAYS
}

enum ReceiptType {
  NG_USED_CAR
  TOKUNBO_CAR
  SWAP_DEAL
  ACCESSORIES_BIKE
}

enum AccessoryCategory {
  CAR_ACCESSORY
  SCOOTER_BIKE
}

enum PaymentMode {
  CASH
  TRANSFER
  POS
}

enum AuditCategory {
  AUTHENTICATION
  VEHICLE_REGISTRATION
  SALES
  SWAPS
  RECEIPTS
  ACCESSORIES
  REVENUE
  CUSTOMERS
  USER_MANAGEMENT
  NOTIFICATIONS
  SYSTEM
}

enum VehicleHistoryEvent {
  REGISTERED
  STATUS_CHANGED
  SALE_RECORDED
  SWAP_RECORDED
  RECEIPT_ISSUED
  RECORD_EDITED
  ARCHIVED
}

enum LoginOutcome {
  SUCCESS
  FAILED
  LOCKED
}

// ─── Users & Auth ─────────────────────────────────────────────────────────────

model User {
  id              String    @id @default(cuid())
  name            String
  email           String    @unique
  passwordHash    String
  role            UserRole  @default(SECRETARY)
  isActive        Boolean   @default(true)
  failedAttempts  Int       @default(0)
  lockedUntil     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  otpCodes        OtpCode[]
  loginHistory    LoginHistory[]
  vehicles        Vehicle[]       @relation("RegisteredBy")
  sales           Sale[]          @relation("SaleRegisteredBy")
  swaps           Swap[]          @relation("SwapRegisteredBy")
  receiptsIssued  Receipt[]       @relation("IssuedBy")
  receiptsVoided  Receipt[]       @relation("VoidedBy")
  auditLogs       AuditLog[]
  notifications   Notification[]
  vehicleHistory  VehicleHistory[]
  accessorySales  AccessorySale[]
  salesReversed   Sale[]          @relation("SaleReversedBy")
}

model OtpCode {
  id         String   @id @default(cuid())
  userId     String
  codeHash   String
  expiresAt  DateTime
  isUsed     Boolean  @default(false)
  attempts   Int      @default(0)
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model LoginHistory {
  id          String       @id @default(cuid())
  userId      String
  ipAddress   String
  deviceInfo  String
  outcome     LoginOutcome
  createdAt   DateTime     @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

model Vehicle {
  id              String          @id @default(cuid())
  dateBought      DateTime
  name            String
  category        VehicleCategory
  chassisNumber   String          @unique
  engineNumber    String
  plateNumber     String?
  colour          String
  ownerName       String
  modeOfPurchase  ModeOfPurchase
  purchasePrice   Decimal?        @db.Decimal(15, 2)
  notes           String?
  status          VehicleStatus   @default(AVAILABLE)
  branchId        String?
  registeredById  String
  coverPhotoId    String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  registeredBy    User            @relation("RegisteredBy", fields: [registeredById], references: [id])
  photos          VehiclePhoto[]
  history         VehicleHistory[]
  sale            Sale?
  outgoingSwap    Swap?           @relation("OutgoingVehicle")
  incomingSwap    Swap?           @relation("IncomingVehicle")
}

model VehiclePhoto {
  id            String   @id @default(cuid())
  vehicleId     String
  url           String
  filename      String
  isCover       Boolean  @default(false)
  uploadedById  String
  createdAt     DateTime @default(now())

  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
}

model VehicleHistory {
  id             String              @id @default(cuid())
  vehicleId      String
  event          VehicleHistoryEvent
  description    String
  metadata       Json?
  performedById  String
  createdAt      DateTime            @default(now())

  vehicle        Vehicle             @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  performedBy    User                @relation(fields: [performedById], references: [id])
}

// ─── Sales ────────────────────────────────────────────────────────────────────

model Sale {
  id              String      @id @default(cuid())
  dateSold        DateTime
  vehicleId       String      @unique
  buyerName       String
  buyerPhone      String
  buyerAddress    String
  witnessName     String
  sellingPrice    Decimal     @db.Decimal(15, 2)
  modeOfSale      ModeOfSale
  notes           String?
  isReversed      Boolean     @default(false)
  reversalReason  String?
  reversedAt      DateTime?
  reversedById    String?
  registeredById  String
  customerId      String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  vehicle         Vehicle     @relation(fields: [vehicleId], references: [id])
  registeredBy    User        @relation("SaleRegisteredBy", fields: [registeredById], references: [id])
  reversedBy      User?       @relation("SaleReversedBy", fields: [reversedById], references: [id])
  customer        Customer?   @relation(fields: [customerId], references: [id])
  receipt         Receipt?
}

// ─── Swaps ────────────────────────────────────────────────────────────────────

model Swap {
  id                   String          @id @default(cuid())
  dateOfSwap           DateTime
  outgoingVehicleId    String          @unique
  incomingVehicleId    String          @unique
  cashDifference       Decimal?        @db.Decimal(15, 2)
  cashDirection        CashDirection?
  modeOfSwap           ModeOfSwap
  witnessName          String
  notes                String?
  registeredById       String
  customerId           String?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  outgoingVehicle      Vehicle         @relation("OutgoingVehicle", fields: [outgoingVehicleId], references: [id])
  incomingVehicle      Vehicle         @relation("IncomingVehicle", fields: [incomingVehicleId], references: [id])
  registeredBy         User            @relation("SwapRegisteredBy", fields: [registeredById], references: [id])
  customer             Customer?       @relation(fields: [customerId], references: [id])
  receipt              Receipt?
}

// ─── Receipts ────────────────────────────────────────────────────────────────

model Receipt {
  id               String      @id @default(cuid())
  receiptNumber    String      @unique
  receiptYear      Int
  receiptSequence  Int
  receiptDate      DateTime
  type             ReceiptType
  saleId           String?     @unique
  swapId           String?     @unique
  accessorySaleId  String?     @unique
  isVoided         Boolean     @default(false)
  voidReason       String?
  voidedAt         DateTime?
  voidedById       String?
  issuedById       String
  createdAt        DateTime    @default(now())

  sale             Sale?           @relation(fields: [saleId], references: [id])
  swap             Swap?           @relation(fields: [swapId], references: [id])
  accessorySale    AccessorySale?  @relation(fields: [accessorySaleId], references: [id])
  issuedBy         User            @relation("IssuedBy", fields: [issuedById], references: [id])
  voidedBy         User?           @relation("VoidedBy", fields: [voidedById], references: [id])

  @@unique([receiptYear, receiptSequence])
}

model ReceiptSequence {
  id               String @id @default(cuid())
  year             Int    @unique
  currentSequence  Int    @default(0)
}

// ─── Accessories & Bikes ─────────────────────────────────────────────────────

model AccessoryItem {
  id                 String            @id @default(cuid())
  name               String
  category           AccessoryCategory
  description        String?
  quantityInStock    Int               @default(0)
  costPrice          Decimal?          @db.Decimal(15, 2)
  sellingPrice       Decimal           @db.Decimal(15, 2)
  lowStockThreshold  Int               @default(2)
  chassisNumber      String?
  engineNumber       String?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  photos             AccessoryPhoto[]
  saleItems          AccessorySaleItem[]
}

model AccessoryPhoto {
  id              String        @id @default(cuid())
  accessoryItemId String
  url             String
  filename        String
  createdAt       DateTime      @default(now())

  accessoryItem   AccessoryItem @relation(fields: [accessoryItemId], references: [id], onDelete: Cascade)
}

model AccessorySale {
  id              String    @id @default(cuid())
  dateSold        DateTime
  buyerName       String
  buyerPhone      String?
  paymentMode     PaymentMode
  totalAmount     Decimal   @db.Decimal(15, 2)
  registeredById  String
  customerId      String?
  createdAt       DateTime  @default(now())

  registeredBy    User      @relation(fields: [registeredById], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  items           AccessorySaleItem[]
  receipt         Receipt?
}

model AccessorySaleItem {
  id              String        @id @default(cuid())
  accessorySaleId String
  accessoryItemId String
  quantity        Int
  unitPrice       Decimal       @db.Decimal(15, 2)
  subtotal        Decimal       @db.Decimal(15, 2)

  accessorySale   AccessorySale @relation(fields: [accessorySaleId], references: [id], onDelete: Cascade)
  accessoryItem   AccessoryItem @relation(fields: [accessoryItemId], references: [id])
}

// ─── Customers ────────────────────────────────────────────────────────────────

model Customer {
  id              String    @id @default(cuid())
  name            String
  phone           String
  address         String?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  sales           Sale[]
  swaps           Swap[]
  accessorySales  AccessorySale[]
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

model AuditLog {
  id              String        @id @default(cuid())
  timestamp       DateTime      @default(now())
  userId          String
  userRole        UserRole
  category        AuditCategory
  action          String
  recordId        String?
  recordType      String?
  ipAddress       String
  deviceInfo      String
  beforeState     Json?
  afterState      Json?

  user            User          @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([category])
  @@index([timestamp])
}

// ─── Notifications ────────────────────────────────────────────────────────────

model Notification {
  id               String   @id @default(cuid())
  userId           String
  type             String
  title            String
  body             String
  isRead           Boolean  @default(false)
  relatedRecordId  String?
  relatedRecordType String?
  createdAt        DateTime @default(now())

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─── System Settings ─────────────────────────────────────────────────────────

model SystemSetting {
  id           String   @id @default(cuid())
  key          String   @unique
  value        String
  updatedById  String?
  updatedAt    DateTime @updatedAt
}
```

---

## 6. NestJS Backend Architecture

**Base URL:** `http://localhost:3001/api/v1`
**Swagger UI:** `http://localhost:3001/api/docs`

### Module Map

| Module | Route Prefix | Role Guard |
|---|---|---|
| `AuthModule` | `/auth` | Public |
| `UsersModule` | `/users` | SUPER_ADMIN only |
| `VehiclesModule` | `/vehicles` | Both roles |
| `SalesModule` | `/sales` | Both roles |
| `SwapsModule` | `/swaps` | Both roles |
| `ReceiptsModule` | `/receipts` | Both roles |
| `RevenueModule` | `/revenue` | SUPER_ADMIN only |
| `AccessoriesModule` | `/accessories` | Both roles |
| `CustomersModule` | `/customers` | Both roles |
| `AuditModule` | `/audit` | Both roles |
| `NotificationsModule` | `/notifications` | Both roles |
| `SettingsModule` | `/settings` | SUPER_ADMIN only |

### Request Pipeline

```
Request → JwtAuthGuard → RolesGuard → ValidationPipe → Controller → Service → AuditInterceptor → Response
```

- `JwtAuthGuard`: validates Bearer token from `Authorization` header; attaches `req.user`
- `RolesGuard`: reads `@Roles()` decorator; returns 403 if role mismatch
- `ValidationPipe`: `class-validator` on all DTOs; returns 400 with field-level errors
- `AuditInterceptor`: post-response hook; logs all POST/PATCH/DELETE operations to `AuditService`

### Auth Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/auth/login` | Email + password → generates OTP → sends via email |
| POST | `/auth/verify-otp` | Validates OTP → issues JWT access token + refresh cookie |
| POST | `/auth/refresh` | Rotates refresh token → new access token |
| POST | `/auth/logout` | Invalidates refresh token |

**OTP flow:**
1. On login success: generate 6-digit code, bcrypt-hash it, store in `OtpCode` with 10-minute expiry
2. Send plaintext code via Nodemailer (Mailhog in dev, Mailgun/SendGrid in prod)
3. On verify-otp: find latest unused, non-expired OTP for user; compare bcrypt; increment `attempts`; invalidate after 3 failures
4. Redis tracks resend rate-limit (key: `otp:resend:{userId}`, TTL: 60s) and failed login counter (key: `login:fails:{userId}`)
5. Account lock: after 5 consecutive failures, set `User.lockedUntil = now + 30min`; emit `AccountLockedEvent` → email + in-app notification to Super Admin

### OpenAPI Codegen

```
NestJS @ApiProperty decorators
  → swagger-cli bundle (apps/api/openapi.json)
  → openapi-typescript (packages/types/generated/api.ts)
  → imported by apps/web/lib/api-client.ts
```

Runs as part of `turbo build` — types are always fresh before the frontend compiles.

### File Uploads

- `multer` on photo endpoints; 5 MB limit; JPG/PNG only
- Files stored at `apps/api/uploads/{vehicleId}/` with UUID filenames
- Served at `/static/{path}` via `ServeStaticModule`
- v2 migration: swap `LocalStorageService` for `S3StorageService` behind a `StorageService` interface

---

## 7. Frontend Architecture

### Next.js App Router Structure

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── verify-otp/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Sidebar + Topbar shell
│   │   ├── page.tsx                ← Dashboard home
│   │   ├── vehicles/
│   │   │   ├── page.tsx            ← Inventory list with filters
│   │   │   ├── register/page.tsx
│   │   │   └── [id]/page.tsx       ← Vehicle detail + history timeline
│   │   ├── sales/
│   │   │   ├── page.tsx
│   │   │   └── register/page.tsx
│   │   ├── swaps/
│   │   │   ├── page.tsx
│   │   │   └── register/page.tsx
│   │   ├── receipts/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx       ← Receipt preview + download
│   │   ├── accessories/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── revenue/                ← Middleware: SUPER_ADMIN only
│   │   │   └── page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── audit/
│   │   │   └── page.tsx
│   │   └── settings/               ← Middleware: SUPER_ADMIN only
│   │       └── page.tsx
│   └── middleware.ts               ← JWT cookie check + role-based route guard
├── components/
│   ├── ui/                         ← Button, Input, Badge, Modal, Table, Pagination, Select
│   ├── layout/                     ← Sidebar, Topbar, NotificationBell, SessionTimeoutBanner
│   ├── vehicles/                   ← VehicleCard, VehicleHistoryTimeline, PhotoGallery
│   ├── receipts/                   ← ReceiptPreview (HTML), receipt PDF templates
│   └── charts/                     ← RevenueBarChart, CategoryPieChart (recharts)
├── lib/
│   ├── api-client.ts               ← Typed fetch wrapper (uses packages/types/generated/api.ts)
│   ├── auth.ts                     ← next-auth credentials + OTP flow
│   └── utils.ts                    ← formatNaira, formatDate (DD/MM/YYYY), formatPhone
├── stores/
│   ├── auth.store.ts               ← user, role, session timeout (25min warn → 30min logout)
│   ├── notifications.store.ts      ← unread count, notification list, polling
│   └── ui.store.ts                 ← sidebar open/close, active modal state
└── middleware.ts
```

### Route Access Control

`middleware.ts` reads the JWT from the `access_token` HttpOnly cookie:
- Unauthenticated → redirect to `/login`
- `/revenue` or `/settings` with Secretary role → redirect to `/` with 403 toast

Client-side Zustand `useAuthStore(s => s.role)` additionally hides revenue metric cards and purchase price fields in the UI — this is UX sugar only; enforcement is in middleware and backend guards.

### Session Timeout

`auth.store.ts` starts a timer on login:
- At 25 minutes of inactivity: show `SessionTimeoutBanner` ("Your session expires in 5 minutes")
- At 30 minutes: call `clearSession()` → redirect to `/login`
- Any API call resets the inactivity timer

---

## 8. Design System — Bold Automotive

### Colour Tokens

```css
--color-bg-base:        #0a0a0a;   /* page background */
--color-bg-surface:     #111111;   /* cards, panels */
--color-bg-elevated:    #1a1a1a;   /* modals, dropdowns */
--color-border:         #2a2a2a;   /* default borders */
--color-border-accent:  #ef4444;   /* active / focused */
--gradient-brand:       linear-gradient(135deg, #ef4444, #f97316);
--color-text-primary:   #ffffff;
--color-text-secondary: #9ca3af;
--color-text-muted:     #6b7280;
--color-success:        #10b981;   /* Available, positive delta */
--color-warning:        #f59e0b;   /* Low stock, warnings */
--color-danger:         #ef4444;   /* Errors, void, destructive */
--color-info:           #3b82f6;   /* Neutral info badges */
```

### Typography

- `Inter` (variable) — headings, nav, UI labels
- `JetBrains Mono` — chassis/VIN numbers, receipt IDs, engine numbers

### ZEXT Wordmark

```tsx
<span style={{
  fontWeight: 900,
  letterSpacing: '-0.05em',
  background: 'linear-gradient(135deg, #ef4444, #f97316)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}}>ZEXT</span>
```

### Status Badges

| Status | Background | Text | Border |
|---|---|---|---|
| AVAILABLE | `rgba(16,185,129,0.15)` | `#10b981` | `rgba(16,185,129,0.3)` |
| SOLD | `rgba(239,68,68,0.12)` | `#ef4444` | `rgba(239,68,68,0.25)` |
| SWAPPED | `rgba(59,130,246,0.12)` | `#60a5fa` | `rgba(59,130,246,0.25)` |
| ARCHIVED | `rgba(107,114,128,0.15)` | `#6b7280` | `rgba(107,114,128,0.25)` |
| TOKUNBO | `rgba(59,130,246,0.12)` | `#60a5fa` | `rgba(59,130,246,0.25)` |
| NG USED | `rgba(245,158,11,0.12)` | `#f59e0b` | `rgba(245,158,11,0.25)` |

### Dashboard Layout (approved mockup)

- Left sidebar: 220px, `#0d0d0d`, ZEXT wordmark, nav sections
- Topbar: 52px, `#0d0d0d`, global search, notification bell, "+ New Record" gradient CTA
- Content: scrollable, `#0a0a0a`, 24px padding
- Metric cards: 4-column grid, 2px gradient top border on hover
- Revenue panel: 2/3 width left, 1/3 monthly bar chart right (Admin only)
- Quick action row: ghost bordered buttons
- Recent tables: 2-column grid, sortable, 5 rows

---

## 9. Receipt System

### Receipt Number Format

`ZJV-{YEAR}-{SEQ4}` — e.g. `ZJV-2025-0042`

Generation is atomic via `ReceiptSequence` table:
```sql
-- Pseudo-code, executed in Prisma transaction
SELECT FOR UPDATE WHERE year = currentYear
UPDATE currentSequence = currentSequence + 1
INSERT Receipt with receiptNumber = 'ZJV-2025-{padded sequence}'
```

Sequence resets to 0001 at the start of each calendar year.

### Receipt Templates (Puppeteer server-side)

| Type | Template file | Key differentiator |
|---|---|---|
| NG Used Car | `ng-used.hbs` | Local-use disclaimer clause |
| Tokunbo Car | `tokunbo.hbs` | Foreign import acknowledgement clause |
| Swap Deal | `swap.hbs` | Both vehicle details + cash difference |
| Accessories / Bike | `accessories.hbs` | Line-item table with qty × unit price |

All templates include: ZEXT header (wordmark + address + phone), receipt number/date, VOID watermark (if voided), seller signature block.

**PDF endpoint:** `GET /receipts/:id/pdf` — Puppeteer renders template → returns `application/pdf`
**Frontend preview:** `ReceiptPreview` component renders the same HTML template in-page for review before download.

---

## 10. Revenue Module (Admin Only)

All revenue calculations are sourced exclusively from **confirmed, non-voided receipts**.

### Metrics

- Total Revenue (all time)
- Revenue This Month / This Year
- Revenue by Category: NG Used Cars | Tokunbo Cars | Swaps (cash top-up received) | Accessories | Bikes
- Number of Sales (filterable by period)
- Average Sale Value

### Exports

| Format | Content |
|---|---|
| PDF | Branded report with ZEXT header, charts, data tables, date range |
| Excel (.xlsx) | Raw transaction rows via ExcelJS |
| CSV | Flat export for external analysis |

---

## 11. Key Business Rules (Implementation Reference)

1. **Chassis uniqueness**: validated at API level before insert; duplicate returns 409 with existing record ID.
2. **Purchase price privacy**: `VehiclesService.serialize()` strips `purchasePrice` when `req.user.role === SECRETARY`; never included in any DTO returned to Secretary.
3. **Sale reversal**: sets `Vehicle.status = AVAILABLE`; does NOT delete the Sale record; requires `reversalReason`; audit-logged.
4. **Swap atomicity**: outgoing vehicle → SWAPPED + incoming vehicle → new AVAILABLE record, all in one Prisma `$transaction`.
5. **Stock decrement**: `AccessorySaleItem` creation triggers `AccessoryItem.quantityInStock -= quantity` in same transaction; low-stock check fires post-commit.
6. **Audit log immutability**: `AuditLog` table has no UPDATE or DELETE routes; no soft-delete; retained indefinitely.
7. **Voided receipts**: retain receipt number; render with VOID watermark; excluded from all revenue calculations.
8. **Low-stock alerts**: threshold stored in `SystemSetting` (key: `low_stock_cars_threshold`, default `3`); checked after every sale/swap.
9. **Concurrent session block**: on new login, previous refresh token is invalidated in Redis; old session receives 401 on next request.
10. **WAT timezone**: all timestamps stored in UTC in PostgreSQL; formatted as WAT (UTC+1) in all UI displays and exports.

---

## 12. Development Phases

### Phase 1 (Weeks 1–6) — Core System
AuthModule + UsersModule + VehiclesModule (registration + inventory list) + SalesModule + basic ReceiptsModule (NG Used + Tokunbo PDF) + AuditModule (core logging) + Super Admin & Secretary dashboards.

### Phase 2 (Weeks 7–10) — Financial & Inventory Features
VehicleHistory timeline + PhotoGallery + Low-stock alerts + SwapsModule + AccessoriesModule + RevenueModule (charts + exports) + CustomersModule + NotificationsModule (in-app + email).

### Phase 3 (Weeks 11–14) — Reporting, Audit & Polish
Audit log filters + export (PDF/CSV) + advanced inventory filters + Customer advanced search + SettingsModule (thresholds, OTP TTL, disclaimer text, notification toggles) + Receipt void workflow + security hardening + performance optimisation + UAT + production deployment.

---

*End of design specification.*
*Approved: 2026-06-04*
