import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { InvoiceStatus } from '../../generated/prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: dto });

      const paidTotal = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + dto.amount;
      const status =
        paidTotal >= Number(invoice.amount) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      await tx.invoice.update({ where: { id: dto.invoiceId }, data: { status } });

      return payment;
    });
  }
}
