import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnlineQueryDto, PublicOrderDto, RejectOnlineDto } from './online.dto';
import { OnlineService } from './online.service';

type AuthUser = { userId: string; role: string };
const userOf = (req: Request) => req.user as AuthUser;

// Ochiq (kirishsiz) onlayn do'kon: katalog va buyurtma yuborish
@Controller('public/shop')
export class PublicShopController {
  constructor(private online: OnlineService) {}

  @Get()
  shop() {
    return this.online.shop();
  }

  @Post('orders')
  order(@Body() dto: PublicOrderDto, @Req() req: Request) {
    return this.online.placeOrder(dto, req.ip ?? 'unknown');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('online')
export class OnlineController {
  constructor(private online: OnlineService) {}

  @Get('orders')
  list(@Query() q: OnlineQueryDto) {
    return this.online.list(q);
  }

  @Get('pending')
  pending() {
    return this.online.pending();
  }

  @Post('orders/:id/accept')
  accept(@Param('id') id: string, @Req() req: Request) {
    return this.online.accept(id, userOf(req).userId);
  }

  @Post('orders/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOnlineDto,
    @Req() req: Request,
  ) {
    return this.online.reject(id, dto.reason, userOf(req).userId);
  }
}
