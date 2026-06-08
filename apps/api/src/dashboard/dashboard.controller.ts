import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get dashboard metrics (revenue fields Admin-only)' })
  getMetrics(@CurrentUser() user: AuthUser) {
    return this.dashboard.getMetrics(user.role as UserRole);
  }

  @Get('monthly-histogram')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revenue histogram for last 12 months (Admin only)' })
  getMonthlyHistogram() {
    return this.dashboard.getMonthlyHistogram();
  }

  @Get('monthly-detail/:yearMonth')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Full monthly performance detail (Admin only)' })
  getMonthlyDetail(@Param('yearMonth') yearMonth: string) {
    return this.dashboard.getMonthlyDetail(yearMonth);
  }
}
