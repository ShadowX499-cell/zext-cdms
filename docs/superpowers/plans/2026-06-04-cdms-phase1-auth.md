# CDMS Phase 1 — Authentication & User Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete 2FA authentication system (email OTP + JWT), user account management, role-based access control, and the Next.js login/OTP pages so a user can fully log in and access protected routes.

**Architecture:** NestJS Passport JWT strategy issues access tokens (30 min) and refresh tokens (7 days HttpOnly cookie). OTPs are bcrypt-hashed and stored in the `OtpCode` table. Redis tracks refresh token validity (concurrent session blocking) and OTP resend rate limits. A global `JwtAuthGuard` protects all routes; the `@Public()` decorator opts routes out. `RolesGuard` enforces SUPER_ADMIN restrictions.

**Tech Stack:** `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`, `ioredis`, `nodemailer`, `cookie-parser`, Prisma v7 (adapter-pg), Next.js 15, Zustand v5, Tailwind CSS v4.

**Builds on:** Plan 1 foundation — monorepo at `c:\Users\princ\Zext Joint Ventures`, NestJS at `apps/api`, Next.js at `apps/web`, Prisma v7 with `@prisma/adapter-pg` driver, postgres on port 5433.

**Deliverable:** A fully working login flow: navigate to `/login`, enter email+password, receive OTP in Mailhog, enter OTP, get redirected to `/` (dashboard placeholder). Protected routes redirect unauthenticated users to `/login`.

---

## File Map

```
apps/api/src/
├── common/
│   ├── common.module.ts                         # Task 3
│   ├── decorators/
│   │   ├── current-user.decorator.ts            # Task 3
│   │   ├── public.decorator.ts                  # Task 3
│   │   └── roles.decorator.ts                   # Task 3
│   └── guards/
│       ├── jwt-auth.guard.ts                    # Task 3
│       └── roles.guard.ts                       # Task 3
├── redis/
│   ├── redis.module.ts                          # Task 2
│   └── redis.service.ts                         # Task 2
├── email/
│   ├── email.module.ts                          # Task 4
│   └── email.service.ts                         # Task 4
├── audit/
│   ├── audit.module.ts                          # Task 5
│   ├── audit.service.ts                         # Task 5
│   └── audit.controller.ts                      # Task 5
├── auth/
│   ├── auth.module.ts                           # Task 7
│   ├── auth.controller.ts                       # Task 8
│   ├── auth.service.ts                          # Tasks 6-8
│   ├── strategies/
│   │   ├── jwt.strategy.ts                      # Task 6
│   │   └── jwt-refresh.strategy.ts              # Task 6
│   └── dto/
│       ├── login.dto.ts                         # Task 6
│       ├── verify-otp.dto.ts                    # Task 6
│       └── refresh.dto.ts                       # Task 6
└── users/
    ├── users.module.ts                          # Task 9
    ├── users.controller.ts                      # Task 9
    ├── users.service.ts                         # Task 9
    └── dto/
        ├── create-user.dto.ts                   # Task 9
        └── update-user.dto.ts                   # Task 9

apps/api/prisma/
└── seed.ts                                      # Task 10

apps/web/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                           # Task 13
│   │   ├── login/page.tsx                       # Task 13
│   │   └── verify-otp/page.tsx                  # Task 13
│   └── (dashboard)/
│       ├── layout.tsx                           # Task 14 (shell)
│       └── page.tsx                             # Task 14 (placeholder)
├── stores/
│   └── auth.store.ts                            # Task 12
├── lib/
│   └── api-client.ts                            # Task 11
├── components/
│   └── auth/
│       ├── LoginForm.tsx                        # Task 13
│       └── OtpForm.tsx                          # Task 13
└── middleware.ts                                # Task 14
```

---

## Task 1: Install Auth Dependencies

**Files:**
- Modify: `apps/api/package.json` (via npm install)

- [ ] **Step 1: Install runtime auth deps**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npm install @nestjs/passport @nestjs/jwt passport passport-jwt ioredis nodemailer cookie-parser
```

- [ ] **Step 2: Install dev type deps**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npm install --save-dev @types/passport-jwt @types/nodemailer @types/cookie-parser
```

- [ ] **Step 3: Verify all installed**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
node -e "require('@nestjs/jwt'); require('ioredis'); require('nodemailer'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/package.json apps/api/package-lock.json
git commit -m "chore: install auth, redis, email dependencies"
```

---

## Task 2: RedisModule + RedisService

**Files:**
- Create: `apps/api/src/redis/redis.service.ts`
- Create: `apps/api/src/redis/redis.module.ts`
- Create: `apps/api/src/redis/redis.service.spec.ts`

- [ ] **Step 1: Write the failing unit test**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\redis\redis.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [RedisService],
    }).compile();
    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  it('set and get a value', async () => {
    await service.set('test:key', 'hello');
    const val = await service.get('test:key');
    expect(val).toBe('hello');
    await service.del('test:key');
  });

  it('set with TTL — key expires', async () => {
    await service.set('test:ttl', 'bye', 1);
    await new Promise((r) => setTimeout(r, 1100));
    const val = await service.get('test:ttl');
    expect(val).toBeNull();
  });

  it('exists returns true / false', async () => {
    await service.set('test:exists', '1');
    expect(await service.exists('test:exists')).toBe(true);
    await service.del('test:exists');
    expect(await service.exists('test:exists')).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest redis.service.spec --forceExit 2>&1 | tail -10
```

Expected: FAIL — `RedisService` not found.

