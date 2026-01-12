import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { CaptchaInterceptor } from './captcha.interceptor';

export const CAPTCHA_PURPOSE_KEY = 'captcha_purpose';

export const RequireImageCaptcha = (purpose?: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    // 如果提供了 purpose 参数，设置到元数据中
    if (purpose) {
      SetMetadata(CAPTCHA_PURPOSE_KEY, purpose)(target, propertyKey, descriptor);
    }
    // 应用拦截器
    return UseInterceptors(CaptchaInterceptor)(target, propertyKey, descriptor);
  };
};
