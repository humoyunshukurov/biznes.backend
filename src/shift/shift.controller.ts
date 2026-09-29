import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShiftService } from './shift.service';

type AuthUser = { userId: string; role: string };
const userOf = (req: Request) => req.user as AuthUser;

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftController {
  constructor(private shiftService: ShiftService) {}

  @Get()
  history(@Req() req: Request) {
    const user = userOf(req);
    return this.shiftService.history(user.userId, user.role);
  }

  @Get('current')
  current(@Req() req: Request) {
    return this.shiftService.current(userOf(req).userId);
  }

  @Post('open')
  open(@Req() req: Request) {
    return this.shiftService.open(userOf(req).userId);
  }

  @Post('close')
  close(@Req() req: Request) {
    return this.shiftService.close(userOf(req).userId);
  }
}
