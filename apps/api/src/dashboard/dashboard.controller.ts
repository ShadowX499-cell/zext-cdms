import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
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
}
