import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
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
    if (!invoice) throw notFound('invoice.notFound');
    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw notFound('customer.notFound');
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
      throw badRequest('invoice.hasPayments');
    }
    await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
    return this.findOne(id);
  }
}
