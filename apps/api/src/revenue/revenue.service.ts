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

  private async getSalesRows(filters: RevenueFilters) {
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
    return this.prisma.sale.findMany({
      where,
      orderBy: { dateSold: 'desc' },
      include: {
        vehicle: { select: { name: true, category: true, chassisNumber: true } },
        receipt: { select: { receiptNumber: true } },
      },
    });
  }

  async exportCsv(filters: RevenueFilters = {}): Promise<string> {
    const rows = await this.getSalesRows(filters);
    const header = ['Receipt No', 'Date', 'Vehicle', 'Category', 'Chassis', 'Buyer', 'Mode', 'Amount (NGN)'].join(',');
    const lines = rows.map((r) =>
      [
        r.receipt?.receiptNumber ?? '',
        r.dateSold.toISOString().split('T')[0],
        `"${r.vehicle?.name ?? ''}"`,
        r.vehicle?.category ?? '',
        r.vehicle?.chassisNumber ?? '',
        `"${r.buyerName}"`,
        r.modeOfSale,
        r.sellingPrice.toString(),
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }

  async exportExcel(filters: RevenueFilters = {}): Promise<Buffer> {
    const rows = await this.getSalesRows(filters);
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'ZEXT CDMS';
    const sheet = workbook.addWorksheet('Revenue');

    sheet.columns = [
      { header: 'Receipt No', key: 'receipt', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Vehicle', key: 'vehicle', width: 28 },
      { header: 'Category', key: 'category', width: 14 },
      { header: 'Chassis No', key: 'chassis', width: 20 },
      { header: 'Buyer', key: 'buyer', width: 22 },
      { header: 'Mode of Sale', key: 'mode', width: 16 },
      { header: 'Amount (NGN)', key: 'amount', width: 16 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };

    for (const r of rows) {
      sheet.addRow({
        receipt: r.receipt?.receiptNumber ?? '',
        date: r.dateSold.toISOString().split('T')[0],
        vehicle: r.vehicle?.name ?? '',
        category: (r.vehicle?.category ?? '').replace(/_/g, ' '),
        chassis: r.vehicle?.chassisNumber ?? '',
        buyer: r.buyerName,
        mode: r.modeOfSale.replace(/_/g, ' '),
        amount: parseFloat(r.sellingPrice.toString()),
      });
    }

    // Number format for Amount column
    sheet.getColumn('amount').numFmt = '#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
