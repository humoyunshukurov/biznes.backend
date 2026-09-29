import { Module } from '@nestjs/common';
import { SalesModule } from '../sales/sales.module';
import { SettingsModule } from '../settings/settings.module';
import { OnlineController, PublicShopController } from './online.controller';
import { OnlineService } from './online.service';

@Module({
  imports: [SalesModule, SettingsModule],
  controllers: [PublicShopController, OnlineController],
  providers: [OnlineService],
})
export class OnlineModule {}
