import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UPLOADS_DIR } from './uploads.constants';

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) =>
          cb(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          ),
      }),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype.startsWith('image/') &&
          ALLOWED_EXT.includes(extname(file.originalname).toLowerCase());
        cb(
          ok
            ? null
            : new BadRequestException(
                'Faqat rasm (png, jpg, webp, gif) yuklash mumkin',
              ),
          ok,
        );
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl tanlanmagan');
    return { url: `/uploads/${file.filename}` };
  }
}