- [ ] **Step 3: Create `RedisService`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\redis\redis.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private config: ConfigService) {
    this.client = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      { lazyConnect: true },
    );
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) > 0;
  }
}
```

- [ ] **Step 4: Create `RedisModule`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\redis\redis.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

- [ ] **Step 5: Run — verify PASS** (requires Docker Redis on 6379)

```bash
cd "c:/Users/princ/Zext Joint Ventures"
docker compose -f docker/docker-compose.yml up -d redis
```

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest redis.service.spec --forceExit 2>&1 | tail -10
```

Expected: `Tests: 3 passed`

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/redis/
git commit -m "feat: add redis service with set/get/del/exists/ttl"
```

---

## Task 3: CommonModule — Guards, Decorators

**Files:**
- Create: `apps/api/src/common/decorators/public.decorator.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/guards/roles.guard.ts`
- Create: `apps/api/src/common/common.module.ts`

No unit tests for these — they are pure wrappers tested via e2e in later tasks.

- [ ] **Step 1: Create `public.decorator.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\common\decorators\public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: Create `roles.decorator.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\common\decorators\roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 3: Create `current-user.decorator.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\common\decorators\current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
```

- [ ] **Step 4: Create `jwt-auth.guard.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\common\guards\jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

- [ ] **Step 5: Create `roles.guard.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\common\guards\roles.guard.ts`:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
```

- [ ] **Step 6: Create `common.module.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\common\common.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class CommonModule {}
```

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/common/
git commit -m "feat: add common guards, decorators (JWT, Roles, Public, CurrentUser)"
```

---

## Task 4: EmailService

**Files:**
- Create: `apps/api/src/email/email.service.ts`
- Create: `apps/api/src/email/email.module.ts`
- Create: `apps/api/src/email/email.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\email\email.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [EmailService],
    }).compile();
    service = module.get<EmailService>(EmailService);
  });

  it('sendOtp does not throw (Mailhog must be running on :1025)', async () => {
    await expect(
      service.sendOtp('test@example.com', 'Test User', '123456'),
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest email.service.spec --forceExit 2>&1 | tail -8
```

Expected: FAIL — `EmailService` not found.

- [ ] **Step 3: Create `EmailService`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\email\email.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: false,
      auth:
        this.config.get('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASS'),
            }
          : undefined,
    });
  }

  async sendOtp(to: string, name: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@zextjv.com'),
      to,
      subject: 'ZEXT CDMS — Your Login Verification Code',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <h2 style="color:#111;margin-bottom:8px">Login Verification Code</h2>
          <p style="color:#555">Hi ${name},</p>
          <p style="color:#555">Your one-time login code for ZEXT CDMS is:</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:12px;padding:20px;
                      background:#f5f5f5;text-align:center;border-radius:8px;
                      color:#111;margin:20px 0">${otp}</div>
          <p style="color:#555">This code expires in <strong>10 minutes</strong>.
             Do not share it with anyone.</p>
          <p style="color:#888;font-size:12px">
            If you did not request this, contact your system administrator immediately.
          </p>
        </div>
      `,
    });
  }

  async sendAccountLocked(to: string, name: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@zextjv.com'),
      to,
      subject: 'ZEXT CDMS — Account Locked',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <h2 style="color:#dc2626">Account Temporarily Locked</h2>
          <p>Hi ${name},</p>
          <p>Your ZEXT CDMS account has been temporarily locked due to 5 consecutive
             failed login attempts.</p>
          <p>The account will automatically unlock after <strong>30 minutes</strong>.</p>
          <p>If this was not you, contact your system administrator immediately.</p>
        </div>
      `,
    });
  }
}
```

- [ ] **Step 4: Create `EmailModule`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\email\email.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 5: Start Mailhog and run test**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
docker compose -f docker/docker-compose.yml up -d mailhog
```

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest email.service.spec --forceExit 2>&1 | tail -8
```

Expected: `Tests: 1 passed`

Open `http://localhost:8025` to verify the test email arrived in Mailhog.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/email/
git commit -m "feat: add email service with OTP and account-locked templates"
```

---

## Task 5: AuditModule

**Files:**
- Create: `apps/api/src/audit/audit.service.ts`
- Create: `apps/api/src/audit/audit.module.ts`
- Create: `apps/api/src/audit/audit.controller.ts`
- Create: `apps/api/src/audit/audit.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\audit\audit.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditCategory, UserRole } from '@prisma/client';

