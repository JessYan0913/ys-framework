import { Module } from '@nestjs/common';
import { InAppNotificationModule } from '@lib/in-app-notification';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { DrizzleModule } from '@ys/database/nestjs';

@Module({
  imports: [
    DrizzleModule,
    InAppNotificationModule, // No configuration needed, just capability
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
