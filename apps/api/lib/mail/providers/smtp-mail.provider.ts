import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { MAIL_CONFIG } from '../mail.constants';
import { MailConfig, MailOptions } from '../interfaces/mail.interface';
import { MailProvider } from './mail.provider';

@Injectable()
export class SmtpMailProvider implements MailProvider {
  private readonly logger = new Logger(SmtpMailProvider.name);
  private transporter: Transporter;

  constructor(@Inject(MAIL_CONFIG) private readonly config: MailConfig) {
    this.transporter = createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });
    
    this.logger.log(`SMTP 邮件服务初始化: ${this.config.host}:${this.config.port}`);
  }

  async sendMail(options: MailOptions): Promise<string> {
    try {
      const mailOptions = {
        from: options.from || this.config.from || this.config.auth.user,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`邮件发送成功: ${info.messageId}`);
      return info.messageId;
    } catch (error) {
      this.logger.error('邮件发送失败:', error);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP 连接验证成功');
      return true;
    } catch (error) {
      this.logger.error('SMTP 连接验证失败:', error);
      throw error;
    }
  }
}
