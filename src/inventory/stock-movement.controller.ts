import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockMovementService } from './stock-movement.service';
import {
  CreateStockMovementDto,
  MovementQueryDto,
  RevisionDto,
} from './dto/stock-movement.dto';

const userIdOf = (req: Request) => (req.user as { userId: string }).userId;

@UseGuards(JwtAuthGuard)
@Controller('stock-movements')
export class StockMovementController {
  constructor(private stockMovementService: StockMovementService) {}

  @Get()
  findAll(@Query() query: MovementQueryDto) {
    return this.stockMovementService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateStockMovementDto, @Req() req: Request) {
    return this.stockMovementService.create(dto, userIdOf(req));
  }

  @Post('revision')
  revision(@Body() dto: RevisionDto, @Req() req: Request) {
    return this.stockMovementService.revision(dto, userIdOf(req));
  }
}
