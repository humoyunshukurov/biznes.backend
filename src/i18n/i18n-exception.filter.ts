import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError, type ErrorItem } from './app-error';
import { isMessageKey, pickLang, translate, type MessageKey } from './messages';

interface PrismaKnownError {
  code: string;
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

const prismaMap: Record<string, [HttpStatus, MessageKey]> = {
  P2002: [HttpStatus.CONFLICT, 'db.duplicate'],
  P2003: [HttpStatus.BAD_REQUEST, 'db.inUse'],
  P2014: [HttpStatus.BAD_REQUEST, 'db.inUse'],
  P2025: [HttpStatus.NOT_FOUND, 'db.notFound'],
};

const statusMap: Partial<Record<number, MessageKey>> = {
  400: 'http.badRequest',
  401: 'http.unauthorized',
  403: 'http.forbidden',
  404: 'http.notFound',
  413: 'http.tooLarge',
  429: 'http.tooMany',
};

// Barcha xatolarni bir xil ko'rinishda ({ statusCode, message }) va so'rov tilida qaytaradi
@Catch()
export class I18nExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const lang = pickLang(req.headers['accept-language']);

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let items: ErrorItem[] = [{ key: 'http.internal' }];

    if (exception instanceof AppError) {
      status = exception.getStatus();
      items = exception.items;
    } else if (isPrismaKnownError(exception)) {
      const mapped = prismaMap[exception.code];
      if (mapped) [status, items] = [mapped[0], [{ key: mapped[1] }]];
      else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        items = [{ key: 'db.error' }];
        this.logger.error(exception);
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      const raw =
        typeof body === 'string'
          ? body
          : (body as { message?: unknown }).message;
      // Kalit bilan tashlangan oddiy HttpException ham tarjima qilinadi
      if (isMessageKey(raw)) items = [{ key: raw }];
      else items = [{ key: statusMap[status] ?? 'http.internal' }];
      if (status >= 500) this.logger.error(exception);
    } else {
      this.logger.error(exception);
    }

    const texts = items.map((i) => translate(lang, i.key, i.params));
    res.status(status).json({
      statusCode: status,
      message: texts.length === 1 ? texts[0] : texts,
      codes: items.map((i) => i.key),
    });
  }
}
