import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationService } from './in-app-notification.service';
import { InAppNotificationGateway } from './in-app-notification.gateway';
import { InAppNotification } from './interfaces/in-app-notification.interface';

describe('InAppNotificationService (Capability Layer)', () => {
  let service: InAppNotificationService;
  let gateway: InAppNotificationGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationService,
        {
          provide: InAppNotificationGateway,
          useValue: {
            push: jest.fn(),
            broadcast: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InAppNotificationService>(InAppNotificationService);
    gateway = module.get<InAppNotificationGateway>(InAppNotificationGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('push', () => {
    it('should call gateway.push with correct arguments', async () => {
      const notification: InAppNotification = {
        id: '1',
        userId: 'user1',
        title: 'Test',
        content: 'Content',
        isRead: false,
        createdAt: new Date(),
        type: 'info',
      };

      await service.push(notification);

      expect(gateway.push).toHaveBeenCalledWith(notification.userId, notification);
    });

    it('should handle gateway errors gracefully', async () => {
      const notification: InAppNotification = {
        id: '1',
        userId: 'user1',
        title: 'Test',
        content: 'Content',
        isRead: false,
        createdAt: new Date(),
        type: 'info',
      };

      (gateway.push as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      await service.push(notification); // Should not throw

      expect(gateway.push).toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('should call gateway.broadcast', async () => {
      const notification: InAppNotification = {
        id: '1',
        userId: 'all',
        title: 'Broadcast',
        content: 'Content',
        isRead: false,
        createdAt: new Date(),
        type: 'info',
      };

      await service.broadcast(notification);

      expect(gateway.broadcast).toHaveBeenCalledWith(notification);
    });
  });
});
