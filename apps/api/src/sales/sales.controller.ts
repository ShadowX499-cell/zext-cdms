import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ReverseSaleDto } from './dto/reverse-sale.dto';

@ApiTags('Sales')
@ApiBearerAuth('JWT')
@Controller('sales')
export class SalesController {
  constructor(private sales: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales with pagination' })
  findAll(
    @Query('reversed') reversed?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const isReversed = reversed === 'true' ? true : reversed === 'false' ? false : undefined;
    return this.sales.findAll({ isReversed, page: +page, limit: +limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale details with vehicle, receipt, customer' })
  findOne(@Param('id') id: string) {
    return this.sales.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new vehicle sale (auto-creates receipt)' })
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    return this.sales.create(dto, user.id, user.role as UserRole, ip, req.headers['user-agent'] ?? 'unknown');
  }

  @Patch(':id/reverse')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reverse a sale — returns vehicle to inventory (Admin only)' })
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseSaleDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    return this.sales.reverse(id, dto, user.id, user.role as UserRole, ip, req.headers['user-agent'] ?? 'unknown');
  }
}
