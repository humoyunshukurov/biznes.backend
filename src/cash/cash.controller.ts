import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateCashCategoryDto,
  CreateCashDto,
  LedgerQueryDto,
} from './cash.dto';
import { CashService } from './cash.service';

type AuthUser = { userId: string; role: string };
const userOf = (req: Request) => req.user as AuthUser;

@UseGuards(JwtAuthGuard)
@Controller('cash')
export class CashController {
  constructor(private cash: CashService) {}

  @Get('ledger')
  ledger(@Query() q: LedgerQueryDto) {
    return this.cash.ledger(q);
  }

  @Get('balances')
  balances() {
    return this.cash.balances();
  }

  @Get('categories')
  categories() {
    return this.cash.categories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCashCategoryDto) {
    return this.cash.createCategory(dto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string, @Req() req: Request) {
    return this.cash.removeCategory(id, userOf(req).role);
  }

  @Get('customers')
  customers() {
    return this.cash.customers();
  }

  @Post()
  create(@Body() dto: CreateCashDto, @Req() req: Request) {
    return this.cash.create(dto, userOf(req).userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.cash.remove(id, userOf(req).role);
  }
}
