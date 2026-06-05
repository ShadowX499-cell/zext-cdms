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
import { ModeOfSale } from '@prisma/client';

export class CreateSaleDto {
  @ApiProperty({ example: '2026-06-05' })
  @IsDateString()
  dateSold: string;

  @ApiProperty({ description: 'Vehicle ID to sell' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 'Emeka Okafor' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  buyerName: string;

  @ApiProperty({ example: '08012345678' })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  buyerPhone: string;

  @ApiProperty({ example: '12 Abuja Crescent, Wuse 2' })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  buyerAddress: string;

  @ApiProperty({ example: 'Chidi Obi' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  witnessName: string;

  @ApiProperty({ example: '4500000.00' })
  @IsDecimal()
  sellingPrice: string;

  @ApiProperty({ enum: ModeOfSale })
  @IsEnum(ModeOfSale)
  modeOfSale: ModeOfSale;

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
