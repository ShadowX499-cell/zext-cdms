import { Module } from '@nestjs/common';
import { AccessoriesService } from './accessories.service';
import { AccessoriesController } from './accessories.controller';

@Module({
  providers: [AccessoriesService],
  controllers: [AccessoriesController],
  exports: [AccessoriesService],
})
export class AccessoriesModule {}
