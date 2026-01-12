import { SkipAuth } from '@lib/auth';
import { RateLimit } from '@lib/common';
import { EmailCaptchaService } from '@lib/email-captcha';
import { ImageCaptchaService, RequireImageCaptcha } from '@lib/image-captcha';
import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CreateImageCaptchaDTO } from './dto/create-image-captcha.dto';
import { SendEmailCaptchaDTO } from './dto/send-email-captcha.dto';
import { VerifyEmailCaptchaDTO } from './dto/verify-email-captcha.dto';
import { VerifyImageCaptchaDTO } from './dto/verify-image-captcha.dto';
import { CreateImageCaptchaVO } from './vo/create-image-captcha.vo';
import { SendEmailCaptchaVO } from './vo/send-email-captcha.vo';
import { VerifyEmailCaptchaVO } from './vo/verify-email-captcha.vo';
import { VerifyImageCaptchaVO } from './vo/verify-image-captcha.vo';

@ApiTags('Captcha')
@Controller('captcha')
export class CaptchaController {
  constructor(
    private readonly imageCaptchaService: ImageCaptchaService,
    private readonly emailCaptchaService: EmailCaptchaService,
  ) {}

  @Post('/image/create')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '创建图片验证码' })
  @ApiResponse({ status: 200, description: '创建成功', type: CreateImageCaptchaVO })
  async createImageCaptcha(
    @Body() body: CreateImageCaptchaDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CreateImageCaptchaVO> {
    const result = await this.imageCaptchaService.createCaptcha(body);

    // 设置 Cookie，浏览器会自动携带
    response.cookie('captcha_id', result.id, {
      httpOnly: false, // 允许前端访问
      secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
      sameSite: 'lax',
      maxAge: 60 * 1000, // 1分钟过期
    });

    return result;
  }

  @Post('/image/verify')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证图片验证码' })
  @ApiResponse({ status: 200, description: '验证成功', type: VerifyImageCaptchaVO })
  async verifyImageCaptcha(
    @Body() body: VerifyImageCaptchaDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<VerifyImageCaptchaVO> {
    const result = await this.imageCaptchaService.verifyCaptcha(body);

    // 设置 Cookie，浏览器会自动携带
    response.cookie('captcha_token', result.token, {
      httpOnly: false, // 允许前端访问
      secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
      sameSite: 'lax',
      maxAge: 60 * 1000, // 1分钟过期
    });

    return { id: result.id, token: result.token };
  }

  @Post('/email/send')
  @SkipAuth()
  @RequireImageCaptcha()
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 1, // 1分钟内最多1次请求
    message: '发送邮箱验证码过于频繁，请1分钟后再试',
    keyGenerator: (req) => `email_captcha:${req.body.email}`, // 基于邮箱地址限制
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '发送邮箱验证码' })
  @ApiResponse({ status: 201, description: '发送成功', type: SendEmailCaptchaVO })
  async sendEmailCaptcha(
    @Body() body: SendEmailCaptchaDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SendEmailCaptchaVO> {
    // 根据 purpose 确定对应的操作文本
    const actionMap = {
      register: '注册账号',
      'reset-password': '重置密码',
    };

    const action = actionMap[body.purpose] || '验证';
    const text = `您正在${action}，请使用以下验证码完成验证`;

    const result = await this.emailCaptchaService.sendCaptcha({
      purpose: body.purpose,
      action,
      text,
      email: body.email,
    });

    // 将验证码 ID 存储到 Cookie，验证时可以直接从 Cookie 获取
    response.cookie('email_captcha_id', result.id, {
      httpOnly: false, // 允许前端访问
      secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5分钟过期
    });

    return result;
  }

  @Post('/email/verify')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱验证码' })
  @ApiResponse({ status: 200, description: '验证成功', type: VerifyEmailCaptchaVO })
  async verifyEmailCaptcha(
    @Body() body: VerifyEmailCaptchaDTO,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ): Promise<VerifyEmailCaptchaVO> {
    // 优先从 Cookie 获取 ID，如果没有则从请求体获取
    const captchaId = (request as any).cookies?.email_captcha_id || body.id;

    if (!captchaId) {
      throw new Error('验证码ID不能为空');
    }

    if (!body.purpose) {
      throw new Error('验证用途不能为空');
    }

    const result = await this.emailCaptchaService.verifyCaptcha({
      id: captchaId,
      code: body.code,
      purpose: body.purpose,
    });

    // 设置 Cookie，浏览器会自动携带
    response.cookie('email_captcha_token', result.token, {
      httpOnly: false, // 允许前端访问
      secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5分钟过期
    });

    return { id: result.id, token: result.token };
  }
}
