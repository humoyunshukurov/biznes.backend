import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

interface PrismaKnownError {
  code: string;
  meta?: { target?: string[] | string; modelName?: string };
}

function isPrismaKnownError(e: unknown): e is PrismaKnownError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof e.code === 'string' &&
    /^P\d{4}$/.test(e.code)
  );
}

// Prisma'ning texnik xatolarini foydalanuvchiga tushunarli HTTP javoblarga aylantiradi
@Catch()
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (!isPrismaKnownError(exception)) {
      return super.catch(exception, host);
    }

    const res = host.switchToHttp().getResponse<Response>();

    switch (exception.code) {
      case 'P2002':
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Bunday qiymat allaqachon mavjud (takrorlanmasligi kerak)',
        });
      case 'P2003':
      case 'P2014':
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            "Bu yozuv boshqa ma'lumotlarda ishlatilgan, shuning uchun o'chirib bo'lmaydi",
        });
      case 'P2025':
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Yozuv topilmadi',
        });
      default:
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Ma'lumotlar bazasi xatosi",
        });
    }
  }
}
