import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AuditCategory,
  UserRole,
  ReceiptType,
  Prisma,
} from '@prisma/client';
import { CreateAccessoryItemDto } from './dto/create-accessory-item.dto';
import { CreateAccessorySaleDto } from './dto/create-accessory-sale.dto';
import { PartialType } from '@nestjs/swagger';

@Injectable()
export class AccessoriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Items ────────────────────────────────────────────────────────────────────

  async findAllItems(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.accessoryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { photos: { take: 1 } },
      }),
      this.prisma.accessoryItem.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOneItem(id: string) {
    const item = await this.prisma.accessoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Accessory item ${id} not found`);
    return item;
  }

  async createItem(dto: CreateAccessoryItemDto) {
    return this.prisma.accessoryItem.create({
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description,
        quantityInStock: dto.quantityInStock,
        sellingPrice: new Prisma.Decimal(dto.sellingPrice),
        lowStockThreshold: dto.lowStockThreshold,
        chassisNumber: dto.chassisNumber,
        engineNumber: dto.engineNumber,
        ...(dto.costPrice ? { costPrice: new Prisma.Decimal(dto.costPrice) } : {}),
      },
    });
  }

  async updateItem(id: string, dto: Partial<CreateAccessoryItemDto>) {
    await this.findOneItem(id);
    return this.prisma.accessoryItem.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.sellingPrice ? { sellingPrice: new Prisma.Decimal(dto.sellingPrice) } : {}),
        ...(dto.costPrice ? { costPrice: new Prisma.Decimal(dto.costPrice) } : {}),
      },
    });
  }

  // ── Sales ────────────────────────────────────────────────────────────────────

  async createSale(
    dto: CreateAccessorySaleDto,
    userId: string,
    role: UserRole,
    ipAddress: string,
    deviceInfo: string,
  ) {
    // Load all items first to get prices and check stock
    const itemIds = dto.items.map((i) => i.accessoryItemId);
    const dbItems = await this.prisma.accessoryItem.findMany({
      where: { id: { in: itemIds } },
    });

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    // Validate all items exist and have enough stock
    for (const saleItem of dto.items) {
      const dbItem = itemMap.get(saleItem.accessoryItemId);
      if (!dbItem) throw new NotFoundException(`Item ${saleItem.accessoryItemId} not found`);
      if (dbItem.quantityInStock < saleItem.quantity) {
        throw new ConflictException(
          `Insufficient stock for "${dbItem.name}": ${dbItem.quantityInStock} available, ${saleItem.quantity} requested`,
        );
      }
    }

    // Calculate totals
    const saleItemsData = dto.items.map((saleItem) => {
      const dbItem = itemMap.get(saleItem.accessoryItemId)!;
      const unitPrice = dbItem.sellingPrice;
      const subtotal = unitPrice.times(saleItem.quantity);
      return { ...saleItem, unitPrice, subtotal };
    });

    const totalAmount = saleItemsData.reduce(
      (sum, item) => sum.plus(item.subtotal),
      new Prisma.Decimal(0),
    );

    const { accessorySale, receipt } = await this.prisma.$transaction(async (tx) => {
      // Create sale
      const created = await tx.accessorySale.create({
        data: {
          dateSold: new Date(dto.dateSold),
          buyerName: dto.buyerName,
          buyerPhone: dto.buyerPhone,
          paymentMode: dto.paymentMode,
          totalAmount,
          registeredById: userId,
          ...(dto.customerId ? { customerId: dto.customerId } : {}),
          items: {
            create: saleItemsData.map((item) => ({
              accessoryItemId: item.accessoryItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      });

      // Decrement stock for each item
      for (const saleItem of dto.items) {
        await tx.accessoryItem.update({
          where: { id: saleItem.accessoryItemId },
          data: { quantityInStock: { decrement: saleItem.quantity } },
        });
      }

      // Atomic receipt sequence
      const currentYear = new Date().getFullYear();
      const seqRecord = await tx.receiptSequence.upsert({
        where: { year: currentYear },
        create: { year: currentYear, currentSequence: 1 },
        update: { currentSequence: { increment: 1 } },
      });
      const receiptNumber = `ZJV-${currentYear}-${String(seqRecord.currentSequence).padStart(4, '0')}`;
      const createdReceipt = await tx.receipt.create({
        data: {
          receiptNumber,
          receiptYear: currentYear,
          receiptSequence: seqRecord.currentSequence,
          receiptDate: new Date(),
          type: ReceiptType.ACCESSORIES_BIKE,
          accessorySaleId: created.id,
          issuedById: userId,
        },
      });

      return { accessorySale: created, receipt: createdReceipt };
    });

    // Post-transaction: check for low-stock items and create notifications
    await this.checkLowStock(dto.items.map((i) => i.accessoryItemId), userId);

    await this.audit.log({
      userId,
      userRole: role,
      category: AuditCategory.ACCESSORIES,
      action: `Accessory sale: ${dto.items.length} item(s) sold to ${dto.buyerName} for ₦${totalAmount}`,
      recordId: accessorySale.id,
      recordType: 'AccessorySale',
      ipAddress,
      deviceInfo,
    });

    return { accessorySale, receipt };
  }

  async findAllSales(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.accessorySale.findMany({
        orderBy: { dateSold: 'desc' },
        skip,
        take: limit,
        include: {
          registeredBy: { select: { name: true } },
          receipt: { select: { receiptNumber: true } },
          items: { include: { accessoryItem: { select: { name: true } } } },
        },
      }),
      this.prisma.accessorySale.count(),
    ]);
    return { data, total, page, limit };
  }

  private async checkLowStock(itemIds: string[], userId: string) {
    const items = await this.prisma.accessoryItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, quantityInStock: true, lowStockThreshold: true },
    });

    for (const item of items) {
      if (item.quantityInStock <= item.lowStockThreshold) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'LOW_STOCK',
            title: 'Low Stock Alert',
            body: `"${item.name}" is running low — only ${item.quantityInStock} left in stock (threshold: ${item.lowStockThreshold})`,
            relatedRecordId: item.id,
            relatedRecordType: 'AccessoryItem',
          },
        });
      }
    }
  }
}
