import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateSupplierDto,
  SupplierPaymentDto,
  SupplierStockDto,
  UpdateSupplierDto,
} from './suppliers.dto';
import { SuppliersService } from './suppliers.service';

const userIdOf = (req: Request) => (req.user as { userId: string }).userId;

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliers: SuppliersService) {}

  @Get()
  findAll() {
    return this.suppliers.findAll();
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.suppliers.history(id);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliers.remove(id);
  }

  @Post(':id/receive')
  receive(
    @Param('id') id: string,
    @Body() dto: SupplierStockDto,
    @Req() req: Request,
  ) {
    return this.suppliers.receive(id, dto, userIdOf(req));
  }

  @Post(':id/return')
  returnGoods(
    @Param('id') id: string,
    @Body() dto: SupplierStockDto,
    @Req() req: Request,
  ) {
    return this.suppliers.returnGoods(id, dto, userIdOf(req));
  }

  @Post(':id/payments')
  pay(
    @Param('id') id: string,
    @Body() dto: SupplierPaymentDto,
    @Req() req: Request,
  ) {
    return this.suppliers.pay(id, dto, userIdOf(req));
  }
}
