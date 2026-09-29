import { HttpException, HttpStatus } from '@nestjs/common';
import type { MessageKey } from './messages';

export type Params = Record<string, string | number>;

export interface ErrorItem {
  key: MessageKey;
  params?: Params;
}

// Tarjima kaliti bilan xato: matn global filtrda so'rov tiliga qarab yoziladi
export class AppError extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly items: ErrorItem[],
  ) {
    super({ statusCode: status, errors: items }, status);
  }
}

const make = (status: HttpStatus) => (key: MessageKey, params?: Params) =>
  new AppError(status, [{ key, params }]);

export const badRequest = make(HttpStatus.BAD_REQUEST);
export const notFound = make(HttpStatus.NOT_FOUND);
export const conflict = make(HttpStatus.CONFLICT);
export const forbidden = make(HttpStatus.FORBIDDEN);
export const unauthorized = make(HttpStatus.UNAUTHORIZED);
