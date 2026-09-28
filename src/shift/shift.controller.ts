import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShiftService } from './shift.service';

const userIdOf = (req: Request) => (req.user as { userId: string }).userId;

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftController {
  constructor(private shiftService: ShiftService) {}

  @Get('current')
  current(@Req() req: Request) {
    return this.shiftService.current(userIdOf(req));
  }

  @Post('open')
  open(@Req() req: Request) {
    return this.shiftService.open(userIdOf(req));
  }

  @Post('close')
  close(@Req() req: Request) {
    return this.shiftService.close(userIdOf(req));
  }
}
