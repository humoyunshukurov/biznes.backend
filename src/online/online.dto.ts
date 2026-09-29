import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EmptyToNull, Trim } from '../common/transforms';

export class PublicOrderItemDto {
  @IsString()
  productId: string;

  @IsInt({ message: 'val.quantityPositive' })
  @Min(1, { message: 'val.quantityPositive' })
  @Max(10000)
  quantity: number;
}

// Onlayn do'kondan mijoz yuboradigan buyurtma
export class PublicOrderDto {
  @Trim()
  @IsString()
  @MinLength(2, { message: 'val.personNameRequired' })
  @MaxLength(80)
  customerName: string;

  @Trim()
  @IsString()
  @Matches(/^\+?[\d\s()-]{7,20}$/, { message: 'val.phoneInvalid' })
  phone: string;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(300)
  note?: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'online.emptyCart' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PublicOrderItemDto)
  items: PublicOrderItemDto[];
}

export class RejectOnlineDto {
  @IsOptional()
  @EmptyToNull()
  @Trim()
  @IsString()
  @MaxLength(200)
  reason?: string | null;
}

export class OnlineQueryDto {
  @IsOptional()
  @IsIn(['NEW', 'ACCEPTED', 'REJECTED'])
  status?: 'NEW' | 'ACCEPTED' | 'REJECTED';
}
