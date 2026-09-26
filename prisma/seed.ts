import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, StockMovementType, OrderStatus, InvoiceStatus, PaymentMethod } from '../generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No admin user found - register one first via /auth/register');

  console.log('Clearing existing business data...');
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();

  console.log('Seeding categories...');
  const categoryNames = [
    'Sement va qorishmalar',
    'Metall va armatura',
    "Bo'yoq va emulsiya",
    "G'isht va bloklar",
    'Pol qoplamalari',
    'Izolyatsiya materiallari',
  ];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.create({ data: { name } });
    categories[name] = cat.id;
  }

  console.log('Seeding products...');
  const productDefs = [
    { name: 'Portland Sement M400 (50kg)', sku: 'SKU-CM-001', unit: 'dona', price: 85000, stock: 450, cat: 'Sement va qorishmalar' },
    { name: 'Portland Sement M500 (50kg)', sku: 'SKU-CM-002', unit: 'dona', price: 95000, stock: 300, cat: 'Sement va qorishmalar' },
    { name: 'Shpaklyovka Ceresit (25kg)', sku: 'SKU-CM-003', unit: 'dona', price: 62000, stock: 180, cat: 'Sement va qorishmalar' },
    { name: 'Armatura 12mm (A500C)', sku: 'SKU-MT-001', unit: 'metr', price: 12000, stock: 3200, cat: 'Metall va armatura' },
    { name: 'Armatura 16mm (A500C)', sku: 'SKU-MT-002', unit: 'metr', price: 21000, stock: 1800, cat: 'Metall va armatura' },
    { name: 'Profil truba 40x20mm', sku: 'SKU-MT-003', unit: 'metr', price: 28000, stock: 900, cat: 'Metall va armatura' },
    { name: "Tikkurila fasad bo'yog'i (10L)", sku: 'SKU-PT-001', unit: 'dona', price: 450000, stock: 85, cat: "Bo'yoq va emulsiya" },
    { name: 'Gruntovka (5L)', sku: 'SKU-PT-002', unit: 'dona', price: 95000, stock: 140, cat: "Bo'yoq va emulsiya" },
    { name: "G'isht M150 (qizil, pishiq)", sku: 'SKU-BR-001', unit: 'dona', price: 800, stock: 18500, cat: "G'isht va bloklar" },
    { name: 'Gazoblok D500 (600x300x200)', sku: 'SKU-BR-002', unit: 'dona', price: 24000, stock: 2400, cat: "G'isht va bloklar" },
    { name: 'Laminat AC4 12mm (Kastamonu)', sku: 'SKU-LM-001', unit: 'm2', price: 95000, stock: 640, cat: 'Pol qoplamalari' },
    { name: 'Plintus PVX', sku: 'SKU-LM-002', unit: 'metr', price: 18000, stock: 1200, cat: 'Pol qoplamalari' },
    { name: 'Mineral vata 100mm (Isover)', sku: 'SKU-IZ-001', unit: 'm2', price: 38000, stock: 280, cat: 'Izolyatsiya materiallari' },
    { name: 'Ruberoid RKP-350', sku: 'SKU-IZ-002', unit: 'rulon', price: 120000, stock: 95, cat: 'Izolyatsiya materiallari' },
  ];
  const products: Record<string, { id: string; price: number }> = {};
  for (const p of productDefs) {
    const product = await prisma.product.create({
      data: { name: p.name, sku: p.sku, unit: p.unit, price: p.price, quantity: p.stock, categoryId: categories[p.cat] },
    });
    products[p.sku] = { id: product.id, price: p.price };
    await prisma.stockMovement.create({
      data: { productId: product.id, type: StockMovementType.IN, quantity: p.stock, note: "Boshlang'ich zaxira", userId: admin.id },
    });
  }

  console.log('Seeding customers...');
  const customerDefs = [
    { name: 'Alisher Qodirov', phone: '+998 (90) 123-45-67', email: 'a.qodirov@toshkentmall.uz', address: "Toshkent sh., Shayxontohur t., Navoiy ko'chasi 18" },
    { name: 'Jamshid Rahimov', phone: '+998 (93) 890-11-22', email: 'info@samtrans.uz', address: "Samarqand sh., Gagarin ko'chasi 45" },
    { name: 'Muzaffar Tojiyev', phone: '+998 (97) 540-33-44', email: 'm.tojiyev@bngq.uz', address: 'Buxoro sh., Sanoat hududi, 12-baza' },
    { name: 'Nodira Salimova', phone: '+998 (91) 400-88-99', email: 'salimova@ferganatex.uz', address: "Farg'ona sh., Marg'ilon ko'chasi 7" },
    { name: 'Dilshod Normatov', phone: '+998 (99) 700-12-34', email: 'dilshod@chirchiqchem.uz', address: 'Toshkent vil., Chirchiq sh., Sanoat ko\'chasi 10' },
    { name: "Sardorbek Jo'rayev", phone: '+998 (94) 650-22-11', email: 'agrotex_andijon@mail.uz', address: "Andijon sh., Bobur shoh ko'chasi 102" },
  ];
  const customers = [];
  for (const c of customerDefs) {
    customers.push(await prisma.customer.create({ data: c }));
  }

  console.log('Seeding orders...');
  const orderPlans = [
    { customer: 0, status: OrderStatus.COMPLETED, items: [['SKU-CM-001', 40], ['SKU-MT-001', 200]] },
    { customer: 1, status: OrderStatus.COMPLETED, items: [['SKU-PT-001', 4], ['SKU-PT-002', 6]] },
    { customer: 2, status: OrderStatus.SHIPPED, items: [['SKU-MT-002', 300], ['SKU-MT-003', 80]] },
    { customer: 3, status: OrderStatus.CONFIRMED, items: [['SKU-LM-001', 60], ['SKU-LM-002', 120]] },
    { customer: 4, status: OrderStatus.NEW, items: [['SKU-IZ-001', 30]] },
    { customer: 0, status: OrderStatus.COMPLETED, items: [['SKU-BR-001', 5000], ['SKU-BR-002', 200]] },
    { customer: 5, status: OrderStatus.CANCELLED, items: [['SKU-CM-002', 20]] },
    { customer: 2, status: OrderStatus.COMPLETED, items: [['SKU-IZ-002', 15], ['SKU-CM-003', 25]] },
  ];
  const orders = [];
  for (const plan of orderPlans) {
    const itemsData = (plan.items as [string, number][]).map(([sku, qty]) => ({
      productId: products[sku].id,
      quantity: qty,
      price: products[sku].price,
    }));
    const totalAmount = itemsData.reduce((s, i) => s + i.quantity * Number(i.price), 0);
    const order = await prisma.order.create({
      data: {
        customerId: customers[plan.customer].id,
        userId: admin.id,
        status: plan.status,
        totalAmount,
        items: { create: itemsData },
      },
    });
    orders.push(order);
    if (plan.status !== OrderStatus.CANCELLED) {
      for (const item of itemsData) {
        await prisma.product.update({ where: { id: item.productId }, data: { quantity: { decrement: item.quantity } } });
        await prisma.stockMovement.create({
          data: { productId: item.productId, type: StockMovementType.OUT, quantity: item.quantity, note: `Buyurtma ${order.id}`, userId: admin.id },
        });
      }
    }
  }

  console.log('Seeding invoices & payments...');
  const invoicePlans = [
    { order: 0, customer: 0, status: InvoiceStatus.PAID, daysOffset: -10, payFull: true },
    { order: 1, customer: 1, status: InvoiceStatus.PAID, daysOffset: -5, payFull: true },
    { order: 2, customer: 2, status: InvoiceStatus.PARTIALLY_PAID, daysOffset: 5, payFull: false },
    { order: 3, customer: 3, status: InvoiceStatus.UNPAID, daysOffset: 10, payFull: false },
    { order: 5, customer: 0, status: InvoiceStatus.PAID, daysOffset: -20, payFull: true },
    { order: 7, customer: 2, status: InvoiceStatus.UNPAID, daysOffset: -3, payFull: false },
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
        data: { invoiceId: invoice.id, amount: order.totalAmount, method: PaymentMethod.BANK_TRANSFER, note: "To'liq to'lov" },
      });
    } else if (plan.status === InvoiceStatus.PARTIALLY_PAID) {
      await prisma.payment.create({
        data: { invoiceId: invoice.id, amount: Number(order.totalAmount) * 0.4, method: PaymentMethod.CASH, note: "Qisman to'lov" },
      });
    }
  }

  console.log('Seeding expenses...');
  const expenseDefs = [
    { category: 'Ijara', amount: 18000000, description: 'Chilonzor omborining oylik ijara to\'lovi' },
    { category: 'Oylik maosh', amount: 28500000, description: 'Omborxona xodimlarining oylik ish haqi' },
    { category: 'Logistika & Bojxona', amount: 12400000, description: 'Optik kabel partiyasi bojxona va logistika xarajatlari' },
    { category: 'Kommunal', amount: 4200000, description: 'Elektr energiyasi va kommunal to\'lovlar' },
    { category: 'Marketing', amount: 3500000, description: "Ijtimoiy tarmoqlarda reklama" },
  ];
  for (const e of expenseDefs) {
    await prisma.expense.create({ data: { ...e, userId: admin.id } });
  }

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
