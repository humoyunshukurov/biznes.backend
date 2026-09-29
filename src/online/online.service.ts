import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError, badRequest, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../sales/order.service';
import { SettingsService } from '../settings/settings.service';
import { OnlineOrderStatus, Prisma } from '../../generated/prisma/client';
import { OnlineQueryDto, PublicOrderDto } from './online.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;
const digits = (phone: string) => phone.replace(/\D/g, '');

// Bitta manzildan ko'p buyurtma yuborib tizimni to'ldirib tashlashning oldini olish
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const orderInclude = {
  items: { orderBy: { name: 'asc' } },
  handledBy: { select: { fullName: true } },
} satisfies Prisma.OnlineOrderInclude;

@Injectable()
export class OnlineService {
  private recent = new Map<string, number[]>();

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private orders: OrderService,
  ) {}

  // Ochiq katalog: faqat sotuvda bor, dona bilan sotiladigan mahsulotlar
  async shop() {
    const s = await this.settings.get();
    const company = {
      name: s.company.name,
      phone: s.online.phone || s.company.phone,
      address: s.company.address,
    };
    if (!s.online.enabled) return { enabled: false, company };

    const products = await this.prisma.product.findMany({
      where: { quantity: { gte: 1 }, isWeighted: false },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
        imageUrl: true,
        categoryId: true,
        unit: { select: { name: true } },
        category: {
          select: { id: true, name: true, nameEn: true, nameRu: true },
        },
      },
    });
    const categories = new Map<
      string,
      { id: string; name: string; nameEn: string | null; nameRu: string | null }
    >();
    for (const p of products)
      if (p.category) categories.set(p.category.id, p.category);

    return {
      enabled: true,
      company,
      delivery: s.online.delivery,
      minOrder: s.online.minOrder,
      showStock: s.online.showStock,
      categories: [...categories.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: s.online.showStock ? Math.floor(Number(p.quantity)) : null,
        imageUrl: p.imageUrl,
        categoryId: p.categoryId,
        unit: p.unit.name,
      })),
    };
  }

  private checkRate(ip: string) {
    const now = Date.now();
    const list = (this.recent.get(ip) ?? []).filter(
      (t) => now - t < RATE_WINDOW_MS,
    );
    if (list.length >= RATE_MAX) {
      throw new AppError(HttpStatus.TOO_MANY_REQUESTS, [
        { key: 'http.tooMany' },
      ]);
    }
    list.push(now);
    this.recent.set(ip, list);
    // Eski yozuvlar xotirada to'planib qolmasligi uchun
    if (this.recent.size > 5000) {
      for (const [k, v] of this.recent)
        if (v.every((t) => now - t >= RATE_WINDOW_MS)) this.recent.delete(k);
    }
  }

  async placeOrder(dto: PublicOrderDto, ip: string) {
    const s = await this.settings.get();
    if (!s.online.enabled) throw badRequest('online.disabled');

    const merged = new Map<string, number>();
    for (const i of dto.items)
      merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity);

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...merged.keys()] } },
    });
    let total = 0;
    const items = [...merged.entries()].map(([productId, quantity]) => {
      const p = products.find((x) => x.id === productId);
      if (!p || p.isWeighted) throw notFound('product.notFound');
      if (Number(p.quantity) < quantity) {
        throw badRequest('stock.notEnough', {
          name: p.name,
          available: Math.floor(Number(p.quantity)),
        });
      }
      total += Number(p.price) * quantity;
      return { productId, name: p.name, quantity, price: p.price };
    });
    total = round2(total);
    if (total < (s.online.minOrder ?? 0)) {
      throw badRequest('online.minOrder', { amount: s.online.minOrder });
    }

    this.checkRate(ip);
    const order = await this.prisma.onlineOrder.create({
      data: {
        customerName: dto.customerName,
        phone: dto.phone,
        address: dto.address ?? null,
        note: dto.note ?? null,
        total,
        items: { create: items },
      },
    });
    return { number: order.number, total };
  }

  async list(q: OnlineQueryDto) {
    const [orders, grouped] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where: q.status ? { status: q.status } : {},
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.onlineOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);
    const summary = { NEW: 0, ACCEPTED: 0, REJECTED: 0, acceptedTotal: 0 };
    for (const g of grouped) {
      summary[g.status] = g._count._all;
      if (g.status === OnlineOrderStatus.ACCEPTED)
        summary.acceptedTotal = round2(Number(g._sum.total ?? 0));
    }
    return { orders, summary };
  }

  // Yangi buyurtmalar (bildirishnomalar uchun)
  pending() {
    return this.prisma.onlineOrder.findMany({
      where: { status: OnlineOrderStatus.NEW },
      select: {
        id: true,
        number: true,
        customerName: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Qabul qilish: mijoz telefon bo'yicha topiladi yoki yaratiladi, oddiy buyurtma tuziladi
  async accept(id: string, userId: string) {
    const online = await this.prisma.onlineOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!online) throw notFound('online.notFound');
    if (online.status !== OnlineOrderStatus.NEW)
      throw badRequest('online.alreadyHandled');
    if (online.items.some((i) => !i.productId))
      throw badRequest('online.productGone');

    // Bir vaqtda ikki xodim qabul qilmasligi uchun holat avval band qilinadi
    const claimed = await this.prisma.onlineOrder.updateMany({
      where: { id, status: OnlineOrderStatus.NEW },
      data: {
        status: OnlineOrderStatus.ACCEPTED,
        handledById: userId,
        handledAt: new Date(),
      },
    });
    if (claimed.count === 0) throw badRequest('online.alreadyHandled');

    try {
      const phoneDigits = digits(online.phone);
      const candidates = await this.prisma.customer.findMany({
        select: { id: true, phone: true },
      });
      let customerId = candidates.find(
        (c) =>
          phoneDigits.length >= 7 &&
          digits(c.phone).endsWith(phoneDigits.slice(-9)),
      )?.id;
      if (!customerId) {
        const created = await this.prisma.customer.create({
          data: {
            name: online.customerName,
            phone: online.phone,
            address: online.address,
          },
        });
        customerId = created.id;
      }
      const order = await this.orders.create(
        {
          customerId,
          items: online.items.map((i) => ({
            productId: i.productId!,
            quantity: i.quantity,
          })),
        },
        userId,
      );
      return await this.prisma.onlineOrder.update({
        where: { id },
        data: { orderId: order.id },
        include: orderInclude,
      });
    } catch (e) {
      // Buyurtma tuzilmasa (masalan, qoldiq yetmasa) holat qaytariladi
      await this.prisma.onlineOrder.update({
        where: { id },
        data: {
          status: OnlineOrderStatus.NEW,
          handledById: null,
          handledAt: null,
        },
      });
      throw e;
    }
  }

  async reject(id: string, reason: string | null | undefined, userId: string) {
    const online = await this.prisma.onlineOrder.findUnique({ where: { id } });
    if (!online) throw notFound('online.notFound');
    const res = await this.prisma.onlineOrder.updateMany({
      where: { id, status: OnlineOrderStatus.NEW },
      data: {
        status: OnlineOrderStatus.REJECTED,
        rejectReason: reason ?? null,
        handledById: userId,
        handledAt: new Date(),
      },
    });
    if (res.count === 0) throw badRequest('online.alreadyHandled');
    return this.prisma.onlineOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
  }
}
