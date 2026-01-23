import { Module } from '@nestjs/common';
import { InAppNotificationService } from './in-app-notification.service';
import { InAppNotificationGateway } from './in-app-notification.gateway';

@Module({
  providers: [InAppNotificationService, InAppNotificationGateway],
  exports: [InAppNotificationService, InAppNotificationGateway],
})
export class InAppNotificationModule {}
