import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderDto,
  CreateReturnDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import {
  MovementKind,
  OrderStatus,
  Prisma,
  StockMovementType,
} from '../../generated/prisma/client';

const orderInclude = {
  customer: true,
  items: { include: { product: { include: { unit: true } } } },
  returns: { include: { items: true }, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

type Tx = Prisma.TransactionClient;

// Buyurtmadagi har bir mahsulotdan qancha qaytarilgani
async function returnedByProduct(tx: Tx | PrismaService, orderId: string) {
  const rows = await tx.customerReturnItem.groupBy({
    by: ['productId'],
    where: { return: { orderId } },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
}

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw notFound('order.notFound');
    return order;
  }

  async create(dto: CreateOrderDto, userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw notFound('customer.notFound');

    // Bir mahsulot bir necha qatorda tanlansa, miqdorlar qo'shiladi
    const merged = new Map<string, number>();
    for (const item of dto.items)
      merged.set(
        item.productId,
        (merged.get(item.productId) ?? 0) + item.quantity,
      );

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...merged.keys()] } },
    });

    let totalAmount = 0;
    const orderItemsData = [...merged.entries()].map(
      ([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) throw notFound('product.notFound');
        if (Number(product.quantity) < quantity) {
          throw badRequest('stock.notEnough', {
            name: product.name,
            available: Number(product.quantity),
          });
        }
        totalAmount += Number(product.price) * quantity;
        return {
          productId: product.id,
          quantity,
          price: product.price,
          costPrice: product.costPrice,
        };
      },
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId: dto.customerId,
          userId,
          totalAmount,
          items: { create: orderItemsData },
        },
      });

      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.OUT,
            kind: MovementKind.ORDER,
            quantity: item.quantity,
            orderId: created.id,
            userId,
          },
        });
      }

      return created;
    });

    return this.findOne(order.id);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, userId: string) {
    const order = await this.findOne(id);
    if (order.status === dto.status) return order;

    const cancelling = dto.status === OrderStatus.CANCELLED;
    const restoring = order.status === OrderStatus.CANCELLED;

    await this.prisma.$transaction(async (tx) => {
      // Bekor qilinganda qaytarilmagan qism omborga qaytadi, qayta tiklanganda yana chiqariladi
      if (cancelling || restoring) {
        const returned = await returnedByProduct(tx, id);
        for (const item of order.items) {
          const qty = item.quantity - (returned.get(item.productId) ?? 0);
          if (qty <= 0) continue;
          if (restoring) {
            const product = await tx.product.findUniqueOrThrow({
              where: { id: item.productId },
            });
            if (Number(product.quantity) < qty) {
              throw badRequest('stock.notEnough', {
                name: product.name,
                available: Number(product.quantity),
              });
            }
          }
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: cancelling ? { increment: qty } : { decrement: qty },
            },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: cancelling ? StockMovementType.IN : StockMovementType.OUT,
              kind: cancelling
                ? MovementKind.ORDER_CANCEL
                : MovementKind.ORDER_RESTORE,
              quantity: qty,
              orderId: id,
              userId,
            },
          });
        }
      }
      await tx.order.update({ where: { id }, data: { status: dto.status } });
    });

    return this.findOne(id);
  }

  // Mijoz tovarni qaytardi: omborga kirim, summasi savdodan ayiriladi
  async createReturn(orderId: string, dto: CreateReturnDto, userId: string) {
    const order = await this.findOne(orderId);
    if (order.status === OrderStatus.CANCELLED) {
      throw badRequest('return.cancelledOrder');
    }

    const requested = new Map<string, number>();
    for (const item of dto.items)
      requested.set(
        item.productId,
        (requested.get(item.productId) ?? 0) + item.quantity,
      );

    const returned = await returnedByProduct(this.prisma, orderId);
    let total = 0;
    const lines = [...requested.entries()].map(([productId, quantity]) => {
      const item = order.items.find((i) => i.productId === productId);
      if (!item) throw badRequest('return.notInOrder');
      const available = item.quantity - (returned.get(productId) ?? 0);
      if (quantity > available) {
        throw badRequest('return.tooMany', {
          name: item.product.name,
          available,
        });
      }
      total += Number(item.price) * quantity;
      return {
        productId,
        quantity,
        price: item.price,
        costPrice: item.costPrice,
      };
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const ret = await tx.customerReturn.create({
        data: {
          orderId,
          customerId: order.customerId,
          userId,
          total,
          note: dto.note?.trim() || null,
          items: { create: lines },
        },
      });
      for (const line of lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { quantity: { increment: line.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            type: StockMovementType.IN,
            kind: MovementKind.CUSTOMER_RETURN,
            quantity: line.quantity,
            orderId,
            note: dto.note?.trim() || null,
            userId,
          },
        });
      }
      return ret;
    });

    return this.prisma.customerReturn.findUniqueOrThrow({
      where: { id: created.id },
      include: { items: true },
    });
  }

  findReturns() {
    return this.prisma.customerReturn.findMany({
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true } },
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
