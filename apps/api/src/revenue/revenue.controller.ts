import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RevenueService } from './revenue.service';

@ApiTags('Revenue')
@ApiBearerAuth('JWT')
@Roles(UserRole.SUPER_ADMIN)
@Controller('revenue')
export class RevenueController {
  constructor(private revenue: RevenueService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Revenue summary with monthly trend (Admin only)' })
  getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.revenue.getSummary({
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
    });
  }

  @Get('top-sales')
  @ApiOperation({ summary: 'Top sales by value (Admin only)' })
  getTopSales(@Query('limit') limit = 10) {
    return this.revenue.getTopSales(+limit);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export all sales as CSV (Admin only)' })
  async exportCsv(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.revenue.exportCsv({
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
    });
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="zext-revenue.csv"',
    });
    res.send(csv);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export all sales as Excel (Admin only)' })
  async exportExcel(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.revenue.exportExcel({
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
    });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="zext-revenue.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
