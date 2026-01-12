import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueJob, QueueProcessor } from '../queue';
import { MailOptions } from './interfaces/mail.interface';
import { MAIL_PROVIDER } from './mail.constants';
import { MailProvider } from './providers/mail.provider';

export const MAIL_QUEUE_NAME = 'mail';
export const MAIL_JOB_NAME = 'send';

@Injectable()
export class MailProcessor implements QueueProcessor<MailOptions> {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  async process(job: QueueJob<MailOptions>): Promise<string> {
    const { to, subject } = job.data;

    this.logger.log(`处理邮件发送任务: ${to}, 主题: ${subject}`);

    try {
      const messageId = await this.provider.sendMail(job.data);
      this.logger.log(`邮件发送成功: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`邮件发送失败: ${to}, 错误: ${error.message}`);
      throw error;
    }
  }
}
