import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { EmptyToNull } from '../../common/transforms';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  unitId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'val.barcodeRequired' })
  @IsString({ each: true })
  @Matches(/^\S+$/, {
    each: true,
    message: 'val.barcodeSpaces',
  })
  barcodes: string[];

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number | null;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  sku?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  description?: string | null;

  @IsOptional()
  @EmptyToNull()
  @Matches(/^\d{17}$/, {
    message: 'val.ikpu',
  })
  ikpu?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  unitCode?: string | null;

  @IsOptional()
  @IsIn([0, 12, null])
  vatRate?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  markupPercent?: number | null;

  @IsOptional()
  @IsIn([1, 10, 100, 500, 1000, null])
  roundTo?: number | null;

  @IsOptional()
  @IsBoolean()
  isMarked?: boolean;

  @IsOptional()
  @IsBoolean()
  isWeighted?: boolean;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  brandId?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  productTypeId?: string | null;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ImportProductRowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  wholesalePrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isWeighted?: boolean;
}

export class ImportProductsDto {
  @IsIn(['create', 'update'])
  mode: 'create' | 'update';

  @IsArray()
  @ArrayMinSize(1, { message: 'val.fileNoRows' })
  @ValidateNested({ each: true })
  @Type(() => ImportProductRowDto)
  rows: ImportProductRowDto[];
}
