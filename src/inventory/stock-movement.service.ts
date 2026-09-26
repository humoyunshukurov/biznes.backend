import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/stock-movement.dto';
import { StockMovementType } from '../../generated/prisma/client';

@Injectable()
export class StockMovementService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.stockMovement.findMany({
      include: { product: true, user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateStockMovementDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.type === StockMovementType.OUT && product.quantity < dto.quantity) {
      throw new BadRequestException('Not enough stock');
    }

    const delta = dto.type === StockMovementType.IN ? dto.quantity : -dto.quantity;

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: { ...dto, userId },
      }),
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { quantity: { increment: delta } },
      }),
    ]);

    return movement;
  }
}
