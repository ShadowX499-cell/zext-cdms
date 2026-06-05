import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
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
}
