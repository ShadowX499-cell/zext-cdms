import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  VehicleCategory,
  VehicleStatus,
  ModeOfPurchase,
  UserRole,
  VehicleHistoryEvent,
} from '@prisma/client';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'test.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('fake-content'),
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
};

const mockVehicle = {
  id: 'v-1',
  name: 'Toyota Camry 2019',
  category: VehicleCategory.TOKUNBO,
  chassisNumber: 'JTDBF3EK9A3012345',
  engineNumber: '1AR123',
  plateNumber: null,
  colour: 'Silver',
  ownerName: 'Emeka',
  modeOfPurchase: ModeOfPurchase.OUTRIGHT,
  purchasePrice: '3500000.00',
  status: VehicleStatus.AVAILABLE,
  dateBought: new Date(),
  notes: null,
  branchId: null,
  registeredById: 'user-1',
  coverPhotoId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const txMock = {
  vehicle: { create: jest.fn().mockResolvedValue(mockVehicle), update: jest.fn().mockResolvedValue(mockVehicle) },
  vehicleHistory: { create: jest.fn().mockResolvedValue({}) },
};

const mockPrisma = {
  vehicle: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([mockVehicle]),
    count: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(mockVehicle),
  },
  vehiclePhoto: {
    updateMany: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: 'photo-1' }),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  vehicleDocument: {
    create: jest.fn().mockResolvedValue({
      id: 'doc-1',
      vehicleId: 'v-1',
      url: '/static/v-1/docs/abc.pdf',
      filename: 'abc.pdf',
      originalName: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      uploadedById: 'user-1',
      createdAt: new Date(),
    }),
    findFirst: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
  },
  vehicleHistory: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn((fn) => fn(txMock)),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('VehiclesService', () => {
  let service: VehiclesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get<VehiclesService>(VehiclesService);
    jest.clearAllMocks();
    txMock.vehicle.create.mockResolvedValue(mockVehicle);
  });

  it('findAll strips purchasePrice for Secretary', async () => {
    const result = await service.findAll({ role: UserRole.SECRETARY });
    expect(result.data[0]).not.toHaveProperty('purchasePrice');
  });

  it('findAll includes purchasePrice for Admin', async () => {
    const result = await service.findAll({ role: UserRole.SUPER_ADMIN });
    expect(result.data[0]).toHaveProperty('purchasePrice');
  });

  it('findOne throws NotFoundException for unknown id', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
  });

  it('create throws ConflictException for duplicate chassis', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValueOnce(mockVehicle);
    await expect(
      service.create(
        {
          dateBought: '2024-01-01',
          name: 'Test',
          category: VehicleCategory.TOKUNBO,
          chassisNumber: 'JTDBF3EK9A3012345',
          engineNumber: 'ENG123',
          colour: 'Red',
          ownerName: 'Owner',
          modeOfPurchase: ModeOfPurchase.OUTRIGHT,
        },
        'user-1',
        UserRole.SUPER_ADMIN,
        '127.0.0.1',
        'Test',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('create succeeds and logs vehicle history', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValueOnce(null);
    await service.create(
      {
        dateBought: '2024-01-01',
        name: 'Toyota Camry',
        category: VehicleCategory.TOKUNBO,
        chassisNumber: 'NEW123',
        engineNumber: 'ENG456',
        colour: 'Blue',
        ownerName: 'Test Owner',
        modeOfPurchase: ModeOfPurchase.OUTRIGHT,
      },
      'user-1',
      UserRole.SUPER_ADMIN,
      '127.0.0.1',
      'Test',
    );
    expect(txMock.vehicleHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: VehicleHistoryEvent.REGISTERED }),
      }),
    );
  });

  describe('addDocument', () => {
    it('throws NotFoundException when vehicle not found', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValueOnce(null);
      await expect(service.addDocument('missing', mockFile, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('creates a VehicleDocument record and returns it', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValueOnce(mockVehicle);
      const result = await service.addDocument('v-1', mockFile, 'user-1');
      expect(result.id).toBe('doc-1');
      expect(mockPrisma.vehicleDocument.create).toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('throws NotFoundException when document not found', async () => {
      mockPrisma.vehicleDocument.findFirst.mockResolvedValueOnce(null);
      await expect(service.deleteDocument('doc-missing', 'v-1')).rejects.toThrow(NotFoundException);
    });

    it('deletes the document record and returns message', async () => {
      mockPrisma.vehicleDocument.findFirst.mockResolvedValueOnce({
        id: 'doc-1', vehicleId: 'v-1', filename: 'abc.pdf',
      });
      const result = await service.deleteDocument('doc-1', 'v-1');
      expect(result).toEqual({ message: 'Document deleted' });
      expect(mockPrisma.vehicleDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });
});
