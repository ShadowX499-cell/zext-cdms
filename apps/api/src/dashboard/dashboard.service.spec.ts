import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  vehicle: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  sale: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getMonthlyHistogram', () => {
    it('returns 12 items ordered oldest to newest', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { sellingPrice: null } });
      mockPrisma.sale.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);

      const result = await service.getMonthlyHistogram();

      expect(result).toHaveLength(12);
      const first = result[0];
      const last = result[11];
      const firstDate = new Date(first.year, first.monthNum - 1);
      const lastDate = new Date(last.year, last.monthNum - 1);
      expect(firstDate.getTime()).toBeLessThan(lastDate.getTime());
    });

    it('converts null revenue to 0', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { sellingPrice: null } });
      mockPrisma.sale.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);

      const result = await service.getMonthlyHistogram();

      expect(result[0].revenue).toBe(0);
    });

    it('returns revenue as a number (not Decimal)', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({
        _sum: { sellingPrice: { toString: () => '9500000' } },
      });
      mockPrisma.sale.count.mockResolvedValue(2);
      mockPrisma.vehicle.count.mockResolvedValue(5);

      const result = await service.getMonthlyHistogram();

      expect(typeof result[0].revenue).toBe('number');
      expect(result[0].revenue).toBe(9500000);
    });
  });

  describe('getMonthlyDetail', () => {
    it('throws BadRequestException for invalid yearMonth format', async () => {
      await expect(service.getMonthlyDetail('2026-13')).rejects.toThrow(BadRequestException);
      await expect(service.getMonthlyDetail('26-05')).rejects.toThrow(BadRequestException);
      await expect(service.getMonthlyDetail('not-a-date')).rejects.toThrow(BadRequestException);
    });

    it('returns correct label for valid yearMonth', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyDetail('2026-05');

      expect(result.label).toBe('May 2026');
      expect(result.yearMonth).toBe('2026-05');
    });

    it('returns zero metrics when no sales', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyDetail('2026-05');

      expect(result.metrics.totalRevenue).toBe(0);
      expect(result.metrics.grossProfit).toBe(0);
      expect(result.metrics.totalSold).toBe(0);
      expect(result.metrics.totalRegistered).toBe(0);
      expect(result.dailySales).toEqual([]);
      expect(result.byCategory).toEqual([]);
      expect(result.byModeOfSale).toEqual([]);
      expect(result.topSales).toEqual([]);
    });

    it('calculates grossProfit only from sales with purchasePrice', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        {
          id: 's-1', dateSold: new Date('2026-05-07'), buyerName: 'Buyer A',
          sellingPrice: { toString: () => '10000000' },
          modeOfSale: 'OUTRIGHT',
          vehicle: { name: 'Car A', category: 'TOKUNBO', purchasePrice: { toString: () => '7000000' } },
          receipt: { id: 'r-1' },
        },
        {
          id: 's-2', dateSold: new Date('2026-05-15'), buyerName: 'Buyer B',
          sellingPrice: { toString: () => '5000000' },
          modeOfSale: 'SWAP',
          vehicle: { name: 'Car B', category: 'NG_USED', purchasePrice: null },
          receipt: { id: 'r-2' },
        },
      ]);
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyDetail('2026-05');

      // grossProfit = 10M - 7M = 3M (Car B excluded — no purchasePrice)
      expect(result.metrics.grossProfit).toBe(3000000);
      expect(result.metrics.totalRevenue).toBe(15000000);
      expect(result.metrics.totalSold).toBe(2);
    });
  });
});
