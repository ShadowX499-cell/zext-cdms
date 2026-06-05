import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  VehicleStatus,
  VehicleHistoryEvent,
  AuditCategory,
  UserRole,
  ReceiptType,
  Prisma,
} from '@prisma/client';
import { CreateSwapDto } from './dto/create-swap.dto';

@Injectable()
export class SwapsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private receipts: ReceiptsService,
  ) {}

  async create(
    dto: CreateSwapDto,
    userId: string,
    role: UserRole,
    ipAddress: string,
    deviceInfo: string,
  ) {
    const [outgoing, incoming] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { id: dto.outgoingVehicleId } }),
      this.prisma.vehicle.findUnique({ where: { id: dto.incomingVehicleId } }),
    ]);

    if (!outgoing) throw new NotFoundException(`Outgoing vehicle ${dto.outgoingVehicleId} not found`);
    if (!incoming) throw new NotFoundException(`Incoming vehicle ${dto.incomingVehicleId} not found`);
    if (outgoing.status !== VehicleStatus.AVAILABLE) {
      throw new ConflictException(`Outgoing vehicle is ${outgoing.status}, must be AVAILABLE`);
    }
    if (dto.outgoingVehicleId === dto.incomingVehicleId) {
      throw new ConflictException('Outgoing and incoming vehicles must be different');
    }

    const { swap, receipt } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.swap.create({
        data: {
          dateOfSwap: new Date(dto.dateOfSwap),
          outgoingVehicleId: dto.outgoingVehicleId,
          incomingVehicleId: dto.incomingVehicleId,
          modeOfSwap: dto.modeOfSwap,
          witnessName: dto.witnessName,
          notes: dto.notes,
          registeredById: userId,
          ...(dto.cashDifference
            ? { cashDifference: new Prisma.Decimal(dto.cashDifference), cashDirection: dto.cashDirection }
            : {}),
          ...(dto.customerId ? { customerId: dto.customerId } : {}),
        },
      });

      // Outgoing vehicle → SWAPPED
      await tx.vehicle.update({
        where: { id: dto.outgoingVehicleId },
        data: { status: VehicleStatus.SWAPPED },
      });

      // Incoming vehicle → AVAILABLE (now in ZEXT inventory)
      await tx.vehicle.update({
        where: { id: dto.incomingVehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      await tx.vehicleHistory.create({
        data: {
          vehicleId: dto.outgoingVehicleId,
          event: VehicleHistoryEvent.SWAP_RECORDED,
          description: `Swapped out for ${incoming.name} (${incoming.chassisNumber})`,
          performedById: userId,
        },
      });

      await tx.vehicleHistory.create({
        data: {
          vehicleId: dto.incomingVehicleId,
          event: VehicleHistoryEvent.SWAP_RECORDED,
          description: `Received via swap — replaced ${outgoing.name} (${outgoing.chassisNumber})`,
          performedById: userId,
        },
      });

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
          type: ReceiptType.SWAP_DEAL,
          swapId: created.id,
          issuedById: userId,
        },
      });

      return { swap: created, receipt: createdReceipt };
    });

    await this.audit.log({
      userId,
      userRole: role,
      category: AuditCategory.SWAPS,
      action: `Swap recorded: ${outgoing.name} ↔ ${incoming.name}`,
      recordId: swap.id,
      recordType: 'Swap',
      ipAddress,
      deviceInfo,
    });

    return { swap, receipt };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.swap.findMany({
        orderBy: { dateOfSwap: 'desc' },
        skip,
        take: limit,
        include: {
          outgoingVehicle: { select: { name: true, chassisNumber: true } },
          incomingVehicle: { select: { name: true, chassisNumber: true } },
          registeredBy: { select: { name: true } },
          receipt: { select: { receiptNumber: true } },
        },
      }),
      this.prisma.swap.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const swap = await this.prisma.swap.findUnique({
      where: { id },
      include: {
        outgoingVehicle: true,
        incomingVehicle: true,
        registeredBy: { select: { name: true } },
        customer: true,
        receipt: true,
      },
    });
    if (!swap) throw new NotFoundException(`Swap ${id} not found`);
    return swap;
  }
}
