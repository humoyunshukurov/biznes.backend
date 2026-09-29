import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../common/transforms';

export class CompanySettingsDto {
  @IsOptional() @Trim() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(20) inn?: string;
}

export class ReceiptSettingsDto {
  @IsOptional() @Trim() @IsString() @MaxLength(200) header?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(300) footer?: string;
  @IsOptional() @IsIn([58, 80]) width?: 58 | 80;
  @IsOptional() @IsBoolean() showCustomer?: boolean;
  @IsOptional() @IsBoolean() showCashier?: boolean;
}

export class PrinterSettingsDto {
  @IsOptional() @IsIn(['58x40', '58x30', '40x30']) labelSize?: string;
  @IsOptional() @IsBoolean() labelShowName?: boolean;
  @IsOptional() @IsBoolean() labelShowPrice?: boolean;
}

export class SupportSettingsDto {
  @IsOptional() @Trim() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(100) telegram?: string;
}

// Onlayn do'kon: mijozlar havola orqali katalogni ko'rib buyurtma beradi
export class OnlineSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() showStock?: boolean;
  @IsOptional() @Trim() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(300) delivery?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1_000_000_000) minOrder?: number;
}

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanySettingsDto)
  company?: CompanySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptSettingsDto)
  receipt?: ReceiptSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrinterSettingsDto)
  printer?: PrinterSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SupportSettingsDto)
  support?: SupportSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnlineSettingsDto)
  online?: OnlineSettingsDto;
}
