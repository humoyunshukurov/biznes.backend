import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

// Faqat ADMIN rolidagi foydalanuvchiga ruxsat beradi (JwtAuthGuard'dan keyin qo'llanadi)
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { role?: string } }>();
    const role = req.user?.role;
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Bu amal faqat administrator uchun');
    }
    return true;
  }
}
