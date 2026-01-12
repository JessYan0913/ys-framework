import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ImageCaptchaService } from '../image-captcha.service';
import { CAPTCHA_PURPOSE_KEY } from './decorators';
import { CaptchaTokenExpiredException, CaptchaTokenInvalidException, CaptchaTokenMissingException } from './exceptions';

@Injectable()
export class CaptchaInterceptor implements NestInterceptor {
  constructor(
    private readonly imageCaptchaService: ImageCaptchaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // 优先从装饰器获取 purpose，如果没有则从请求体获取
    let purpose =
      this.reflector.get<string>(CAPTCHA_PURPOSE_KEY, context.getHandler()) ||
      this.reflector.get<string>(CAPTCHA_PURPOSE_KEY, context.getClass()) ||
      request.body?.purpose;

    // 如果没有设置 purpose，直接放行
    if (!purpose || purpose === 'default') {
      return next.handle();
    }
    const headerName = 'x-captcha-token';
    const cookieTokenName = 'captcha_token';
    const cookieIdName = 'captcha_id';

    // 优先从请求头获取 token 和 captcha_id
    let token = request.headers[headerName];
    let captchaId = request.headers['x-captcha-id'];

    // 如果请求头没有 token，尝试从 Cookie 获取
    if (!token && request.cookies && request.cookies[cookieTokenName]) {
      token = request.cookies[cookieTokenName];
    }

    if (!token && request.cookies && request.cookies['captcha-token']) {
      token = request.cookies['captcha-token'];
    }

    // 如果请求头没有 captchaId，尝试从 Cookie 获取
    if (!captchaId && request.cookies) {
      captchaId = request.cookies[cookieIdName] || request.cookies['captcha-id'];
    }

    if (!token) {
      throw new CaptchaTokenMissingException();
    }

    if (!captchaId) {
      throw new CaptchaTokenMissingException();
    }

    // 异步验证，需要在这里处理
    return new Observable((subscriber) => {
      this.verifyToken(captchaId, token, purpose)
        .then(() => {
          // 验证通过，继续执行
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((error) => {
          // 验证失败
          if (
            error instanceof CaptchaTokenMissingException ||
            error instanceof CaptchaTokenInvalidException ||
            error instanceof CaptchaTokenExpiredException
          ) {
            subscriber.error(error);
          } else {
            subscriber.error(new CaptchaTokenInvalidException(error.message));
          }
        });
    });
  }

  private async verifyToken(captchaId: string, token: string, purpose: string): Promise<void> {
    const isValid = await this.imageCaptchaService.verifyToken(captchaId, token, purpose);

    if (!isValid) {
      throw new CaptchaTokenInvalidException();
    }
  }
}