const mockPrisma = {
  auditLog: {
    create: jest.fn().mockResolvedValue({ id: 'test-id' }),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('log() calls prisma.auditLog.create with correct shape', async () => {
    await service.log({
      userId: 'user-1',
      userRole: UserRole.SUPER_ADMIN,
      category: AuditCategory.AUTHENTICATION,
      action: 'Login success',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Chrome/120',
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        userRole: UserRole.SUPER_ADMIN,
        category: AuditCategory.AUTHENTICATION,
        action: 'Login success',
        ipAddress: '127.0.0.1',
        deviceInfo: 'Chrome/120',
      }),
    });
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest audit.service.spec --forceExit 2>&1 | tail -8
```

Expected: FAIL — `AuditService` not found.

- [ ] **Step 3: Create `AuditService`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\audit\audit.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditCategory, UserRole } from '@prisma/client';

export interface LogEntry {
  userId: string;
  userRole: UserRole;
  category: AuditCategory;
  action: string;
  ipAddress: string;
  deviceInfo: string;
  recordId?: string;
  recordType?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: LogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userRole: entry.userRole,
        category: entry.category,
        action: entry.action,
        ipAddress: entry.ipAddress,
        deviceInfo: entry.deviceInfo,
        recordId: entry.recordId,
        recordType: entry.recordType,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
      },
    });
  }

  async findAll(filters: {
    userId?: string;
    category?: AuditCategory;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.category && { category: filters.category }),
      ...(filters.fromDate || filters.toDate
        ? {
            timestamp: {
              ...(filters.fromDate && { gte: filters.fromDate }),
              ...(filters.toDate && { lte: filters.toDate }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
```

- [ ] **Step 4: Create `AuditController`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\audit\audit.controller.ts`:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditCategory } from '@prisma/client';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth('JWT')
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries (both roles)' })
  findAll(
    @Query('userId') userId?: string,
    @Query('category') category?: AuditCategory,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.audit.findAll({ userId, category, page: +page, limit: +limit });
  }
}
```

- [ ] **Step 5: Create `AuditModule`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\audit\audit.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Global()
@Module({
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
```

- [ ] **Step 6: Run test — verify PASS**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest audit.service.spec --forceExit 2>&1 | tail -8
```

Expected: `Tests: 1 passed`

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/audit/
git commit -m "feat: add audit service and controller"
```

---

## Task 6: Auth DTOs + JWT Strategies

**Files:**
- Create: `apps/api/src/auth/dto/login.dto.ts`
- Create: `apps/api/src/auth/dto/verify-otp.dto.ts`
- Create: `apps/api/src/auth/dto/refresh.dto.ts`
- Create: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/auth/strategies/jwt-refresh.strategy.ts`

- [ ] **Step 1: Create `login.dto.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\dto\login.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@zextjv.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssword123' })
  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 2: Create `verify-otp.dto.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\dto\verify-otp.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'clxyz123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
```

- [ ] **Step 3: Create `refresh.dto.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\dto\refresh.dto.ts`:

```typescript
export class TokensDto {
  accessToken: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}
```

- [ ] **Step 4: Create `jwt.strategy.ts`**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/api/src/auth/strategies"
```

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\strategies\jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 5: Create `jwt-refresh.strategy.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\strategies\jwt-refresh.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string; email: string; role: string }) {
    const refreshToken = req.cookies?.['refresh_token'] as string;
    return { id: payload.sub, email: payload.email, role: payload.role, refreshToken };
  }
}
```

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/auth/
git commit -m "feat: add auth DTOs, jwt strategy, jwt-refresh strategy"
```

---

## Task 7: AuthService — login + verifyOtp + refresh + logout (TDD)

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing unit tests**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@zextjv.com',
  passwordHash: '', // set in beforeAll
  role: UserRole.SUPER_ADMIN,
  isActive: true,
  failedAttempts: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue(mockUser),
  },
  otpCode: {
    create: jest.fn().mockResolvedValue({ id: 'otp-1' }),
    findFirst: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  loginHistory: {
    create: jest.fn().mockResolvedValue({}),
  },
};

const mockRedis = {
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
};

const mockEmail = {
  sendOtp: jest.fn().mockResolvedValue(undefined),
  sendAccountLocked: jest.fn().mockResolvedValue(undefined),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('P@ssword123', 10);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EmailService, useValue: mockEmail },
        { provide: AuditService, useValue: mockAudit },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock.token.here'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              const map: Record<string, unknown> = {
                JWT_ACCESS_SECRET: 'test-access-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_ACCESS_EXPIRY: '30m',
                JWT_REFRESH_EXPIRY: '7d',
                OTP_EXPIRY_MINUTES: '10',
              };
              return map[key] ?? def;
            },
          },
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe('initiateLogin', () => {
    it('returns userId and sends OTP when credentials are valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.initiateLogin(
        'admin@zextjv.com',
        'P@ssword123',
        '127.0.0.1',
        'TestBrowser',
      );

      expect(result.userId).toBe('user-1');
      expect(mockEmail.sendOtp).toHaveBeenCalledWith(
        'admin@zextjv.com',
        'Admin User',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('throws UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateLogin('nobody@x.com', 'pass', '127.0.0.1', 'Chrome'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.initiateLogin('admin@zextjv.com', 'WrongPass', '127.0.0.1', 'Chrome'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyOtp', () => {
    it('returns tokens when OTP is correct', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      mockPrisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        userId: 'user-1',
        codeHash,
        expiresAt: new Date(Date.now() + 60_000),
        isUsed: false,
        attempts: 0,
      });

      const result = await service.verifyOtp('user-1', '123456', '127.0.0.1', 'Chrome');

      expect(result.accessToken).toBe('mock.token.here');
      expect(mockPrisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isUsed: true } }),
      );
    });

    it('throws UnauthorizedException for wrong OTP', async () => {
      const codeHash = await bcrypt.hash('999999', 10);
      mockPrisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        userId: 'user-1',
        codeHash,
        expiresAt: new Date(Date.now() + 60_000),
        isUsed: false,
        attempts: 0,
      });

      await expect(
        service.verifyOtp('user-1', '000000', '127.0.0.1', 'Chrome'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired OTP', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      mockPrisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        userId: 'user-1',
        codeHash,
        expiresAt: new Date(Date.now() - 1000),
        isUsed: false,
        attempts: 0,
      });

      await expect(
        service.verifyOtp('user-1', '123456', '127.0.0.1', 'Chrome'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest auth.service.spec --forceExit 2>&1 | tail -10
```

Expected: FAIL — `AuthService` not found.

- [ ] **Step 3: Create `AuthService`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\auth.service.ts`:

```typescript
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { AuditCategory, LoginOutcome } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
const OTP_RETRY_LIMIT = 3;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private email: EmailService,
    private audit: AuditService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async initiateLogin(
    emailAddr: string,
    password: string,
    ipAddress: string,
    deviceInfo: string,
  ): Promise<{ userId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: emailAddr },
    });

    // Generic error to avoid user enumeration
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${remaining} minutes.`,
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const newFails = user.failedAttempts + 1;
      const shouldLock = newFails >= MAX_FAILED_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newFails,
          ...(shouldLock
            ? {
                lockedUntil: new Date(
                  Date.now() + LOCKOUT_MINUTES * 60 * 1000,
                ),
              }
            : {}),
        },
      });

      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          deviceInfo,
          outcome: shouldLock ? LoginOutcome.LOCKED : LoginOutcome.FAILED,
        },
      });

      if (shouldLock) {
        await this.email.sendAccountLocked(user.email, user.name);
      }

      await this.audit.log({
        userId: user.id,
        userRole: user.role,
        category: AuditCategory.AUTHENTICATION,
        action: shouldLock
          ? `Account locked after ${newFails} failed attempts`
          : `Failed login attempt (${newFails}/${MAX_FAILED_ATTEMPTS})`,
        ipAddress,
        deviceInfo,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Valid password — reset failed attempts if previously locked
    if (user.failedAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    // Check OTP resend rate limit
    const resendKey = `otp:resend:${user.id}`;
    const rateLimited = await this.redis.exists(resendKey);
    if (rateLimited) {
      throw new ForbiddenException('OTP already sent. Wait 60 seconds to resend.');
    }

    // Generate + hash OTP
    const otp = String(randomInt(100_000, 999_999));
    const codeHash = await bcrypt.hash(otp, 10);
    const expiryMinutes = this.config.get<number>('OTP_EXPIRY_MINUTES', 10);

    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      },
    });

    // Rate limit resend (60s)
    await this.redis.set(resendKey, '1', 60);

    // Send OTP email
    await this.email.sendOtp(user.email, user.name, otp);

    await this.audit.log({
      userId: user.id,
      userRole: user.role,
      category: AuditCategory.AUTHENTICATION,
      action: 'OTP sent after successful password verification',
      ipAddress,
      deviceInfo,
    });

    return { userId: user.id };
  }

  async verifyOtp(
    userId: string,
    otp: string,
    ipAddress: string,
    deviceInfo: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Invalid session');

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: { userId, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('No active OTP. Please login again.');
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP has expired. Please login again.');
    }

    if (otpRecord.attempts >= OTP_RETRY_LIMIT) {
      throw new UnauthorizedException(
        'Too many incorrect OTP attempts. Please login again.',
      );
    }

    const valid = await bcrypt.compare(otp, otpRecord.codeHash);

    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect OTP');
    }

    // Mark OTP used
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Issue tokens
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.role.toString(),
    );

    // Log login history
    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        deviceInfo,
        outcome: LoginOutcome.SUCCESS,
      },
    });

    await this.audit.log({
      userId: user.id,
      userRole: user.role,
      category: AuditCategory.AUTHENTICATION,
      action: 'Login successful via 2FA',
      ipAddress,
      deviceInfo,
    });

    return { ...tokens, name: user.name, email: user.email, role: user.role };
  }

  async refresh(userId: string, refreshToken: string) {
    const storedToken = await this.redis.get(`auth:refresh:${userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    return this.issueTokens(user.id, user.email, user.role.toString());
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(`auth:refresh:${userId}`);
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY', '30m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
      }),
    ]);

    // Store refresh token in Redis (invalidates any previous session)
    const refreshTtl = 7 * 24 * 60 * 60;
    await this.redis.set(`auth:refresh:${userId}`, refreshToken, refreshTtl);

    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest auth.service.spec --forceExit 2>&1 | tail -10
