import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OverviewQueryDto, RangeQueryDto, ReorderQueryDto } from './stats.dto';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private stats: StatsService) {}

  @Get('overview')
  overview(@Query() q: OverviewQueryDto) {
    return this.stats.overview(q);
  }

  @Get('stock')
  stock() {
    return this.stats.stock();
  }

  @Get('abc')
  abc(@Query() q: RangeQueryDto) {
    return this.stats.abc(q);
  }

  @Get('customer-balances')
  customerBalances() {
    return this.stats.customerBalances();
  }

  @Get('income')
  income(@Query() q: RangeQueryDto) {
    return this.stats.income(q);
  }

  @Get('reorder')
  reorder(@Query() q: ReorderQueryDto) {
    return this.stats.reorder(q);
  }
}
