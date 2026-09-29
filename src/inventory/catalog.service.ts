import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
import type { MessageKey } from '../i18n/messages';
import { PrismaService } from '../prisma/prisma.service';
import { NamedDto, UnitDto } from './dto/catalog.dto';

// O'lchov birligi, brend va mahsulot turi - bir xil tuzilishdagi kichik ma'lumotnomalar
@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  units() {
    return this.prisma.unit.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  createUnit(dto: UnitDto) {
    return this.prisma.unit.create({ data: dto });
  }

  async updateUnit(id: string, dto: UnitDto) {
    await this.ensure(
      this.prisma.unit.findUnique({ where: { id } }),
      'unit.notFound',
    );
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async removeUnit(id: string) {
    const unit = await this.ensure(
      this.prisma.unit.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
      }),
      'unit.notFound',
    );
    if (unit._count.products > 0) {
      throw badRequest('unit.inUse', { n: unit._count.products });
    }
    return this.prisma.unit.delete({ where: { id } });
  }

  brands() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  createBrand(dto: NamedDto) {
    return this.prisma.brand.create({ data: dto });
  }

  async updateBrand(id: string, dto: NamedDto) {
    await this.ensure(
      this.prisma.brand.findUnique({ where: { id } }),
      'brand.notFound',
    );
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async removeBrand(id: string) {
    await this.ensure(
      this.prisma.brand.findUnique({ where: { id } }),
      'brand.notFound',
    );
    return this.prisma.brand.delete({ where: { id } });
  }

  productTypes() {
    return this.prisma.productType.findMany({ orderBy: { name: 'asc' } });
  }

  createProductType(dto: NamedDto) {
    return this.prisma.productType.create({ data: dto });
  }

  async removeProductType(id: string) {
    await this.ensure(
      this.prisma.productType.findUnique({ where: { id } }),
      'productType.notFound',
    );
    return this.prisma.productType.delete({ where: { id } });
  }

  private async ensure<T>(
    query: Promise<T | null>,
    label: MessageKey,
  ): Promise<T> {
    const found = await query;
    if (!found) throw notFound(label);
    return found;
  }
}
