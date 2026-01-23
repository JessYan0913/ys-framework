import { Injectable, Logger } from '@nestjs/common';
import { CreateNotificationDto, InAppNotification } from './interfaces/in-app-notification.interface';
import { InAppNotificationGateway } from './in-app-notification.gateway';

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(private readonly gateway: InAppNotificationGateway) {}

  /**
   * Push an in-app notification via Gateway (Real-time only)
   * This does NOT persist the notification.
   */
  async push(notification: InAppNotification): Promise<void> {
    try {
      await this.gateway.push(notification.userId, notification);
    } catch (gatewayError) {
      this.logger.warn(`Failed to push notification via gateway: ${gatewayError.message}`);
    }
  }

  /**
   * Broadcast a notification to all online users (Real-time only)
   */
  async broadcast(notification: InAppNotification): Promise<void> {
    try {
      await this.gateway.broadcast(notification);
    } catch (error) {
      this.logger.error(`Failed to broadcast notification: ${error.message}`);
      throw error;
    }
  }
}
