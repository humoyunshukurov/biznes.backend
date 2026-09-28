import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { NamedDto, UnitDto } from './dto/catalog.dto';

@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitController {
  constructor(private catalog: CatalogService) {}

  @Get()
  findAll() {
    return this.catalog.units();
  }

  @Post()
  create(@Body() dto: UnitDto) {
    return this.catalog.createUnit(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UnitDto) {
    return this.catalog.updateUnit(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalog.removeUnit(id);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandController {
  constructor(private catalog: CatalogService) {}

  @Get()
  findAll() {
    return this.catalog.brands();
  }

  @Post()
  create(@Body() dto: NamedDto) {
    return this.catalog.createBrand(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: NamedDto) {
    return this.catalog.updateBrand(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalog.removeBrand(id);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('product-types')
export class ProductTypeController {
  constructor(private catalog: CatalogService) {}

  @Get()
  findAll() {
    return this.catalog.productTypes();
  }

  @Post()
  create(@Body() dto: NamedDto) {
    return this.catalog.createProductType(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalog.removeProductType(id);
  }
}
