import { Injectable, BadRequestException } from '@nestjs/common';
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

  async getMonthlyDetail(yearMonth: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      throw new BadRequestException(`Invalid yearMonth format: ${yearMonth}. Expected YYYY-MM`);
    }

    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed for Date
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 1);

    const label = from.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

    const [sales, registeredVehicles] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          dateSold: { gte: from, lt: to },
          isReversed: false,
          receipt: { isVoided: false },
        },
        select: {
          id: true,
          dateSold: true,
          buyerName: true,
          sellingPrice: true,
          modeOfSale: true,
          vehicle: { select: { name: true, category: true, purchasePrice: true } },
          receipt: { select: { id: true } },
        },
        orderBy: { sellingPrice: 'desc' },
      }),
      this.prisma.vehicle.findMany({
        where: { createdAt: { gte: from, lt: to } },
        select: { category: true },
      }),
    ]);

    let totalRevenue = 0;
    let grossProfit = 0;

    for (const sale of sales) {
      const sp = Number(sale.sellingPrice.toString());
      totalRevenue += sp;
      if (sale.vehicle.purchasePrice != null) {
        grossProfit += sp - Number(sale.vehicle.purchasePrice.toString());
      }
    }

    const dailyMap = new Map<number, { revenue: number; count: number }>();
    for (const sale of sales) {
      const day = new Date(sale.dateSold).getDate();
      const entry = dailyMap.get(day) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(sale.sellingPrice.toString());
      entry.count += 1;
      dailyMap.set(day, entry);
    }
    const dailySales = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, data]) => ({ day, ...data }));

    const categoryMap = new Map<string, { soldCount: number; revenue: number; registeredCount: number }>();
    for (const sale of sales) {
      const cat = sale.vehicle.category;
      const entry = categoryMap.get(cat) ?? { soldCount: 0, revenue: 0, registeredCount: 0 };
      entry.soldCount += 1;
      entry.revenue += Number(sale.sellingPrice.toString());
      categoryMap.set(cat, entry);
    }
    for (const v of registeredVehicles) {
      const cat = v.category;
      const entry = categoryMap.get(cat) ?? { soldCount: 0, revenue: 0, registeredCount: 0 };
      entry.registeredCount += 1;
      categoryMap.set(cat, entry);
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({ category, ...data }));

    const modeMap = new Map<string, { count: number; revenue: number }>();
    for (const sale of sales) {
      const mode = sale.modeOfSale;
      const entry = modeMap.get(mode) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(sale.sellingPrice.toString());
      modeMap.set(mode, entry);
    }
    const byModeOfSale = Array.from(modeMap.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([mode, data]) => ({ mode, ...data }));

    const topSales = sales.map((sale) => ({
      id: sale.id,
      vehicleName: sale.vehicle.name,
      buyerName: sale.buyerName,
      sellingPrice: Number(sale.sellingPrice.toString()),
      dateSold: sale.dateSold.toISOString(),
      receiptId: sale.receipt?.id ?? '',
    }));

    return {
      label,
      yearMonth,
      metrics: {
        totalRevenue,
        grossProfit,
        totalSold: sales.length,
        totalRegistered: registeredVehicles.length,
      },
      dailySales,
      byCategory,
      byModeOfSale,
      topSales,
    };
  }
}
