import { ExecutionContext, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';
import { TokenRevocationService } from '../token-revocation.service';

@Injectable()
export class JWTAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly tokenRevocationService?: TokenRevocationService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride(SKIP_AUTH_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    const activated = (await super.canActivate(context)) as boolean;

    if (!activated || !this.tokenRevocationService) {
      return activated;
    }

    const req = context.switchToHttp().getRequest();
    const authorization: string | undefined = req?.headers?.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return activated;
    }

    const token = authorization.slice('Bearer '.length);
    if (await this.tokenRevocationService.isAccessTokenRevoked(token)) {
      throw new UnauthorizedException();
    }

    return activated;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
