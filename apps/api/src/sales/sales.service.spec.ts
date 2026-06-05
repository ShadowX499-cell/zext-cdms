import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  VehicleStatus,
  VehicleCategory,
  ModeOfSale,
  ModeOfPurchase,
  UserRole,
  ReceiptType,
  VehicleHistoryEvent,
} from '@prisma/client';

const mockVehicle = {
  id: 'v-1', name: 'Toyota Camry', status: VehicleStatus.AVAILABLE,
  category: VehicleCategory.TOKUNBO, chassisNumber: 'ABC123',
  engineNumber: 'ENG123', colour: 'Silver', ownerName: 'Owner',
  modeOfPurchase: ModeOfPurchase.OUTRIGHT, dateBought: new Date(),
  registeredById: 'user-1', createdAt: new Date(), updatedAt: new Date(),
  plateNumber: null, purchasePrice: null, branchId: null, coverPhotoId: null, notes: null,
};

const mockSale = {
  id: 's-1', vehicleId: 'v-1', buyerName: 'Emeka', buyerPhone: '080', buyerAddress: 'Abuja',
  witnessName: 'Chidi', sellingPrice: '4500000', modeOfSale: ModeOfSale.OUTRIGHT,
  dateSold: new Date(), registeredById: 'user-1', isReversed: false,
  reversalReason: null, reversedAt: null, reversedById: null, customerId: null,
  notes: null, createdAt: new Date(), updatedAt: new Date(),
  vehicle: mockVehicle,
};

const mockReceipt = {
  id: 'r-1', receiptNumber: 'ZJV-2026-0001', receiptYear: 2026, receiptSequence: 1,
  receiptDate: new Date(), type: ReceiptType.TOKUNBO_CAR, saleId: 's-1',
  isVoided: false, issuedById: 'user-1', createdAt: new Date(),
  swapId: null, accessorySaleId: null, voidReason: null, voidedAt: null, voidedById: null,
};

const txMock = {
  sale: { create: jest.fn().mockResolvedValue(mockSale), update: jest.fn().mockResolvedValue(mockSale) },
  vehicle: { update: jest.fn().mockResolvedValue(mockVehicle) },
  vehicleHistory: { create: jest.fn().mockResolvedValue({}) },
};

const mockPrisma = {
  vehicle: { findUnique: jest.fn().mockResolvedValue(mockVehicle) },
  sale: {
    create: jest.fn().mockResolvedValue(mockSale),
    findMany: jest.fn().mockResolvedValue([mockSale]),
    count: jest.fn().mockResolvedValue(1),
    findUnique: jest.fn().mockResolvedValue({ ...mockSale, vehicle: mockVehicle, receipt: mockReceipt }),
    update: jest.fn().mockResolvedValue(mockSale),
  },
  vehicleHistory: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn((fn) => fn(txMock)),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockReceipts = { createForSaleInTx: jest.fn().mockResolvedValue(mockReceipt) };

const createDto = {
  dateSold: '2026-06-05',
  vehicleId: 'v-1',
  buyerName: 'Emeka Okafor',
  buyerPhone: '08012345678',
  buyerAddress: '12 Abuja Crescent',
  witnessName: 'Chidi Obi',
  sellingPrice: '4500000.00',
  modeOfSale: ModeOfSale.OUTRIGHT,
};

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ReceiptsService, useValue: mockReceipts },
      ],
    }).compile();
    service = module.get<SalesService>(SalesService);
    jest.clearAllMocks();
    mockPrisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
    txMock.sale.create.mockResolvedValue(mockSale);
    mockReceipts.createForSaleInTx.mockResolvedValue(mockReceipt);
  });

  it('create throws NotFoundException when vehicle not found', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test')).rejects.toThrow(NotFoundException);
  });

  it('create throws ConflictException when vehicle not AVAILABLE', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValueOnce({ ...mockVehicle, status: VehicleStatus.SOLD });
    await expect(service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test')).rejects.toThrow(ConflictException);
  });

  it('create runs transaction, updates vehicle to SOLD, creates receipt', async () => {
    const result = await service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test');
    expect(txMock.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: VehicleStatus.SOLD } }),
    );
    expect(mockReceipts.createForSaleInTx).toHaveBeenCalledWith('s-1', VehicleCategory.TOKUNBO, 'user-1', txMock);
    expect(result.receipt.receiptNumber).toBe('ZJV-2026-0001');
  });

  it('create logs vehicle history event SALE_RECORDED', async () => {
    await service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test');
    expect(txMock.vehicleHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ event: VehicleHistoryEvent.SALE_RECORDED }) }),
    );
  });

  it('reverse throws ForbiddenException for Secretary', async () => {
    await expect(
      service.reverse('s-1', { reversalReason: 'test reason here' }, 'user-1', UserRole.SECRETARY, '127.0.0.1', 'Test'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('reverse throws ConflictException when already reversed', async () => {
    mockPrisma.sale.findUnique.mockResolvedValueOnce({ ...mockSale, vehicle: mockVehicle, receipt: mockReceipt, isReversed: true });
    await expect(
      service.reverse('s-1', { reversalReason: 'test reason here' }, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test'),
    ).rejects.toThrow(ConflictException);
  });
});
