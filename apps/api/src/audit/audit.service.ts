import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditCategory, UserRole, Prisma } from '@prisma/client';

export interface LogEntry {
  userId: string;
  userRole: UserRole;
  category: AuditCategory;
  action: string;
  ipAddress: string;
  deviceInfo: string;
  recordId?: string;
  recordType?: string;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
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
