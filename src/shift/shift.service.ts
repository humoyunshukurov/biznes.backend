import { Injectable } from '@nestjs/common';
import { CashService } from '../cash/cash.service';
import { badRequest } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CloseShiftDto, OpenShiftDto } from './shift.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;
const toNum = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

type ShiftRow = Prisma.ShiftGetPayload<object>;

@Injectable()
export class ShiftService {
  constructor(
    private prisma: PrismaService,
    private cash: CashService,
  ) {}

  async current(userId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });
    if (!shift) return { shift: null };
    return { shift: await this.withSummary(shift) };
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
        ...(await this.withSummary(s)),
        user: s.user,
      })),
    );
  }

  async open(userId: string, dto: OpenShiftDto) {
    const existing = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
    });
    if (existing) throw badRequest('shift.alreadyOpen');
    const openingCash =
      dto.openingCash ?? Math.max(0, (await this.cash.balances()).CASH);
    await this.prisma.shift.create({ data: { userId, openingCash } });
    return this.current(userId);
  }

  async close(userId: string, dto: CloseShiftDto) {
    const existing = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
    });
    if (!existing) throw badRequest('shift.noneOpen');
    const closedAt = new Date();
    const expectedCash = await this.expectedCash(existing, closedAt);
    const shift = await this.prisma.shift.update({
      where: { id: existing.id },
      data: { closedAt, expectedCash, closingCash: dto.closingCash },
    });
    return { shift: await this.withSummary(shift) };
  }

  // Kutilgan naqd = ochilishdagi naqd + smena davomidagi naqd kirim - naqd chiqim
  private async expectedCash(shift: ShiftRow, until: Date) {
    const [start, end] = await Promise.all([
      this.cash.balancesBefore(shift.openedAt),
      this.cash.balancesBefore(until),
    ]);
    return round2(Number(shift.openingCash ?? 0) + (end.CASH - start.CASH));
  }

  private async withSummary(shift: ShiftRow) {
    const to = shift.closedAt ?? new Date();
    const expected =
      shift.closedAt && shift.expectedCash !== null
        ? Number(shift.expectedCash)
        : await this.expectedCash(shift, to);
    const closing = toNum(shift.closingCash);
    return {
      ...shift,
      openingCash: toNum(shift.openingCash),
      expectedCash: expected,
      closingCash: closing,
      cashDifference: closing === null ? null : round2(closing - expected),
      ...(await this.summary(shift.userId, shift.openedAt, to)),
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
