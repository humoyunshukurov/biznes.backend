import { Injectable } from '@nestjs/common';
import { AppError, badRequest, conflict, notFound } from '../i18n/app-error';
import { translate, type Lang } from '../i18n/messages';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  ImportProductRowDto,
  ImportProductsDto,
  UpdateProductDto,
} from './dto/product.dto';
import {
  MovementKind,
  Prisma,
  StockMovementType,
} from '../../generated/prisma/client';

const productInclude = {
  unit: true,
  category: true,
  brand: true,
  productType: true,
  barcodes: { orderBy: { id: 'asc' } },
} satisfies Prisma.ProductInclude;

type Tx = Prisma.TransactionClient;

function normalizeBarcodes(codes: string[]) {
  const cleaned = codes.map((c) => c.trim()).filter(Boolean);
  const unique = [...new Set(cleaned)];
  if (unique.length === 0) throw badRequest('val.barcodeRequired');
  if (unique.length !== cleaned.length)
    throw badRequest('product.barcodeDuplicate');
  return unique;
}

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw notFound('product.notFound');
    return product;
  }

  private async assertBarcodesFree(
    tx: Tx,
    codes: string[],
    exceptProductId?: string,
  ) {
    const taken = await tx.productBarcode.findMany({
      where: {
        code: { in: codes },
        ...(exceptProductId ? { productId: { not: exceptProductId } } : {}),
      },
      include: { product: { select: { name: true } } },
    });
    if (taken.length > 0) {
      const t = taken[0];
      throw conflict('product.barcodeTaken', {
        code: t.code,
        name: t.product.name,
      });
    }
  }

  private async assertSkuFree(
    tx: Tx,
    sku: string | null | undefined,
    exceptProductId?: string,
  ) {
    if (!sku) return;
    const existing = await tx.product.findFirst({
      where: {
        sku,
        ...(exceptProductId ? { id: { not: exceptProductId } } : {}),
      },
      select: { name: true },
    });
    if (existing)
      throw conflict('product.skuTaken', { sku, name: existing.name });
  }

  async create(dto: CreateProductDto, userId: string) {
    const { barcodes, quantity, ...data } = dto;
    const codes = normalizeBarcodes(barcodes);

    const product = await this.prisma.$transaction(async (tx) => {
      await this.assertBarcodesFree(tx, codes);
      await this.assertSkuFree(tx, data.sku);

      const created = await tx.product.create({
        data: {
          ...data,
          quantity: quantity ?? 0,
          barcodes: { create: codes.map((code) => ({ code })) },
        },
      });

      if (quantity && quantity !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: quantity > 0 ? StockMovementType.IN : StockMovementType.OUT,
            quantity: Math.abs(quantity),
            kind: MovementKind.INITIAL,
            userId,
          },
        });
      }
      return created;
    });

    return this.findOne(product.id);
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const existing = await this.findOne(id);
    const { barcodes, quantity, ...data } = dto;

    await this.prisma.$transaction(async (tx) => {
      if (barcodes) {
        const codes = normalizeBarcodes(barcodes);
        await this.assertBarcodesFree(tx, codes, id);
        await tx.productBarcode.deleteMany({ where: { productId: id } });
        await tx.productBarcode.createMany({
          data: codes.map((code) => ({ code, productId: id })),
        });
      }
      if (data.sku !== undefined) await this.assertSkuFree(tx, data.sku, id);

      await tx.product.update({ where: { id }, data });

      // Qoldiq qo'lda o'zgartirilsa, farqi tovar harakati sifatida yoziladi
      if (quantity !== undefined) {
        const delta = quantity - Number(existing.quantity);
        if (delta !== 0) {
          await tx.product.update({ where: { id }, data: { quantity } });
          await tx.stockMovement.create({
            data: {
              productId: id,
              type: delta > 0 ? StockMovementType.IN : StockMovementType.OUT,
              quantity: Math.abs(delta),
              kind: MovementKind.ADJUSTMENT,
              userId,
            },
          });
        }
      }
    });

    return this.findOne(id);
  }

  async toggleFavorite(id: string) {
    const product = await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { isFavorite: !product.isFavorite },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const used = await this.prisma.orderItem.count({
      where: { productId: id },
    });
    if (used > 0) {
      throw badRequest('product.usedInOrders', { n: used });
    }
    return this.prisma.product.delete({ where: { id } });
  }

  // Xato matnlari so'rov tilida qaytariladi
  async import(dto: ImportProductsDto, userId: string, lang: Lang) {
    const result = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const [index, row] of dto.rows.entries()) {
      const line = index + 2; // 1-qator sarlavha
      try {
        if (dto.mode === 'create') {
          const created = await this.importCreate(row, userId);
          if (created) result.created++;
          else result.skipped++;
        } else {
          const updated = await this.importUpdate(row, userId);
          if (updated) result.updated++;
          else {
            result.skipped++;
            result.errors.push(
              translate(lang, 'import.rowNotFound', {
                line,
                ref: row.barcode ?? row.sku ?? row.name ?? '',
              }),
            );
          }
        }
      } catch (e) {
        result.skipped++;
        const message =
          e instanceof AppError
            ? e.items.map((i) => translate(lang, i.key, i.params)).join('; ')
            : translate(lang, 'http.internal');
        result.errors.push(translate(lang, 'import.row', { line, message }));
      }
    }
    return result;
  }

  private async findOrCreateByName(
    model: 'unit' | 'category' | 'brand',
    name?: string,
  ) {
    const clean = name?.trim();
    if (!clean) return null;
    if (model === 'unit') {
      return (
        (await this.prisma.unit.findFirst({
          where: { name: { equals: clean, mode: 'insensitive' } },
        })) ?? (await this.prisma.unit.create({ data: { name: clean } }))
      );
    }
    if (model === 'brand') {
      return (
        (await this.prisma.brand.findFirst({
          where: { name: { equals: clean, mode: 'insensitive' } },
        })) ?? (await this.prisma.brand.create({ data: { name: clean } }))
      );
    }
    return (
      (await this.prisma.category.findFirst({
        where: { name: { equals: clean, mode: 'insensitive' } },
      })) ?? (await this.prisma.category.create({ data: { name: clean } }))
    );
  }

  private async importCreate(row: ImportProductRowDto, userId: string) {
    const name = row.name?.trim();
    if (!name) throw badRequest('val.nameRequired');

    const barcode = row.barcode?.trim() || generateEan13();
    const exists = await this.prisma.productBarcode.findUnique({
      where: { code: barcode },
    });
    if (exists) return false;

    const unit =
      (await this.findOrCreateByName('unit', row.unit)) ??
      (await this.findOrCreateByName('unit', 'dona'));
    const category = await this.findOrCreateByName('category', row.category);
    const brand = await this.findOrCreateByName('brand', row.brand);

    await this.create(
      {
        name,
        unitId: unit!.id,
        barcodes: [barcode],
        price: row.price ?? 0,
        wholesalePrice: row.wholesalePrice ?? null,
        costPrice: row.costPrice ?? null,
        quantity: row.quantity ?? 0,
        sku: row.sku?.trim() || null,
        categoryId: category?.id ?? null,
        brandId: brand?.id ?? null,
        isWeighted: row.isWeighted ?? false,
      },
      userId,
    );
    return true;
  }

  private async importUpdate(row: ImportProductRowDto, userId: string) {
    let productId: string | undefined;
    if (row.barcode?.trim()) {
      productId = (
        await this.prisma.productBarcode.findUnique({
          where: { code: row.barcode.trim() },
        })
      )?.productId;
    }
    if (!productId && row.sku?.trim()) {
      productId = (
        await this.prisma.product.findFirst({ where: { sku: row.sku.trim() } })
      )?.id;
    }
    if (!productId) return false;

    await this.update(
      productId,
      {
        ...(row.name?.trim() ? { name: row.name.trim() } : {}),
        ...(row.price !== undefined ? { price: row.price } : {}),
        ...(row.wholesalePrice !== undefined
          ? { wholesalePrice: row.wholesalePrice }
          : {}),
        ...(row.costPrice !== undefined ? { costPrice: row.costPrice } : {}),
        ...(row.quantity !== undefined ? { quantity: row.quantity } : {}),
      },
      userId,
    );
    return true;
  }
}

// Do'kon ichki shtrix-kodi: "2" bilan boshlanadigan to'g'ri nazorat raqamli EAN-13
export function generateEan13() {
  let digits = '2';
  for (let i = 0; i < 11; i++) digits += Math.floor(Math.random() * 10);
  const sum = digits
    .split('')
    .reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return digits + ((10 - (sum % 10)) % 10);
}
