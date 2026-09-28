import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { InvoiceStatus } from '../../generated/prisma/client';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.invoice.findMany({
      include: { customer: true, payments: { orderBy: { paidAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, payments: { orderBy: { paidAt: 'desc' } } },
    });
    if (!invoice) throw new NotFoundException('Hisob-faktura topilmadi');
    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    return this.prisma.invoice.create({
      data: {
        customerId: dto.customerId,
        orderId: dto.orderId,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async cancel(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status === InvoiceStatus.CANCELLED) return invoice;
    if (invoice.payments.length > 0) {
      throw new BadRequestException(
        "To'lov qilingan hisob-fakturani bekor qilib bo'lmaydi",
      );
    }
    await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
    return this.findOne(id);
  }
}
