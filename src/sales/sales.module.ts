import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { OrderController, ReturnController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [CustomerController, OrderController, ReturnController],
  providers: [CustomerService, OrderService],
  exports: [OrderService],
})
export class SalesModule {}
