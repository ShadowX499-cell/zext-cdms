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
