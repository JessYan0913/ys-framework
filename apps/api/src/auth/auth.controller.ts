import { SkipAuth } from '@lib/auth';
import { RequireEmailCaptcha } from '@lib/email-captcha';
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Post, Query, Res, Session } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { LoginVO } from './vo/login.vo';
import { LogoutVO } from './vo/logout.vo';
import { RefreshTokenVO } from './vo/refresh-token.vo';
import { RegisterVO } from './vo/register.vo';
import { ResetPasswordVO } from './vo/reset-password.vo';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(@Inject('LocalAuthService') private readonly authService: AuthService) {}

  @Get('/github')
  @SkipAuth()
  @ApiOperation({ summary: 'GitHub 登录跳转' })
  @ApiResponse({ status: 200, description: '返回 GitHub 授权 URL', schema: { properties: { url: { type: 'string' } } } })
  async githubAuth() {
    return this.authService.getGithubAuthUrl();
  }

  @Get('/github/callback')
  @SkipAuth()
  @ApiOperation({ summary: 'GitHub 登录回调' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginVO })
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginVO> {
    console.log('======>', code);
    
    const result = await this.authService.githubLogin(code, state);

    // 写入 JWT Cookie 给我方前端使用
    response.cookie('access_token', result.accessToken, {
      httpOnly: false, // 允许前端访问用于 API 调用
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000, // 1小时
    });

    // 写入 refresh token Cookie
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true, // 安全考虑，仅 http
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });

    // 如果有 OIDC ID Token，写入跨域 Cookie 给 NocoDB 使用
    if (result.oidc?.idToken) {
      response.cookie('oidc_id_token', result.oidc.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none', // 跨域支持
        domain: process.env.COOKIE_DOMAIN || undefined, // 支持主域共享
        maxAge: 60 * 60 * 1000, // 1小时
      });
    }

    // Redirect to frontend or return result (for API clients)
    // Since this is usually a browser flow, we might want to redirect.
    // However, the requirement says "返回JWT", but also "Integration with frontend".
    // Usually OAuth callback redirects to frontend with token or sets cookies and redirects.
    // The existing login endpoint sets cookies and returns JSON.
    // For a GET callback, we probably want to redirect to the frontend with tokens or just cookies.
    // Let's assume we redirect to the frontend home page or a specific callback page.
    
    // For now, let's redirect to root with a success indicator?
    // Or maybe the frontend handles the callback?
    // The requirement says: "GET /auth/github/callback ... 生成JWT返回给前端"
    // If I return JSON here, the browser will just show JSON.
    // The frontend task says: "处理授权完成后的回调逻辑".
    // If the backend handles the callback, the browser is at /auth/github/callback.
    // So the backend MUST redirect to the frontend.
    console.log('授权完成');
    
    response.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?login_success=true`);
    return result; // This won't be sent if redirected, but keeps TS happy.
  }

  @Post('/register')
  @SkipAuth()
  @RequireEmailCaptcha('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '注册成功', type: RegisterVO })
  async register(@Body() userData: RegisterDTO): Promise<RegisterVO> {
    return this.authService.register(userData);
  }

  @Post('/login')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginVO })
  async login(@Body() loginData: LoginDTO, @Res({ passthrough: true }) response: Response): Promise<LoginVO> {
    const result = await this.authService.login(loginData.email, loginData.password);

    // 写入 JWT Cookie 给我方前端使用
    response.cookie('access_token', result.accessToken, {
      httpOnly: false, // 允许前端访问用于 API 调用
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000, // 1小时
    });

    // 写入 refresh token Cookie
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true, // 安全考虑，仅 http
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });

    // 如果有 OIDC ID Token，写入跨域 Cookie 给 NocoDB 使用
    if (result.oidc?.idToken) {
      response.cookie('oidc_id_token', result.oidc.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none', // 跨域支持
        domain: process.env.COOKIE_DOMAIN || undefined, // 支持主域共享
        maxAge: 60 * 60 * 1000, // 1小时
      });
    }

    return result;
  }

  @Post('/refresh')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '令牌刷新成功', type: RefreshTokenVO })
  async refresh(@Body('refreshToken') refreshToken: string): Promise<RefreshTokenVO> {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功', type: LogoutVO })
  async logout(
    @Headers('authorization') authorization?: string,
    @Body('refreshToken') refreshToken?: string,
    @Res({ passthrough: true }) response?: Response,
  ): Promise<LogoutVO> {
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;

    // 执行登出逻辑
    const result = await this.authService.logoutWithToken(accessToken, refreshToken);

    // 清除所有相关的 Cookie
    if (response) {
      response.clearCookie('access_token', { path: '/' });
      response.clearCookie('refresh_token', { path: '/' });
      response.clearCookie('oidc_id_token', {
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/',
      });
    }

    return result;
  }

  @Post('/reset-password')
  @SkipAuth()
  @RequireEmailCaptcha('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置密码' })
  @ApiResponse({ status: 200, description: '重置密码成功', type: ResetPasswordVO })
  async resetPassword(@Body() resetData: ResetPasswordDTO): Promise<ResetPasswordVO> {
    return this.authService.resetPassword(resetData);
  }
}
