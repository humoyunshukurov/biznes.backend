import { Injectable } from '@nestjs/common';
import { CashService, type LedgerEntry } from '../cash/cash.service';
import { badRequest } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CashType, PaymentMethod, Prisma } from '../../generated/prisma/client';
import { CloseShiftDto, OpenShiftDto } from './shift.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;
const toNum = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER'];

type ShiftRow = Prisma.ShiftGetPayload<object>;

export interface DeskRow {
  method: PaymentMethod;
  opening: number;
  income: number;
  expense: number;
  expected: number;
  actual?: number | null;
}

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

  private async openShift(userId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { userId, closedAt: null },
      include: { user: { select: { fullName: true } } },
    });
    if (!shift) throw badRequest('shift.noneOpen');
    return shift;
  }

  // Kassalar bo'yicha: smena boshidagi qoldiq, keldi, chiqdi va kutilgan summa
  private desks(
    shift: ShiftRow,
    start: Record<PaymentMethod, number>,
    entries: LedgerEntry[],
  ): DeskRow[] {
    return METHODS.map((method) => {
      let income = 0;
      let expense = 0;
      for (const e of entries) {
        if (e.direction === CashType.TRANSFER) {
          if (e.method === method) expense += e.amount;
          if (e.toMethod === method) income += e.amount;
        } else if (e.method === method) {
          if (e.direction === CashType.IN) income += e.amount;
          else expense += e.amount;
        }
      }
      // Naqd kassada ochilishda sanalgan pul boshlang'ich qoldiq hisoblanadi
      const opening =
        method === 'CASH' && shift.openingCash !== null
          ? Number(shift.openingCash)
          : start[method];
      return {
        method,
        opening: round2(opening),
        income: round2(income),
        expense: round2(expense),
        expected: round2(opening + income - expense),
      };
    });
  }

  // Kirim/xarajat toifalar bo'yicha (o'tkazmalar kirmaydi)
  private breakdown(entries: LedgerEntry[], direction: CashType) {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.direction !== direction) continue;
      const key =
        e.category === 'EXPENSE' && e.categoryText
          ? e.categoryText
          : (e.category ?? 'OTHER');
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    const items = [...map.entries()]
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount);
    return {
      total: round2(items.reduce((s, i) => s + i.amount, 0)),
      items,
    };
  }

  // Ochiq smena hisoboti (X-hisobot va yopish oynasi uchun)
  async report(userId: string) {
    const shift = await this.openShift(userId);
    const now = new Date(Date.now() + 1000);
    const [start, entries, orders, returns] = await Promise.all([
      this.cash.balancesBefore(shift.openedAt),
      this.cash.entries(shift.openedAt, now),
      this.prisma.order.findMany({
        where: {
          userId,
          createdAt: { gte: shift.openedAt, lte: now },
          status: { not: 'CANCELLED' },
        },
        select: {
          totalAmount: true,
          invoices: {
            select: {
              amount: true,
              payments: { where: { kind: 'POS' }, select: { amount: true } },
            },
          },
        },
      }),
      this.prisma.customerReturn.aggregate({
        where: { userId, createdAt: { gte: shift.openedAt, lte: now } },
        _sum: { total: true },
      }),
    ]);

    const gross = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const sales = round2(gross - Number(returns._sum.total ?? 0));
    // Kassada savdo paytida to'lanmay qolgan qism - qarzga sotilgan
    const debtSales = round2(
      orders.reduce(
        (s, o) =>
          s +
          o.invoices.reduce(
            (is, i) =>
              is +
              Math.max(
                0,
                Number(i.amount) -
                  i.payments.reduce((ps, p) => ps + Number(p.amount), 0),
              ),
            0,
          ),
        0,
      ),
    );

    return {
      shift: {
        id: shift.id,
        number: shift.number,
        openedAt: shift.openedAt,
        cashier: shift.user.fullName,
      },
      stats: {
        checks: orders.length,
        sales,
        debtSales,
        avgCheck: orders.length ? round2(gross / orders.length) : 0,
      },
      income: this.breakdown(entries, CashType.IN),
      expense: this.breakdown(entries, CashType.OUT),
      desks: this.desks(shift, start, entries),
    };
  }

  async close(userId: string, dto: CloseShiftDto) {
    const shift = await this.openShift(userId);
    const report = await this.report(userId);
    const counts: Partial<Record<PaymentMethod, number>> = { ...dto.counts };
    if (counts.CASH === undefined && dto.closingCash !== undefined) {
      counts.CASH = dto.closingCash;
    }
    const desks = report.desks.map((d) => ({
      ...d,
      actual: counts[d.method] ?? null,
    }));

    // O'tkazmalar: bir xil kassaga emas va sanalgan (yoki kutilgan) summadan oshmasin
    const transfers = dto.transfers ?? [];
    const out = new Map<PaymentMethod, number>();
    for (const t of transfers) {
      if (t.from === t.to) throw badRequest('cash.transferAccounts');
      out.set(t.from, (out.get(t.from) ?? 0) + t.amount);
    }
    for (const [method, amount] of out) {
      const d = desks.find((x) => x.method === method)!;
      const available = d.actual ?? d.expected;
      if (amount > available + 0.001) {
        throw badRequest('cash.insufficient', { available });
      }
    }

    const closedAt = new Date();
    const label = `№${shift.number}`;
    await this.prisma.$transaction(async (tx) => {
      // Farq kassaga tuzatish sifatida yoziladi: tizimdagi qoldiq haqiqiy pulga tenglashadi
      for (const d of desks) {
        if (d.actual === null) continue;
        const diff = round2(d.actual - d.expected);
        if (Math.abs(diff) < 0.01) continue;
        await tx.cashTransaction.create({
          data: {
            type: diff > 0 ? CashType.IN : CashType.OUT,
            amount: Math.abs(diff),
            method: d.method,
            category: diff > 0 ? 'SHIFT_SURPLUS' : 'SHIFT_SHORTAGE',
            description: label,
            userId,
            createdAt: closedAt,
          },
        });
      }
      for (const t of transfers) {
        await tx.cashTransaction.create({
          data: {
            type: CashType.TRANSFER,
            amount: round2(t.amount),
            method: t.from,
            toMethod: t.to,
            description: label,
            userId,
            createdAt: closedAt,
          },
        });
      }
      const cashDesk = desks.find((d) => d.method === 'CASH')!;
      await tx.shift.update({
        where: { id: shift.id },
        data: {
          closedAt,
          expectedCash: cashDesk.expected,
          closingCash: cashDesk.actual,
          counts: desks,
        },
      });
    });
    const closed = await this.prisma.shift.findUniqueOrThrow({
      where: { id: shift.id },
    });
    return {
      shift: await this.withSummary(closed),
      report: { ...report, desks },
    };
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
