import { IsNumber, IsOptional, Min } from 'class-validator';

export class OpenShiftDto {
  // Kassada sanalgan naqd pul (berilmasa hisobdagi naqd qoldiq olinadi)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  openingCash?: number;
}

export class CloseShiftDto {
  // Smena oxirida kassada sanalgan naqd pul
  @IsNumber()
  @Min(0, { message: 'val.priceNotNegative' })
  closingCash: number;
}
