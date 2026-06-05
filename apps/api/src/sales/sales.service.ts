import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  VehicleStatus,
  VehicleHistoryEvent,
  AuditCategory,
  UserRole,
  Prisma,
} from '@prisma/client';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ReverseSaleDto } from './dto/reverse-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private receipts: ReceiptsService,
  ) {}

  async create(
    dto: CreateSaleDto,
    userId: string,
    role: UserRole,
    ipAddress: string,
    deviceInfo: string,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new ConflictException(`Vehicle is currently ${vehicle.status} and cannot be sold`);
    }

    const { sale, receipt } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          dateSold: new Date(dto.dateSold),
          vehicleId: dto.vehicleId,
          buyerName: dto.buyerName,
          buyerPhone: dto.buyerPhone,
          buyerAddress: dto.buyerAddress,
          witnessName: dto.witnessName,
          sellingPrice: new Prisma.Decimal(dto.sellingPrice),
          modeOfSale: dto.modeOfSale,
          notes: dto.notes,
          registeredById: userId,
          ...(dto.customerId ? { customerId: dto.customerId } : {}),
        },
      });

      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: { status: VehicleStatus.SOLD },
      });

      await tx.vehicleHistory.create({
        data: {
          vehicleId: dto.vehicleId,
          event: VehicleHistoryEvent.SALE_RECORDED,
          description: `Sold to ${dto.buyerName} for ₦${dto.sellingPrice} via ${dto.modeOfSale}`,
          performedById: userId,
        },
      });

      const createdReceipt = await this.receipts.createForSaleInTx(
        created.id,
        vehicle.category,
        userId,
        tx,
      );

      return { sale: created, receipt: createdReceipt };
    });

    await this.audit.log({
      userId,
      userRole: role,
      category: AuditCategory.SALES,
      action: `Sale registered: ${vehicle.name} → ${dto.buyerName} for ₦${dto.sellingPrice}`,
      recordId: sale.id,
      recordType: 'Sale',
      ipAddress,
      deviceInfo,
    });

    return { sale, receipt };
  }

  async findAll(filters: {
    isReversed?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      ...(filters.isReversed !== undefined && { isReversed: filters.isReversed }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        orderBy: { dateSold: 'desc' },
        skip,
        take: limit,
        include: {
          vehicle: { select: { name: true, chassisNumber: true, category: true } },
          registeredBy: { select: { name: true } },
          receipt: { select: { receiptNumber: true, type: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        vehicle: true,
        registeredBy: { select: { name: true } },
        reversedBy: { select: { name: true } },
        customer: true,
        receipt: true,
      },
    });
    if (!sale) throw new NotFoundException(`Sale ${id} not found`);
    return sale;
  }

  async reverse(
    id: string,
    dto: ReverseSaleDto,
    userId: string,
    role: UserRole,
    ipAddress: string,
    deviceInfo: string,
  ) {
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can reverse sales');
    }

    const sale = await this.findOne(id);
    if (sale.isReversed) throw new ConflictException('Sale is already reversed');

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: {
          isReversed: true,
          reversalReason: dto.reversalReason,
          reversedAt: new Date(),
          reversedById: userId,
        },
      });

      await tx.vehicle.update({
        where: { id: sale.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      await tx.vehicleHistory.create({
        data: {
          vehicleId: sale.vehicleId,
          event: VehicleHistoryEvent.STATUS_CHANGED,
          description: `Sale reversed. Vehicle returned to available inventory. Reason: ${dto.reversalReason}`,
          performedById: userId,
        },
      });
    });

    await this.audit.log({
      userId,
      userRole: role,
      category: AuditCategory.SALES,
      action: `Sale reversed: ${sale.vehicle.name}. Reason: ${dto.reversalReason}`,
      recordId: id,
      recordType: 'Sale',
      ipAddress,
      deviceInfo,
    });

    return { message: 'Sale reversed and vehicle returned to inventory' };
  }
}
