import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { MovementKind, StockMovementType } from '../../generated/prisma/client';
import {
  CreateSupplierDto,
  SupplierPaymentDto,
  SupplierStockDto,
  UpdateSupplierDto,
} from './suppliers.dto';

export interface SupplierBalance {
  purchased: number;
  returned: number;
  paid: number;
  debt: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // Har bir yetkazib beruvchi uchun: kirim - qaytarish - to'lov = qarzimiz
  async balances(): Promise<Map<string, SupplierBalance>> {
    const [movements, payments] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { supplierId: { not: null } },
        select: {
          supplierId: true,
          type: true,
          quantity: true,
          unitCost: true,
        },
      }),
      this.prisma.supplierPayment.groupBy({
        by: ['supplierId'],
        _sum: { amount: true },
      }),
    ]);

    const map = new Map<string, SupplierBalance>();
    const get = (id: string) => {
      let b = map.get(id);
      if (!b) {
        b = { purchased: 0, returned: 0, paid: 0, debt: 0 };
        map.set(id, b);
      }
      return b;
    };
    for (const m of movements) {
      const sum = Number(m.quantity) * Number(m.unitCost ?? 0);
      const b = get(m.supplierId!);
      if (m.type === StockMovementType.IN) b.purchased += sum;
      else b.returned += sum;
    }
    for (const p of payments)
      get(p.supplierId).paid += Number(p._sum.amount ?? 0);
    for (const b of map.values()) {
      b.purchased = round2(b.purchased);
      b.returned = round2(b.returned);
      b.paid = round2(b.paid);
      b.debt = round2(b.purchased - b.returned - b.paid);
    }
    return map;
  }

  async findAll() {
    const [suppliers, balances] = await Promise.all([
      this.prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
      this.balances(),
    ]);
    const empty: SupplierBalance = {
      purchased: 0,
      returned: 0,
      paid: 0,
      debt: 0,
    };
    return suppliers.map((s) => ({
      ...s,
      balance: balances.get(s.id) ?? empty,
    }));
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw notFound('supplier.notFound');
    return supplier;
  }

  async history(id: string) {
    await this.findOne(id);
    const [movements, payments] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { supplierId: id },
        include: {
          product: { select: { name: true, unit: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      this.prisma.supplierPayment.findMany({
        where: { supplierId: id },
        orderBy: { paidAt: 'desc' },
        take: 300,
      }),
    ]);
    return { movements, payments };
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const [movements, payments] = await Promise.all([
      this.prisma.stockMovement.count({ where: { supplierId: id } }),
      this.prisma.supplierPayment.count({ where: { supplierId: id } }),
    ]);
    if (movements + payments > 0) {
      throw badRequest('supplier.hasRecords');
    }
    return this.prisma.supplier.delete({ where: { id } });
  }

  async receive(id: string, dto: SupplierStockDto, userId: string) {
    await this.findOne(id);
    await this.assertProducts(dto);
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.IN,
            kind: MovementKind.SUPPLIER_IN,
            quantity: item.quantity,
            unitCost: item.unitCost,
            supplierId: id,
            note: dto.note?.trim() || null,
            userId,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { increment: item.quantity },
            ...(dto.updateCostPrice && item.unitCost > 0
              ? { costPrice: item.unitCost }
              : {}),
          },
        });
      }
    });
    return { ok: true };
  }

  async returnGoods(id: string, dto: SupplierStockDto, userId: string) {
    await this.findOne(id);
    const products = await this.assertProducts(dto);
    for (const item of dto.items) {
      const p = products.get(item.productId)!;
      if (Number(p.quantity) < item.quantity) {
        throw badRequest('stock.notEnough', {
          name: p.name,
          available: Number(p.quantity),
        });
      }
    }
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.OUT,
            kind: MovementKind.SUPPLIER_RETURN,
            quantity: item.quantity,
            unitCost: item.unitCost,
            supplierId: id,
            note: dto.note?.trim() || null,
            userId,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    });
    return { ok: true };
  }

  async pay(id: string, dto: SupplierPaymentDto, userId: string) {
    await this.findOne(id);
    return this.prisma.supplierPayment.create({
      data: { supplierId: id, ...dto, userId },
    });
  }

  private async assertProducts(dto: SupplierStockDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });
    if (products.length !== ids.length) {
      throw notFound('product.notFound');
    }
    return new Map(products.map((p) => [p.id, p]));
  }
}
