import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderStatus, StockMovementType } from '../../generated/prisma/client';

const orderInclude = {
  customer: true,
  items: { include: { product: { include: { unit: true } } } },
} as const;

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
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  async create(dto: CreateOrderDto, userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');

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
        if (!product) throw new NotFoundException('Mahsulot topilmadi');
        if (Number(product.quantity) < quantity) {
          throw new BadRequestException(
            `"${product.name}" uchun omborda yetarli qoldiq yo'q (mavjud: ${Number(product.quantity)})`,
          );
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
            quantity: item.quantity,
            note: `Buyurtma #${created.id.slice(-6)}`,
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
      // Bekor qilinganda tovarlar omborga qaytadi, qayta tiklanganda yana chiqariladi
      if (cancelling || restoring) {
        for (const item of order.items) {
          if (restoring) {
            const product = await tx.product.findUniqueOrThrow({
              where: { id: item.productId },
            });
            if (Number(product.quantity) < item.quantity) {
              throw new BadRequestException(
                `"${product.name}" uchun omborda yetarli qoldiq yo'q`,
              );
            }
          }
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: cancelling
                ? { increment: item.quantity }
                : { decrement: item.quantity },
            },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: cancelling ? StockMovementType.IN : StockMovementType.OUT,
              quantity: item.quantity,
              note: `Buyurtma #${order.id.slice(-6)} ${cancelling ? 'bekor qilindi' : 'qayta tiklandi'}`,
              userId,
            },
          });
        }
      }
      await tx.order.update({ where: { id }, data: { status: dto.status } });
    });

    return this.findOne(id);
  }
}