```

Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat: add auth service (initiateLogin, verifyOtp, refresh, logout)"
```

---

## Task 8: AuthController + AuthModule + Wire into AppModule

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts` (add cookie-parser)
- Create: `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write the e2e test (TDD)**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\test\auth.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);

    // Seed a test user
    const hash = await bcrypt.hash('P@ssword123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'e2e-auth@zextjv.com' },
      update: { passwordHash: hash, failedAttempts: 0, lockedUntil: null },
      create: {
        name: 'E2E Admin',
        email: 'e2e-auth@zextjv.com',
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => null);
    await app.close();
  });

  it('POST /api/v1/auth/login with valid credentials returns userId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e-auth@zextjv.com', password: 'P@ssword123' })
      .expect(201);

    expect(res.body.userId).toBe(testUserId);
    expect(res.body.message).toContain('OTP');
  });

  it('POST /api/v1/auth/login with wrong password returns 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e-auth@zextjv.com', password: 'WrongPassword' })
      .expect(401);
  });

  it('POST /api/v1/auth/login with invalid email format returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'P@ssword123' })
      .expect(400);
  });

  it('GET /api/v1/health is accessible without auth', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
  });

  it('GET /api/v1/audit returns 401 without JWT', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .expect(401);
  });
});
```

- [ ] **Step 2: Run — verify FAIL** (AuthController doesn't exist yet)

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest --testPathPattern=auth.e2e-spec --config=test/jest-e2e.json --forceExit 2>&1 | tail -15
```

Expected: compilation error or test failures.

