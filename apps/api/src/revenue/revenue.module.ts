import { Module } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';

@Module({
  providers: [RevenueService],
  controllers: [RevenueController],
})
export class RevenueModule {}
