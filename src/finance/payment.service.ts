import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (!invoice) throw new NotFoundException('Hisob-faktura topilmadi');
    if (invoice.status === InvoiceStatus.PAID)
      throw new BadRequestException("Hisob-faktura to'liq to'langan");
    if (invoice.status === InvoiceStatus.CANCELLED)
      throw new BadRequestException('Hisob-faktura bekor qilingan');

    const paidBefore = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remaining = Number(invoice.amount) - paidBefore;
    if (dto.amount > remaining + 0.001) {
      throw new BadRequestException(
        `To'lov summasi qolgan qarzdan oshmasligi kerak (qolgan: ${remaining})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: dto });

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
