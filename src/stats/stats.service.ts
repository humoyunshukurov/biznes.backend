import { Injectable } from '@nestjs/common';
import { badRequest } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '../../generated/prisma/client';
import { OverviewQueryDto, RangeQueryDto, ReorderQueryDto } from './stats.dto';

const DAY = 24 * 60 * 60 * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function parseRange(q: RangeQueryDto) {
  const from = new Date(q.from);
  const to = new Date(q.to);
  if (!(from < to)) throw badRequest('stats.badRange');
  if (to.getTime() - from.getTime() > 400 * DAY) {
    throw badRequest('stats.rangeTooLong');
  }
  return { from, to };
}

// O'zgarish foizi: avvalgi davr 0 bo'lsa va hozir bor bo'lsa 100%
function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  private ordersInRange(from: Date, to: Date) {
    return this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lt: to },
        status: { not: OrderStatus.CANCELLED },
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            costPrice: true,
            product: {
              select: {
                name: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  // Davr ichida mijozlardan qaytarilgan tovarlar (savdodan ayiriladi)
  private returnsInRange(from: Date, to: Date) {
    return this.prisma.customerReturn.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: {
        total: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            costPrice: true,
            product: {
              select: {
                name: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  private totals(
    orders: Awaited<ReturnType<StatsService['ordersInRange']>>,
    returns: Awaited<ReturnType<StatsService['returnsInRange']>>,
  ) {
    let revenue = 0;
    let profit = 0;
    let revenueWithoutCost = 0;
    let returnsTotal = 0;
    for (const o of orders) {
      revenue += Number(o.totalAmount);
      for (const it of o.items) {
        const line = Number(it.price) * it.quantity;
        if (it.costPrice === null) revenueWithoutCost += line;
        else profit += (Number(it.price) - Number(it.costPrice)) * it.quantity;
      }
    }
    for (const r of returns) {
      returnsTotal += Number(r.total);
      for (const it of r.items) {
        const line = Number(it.price) * it.quantity;
        if (it.costPrice === null) revenueWithoutCost -= line;
        else profit -= (Number(it.price) - Number(it.costPrice)) * it.quantity;
      }
    }
    revenue -= returnsTotal;
    const count = orders.length;
    return {
      revenue: round2(revenue),
      profit: round2(profit),
      count,
      avgCheck: count ? round2(revenue / count) : 0,
      revenueWithoutCost: round2(Math.max(0, revenueWithoutCost)),
      returnsTotal: round2(returnsTotal),
      returnsCount: returns.length,
    };
  }

  async overview(q: OverviewQueryDto) {
    const { from, to } = parseRange(q);
    const tzMs = (q.tz ?? 0) * 60 * 1000;
    const span = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - span);

    const [orders, prevOrders, payments, statusGroups, returns, prevReturns] =
      await Promise.all([
        this.ordersInRange(from, to),
        this.ordersInRange(prevFrom, from),
        this.prisma.payment.groupBy({
          by: ['method'],
          where: { paidAt: { gte: from, lt: to } },
          _sum: { amount: true },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where: { createdAt: { gte: from, lt: to } },
          _count: true,
          _sum: { totalAmount: true },
        }),
        this.returnsInRange(from, to),
        this.returnsInRange(prevFrom, from),
      ]);

    const current = this.totals(orders, returns);
    const previous = this.totals(prevOrders, prevReturns);

    // Diagramma bo'laklari: foydalanuvchining mahalliy vaqti bo'yicha
    const bucketCount =
      q.groupBy === 'hour'
        ? 24
        : q.groupBy === 'weekday'
          ? 7
          : Math.min(400, Math.ceil(span / DAY));
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      key: i,
      revenue: 0,
      profit: 0,
      count: 0,
    }));
    const bucketOf = (date: Date) => {
      const local = new Date(date.getTime() - tzMs);
      const idx =
        q.groupBy === 'hour'
          ? local.getUTCHours()
          : q.groupBy === 'weekday'
            ? (local.getUTCDay() + 6) % 7 // Dushanba = 0
            : Math.floor((date.getTime() - from.getTime()) / DAY);
      return buckets[idx];
    };
    for (const r of returns) {
      const b = bucketOf(r.createdAt);
      if (!b) continue;
      b.revenue -= Number(r.total);
      for (const it of r.items) {
        if (it.costPrice !== null) {
          b.profit -= (Number(it.price) - Number(it.costPrice)) * it.quantity;
        }
      }
    }
    for (const o of orders) {
      const b = bucketOf(o.createdAt);
      if (!b) continue;
      b.revenue += Number(o.totalAmount);
      b.count += 1;
      for (const it of o.items) {
        if (it.costPrice !== null) {
          b.profit += (Number(it.price) - Number(it.costPrice)) * it.quantity;
        }
      }
    }
    const series = buckets.map((b) => ({
      ...b,
      revenue: round2(b.revenue),
      profit: round2(b.profit),
      avgCheck: b.count ? round2(b.revenue / b.count) : 0,
    }));

    // Bo'limlar va mashhur mahsulotlar
    const categories = new Map<
      string,
      { id: string | null; name: string | null; revenue: number }
    >();
    const products = new Map<
      string,
      { productId: string; name: string; quantity: number; revenue: number }
    >();
    // Sotuv qatorlari (+) va qaytarish qatorlari (-)
    const lines = [
      ...orders.flatMap((o) => o.items.map((it) => ({ it, sign: 1 }))),
      ...returns.flatMap((r) => r.items.map((it) => ({ it, sign: -1 }))),
    ];
    for (const { it, sign } of lines) {
      {
        const line = sign * Number(it.price) * it.quantity;
        const cat = it.product.category;
        const catKey = cat?.id ?? 'none';
        const c = categories.get(catKey) ?? {
          id: cat?.id ?? null,
          name: cat?.name ?? null,
          revenue: 0,
        };
        c.revenue += line;
        categories.set(catKey, c);
        const p = products.get(it.productId) ?? {
          productId: it.productId,
          name: it.product.name,
          quantity: 0,
          revenue: 0,
        };
        p.quantity += sign * it.quantity;
        p.revenue += line;
        products.set(it.productId, p);
      }
    }
    const itemsRevenue = [...categories.values()].reduce(
      (s, c) => s + c.revenue,
      0,
    );
    const categoryList = [...categories.values()]
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({
        ...c,
        revenue: round2(c.revenue),
        share: itemsRevenue ? round2((c.revenue / itemsRevenue) * 100) : 0,
      }));
    const topProducts = [...products.values()]
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({
        ...p,
        revenue: round2(p.revenue),
        share: itemsRevenue ? round2((p.revenue / itemsRevenue) * 100) : 0,
      }));

    return {
      range: { from, to },
      ...current,
      changes: {
        revenue: change(current.revenue, previous.revenue),
        profit: change(current.profit, previous.profit),
        count: change(current.count, previous.count),
        avgCheck: change(current.avgCheck, previous.avgCheck),
      },
      series,
      categories: categoryList,
      topProducts,
      paymentsByMethod: payments.map((p) => ({
        method: p.method,
        amount: round2(Number(p._sum.amount ?? 0)),
      })),
      ordersByStatus: statusGroups.map((s) => ({
        status: s.status,
        count: s._count,
        amount: round2(Number(s._sum.totalAmount ?? 0)),
      })),
    };
  }

  async stock() {
    const products = await this.prisma.product.findMany({
      include: { unit: true, category: true },
      orderBy: { name: 'asc' },
    });
    const rows = products.map((p) => {
      const qty = Number(p.quantity);
      const cost = p.costPrice === null ? null : Number(p.costPrice);
      const price = Number(p.price);
      const positive = Math.max(qty, 0);
      return {
        id: p.id,
        name: p.name,
        unit: p.unit.name,
        category: p.category?.name ?? null,
        quantity: qty,
        costPrice: cost,
        price,
        costValue: cost === null ? null : round2(positive * cost),
        retailValue: round2(positive * price),
        expectedProfit:
          cost === null ? null : round2(positive * (price - cost)),
      };
    });
    const sum = (key: 'costValue' | 'retailValue' | 'expectedProfit') =>
      round2(rows.reduce((s, r) => s + (r[key] ?? 0), 0));
    return {
      rows,
      totals: {
        costValue: sum('costValue'),
        retailValue: sum('retailValue'),
        expectedProfit: sum('expectedProfit'),
        withoutCost: rows.filter((r) => r.costPrice === null && r.quantity > 0)
          .length,
        negative: rows.filter((r) => r.quantity < 0).length,
      },
    };
  }

  // ABC tahlil: tushumning 80% i - A, keyingi 15% - B, qolgan 5% - C
  async abc(q: RangeQueryDto) {
    const { from, to } = parseRange(q);
    const [orders, returns, allProducts] = await Promise.all([
      this.ordersInRange(from, to),
      this.returnsInRange(from, to),
      this.prisma.product.findMany({ select: { id: true, name: true } }),
    ]);
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        quantity: number;
        revenue: number;
        profit: number | null;
      }
    >();
    for (const p of allProducts)
      map.set(p.id, {
        id: p.id,
        name: p.name,
        quantity: 0,
        revenue: 0,
        profit: 0,
      });
    const lines = [
      ...orders.flatMap((o) => o.items.map((it) => ({ it, sign: 1 }))),
      ...returns.flatMap((r) => r.items.map((it) => ({ it, sign: -1 }))),
    ];
    for (const { it, sign } of lines) {
      const row = map.get(it.productId);
      if (!row) continue;
      row.quantity += sign * it.quantity;
      row.revenue += sign * Number(it.price) * it.quantity;
      if (it.costPrice === null) row.profit = null;
      else if (row.profit !== null)
        row.profit +=
          sign * (Number(it.price) - Number(it.costPrice)) * it.quantity;
    }
    const rows = [...map.values()]
      .map((r) => ({ ...r, revenue: Math.max(0, r.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    let cumulative = 0;
    const result = rows.map((r) => {
      const share = total ? (r.revenue / total) * 100 : 0;
      const before = cumulative;
      cumulative += share;
      const cls =
        r.revenue === 0 ? 'C' : before < 80 ? 'A' : before < 95 ? 'B' : 'C';
      return {
        ...r,
        revenue: round2(r.revenue),
        profit: r.profit === null ? null : round2(r.profit),
        share: round2(share),
        cumulative: round2(cumulative),
        class: cls,
      };
    });
    const summary = (['A', 'B', 'C'] as const).map((c) => {
      const list = result.filter((r) => r.class === c);
      return {
        class: c,
        count: list.length,
        revenue: round2(list.reduce((s, r) => s + r.revenue, 0)),
      };
    });
    return { rows: result, summary, total: round2(total) };
  }

  async customerBalances() {
    const customers = await this.prisma.customer.findMany({
      orderBy: { name: 'asc' },
      include: {
        orders: {
          select: { totalAmount: true, status: true, createdAt: true },
        },
        returns: { select: { total: true } },
        invoices: {
          select: {
            amount: true,
            status: true,
            payments: { select: { amount: true } },
          },
        },
      },
    });
    const rows = customers.map((c) => {
      const active = c.orders.filter((o) => o.status !== OrderStatus.CANCELLED);
      const returned = c.returns.reduce((s, r) => s + Number(r.total), 0);
      const ordersTotal =
        active.reduce((s, o) => s + Number(o.totalAmount), 0) - returned;
      const invoices = c.invoices.filter((i) => i.status !== 'CANCELLED');
      const invoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
      const paid = c.invoices.reduce(
        (s, i) => s + i.payments.reduce((ps, p) => ps + Number(p.amount), 0),
        0,
      );
      const last = active.reduce<Date | null>(
        (d, o) => (!d || o.createdAt > d ? o.createdAt : d),
        null,
      );
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        ordersCount: active.length,
        ordersTotal: round2(ordersTotal),
        returned: round2(returned),
        invoiced: round2(invoiced),
        paid: round2(paid),
        debt: round2(invoiced - paid),
        lastOrderAt: last,
      };
    });
    return {
      rows,
      totals: {
        ordersTotal: round2(rows.reduce((s, r) => s + r.ordersTotal, 0)),
        invoiced: round2(rows.reduce((s, r) => s + r.invoiced, 0)),
        paid: round2(rows.reduce((s, r) => s + r.paid, 0)),
        debt: round2(rows.reduce((s, r) => s + r.debt, 0)),
      },
    };
  }

  // Tavsiya etilgan xarid: oxirgi N kundagi o'rtacha savdo asosida zaxirani to'ldirish
  async reorder(q: ReorderQueryDto) {
    const days = q.days ?? 30;
    const cover = q.cover ?? 14;
    const since = new Date(Date.now() - days * DAY);
    const [products, sold, returned] = await Promise.all([
      this.prisma.product.findMany({
        include: { unit: true, category: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: since },
            status: { not: OrderStatus.CANCELLED },
          },
        },
        _sum: { quantity: true },
      }),
      this.prisma.customerReturnItem.groupBy({
        by: ['productId'],
        where: { return: { createdAt: { gte: since } } },
        _sum: { quantity: true },
      }),
    ]);
    const returnedMap = new Map(
      returned.map((r) => [r.productId, r._sum.quantity ?? 0]),
    );
    // Sof sotilgan miqdor = sotilgan - qaytarilgan
    const soldMap = new Map(
      sold.map((s) => [
        s.productId,
        Math.max(
          0,
          (s._sum.quantity ?? 0) - (returnedMap.get(s.productId) ?? 0),
        ),
      ]),
    );
    const rows = products
      .map((p) => {
        const soldQty = soldMap.get(p.id) ?? 0;
        const perDay = soldQty / days;
        const stock = Number(p.quantity);
        const need = perDay * cover - stock;
        const recommended = need > 0 ? Math.ceil(need) : 0;
        return {
          id: p.id,
          name: p.name,
          unit: p.unit.name,
          category: p.category?.name ?? null,
          stock,
          sold: soldQty,
          perDay: round2(perDay),
          daysLeft: perDay > 0 ? Math.max(0, Math.floor(stock / perDay)) : null,
          recommended,
          costPrice: p.costPrice === null ? null : Number(p.costPrice),
          estimatedCost:
            p.costPrice === null
              ? null
              : round2(recommended * Number(p.costPrice)),
        };
      })
      .filter((r) => r.recommended > 0 || r.stock <= 0)
      .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    return {
      days,
      cover,
      rows,
      totalCost: round2(rows.reduce((s, r) => s + (r.estimatedCost ?? 0), 0)),
    };
  }
}
