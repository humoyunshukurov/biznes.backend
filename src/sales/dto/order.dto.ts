import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, PaymentMethod } from '../../../generated/prisma/client';

export class CreateOrderItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1, { message: 'val.quantityPositive' })
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'val.selectAtLeastOne' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

// Mijozdan qaytarish: buyurtmadagi mahsulotlardan qaysi biri va nechta
export class CreateReturnDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'val.selectAtLeastOne' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  note?: string;

  // Mijozga pul qaysi usulda qaytarildi (standart: naqd)
  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;
}
