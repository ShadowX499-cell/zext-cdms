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
import type { StringValue } from 'ms';

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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
            ? { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) }
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

    if (user.failedAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    const resendKey = `otp:resend:${user.id}`;
    const rateLimited = await this.redis.exists(resendKey);
    if (rateLimited) {
      throw new ForbiddenException('OTP already sent. Wait 60 seconds to resend.');
    }

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

    await this.redis.set(resendKey, '1', 60);
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

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.role.toString(),
    );

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
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY', '30m') as StringValue,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY', '7d') as StringValue,
      }),
    ]);

    const refreshTtl = 7 * 24 * 60 * 60;
    await this.redis.set(`auth:refresh:${userId}`, refreshToken, refreshTtl);

    return { accessToken, refreshToken };
  }
}
