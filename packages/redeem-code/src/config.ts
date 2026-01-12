import crypto from 'crypto';

import type { RedeemCodeConfig } from './types';

/**
 * 兑换码编码字母表：数字 + 大写字母（36个字符）
 * 0-9: 数字
 * A-Z: 大写字母
 */
export const REDEEM_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * 兑换码配置常量
 */
export const REDEEM_CODE_CONFIG: RedeemCodeConfig = {
  PAYLOAD_LENGTH: 5, // 40 bits
  CHECKSUM_LENGTH: 3, // 24 bits
  OUTPUT_LENGTH: 12, // Base36 下固定长度
  MAX_SCHEME_ID: 0b111111, // 6 bits -> 0 - 63
  VERSION: 0b00,
};

/**
 * 兑换码总长度（字节）
 */
export const REDEEM_CODE_TOTAL_LENGTH = REDEEM_CODE_CONFIG.PAYLOAD_LENGTH + REDEEM_CODE_CONFIG.CHECKSUM_LENGTH;

/**
 * 获取兑换码密钥
 * @param secretEnv 密钥环境变量值
 * @returns 密钥 Buffer
 */
export function getRedeemCodeSecret(secretEnv?: string): Buffer {
  return crypto.scryptSync(secretEnv || 'development-secret-key', 'cascade', 32);
}
