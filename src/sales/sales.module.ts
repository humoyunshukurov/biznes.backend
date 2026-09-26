import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [CustomerController, OrderController],
  providers: [CustomerService, OrderService],
})
export class SalesModule {}
