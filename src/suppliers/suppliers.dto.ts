import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client';
import { EmptyToNull, Trim } from '../common/transforms';

export class CreateSupplierDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'val.nameRequired' })
  name: string;

  @IsOptional() @EmptyToNull() @IsString() phone?: string | null;
  @IsOptional() @EmptyToNull() @IsString() address?: string | null;
  @IsOptional() @EmptyToNull() @IsString() note?: string | null;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class SupplierItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.001, { message: 'val.quantityPositive' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  unitCost: number;
}

export class SupplierStockDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'val.selectAtLeastOne' })
  @ValidateNested({ each: true })
  @Type(() => SupplierItemDto)
  items: SupplierItemDto[];

  @IsOptional() @IsString() note?: string;

  // Kirimda mahsulotning tan narxini yangi narxga yangilash
  @IsOptional() @IsBoolean() updateCostPrice?: boolean;
}

export class SupplierPaymentDto {
  @IsNumber()
  @Min(0.01, { message: 'val.amountPositive' })
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional() @IsString() note?: string;
}
