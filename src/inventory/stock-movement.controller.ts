import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockMovementService } from './stock-movement.service';
import { CreateStockMovementDto } from './dto/stock-movement.dto';

@UseGuards(JwtAuthGuard)
@Controller('stock-movements')
export class StockMovementController {
  constructor(private stockMovementService: StockMovementService) {}

  @Get()
  findAll() {
    return this.stockMovementService.findAll();
  }

  @Post()
  create(@Body() dto: CreateStockMovementDto, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.stockMovementService.create(dto, userId);
  }
}
