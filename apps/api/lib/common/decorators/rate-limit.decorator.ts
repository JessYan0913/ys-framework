import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  windowMs: number; // 时间窗口（毫秒）
  max: number;      // 最大请求次数
  message?: string; // 错误消息
  keyGenerator?: (req: any) => string; // 自定义键生成器
}

export const RateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, message = '请求过于频繁，请稍后再试', keyGenerator } = options;
  
  return SetMetadata(RATE_LIMIT_KEY, {
    windowMs,
    max,
    message,
    keyGenerator,
  });
};
