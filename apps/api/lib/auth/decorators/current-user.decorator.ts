import { createParamDecorator, ExecutionContext, PipeTransform, Type } from '@nestjs/common';
import { ResolveUserPipe } from '../pipes/resolve-user.pipe';

const CurrentUserBase = createParamDecorator(
  <T>(data: keyof T | undefined, ctx: ExecutionContext): T | T[keyof T] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : (user as T);
  },
);

export function CurrentUser(
  data?: string,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
) {
  if (data) {
    return CurrentUserBase(data, ...pipes);
  }
  return CurrentUserBase(undefined, ResolveUserPipe, ...pipes);
}
