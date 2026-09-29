import { PartialType } from '@nestjs/mapped-types';
import { EmptyToNull, Trim } from '../../common/transforms';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'val.personNameRequired' })
  name: string;

  @Trim()
  @IsString()
  @MinLength(3, { message: 'val.phoneInvalid' })
  phone: string;

  @IsOptional()
  @EmptyToNull()
  @IsEmail({}, { message: 'val.emailInvalid' })
  email?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  address?: string | null;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
