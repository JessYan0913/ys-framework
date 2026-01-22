import { MailService } from '@lib/mail';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { welcomeTemplate } from '../templates/welcome.template';
import { UserRegisteredEvent } from '../events/user-registered.event';

@Injectable()
export class UserRegisteredListener {
  private readonly logger = new Logger(UserRegisteredListener.name);

  constructor(private readonly mailService: MailService) {}

  // 优先级高：使用 prependListener: true 确保在队列最前面执行
  @OnEvent('user.registered', { prependListener: true })
  async handleAccountSetup(event: UserRegisteredEvent) {
    this.logger.log(`[High Priority] Initializing account settings for user ${event.userId}...`);
    // 模拟耗时操作
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.logger.log(`[High Priority] Account settings initialized.`);
  }

  // 优先级低：默认追加到队列尾部
  @OnEvent('user.registered')
  async handleWelcomeEmail(event: UserRegisteredEvent) {
    this.logger.log(`[Normal Priority] Sending welcome email to ${event.email}...`);
    try {
      await this.mailService.sendTemplate(event.email, welcomeTemplate, {
        name: event.name || 'User',
        loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`,
      });
      this.logger.log(`[Normal Priority] Welcome email sent.`);
    } catch (error) {
      this.logger.error('Failed to send welcome email', error);
    }
  }
}
