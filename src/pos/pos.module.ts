import { Body, Controller, Module, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PosSaleDto } from './pos.dto';
import { PosService } from './pos.service';

@UseGuards(JwtAuthGuard)
@Controller('pos')
export class PosController {
  constructor(private pos: PosService) {}

  @Post('sales')
  sale(@Body() dto: PosSaleDto, @Req() req: Request) {
    return this.pos.sale(dto, (req.user as { userId: string }).userId);
  }
}

@Module({
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
