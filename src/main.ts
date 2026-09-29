import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { I18nExceptionFilter } from './i18n/i18n-exception.filter';
import { createValidationPipe } from './i18n/validation';
import { UPLOADS_DIR } from './uploads/uploads.constants';

async function bootstrap() {
  mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  // Excel importida minglab qatorlar bo'lishi mumkin
  app.use(json({ limit: '10mb' }));
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });
  app.useGlobalPipes(createValidationPipe());
  // Xatolar Accept-Language sarlavhasidagi tilda qaytariladi
  app.useGlobalFilters(new I18nExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
