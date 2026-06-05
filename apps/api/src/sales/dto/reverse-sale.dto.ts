import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReverseSaleDto {
  @ApiProperty({ example: 'Customer returned vehicle — deal fell through' })
  @IsString()
  @MinLength(10)
  reversalReason: string;
}
