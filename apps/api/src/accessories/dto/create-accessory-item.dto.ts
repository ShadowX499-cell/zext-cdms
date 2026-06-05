import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AccessoryCategory } from '@prisma/client';

export class CreateAccessoryItemDto {
  @ApiProperty({ example: 'Dash Camera Pro X200' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: AccessoryCategory })
  @IsEnum(AccessoryCategory)
  category: AccessoryCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  quantityInStock: number;

  @ApiPropertyOptional({ example: '8000.00' })
  @IsOptional()
  @IsDecimal()
  costPrice?: string;

  @ApiProperty({ example: '15000.00' })
  @IsDecimal()
  sellingPrice: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  lowStockThreshold: number;

  @ApiPropertyOptional({ description: 'For bikes only — chassis number' })
  @IsOptional()
  @IsString()
  chassisNumber?: string;

  @ApiPropertyOptional({ description: 'For bikes only — engine number' })
  @IsOptional()
  @IsString()
  engineNumber?: string;
}
