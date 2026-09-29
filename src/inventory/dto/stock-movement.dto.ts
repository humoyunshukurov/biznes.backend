import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
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
  @Min(0.001, { message: 'val.quantityPositive' })
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
  @Min(0, { message: 'val.actualNotNegative' })
  actual: number;
}

export class RevisionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'val.countAtLeastOne' })
  @ValidateNested({ each: true })
  @Type(() => RevisionItemDto)
  items: RevisionItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class MovementQueryDto {
  // Vergul bilan ajratilgan turlar: SUPPLIER_IN,SUPPLIER_RETURN
  @IsOptional()
  @Matches(/^[A-Z_]+(,[A-Z_]+)*$/)
  kind?: string;
}
