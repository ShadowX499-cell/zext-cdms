import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VehicleCategory, ReceiptType, UserRole } from '@prisma/client';

const mockReceipt = {
  id: 'r-1',
  receiptNumber: 'ZJV-2026-0001',
  receiptYear: 2026,
  receiptSequence: 1,
  receiptDate: new Date(),
  type: ReceiptType.NG_USED_CAR,
  saleId: 's-1',
  swapId: null,
  accessorySaleId: null,
  isVoided: false,
  voidReason: null,
  voidedAt: null,
  voidedById: null,
  issuedById: 'user-1',
  createdAt: new Date(),
};

const txMock = {
  receiptSequence: {
    upsert: jest.fn().mockResolvedValue({ year: 2026, currentSequence: 1 }),
  },
  receipt: {
    create: jest.fn().mockResolvedValue(mockReceipt),
  },
};

const mockPrisma = {
  receipt: {
    findUnique: jest.fn().mockResolvedValue({ ...mockReceipt, issuedBy: { name: 'Admin' }, voidedBy: null, sale: null }),
    findMany: jest.fn().mockResolvedValue([mockReceipt]),
    count: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue({ ...mockReceipt, isVoided: true }),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('ReceiptsService', () => {
  let service: ReceiptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get<ReceiptsService>(ReceiptsService);
    jest.clearAllMocks();
    txMock.receiptSequence.upsert.mockResolvedValue({ year: 2026, currentSequence: 1 });
    txMock.receipt.create.mockResolvedValue(mockReceipt);
  });

  it('vehicleCategoryToReceiptType maps correctly', () => {
    expect(ReceiptsService.vehicleCategoryToReceiptType(VehicleCategory.NG_USED)).toBe(ReceiptType.NG_USED_CAR);
    expect(ReceiptsService.vehicleCategoryToReceiptType(VehicleCategory.TOKUNBO)).toBe(ReceiptType.TOKUNBO_CAR);
    expect(ReceiptsService.vehicleCategoryToReceiptType(VehicleCategory.SCOOTER_BIKE)).toBe(ReceiptType.ACCESSORIES_BIKE);
  });

  it('createForSaleInTx upserts sequence and creates receipt', async () => {
    const receipt = await service.createForSaleInTx('sale-1', VehicleCategory.NG_USED, 'user-1', txMock as any);
    expect(txMock.receiptSequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { year: expect.any(Number) } }),
    );
    expect(txMock.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiptNumber: expect.stringMatching(/^ZJV-\d{4}-\d{4}$/),
          saleId: 'sale-1',
          type: ReceiptType.NG_USED_CAR,
        }),
      }),
    );
    expect(receipt.receiptNumber).toBe('ZJV-2026-0001');
  });

  it('createForSaleInTx generates ZJV-YYYY-NNNN format', async () => {
    txMock.receiptSequence.upsert.mockResolvedValueOnce({ year: 2026, currentSequence: 42 });
    txMock.receipt.create.mockResolvedValueOnce({ ...mockReceipt, receiptNumber: 'ZJV-2026-0042', receiptSequence: 42 });
    const receipt = await service.createForSaleInTx('sale-2', VehicleCategory.TOKUNBO, 'user-1', txMock as any);
    expect(txMock.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ receiptNumber: 'ZJV-2026-0042' }),
      }),
    );
    expect(receipt.receiptSequence).toBe(42);
  });

  it('findOne throws NotFoundException for unknown id', async () => {
    mockPrisma.receipt.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
  });

  it('voidReceipt throws ConflictException when already voided', async () => {
    mockPrisma.receipt.findUnique.mockResolvedValueOnce({
      ...mockReceipt,
      isVoided: true,
      issuedBy: { name: 'Admin' },
      voidedBy: null,
      sale: null,
    });
    await expect(
      service.voidReceipt('r-1', 'duplicate', 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test'),
    ).rejects.toThrow(ConflictException);
  });

  it('voidReceipt updates isVoided and logs audit', async () => {
    await service.voidReceipt('r-1', 'data entry error', 'user-1', UserRole.SUPER_ADMIN, '127.0.0.1', 'Test');
    expect(mockPrisma.receipt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isVoided: true, voidReason: 'data entry error' }) }),
    );
    expect(mockAudit.log).toHaveBeenCalled();
  });
});
