import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: false,
      auth:
        this.config.get('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASS'),
            }
          : undefined,
    });
  }

  async sendOtp(to: string, name: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@zextjv.com'),
      to,
      subject: 'ZEXT CDMS — Your Login Verification Code',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <h2 style="color:#111;margin-bottom:8px">Login Verification Code</h2>
          <p style="color:#555">Hi ${name},</p>
          <p style="color:#555">Your one-time login code for ZEXT CDMS is:</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:12px;padding:20px;
                      background:#f5f5f5;text-align:center;border-radius:8px;
                      color:#111;margin:20px 0">${otp}</div>
          <p style="color:#555">This code expires in <strong>10 minutes</strong>.
             Do not share it with anyone.</p>
          <p style="color:#888;font-size:12px">
            If you did not request this, contact your system administrator immediately.
          </p>
        </div>
      `,
    });
  }

  async sendAccountLocked(to: string, name: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@zextjv.com'),
      to,
      subject: 'ZEXT CDMS — Account Locked',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <h2 style="color:#dc2626">Account Temporarily Locked</h2>
          <p>Hi ${name},</p>
          <p>Your ZEXT CDMS account has been temporarily locked due to 5 consecutive
             failed login attempts.</p>
          <p>The account will automatically unlock after <strong>30 minutes</strong>.</p>
          <p>If this was not you, contact your system administrator immediately.</p>
        </div>
      `,
    });
  }
}
