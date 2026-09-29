import { EmptyToNull, Trim } from '../../common/transforms';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class NamedDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'val.nameRequired' })
  name: string;
}

export class UnitDto extends NamedDto {
  @IsOptional()
  @EmptyToNull()
  @IsString()
  code?: string | null;
}
