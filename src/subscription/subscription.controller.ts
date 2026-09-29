import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/admin.guard';
import { CreateSubscriptionPaymentDto } from './subscription.dto';
import { SubscriptionService } from './subscription.service';

type AuthUser = { userId: string; role: string };

@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscription: SubscriptionService) {}

  @Get()
  overview() {
    return this.subscription.overview();
  }

  @UseGuards(AdminGuard)
  @Post('payments')
  pay(@Body() dto: CreateSubscriptionPaymentDto, @Req() req: Request) {
    return this.subscription.pay(dto, (req.user as AuthUser).userId);
  }

  @UseGuards(AdminGuard)
  @Delete('payments/:id')
  remove(@Param('id') id: string) {
    return this.subscription.remove(id);
  }
}
