import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';

@Module({
  controllers: [InvoiceController, PaymentController, ExpenseController],
  providers: [InvoiceService, PaymentService, ExpenseService],
})
export class FinanceModule {}
