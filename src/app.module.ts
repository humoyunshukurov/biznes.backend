import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { FinanceModule } from './finance/finance.module';
import { ShiftModule } from './shift/shift.module';
import { SettingsModule } from './settings/settings.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { StatsModule } from './stats/stats.module';
import { CashModule } from './cash/cash.module';
import { OnlineModule } from './online/online.module';
import { PosModule } from './pos/pos.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    InventoryModule,
    SalesModule,
    FinanceModule,
    ShiftModule,
    SettingsModule,
    SuppliersModule,
    StatsModule,
    CashModule,
    OnlineModule,
    PosModule,
    SubscriptionModule,
  ],
})
export class AppModule {}
