import { Injectable, Logger } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

import { CaptchaError, CaptchaNotFoundError, StorageError, ValidationError } from './core/errors';
import { createPuzzle } from './core/puzzle-generator';
import { verifyHumanLikeTrail } from './core/trail-verifier';
import {
  CaptchaConfig,
  CaptchaData,
  CaptchaServiceInterface,
  CreateCaptchaPayload,
  CreateCaptchaResult,
  VerifyCaptchaResult,
  VerifyTrailPayload,
} from './types';

interface TokenPayload {
  id: string;
  purpose: string;
}

@Injectable()
export class ImageCaptchaService implements CaptchaServiceInterface {
  private readonly logger = new Logger(ImageCaptchaService.name);

  constructor(private config: CaptchaConfig) {}

  private tokenStoreKey(token: string): string {
    return `captcha:token:${token}`;
  }

  async createCaptcha(options: CreateCaptchaPayload): Promise<CreateCaptchaResult> {
    const {
      bgWidth = this.config.defaultSize.width,
      bgHeight = this.config.defaultSize.height,
      width = 60,
      height = 60,
      purpose,
    } = options;

    this.logger.log(`创建图片验证码，用途: ${purpose}, 尺寸: ${bgWidth}x${bgHeight}`);

    try {
      const imgPath = await this.config.imageLoader.pickRandomImagePath();
      this.logger.log(`选择图片路径: ${imgPath}`);

      const puzzle = await createPuzzle({
        imgUrl: imgPath,
        bgWidth,
        bgHeight,
        width,
        height,
      });

      const id = randomBytes(16).toString('hex');
      const key = `captcha:${id}:data`;
      const data: CaptchaData = { x: puzzle.x, purpose };
      
      await this.config.storage.set(key, JSON.stringify(data), this.config.ttl);
      this.logger.log(`验证码数据已存储，ID: ${id}, TTL: ${this.config.ttl}秒`);

      const bgMime = 'image/jpeg';
      const puzzleMime = 'image/webp';

      const bgUrl = `data:${bgMime};base64,${puzzle.bg.toString('base64')}`;
      const puzzleUrl = `data:${puzzleMime};base64,${puzzle.puzzle.toString('base64')}`;

      this.logger.log(`图片验证码创建成功: ${id}`);
      return { id, bgUrl, puzzleUrl };
    } catch (error) {
      this.logger.error(`创建图片验证码失败: ${error.message}`);
      throw error;
    }
  }

  async verifyCaptcha(body: VerifyTrailPayload): Promise<VerifyCaptchaResult> {
    this.logger.log(`验证图片验证码，ID: ${body.id}`);
    
    if (!body || !Array.isArray(body.trail)) {
      this.logger.warn(`验证码载荷无效: ${JSON.stringify(body)}`);
      throw new ValidationError('Invalid captcha payload');
    }

    const result = verifyHumanLikeTrail(body);

    let expectedXFromStore: number | null = null;
    let storedPurpose: string | null = null;
    const id = body.id;
    
    try {
      const key = `captcha:${id}:data`;
      const stored = await this.config.storage.get(key);
      if (stored != null) {
        const data: CaptchaData = JSON.parse(stored);
        expectedXFromStore = data.x;
        storedPurpose = data.purpose;
        this.logger.log(`获取验证码数据成功: ${id}, 期望X坐标: ${expectedXFromStore}`);
      } else {
        this.logger.warn(`验证码数据不存在: ${id}`);
      }
    } catch (error) {
      this.logger.error(`获取验证码数据失败: ${error.message}`);
      throw new StorageError(`Failed to retrieve captcha data: ${error}`);
    }

    // 当服务端存有期望值时，严格比对
    if (expectedXFromStore != null && Number.isFinite(body.x)) {
      const diff = Math.abs(body.x - expectedXFromStore);
      this.logger.log(`X坐标比对，提交: ${body.x}, 期望: ${expectedXFromStore}, 差值: ${diff}`);
      
      if (diff > this.config.trailTolerance) {
        this.logger.warn(`X坐标超出容差范围: ${diff} > ${this.config.trailTolerance}`);
        throw new CaptchaError('expected_x_mismatch', 'EXPECTED_X_MISMATCH');
      }
    } else {
      // 未找到或已过期
      this.logger.warn(`验证码不存在或已过期: ${id}`);
      throw new CaptchaNotFoundError();
    }

    // 轨迹判定不通过
    if (!result.ok) {
      // 将判定原因透出到错误 message，code 标记为通用失败
      const reason = result.reasons?.[0] ?? 'verification_failed';
      this.logger.warn(`轨迹验证失败: ${reason}`);
      throw new CaptchaError(reason, 'VERIFICATION_FAILED');
    }

    if (storedPurpose) {
      try {
        await this.config.storage.del(`captcha:${id}:data`);
        this.logger.log(`验证码数据已删除: ${id}`);
      } catch (error) {
        this.logger.error(`删除验证码数据失败: ${error.message}`);
        throw new StorageError(`Failed to delete captcha data: ${error}`);
      }
    }
    
    const token = sign({ id, purpose: storedPurpose || '' }, this.config.secret, {
      expiresIn: `${Math.floor(this.config.ttl / 60)}m`,
    });

    try {
      await this.config.storage.set(this.tokenStoreKey(token), id, this.config.ttl);
      this.logger.log(`Token映射已存储(一次性): ${id}`);
    } catch (error) {
      this.logger.error(`存储Token映射失败: ${error.message}`);
      throw new StorageError(`Failed to store captcha token mapping: ${error}`);
    }
    
    this.logger.log(`图片验证码验证成功: ${id}`);
    return { id, token };
  }

  async verifyToken(id: string, token: string, purpose: string): Promise<boolean> {
    this.logger.log(`验证token: ${id}, 用途: ${purpose}`);
    
    try {
      const result = verify(token, this.config.secret);
      const payload = result as TokenPayload;
      const jwtValid = payload.id === id && payload.purpose === purpose;

      if (!jwtValid) {
        this.logger.warn(`Token JWT载荷校验失败: ${id}`);
        return false;
      }

      const tokenKey = this.tokenStoreKey(token);
      const storedId = await this.config.storage.get(tokenKey);

      if (!storedId || storedId !== id) {
        this.logger.warn(`Token已使用/已过期/不匹配: ${id}`);
        return false;
      }

      await this.config.storage.del(tokenKey);
      this.logger.log(`Token验证成功且已作废(一次性): ${id}`);
      const isValid = true;
      
      if (isValid) {
        this.logger.log(`Token验证成功: ${id}`);
      } else {
        this.logger.warn(`Token验证失败: ${id}`);
      }
      
      return isValid;
    } catch (error) {
      this.logger.error(`Token验证异常: ${error.message}`);
      return false;
    }
  }
}