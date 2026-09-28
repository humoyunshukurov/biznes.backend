import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductService, generateEan13 } from './product.service';
import {
  CreateProductDto,
  ImportProductsDto,
  UpdateProductDto,
} from './dto/product.dto';

const userIdOf = (req: Request) => (req.user as { userId: string }).userId;

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get('generate-barcode')
  generateBarcode() {
    return { barcode: generateEan13() };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @Req() req: Request) {
    return this.productService.create(dto, userIdOf(req));
  }

  @Post('import')
  import(@Body() dto: ImportProductsDto, @Req() req: Request) {
    return this.productService.import(dto, userIdOf(req));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    return this.productService.update(id, dto, userIdOf(req));
  }

  @Patch(':id/favorite')
  toggleFavorite(@Param('id') id: string) {
    return this.productService.toggleFavorite(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
