import { Trim } from '../../common/transforms';
import { PaymentMethod } from '../../../generated/prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExpenseDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'val.categoryRequired' })
  category: string;

  @IsNumber()
  @Min(0.01, { message: 'val.amountPositive' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  // Qaysi hisobdan to'landi (standart: naqd)
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
