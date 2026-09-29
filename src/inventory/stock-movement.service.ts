import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockMovementDto,
  MovementQueryDto,
  RevisionDto,
} from './dto/stock-movement.dto';
import { MovementKind, StockMovementType } from '../../generated/prisma/client';

@Injectable()
export class StockMovementService {
  constructor(private prisma: PrismaService) {}

  findAll(query: MovementQueryDto) {
    return this.prisma.stockMovement.findMany({
      where: query.kind
        ? { kind: { in: query.kind.split(',') as MovementKind[] } }
        : {},
      include: {
        product: { include: { unit: true } },
        user: { select: { id: true, fullName: true } },
        supplier: { select: { id: true, name: true } },
        order: {
          select: { id: true, customer: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async create(dto: CreateStockMovementDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw notFound('product.notFound');

    if (
      dto.type === StockMovementType.OUT &&
      Number(product.quantity) < dto.quantity
    ) {
      throw badRequest('stock.notEnough', {
        name: product.name,
        available: Number(product.quantity),
      });
    }

    const delta =
      dto.type === StockMovementType.IN ? dto.quantity : -dto.quantity;

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: { ...dto, kind: MovementKind.MANUAL, userId },
      }),
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { quantity: { increment: delta } },
      }),
    ]);

    return movement;
  }

  // Reviziya: haqiqiy qoldiq bilan tizimdagi farq kirim/chiqim sifatida yoziladi
  async revision(dto: RevisionDto, userId: string) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    if (ids.length !== dto.items.length) {
      throw badRequest('stock.duplicateProduct');
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });
    if (products.length !== ids.length) {
      throw notFound('product.notFound');
    }
    const byId = new Map(products.map((p) => [p.id, p]));
    const note = dto.note?.trim() || null;

    let changed = 0;
    let surplus = 0;
    let shortage = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const product = byId.get(item.productId)!;
        const delta =
          Math.round((item.actual - Number(product.quantity)) * 1000) / 1000;
        if (delta === 0) continue;
        changed++;
        const cost = Number(product.costPrice ?? 0);
        if (delta > 0) surplus += delta * cost;
        else shortage += -delta * cost;
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: delta > 0 ? StockMovementType.IN : StockMovementType.OUT,
            kind: MovementKind.REVISION,
            quantity: Math.abs(delta),
            note,
            userId,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: item.actual },
        });
      }
    });
    return {
      checked: dto.items.length,
      changed,
      surplus: Math.round(surplus * 100) / 100,
      shortage: Math.round(shortage * 100) / 100,
    };
  }
}
