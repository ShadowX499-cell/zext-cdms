import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@zextjv.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssword123' })
  @IsString()
  @MinLength(8)
  password: string;
}
