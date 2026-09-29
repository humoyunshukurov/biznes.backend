import { Injectable } from '@nestjs/common';
import { notFound } from '../i18n/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.expense.findMany({ orderBy: { date: 'desc' } });
  }

  create(dto: CreateExpenseDto, userId: string) {
    return this.prisma.expense.create({
      data: {
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        method: dto.method,
        userId,
      },
    });
  }

  async remove(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw notFound('expense.notFound');
    return this.prisma.expense.delete({ where: { id } });
  }
}
