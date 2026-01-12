import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail';
import { QueueJob, QueueProcessor } from '../queue';
import { generateEmailCaptchaHtml, generateEmailCaptchaText } from './templates/email-captcha.template';
import { EmailCaptchaJobData } from './types';

export const EMAIL_CAPTCHA_QUEUE_NAME = 'email-captcha';
export const EMAIL_CAPTCHA_JOB_NAME = 'send-captcha';

@Injectable()
export class EmailCaptchaProcessor implements QueueProcessor<EmailCaptchaJobData> {
  private readonly logger = new Logger(EmailCaptchaProcessor.name);

  constructor(private readonly mailService: MailService) {}

  async process(job: QueueJob<EmailCaptchaJobData>): Promise<void> {
    const { email, code, purpose, ttl } = job.data;

    this.logger.log(`处理邮件验证码任务: ${email}, 用途: ${purpose}`);

    const subject = `验证码：${code}`;
    const templateData = {
      purposeText: this.getPurposeText(purpose),
      purposeAction: this.getPurposeAction(purpose),
      code,
      ttlMinutes: Math.floor(ttl / 60),
    };

    const html = generateEmailCaptchaHtml(templateData);
    const text = generateEmailCaptchaText(templateData);

    try {
      await this.mailService.sendMail({
        to: email,
        subject,
        html,
        text,
      });
      this.logger.log(`邮件发送成功: ${email}`);
    } catch (error) {
      this.logger.error(`邮件发送失败: ${email}, 错误: ${error.message}`);
      throw error;
    }
  }

  private getPurposeText(purpose: string): string {
    const purposeMap: Record<string, string> = {
      reset_password: '重置密码',
      login: '登录',
      register: '注册',
      bind_email: '绑定邮箱',
      change_email: '更换邮箱',
    };
    return purposeMap[purpose] || purpose;
  }

  private getPurposeAction(purpose: string): string {
    const actionMap: Record<string, string> = {
      reset_password: '重置密码',
      login: '登录验证',
      register: '账号注册',
      bind_email: '邮箱绑定',
      change_email: '邮箱更换',
    };
    return actionMap[purpose] || purpose;
  }
}
