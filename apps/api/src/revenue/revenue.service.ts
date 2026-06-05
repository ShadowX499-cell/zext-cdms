import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RevenueFilters {
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  async getSummary(filters: RevenueFilters = {}) {
    const where = {
      isReversed: false,
      receipt: { isVoided: false },
      ...(filters.fromDate || filters.toDate
        ? { dateSold: {
            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
            ...(filters.toDate ? { lte: filters.toDate } : {}),
          } }
        : {}),
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalAll,
      totalMonth,
      totalYear,
      salesCount,
      salesCountMonth,
      byCategory,
      monthlyTrend,
    ] = await Promise.all([
      this.prisma.sale.aggregate({ where, _sum: { sellingPrice: true }, _count: true }),
      this.prisma.sale.aggregate({
        where: { ...where, dateSold: { gte: startOfMonth } },
        _sum: { sellingPrice: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { ...where, dateSold: { gte: startOfYear } },
        _sum: { sellingPrice: true },
        _count: true,
      }),
      this.prisma.sale.count({ where }),
      this.prisma.sale.count({ where: { ...where, dateSold: { gte: startOfMonth } } }),
      // Revenue by vehicle category via raw groupBy
      this.prisma.sale.findMany({
        where,
        select: { sellingPrice: true, vehicle: { select: { category: true } } },
      }),
      // Last 6 months trend
      this.getMonthlyTrend(6),
    ]);

    // Group by category
    const categoryMap: Record<string, number> = {};
    for (const sale of byCategory) {
      const cat = sale.vehicle?.category ?? 'UNKNOWN';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + parseFloat(sale.sellingPrice.toString());
    }

    return {
      totalRevenue: totalAll._sum.sellingPrice?.toString() ?? '0',
      totalSalesCount: totalAll._count,
      revenueThisMonth: totalMonth._sum.sellingPrice?.toString() ?? '0',
      salesCountThisMonth: totalMonth._count,
      revenueThisYear: totalYear._sum.sellingPrice?.toString() ?? '0',
      salesCountThisYear: totalYear._count,
      byCategory: categoryMap,
      monthlyTrend,
    };
  }

  private async getMonthlyTrend(months: number) {
    const trend: Array<{ month: string; revenue: number; count: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const result = await this.prisma.sale.aggregate({
        where: {
          isReversed: false,
          receipt: { isVoided: false },
          dateSold: { gte: start, lte: end },
        },
        _sum: { sellingPrice: true },
        _count: true,
      });
      trend.push({
        month: start.toLocaleString('en-NG', { month: 'short', year: '2-digit' }),
        revenue: parseFloat(result._sum.sellingPrice?.toString() ?? '0'),
        count: result._count,
      });
    }

    return trend;
  }

  async getTopSales(limit = 10) {
    return this.prisma.sale.findMany({
      where: { isReversed: false, receipt: { isVoided: false } },
      orderBy: { sellingPrice: 'desc' },
      take: limit,
      select: {
        id: true,
        dateSold: true,
        sellingPrice: true,
        buyerName: true,
        modeOfSale: true,
        vehicle: { select: { name: true, category: true } },
        receipt: { select: { receiptNumber: true } },
      },
    });
  }
}
