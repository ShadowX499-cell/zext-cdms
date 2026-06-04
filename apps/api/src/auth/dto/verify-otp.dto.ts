import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'clxyz123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
