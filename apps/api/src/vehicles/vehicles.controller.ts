import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehicleCategory, VehicleStatus } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { memoryStorage } from 'multer';

const photoUploadInterceptor = FileInterceptor('photo', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG files are allowed'), false);
    }
  },
});

@ApiTags('Vehicles')
@ApiBearerAuth('JWT')
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehicles: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List vehicles with filters and pagination' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: VehicleStatus,
    @Query('category') category?: VehicleCategory,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.vehicles.findAll({ status, category, search, page: +page, limit: +limit, role: user.role as any });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID with history' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.vehicles.findOne(id, user.role as any);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new vehicle' })
  create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    return this.vehicles.create(dto, user.id, user.role as any, ip, req.headers['user-agent'] ?? 'unknown');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle details or status' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.ip ?? '127.0.0.1').replace('::ffff:', '');
    return this.vehicles.update(id, dto, user.id, user.role as any, ip, req.headers['user-agent'] ?? 'unknown');
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Upload a vehicle photo (max 5 MB, JPG/PNG)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(photoUploadInterceptor)
  addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
    @Query('cover') cover?: string,
  ) {
    return this.vehicles.addPhoto(id, file, user.id, cover === 'true');
  }

  @Delete(':vehicleId/photos/:photoId')
  @ApiOperation({ summary: 'Delete a vehicle photo' })
  deletePhoto(
    @Param('vehicleId') vehicleId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.vehicles.deletePhoto(photoId, vehicleId);
  }
}
