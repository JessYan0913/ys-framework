import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { sign, verify } from 'jsonwebtoken';
import { MailService } from '../mail';

import { CaptchaError, CaptchaNotFoundError, StorageError, ValidationError } from './errors/email-captcha.errors';
import { generateEmailCaptchaHtml, generateEmailCaptchaText } from './templates/email-captcha.template';
import {
  EmailCaptchaConfig,
  EmailCaptchaServiceInterface,
  SendEmailCaptchaPayload,
  SendEmailCaptchaResult,
  VerifyEmailCaptchaPayload,
  VerifyEmailCaptchaResult,
} from './types';

interface TokenPayload {
  id: string;
  purpose: string;
}

@Injectable()
export class EmailCaptchaService implements EmailCaptchaServiceInterface {
  private readonly logger = new Logger(EmailCaptchaService.name);

  constructor(
    private config: EmailCaptchaConfig,
    @Optional() private mailService?: MailService,
  ) {
    if (!config.storage) {
      throw new Error('Storage service must be provided');
    }
    if (!config.secret) {
      throw new Error('JWT secret must be provided');
    }
  }

  private tokenStoreKey(token: string): string {
    return `email-captcha:token:${token}`;
  }

  async sendCaptcha(options: SendEmailCaptchaPayload): Promise<SendEmailCaptchaResult> {
    const { email, purpose, text, action } = options;

    this.logger.log(`发送邮件验证码到: ${email}, 用途: ${purpose}`);

    if (!email || !purpose || !text || !action) {
      throw new ValidationError('Email, purpose, text and action are required');
    }

    const code = this.generateCode();
    const id = randomBytes(16).toString('hex');
    const key = `email-captcha:${id}`;

    try {
      await this.config.storage.set(key, JSON.stringify({ code, purpose }), this.config.ttl);
      this.logger.log(`验证码已存储，ID: ${id}, TTL: ${this.config.ttl}秒`);
    } catch (error) {
      this.logger.error(`存储验证码失败: ${error}`);
      throw new StorageError(`Failed to store captcha: ${error}`);
    }

    // 发送邮件（使用 MailService，由 MailService 决定同步或异步）
    if (this.mailService) {
      try {
        const subject = `验证码：${code}`;
        const templateData = {
          purposeText: purpose === 'reset_password' ? '重置密码' : purpose === 'login' ? '登录' : purpose,
          purposeAction: purpose === 'reset_password' ? '重置密码' : purpose === 'login' ? '登录' : purpose,
          code,
          ttlMinutes: Math.floor(this.config.ttl / 60),
        };
        const html = generateEmailCaptchaHtml(templateData);
        const textBody = generateEmailCaptchaText(templateData);

        // 使用异步发送，MailService 内部决定是否通过队列
        await this.mailService.sendMailAsync({
          to: email,
          subject,
          html,
          text: textBody,
        });
        this.logger.log(`验证码邮件已发送: ${email}`);
      } catch (error) {
        throw new CaptchaError(`Failed to send email: ${error.message}`, 'EMAIL_SEND_FAILED');
      }
    } else {
      this.logger.warn(`邮件服务未配置，仅生成验证码`);
    }

    return { id };
  }

  async verifyCaptcha(options: VerifyEmailCaptchaPayload): Promise<VerifyEmailCaptchaResult> {
    const { id, code, purpose } = options;

    this.logger.log(`验证验证码，ID: ${id}, 用途: ${purpose}`);

    if (!id || !code || !purpose) {
      throw new ValidationError('ID, code and purpose are required');
    }

    const key = `email-captcha:${id}`;
    let stored;

    try {
      stored = await this.config.storage.get(key);
    } catch (error) {
      this.logger.error(`获取验证码失败: ${error}`);
      throw new StorageError(`Failed to retrieve captcha: ${error}`);
    }

    if (!stored) {
      this.logger.warn(`验证码不存在或已过期: ${id}`);
      throw new CaptchaNotFoundError();
    }

    const data = JSON.parse(stored);

    if (data.code !== code) {
      this.logger.warn(`验证码不匹配: ${id}`);
      throw new CaptchaError('Invalid code', 'CODE_MISMATCH');
    }

    if (data.purpose !== purpose) {
      this.logger.warn(`验证码用途不匹配: ${id}`);
      throw new CaptchaError('Purpose mismatch', 'PURPOSE_MISMATCH');
    }

    try {
      await this.config.storage.del(key);
      this.logger.log(`验证码已删除: ${id}`);
    } catch (error) {
      this.logger.error(`删除验证码失败: ${error}`);
      throw new StorageError(`Failed to delete captcha: ${error}`);
    }

    const token = sign({ id, purpose }, this.config.secret, { expiresIn: `${Math.floor(this.config.ttl / 60)}m` });

    try {
      await this.config.storage.set(this.tokenStoreKey(token), id, this.config.ttl);
      this.logger.log(`Token映射已存储(一次性): ${id}`);
    } catch (error) {
      this.logger.error(`存储Token映射失败: ${error.message}`);
      throw new StorageError(`Failed to store captcha token mapping: ${error}`);
    }

    this.logger.log(`验证码验证成功，生成token: ${id}`);

    return { id, token };
  }

  async verifyToken(id: string, token: string, purpose: string): Promise<boolean> {
    this.logger.log(`验证token: ${id}, 用途: ${purpose}`);

    try {
      const result = verify(token, this.config.secret);
      const payload = result as TokenPayload;
      const jwtValid = payload.id === id && payload.purpose === purpose;

      if (!jwtValid) {
        this.logger.warn(`Token JWT载荷校验失败: ${id}`);
        return false;
      }

      const tokenKey = this.tokenStoreKey(token);
      const storedId = await this.config.storage.get(tokenKey);

      if (!storedId || storedId !== id) {
        this.logger.warn(`Token已使用/已过期/不匹配: ${id}`);
        return false;
      }

      await this.config.storage.del(tokenKey);
      this.logger.log(`Token验证成功且已作废(一次性): ${id}`);
      const isValid = true;

      if (isValid) {
        this.logger.log(`Token验证成功: ${id}`);
      } else {
        this.logger.warn(`Token验证失败: ${id}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error(`Token验证异常: ${error.message}`);
      return false;
    }
  }

  private generateCode(): string {
    const length = this.config.codeLength || 6;
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
  }
}
