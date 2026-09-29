import { Trim } from '../../common/transforms';
import {
  IsDateString,
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
}
