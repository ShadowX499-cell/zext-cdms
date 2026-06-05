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

const safeUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@zextjv.com',
  role: UserRole.SUPER_ADMIN,
  isActive: true,
  failedAttempts: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findMany: jest.fn().mockResolvedValue([safeUser]),
    findUnique: jest.fn().mockResolvedValue(safeUser),
    create: jest.fn().mockResolvedValue(safeUser),
    update: jest.fn().mockResolvedValue(safeUser),
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
    expect(result.total).toBe(1);
  });

  it('findOne throws NotFoundException for unknown id', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
  });

  it('create throws ConflictException for duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
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
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
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
