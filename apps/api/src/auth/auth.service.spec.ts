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
  passwordHash: '',
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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.verifyOtp('user-1', '123456', '127.0.0.1', 'Chrome'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
