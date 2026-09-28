import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      "O'lchov birligi",
    );
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async removeUnit(id: string) {
    const unit = await this.ensure(
      this.prisma.unit.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
      }),
      "O'lchov birligi",
    );
    if (unit._count.products > 0) {
      throw new BadRequestException(
        `Bu o'lchov birligi ${unit._count.products} ta mahsulotda ishlatilgan`,
      );
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
    await this.ensure(this.prisma.brand.findUnique({ where: { id } }), 'Brend');
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async removeBrand(id: string) {
    await this.ensure(this.prisma.brand.findUnique({ where: { id } }), 'Brend');
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
      'Mahsulot turi',
    );
    return this.prisma.productType.delete({ where: { id } });
  }

  private async ensure<T>(query: Promise<T | null>, label: string): Promise<T> {
    const found = await query;
    if (!found) throw new NotFoundException(`${label} topilmadi`);
    return found;
  }
}
