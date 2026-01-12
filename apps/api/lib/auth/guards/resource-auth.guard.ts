import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';
import { SKIP_RESOURCE_KEY } from '../decorators/skip-resource.decorator';
import { ResourcePayload } from '../interfaces/user.interface';

@Injectable()
export class ResourceAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      if (this.reflector.get(SKIP_AUTH_KEY, context.getHandler())) {
        return true;
      }
      throw new UnauthorizedException();
    }

    if (this.reflector.getAllAndOverride(SKIP_RESOURCE_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }
    const requiredPermission = this.getRequiredPermission(context);
    const hasPermission = await this.authService.canAccess(user, requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException('您没有访问该资源的权限');
    }

    return true;
  }

  private getRequiredPermission(context: ExecutionContext): ResourcePayload {
    // 如果没有自定义权限，则使用默认的路径+动作格式
    const request = context.switchToHttp().getRequest();
    const path = request.route.path;
    const method = request.method.toUpperCase();
    return {
      action: method,
      resource: path,
    };
  }
}
