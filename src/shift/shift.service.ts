import { Injectable } from '@nestjs/common';
import { badRequest } from '../i18n/app-error';
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

  // Smenalar tarixi: ADMIN hammani, boshqalar faqat o'zinikini ko'radi
  async history(userId: string, role: string) {
    const shifts = await this.prisma.shift.findMany({
      where: role === 'ADMIN' ? {} : { userId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
    return Promise.all(
      shifts.map(async (s) => ({
        ...s,
        ...(await this.summary(s.userId, s.openedAt, s.closedAt ?? new Date())),
      })),
    );
  }

  async open(userId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
    });
    if (existing) throw badRequest('shift.alreadyOpen');
    await this.prisma.shift.create({ data: { userId } });
    return this.current(userId);
  }

  async close(userId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
    });
    if (!existing) throw badRequest('shift.noneOpen');
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

  // Smena davomida shu foydalanuvchi qilgan savdo (qaytarishlarsiz) va xarajatlar
  private async summary(userId: string, from: Date, to: Date) {
    const range = { gte: from, lte: to };
    const [orders, returns, expenses] = await Promise.all([
      this.prisma.order.aggregate({
        where: { userId, createdAt: range, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.customerReturn.aggregate({
        where: { userId, createdAt: range },
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, createdAt: range },
        _sum: { amount: true },
      }),
    ]);
    const returnsTotal = Number(returns._sum.total ?? 0);
    return {
      ordersCount: orders._count,
      salesTotal: Number(orders._sum.totalAmount ?? 0) - returnsTotal,
      returnsTotal,
      expensesTotal: Number(expenses._sum.amount ?? 0),
    };
  }
}
