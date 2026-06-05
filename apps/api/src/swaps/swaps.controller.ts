import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SwapsService } from './swaps.service';
import { CreateSwapDto } from './dto/create-swap.dto';

@ApiTags('Swaps')
@ApiBearerAuth('JWT')
@Controller('swaps')
export class SwapsController {
  constructor(private swaps: SwapsService) {}

  @Get()
  @ApiOperation({ summary: 'List all swap deals' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.swaps.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get swap deal details' })
  findOne(@Param('id') id: string) {
    return this.swaps.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a swap deal (auto-creates receipt)' })
  create(
    @Body() dto: CreateSwapDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    return this.swaps.create(dto, user.id, user.role as UserRole, ip, req.headers['user-agent'] ?? 'unknown');
  }
}
