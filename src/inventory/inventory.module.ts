import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';

@Module({
  controllers: [CategoryController, ProductController, StockMovementController],
  providers: [CategoryService, ProductService, StockMovementService],
})
export class InventoryModule {}
