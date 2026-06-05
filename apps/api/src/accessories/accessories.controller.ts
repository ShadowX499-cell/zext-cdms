import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AccessoriesService } from './accessories.service';
import { CreateAccessoryItemDto } from './dto/create-accessory-item.dto';
import { CreateAccessorySaleDto } from './dto/create-accessory-sale.dto';

@ApiTags('Accessories')
@ApiBearerAuth('JWT')
@Controller('accessories')
export class AccessoriesController {
  constructor(private accessories: AccessoriesService) {}

  // ── Items ────────────────────────────────────────────────────────────────────

  @Get('items')
  @ApiOperation({ summary: 'List accessory items / bikes with stock levels' })
  findAllItems(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.accessories.findAllItems(search, +page, +limit);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get accessory item by ID' })
  findOneItem(@Param('id') id: string) {
    return this.accessories.findOneItem(id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a new accessory item or bike to inventory' })
  createItem(@Body() dto: CreateAccessoryItemDto) {
    return this.accessories.createItem(dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update accessory item details or stock' })
  updateItem(@Param('id') id: string, @Body() dto: Partial<CreateAccessoryItemDto>) {
    return this.accessories.updateItem(id, dto);
  }

  // ── Sales ────────────────────────────────────────────────────────────────────

  @Get('sales')
  @ApiOperation({ summary: 'List all accessory sales' })
  findAllSales(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.accessories.findAllSales(+page, +limit);
  }

  @Post('sales')
  @ApiOperation({ summary: 'Record an accessory / bike sale (auto-creates receipt, decrements stock)' })
  createSale(
    @Body() dto: CreateAccessorySaleDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    return this.accessories.createSale(dto, user.id, user.role as UserRole, ip, req.headers['user-agent'] ?? 'unknown');
  }
}
