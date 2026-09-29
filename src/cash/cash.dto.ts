import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CashType, PaymentMethod } from '../../generated/prisma/client';
import { EmptyToNull, Trim } from '../common/transforms';

// Maxsus toifalar: mijoz qarzini yopish va yetkazib beruvchi bilan hisob-kitob
export const CLIENT = 'CLIENT';
export const SUPPLIER = 'SUPPLIER';

// Tayyor toifalar kodlari (nomi interfeysda tanlangan tilga tarjima qilinadi)
export const PRESET_CATEGORIES: Record<'IN' | 'OUT', string[]> = {
  IN: [CLIENT, SUPPLIER, 'SALES', 'OPENING', 'LOAN', 'OTHER_IN'],
  OUT: [
    SUPPLIER,
    'SALARY',
    'ADVANCE',
    'FUEL',
    'RENT',
    'UTILITIES',
    'COLLECTION',
    'PURCHASE',
    'OTHER_OUT',
  ],
};

export class CreateCashDto {
  @IsEnum(CashType)
  type: CashType;

  @IsNumber()
  @Min(0.01, { message: 'val.amountPositive' })
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentMethod)
  toMethod?: PaymentMethod;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  supplierId?: string | null;

  // Yozuv sanasi (bo'lmasa - hozirgi vaqt)
  @IsOptional()
  @EmptyToNull()
  @IsDateString()
  date?: string | null;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(300)
  description?: string | null;
}

export class CreateCashCategoryDto {
  @IsIn(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @Trim()
  @IsString()
  @MinLength(1, { message: 'val.nameRequired' })
  @MaxLength(80)
  name: string;
}

export class LedgerQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsIn(['ALL', 'CASH', 'CARD', 'BANK_TRANSFER'])
  @Transform(({ value }: { value: unknown }) => value ?? 'ALL')
  account?: 'ALL' | PaymentMethod;
}
