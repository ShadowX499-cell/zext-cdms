import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULTS: Record<string, string> = {
  low_stock_cars_threshold: '3',
  low_stock_accessories_threshold: '2',
  otp_expiry_minutes: '10',
  session_timeout_minutes: '30',
  ng_used_disclaimer: 'This vehicle is sold in its current condition as seen and inspected by the buyer. ZEXT Joint Ventures Nigeria Limited makes no warranty regarding mechanical condition.',
  tokunbo_disclaimer: 'This is a foreign-used (Tokunbo) vehicle. ZEXT Joint Ventures Nigeria Limited guarantees clear title but makes no warranty regarding mechanical or electrical systems.',
  notifications_low_stock: 'true',
  notifications_account_locked: 'true',
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  async get(key: string): Promise<string> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? '';
  }

  async set(key: string, value: string, updatedById?: string): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedById },
      update: { value, updatedById },
    });
  }

  async setBulk(entries: Record<string, string>, updatedById?: string): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, updatedById);
    }
  }
}
