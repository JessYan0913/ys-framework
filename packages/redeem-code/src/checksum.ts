import crypto from 'crypto';

import { base36Decode } from './codec';
import { REDEEM_CODE_CONFIG, REDEEM_CODE_TOTAL_LENGTH } from './config';

/**
 * 创建校验码
 * @param payload 载荷 Buffer
 * @param secret 密钥 Buffer
 * @returns 校验码 Buffer
 */
export function createRedeemCodeChecksum(payload: Buffer, secret: Buffer): Buffer {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest().subarray(0, REDEEM_CODE_CONFIG.CHECKSUM_LENGTH);
}

/**
 * 验证兑换码校验和
 * @param code 兑换码
 * @param secret 密钥 Buffer
 * @returns 校验和是否有效
 * @throws 如果兑换码格式不正确会抛出错误
 */
export function verifyRedeemCodeChecksum(code: string, secret: Buffer): boolean {
  const sanitizedCode = code.trim();

  if (!sanitizedCode) {
    throw new Error('兑换码不能为空');
  }

  if (sanitizedCode.length !== REDEEM_CODE_CONFIG.OUTPUT_LENGTH) {
    throw new Error('兑换码长度无效');
  }

  const buffer = base36Decode(sanitizedCode);
  if (buffer.length !== REDEEM_CODE_TOTAL_LENGTH) {
    throw new Error('兑换码数据长度不匹配');
  }

  const payload = buffer.subarray(0, REDEEM_CODE_CONFIG.PAYLOAD_LENGTH);
  const checksum = buffer.subarray(REDEEM_CODE_CONFIG.PAYLOAD_LENGTH);

  const expectedChecksum = createRedeemCodeChecksum(payload, secret);
  return crypto.timingSafeEqual(checksum, expectedChecksum);
}
