import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionPaymentDto } from './subscription.dto';

const DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;

// Tariflar: oylik narx (so'm) va chegaralar (null - cheklanmagan)
export const PLANS = [
  { code: 'START', price: 149_000, users: 2, products: 1_000 },
  { code: 'BUSINESS', price: 299_000, users: 5, products: 10_000 },
  { code: 'PREMIUM', price: 499_000, users: null, products: null },
] as const;

// Uzoq muddatga to'lansa chegirma (foizda)
export const PERIODS: Record<number, number> = { 1: 0, 3: 5, 6: 10, 12: 20 };

export type PlanCode = (typeof PLANS)[number]['code'];

const addMonths = (d: Date, months: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
};

export const priceFor = (code: string, months: number) => {
  const plan = PLANS.find((p) => p.code === code);
  if (!plan || !(months in PERIODS)) return null;
  return Math.round((plan.price * months * (100 - PERIODS[months])) / 100);
};

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const [payments, firstUser, users, products] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        orderBy: { periodEnd: 'desc' },
        include: { user: { select: { fullName: true } } },
      }),
      this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }),
      this.prisma.user.count(),
      this.prisma.product.count(),
    ]);

    const installedAt = firstUser?.createdAt ?? now;
    const trialEnd = new Date(installedAt.getTime() + TRIAL_DAYS * DAY);
    // Hozirgi vaqtni qamrab olgan to'lov - joriy tarif
    const active = payments.find(
      (p) => p.periodStart <= now && p.periodEnd > now,
    );
    const lastEnd = payments[0]?.periodEnd ?? null;

    let current: {
      plan: string;
      status: 'ACTIVE' | 'TRIAL' | 'EXPIRED';
      startedAt: Date;
      expiresAt: Date;
    };
    if (active) {
      current = {
        plan: active.plan,
        status: 'ACTIVE',
        startedAt: active.periodStart,
        expiresAt:
          lastEnd && lastEnd > active.periodEnd ? lastEnd : active.periodEnd,
      };
    } else if (!payments.length && trialEnd > now) {
      current = {
        plan: 'TRIAL',
        status: 'TRIAL',
        startedAt: installedAt,
        expiresAt: trialEnd,
      };
    } else {
      current = {
        plan: payments[0]?.plan ?? 'TRIAL',
        status: 'EXPIRED',
        startedAt: payments[0]?.periodStart ?? installedAt,
        expiresAt: lastEnd ?? trialEnd,
      };
    }
    const daysLeft = Math.max(
      0,
      Math.ceil((current.expiresAt.getTime() - now.getTime()) / DAY),
    );
    const plan =
      PLANS.find((p) => p.code === current.plan) ??
      PLANS.find((p) => p.code === 'BUSINESS')!;

    return {
      current: { ...current, daysLeft },
      usage: {
        users,
        products,
        usersLimit: plan.users,
        productsLimit: plan.products,
      },
      plans: PLANS,
      periods: PERIODS,
      payments: payments.map((p) => ({
        id: p.id,
        plan: p.plan,
        months: p.months,
        amount: Number(p.amount),
        method: p.method,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        note: p.note,
        user: p.user.fullName,
        createdAt: p.createdAt,
      })),
    };
  }

  // To'lov obunani oxirgi muddat tugagan kundan (yoki bugundan) boshlab uzaytiradi
  async pay(dto: CreateSubscriptionPaymentDto, userId: string) {
    const amount = priceFor(dto.plan, dto.months);
    if (amount === null) throw badRequest('subscription.badPlan');
    const last = await this.prisma.subscriptionPayment.findFirst({
      orderBy: { periodEnd: 'desc' },
    });
    const now = new Date();
    const periodStart = last && last.periodEnd > now ? last.periodEnd : now;
    const periodEnd = addMonths(periodStart, dto.months);
    return this.prisma.subscriptionPayment.create({
      data: {
        plan: dto.plan,
        months: dto.months,
        amount,
        method: dto.method,
        note: dto.note ?? null,
        periodStart,
        periodEnd,
        userId,
      },
    });
  }

  // Xato kiritilgan to'lovni bekor qilish: faqat eng oxirgisi
  async remove(id: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id },
    });
    if (!payment) throw notFound('subscription.notFound');
    const last = await this.prisma.subscriptionPayment.findFirst({
      orderBy: { periodEnd: 'desc' },
    });
    if (last?.id !== id) throw badRequest('subscription.onlyLast');
    await this.prisma.subscriptionPayment.delete({ where: { id } });
    return { ok: true };
  }
}
