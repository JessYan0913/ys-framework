import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ResourcePayload, UserPayload, UserService, OAuthUserProfile, OAuthProvider } from './interfaces/user.interface';
import { OAuthService } from './oauth/oauth.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('UserService') private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly oauthService: OAuthService,
  ) {}

  async validateUser(username: string, password: string): Promise<UserPayload> {
    const user = await this.userService.validateUser(username, password);
    if (user) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 判断用户是否有权限访问资源
  async canAccess(user: UserPayload, resource: ResourcePayload): Promise<boolean> {
    return await this.userService.canAccess(user, resource);
  }

  async login(user: UserPayload): Promise<{ accessToken: string }> {
    return {
      accessToken: this.jwtService.sign({ ...user }),
    };
  }

  // 第三方登录相关方法

  // 获取第三方登录授权URL
  getOAuthAuthorizationUrl(provider: OAuthProvider, state?: string): string {
    return this.oauthService.getAuthorizationUrl(provider, state);
  }

  // 第三方登录验证
  async validateOAuthLogin(provider: OAuthProvider, code: string): Promise<UserPayload> {
    try {
      // 交换访问令牌
      const tokenResponse = await this.oauthService.exchangeCodeForToken(provider, code);
      
      // 获取用户信息
      const userProfile = await this.oauthService.getUserInfo(provider, tokenResponse.access_token);
      
      // 查找或创建用户
      const user = await this.userService.findOrCreateByOAuth(userProfile);
      
      return user;
    } catch (error) {
      throw new Error(`OAuth login failed for ${provider}: ${error.message}`);
    }
  }

  // 第三方登录并返回JWT
  async oauthLogin(provider: OAuthProvider, code: string): Promise<{ accessToken: string; user: UserPayload }> {
    const user = await this.validateOAuthLogin(provider, code);
    const accessToken = this.jwtService.sign({ ...user });
    
    return {
      accessToken,
      user,
    };
  }

  // 刷新第三方访问令牌
  async refreshOAuthToken(provider: OAuthProvider, refreshToken: string) {
    return this.oauthService.refreshToken(provider, refreshToken);
  }

  // 获取可用的OAuth提供商
  getAvailableOAuthProviders(): OAuthProvider[] {
    return this.oauthService.getAvailableProviders();
  }
}
