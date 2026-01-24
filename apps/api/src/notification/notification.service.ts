import { Injectable } from '@nestjs/common';
import { CreateNotificationDto, InAppNotification, InAppNotificationService } from '@lib/in-app-notification';
import { DrizzleService } from '@ys/database/nestjs';
import { notification } from '@ys/database';
import { and, count, desc, eq } from 'drizzle-orm';

@Injectable()
export class NotificationService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  async send(dto: CreateNotificationDto): Promise<InAppNotification> {
    // 1. Business Logic: Persist notification
    const [savedNotification] = await this.drizzle.db.insert(notification).values(dto).returning();
    const result = savedNotification as InAppNotification;

    // 2. Capability Call: Push notification via pure capability layer
    await this.inAppNotificationService.push(result);

    return result;
  }

  async broadcast(dto: CreateNotificationDto): Promise<void> {
    // Note: Broadcast persistence strategy depends on business requirements.
    // Here we just use the capability to broadcast.
    const tempNotification: InAppNotification = {
      id: 'broadcast-' + Date.now(),
      createdAt: new Date(),
      isRead: false,
      ...dto,
    };
    await this.inAppNotificationService.broadcast(tempNotification);
  }

  async getUserNotifications(userId: string, query?: any): Promise<InAppNotification[]> {
    return (await this.drizzle.db
      .select()
      .from(notification)
      .where(eq(notification.userId, userId))
      .orderBy(desc(notification.createdAt))
      .limit(query?.limit || 50)) as InAppNotification[];
  }

  async markAsRead(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .update(notification)
      .set({ isRead: true })
      .where(eq(notification.id, id))
      .returning();
    return result.length > 0;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.drizzle.db
      .update(notification)
      .set({ isRead: true })
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await this.drizzle.db
      .select({ count: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));
    return result.count;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(notification)
      .where(eq(notification.id, id))
      .returning();
    return result.length > 0;
  }
}
