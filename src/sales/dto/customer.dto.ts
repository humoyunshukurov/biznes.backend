import { PartialType } from '@nestjs/mapped-types';
import { EmptyToNull, Trim } from '../../common/transforms';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: "Ism bo'sh bo'lmasligi kerak" })
  name: string;

  @Trim()
  @IsString()
  @MinLength(3, { message: "Telefon raqami noto'g'ri" })
  phone: string;

  @IsOptional()
  @EmptyToNull()
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  address?: string | null;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