- [ ] **Step 3: Create `AuthController`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\auth.controller.ts`:

```typescript
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Step 1: Validate credentials and send OTP' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';
    const result = await this.auth.initiateLogin(
      dto.email,
      dto.password,
      ipAddress,
      deviceInfo,
    );
    return {
      userId: result.userId,
      message: 'OTP sent to your registered email address',
    };
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Step 2: Verify OTP and receive access token' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';

    const result = await this.auth.verifyOtp(
      dto.userId,
      dto.otp,
      ipAddress,
      deviceInfo,
    );

    // Set refresh token as HttpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: result.accessToken,
      user: {
        id: dto.userId,
        name: result.name,
        email: result.email,
        role: result.role,
      },
    };
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  async refresh(
    @CurrentUser() user: { id: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(user.id, user.refreshToken);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invalidate refresh token and clear cookie' })
  async logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.id);
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }
}
```

- [ ] **Step 4: Create `AuthModule`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\auth\auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets passed per signAsync call
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 5: Update `AppModule` — add all new modules + global guards**

Rewrite `c:\Users\princ\Zext Joint Ventures\apps\api\src\app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    EmailModule,
    AuditModule,
    CommonModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Apply JwtAuthGuard globally — use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply RolesGuard globally — use @Roles() to restrict
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Add `@Public()` to `HealthController`** (required now that JwtAuthGuard is global)

Read `apps/api/src/health/health.controller.ts`, then add the `@Public()` import and decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
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

- [ ] **Step 7: Add `cookie-parser` to `main.ts`**

Read `apps/api/src/main.ts`, then add `import * as cookieParser from 'cookie-parser';` at the top and `app.use(cookieParser());` after `app.enableCors(...)`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
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

  app.use(cookieParser());

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

- [ ] **Step 7: Run e2e tests — verify PASS**

Make sure Docker services are running:
```bash
cd "c:/Users/princ/Zext Joint Ventures"
docker compose -f docker/docker-compose.yml up -d
```

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest --testPathPattern=auth.e2e-spec --config=test/jest-e2e.json --forceExit 2>&1 | tail -15
```

Expected: `Tests: 5 passed`

- [ ] **Step 8: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/ apps/api/test/auth.e2e-spec.ts
git commit -m "feat: auth controller, module, global JWT guard, cookie-parser"
```

---

## Task 9: UsersModule — CRUD (TDD)

**Files:**
- Create: `apps/api/src/users/dto/create-user.dto.ts`
- Create: `apps/api/src/users/dto/update-user.dto.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.service.spec.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.module.ts`

- [ ] **Step 1: Create DTOs**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\users\dto\create-user.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Adaeze Okonkwo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'secretary@zextjv.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssword123' })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Password must have uppercase, number, and special character',
  })
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.SECRETARY })
  @IsEnum(UserRole)
  role: UserRole;
}
```

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\users\dto\update-user.dto.ts`:

```typescript
import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({ description: 'New password — must meet complexity requirements' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
```

- [ ] **Step 2: Write failing unit test**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\users\users.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

const mockUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@zextjv.com',
  passwordHash: 'hash',
  role: UserRole.SUPER_ADMIN,
  isActive: true,
  failedAttempts: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findMany: jest.fn().mockResolvedValue([mockUser]),
    findUnique: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn().mockResolvedValue(mockUser),
    update: jest.fn().mockResolvedValue(mockUser),
    count: jest.fn().mockResolvedValue(1),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('findAll returns paginated users without passwordHash', async () => {
    const result = await service.findAll(1, 20);
    expect(result.data[0]).not.toHaveProperty('passwordHash');
  });

  it('findOne throws NotFoundException for unknown id', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
  });

  it('create throws ConflictException for duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser); // email taken
    await expect(
      service.create({
        name: 'Dupe',
        email: 'admin@zextjv.com',
        password: 'P@ss1234',
        role: UserRole.SECRETARY,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('create hashes password and never returns it', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null); // email free
    const result = await service.create({
      name: 'New User',
      email: 'new@zextjv.com',
      password: 'P@ss1234',
      role: UserRole.SECRETARY,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: expect.not.stringContaining('P@ss1234'),
        }),
      }),
    );
  });
});
```

- [ ] **Step 3: Run — verify FAIL**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest users.service.spec --forceExit 2>&1 | tail -8
```

Expected: FAIL — `UsersService` not found.

- [ ] **Step 4: Create `UsersService`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\users\users.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  failedAttempts: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        select: SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: SAFE_SELECT,
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null },
    });
    return { message: 'Password reset successfully' };
  }

  async unlock(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    return { message: 'Account unlocked' };
  }
}
```

- [ ] **Step 5: Create `UsersController`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\users\users.controller.ts`:

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Roles(UserRole.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (Admin only)' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.users.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(id, dto);
  }

  @Patch(':id/unlock')
  @ApiOperation({ summary: 'Unlock locked account (Admin only)' })
  unlock(@Param('id') id: string) {
    return this.users.unlock(id);
  }
}
```

- [ ] **Step 6: Create `UsersModule`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\src\users\users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 7: Run tests — verify PASS**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest users.service.spec --forceExit 2>&1 | tail -8
```

Expected: `Tests: 4 passed`

