import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsNumber()
  @Min(0.01, { message: 'val.amountPositive' })
  amount: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
