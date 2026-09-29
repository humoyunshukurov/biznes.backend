import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvoiceStatus,
  MovementKind,
  OrderStatus,
  StockMovementType,
} from '../../generated/prisma/client';
import { PosSaleDto } from './pos.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;
// Yaxlitlash farqi uchun ruxsat etilgan chetlanish
const EPS = 0.05;

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  async sale(dto: PosSaleDto, userId: string) {
    // Kassada savdo faqat ochiq smenada
    const shift = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
    });
    if (!shift) throw badRequest('pos.shiftClosed');

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw notFound('customer.notFound');

    const merged = new Map<string, number>();
    for (const i of dto.items)
      merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity);
    const products = await this.prisma.product.findMany({
      where: { id: { in: [...merged.keys()] } },
    });

    const lines = [...merged.entries()].map(([productId, quantity]) => {
      const p = products.find((x) => x.id === productId);
      if (!p) throw notFound('product.notFound');
      if (Number(p.quantity) < quantity) {
        throw badRequest('stock.notEnough', {
          name: p.name,
          available: Number(p.quantity),
        });
      }
      const price =
        dto.priceList === 'WHOLESALE' && p.wholesalePrice !== null
          ? Number(p.wholesalePrice)
          : Number(p.price);
      return { product: p, quantity, price };
    });

    const subtotal = round2(
      lines.reduce((s, l) => s + l.price * l.quantity, 0),
    );
    const discount = round2(dto.discount ?? 0);
    if (discount > subtotal + EPS) throw badRequest('pos.discountTooBig');
    // Chegirma narxlarga mutanosib taqsimlanadi: qaytarishda ham to'g'ri summa qaytadi
    const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
    const items = lines.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
      price: round2(l.price * factor),
      costPrice: l.product.costPrice,
    }));
    const total = round2(items.reduce((s, i) => s + i.price * i.quantity, 0));

    const payments = dto.payments.map((p) => ({
      ...p,
      amount: round2(p.amount),
    }));
    let paid = round2(payments.reduce((s, p) => s + p.amount, 0));
    if (paid > total + EPS) throw badRequest('pos.overpaid', { total });
    if (paid > total && payments.length) {
      // Tiyinlardagi yaxlitlash farqi oxirgi to'lovdan olinadi
      const last = payments[payments.length - 1];
      last.amount = round2(last.amount - (paid - total));
      paid = total;
    }
    const debt = round2(total - paid);

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          userId,
          status: OrderStatus.COMPLETED,
          totalAmount: total,
          discount,
          note: dto.note ?? null,
          items: { create: items },
        },
      });
      for (const item of items) {
        // Bir vaqtda sotilganda qoldiq manfiyga tushmasligi uchun shartli ayirish
        const updated = await tx.product.updateMany({
          where: { id: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          const p = lines.find((l) => l.product.id === item.productId)!.product;
          throw badRequest('stock.notEnough', {
            name: p.name,
            available: Number(p.quantity),
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.OUT,
            kind: MovementKind.ORDER,
            quantity: item.quantity,
            orderId: order.id,
            userId,
          },
        });
      }
      const invoice = await tx.invoice.create({
        data: {
          orderId: order.id,
          customerId: customer.id,
          amount: total,
          status:
            debt <= 0.001
              ? InvoiceStatus.PAID
              : paid > 0
                ? InvoiceStatus.PARTIALLY_PAID
                : InvoiceStatus.UNPAID,
        },
      });
      for (const p of payments.filter((x) => x.amount > 0)) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: p.amount,
            method: p.method,
            userId,
          },
        });
      }
      return order;
    });

    return {
      orderId: result.id,
      number: result.id.slice(-6),
      createdAt: result.createdAt,
      subtotal,
      discount,
      total,
      paid,
      debt,
    };
  }
}
