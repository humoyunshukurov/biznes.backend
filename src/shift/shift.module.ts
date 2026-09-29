import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';

@Module({
  imports: [CashModule],
  controllers: [ShiftController],
  providers: [ShiftService],
})
export class ShiftModule {}
