import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { InAppNotificationService } from '@lib/in-app-notification';
import { DrizzleService } from '@ys/database/nestjs';
import { CreateNotificationDto } from '@lib/in-app-notification';

describe('NotificationService (Business Layer)', () => {
  let service: NotificationService;
  let drizzleService: any;
  let inAppNotificationService: any;

  beforeEach(async () => {
    drizzleService = {
      db: {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn(),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      },
    };

    inAppNotificationService = {
      push: jest.fn(),
      broadcast: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: DrizzleService, useValue: drizzleService },
        { provide: InAppNotificationService, useValue: inAppNotificationService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should save notification and call capability push', async () => {
      const dto: CreateNotificationDto = {
        userId: 'user1',
        title: 'Test',
        content: 'Content',
        type: 'info',
      };
      const savedNotification = { ...dto, id: '1', createdAt: new Date(), isRead: false };

      drizzleService.db.returning.mockResolvedValue([savedNotification]);

      const result = await service.send(dto);

      expect(drizzleService.db.insert).toHaveBeenCalled();
      expect(inAppNotificationService.push).toHaveBeenCalledWith(savedNotification);
      expect(result).toEqual(savedNotification);
    });
  });
});
