import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  MovementKind,
  PrismaClient,
  StockMovementType,
  OrderStatus,
  InvoiceStatus,
  PaymentMethod,
  Customer,
  Order,
} from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Seed har safar bir xil shtrix-kodlar hosil qilishi uchun oddiy deterministik generator
let seedCounter = 0;
function ean13() {
  seedCounter++;
  const body = `2${String(4780000000 + seedCounter * 7919)
    .padStart(11, '0')
    .slice(-11)}`;
  const sum = body
    .split('')
    .reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return body + ((10 - (sum % 10)) % 10);
}

async function main() {
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log('Creating admin user admin@biznes.uz / admin123 ...');
    admin = await prisma.user.create({
      data: {
        email: 'admin@biznes.uz',
        password: await bcrypt.hash('admin123', 10),
        fullName: 'Admin',
        role: 'ADMIN',
      },
    });
  }

  console.log('Clearing existing business data...');
  await prisma.onlineOrderItem.deleteMany();
  await prisma.onlineOrder.deleteMany();
  await prisma.cashCategory.deleteMany();
  await prisma.subscriptionPayment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customerReturnItem.deleteMany();
  await prisma.customerReturn.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.supplierPayment.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.productBarcode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.productType.deleteMany();
  await prisma.customer.deleteMany();

  console.log('Seeding units, brands, product types...');
  const unitDefs = [
    { name: 'dona', code: null },
    { name: 'kg', code: null },
    { name: 'metr', code: null },
    { name: 'm2', code: null },
    { name: 'rulon', code: null },
    { name: 'litr', code: null },
    { name: 'qop', code: null },
  ];
  const units: Record<string, string> = {};
  for (const u of unitDefs)
    units[u.name] = (await prisma.unit.create({ data: u })).id;

  const brandNames = [
    'Ceresit',
    'Knauf',
    'Tikkurila',
    'Kastamonu',
    'Isover',
    'Akfa',
  ];
  const brands: Record<string, string> = {};
  for (const name of brandNames)
    brands[name] = (await prisma.brand.create({ data: { name } })).id;

  for (const name of ['Tovar', 'Xizmat', "To'plam"])
    await prisma.productType.create({ data: { name } });

  console.log('Seeding categories...');
  // [o'zbekcha, inglizcha, ruscha, sevimli]
  const categoryDefs: [string, string, string, boolean][] = [
    ['Sement va qorishmalar', 'Cement and mortars', 'Цемент и смеси', true],
    ['Metall va armatura', 'Metal and rebar', 'Металл и арматура', false],
    ["Bo'yoq va emulsiya", 'Paints and emulsions', 'Краски и эмульсии', true],
    ["G'isht va bloklar", 'Bricks and blocks', 'Кирпич и блоки', false],
    ['Pol qoplamalari', 'Floor coverings', 'Напольные покрытия', false],
    [
      'Izolyatsiya materiallari',
      'Insulation materials',
      'Изоляционные материалы',
      false,
    ],
    ['Mahkamlash vositalari', 'Fasteners', 'Крепёж', true],
  ];
  const categories: Record<string, string> = {};
  for (const [name, nameEn, nameRu, isFavorite] of categoryDefs) {
    const cat = await prisma.category.create({
      data: { name, nameEn, nameRu, isFavorite },
    });
    categories[name] = cat.id;
  }

  console.log('Seeding suppliers...');
  const supplierDefs = [
    {
      name: 'Qurilish Savdo MChJ',
      phone: '+998 (71) 200-10-10',
      address: 'Toshkent sh., Sergeli qurilish bozori',
    },
    {
      name: 'Metall Invest',
      phone: '+998 (71) 233-44-55',
      address: 'Toshkent sh., Yangihayot t.',
    },
    {
      name: "Bo'yoq Markazi",
      phone: '+998 (90) 911-22-33',
      address: 'Toshkent sh., Chilonzor t.',
    },
  ];
  const suppliers: string[] = [];
  for (const sd of supplierDefs)
    suppliers.push((await prisma.supplier.create({ data: sd })).id);
  // Bo'lim bo'yicha qaysi yetkazib beruvchidan kelgani
  const supplierOf = (cat: string | null) =>
    cat === 'Metall va armatura' || cat === 'Mahkamlash vositalari'
      ? suppliers[1]
      : cat === "Bo'yoq va emulsiya"
        ? suppliers[2]
        : suppliers[0];

  console.log('Seeding products...');
  const productDefs = [
    {
      name: 'Portland Sement M400 (50kg)',
      sku: 'CM-001',
      unit: 'qop',
      price: 85000,
      cost: 72000,
      stock: 450,
      cat: 'Sement va qorishmalar',
      fav: true,
    },
    {
      name: 'Portland Sement M500 (50kg)',
      sku: 'CM-002',
      unit: 'qop',
      price: 95000,
      cost: 81000,
      stock: 300,
      cat: 'Sement va qorishmalar',
    },
    {
      name: 'Shpaklyovka Ceresit CT 225 (25kg)',
      sku: 'CM-003',
      unit: 'qop',
      price: 62000,
      cost: 51000,
      stock: 180,
      cat: 'Sement va qorishmalar',
      brand: 'Ceresit',
    },
    {
      name: 'Gips suvoq Knauf Rotband (30kg)',
      sku: 'CM-004',
      unit: 'qop',
      price: 78000,
      cost: 66000,
      stock: 120,
      cat: 'Sement va qorishmalar',
      brand: 'Knauf',
      fav: true,
    },
    {
      name: 'Armatura 12mm (A500C)',
      sku: 'MT-001',
      unit: 'metr',
      price: 12000,
      cost: 9800,
      stock: 3200,
      cat: 'Metall va armatura',
    },
    {
      name: 'Armatura 16mm (A500C)',
      sku: 'MT-002',
      unit: 'metr',
      price: 21000,
      cost: 17500,
      stock: 1800,
      cat: 'Metall va armatura',
    },
    {
      name: 'Profil truba 40x20mm',
      sku: 'MT-003',
      unit: 'metr',
      price: 28000,
      cost: null,
      stock: 900,
      cat: 'Metall va armatura',
    },
    {
      name: "Tikkurila fasad bo'yog'i (10L)",
      sku: 'PT-001',
      unit: 'dona',
      price: 450000,
      cost: 380000,
      stock: 85,
      cat: "Bo'yoq va emulsiya",
      brand: 'Tikkurila',
      fav: true,
    },
    {
      name: 'Gruntovka Ceresit CT 17 (5L)',
      sku: 'PT-002',
      unit: 'dona',
      price: 95000,
      cost: 78000,
      stock: 140,
      cat: "Bo'yoq va emulsiya",
      brand: 'Ceresit',
    },
    {
      name: "G'isht M150 (qizil, pishiq)",
      sku: 'BR-001',
      unit: 'dona',
      price: 800,
      cost: 620,
      stock: 18500,
      cat: "G'isht va bloklar",
    },
    {
      name: 'Gazoblok D500 (600x300x200)',
      sku: 'BR-002',
      unit: 'dona',
      price: 24000,
      cost: 19500,
      stock: 2400,
      cat: "G'isht va bloklar",
    },
    {
      name: 'Laminat AC4 12mm',
      sku: 'LM-001',
      unit: 'm2',
      price: 95000,
      cost: 76000,
      stock: 640,
      cat: 'Pol qoplamalari',
      brand: 'Kastamonu',
    },
    {
      name: 'Plintus PVX',
      sku: 'LM-002',
      unit: 'metr',
      price: 18000,
      cost: null,
      stock: 1200,
      cat: 'Pol qoplamalari',
    },
    {
      name: 'Mineral vata 100mm',
      sku: 'IZ-001',
      unit: 'm2',
      price: 38000,
      cost: 31000,
      stock: 280,
      cat: 'Izolyatsiya materiallari',
      brand: 'Isover',
    },
    {
      name: 'Ruberoid RKP-350',
      sku: 'IZ-002',
      unit: 'rulon',
      price: 120000,
      cost: 98000,
      stock: 95,
      cat: 'Izolyatsiya materiallari',
    },
    {
      name: 'Mix (gvozd) 100mm',
      sku: 'MK-001',
      unit: 'kg',
      price: 22000,
      cost: 17000,
      stock: 148.5,
      cat: 'Mahkamlash vositalari',
      weighted: true,
    },
    {
      name: "Bog'lovchi sim 1.2mm",
      sku: 'MK-002',
      unit: 'kg',
      price: 19000,
      cost: 15000,
      stock: 86.25,
      cat: 'Mahkamlash vositalari',
      weighted: true,
    },
    {
      name: 'Shurup 3.5x35 (qora)',
      sku: 'MK-003',
      unit: 'kg',
      price: 45000,
      cost: null,
      stock: 32.8,
      cat: 'Mahkamlash vositalari',
      weighted: true,
    },
    {
      name: 'Deraza profili Akfa 60mm',
      sku: 'AK-001',
      unit: 'metr',
      price: 54000,
      cost: 45000,
      stock: 0,
      cat: null,
      brand: 'Akfa',
    },
  ];
  const products: Record<
    string,
    { id: string; price: number; cost: number | null }
  > = {};
  for (const p of productDefs) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        unitId: units[p.unit],
        price: p.price,
        wholesalePrice: Math.round(p.price * 0.95),
        costPrice: p.cost,
        markupPercent: p.cost
          ? Math.round(((p.price - p.cost) / p.cost) * 10000) / 100
          : null,
        quantity: p.stock,
        categoryId: p.cat ? categories[p.cat] : null,
        brandId: p.brand ? brands[p.brand] : null,
        isFavorite: p.fav ?? false,
        isWeighted: p.weighted ?? false,
        barcodes: { create: [{ code: ean13() }] },
      },
    });
    products[p.sku] = { id: product.id, price: p.price, cost: p.cost };
    if (p.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: StockMovementType.IN,
          quantity: p.stock,
          unitCost: p.cost,
          supplierId: p.cost ? supplierOf(p.cat) : null,
          kind: p.cost ? MovementKind.SUPPLIER_IN : MovementKind.INITIAL,
          createdAt: new Date(Date.now() - 35 * 24 * 3600 * 1000),
          userId: admin.id,
        },
      });
    }
  }

  // Yetkazib beruvchilarga qisman to'langan (qolgani qarz)
  const payPlan = [0.8, 0.6, 1];
  for (const [i, supplierId] of suppliers.entries()) {
    const moves = await prisma.stockMovement.findMany({
      where: { supplierId },
    });
    const total = moves.reduce(
      (sum, m) => sum + Number(m.quantity) * Number(m.unitCost ?? 0),
      0,
    );
    if (total > 0) {
      await prisma.supplierPayment.create({
        data: {
          supplierId,
          amount: Math.round(total * payPlan[i]),
          method: PaymentMethod.BANK_TRANSFER,
          userId: admin.id,
        },
      });
    }
  }

  console.log('Seeding customers...');
  const customerDefs = [
    {
      name: 'Alisher Qodirov',
      phone: '+998 (90) 123-45-67',
      email: 'a.qodirov@toshkentmall.uz',
      note: 'Doimiy ulgurji mijoz',
      address: "Toshkent sh., Shayxontohur t., Navoiy ko'chasi 18",
    },
    {
      name: 'Jamshid Rahimov',
      phone: '+998 (93) 890-11-22',
      email: 'info@samtrans.uz',
      note: "Pul o'tkazma orqali to'laydi",
      address: "Samarqand sh., Gagarin ko'chasi 45",
    },
    {
      name: 'Muzaffar Tojiyev',
      phone: '+998 (97) 540-33-44',
      email: 'm.tojiyev@bngq.uz',
      address: 'Buxoro sh., Sanoat hududi, 12-baza',
    },
    {
      name: 'Nodira Salimova',
      phone: '+998 (91) 400-88-99',
      email: 'salimova@ferganatex.uz',
      address: "Farg'ona sh., Marg'ilon ko'chasi 7",
    },
    {
      name: 'Dilshod Normatov',
      phone: '+998 (99) 700-12-34',
      email: 'dilshod@chirchiqchem.uz',
      address: "Toshkent vil., Chirchiq sh., Sanoat ko'chasi 10",
    },
    {
      name: "Sardorbek Jo'rayev",
      phone: '+998 (94) 650-22-11',
      email: 'agrotex_andijon@mail.uz',
      address: "Andijon sh., Bobur shoh ko'chasi 102",
    },
  ];
  const customers: Customer[] = [];
  for (const c of customerDefs) {
    customers.push(await prisma.customer.create({ data: c }));
  }

  console.log('Seeding orders...');
  const orderPlans = [
    {
      customer: 0,
      status: OrderStatus.COMPLETED,
      items: [
        ['CM-001', 40],
        ['MT-001', 200],
      ],
    },
    {
      customer: 1,
      status: OrderStatus.COMPLETED,
      items: [
        ['PT-001', 4],
        ['PT-002', 6],
      ],
    },
    {
      customer: 2,
      status: OrderStatus.SHIPPED,
      items: [
        ['MT-002', 300],
        ['MT-003', 80],
      ],
    },
    {
      customer: 3,
      status: OrderStatus.CONFIRMED,
      items: [
        ['LM-001', 60],
        ['LM-002', 120],
      ],
    },
    { customer: 4, status: OrderStatus.NEW, items: [['IZ-001', 30]] },
    {
      customer: 0,
      status: OrderStatus.COMPLETED,
      items: [
        ['BR-001', 5000],
        ['BR-002', 200],
      ],
    },
    { customer: 5, status: OrderStatus.CANCELLED, items: [['CM-002', 20]] },
    {
      customer: 2,
      status: OrderStatus.COMPLETED,
      items: [
        ['IZ-002', 15],
        ['CM-003', 25],
      ],
    },
  ];
  // Demo statistika uchun: asosiy buyurtmalar oxirgi 2 haftaga, qo'shimcha chakana savdolar oxirgi 30 kunga
  let rnd = 42;
  const random = () => {
    rnd = (rnd * 1103515245 + 12345) % 2147483648;
    return rnd / 2147483648;
  };
  const skus = Object.keys(products);
  for (let i = 0; i < 60; i++) {
    const count = 1 + Math.floor(random() * 3);
    const items: [string, number][] = [];
    for (let j = 0; j < count; j++) {
      const sku = skus[Math.floor(random() * skus.length)];
      if (!items.some(([s2]) => s2 === sku) && sku !== 'AK-001')
        items.push([sku, 1 + Math.floor(random() * 5)]);
    }
    if (items.length)
      orderPlans.push({
        customer: Math.floor(random() * 6),
        status: OrderStatus.COMPLETED,
        items,
      });
  }
  const orderDate = (index: number) => {
    const d = new Date();
    const daysAgo = index < 8 ? 14 - index : Math.floor(random() * 30);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(9 + Math.floor(random() * 10), Math.floor(random() * 60), 0, 0);
    return d > new Date() ? new Date(Date.now() - 60 * 60 * 1000) : d;
  };
  const orders: Order[] = [];
  for (const [index, plan] of orderPlans.entries()) {
    const createdAt = orderDate(index);
    const itemsData = (plan.items as [string, number][]).map(([sku, qty]) => ({
      productId: products[sku].id,
      quantity: qty,
      price: products[sku].price,
      costPrice: products[sku].cost,
    }));
    const totalAmount = itemsData.reduce(
      (s, i) => s + i.quantity * Number(i.price),
      0,
    );
    const order = await prisma.order.create({
      data: {
        customerId: customers[plan.customer].id,
        userId: admin.id,
        status: plan.status,
        totalAmount,
        createdAt,
        items: { create: itemsData },
      },
    });
    orders.push(order);
    if (plan.status !== OrderStatus.CANCELLED) {
      for (const item of itemsData) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.OUT,
            quantity: item.quantity,
            kind: MovementKind.ORDER,
            orderId: order.id,
            createdAt,
            userId: admin.id,
          },
        });
      }
    }
  }

  console.log('Seeding customer returns...');
  // Ikkita bajarilgan buyurtmadan qisman qaytarish
  for (const index of [0, 5]) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orders[index].id },
      include: { items: true },
    });
    const item = order.items[0];
    const quantity = Math.max(1, Math.floor(item.quantity / 10));
    const createdAt = new Date(
      order.createdAt.getTime() + 2 * 24 * 3600 * 1000,
    );
    await prisma.customerReturn.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        userId: admin.id,
        total: Number(item.price) * quantity,
        createdAt,
        items: {
          create: [
            {
              productId: item.productId,
              quantity,
              price: item.price,
              costPrice: item.costPrice,
            },
          ],
        },
      },
    });
    await prisma.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        productId: item.productId,
        type: StockMovementType.IN,
        kind: MovementKind.CUSTOMER_RETURN,
        quantity,
        orderId: order.id,
        createdAt,
        userId: admin.id,
      },
    });
  }

  console.log('Seeding invoices & payments...');
  const invoicePlans = [
    { order: 0, customer: 0, status: InvoiceStatus.PAID, daysOffset: -10 },
    { order: 1, customer: 1, status: InvoiceStatus.PAID, daysOffset: -5 },
    {
      order: 2,
      customer: 2,
      status: InvoiceStatus.PARTIALLY_PAID,
      daysOffset: 5,
    },
    { order: 3, customer: 3, status: InvoiceStatus.UNPAID, daysOffset: 10 },
    { order: 5, customer: 0, status: InvoiceStatus.PAID, daysOffset: -20 },
    { order: 7, customer: 2, status: InvoiceStatus.UNPAID, daysOffset: -3 },
  ];
  for (const plan of invoicePlans) {
    const order = orders[plan.order];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + plan.daysOffset);
    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        customerId: customers[plan.customer].id,
        amount: order.totalAmount,
        status: plan.status,
        dueDate,
      },
    });
    if (plan.status === InvoiceStatus.PAID) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: order.totalAmount,
          method: PaymentMethod.BANK_TRANSFER,
        },
      });
    } else if (plan.status === InvoiceStatus.PARTIALLY_PAID) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: Number(order.totalAmount) * 0.4,
          method: PaymentMethod.CASH,
        },
      });
    }
  }

  console.log('Seeding expenses...');
  const expenseDefs = [
    {
      category: 'RENT',
      method: PaymentMethod.BANK_TRANSFER,
      daysAgo: 20,
      amount: 18000000,
      description: "Chilonzor omborining oylik ijara to'lovi",
    },
    {
      category: 'SALARY',
      method: PaymentMethod.CARD,
      daysAgo: 10,
      amount: 28500000,
      description: 'Omborxona xodimlarining oylik ish haqi',
    },
    {
      category: 'Logistika',
      method: PaymentMethod.CASH,
      daysAgo: 6,
      amount: 12400000,
      description: 'Yuk tashish va tushirish xarajatlari',
    },
    {
      category: 'UTILITIES',
      method: PaymentMethod.BANK_TRANSFER,
      daysAgo: 3,
      amount: 4200000,
      description: "Elektr energiyasi va kommunal to'lovlar",
    },
    {
      category: 'Marketing',
      method: PaymentMethod.CARD,
      daysAgo: 1,
      amount: 3500000,
      description: 'Ijtimoiy tarmoqlarda reklama',
    },
  ];
  for (const { daysAgo, ...e } of expenseDefs) {
    await prisma.expense.create({
      data: {
        ...e,
        date: new Date(Date.now() - daysAgo * 24 * 3600 * 1000),
        userId: admin.id,
      },
    });
  }

  console.log('Seeding cash register...');
  // Har bir hisobga boshlang'ich qoldiq: barcha chiqimlardan keyin ham musbat qolishi uchun
  const DAY_MS = 24 * 3600 * 1000;
  const sumBy = async (method: PaymentMethod) => {
    const [pay, exp, sup, ref] = await Promise.all([
      prisma.payment.aggregate({ where: { method }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { method }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({
        where: { method },
        _sum: { amount: true },
      }),
      prisma.customerReturn.aggregate({
        where: { refundMethod: method },
        _sum: { total: true },
      }),
    ]);
    return (
      Number(pay._sum.amount ?? 0) -
      Number(exp._sum.amount ?? 0) -
      Number(sup._sum.amount ?? 0) -
      Number(ref._sum.total ?? 0)
    );
  };
  const buffer: Record<PaymentMethod, number> = {
    CASH: 15000000,
    CARD: 10000000,
    BANK_TRANSFER: 50000000,
  };
  for (const method of [
    PaymentMethod.CASH,
    PaymentMethod.CARD,
    PaymentMethod.BANK_TRANSFER,
  ]) {
    const net = await sumBy(method);
    await prisma.cashTransaction.create({
      data: {
        type: 'IN',
        amount: Math.max(0, -net) + buffer[method],
        method,
        category: 'OPENING',
        userId: admin.id,
        createdAt: new Date(Date.now() - 40 * DAY_MS),
      },
    });
  }
  await prisma.cashTransaction.create({
    data: {
      type: 'IN',
      amount: 2500000,
      method: PaymentMethod.CASH,
      category: 'SALES',
      userId: admin.id,
      createdAt: new Date(Date.now() - 2 * DAY_MS),
    },
  });
  await prisma.cashTransaction.create({
    data: {
      type: 'OUT',
      amount: 5000000,
      method: PaymentMethod.CASH,
      category: 'COLLECTION',
      userId: admin.id,
      createdAt: new Date(Date.now() - 2 * DAY_MS + 3600000),
    },
  });
  await prisma.cashTransaction.create({
    data: {
      type: 'TRANSFER',
      amount: 3000000,
      method: PaymentMethod.CASH,
      toMethod: PaymentMethod.BANK_TRANSFER,
      userId: admin.id,
      createdAt: new Date(Date.now() - 1 * DAY_MS),
    },
  });
  // Kecha yopilgan namuna smena (naqd pul hisobi bilan)
  const yesterday = new Date(Date.now() - DAY_MS);
  yesterday.setHours(9, 0, 0, 0);
  const closed = new Date(yesterday);
  closed.setHours(19, 0, 0, 0);
  await prisma.shift.create({
    data: {
      userId: admin.id,
      openedAt: yesterday,
      closedAt: closed,
      openingCash: 1500000,
      expectedCash: 1500000,
      closingCash: 1480000,
    },
  });

  console.log('Seeding cash categories...');
  await prisma.cashCategory.createMany({
    data: [
      { type: 'OUT', name: 'Logistika' },
      { type: 'OUT', name: 'Marketing' },
      { type: 'OUT', name: 'Bank xizmati' },
      { type: 'IN', name: 'Ijara daromadi' },
    ],
  });

  console.log('Seeding online store...');
  await prisma.setting.upsert({
    where: { key: 'online' },
    create: {
      key: 'online',
      value: {
        enabled: true,
        showStock: true,
        phone: '',
        delivery: "Toshkent bo'ylab yetkazib berish 1 kun ichida",
        minOrder: 0,
      },
    },
    update: {},
  });
  const pick = (name: string) => {
    const def = productDefs.find((d) => d.name === name);
    const p = def ? products[def.sku] : undefined;
    if (!p) throw new Error('Seed product not found: ' + name);
    return p;
  };
  const onlineDefs = [
    {
      customerName: 'Bekzod Karimov',
      phone: '+998 90 555 12 34',
      address: "Toshkent, Yunusobod 4-kvartal, 12-uy",
      note: 'Soat 14:00 dan keyin qo\'ng\'iroq qiling',
      hoursAgo: 2,
      status: 'NEW' as const,
      items: [
        ['Portland Sement M400 (50kg)', 10],
        ['Gruntovka Ceresit CT 17 (5L)', 2],
      ] as [string, number][],
    },
    {
      customerName: 'Alisher Qodirov',
      phone: '+998 (90) 123-45-67',
      address: null,
      note: null,
      hoursAgo: 5,
      status: 'NEW' as const,
      items: [['Laminat AC4 12mm', 20]] as [string, number][],
    },
    {
      customerName: 'Otabek Ergashev',
      phone: '+998 93 111 22 33',
      address: 'Chirchiq',
      note: null,
      hoursAgo: 30,
      status: 'REJECTED' as const,
      items: [['Gazoblok D500 (600x300x200)', 5]] as [string, number][],
    },
  ];
  for (const o of onlineDefs) {
    const items = o.items.map(([name, quantity]) => {
      const p = pick(name);
      return { productId: p.id, name, quantity, price: p.price };
    });
    await prisma.onlineOrder.create({
      data: {
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        note: o.note,
        status: o.status,
        rejectReason: o.status === 'REJECTED' ? "Mijoz bilan bog'lanib bo'lmadi" : null,
        handledById: o.status === 'REJECTED' ? admin.id : null,
        handledAt: o.status === 'REJECTED' ? new Date() : null,
        total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        createdAt: new Date(Date.now() - o.hoursAgo * 3600 * 1000),
        items: { create: items },
      },
    });
  }

  console.log('Seeding subscription...');
  const subStart = new Date(Date.now() - 20 * DAY_MS);
  const subEnd = new Date(subStart);
  subEnd.setMonth(subEnd.getMonth() + 1);
  await prisma.subscriptionPayment.create({
    data: {
      plan: 'BUSINESS',
      months: 1,
      amount: 299000,
      method: PaymentMethod.CARD,
      periodStart: subStart,
      periodEnd: subEnd,
      userId: admin.id,
    },
  });

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
