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
} from 'class-validator';
import { CashType, PaymentMethod } from '../../generated/prisma/client';
import { EmptyToNull, Trim } from '../common/transforms';

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
  @Trim()
  @IsString()
  @MaxLength(300)
  description?: string | null;
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
