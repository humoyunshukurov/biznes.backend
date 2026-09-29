import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client';
import { EmptyToNull, Trim } from '../common/transforms';

export class CreateSubscriptionPaymentDto {
  @IsIn(['START', 'BUSINESS', 'PREMIUM'])
  plan: 'START' | 'BUSINESS' | 'PREMIUM';

  @IsIn([1, 3, 6, 12])
  months: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}
