import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  VehicleCategory,
  ReceiptType,
  AuditCategory,
  UserRole,
  Prisma,
} from '@prisma/client';
import { generateNgUsedHtml } from './templates/ng-used.template';
import { generateTokunboHtml } from './templates/tokunbo.template';
import { generateSwapHtml } from './templates/swap.template';
import { generateAccessoriesHtml } from './templates/accessories.template';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  static vehicleCategoryToReceiptType(category: VehicleCategory): ReceiptType {
    if (category === VehicleCategory.TOKUNBO) return ReceiptType.TOKUNBO_CAR;
    if (category === VehicleCategory.SCOOTER_BIKE) return ReceiptType.ACCESSORIES_BIKE;
    return ReceiptType.NG_USED_CAR;
  }

  /** Called inside a Prisma $transaction by SalesService */
  async createForSaleInTx(
    saleId: string,
    vehicleCategory: VehicleCategory,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    const currentYear = new Date().getFullYear();
    const receiptType = ReceiptsService.vehicleCategoryToReceiptType(vehicleCategory);

    const seqRecord = await tx.receiptSequence.upsert({
      where: { year: currentYear },
      create: { year: currentYear, currentSequence: 1 },
      update: { currentSequence: { increment: 1 } },
    });

    const receiptNumber = `ZJV-${currentYear}-${String(seqRecord.currentSequence).padStart(4, '0')}`;

    return tx.receipt.create({
      data: {
        receiptNumber,
        receiptYear: currentYear,
        receiptSequence: seqRecord.currentSequence,
        receiptDate: new Date(),
        type: receiptType,
        saleId,
        issuedById: userId,
      },
    });
  }

  async findAll(filters: {
    type?: ReceiptType;
    isVoided?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReceiptWhereInput = {
      ...(filters.type && { type: filters.type }),
      ...(filters.isVoided !== undefined && { isVoided: filters.isVoided }),
    };

    const [data, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          issuedBy: { select: { name: true } },
          sale: {
            select: {
              buyerName: true,
              sellingPrice: true,
              vehicle: { select: { name: true, chassisNumber: true } },
            },
          },
        },
      }),
      this.prisma.receipt.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        issuedBy: { select: { name: true } },
        voidedBy: { select: { name: true } },
        sale: {
          include: { vehicle: true, customer: true },
        },
        swap: {
          include: {
            outgoingVehicle: true,
            incomingVehicle: true,
            customer: true,
          },
        },
        accessorySale: {
          include: {
            items: { include: { accessoryItem: { select: { name: true } } } },
            customer: true,
          },
        },
      },
    });
    if (!receipt) throw new NotFoundException(`Receipt ${id} not found`);
    return receipt;
  }

  async voidReceipt(
    id: string,
    reason: string,
    userId: string,
    role: UserRole,
    ipAddress: string,
    deviceInfo: string,
  ) {
    const receipt = await this.findOne(id);
    if (receipt.isVoided) throw new ConflictException('Receipt is already voided');

    const voided = await this.prisma.receipt.update({
      where: { id },
      data: {
        isVoided: true,
        voidReason: reason,
        voidedAt: new Date(),
        voidedById: userId,
      },
    });

    await this.audit.log({
      userId,
      userRole: role,
      category: AuditCategory.RECEIPTS,
      action: `Receipt ${receipt.receiptNumber} voided. Reason: ${reason}`,
      recordId: id,
      recordType: 'Receipt',
      ipAddress,
      deviceInfo,
    });

    return voided;
  }

  async generatePdf(id: string): Promise<Buffer> {
    const receipt = await this.findOne(id);

    const templateData = {
      ...receipt,
      sale: receipt.sale
        ? { ...receipt.sale, sellingPrice: receipt.sale.sellingPrice?.toString() ?? '0' }
        : null,
      swap: (receipt as any).swap
        ? {
            ...(receipt as any).swap,
            cashDifference: (receipt as any).swap.cashDifference?.toString() ?? null,
          }
        : null,
      accessorySale: (receipt as any).accessorySale
        ? {
            ...(receipt as any).accessorySale,
            totalAmount: (receipt as any).accessorySale.totalAmount?.toString() ?? '0',
            items: ((receipt as any).accessorySale.items ?? []).map((item: any) => ({
              ...item,
              unitPrice: item.unitPrice?.toString() ?? '0',
              subtotal: item.subtotal?.toString() ?? '0',
            })),
          }
        : null,
    };

    let html: string;
    switch (receipt.type) {
      case ReceiptType.TOKUNBO_CAR:
        html = generateTokunboHtml(templateData as unknown as Parameters<typeof generateTokunboHtml>[0]);
        break;
      case ReceiptType.SWAP_DEAL:
        html = generateSwapHtml(templateData as unknown as Parameters<typeof generateSwapHtml>[0]);
        break;
      case ReceiptType.ACCESSORIES_BIKE:
        html = generateAccessoriesHtml(templateData as unknown as Parameters<typeof generateAccessoriesHtml>[0]);
        break;
      default:
        html = generateNgUsedHtml(templateData as unknown as Parameters<typeof generateNgUsedHtml>[0]);
    }

    // Lazy import to avoid startup cost
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: true,
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
