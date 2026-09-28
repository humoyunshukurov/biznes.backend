import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async current(userId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });
    if (!shift) return { shift: null };
    return {
      shift: {
        ...shift,
        ...(await this.summary(userId, shift.openedAt, new Date())),
      },
    };
  }

  async open(userId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
    });
    if (existing) throw new BadRequestException('Smena allaqachon ochiq');
    await this.prisma.shift.create({ data: { userId } });
    return this.current(userId);
  }

  async close(userId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
    });
    if (!existing) throw new BadRequestException('Ochiq smena topilmadi');
    const closedAt = new Date();
    const shift = await this.prisma.shift.update({
      where: { id: existing.id },
      data: { closedAt },
    });
    return {
      shift: {
        ...shift,
        ...(await this.summary(userId, shift.openedAt, closedAt)),
      },
    };
  }

  // Smena davomida shu foydalanuvchi qilgan savdo va xarajatlar
  private async summary(userId: string, from: Date, to: Date) {
    const range = { gte: from, lte: to };
    const [orders, expenses] = await Promise.all([
      this.prisma.order.aggregate({
        where: { userId, createdAt: range, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { userId, createdAt: range },
        _sum: { amount: true },
      }),
    ]);
    return {
      ordersCount: orders._count,
      salesTotal: Number(orders._sum.totalAmount ?? 0),
      expensesTotal: Number(expenses._sum.amount ?? 0),
    };
  }
}
