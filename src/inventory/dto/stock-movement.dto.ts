import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { StockMovementType } from '../../../generated/prisma/client';

export class CreateStockMovementDto {
  @IsString()
  productId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RevisionItemDto {
  @IsString()
  productId: string;

  // Sanab chiqilgan haqiqiy qoldiq
  @IsNumber()
  @Min(0, { message: "Haqiqiy qoldiq manfiy bo'lmasligi kerak" })
  actual: number;
}

export class RevisionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Kamida bitta mahsulot sanang' })
  @ValidateNested({ each: true })
  @Type(() => RevisionItemDto)
  items: RevisionItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}
