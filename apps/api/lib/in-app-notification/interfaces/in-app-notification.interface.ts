export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type?: string;
  isRead: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

export type CreateNotificationDto = Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>;
