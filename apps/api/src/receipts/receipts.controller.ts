import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, ReceiptType } from '@prisma/client';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ReceiptsService } from './receipts.service';

class VoidReceiptDto {
  @ApiProperty({ example: 'Data entry error' })
  @IsString()
  @MinLength(5)
  reason: string;
}

@ApiTags('Receipts')
@ApiBearerAuth('JWT')
@Controller('receipts')
export class ReceiptsController {
  constructor(private receipts: ReceiptsService) {}

  @Get()
  @ApiOperation({ summary: 'List all receipts' })
  findAll(
    @Query('type') type?: ReceiptType,
    @Query('voided') voided?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const isVoided = voided === 'true' ? true : voided === 'false' ? false : undefined;
    return this.receipts.findAll({ type, isVoided, page: +page, limit: +limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receipt details' })
  findOne(@Param('id') id: string) {
    return this.receipts.findOne(id);
  }

  @Patch(':id/void')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Void a receipt (Admin only)' })
  void(
    @Param('id') id: string,
    @Body() dto: VoidReceiptDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    return this.receipts.voidReceipt(id, dto.reason, user.id, user.role as UserRole, ip, req.headers['user-agent'] ?? 'unknown');
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download receipt as PDF' })
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const receipt = await this.receipts.findOne(id);
    const buffer = await this.receipts.generatePdf(id);
    const filename = `${receipt.receiptNumber}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
