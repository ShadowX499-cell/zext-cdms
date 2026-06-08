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
        _sum: { sellingPrice: { toNumber: () => 9500000 } },
      });
      mockPrisma.sale.count.mockResolvedValue(2);
      mockPrisma.vehicle.count.mockResolvedValue(5);

      const result = await service.getMonthlyHistogram();

      expect(typeof result[0].revenue).toBe('number');
      expect(result[0].revenue).toBe(9500000);
    });
  });
});
