import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { forbidden } from '../i18n/app-error';
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
      throw forbidden('auth.adminOnly');
    }
    return true;
  }
}
