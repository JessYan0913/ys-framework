import { Controller, Get, Post, Body, Query, UseGuards, Req, Param, BadRequestException } from '@nestjs/common';
import { AuthService, OAuthAuthGuard } from '../index';
import { OAuthProvider } from '../interfaces/user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 获取飞书登录授权URL
  @Get('feishu/url')
  getFeishuUrl(@Query('state') state?: string) {
    try {
      const url = this.authService.getOAuthAuthorizationUrl('feishu', state);
      return { url };
    } catch (error) {
      throw new BadRequestException('Feishu OAuth not configured');
    }
  }

  // 飞书登录回调
  @Post('feishu/callback')
  @UseGuards(OAuthAuthGuard)
  async feishuCallback(@Req() req) {
    return req.user;
  }

  // 手动处理飞书登录（不使用守卫）
  @Post('feishu/login')
  async feishuLogin(@Body('code') code: string) {
    try {
      const result = await this.authService.oauthLogin('feishu', code);
      return result;
    } catch (error) {
      throw new BadRequestException(`Feishu login failed: ${error.message}`);
    }
  }

  // 刷新飞书令牌
  @Post('feishu/refresh')
  async refreshFeishuToken(@Body('refreshToken') refreshToken: string) {
    try {
      const token = await this.authService.refreshOAuthToken('feishu', refreshToken);
      return token;
    } catch (error) {
      throw new BadRequestException(`Token refresh failed: ${error.message}`);
    }
  }

  // 获取可用的OAuth提供商
  @Get('oauth/providers')
  getAvailableProviders() {
    return {
      providers: this.authService.getAvailableOAuthProviders(),
    };
  }
}

// 在你的 AppModule 中配置：
/*
import { Module } from '@nestjs/common';
import { AuthModule } from '../index';
import { UserService } from './user/user.service';

@Module({
  imports: [
    AuthModule.forRoot({
      jwt: {
        secret: 'your-jwt-secret',
        signOptions: { expiresIn: '1d' },
      },
      enableJwtGuard: true,
      enableResourceGuard: false,
      userService: UserService,
      oauth: {
        feishu: {
          clientId: 'your-feishu-app-id',
          clientSecret: 'your-feishu-app-secret',
          redirectUri: 'http://localhost:3000/auth/feishu/callback',
          scope: 'contact:base',
        },
      },
    }),
  ],
})
export class AppModule {}
*/
