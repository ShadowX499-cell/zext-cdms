# CDMS Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the complete Turborepo monorepo for ZEXT CDMS — both apps running, Docker services up, full Prisma schema pushed to PostgreSQL, Swagger configured, OpenAPI codegen wired, and the Bold Automotive design system in place.

**Architecture:** Turborepo monorepo with `apps/api` (NestJS) and `apps/web` (Next.js 15) as workspaces, plus `packages/types` for the OpenAPI-generated client. PostgreSQL, Redis, and Mailhog run in Docker Compose; both app servers run natively for fast HMR.

**Tech Stack:** Node.js 20, Turborepo 2, NestJS 10, Next.js 15 (React 19), Tailwind CSS v4, Zustand v5, Prisma 5, PostgreSQL 15, Redis 7, Docker Compose, `@nestjs/swagger`, `openapi-typescript`, Inter + JetBrains Mono fonts.

**Project root:** `c:\Users\princ\Zext Joint Ventures` (this IS the monorepo root — do not create a subdirectory)

**This is Plan 1 of 4.** Plans 2–4 implement Phase 1–3 features on top of this foundation.

---

## File Map

```
c:\Users\princ\Zext Joint Ventures\
├── apps/
│   ├── api/                              # NestJS — scaffolded by @nestjs/cli
│   │   ├── prisma/
│   │   │   └── schema.prisma             # Full 16-model schema (Task 8)
│   │   ├── src/
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts      # Global PrismaModule (Task 10)
│   │   │   │   └── prisma.service.ts     # PrismaClient wrapper (Task 10)
│   │   │   ├── health/
│   │   │   │   └── health.controller.ts  # GET /api/v1/health (Task 10)
│   │   │   ├── app.module.ts             # Root module (Task 10)
│   │   │   └── main.ts                   # Bootstrap, Swagger, CORS, pipes (Task 10)
│   │   ├── test/
│   │   │   └── health.e2e-spec.ts        # Smoke test: health endpoint (Task 10)
│   │   ├── .env                          # Not committed (Task 7)
│   │   └── package.json                  # Modified after scaffold (Task 3)
│   └── web/                              # Next.js 15 — scaffolded by create-next-app
│       ├── app/
│       │   ├── globals.css               # Bold Automotive tokens (Task 13)
│       │   ├── layout.tsx                # Root layout: fonts + metadata (Task 13)
│       │   └── page.tsx                  # Placeholder home (Task 13)
│       ├── components/
│       │   └── layout/
│       │       └── Wordmark.tsx          # ZEXT gradient wordmark (Task 13)
│       ├── stores/
│       │   └── .gitkeep                  # Directory placeholder (Task 13)
│       ├── lib/
│       │   └── api-client.ts             # Typed fetch using generated types (Task 12)
│       ├── .env.local                    # Not committed (Task 7)
│       ├── next.config.ts                # Modified after scaffold (Task 5)
│       └── postcss.config.mjs            # Tailwind v4 (Task 5)
├── packages/
│   └── types/
│       ├── package.json                  # (Task 4)
│       ├── tsconfig.json                 # (Task 4)
│       ├── generated/
│       │   └── api.ts                    # Output of openapi-typescript (Task 12)
│       └── index.ts                      # Re-exports (Task 4)
├── docker/
│   ├── docker-compose.yml                # PostgreSQL + Redis + Mailhog (Task 6)
│   └── .env.docker                       # Docker service credentials (Task 6)
├── docs/
│   └── superpowers/
│       ├── specs/2026-06-04-cdms-design.md
│       └── plans/2026-06-04-cdms-foundation.md
├── scripts/
│   └── codegen.mjs                       # OpenAPI → packages/types/generated/api.ts (Task 12)
├── .gitignore                            # (Task 1)
├── .env.example                          # (Task 7)
├── turbo.json                            # (Task 2)
└── package.json                          # Workspace root (Task 1)
```

---

