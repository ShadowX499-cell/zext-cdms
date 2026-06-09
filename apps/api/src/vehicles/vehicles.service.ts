import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  VehicleCategory,
  VehicleStatus,
  VehicleHistoryEvent,
  AuditCategory,
  UserRole,
  Prisma,
} from '@prisma/client';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads');

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(filters: {
    status?: VehicleStatus;
    category?: VehicleCategory;
    search?: string;
    page?: number;
    limit?: number;
    role?: UserRole;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.category && { category: filters.category }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { chassisNumber: { contains: filters.search, mode: 'insensitive' } },
          { plateNumber: { contains: filters.search, mode: 'insensitive' } },
          { ownerName: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          photos: { where: { isCover: true }, take: 1 },
          registeredBy: { select: { name: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: data.map((v) => this.serialize(v, filters.role)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, role?: UserRole) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        registeredBy: { select: { name: true } },
        history: {
          orderBy: { createdAt: 'desc' },
          include: { performedBy: { select: { name: true } } },
        },
        sale: {
          select: {
            id: true,
            dateSold: true,
            buyerName: true,
            sellingPrice: true,
            modeOfSale: true,
            isReversed: true,
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return this.serialize(vehicle, role);
  }

  async create(
    dto: CreateVehicleDto,
    userId: string,
    role: UserRole,
    ipAddress: string,
    deviceInfo: string,
  ) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { chassisNumber: dto.chassisNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Chassis number already registered (vehicle ID: ${existing.id})`,
      );
    }

    // Secretaries cannot set purchasePrice
    const data: Prisma.VehicleCreateInput = {
      dateBought: new Date(dto.dateBought),
      name: dto.name,
      category: dto.category,
      chassisNumber: dto.chassisNumber,
      engineNumber: dto.engineNumber,
      plateNumber: dto.plateNumber,
      colour: dto.colour,
      ownerName: dto.ownerName,
      modeOfPurchase: dto.modeOfPurchase,
      notes: dto.notes,
      registeredBy: { connect: { id: userId } },
      ...(dto.purchasePrice && role === UserRole.SUPER_ADMIN
        ? { purchasePrice: new Prisma.Decimal(dto.purchasePrice) }
        : {}),
    };

    const vehicle = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({ data });
      await tx.vehicleHistory.create({
        data: {
          vehicleId: created.id,
          event: VehicleHistoryEvent.REGISTERED,
          description: `Vehicle registered: ${dto.name} (${dto.chassisNumber})`,
          performedById: userId,
        },
      });
      return created;
    });

    await this.audit.log({
      userId,
      userRole: role,
      category: AuditCategory.VEHICLE_REGISTRATION,
      action: `Vehicle registered: ${dto.name}`,
      recordId: vehicle.id,
      recordType: 'Vehicle',
      ipAddress,
      deviceInfo,
    });

    return this.serialize(vehicle, role);
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    userId: string,
    role: UserRole,
    ipAddress: string,
    deviceInfo: string,
  ) {
    const vehicle = await this.findOne(id, role);

    if (dto.purchasePrice && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can set purchase price');
    }

    const updateData: Prisma.VehicleUpdateInput = {
      ...dto,
      ...(dto.dateBought ? { dateBought: new Date(dto.dateBought) } : {}),
      ...(dto.purchasePrice
        ? { purchasePrice: new Prisma.Decimal(dto.purchasePrice) }
        : {}),
    };
    delete (updateData as Record<string, unknown>).dateBought;
    if (dto.dateBought) updateData.dateBought = new Date(dto.dateBought);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.vehicle.update({ where: { id }, data: updateData });
      if (dto.status && dto.status !== vehicle.status) {
        await tx.vehicleHistory.create({
          data: {
            vehicleId: id,
            event: VehicleHistoryEvent.STATUS_CHANGED,
            description: `Status changed from ${vehicle.status} to ${dto.status}`,
            performedById: userId,
          },
        });
      }
      return result;
    });

    await this.audit.log({
      userId,
      userRole: role,
      category: AuditCategory.VEHICLE_REGISTRATION,
      action: `Vehicle updated: ${updated.name}`,
      recordId: id,
      recordType: 'Vehicle',
      ipAddress,
      deviceInfo,
    });

    return this.serialize(updated, role);
  }

  async addPhoto(
    vehicleId: string,
    file: Express.Multer.File,
    userId: string,
    isCover: boolean,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const dir = path.join(UPLOAD_BASE, vehicleId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), file.buffer);

    if (isCover) {
      await this.prisma.vehiclePhoto.updateMany({
        where: { vehicleId },
        data: { isCover: false },
      });
    }

    return this.prisma.vehiclePhoto.create({
      data: {
        vehicleId,
        url: `/static/${vehicleId}/${filename}`,
        filename,
        isCover: isCover ?? false,
        uploadedById: userId,
      },
    });
  }

  async deletePhoto(photoId: string, vehicleId: string) {
    const photo = await this.prisma.vehiclePhoto.findFirst({
      where: { id: photoId, vehicleId },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    const filePath = path.join(UPLOAD_BASE, vehicleId, photo.filename);
    await fs.unlink(filePath).catch(() => null);
    await this.prisma.vehiclePhoto.delete({ where: { id: photoId } });
    return { message: 'Photo deleted' };
  }

  async addDocument(vehicleId: string, file: Express.Multer.File, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

    const ext = path.extname(file.originalname).toLowerCase() || this.mimeToExt(file.mimetype);
    const filename = `${crypto.randomUUID()}${ext}`;
    const dir = path.join(UPLOAD_BASE, vehicleId, 'docs');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), file.buffer);

    return this.prisma.vehicleDocument.create({
      data: {
        vehicleId,
        url: `/static/${vehicleId}/docs/${filename}`,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: userId,
      },
    });
  }

  async deleteDocument(documentId: string, vehicleId: string) {
    const doc = await this.prisma.vehicleDocument.findFirst({
      where: { id: documentId, vehicleId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const filePath = path.join(UPLOAD_BASE, vehicleId, 'docs', doc.filename);
    await fs.unlink(filePath).catch(() => null);
    await this.prisma.vehicleDocument.delete({ where: { id: documentId } });
    return { message: 'Document deleted' };
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
    };
    return map[mime] ?? '';
  }

  private serialize(vehicle: Record<string, unknown>, role?: UserRole) {
    if (role !== UserRole.SUPER_ADMIN) {
      const { purchasePrice: _pp, ...rest } = vehicle as Record<string, unknown>;
      return rest;
    }
    return vehicle;
  }
}
