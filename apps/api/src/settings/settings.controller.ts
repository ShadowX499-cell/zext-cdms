import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth('JWT')
@Roles(UserRole.SUPER_ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings (Admin only)' })
  getAll() {
    return this.settings.getAll();
  }

  @Patch()
  @ApiOperation({ summary: 'Update system settings in bulk (Admin only)' })
  setBulk(@Body() body: Record<string, string>, @CurrentUser() user: AuthUser) {
    return this.settings.setBulk(body, user.id).then(() => ({ message: 'Settings saved' }));
  }
}