- [ ] **Step 8: Run all tests**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest --forceExit 2>&1 | tail -12
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/src/users/
git commit -m "feat: users module with CRUD, password reset, unlock (Admin only)"
```

---

## Task 10: Database Seed — First Super Admin User

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (add prisma.seed field)

- [ ] **Step 1: Create `prisma/seed.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\api\prisma\seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter } as Parameters<typeof PrismaClient>[0]);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@zextjv.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234';
  const name = process.env.SEED_ADMIN_NAME ?? 'ZEXT Administrator';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true, failedAttempts: 0, lockedUntil: null },
    create: {
      name,
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`\n✅ Super Admin seeded:`);
  console.log(`   ID:    ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Pass:  ${password}  ← CHANGE THIS IN PRODUCTION\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add prisma seed config to `apps/api/package.json`**

Read `apps/api/package.json`, then add this field (after the existing `"prisma"` key if it exists, or as a new top-level field):

```json
{
  "prisma": {
    "schema": "prisma/schema.prisma",
    "seed": "ts-node --project tsconfig.json -r tsconfig-paths/register prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run the seed**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx prisma db seed
```

Expected output:
```
✅ Super Admin seeded:
   ID:    clxxx...
   Email: admin@zextjv.com
   Pass:  Admin@1234  ← CHANGE THIS IN PRODUCTION
```

- [ ] **Step 4: Verify the user exists in DB**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx prisma studio &
```

Open `http://localhost:5555`, check the `User` table — `admin@zextjv.com` should be there with role `SUPER_ADMIN`.

Stop Prisma Studio: `pkill -f "prisma studio" 2>/dev/null || true`

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/api/prisma/seed.ts apps/api/package.json
git commit -m "feat: add prisma seed for first super admin user"
```

---

## Task 11: Frontend — `api-client.ts`

**Files:**
- Create: `apps/web/lib/api-client.ts`

This is a typed fetch wrapper. No unit tests — it's tested via the auth flow.

- [ ] **Step 1: Create `apps/web/lib/api-client.ts`**

Write `c:\Users\princ\Zext Joint Ventures\apps\web\lib\api-client.ts`:

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { message?: string; error?: string },
  ) {
    super(body.message ?? body.error ?? `HTTP ${status}`);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, token, signal } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include', // send refresh_token cookie automatically
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorBody);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ userId: string; message: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  verifyOtp: (userId: string, otp: string) =>
    apiRequest<{
      accessToken: string;
      user: { id: string; name: string; email: string; role: string };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: { userId, otp },
    }),

  refresh: () =>
    apiRequest<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),

  logout: (token: string) =>
    apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
      token,
    }),
};
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/web/lib/api-client.ts
git commit -m "feat: typed api client for Next.js frontend"
```

---

## Task 12: Frontend — Zustand Auth Store + Session Timer

**Files:**
- Create: `apps/web/stores/auth.store.ts`

- [ ] **Step 1: Create `apps/web/stores/auth.store.ts`**

Write `c:\Users\princ\Zext Joint Ventures\apps\web\stores\auth.store.ts`:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SECRETARY';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  pendingUserId: string | null;       // set after step-1 login, before OTP
  sessionTimer: ReturnType<typeof setTimeout> | null;
  warnTimer: ReturnType<typeof setTimeout> | null;
  showSessionWarning: boolean;

  setUser: (user: AuthUser, token: string) => void;
  setPendingUserId: (id: string | null) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  startSessionTimer: (onWarn: () => void, onExpire: () => void) => void;
  resetSessionTimer: (onWarn: () => void, onExpire: () => void) => void;
  dismissWarning: () => void;
}

const WARN_MS = 25 * 60 * 1000;   // 25 minutes
const EXPIRE_MS = 30 * 60 * 1000; // 30 minutes

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      pendingUserId: null,
      sessionTimer: null,
      warnTimer: null,
      showSessionWarning: false,

      setUser(user, token) {
        set({ user, accessToken: token, pendingUserId: null });
      },

      setPendingUserId(id) {
        set({ pendingUserId: id });
      },

      setAccessToken(token) {
        set({ accessToken: token });
      },

      clearSession() {
        const { sessionTimer, warnTimer } = get();
        if (sessionTimer) clearTimeout(sessionTimer);
        if (warnTimer) clearTimeout(warnTimer);
        set({
          user: null,
          accessToken: null,
          pendingUserId: null,
          sessionTimer: null,
          warnTimer: null,
          showSessionWarning: false,
        });
      },

      startSessionTimer(onWarn, onExpire) {
        const { sessionTimer, warnTimer } = get();
        if (sessionTimer) clearTimeout(sessionTimer);
        if (warnTimer) clearTimeout(warnTimer);

        const warn = setTimeout(() => {
          set({ showSessionWarning: true });
          onWarn();
        }, WARN_MS);

        const expire = setTimeout(() => {
          get().clearSession();
          onExpire();
        }, EXPIRE_MS);

        set({ warnTimer: warn, sessionTimer: expire, showSessionWarning: false });
      },

      resetSessionTimer(onWarn, onExpire) {
        get().startSessionTimer(onWarn, onExpire);
      },

      dismissWarning() {
        set({ showSessionWarning: false });
      },
    }),
    {
      name: 'zext-auth',
      storage: createJSONStorage(() => sessionStorage),
      // Don't persist timer IDs — they're runtime only
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        pendingUserId: s.pendingUserId,
      }),
    },
  ),
);

export const isAdmin = (state: AuthState) =>
  state.user?.role === 'SUPER_ADMIN';
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/web/stores/auth.store.ts
git commit -m "feat: zustand auth store with session timer (25min warn, 30min expire)"
```

---

## Task 13: Frontend — Login + OTP Pages

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/verify-otp/page.tsx`
- Create: `apps/web/components/auth/LoginForm.tsx`
- Create: `apps/web/components/auth/OtpForm.tsx`

