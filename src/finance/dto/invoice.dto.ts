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
  @Min(0.01, { message: "Summa 0 dan katta bo'lishi kerak" })
  amount: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
