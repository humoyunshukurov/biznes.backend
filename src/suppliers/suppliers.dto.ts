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
  @MinLength(1, { message: "Nomi bo'sh bo'lmasligi kerak" })
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
  @Min(0.001, { message: "Miqdor 0 dan katta bo'lishi kerak" })
  quantity: number;

  @IsNumber()
  @Min(0, { message: "Narx manfiy bo'lmasligi kerak" })
  unitCost: number;
}

export class SupplierStockDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Kamida bitta mahsulot tanlang' })
  @ValidateNested({ each: true })
  @Type(() => SupplierItemDto)
  items: SupplierItemDto[];

  @IsOptional() @IsString() note?: string;

  // Kirimda mahsulotning tan narxini yangi narxga yangilash
  @IsOptional() @IsBoolean() updateCostPrice?: boolean;
}

export class SupplierPaymentDto {
  @IsNumber()
  @Min(0.01, { message: "To'lov summasi 0 dan katta bo'lishi kerak" })
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional() @IsString() note?: string;
}
