import { Injectable } from '@nestjs/common';
import { badRequest, forbidden, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  CashType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
} from '../../generated/prisma/client';
import {
  CLIENT,
  CreateCashCategoryDto,
  CreateCashDto,
  LedgerQueryDto,
  PRESET_CATEGORIES,
  SUPPLIER,
} from './cash.dto';

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
  async entries(from: Date, to: Date): Promise<LedgerEntry[]> {
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
        // Kassadagi savdo to'lovi - savdo tushumi, qolganlari - mijoz qarzini to'lashi
        category: p.kind === 'POS' ? 'SALES' : 'CUSTOMER_PAYMENT',
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
        deletable: true,
      })),
      ...supplierPayments.map((s) => ({
        id: `supplier:${s.id}`,
        ref: s.id.slice(-6),
        date: s.paidAt,
        cashier: s.user.fullName,
        source: 'SUPPLIER_PAYMENT' as const,
        // Manfiy to'lov - yetkazib beruvchi qaytargan pul (kirim)
        direction: num(s.amount) < 0 ? CashType.IN : CashType.OUT,
        amount: Math.abs(num(s.amount)),
        method: s.method,
        toMethod: null,
        category: num(s.amount) < 0 ? 'SUPPLIER_REFUND' : 'SUPPLIER_PAYMENT',
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

  // Foydalanuvchi qo'shgan toifalar va avval ishlatilgan erkin matnli toifalar
  async categories() {
    const [custom, expenseCats, manualCats] = await Promise.all([
      this.prisma.cashCategory.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.expense.findMany({
        select: { category: true },
        distinct: ['category'],
        take: 300,
      }),
      this.prisma.cashTransaction.findMany({
        where: { category: { not: null }, type: { not: CashType.TRANSFER } },
        select: { category: true, type: true },
        distinct: ['category', 'type'],
        take: 300,
      }),
    ]);
    type Item = { id: string | null; name: string };
    const result: Record<'IN' | 'OUT', Item[]> = { IN: [], OUT: [] };
    const seen = { IN: new Set<string>(), OUT: new Set<string>() };
    const add = (type: 'IN' | 'OUT', name: string, id: string | null) => {
      if (PRESET_CATEGORIES[type].includes(name) || seen[type].has(name))
        return;
      seen[type].add(name);
      result[type].push({ id, name });
    };
    for (const c of custom)
      add(c.type === CashType.IN ? 'IN' : 'OUT', c.name, c.id);
    for (const e of expenseCats) add('OUT', e.category, null);
    for (const m of manualCats)
      add(m.type === CashType.IN ? 'IN' : 'OUT', m.category!, null);
    for (const k of ['IN', 'OUT'] as const)
      result[k].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  createCategory(dto: CreateCashCategoryDto) {
    const type = dto.type === 'IN' ? CashType.IN : CashType.OUT;
    return this.prisma.cashCategory.upsert({
      where: { type_name: { type, name: dto.name } },
      create: { type, name: dto.name },
      update: {},
    });
  }

  async removeCategory(id: string, role: string) {
    if (role !== 'ADMIN') throw forbidden('auth.adminOnly');
    const found = await this.prisma.cashCategory.findUnique({ where: { id } });
    if (!found) throw notFound('cash.categoryNotFound');
    // Oldingi yozuvlar o'z toifa matnini saqlab qoladi
    await this.prisma.cashCategory.delete({ where: { id } });
    return { ok: true };
  }

  // Mijozlar va ularning ochiq hisob-fakturalar bo'yicha qarzi
  async customers() {
    const customers = await this.prisma.customer.findMany({
      orderBy: { name: 'asc' },
      include: {
        invoices: {
          where: {
            status: {
              in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID],
            },
          },
          select: { amount: true, payments: { select: { amount: true } } },
        },
      },
    });
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      note: c.note,
      debt: round2(
        c.invoices.reduce(
          (s, i) =>
            s +
            num(i.amount) -
            i.payments.reduce((ps, p) => ps + num(p.amount), 0),
          0,
        ),
      ),
    }));
  }

  // Sana kelajakda bo'lishi mumkin emas (bir necha daqiqa farqqa ruxsat)
  private resolveDate(date?: string | null) {
    if (!date) return new Date();
    const d = new Date(date);
    if (d.getTime() > Date.now() + 5 * 60 * 1000) {
      throw badRequest('cash.futureDate');
    }
    return d;
  }

  private async ensureBalance(method: PaymentMethod, amount: number) {
    const balances = await this.balances();
    const available = balances[method];
    if (amount > available + 0.001) {
      throw badRequest('cash.insufficient', { available });
    }
  }

  private async requireSupplier(id?: string | null) {
    if (!id) throw badRequest('cash.supplierRequired');
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw notFound('supplier.notFound');
    return s.id;
  }

  async create(dto: CreateCashDto, userId: string) {
    const at = this.resolveDate(dto.date);
    const description = dto.description ?? null;

    if (dto.type === CashType.TRANSFER) {
      if (!dto.toMethod || dto.toMethod === dto.method) {
        throw badRequest('cash.transferAccounts');
      }
      await this.ensureBalance(dto.method, dto.amount);
      const t = await this.prisma.cashTransaction.create({
        data: {
          type: CashType.TRANSFER,
          amount: dto.amount,
          method: dto.method,
          toMethod: dto.toMethod,
          description,
          userId,
          createdAt: at,
        },
      });
      return { id: `manual:${t.id}` };
    }

    const category = dto.category;
    if (!category) throw badRequest('val.categoryRequired');

    if (dto.type === CashType.IN) {
      if (category === CLIENT) return this.customerPayment(dto, at, userId);
      if (category === SUPPLIER) {
        const supplierId = await this.requireSupplier(dto.supplierId);
        // Yetkazib beruvchi pul qaytardi: manfiy to'lov uning oldidagi hisobni tiklaydi
        const p = await this.prisma.supplierPayment.create({
          data: {
            supplierId,
            amount: -dto.amount,
            method: dto.method,
            note: description,
            paidAt: at,
            userId,
          },
        });
        return { id: `supplier:${p.id}` };
      }
      const t = await this.prisma.cashTransaction.create({
        data: {
          type: CashType.IN,
          amount: dto.amount,
          method: dto.method,
          category,
          description,
          userId,
          createdAt: at,
        },
      });
      return { id: `manual:${t.id}` };
    }

    // Chiqim: hisobda yetarli pul bo'lishi shart
    await this.ensureBalance(dto.method, dto.amount);
    if (category === SUPPLIER) {
      const supplierId = await this.requireSupplier(dto.supplierId);
      const p = await this.prisma.supplierPayment.create({
        data: {
          supplierId,
          amount: dto.amount,
          method: dto.method,
          note: description,
          paidAt: at,
          userId,
        },
      });
      return { id: `supplier:${p.id}` };
    }
    const e = await this.prisma.expense.create({
      data: {
        category,
        amount: dto.amount,
        method: dto.method,
        description,
        date: at,
        userId,
      },
    });
    return { id: `expense:${e.id}` };
  }

  // Mijoz to'lovi: ochiq hisob-fakturalarga eskisidan boshlab taqsimlanadi
  private async customerPayment(dto: CreateCashDto, at: Date, userId: string) {
    if (!dto.customerId) throw badRequest('cash.customerRequired');
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw notFound('customer.notFound');

    return this.prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: {
          customerId: customer.id,
          status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
        },
        include: { payments: { select: { amount: true } } },
        orderBy: { createdAt: 'asc' },
      });
      const open = invoices
        .map((i) => ({
          id: i.id,
          remaining: round2(
            num(i.amount) - i.payments.reduce((s, p) => s + num(p.amount), 0),
          ),
        }))
        .filter((i) => i.remaining > 0.001);
      const debt = round2(open.reduce((s, i) => s + i.remaining, 0));
      if (debt <= 0) throw badRequest('cash.customerNoDebt');
      if (dto.amount > debt + 0.001) {
        throw badRequest('cash.overDebt', { debt });
      }

      let left = dto.amount;
      const ids: string[] = [];
      for (const inv of open) {
        if (left <= 0.001) break;
        const part = round2(Math.min(left, inv.remaining));
        const p = await tx.payment.create({
          data: {
            invoiceId: inv.id,
            amount: part,
            method: dto.method,
            paidAt: at,
            note: dto.description ?? null,
            userId,
          },
        });
        ids.push(p.id);
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            status:
              part >= inv.remaining - 0.001
                ? InvoiceStatus.PAID
                : InvoiceStatus.PARTIALLY_PAID,
          },
        });
        left = round2(left - part);
      }
      return { id: `payment:${ids[0]}`, payments: ids.length };
    });
  }

  // Qo'lda kiritilgan yozuv yoki xarajatni o'chirish (faqat admin)
  async remove(ref: string, role: string) {
    if (role !== 'ADMIN') throw forbidden('auth.adminOnly');
    const [kind, id] = ref.includes(':') ? ref.split(':') : ['manual', ref];
    if (kind === 'expense') {
      const e = await this.prisma.expense.findUnique({ where: { id } });
      if (!e) throw notFound('cash.notFound');
      await this.prisma.expense.delete({ where: { id } });
      return { ok: true };
    }
    if (kind !== 'manual') throw badRequest('cash.notDeletable');
    const t = await this.prisma.cashTransaction.findUnique({ where: { id } });
    if (!t) throw notFound('cash.notFound');
    await this.prisma.cashTransaction.delete({ where: { id } });
    return { ok: true };
  }
}
