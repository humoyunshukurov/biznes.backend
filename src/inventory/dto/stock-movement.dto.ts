import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { StockMovementType } from '../../../generated/prisma/client';

export class CreateStockMovementDto {
  @IsString()
  productId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}
