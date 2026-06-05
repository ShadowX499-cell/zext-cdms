import { Module } from '@nestjs/common';
import { SwapsService } from './swaps.service';
import { SwapsController } from './swaps.controller';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [ReceiptsModule],
  providers: [SwapsService],
  controllers: [SwapsController],
  exports: [SwapsService],
})
export class SwapsModule {}
