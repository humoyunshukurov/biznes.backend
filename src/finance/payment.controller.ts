import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/payment.dto';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.paymentService.create(dto, userId);
  }
}
