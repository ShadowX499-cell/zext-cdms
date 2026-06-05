import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Step 1: Validate credentials and send OTP' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';
    const result = await this.auth.initiateLogin(
      dto.email,
      dto.password,
      ipAddress,
      deviceInfo,
    );
    return {
      userId: result.userId,
      message: 'OTP sent to your registered email address',
    };
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Step 2: Verify OTP and receive access token' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    const deviceInfo = req.headers['user-agent'] ?? 'unknown';

    const result = await this.auth.verifyOtp(
      dto.userId,
      dto.otp,
      ipAddress,
      deviceInfo,
    );

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: result.accessToken,
      user: {
        id: dto.userId,
        name: result.name,
        email: result.email,
        role: result.role,
      },
    };
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  async refresh(
    @CurrentUser() user: { id: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(user.id, user.refreshToken);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invalidate refresh token and clear cookie' })
  async logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.id);
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }
}
