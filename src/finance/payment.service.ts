import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { InvoiceStatus } from '../../generated/prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw notFound('invoice.notFound');
    if (invoice.status === InvoiceStatus.PAID) throw badRequest('invoice.paid');
    if (invoice.status === InvoiceStatus.CANCELLED)
      throw badRequest('invoice.cancelled');

    const paidBefore = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remaining = Number(invoice.amount) - paidBefore;
    if (dto.amount > remaining + 0.001) {
      throw badRequest('payment.tooMuch', { remaining });
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: { ...dto, userId } });

      const paidTotal = paidBefore + dto.amount;
      const status =
        paidTotal >= Number(invoice.amount) - 0.001
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: { status },
      });

      return payment;
    });
  }
}
