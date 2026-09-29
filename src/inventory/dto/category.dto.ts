import { EmptyToNull, Trim } from '../../common/transforms';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'val.nameRequired' })
  name: string;

  // Ixtiyoriy tarjimalar: tanlangan tilda ko'rsatish uchun
  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(120)
  nameEn?: string | null;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(120)
  nameRu?: string | null;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'val.nameRequired' })
  name?: string;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(120)
  nameEn?: string | null;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(120)
  nameRu?: string | null;
}
