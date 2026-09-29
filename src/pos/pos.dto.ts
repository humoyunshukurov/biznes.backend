import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client';
import { EmptyToNull, Trim } from '../common/transforms';

export class PosItemDto {
  @IsString()
  productId: string;

  @IsInt({ message: 'val.quantityPositive' })
  @Min(1, { message: 'val.quantityPositive' })
  quantity: number;
}

export class PosPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber()
  @Min(0.01, { message: 'val.amountPositive' })
  amount: number;
}

// Kassadagi savdo: mahsulotlar, chegirma va to'lovlar (to'lanmagan qismi mijozga qarz)
export class PosSaleDto {
  @IsString()
  customerId: string;

  @IsIn(['RETAIL', 'WHOLESALE'])
  priceList: 'RETAIL' | 'WHOLESALE';

  @IsArray()
  @ArrayMinSize(1, { message: 'pos.emptyCart' })
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => PosItemDto)
  items: PosItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(300)
  note?: string | null;

  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments: PosPaymentDto[];
}