- [ ] **Step 1: Create auth group layout**

Create `c:\Users\princ\Zext Joint Ventures\apps\web\app\(auth)\layout.tsx`:

```tsx
import { Wordmark } from '@/components/layout/Wordmark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div className="mb-10">
        <Wordmark size="lg" />
      </div>
      <div
        className="w-full max-w-md rounded-xl p-8"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `LoginForm` component**

```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/web/components/auth"
```

Create `c:\Users\princ\Zext Joint Ventures\apps\web\components\auth\LoginForm.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function LoginForm() {
  const router = useRouter();
  const setPendingUserId = useAuthStore((s) => s.setPendingUserId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await authApi.login(email, password);
        setPendingUserId(res.userId);
        router.push('/verify-otp');
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.status === 401
              ? 'Invalid email or password'
              : err.status === 403
              ? err.message
              : 'Something went wrong. Please try again.',
          );
        } else {
          setError('Cannot connect to server. Check your network.');
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Sign in
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Enter your credentials to receive a verification code
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@zextjv.com"
          className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border-accent)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border)')
          }
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border-accent)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border)')
          }
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="gradient-bg w-full rounded-lg py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
        style={{ cursor: isPending ? 'not-allowed' : 'pointer' }}
      >
        {isPending ? 'Sending OTP…' : 'Continue'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create login page**

Create `c:\Users\princ\Zext Joint Ventures\apps\web\app\(auth)\login\page.tsx`:

```tsx
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 4: Create `OtpForm` component**

Create `c:\Users\princ\Zext Joint Ventures\apps\web\components\auth\OtpForm.tsx`:

```tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function OtpForm() {
  const router = useRouter();
  const { pendingUserId, setUser, startSessionTimer } = useAuthStore((s) => ({
    pendingUserId: s.pendingUserId,
    setUser: s.setUser,
    startSessionTimer: s.startSessionTimer,
  }));
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!pendingUserId) router.replace('/login');
  }, [pendingUserId, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUserId) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await authApi.verifyOtp(pendingUserId, otp);
        setUser(
          { id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role as 'SUPER_ADMIN' | 'SECRETARY' },
          res.accessToken,
        );
        startSessionTimer(
          () => {}, // warn callback — session warning toast handled in dashboard layout
          () => router.replace('/login'),
        );
        router.replace('/');
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.status === 401
              ? err.message
              : 'Something went wrong. Please try again.',
          );
        } else {
          setError('Cannot connect to server. Check your network.');
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Enter verification code
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Check your email for a 6-digit code. It expires in 10 minutes.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          One-Time Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full rounded-lg px-4 py-4 text-center text-3xl font-mono font-bold outline-none tracking-[0.3em]"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border-accent)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border)')
          }
        />
      </div>

      <button
        type="submit"
        disabled={isPending || otp.length !== 6}
        className="gradient-bg w-full rounded-lg py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
        style={{ cursor: isPending || otp.length !== 6 ? 'not-allowed' : 'pointer' }}
      >
        {isPending ? 'Verifying…' : 'Verify & Sign In'}
      </button>

      <button
        type="button"
        onClick={() => router.replace('/login')}
        className="w-full text-center text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ← Back to login
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create verify-otp page**

Create `c:\Users\princ\Zext Joint Ventures\apps\web\app\(auth)\verify-otp\page.tsx`:

```tsx
import { OtpForm } from '@/components/auth/OtpForm';

export default function VerifyOtpPage() {
  return <OtpForm />;
}
```

- [ ] **Step 6: Build to verify TypeScript**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/web"
npx next build 2>&1 | tail -15
```

Expected: no TypeScript errors, successful build.

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/web/app/(auth)/ apps/web/components/auth/
git commit -m "feat: login and OTP pages with Bold Automotive design"
```

---

## Task 14: Frontend — Middleware + Dashboard Shell

**Files:**
- Create: `apps/web/middleware.ts`
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Modify: `apps/web/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `middleware.ts`**

Create `c:\Users\princ\Zext Joint Ventures\apps\web\middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/verify-otp'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth store in session storage (server-side: check cookie fallback)
  // The access token is stored in sessionStorage (client), so we use
  // a lightweight cookie set at login time for SSR route protection.
  const authCookie = req.cookies.get('zext-auth-check');
  if (!authCookie?.value) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