## Task 1: Git Init + Monorepo Root Package

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialise git**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git init
git config user.email "horiaku80@gmail.com"
git config user.name "ZEXT Dev"
```

Expected: `Initialized empty Git repository in .../Zext Joint Ventures/.git/`

- [ ] **Step 2: Create root `package.json`**

Write to `c:\Users\princ\Zext Joint Ventures\package.json`:

```json
{
  "name": "zext-cdms",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:push": "turbo db:push",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate",
    "db:studio": "npm run db:studio --workspace=apps/api",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down",
    "codegen": "node scripts/codegen.mjs"
  },
  "devDependencies": {
    "turbo": "^2.1.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

Write to `c:\Users\princ\Zext Joint Ventures\.gitignore`:

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
.next/
dist/
build/
.turbo/

# Environment files
.env
.env.local
.env.*.local
apps/api/.env
apps/web/.env.local

# Prisma
apps/api/prisma/migrations/.env

# Uploads
apps/api/uploads/

# OpenAPI generated
apps/api/openapi.json

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Superpowers brainstorm sessions (mockup files)
.superpowers/

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/
```

- [ ] **Step 4: Create required workspace directories**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps"
mkdir -p "c:/Users/princ/Zext Joint Ventures/packages"
mkdir -p "c:/Users/princ/Zext Joint Ventures/docker"
mkdir -p "c:/Users/princ/Zext Joint Ventures/scripts"
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add package.json .gitignore
git commit -m "chore: initialise monorepo root with npm workspaces"
```

---

## Task 2: Install Turborepo + Configure Pipelines

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Install Turborepo**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
npm install
```

Expected: `turbo` installed in root `node_modules`.

- [ ] **Step 2: Create `turbo.json`**

Write to `c:\Users\princ\Zext Joint Ventures\turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build", "db:generate", "codegen"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["db:generate"],
      "outputs": ["coverage/**"]
    },
    "db:generate": {
      "cache": false,
      "outputs": ["node_modules/.prisma/**", "node_modules/@prisma/client/**"]
    },
    "db:push": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    },
    "codegen": {
      "dependsOn": ["^build"],
      "cache": false,
      "outputs": ["../../packages/types/generated/**"]
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add turbo.json package-lock.json
git commit -m "chore: add turborepo with full pipeline config"
```

---

## Task 3: Scaffold NestJS API

**Files:**
- Create: `apps/api/` (full NestJS scaffold)
- Modify: `apps/api/package.json`

- [ ] **Step 1: Scaffold NestJS**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps"
npx @nestjs/cli@10 new api --package-manager npm --skip-git --strict
```

When prompted "Which package manager would you like to use?", choose `npm`. Expected: `apps/api/` created with full NestJS structure.

- [ ] **Step 2: Replace `apps/api/package.json` scripts block**

Read `apps/api/package.json`, then update only the `scripts` and `name` fields (keep all existing dependencies):

```json
{
  "name": "@zext/api",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "codegen": "node ../../scripts/codegen.mjs"
  }
}
```

- [ ] **Step 3: Install extra NestJS dependencies**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npm install @nestjs/config @nestjs/swagger swagger-ui-express class-validator class-transformer bcrypt @types/bcrypt
npm install --save-dev @types/multer
```

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/
git commit -m "chore: scaffold nestjs api app"
```

---

## Task 4: Scaffold Next.js Web App

**Files:**
- Create: `apps/web/` (full Next.js scaffold, then modify)

- [ ] **Step 1: Scaffold Next.js 15**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps"
npx create-next-app@latest web \
  --typescript \
  --no-tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --skip-install
```

(We skip built-in Tailwind to install v4 manually.)

- [ ] **Step 2: Update `apps/web/package.json` name and add dependencies**

Read the generated `apps/web/package.json`, then update `name` and add deps:

```json
{
  "name": "@zext/web",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "recharts": "^2.13.0",
    "@zext/types": "*"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

(Preserve all other generated fields.)

- [ ] **Step 3: Create `apps/web/postcss.config.mjs`** (replaces any generated postcss config)

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 4: Update `apps/web/next.config.ts`**

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/static/**',
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/web/
git commit -m "chore: scaffold next.js 15 web app"
```

---

## Task 5: Create `packages/types`

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/index.ts`
- Create: `packages/types/generated/` (directory, initially empty)

- [ ] **Step 1: Create `packages/types/package.json`**

Write to `c:\Users\princ\Zext Joint Ventures\packages\types\package.json`:

```json
{
  "name": "@zext/types",
  "version": "0.0.1",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./generated": "./generated/api.ts"
  }
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

Write to `c:\Users\princ\Zext Joint Ventures\packages\types\tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Create `packages/types/index.ts`**

Write to `c:\Users\princ\Zext Joint Ventures\packages\types\index.ts`:

```ts
// Re-export generated API types once codegen has run
// export * from './generated/api';

// Shared manual types
export type ApiError = {
  statusCode: number;
  message: string;
  error?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
```

- [ ] **Step 4: Create `packages/types/generated/.gitkeep`**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/packages/types/generated"
touch "c:/Users/princ/Zext Joint Ventures/packages/types/generated/.gitkeep"
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add packages/
git commit -m "chore: add packages/types workspace"
```

---

## Task 6: Docker Compose — PostgreSQL + Redis + Mailhog

**Files:**
- Create: `docker/docker-compose.yml`
- Create: `docker/.env.docker`

- [ ] **Step 1: Create `docker/docker-compose.yml`**

Write to `c:\Users\princ\Zext Joint Ventures\docker\docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: zext_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-zext_cdms}
      POSTGRES_USER: ${POSTGRES_USER:-zext}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-zext_dev_secret}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-zext} -d ${POSTGRES_DB:-zext_cdms}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: zext_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_dev_secret}
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis_dev_secret}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    container_name: zext_mailhog
    restart: unless-stopped
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
```

- [ ] **Step 2: Create `docker/.env.docker`**

Write to `c:\Users\princ\Zext Joint Ventures\docker\.env.docker`:

```
POSTGRES_DB=zext_cdms
POSTGRES_USER=zext
POSTGRES_PASSWORD=zext_dev_secret
REDIS_PASSWORD=redis_dev_secret
```

- [ ] **Step 3: Start Docker services and verify**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
docker compose -f docker/docker-compose.yml up -d
```

Wait 10 seconds, then:

```bash
docker compose -f docker/docker-compose.yml ps
```

Expected: `zext_postgres`, `zext_redis`, `zext_mailhog` all in `running (healthy)` state.

Verify Mailhog UI is accessible: open `http://localhost:8025` in browser.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add docker/
git commit -m "chore: add docker compose for postgres, redis, mailhog"
```

---

## Task 7: Environment Files

**Files:**
- Create: `.env.example`
- Create: `apps/api/.env` (not committed)
- Create: `apps/web/.env.local` (not committed)

- [ ] **Step 1: Create `.env.example`** (committed template)

Write to `c:\Users\princ\Zext Joint Ventures\.env.example`:

```
# ── API (apps/api/.env) ──────────────────────────────────────────
DATABASE_URL="postgresql://zext:zext_dev_secret@localhost:5432/zext_cdms"
REDIS_URL="redis://:redis_dev_secret@localhost:6379"

JWT_ACCESS_SECRET="change-me-access-secret-min-32-chars"
JWT_REFRESH_SECRET="change-me-refresh-secret-min-32-chars"
JWT_ACCESS_EXPIRY="30m"
JWT_REFRESH_EXPIRY="7d"

SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@zextjv.com"

OTP_EXPIRY_MINUTES=10
UPLOAD_DIR="./uploads"
FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV="development"

# ── Web (apps/web/.env.local) ────────────────────────────────────
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-nextauth-secret-min-32-chars"
```

- [ ] **Step 2: Create `apps/api/.env`** (not committed — copy from example)

Write to `c:\Users\princ\Zext Joint Ventures\apps\api\.env`:

```
DATABASE_URL="postgresql://zext:zext_dev_secret@localhost:5432/zext_cdms"
REDIS_URL="redis://:redis_dev_secret@localhost:6379"
JWT_ACCESS_SECRET="dev-access-secret-change-in-production-32ch"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production-32ch"
JWT_ACCESS_EXPIRY="30m"
JWT_REFRESH_EXPIRY="7d"
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@zextjv.com"
OTP_EXPIRY_MINUTES=10
UPLOAD_DIR="./uploads"
FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV="development"
```

- [ ] **Step 3: Create `apps/web/.env.local`** (not committed)

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret-change-in-production
```

- [ ] **Step 4: Commit only the example**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add .env.example
git commit -m "chore: add .env.example with all required vars"
```

---

## Task 8: Install Prisma + Write Full Schema

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Install Prisma in the API app**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` created with PostgreSQL datasource.

- [ ] **Step 2: Delete the generated placeholder schema and write the full one**

Write the complete file to `c:\Users\princ\Zext Joint Ventures\apps\api\prisma\schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

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
  id             String    @id @default(cuid())
  name           String
  email          String    @unique
  passwordHash   String
  role           UserRole  @default(SECRETARY)
  isActive       Boolean   @default(true)
  failedAttempts Int       @default(0)
  lockedUntil    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  otpCodes        OtpCode[]
  loginHistory    LoginHistory[]
  vehicles        Vehicle[]        @relation("RegisteredBy")
  sales           Sale[]           @relation("SaleRegisteredBy")
  salesReversed   Sale[]           @relation("SaleReversedBy")
  swaps           Swap[]           @relation("SwapRegisteredBy")
  receiptsIssued  Receipt[]        @relation("IssuedBy")
  receiptsVoided  Receipt[]        @relation("VoidedBy")
  vehicleHistory  VehicleHistory[]
  accessorySales  AccessorySale[]
  auditLogs       AuditLog[]
  notifications   Notification[]
}

model OtpCode {
  id        String   @id @default(cuid())
  userId    String
  codeHash  String
  expiresAt DateTime
  isUsed    Boolean  @default(false)
  attempts  Int      @default(0)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model LoginHistory {
  id         String       @id @default(cuid())
  userId     String
  ipAddress  String
  deviceInfo String
  outcome    LoginOutcome
  createdAt  DateTime     @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

model Vehicle {
  id             String          @id @default(cuid())
  dateBought     DateTime
  name           String
  category       VehicleCategory
  chassisNumber  String          @unique
  engineNumber   String
  plateNumber    String?
  colour         String
  ownerName      String
  modeOfPurchase ModeOfPurchase
  purchasePrice  Decimal?        @db.Decimal(15, 2)
  notes          String?
  status         VehicleStatus   @default(AVAILABLE)
  branchId       String?
  registeredById String
  coverPhotoId   String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  registeredBy User            @relation("RegisteredBy", fields: [registeredById], references: [id])
  photos       VehiclePhoto[]
  history      VehicleHistory[]
  sale         Sale?
  outgoingSwap Swap?            @relation("OutgoingVehicle")
  incomingSwap Swap?            @relation("IncomingVehicle")
}

model VehiclePhoto {
  id           String   @id @default(cuid())
  vehicleId    String
  url          String
  filename     String
  isCover      Boolean  @default(false)
  uploadedById String
  createdAt    DateTime @default(now())

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
}

model VehicleHistory {
  id            String              @id @default(cuid())
  vehicleId     String
  event         VehicleHistoryEvent
  description   String
  metadata      Json?
  performedById String
  createdAt     DateTime            @default(now())

  vehicle     Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  performedBy User    @relation(fields: [performedById], references: [id])
}

// ─── Sales ────────────────────────────────────────────────────────────────────

model Sale {
  id             String     @id @default(cuid())
  dateSold       DateTime
  vehicleId      String     @unique
  buyerName      String
  buyerPhone     String
  buyerAddress   String
  witnessName    String
  sellingPrice   Decimal    @db.Decimal(15, 2)
  modeOfSale     ModeOfSale
  notes          String?
  isReversed     Boolean    @default(false)
  reversalReason String?
  reversedAt     DateTime?
  reversedById   String?
  registeredById String
  customerId     String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  vehicle      Vehicle   @relation(fields: [vehicleId], references: [id])
  registeredBy User      @relation("SaleRegisteredBy", fields: [registeredById], references: [id])
  reversedBy   User?     @relation("SaleReversedBy", fields: [reversedById], references: [id])
  customer     Customer? @relation(fields: [customerId], references: [id])
  receipt      Receipt?
}

// ─── Swaps ────────────────────────────────────────────────────────────────────

model Swap {
  id                String         @id @default(cuid())
  dateOfSwap        DateTime
  outgoingVehicleId String         @unique
  incomingVehicleId String         @unique
  cashDifference    Decimal?       @db.Decimal(15, 2)
  cashDirection     CashDirection?
  modeOfSwap        ModeOfSwap
  witnessName       String
  notes             String?
  registeredById    String
  customerId        String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  outgoingVehicle Vehicle   @relation("OutgoingVehicle", fields: [outgoingVehicleId], references: [id])
  incomingVehicle Vehicle   @relation("IncomingVehicle", fields: [incomingVehicleId], references: [id])
  registeredBy    User      @relation("SwapRegisteredBy", fields: [registeredById], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  receipt         Receipt?
}

// ─── Receipts ─────────────────────────────────────────────────────────────────

model Receipt {
  id              String      @id @default(cuid())
  receiptNumber   String      @unique
  receiptYear     Int
  receiptSequence Int
  receiptDate     DateTime
  type            ReceiptType
  saleId          String?     @unique
  swapId          String?     @unique
  accessorySaleId String?     @unique
  isVoided        Boolean     @default(false)
  voidReason      String?
  voidedAt        DateTime?
  voidedById      String?
  issuedById      String
  createdAt       DateTime    @default(now())

  sale          Sale?          @relation(fields: [saleId], references: [id])
  swap          Swap?          @relation(fields: [swapId], references: [id])
  accessorySale AccessorySale? @relation(fields: [accessorySaleId], references: [id])
  issuedBy      User           @relation("IssuedBy", fields: [issuedById], references: [id])
  voidedBy      User?          @relation("VoidedBy", fields: [voidedById], references: [id])

  @@unique([receiptYear, receiptSequence])
}

model ReceiptSequence {
  id              String @id @default(cuid())
  year            Int    @unique
  currentSequence Int    @default(0)
}

// ─── Accessories & Bikes ──────────────────────────────────────────────────────

model AccessoryItem {
  id                String            @id @default(cuid())
  name              String
  category          AccessoryCategory
  description       String?
  quantityInStock   Int               @default(0)
  costPrice         Decimal?          @db.Decimal(15, 2)
  sellingPrice      Decimal           @db.Decimal(15, 2)
  lowStockThreshold Int               @default(2)
  chassisNumber     String?
  engineNumber      String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  photos    AccessoryPhoto[]
  saleItems AccessorySaleItem[]
}

model AccessoryPhoto {
  id              String        @id @default(cuid())
  accessoryItemId String
  url             String
  filename        String
  createdAt       DateTime      @default(now())

  accessoryItem AccessoryItem @relation(fields: [accessoryItemId], references: [id], onDelete: Cascade)
}

model AccessorySale {
  id             String      @id @default(cuid())
  dateSold       DateTime
  buyerName      String
  buyerPhone     String?
  paymentMode    PaymentMode
  totalAmount    Decimal     @db.Decimal(15, 2)
  registeredById String
  customerId     String?
  createdAt      DateTime    @default(now())

  registeredBy User              @relation(fields: [registeredById], references: [id])
  customer     Customer?         @relation(fields: [customerId], references: [id])
  items        AccessorySaleItem[]
  receipt      Receipt?
}

model AccessorySaleItem {
  id              String  @id @default(cuid())
  accessorySaleId String
  accessoryItemId String
  quantity        Int
  unitPrice       Decimal @db.Decimal(15, 2)
  subtotal        Decimal @db.Decimal(15, 2)

  accessorySale AccessorySale @relation(fields: [accessorySaleId], references: [id], onDelete: Cascade)
  accessoryItem AccessoryItem @relation(fields: [accessoryItemId], references: [id])
}

// ─── Customers ────────────────────────────────────────────────────────────────

model Customer {
  id        String    @id @default(cuid())
  name      String
  phone     String
  address   String?
  notes     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  sales          Sale[]
  swaps          Swap[]
  accessorySales AccessorySale[]
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

model AuditLog {
  id          String        @id @default(cuid())
  timestamp   DateTime      @default(now())
  userId      String
  userRole    UserRole
  category    AuditCategory
  action      String
  recordId    String?
  recordType  String?
  ipAddress   String
  deviceInfo  String
  beforeState Json?
  afterState  Json?

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([category])
  @@index([timestamp])
}

// ─── Notifications ────────────────────────────────────────────────────────────

model Notification {
  id                String   @id @default(cuid())
  userId            String
  type              String
  title             String
  body              String
  isRead            Boolean  @default(false)
  relatedRecordId   String?
  relatedRecordType String?
  createdAt         DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─── System Settings ──────────────────────────────────────────────────────────

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  updatedById String?
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/prisma/ apps/api/package.json apps/api/package-lock.json
git commit -m "feat: add full prisma schema (16 models, all enums)"
```

---

## Task 9: Push Schema + Generate Prisma Client

**Files:**
- No new files — this task validates the schema and generates the client

- [ ] **Step 1: Verify Docker services are running**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
docker compose -f docker/docker-compose.yml ps
```

Expected: `zext_postgres` status is `running (healthy)`. If not, run `npm run docker:up` and wait 15 seconds.

- [ ] **Step 2: Push schema to database**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx prisma db push
```

Expected output ends with:
```
🚀  Your database is now in sync with your Prisma schema. Done in Xs
```

If you see `Error: P1001` (connection refused), the Docker container is not ready — wait 10 seconds and retry.

- [ ] **Step 3: Generate Prisma client**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx prisma generate
```

Expected: `✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client`

- [ ] **Step 4: Verify schema in Prisma Studio (optional)**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx prisma studio
```

Open `http://localhost:5555`. You should see all 16 models in the left sidebar. Close with Ctrl+C.

- [ ] **Step 5: Commit lock file update**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/package-lock.json
git commit -m "chore: generate prisma client for full schema"
```

---

## Task 10: NestJS Core — PrismaService + AppModule + Health Endpoint

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Create: `apps/api/test/health.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e test first**

Write to `c:\Users\princ\Zext Joint Ventures\apps\api\test\health.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 with status ok', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('zext-cdms-api');
      });
  });
});
```

- [ ] **Step 2: Run the test — verify it FAILS**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest --testPathPattern=health.e2e-spec --config=test/jest-e2e.json
```

Expected: FAIL — `Cannot GET /api/v1/health` or route not found.

- [ ] **Step 3: Create `PrismaService`**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/api/src/prisma"
```

Write to `c:\Users\princ\Zext Joint Ventures\apps\api\src\prisma\prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

- [ ] **Step 4: Create `PrismaModule`**

Write to `c:\Users\princ\Zext Joint Ventures\apps\api\src\prisma\prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: Create `HealthController`**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/api/src/health"
```

Write to `c:\Users\princ\Zext Joint Ventures\apps\api\src\health\health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  check() {
    return {
      status: 'ok',
      service: 'zext-cdms-api',
      timestamp: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 6: Rewrite `AppModule`**

Write to `c:\Users\princ\Zext Joint Ventures\apps\api\src\app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 7: Rewrite `main.ts`**

Write to `c:\Users\princ\Zext Joint Ventures\apps\api\src\main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ZEXT CDMS API')
    .setDescription('Car Dealership Management System — ZEXT Joint Ventures Nig. Ltd')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`\n🚀 API:     http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs\n`);
}

bootstrap();
```

- [ ] **Step 8: Run the test — verify it PASSES**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest --testPathPattern=health.e2e-spec --config=test/jest-e2e.json
```

Expected: PASS — `GET /api/v1/health returns 200 with status ok`

- [ ] **Step 9: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/ apps/api/test/
git commit -m "feat: add prisma service, health endpoint, swagger bootstrap"
```

---

## Task 11: OpenAPI Codegen Pipeline

**Files:**
- Create: `scripts/codegen.mjs`
- Modify: `packages/types/index.ts` (uncomment generated export)

- [ ] **Step 1: Install `openapi-typescript` in root dev deps**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
npm install --save-dev openapi-typescript
```

- [ ] **Step 2: Create `scripts/codegen.mjs`**

Write to `c:\Users\princ\Zext Joint Ventures\scripts\codegen.mjs`:

```js
#!/usr/bin/env node
/**
 * Fetches the OpenAPI spec from the running NestJS server and generates
 * TypeScript types into packages/types/generated/api.ts
 *
 * Usage: node scripts/codegen.mjs
 * Requires: API server running on http://localhost:3001
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputDir = join(root, 'packages', 'types', 'generated');
const outputFile = join(outputDir, 'api.ts');

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

console.log('🔄 Fetching OpenAPI spec from http://localhost:3001/api/docs-json ...');

try {
  execSync(
    `npx openapi-typescript http://localhost:3001/api/docs-json --output "${outputFile}"`,
    { stdio: 'inherit', cwd: root },
  );
  console.log(`✅ Types generated → packages/types/generated/api.ts`);
} catch (err) {
  console.error('❌ Codegen failed. Is the API server running on :3001?');
  process.exit(1);
}
```

- [ ] **Step 3: Start the API server to test codegen**

In a separate terminal:
```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npm run dev
```

Wait for `🚀 API: http://localhost:3001/api/v1` in the output.

- [ ] **Step 4: Run codegen**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
node scripts/codegen.mjs
```

Expected: `✅ Types generated → packages/types/generated/api.ts`
Verify the file exists: `packages/types/generated/api.ts` should contain TypeScript interfaces.

- [ ] **Step 5: Update `packages/types/index.ts` to export generated types**

Write to `c:\Users\princ\Zext Joint Ventures\packages\types\index.ts`:

```ts
// Generated from NestJS OpenAPI spec — run `npm run codegen` to update
export * from './generated/api';

// Shared manual types
export type ApiError = {
  statusCode: number;
  message: string;
  error?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
```

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add scripts/ packages/types/index.ts package-lock.json
git commit -m "feat: add openapi codegen pipeline (scripts/codegen.mjs)"
```

---

## Task 12: Install All Web Dependencies + Tailwind v4

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Install all web dependencies from the monorepo root**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
npm install
```

Expected: all workspaces resolved, `@zext/types` linked from `packages/types`.

- [ ] **Step 2: Install Next.js fonts package**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/web"
npm install next/font
```

(This is included in Next.js — just verifying it's available.)

- [ ] **Step 3: Verify Tailwind v4 installed**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/web"
npx tailwindcss --version
```

Expected output: `4.x.x`. If it shows `3.x.x`, run:

```bash
npm uninstall tailwindcss postcss autoprefixer
npm install tailwindcss@^4.0.0 @tailwindcss/postcss@^4.0.0
```

---

## Task 13: Next.js Design System — Bold Automotive Tokens + Layout

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/components/layout/Wordmark.tsx`
- Create: `apps/web/stores/.gitkeep`
- Create: `apps/web/lib/utils.ts`

- [ ] **Step 1: Write `globals.css` with Bold Automotive design system**

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\app\globals.css`:

```css
@import "tailwindcss";

@theme {
  /* ── Colours ────────────────────────────────────────── */
  --color-bg-base: #0a0a0a;
  --color-bg-surface: #111111;
  --color-bg-elevated: #1a1a1a;
  --color-border: #2a2a2a;
  --color-border-accent: #ef4444;

  --color-text-primary: #ffffff;
  --color-text-secondary: #9ca3af;
  --color-text-muted: #6b7280;

  --color-brand-start: #ef4444;
  --color-brand-end: #f97316;

  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* ── Typography ─────────────────────────────────────── */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}

/* ── Base resets ─────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Brand gradient utilities ────────────────────────────── */
.gradient-text {
  background: linear-gradient(135deg, var(--color-brand-start), var(--color-brand-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-bg {
  background: linear-gradient(135deg, var(--color-brand-start), var(--color-brand-end));
}

/* ── Scrollbar ───────────────────────────────────────────── */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg-surface);
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #ef4444;
}
```

- [ ] **Step 2: Rewrite `app/layout.tsx` with Inter + JetBrains Mono fonts**

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\app\layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZEXT CDMS — Car Dealership Management System',
  description: 'Internal management system for ZEXT Joint Ventures Nig. Ltd',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create `Wordmark` component**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/web/components/layout"
```

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\components\layout\Wordmark.tsx`:

```tsx
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
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        ZEXT
      </span>
      <span
        className={`text-[var(--color-text-muted)] uppercase tracking-[0.15em] font-medium ${s.sub}`}
      >
        Joint Ventures · CDMS
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Replace placeholder `app/page.tsx`**

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\app\page.tsx`:

```tsx
import { Wordmark } from '@/components/layout/Wordmark';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--color-bg-base)' }}>
      <div className="text-center space-y-4">
        <Wordmark size="lg" />
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm">
          Car Dealership Management System — Foundation ready
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          <span style={{ color: 'var(--color-success)' }} className="text-xs font-medium">
            API connected · DB synced · Design system loaded
          </span>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create `lib/utils.ts`**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/web/lib"
```

Write to `c:\Users\princ\Zext Joint Ventures\apps\web\lib\utils.ts`:

```ts
/** Format a number as Nigerian Naira: ₦ 1,234,567 */
export function formatNaira(amount: number | string | null | undefined): string {
  if (amount == null) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₦ ${num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Format a date as DD/MM/YYYY (Nigerian convention) */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

/** Format a Nigerian phone number to +234 XX XXXX XXXX */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return `+${digits}`;
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`;
  return phone;
}

/** Truncate a string with ellipsis */
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : `${str.slice(0, maxLen)}…`;
}

/** Pad a number to N digits (for receipt sequence display) */
export function padSeq(seq: number, digits = 4): string {
  return String(seq).padStart(digits, '0');
}
```

- [ ] **Step 6: Create stores placeholder**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/web/stores"
touch "c:/Users/princ/Zext Joint Ventures/apps/web/stores/.gitkeep"
```

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/web/
git commit -m "feat: bold automotive design system, fonts, wordmark, utils"
```

---

## Task 14: Full Integration Verification

This task has no new files. It verifies everything works end-to-end.

- [ ] **Step 1: Start Docker services (if not running)**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
npm run docker:up
```

- [ ] **Step 2: Start both dev servers**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
turbo dev
```

Wait for both:
- `🚀 API: http://localhost:3001/api/v1` (NestJS ready)
- `▲ Next.js ... ready on http://localhost:3000` (Next.js ready)

- [ ] **Step 3: Verify API health**

```bash
curl http://localhost:3001/api/v1/health
```

Expected:
```json
{"status":"ok","service":"zext-cdms-api","timestamp":"2026-..."}
```

- [ ] **Step 4: Verify Swagger UI**

Open `http://localhost:3001/api/docs` in browser. Expected: Swagger UI loads showing "ZEXT CDMS API" with the Health endpoint listed.

- [ ] **Step 5: Verify Next.js design system**

Open `http://localhost:3000` in browser. Expected: black background, ZEXT gradient wordmark, green "API connected" status indicator.

- [ ] **Step 6: Verify Mailhog**

Open `http://localhost:8025`. Expected: Mailhog inbox UI.

- [ ] **Step 7: Run all API unit tests**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Final commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add -A
git commit -m "chore: foundation complete — monorepo, prisma, docker, design system verified"
```

---

## What's Next

**Plan 2 — Phase 1 Features** builds on this foundation:
- `AuthModule`: 2FA OTP login, JWT access/refresh tokens, session guards
- `VehiclesModule`: registration, inventory list, chassis uniqueness
- `SalesModule`: sale registration, buyer capture, reversal workflow
- `ReceiptsModule`: PDF generation (NG Used + Tokunbo), ZJV-YEAR-SEQ numbering
- `UsersModule`: user management (Admin only)
- Super Admin + Secretary dashboards (Next.js)

Run Plan 2 after this plan's final commit passes all verifications.
