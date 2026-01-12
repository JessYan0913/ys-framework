import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly store = new Map<string, RateLimitRecord>();

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());

    if (!rateLimitOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const key = rateLimitOptions.keyGenerator ? rateLimitOptions.keyGenerator(request) : this.getDefaultKey(request);

    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // 创建新记录或重置过期记录
      this.store.set(key, {
        count: 1,
        resetTime: now + rateLimitOptions.windowMs,
      });
      return next.handle();
    }

    if (record.count >= rateLimitOptions.max) {
      throw new HttpException(rateLimitOptions.message, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 增加计数
    record.count++;
    return next.handle();
  }

  private getDefaultKey(request: any): string {
    // 默认使用 IP + 路径作为键
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const path = request.route?.path || request.url || 'unknown';
    return `${ip}:${path}`;
  }

  // 清理过期记录的方法，可以定期调用
  cleanupExpiredRecords(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
