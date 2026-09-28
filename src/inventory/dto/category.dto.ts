import { Trim } from '../../common/transforms';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: "Nomi bo'sh bo'lmasligi kerak" })
  name: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: "Nomi bo'sh bo'lmasligi kerak" })
  name?: string;
}
