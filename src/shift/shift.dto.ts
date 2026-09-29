import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client';

export class OpenShiftDto {
  // Kassada sanalgan naqd pul (berilmasa hisobdagi naqd qoldiq olinadi)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  openingCash?: number;
}

// Har bir kassada sanalgan haqiqiy summa
export class ShiftCountsDto {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  CASH?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  CARD?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  BANK_TRANSFER?: number;
}

// Yopishdan oldin bir kassadan boshqasiga pul o'tkazish
export class ShiftTransferDto {
  @IsEnum(PaymentMethod)
  from: PaymentMethod;

  @IsEnum(PaymentMethod)
  to: PaymentMethod;

  @IsNumber()
  @Min(0.01, { message: 'val.amountPositive' })
  amount: number;
}

export class CloseShiftDto {
  // Eski mijozlar uchun: faqat naqd kassada sanalgan summa
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  closingCash?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShiftCountsDto)
  counts?: ShiftCountsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ShiftTransferDto)
  transfers?: ShiftTransferDto[];
}
