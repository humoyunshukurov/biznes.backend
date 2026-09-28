import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class RangeQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  // Brauzerning UTC'dan farqi (daqiqada, Date.getTimezoneOffset() qiymati)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-840)
  @Max(840)
  tz?: number;
}

export class OverviewQueryDto extends RangeQueryDto {
  @IsIn(['hour', 'day', 'weekday'])
  groupBy: 'hour' | 'day' | 'weekday';
}

export class ReorderQueryDto {
  // Necha kunlik savdo asosida hisoblash
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  // Necha kunga yetadigan zaxira kerak
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  cover?: number;
}
