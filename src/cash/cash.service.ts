import { Injectable } from '@nestjs/common';
import { badRequest, forbidden, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CashType, PaymentMethod, Prisma } from '../../generated/prisma/client';
import { CreateCashDto, LedgerQueryDto } from './cash.dto';

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER'];
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (d: Prisma.Decimal | null | undefined) => Number(d ?? 0);

export type Balances = Record<PaymentMethod, number>;

export type LedgerSource =
  'MANUAL' | 'PAYMENT' | 'EXPENSE' | 'SUPPLIER_PAYMENT' | 'REFUND';

export interface LedgerEntry {
  id: string;
  ref: string;
  date: Date;
  cashier: string | null;
  source: LedgerSource;
  // IN - kirim, OUT - chiqim, TRANSFER - hisoblar orasida
  direction: CashType;
  amount: number;
  method: PaymentMethod;
  toMethod: PaymentMethod | null;
  // Tayyor kod (tarjima qilinadi) va/yoki erkin matn
  category: string | null;
  categoryText: string | null;
  description: string | null;
  deletable: boolean;
}

const emptyBalances = (): Balances => ({ CASH: 0, CARD: 0, BANK_TRANSFER: 0 });

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  // Berilgan vaqtgacha (kirmaydi) har bir hisobdagi qoldiq
  async balancesBefore(date: Date): Promise<Balances> {
    const [payments, expenses, supplierPayments, refunds, manual] =
      await Promise.all([
        this.prisma.payment.groupBy({
          by: ['method'],
          where: { paidAt: { lt: date } },
          _sum: { amount: true },
        }),
        this.prisma.expense.groupBy({
          by: ['method'],
          where: { date: { lt: date } },
          _sum: { amount: true },
        }),
        this.prisma.supplierPayment.groupBy({
          by: ['method'],
          where: { paidAt: { lt: date } },
          _sum: { amount: true },
        }),
        this.prisma.customerReturn.groupBy({
          by: ['refundMethod'],
          where: { createdAt: { lt: date } },
          _sum: { total: true },
        }),
        this.prisma.cashTransaction.groupBy({
          by: ['type', 'method', 'toMethod'],
          where: { createdAt: { lt: date } },
          _sum: { amount: true },
        }),
      ]);
    const b = emptyBalances();
    for (const p of payments) b[p.method] += num(p._sum.amount);
    for (const e of expenses) b[e.method] -= num(e._sum.amount);
    for (const s of supplierPayments) b[s.method] -= num(s._sum.amount);
    for (const r of refunds) b[r.refundMethod] -= num(r._sum.total);
    for (const m of manual) {
      const amount = num(m._sum.amount);
      if (m.type === CashType.IN) b[m.method] += amount;
      else if (m.type === CashType.OUT) b[m.method] -= amount;
      else {
        b[m.method] -= amount;
        if (m.toMethod) b[m.toMethod] += amount;
      }
    }
    for (const k of METHODS) b[k] = round2(b[k]);
    return b;
  }

  async balances() {
    const b = await this.balancesBefore(new Date(Date.now() + 1000));
    return { ...b, total: round2(b.CASH + b.CARD + b.BANK_TRANSFER) };
  }

  // Davr ichidagi barcha pul harakatlari (eng yangisi birinchi)
  private async entries(from: Date, to: Date): Promise<LedgerEntry[]> {
    const range = { gte: from, lt: to };
    const [payments, expenses, supplierPayments, refunds, manual] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: { paidAt: range },
          include: {
            user: { select: { fullName: true } },
            invoice: { select: { customer: { select: { name: true } } } },
          },
        }),
        this.prisma.expense.findMany({
          where: { date: range },
          include: { user: { select: { fullName: true } } },
        }),
        this.prisma.supplierPayment.findMany({
          where: { paidAt: range },
          include: {
            user: { select: { fullName: true } },
            supplier: { select: { name: true } },
          },
        }),
        this.prisma.customerReturn.findMany({
          where: { createdAt: range },
          include: {
            user: { select: { fullName: true } },
            customer: { select: { name: true } },
          },
        }),
        this.prisma.cashTransaction.findMany({
          where: { createdAt: range },
          include: { user: { select: { fullName: true } } },
        }),
      ]);

    const rows: LedgerEntry[] = [
      ...payments.map((p) => ({
        id: `payment:${p.id}`,
        ref: p.id.slice(-6),
        date: p.paidAt,
        cashier: p.user?.fullName ?? null,
        source: 'PAYMENT' as const,
        direction: CashType.IN,
        amount: num(p.amount),
        method: p.method,
        toMethod: null,
        category: 'CUSTOMER_PAYMENT',
        categoryText: p.invoice.customer.name,
        description: p.note,
        deletable: false,
      })),
      ...expenses.map((e) => ({
        id: `expense:${e.id}`,
        ref: e.id.slice(-6),
        date: e.date,
        cashier: e.user.fullName,
        source: 'EXPENSE' as const,
        direction: CashType.OUT,
        amount: num(e.amount),
        method: e.method,
        toMethod: null,
        category: 'EXPENSE',
        categoryText: e.category,
        description: e.description,
        deletable: false,
      })),
      ...supplierPayments.map((s) => ({
        id: `supplier:${s.id}`,
        ref: s.id.slice(-6),
        date: s.paidAt,
        cashier: s.user.fullName,
        source: 'SUPPLIER_PAYMENT' as const,
        direction: CashType.OUT,
        amount: num(s.amount),
        method: s.method,
        toMethod: null,
        category: 'SUPPLIER_PAYMENT',
        categoryText: s.supplier.name,
        description: s.note,
        deletable: false,
      })),
      ...refunds.map((r) => ({
        id: `refund:${r.id}`,
        ref: r.id.slice(-6),
        date: r.createdAt,
        cashier: r.user.fullName,
        source: 'REFUND' as const,
        direction: CashType.OUT,
        amount: num(r.total),
        method: r.refundMethod,
        toMethod: null,
        category: 'REFUND',
        categoryText: r.customer.name,
        description: r.note,
        deletable: false,
      })),
      ...manual.map((m) => ({
        id: `manual:${m.id}`,
        ref: String(m.number),
        date: m.createdAt,
        cashier: m.user.fullName,
        source: 'MANUAL' as const,
        direction: m.type,
        amount: num(m.amount),
        method: m.method,
        toMethod: m.toMethod,
        category: m.category,
        categoryText: null,
        description: m.description,
        deletable: true,
      })),
    ];
    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async ledger(q: LedgerQueryDto) {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (!(from < to)) throw badRequest('stats.badRange');
    const account = q.account ?? 'ALL';

    const [before, all] = await Promise.all([
      this.balancesBefore(from),
      this.entries(from, to),
    ]);

    // Tanlangan hisob nuqtai nazaridan: +kirim / -chiqim
    const signed = (e: LedgerEntry) => {
      if (account === 'ALL') {
        if (e.direction === CashType.TRANSFER) return 0;
        return e.direction === CashType.IN ? e.amount : -e.amount;
      }
      if (e.direction === CashType.TRANSFER) {
        if (e.toMethod === account) return e.amount;
        return e.method === account ? -e.amount : 0;
      }
      if (e.method !== account) return 0;
      return e.direction === CashType.IN ? e.amount : -e.amount;
    };

    const rows = all.filter(
      (e) =>
        account === 'ALL' || e.method === account || e.toMethod === account,
    );
    let income = 0;
    let expense = 0;
    for (const e of rows) {
      const v = signed(e);
      if (v > 0) income += v;
      else expense -= v;
    }
    const opening =
      account === 'ALL'
        ? before.CASH + before.CARD + before.BANK_TRANSFER
        : before[account];

    return {
      account,
      opening: round2(opening),
      income: round2(income),
      expense: round2(expense),
      closing: round2(opening + income - expense),
      count: rows.length,
      rows: rows.map((e) => ({ ...e, signedAmount: round2(signed(e)) })),
    };
  }

  categories() {
    return this.prisma.cashTransaction
      .findMany({
        where: { category: { not: null } },
        select: { category: true, type: true },
        distinct: ['category', 'type'],
        orderBy: { category: 'asc' },
        take: 200,
      })
      .then((rows) =>
        rows.map((r) => ({ type: r.type, category: r.category! })),
      );
  }

  async create(dto: CreateCashDto, userId: string) {
    if (dto.type === CashType.TRANSFER) {
      if (!dto.toMethod || dto.toMethod === dto.method) {
        throw badRequest('cash.transferAccounts');
      }
    }
    // Chiqim va o'tkazmada hisobda yetarli pul bo'lishi shart
    if (dto.type !== CashType.IN) {
      const balances = await this.balances();
      const available = balances[dto.method];
      if (dto.amount > available + 0.001) {
        throw badRequest('cash.insufficient', { available });
      }
    }
    return this.prisma.cashTransaction.create({
      data: {
        type: dto.type,
        amount: dto.amount,
        method: dto.method,
        toMethod: dto.type === CashType.TRANSFER ? dto.toMethod : null,
        category: dto.type === CashType.TRANSFER ? null : dto.category,
        description: dto.description,
        userId,
      },
    });
  }

  async remove(id: string, role: string) {
    if (role !== 'ADMIN') throw forbidden('auth.adminOnly');
    const tx = await this.prisma.cashTransaction.findUnique({ where: { id } });
    if (!tx) throw notFound('cash.notFound');
    return this.prisma.cashTransaction.delete({ where: { id } });
  }
}
