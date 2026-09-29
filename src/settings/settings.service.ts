import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { UpdateSettingsDto } from './settings.dto';

type Section = keyof UpdateSettingsDto;

export const defaultSettings = {
  company: { name: 'Biznes ERP', phone: '', address: '', inn: '' },
  receipt: {
    header: '',
    footer: 'Xaridingiz uchun rahmat!',
    width: 80,
    showCustomer: true,
    showCashier: true,
  },
  printer: { labelSize: '58x40', labelShowName: true, labelShowPrice: true },
  support: { phone: '', telegram: '' },
  online: {
    enabled: false,
    showStock: true,
    phone: '',
    delivery: '',
    minOrder: 0,
  },
};

export type AppSettings = typeof defaultSettings;

const SECTIONS: Section[] = [
  'company',
  'receipt',
  'printer',
  'support',
  'online',
];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<AppSettings> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: SECTIONS } },
    });
    const result = structuredClone(defaultSettings) as Record<
      string,
      Record<string, unknown>
    >;
    for (const row of rows) {
      if (row.value && typeof row.value === 'object') {
        Object.assign(result[row.key], row.value as Record<string, unknown>);
      }
    }
    return result as AppSettings;
  }

  async update(dto: UpdateSettingsDto) {
    const current = await this.get();
    await this.prisma.$transaction(
      SECTIONS.filter((s) => dto[s]).map((section) => {
        const value = {
          ...current[section],
          ...dto[section],
        } as Prisma.InputJsonObject;
        return this.prisma.setting.upsert({
          where: { key: section },
          create: { key: section, value },
          update: { value },
        });
      }),
    );
    return this.get();
  }
}
