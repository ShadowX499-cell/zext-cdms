import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SwapsService } from './swaps.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  VehicleStatus,
  VehicleCategory,
  ModeOfPurchase,
  ModeOfSwap,
  UserRole,
  ReceiptType,
  VehicleHistoryEvent,
} from '@prisma/client';

const makeVehicle = (id: string, status: VehicleStatus = VehicleStatus.AVAILABLE) => ({
  id, name: `Vehicle ${id}`, status, category: VehicleCategory.TOKUNBO,
  chassisNumber: `CH${id}`, engineNumber: `EN${id}`, colour: 'Black',
  ownerName: 'Owner', modeOfPurchase: ModeOfPurchase.OUTRIGHT,
  dateBought: new Date(), registeredById: 'user-1', notes: null,
  branchId: null, coverPhotoId: null, plateNumber: null, purchasePrice: null,
  createdAt: new Date(), updatedAt: new Date(),
});

const mockSwap = {
  id: 'sw-1', dateOfSwap: new Date(), outgoingVehicleId: 'v-out',
  incomingVehicleId: 'v-in', modeOfSwap: ModeOfSwap.DIRECT, witnessName: 'Wit',
  cashDifference: null, cashDirection: null, notes: null,
  registeredById: 'user-1', customerId: null, createdAt: new Date(), updatedAt: new Date(),
};

const mockReceipt = {
  id: 'r-1', receiptNumber: 'ZJV-2026-0002', receiptYear: 2026,
  receiptSequence: 2, receiptDate: new Date(), type: ReceiptType.SWAP_DEAL,
  saleId: null, swapId: 'sw-1', accessorySaleId: null,
  isVoided: false, issuedById: 'user-1', createdAt: new Date(),
  voidReason: null, voidedAt: null, voidedById: null,
};

const txMock = {
  swap: { create: jest.fn().mockResolvedValue(mockSwap) },
  vehicle: { update: jest.fn().mockResolvedValue({}) },
  vehicleHistory: { create: jest.fn().mockResolvedValue({}) },
  receiptSequence: { upsert: jest.fn().mockResolvedValue({ year: 2026, currentSequence: 2 }) },
  receipt: { create: jest.fn().mockResolvedValue(mockReceipt) },
};

const mockPrisma = {
  vehicle: { findUnique: jest.fn() },
  swap: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(txMock)),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockReceipts = { createForSaleInTx: jest.fn() };

const createDto = {
  dateOfSwap: '2026-06-06',
  outgoingVehicleId: 'v-out',
  incomingVehicleId: 'v-in',
  modeOfSwap: ModeOfSwap.DIRECT,
  witnessName: 'Chidi Obi',
};

describe('SwapsService', () => {
  let service: SwapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwapsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ReceiptsService, useValue: mockReceipts },
      ],
    }).compile();
    service = module.get<SwapsService>(SwapsService);
    jest.clearAllMocks();
    mockPrisma.vehicle.findUnique
      .mockResolvedValueOnce(makeVehicle('v-out'))
      .mockResolvedValueOnce(makeVehicle('v-in'));
    txMock.swap.create.mockResolvedValue(mockSwap);
    txMock.receipt.create.mockResolvedValue(mockReceipt);
    txMock.receiptSequence.upsert.mockResolvedValue({ year: 2026, currentSequence: 2 });
  });

  it('throws NotFoundException when outgoing vehicle not found', async () => {
    mockPrisma.vehicle.findUnique.mockReset().mockResolvedValue(null);
    await expect(service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test'))
      .rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when outgoing vehicle is not AVAILABLE', async () => {
    mockPrisma.vehicle.findUnique.mockReset()
      .mockResolvedValueOnce(makeVehicle('v-out', VehicleStatus.SOLD))
      .mockResolvedValueOnce(makeVehicle('v-in'));
    await expect(service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test'))
      .rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when same vehicle used as both outgoing and incoming', async () => {
    mockPrisma.vehicle.findUnique.mockReset()
      .mockResolvedValueOnce(makeVehicle('v-same'))
      .mockResolvedValueOnce(makeVehicle('v-same'));
    await expect(
      service.create({ ...createDto, outgoingVehicleId: 'v-same', incomingVehicleId: 'v-same' },
        'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test'),
    ).rejects.toThrow(ConflictException);
  });

  it('create runs transaction: updates both vehicles, logs history, creates receipt', async () => {
    const result = await service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test');

    expect(txMock.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: VehicleStatus.SWAPPED } }),
    );
    expect(txMock.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: VehicleStatus.AVAILABLE } }),
    );
    expect(txMock.vehicleHistory.create).toHaveBeenCalledTimes(2);
    expect(txMock.vehicleHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ event: VehicleHistoryEvent.SWAP_RECORDED }) }),
    );
    expect(txMock.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: ReceiptType.SWAP_DEAL }) }),
    );
    expect(result.receipt.receiptNumber).toBe('ZJV-2026-0002');
  });

  it('receipt number follows ZJV-YYYY-NNNN format', async () => {
    txMock.receiptSequence.upsert.mockResolvedValueOnce({ year: 2026, currentSequence: 99 });
    txMock.receipt.create.mockResolvedValueOnce({ ...mockReceipt, receiptNumber: 'ZJV-2026-0099' });
    const result = await service.create(createDto, 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test');
    expect(txMock.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ receiptNumber: 'ZJV-2026-0099' }) }),
    );
  });
});
