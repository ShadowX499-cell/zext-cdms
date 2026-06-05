import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ModeOfSwap, CashDirection } from '@prisma/client';

export class CreateSwapDto {
  @ApiProperty({ example: '2026-06-06' })
  @IsDateString()
  dateOfSwap: string;

  @ApiProperty({ description: 'ZEXT vehicle being swapped out (must be AVAILABLE)' })
  @IsString()
  outgoingVehicleId: string;

  @ApiProperty({ description: 'Customer vehicle coming in (must already be registered)' })
  @IsString()
  incomingVehicleId: string;

  @ApiProperty({ enum: ModeOfSwap })
  @IsEnum(ModeOfSwap)
  modeOfSwap: ModeOfSwap;

  @ApiPropertyOptional({ example: '250000.00', description: 'Cash top-up amount if applicable' })
  @IsOptional()
  @IsDecimal()
  cashDifference?: string;

  @ApiPropertyOptional({ enum: CashDirection })
  @IsOptional()
  @IsEnum(CashDirection)
  cashDirection?: CashDirection;

  @ApiProperty({ example: 'Chidi Obi' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  witnessName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Optional customer ID to link' })
  @IsOptional()
  @IsString()
  customerId?: string;
}
