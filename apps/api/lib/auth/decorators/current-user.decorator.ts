import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  <T>(data: keyof T | undefined, ctx: ExecutionContext): T | T[keyof T] => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as T;
  },
);
