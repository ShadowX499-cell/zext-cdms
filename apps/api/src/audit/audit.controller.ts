import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditCategory } from '@prisma/client';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth('JWT')
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries (both roles)' })
  findAll(
    @Query('userId') userId?: string,
    @Query('category') category?: AuditCategory,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.audit.findAll({ userId, category, page: +page, limit: +limit });
  }
}
