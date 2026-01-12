import { AuthService as SharedAuthService, TokenRevocationService, UserPayload } from '@lib/auth';
import { MailService } from '@lib/mail';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plan, subscription, user } from '@ys/database';
import { DrizzleService } from '@ys/database/nestjs';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { UserService } from '../user/user.service';
import { welcomeTemplate } from './templates/welcome.template';
import { LoginVO } from './vo/login.vo';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly drizzle: DrizzleService,
    private readonly mailService: MailService,
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
      await this.drizzle.db.transaction(async (tx) => {
        // 创建新用户
        const [userRow] = await tx
          .insert(user)
          .values({
            email: normalizedEmail,
            password: hash,
            emailVerified: true,
          })
          .returning();

        // 获取免费套餐
        const [planRow] = await tx.select().from(plan).where(eq(plan.name, 'free')).limit(1);

        if (!planRow) {
          throw new Error('System Error');
        }

        // 计算套餐到期时间（默认一个月后）和下次积分重置时间（默认下个月1日）
        const now = new Date();
        const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // 创建用户订阅
        await tx.insert(subscription).values({
          planId: planRow.id,
          accountId: userRow.id,
          points: planRow.defaultPoints,
          planPoints: planRow.defaultPoints,
          conversationCount: 0,
          conversationLimit: planRow.defaultConversationLimit ?? 0,
          nextResetDate: nextResetDate,
          metadata: { totalPoints: planRow.defaultPoints }, // 初始化积分总量
        });

        // 发送欢迎邮件
        try {
          await this.mailService.sendTemplate(userRow.email, welcomeTemplate, {
            name: userRow.name,
            loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`,
          });
        } catch (error) {
          console.error('发送欢迎邮件失败:', error);
          // 不阻塞注册流程，只记录错误
        }
      });

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

    const { tokenType, iat, exp, nbf, jti, ...userPayload } = payload;
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
}
