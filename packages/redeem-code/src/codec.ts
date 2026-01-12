import { REDEEM_CODE_ALPHABET, REDEEM_CODE_CONFIG, REDEEM_CODE_TOTAL_LENGTH } from './config';
import type { ParsedRedeemCodePayload } from './types';

/**
 * Base36 编码：将 Buffer 转换为 Base36 字符串
 * @param buffer 输入的 Buffer
 * @returns Base36 编码后的字符串
 */
export function base36Encode(buffer: Buffer): string {
  let value = BigInt('0x' + buffer.toString('hex'));
  let encoded = '';

  while (value > 0n) {
    const remainder = Number(value % 36n);
    encoded = REDEEM_CODE_ALPHABET[remainder] + encoded;
    value /= 36n;
  }

  if (encoded === '') {
    encoded = REDEEM_CODE_ALPHABET[0];
  }

  // 处理前导零
  let leadingZeroCount = 0;
  for (const byte of buffer) {
    if (byte === 0) {
      leadingZeroCount++;
    } else {
      break;
    }
  }

  return REDEEM_CODE_ALPHABET[0].repeat(leadingZeroCount) + encoded;
}

/**
 * Base36 解码：将 Base36 字符串转换为 Buffer
 * @param input Base36 编码的字符串
 * @returns 解码后的 Buffer
 * @throws 如果包含非法字符会抛出错误
 */
export function base36Decode(input: string): Buffer {
  let value = 0n;

  for (const char of input) {
    const index = REDEEM_CODE_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`兑换码包含非法字符: ${char}`);
    }
    value = value * 36n + BigInt(index);
  }

  const hex = value.toString(16).padStart(REDEEM_CODE_TOTAL_LENGTH * 2, '0');
  return Buffer.from(hex, 'hex');
}

/**
 * 填充兑换码至固定长度
 * @param code 兑换码
 * @returns 填充后的兑换码
 */
export function padRedeemCode(code: string): string {
  return code.padStart(REDEEM_CODE_CONFIG.OUTPUT_LENGTH, REDEEM_CODE_ALPHABET[0]);
}

/**
 * 解析兑换码载荷
 * @param code 兑换码
 * @returns 包含版本号、方案ID等信息的对象
 * @throws 如果兑换码格式不正确会抛出错误
 */
export function parseRedeemCodePayload(code: string): ParsedRedeemCodePayload {
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

  const header = payload[0];
  const version = header >> 6;
  const schemeId = header & 0b00111111;

  return {
    version,
    schemeId,
    payload,
    checksum,
  };
}
