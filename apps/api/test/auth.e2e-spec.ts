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
