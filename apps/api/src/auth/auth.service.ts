import { AuthService as SharedAuthService, TokenRevocationService, UserPayload } from '@lib/auth';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { user } from '@ys/database';
import { DrizzleService } from '@ys/database/nestjs';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { UserService } from '../user/user.service';
import { UserRegisteredEvent } from './events/user-registered.event';
import { LoginVO } from './vo/login.vo';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly drizzle: DrizzleService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sharedAuthService: SharedAuthService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
    private readonly configService: ConfigService,
  ) {}

  async register(payload: { email: string; password: string }) {
    const { email, password } = payload;
    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
      // 检查邮箱是否已存在
      const [userRow] = await this.drizzle.db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1);
      if (userRow) {
        throw new Error('用户已存在');
      }

      // 使用bcrypt同步加密密码，salt rounds设为10
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);

      // 使用事务创建用户和订阅
      const newUser = await this.drizzle.db.transaction(async (tx) => {
        // 创建新用户
        const [userRow] = await tx
          .insert(user)
          .values({
            email: normalizedEmail,
            password: hash,
            emailVerified: true,
          })
          .returning();

        return userRow;
      });

      // 发送注册事件（异步，不阻塞）
      this.eventEmitter.emitAsync(
        'user.registered',
        new UserRegisteredEvent(newUser.id, newUser.email, newUser.name),
      );

      return {
        message: '注册成功',
        email: normalizedEmail,
      };
    } catch (error) {
      console.error('Failed to register user', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginVO> {
    const user = await this.userService.validateUser(email, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const { accessToken } = await this.sharedAuthService.login(user as UserPayload);
    const refreshToken = this.jwtService.sign(
      { ...(user as any), tokenType: 'refresh' },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );

    // 生成 OIDC ID Token 用于第三方系统（如 NocoDB）
    const idToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        aud: this.configService.get('NOCODB_CLIENT_ID') || 'nocodb',
        iat: Math.floor(Date.now() / 1000),
        iss: `${this.configService.get('BASE_URL') || 'http://localhost:3001'}/oidc`,
      },
      { expiresIn: '1h' },
    );

    // 构建 NocoDB 授权 URL（可选）
    const nocodbUrl = this.configService.get('NOCODB_URL');
    const authorizeUrl = nocodbUrl
      ? `${nocodbUrl}/auth?redirect_uri=${encodeURIComponent(this.configService.get('NOCODB_REDIRECT_URI') || nocodbUrl)}`
      : undefined;

    return {
      user,
      accessToken,
      refreshToken,
      oidc: {
        idToken,
        authorizeUrl,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    if (await this.tokenRevocationService.isRefreshTokenRevoked(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    const payload = this.jwtService.verify(refreshToken) as any;
    if (!payload || payload.tokenType !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const { tokenType: _tokenType, iat: _iat, exp: _exp, nbf: _nbf, jti: _jti, ...userPayload } = payload;
    const { accessToken } = await this.sharedAuthService.login(userPayload as UserPayload);

    return {
      accessToken,
    };
  }

  async logoutWithToken(accessToken?: string, refreshToken?: string) {
    if (accessToken) {
      await this.tokenRevocationService.blacklistAccessToken(accessToken);
    }

    if (refreshToken) {
      await this.tokenRevocationService.blacklistRefreshToken(refreshToken);
    }

    return { message: 'Logged out successfully' };
  }

  async resetPassword(payload: { email: string; password: string }) {
    const { email, password } = payload;
    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
      // 检查用户是否存在
      const [userRow] = await this.drizzle.db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1);
      if (!userRow) {
        throw new Error('用户不存在');
      }

      // 使用bcrypt同步加密新密码
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);

      // 更新密码
      await this.drizzle.db
        .update(user)
        .set({
          password: hash,
          updatedAt: new Date(),
        })
        .where(eq(user.email, normalizedEmail));

      return { message: '密码重置成功，请重新登录' };
    } catch (error) {
      console.error('Failed to reset password', error);
      throw error;
    }
  }

  async getGithubAuthUrl() {
    this.logger.log('Generating GitHub auth URL');
    return this.sharedAuthService.getOAuthAuthorizationUrlWithState('github');
  }

  async githubLogin(code: string, state: string): Promise<LoginVO> {
    this.logger.log(`Processing GitHub login callback. State: ${state}`);
    const isValidState = await this.sharedAuthService.verifyOAuthState('github', state);
    if (!isValidState) {
      this.logger.warn(`Invalid OAuth state: ${state}`);
      throw new Error('Invalid OAuth state');
    }

    const userPayload = await this.sharedAuthService.validateOAuthLogin('github', code);
    this.logger.log(`GitHub login validated for user: ${userPayload.email}`);
    
    // Generate tokens similar to regular login
    const { accessToken } = await this.sharedAuthService.login(userPayload);
    const refreshToken = this.jwtService.sign(
      { ...(userPayload as any), tokenType: 'refresh' },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );

    // Generate OIDC ID Token
    const idToken = this.jwtService.sign(
      {
        sub: userPayload.id,
        email: userPayload.email,
        name: userPayload.name,
        aud: this.configService.get('NOCODB_CLIENT_ID') || 'nocodb',
        iat: Math.floor(Date.now() / 1000),
        iss: `${this.configService.get('BASE_URL') || 'http://localhost:3001'}/oidc`,
      },
      { expiresIn: '1h' },
    );
    
    return {
      user: userPayload as any,
      accessToken,
      refreshToken,
      oidc: {
        idToken,
      },
    };
  }
}
