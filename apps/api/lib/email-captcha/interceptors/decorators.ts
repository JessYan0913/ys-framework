import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { EmailCaptchaInterceptor } from './email-captcha.interceptor';

export const EMAIL_CAPTCHA_PURPOSE_KEY = 'email_captcha_purpose';

export const RequireEmailCaptcha = (purpose?: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    // 如果提供了 purpose 参数，设置到元数据中
    if (purpose) {
      SetMetadata(EMAIL_CAPTCHA_PURPOSE_KEY, purpose)(target, propertyKey, descriptor);
    }
    // 应用拦截器
    return UseInterceptors(EmailCaptchaInterceptor)(target, propertyKey, descriptor);
  };
};