```

**Note:** The `zext-auth-check` cookie must be set on successful login. Update `OtpForm.tsx` to set this cookie after successful authentication. Add this line inside the `try` block in `OtpForm.tsx`, after `setUser(...)`:

In `apps/web/components/auth/OtpForm.tsx`, after the `setUser(...)` call, add:

```typescript
// Set a lightweight cookie for SSR middleware auth check
document.cookie = 'zext-auth-check=1; path=/; max-age=' + (30 * 60) + '; SameSite=Strict';
```

Also update `clearSession` in `auth.store.ts` to clear this cookie by adding to the `clearSession` function body:

```typescript
if (typeof document !== 'undefined') {
  document.cookie = 'zext-auth-check=; path=/; max-age=0; SameSite=Strict';
}
```

- [ ] **Step 2: Create dashboard group layout (shell)**

First, create the route group directory:
```bash
mkdir -p "c:/Users/princ/Zext Joint Ventures/apps/web/app/(dashboard)"
```

Create `c:\Users\princ\Zext Joint Ventures\apps\web\app\(dashboard)\layout.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Wordmark } from '@/components/layout/Wordmark';
import { authApi } from '@/lib/api-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, accessToken, clearSession, showSessionWarning, dismissWarning, startSessionTimer } =
    useAuthStore((s) => ({
      user: s.user,
      accessToken: s.accessToken,
      clearSession: s.clearSession,
      showSessionWarning: s.showSessionWarning,
      dismissWarning: s.dismissWarning,
      startSessionTimer: s.startSessionTimer,
    }));

  useEffect(() => {
    if (!user || !accessToken) {
      router.replace('/login');
    }
  }, [user, accessToken, router]);

  useEffect(() => {
    if (user && accessToken) {
      startSessionTimer(
        () => {}, // warn banner shown via showSessionWarning
        () => {
          clearSession();
          router.replace('/login');
        },
      );
    }
  }, [user, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    if (accessToken) {
      await authApi.logout(accessToken).catch(() => null);
    }
    clearSession();
    router.replace('/login');
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      {/* Session timeout warning banner */}
      {showSessionWarning && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 text-sm"
          style={{
            background: 'rgba(245,158,11,0.15)',
            borderBottom: '1px solid rgba(245,158,11,0.4)',
            color: '#f59e0b',
          }}
        >
          <span>⚠ Your session expires in 5 minutes due to inactivity.</span>
          <button
            onClick={dismissWarning}
            className="font-semibold"
            style={{ color: '#f59e0b' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className="w-[220px] flex flex-col flex-shrink-0"
        style={{
          background: '#0d0d0d',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Wordmark size="sm" />
        </div>

        {/* Nav placeholder — expanded in Plan 3 */}
        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/" label="Dashboard" icon="⊞" active />
          <NavItem href="/vehicles" label="Inventory" icon="🚗" />
          <NavItem href="/sales" label="Sales" icon="💰" />
          <NavItem href="/receipts" label="Receipts" icon="🧾" />
          {user.role === 'SUPER_ADMIN' && (
            <NavItem href="/revenue" label="Revenue" icon="📈" />
          )}
          <NavItem href="/audit" label="Audit Log" icon="🔍" />
        </nav>

        {/* User footer */}
        <div
          className="p-4 flex items-center gap-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white gradient-bg"
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Secretary'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-lg"
            style={{ color: 'var(--color-text-muted)' }}
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        background: active ? 'rgba(239,68,68,0.08)' : 'transparent',
        borderLeft: active ? '2px solid #ef4444' : '2px solid transparent',
        textDecoration: 'none',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  );
}
```

- [ ] **Step 3: Create dashboard home page**

Create/overwrite `c:\Users\princ\Zext Joint Ventures\apps\web\app\(dashboard)\page.tsx`:

```tsx
'use client';

import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm mt-1">
          Welcome back, {user?.name}
        </p>
      </div>

      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm">
          Dashboard metrics will be here in Plan 3 (Vehicles + Sales module).
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Remove the old root `app/page.tsx`** (replaced by dashboard group)

The old `apps/web/app/page.tsx` (foundation placeholder) should be deleted since the dashboard now lives at `app/(dashboard)/page.tsx`.

```bash
rm "c:/Users/princ/Zext Joint Ventures/apps/web/app/page.tsx" 2>/dev/null || true
```

- [ ] **Step 5: Build to verify no TypeScript errors**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/web"
npx next build 2>&1 | tail -15
```

Expected: successful build, no type errors.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
git add apps/web/
git commit -m "feat: middleware, dashboard shell with sidebar nav and session warning"
```

---

## Task 15: End-to-End Smoke Test — Full Login Flow

No new files. Verify the complete login flow works manually.

- [ ] **Step 1: Ensure all Docker services are running**

```bash
cd "c:/Users/princ/Zext Joint Ventures"
docker compose -f docker/docker-compose.yml up -d
```

- [ ] **Step 2: Start the API**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npm run dev &
```

Wait for `🚀 API: http://localhost:3001/api/v1`

- [ ] **Step 3: Start Next.js dev server**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/web"
npm run dev &
```

Wait for `▲ Next.js ... ready on http://localhost:3000`

- [ ] **Step 4: Manual smoke test**

1. Open `http://localhost:3000` → should redirect to `/login`
2. Enter `admin@zextjv.com` / `Admin@1234` → click Continue
3. Open `http://localhost:8025` (Mailhog) → find the OTP email → copy the 6-digit code
4. Enter the OTP on the verify-otp page → click Verify & Sign In
5. Should redirect to `/` showing the dashboard with the ZEXT sidebar
6. Check browser console — no errors
7. Click the logout button → should redirect to `/login`

- [ ] **Step 5: Run all backend tests**

```bash
cd "c:/Users/princ/Zext Joint Ventures/apps/api"
npx jest --forceExit 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 6: Final commit**

```bash
pkill -f "nest start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
cd "c:/Users/princ/Zext Joint Ventures"
git add -A
git commit -m "chore: phase 1 auth complete — 2FA login, JWT, users, dashboard shell"
```

---

## What's Next

**Plan 3 — Phase 1 Core Features** builds on this:
- `VehiclesModule` — register vehicles, inventory list with filters, chassis uniqueness, vehicle history, photo upload
- `SalesModule` — register sales, reversal workflow, customer auto-capture
- `ReceiptsModule` — PDF generation (Puppeteer), ZJV-YEAR-SEQ numbering, void workflow
- `CustomersModule` — auto-built from sale/swap records
- Next.js pages: Vehicle inventory, Register vehicle, Register sale, Issue receipt
- Super Admin + Secretary dashboards with real metric cards
