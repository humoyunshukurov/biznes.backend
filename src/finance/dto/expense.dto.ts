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
  @MinLength(1, { message: "Toifa bo'sh bo'lmasligi kerak" })
  category: string;

  @IsNumber()
  @Min(0.01, { message: "Summa 0 dan katta bo'lishi kerak" })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
