import {
  HttpStatus,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { AppError, type ErrorItem } from './app-error';
import { isMessageKey } from './messages';

// class-validator xatolarini tarjima kalitlariga aylantiradi
function collect(errors: ValidationError[], parent = ''): ErrorItem[] {
  const items: ErrorItem[] = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    for (const message of Object.values(err.constraints ?? {})) {
      items.push(
        isMessageKey(message)
          ? { key: message }
          : { key: 'val.invalid', params: { field } },
      );
    }
    if (err.children?.length) items.push(...collect(err.children, field));
  }
  // Bir xil xabarlar takrorlanmasin
  const seen = new Set<string>();
  return items.filter((i) => {
    const id = i.key + JSON.stringify(i.params ?? {});
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppError(HttpStatus.BAD_REQUEST, collect(errors)),
  });
}
