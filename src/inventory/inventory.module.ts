import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';
import {
  BrandController,
  ProductTypeController,
  UnitController,
} from './catalog.controller';
import { CatalogService } from './catalog.service';
import { UploadsController } from '../uploads/uploads.controller';

@Module({
  controllers: [
    CategoryController,
    ProductController,
    StockMovementController,
    UnitController,
    BrandController,
    ProductTypeController,
    UploadsController,
  ],
  providers: [
    CategoryService,
    ProductService,
    StockMovementService,
    CatalogService,
  ],
})
export class InventoryModule {}
