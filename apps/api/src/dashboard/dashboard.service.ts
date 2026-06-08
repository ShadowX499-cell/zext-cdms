import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus, UserRole } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(role: UserRole) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      inventoryAvailable,
      inventoryTotal,
      soldThisMonth,
      registeredThisMonth,
      recentVehicles,
      recentSales,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: { status: VehicleStatus.AVAILABLE } }),
      this.prisma.vehicle.count(),
      this.prisma.sale.count({
        where: { dateSold: { gte: startOfMonth }, isReversed: false },
      }),
      this.prisma.vehicle.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.vehicle.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, category: true, status: true, colour: true,
          createdAt: true, photos: { where: { isCover: true }, take: 1, select: { url: true } },
        },
      }),
      this.prisma.sale.findMany({
        take: 5,
        orderBy: { dateSold: 'desc' },
        where: { isReversed: false },
        select: {
          id: true, dateSold: true, buyerName: true, sellingPrice: true, modeOfSale: true,
          vehicle: { select: { name: true, category: true } },
          receipt: { select: { receiptNumber: true } },
        },
      }),
    ]);

    const base = {
      inventoryAvailable,
      inventoryTotal,
      soldThisMonth,
      registeredThisMonth,
      recentVehicles,
      recentSales,
    };

    if (role !== UserRole.SUPER_ADMIN) {
      return { ...base, revenueThisMonth: null, revenueThisYear: null, totalRevenue: null };
    }

    // Admin-only revenue from non-voided receipts linked to sales
    const [revenueMonthResult, revenueYearResult, totalRevenueResult] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          dateSold: { gte: startOfMonth },
          isReversed: false,
          receipt: { isVoided: false },
        },
        _sum: { sellingPrice: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          dateSold: { gte: startOfYear },
          isReversed: false,
          receipt: { isVoided: false },
        },
        _sum: { sellingPrice: true },
      }),
      this.prisma.sale.aggregate({
        where: { isReversed: false, receipt: { isVoided: false } },
        _sum: { sellingPrice: true },
      }),
    ]);

    return {
      ...base,
      revenueThisMonth: revenueMonthResult._sum.sellingPrice?.toString() ?? '0',
      revenueThisYear: revenueYearResult._sum.sellingPrice?.toString() ?? '0',
      totalRevenue: totalRevenueResult._sum.sellingPrice?.toString() ?? '0',
    };
  }

  async getMonthlyHistogram() {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

    const results = await Promise.all(
      months.map(async ({ year, month }) => {
        const from = new Date(year, month, 1);
        const to = new Date(year, month + 1, 1);

        const [revenueResult, soldCount, registeredCount] = await Promise.all([
          this.prisma.sale.aggregate({
            where: {
              dateSold: { gte: from, lt: to },
              isReversed: false,
              receipt: { isVoided: false },
            },
            _sum: { sellingPrice: true },
          }),
          this.prisma.sale.count({
            where: {
              dateSold: { gte: from, lt: to },
              isReversed: false,
            },
          }),
          this.prisma.vehicle.count({
            where: { createdAt: { gte: from, lt: to } },
          }),
        ]);

        const monthLabel = from.toLocaleString('en-GB', { month: 'short', year: '2-digit' });

        return {
          month: monthLabel,
          year,
          monthNum: month + 1,
          revenue: revenueResult._sum.sellingPrice
            ? Number(revenueResult._sum.sellingPrice.toString())
            : 0,
          soldCount,
          registeredCount,
        };
      }),
    );

    return results;
  }
}
