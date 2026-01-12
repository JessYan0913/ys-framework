import { Inject, Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { MailConfig, MailOptions, MailTemplate } from './interfaces/mail.interface';
import { MAIL_CONFIG, MAIL_PROVIDER } from './mail.constants';
import {
  MailAuthenticationError,
  MailConnectionError,
  MailError,
  MailRateLimitError,
  MailTimeoutError,
  MailValidationError,
} from './errors/mail.errors';
import { MailProvider } from './providers/mail.provider';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_CONFIG) private readonly config: MailConfig,
    @Inject(MAIL_PROVIDER) private readonly provider: MailProvider
  ) {}

  /**
   * 发送邮件
   * @param options 邮件选项
   */
  async sendMail(options: MailOptions): Promise<string> {
    try {
      this.validateMailOptions(options);

      const messageId = await this.provider.sendMail(options);
      this.logger.log(`邮件发送成功: ${messageId}`);

      return messageId;
    } catch (error) {
      const mailError = this.mapErrorToTypedError(error);
      this.logger.error('邮件发送失败:', mailError);
      throw mailError;
    }
  }

  /**
   * 发送文本邮件
   */
  async sendText(to: string, subject: string, text: string): Promise<string> {
    return this.sendMail({ to, subject, text });
  }

  /**
   * 发送 HTML 邮件
   */
  async sendHtml(to: string, subject: string, html: string): Promise<string> {
    return this.sendMail({ to, subject, html });
  }

  /**
   * 发送模板邮件
   * @param to 收件人
   * @param template 邮件模板对象
   * @param data 模板数据
   */
  async sendTemplate(to: string, template: MailTemplate, data: Record<string, any>): Promise<string> {
    const html = Handlebars.compile(template.html)(data);
    const text = template.text ? Handlebars.compile(template.text)(data) : undefined;

    return this.sendMail({ 
      to, 
      subject: template.subject, 
      html, 
      text 
    });
  }

  /**
   * 批量发送模板邮件
   * @param recipients 收件人列表
   * @param template 邮件模板对象
   * @param dataList 模板数据列表（与收件人一一对应）
   */
  async sendBatchTemplate(
    recipients: string[], 
    template: MailTemplate, 
    dataList: Record<string, any>[]
  ): Promise<Array<{ to: string; messageId: string }>> {
    const results: Array<{ to: string; messageId: string }> = [];

    for (let i = 0; i < recipients.length; i++) {
      const to = recipients[i];
      const messageId = await this.sendTemplate(to, template, dataList[i] || {});
      results.push({ to, messageId });
    }

    return results;
  }

  /**
   * 验证邮件配置
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.provider.verifyConnection();
      this.logger.log('SMTP 连接验证成功');
      return true;
    } catch (error) {
      this.logger.error('SMTP 连接验证失败:', error);
      return false;
    }
  }

  private validateMailOptions(options: MailOptions): void {
    if (!options.to) {
      throw new MailValidationError('收件人地址不能为空');
    }
    if (!options.subject) {
      throw new MailValidationError('邮件主题不能为空');
    }
    if (!options.text && !options.html) {
      throw new MailValidationError('邮件内容不能为空（需要 text 或 html）');
    }
    if (Array.isArray(options.to) && options.to.length === 0) {
      throw new MailValidationError('收件人列表不能为空');
    }
  }

  private mapErrorToTypedError(error: any): MailError {
    if (error instanceof MailError) {
      return error;
    }

    const errorMessage = error?.message || String(error);
    const provider = `${this.config.host}:${this.config.port}`;

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return new MailConnectionError(`无法连接到邮件服务器: ${errorMessage}`, provider);
    }

    if (
      errorMessage.includes('535') ||
      errorMessage.toLowerCase().includes('authentication') ||
      errorMessage.toLowerCase().includes('invalid credentials')
    ) {
      return new MailAuthenticationError(`邮件服务器认证失败: ${errorMessage}`, provider);
    }

    if (
      errorMessage.includes('421') ||
      errorMessage.includes('452') ||
      errorMessage.toLowerCase().includes('rate limit')
    ) {
      return new MailRateLimitError(`邮件发送频率受限: ${errorMessage}`, provider);
    }

    if (errorMessage.includes('ETIMEDOUT') || errorMessage.toLowerCase().includes('timeout')) {
      return new MailTimeoutError(`邮件发送超时: ${errorMessage}`, provider);
    }

    if (
      errorMessage.includes('550') ||
      errorMessage.toLowerCase().includes('invalid address') ||
      errorMessage.toLowerCase().includes('recipient')
    ) {
      return new MailValidationError(`收件人地址无效: ${errorMessage}`);
    }

    return new MailError(`邮件发送失败: ${errorMessage}`, 'MAIL_SEND_ERROR', true, provider);
  }
}