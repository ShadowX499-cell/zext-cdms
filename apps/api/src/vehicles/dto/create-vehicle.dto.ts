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
import { VehicleCategory, ModeOfPurchase } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  dateBought: string;

  @ApiProperty({ example: 'Toyota Camry 2019' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: VehicleCategory })
  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @ApiProperty({ example: 'JTDBF3EK9A3012345' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  chassisNumber: string;

  @ApiProperty({ example: '1AR2345678' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  engineNumber: string;

  @ApiPropertyOptional({ example: 'ABC-123-XY' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plateNumber?: string;

  @ApiProperty({ example: 'Silver' })
  @IsString()
  @MaxLength(50)
  colour: string;

  @ApiProperty({ example: 'Emeka Chukwu' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ownerName: string;

  @ApiProperty({ enum: ModeOfPurchase })
  @IsEnum(ModeOfPurchase)
  modeOfPurchase: ModeOfPurchase;

  @ApiPropertyOptional({ example: '3500000.00', description: 'Admin-only field' })
  @IsOptional()
  @IsDecimal()
  purchasePrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
