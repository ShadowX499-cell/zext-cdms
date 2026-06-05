import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMode } from '@prisma/client';

export class AccessorySaleItemDto {
  @ApiProperty()
  @IsString()
  accessoryItemId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateAccessorySaleDto {
  @ApiProperty({ example: '2026-06-06' })
  @IsDateString()
  dateSold: string;

  @ApiProperty({ example: 'Emeka Okafor' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  buyerName: string;

  @ApiPropertyOptional({ example: '08012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  buyerPhone?: string;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @ApiProperty({ type: [AccessorySaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccessorySaleItemDto)
  items: AccessorySaleItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}
