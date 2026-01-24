import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from '@lib/in-app-notification';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async send(@Body() dto: CreateNotificationDto) {
    return this.notificationService.send(dto);
  }

  @Post('broadcast')
  async broadcast(@Body() dto: CreateNotificationDto) {
    return this.notificationService.broadcast(dto);
  }

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query() query: any,
  ) {
    return this.notificationService.getUserNotifications(userId, query);
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.notificationService.delete(id);
  }
}
