#!/usr/bin/env node

import crypto from 'crypto';
import { config } from 'dotenv';
import path from 'path';

import { redemptionConfig } from '@ys/database';
import { db } from '@ys/database/nextjs';
import {
  base36Decode,
  createRedeemCodeChecksum,
  getRedeemCodeSecret,
  REDEEM_CODE_CONFIG,
  REDEEM_CODE_TOTAL_LENGTH,
} from '@ys/redeem-code';

// Load environment variables from the monorepo root
config({ path: path.resolve(process.cwd(), '../../.env.local') });

const SECRET = getRedeemCodeSecret(process.env.REDEEM_CODE_SECRET);
const { PAYLOAD_LENGTH, OUTPUT_LENGTH, MAX_SCHEME_ID } = REDEEM_CODE_CONFIG;
const TOTAL_LENGTH = REDEEM_CODE_TOTAL_LENGTH;

type SchemeRow = {
  schemeKey: string;
  displayName: string | null;
  planLevel: string | null;
  metadata: Record<string, unknown> | null;
};

type SchemeInfo = {
  schemeKey: string;
  schemeId: number;
  displayName?: string | null;
  planLevel?: string | null;
};

type SchemeLookup = Map<number, SchemeInfo>;

type DecodeResult = {
  version: number;
  scheme: string;
  schemeDisplayName?: string | null;
  planLevel?: string | null;
  schemeId: number;
  checksumValid: boolean;
  randomBytesHex: string;
  payloadHex: string;
  checksumHex: string;
};

async function loadSchemeLookup(): Promise<SchemeLookup> {
  const rows = (await db
    .select({
      schemeKey: redemptionConfig.schemeKey,
      displayName: redemptionConfig.displayName,
      planLevel: redemptionConfig.planLevel,
      metadata: redemptionConfig.metadata,
    })
    .from(redemptionConfig)) as SchemeRow[];

  if (rows.length === 0) {
    throw new Error('数据库中未找到任何兑换方案配置，请先在 RedeemSchemeConfig 表中插入记录');
  }

  const lookup: SchemeLookup = new Map();

  rows.forEach((row, index) => {
    if (!row.schemeKey) {
      throw new Error(`第 ${index + 1} 条方案记录缺少 schemeKey`);
    }

    const metadata = row.metadata as { schemeId?: unknown } | null;
    const schemeIdValue = metadata?.schemeId;

    if (typeof schemeIdValue !== 'number' || Number.isNaN(schemeIdValue)) {
      throw new Error(`方案 ${row.schemeKey} 缺少 metadata.schemeId（数值类型）`);
    }

    if (schemeIdValue > MAX_SCHEME_ID || schemeIdValue < 0) {
      throw new Error(`方案 ${row.schemeKey} 的 schemeId 超出 0-${MAX_SCHEME_ID} 取值范围`);
    }

    if (lookup.has(schemeIdValue)) {
      throw new Error(`检测到重复的 schemeId: ${schemeIdValue}`);
    }

    lookup.set(schemeIdValue, {
      schemeKey: row.schemeKey,
      schemeId: schemeIdValue,
      displayName: row.displayName,
      planLevel: row.planLevel,
    });
  });

  return lookup;
}

function decodeRedeemCode(code: string, lookup: SchemeLookup): DecodeResult {
  if (code.length !== OUTPUT_LENGTH) {
    throw new Error(`兑换码长度无效，应为 ${OUTPUT_LENGTH}。`);
  }

  const buffer = base36Decode(code);
  if (buffer.length !== TOTAL_LENGTH) {
    throw new Error('解码后的字节长度不匹配。');
  }

  const payload = buffer.subarray(0, PAYLOAD_LENGTH);
  const checksum = buffer.subarray(PAYLOAD_LENGTH);

  const expectedChecksum = createRedeemCodeChecksum(payload, SECRET);
  const checksumValid = crypto.timingSafeEqual(checksum, expectedChecksum);

  const header = payload[0];
  const version = header >> 6;
  const schemeId = header & 0b00111111;
  const schemeInfo = lookup.get(schemeId);
  const scheme = schemeInfo?.schemeKey ?? 'unknown';

  return {
    version,
    scheme,
    schemeDisplayName: schemeInfo?.displayName,
    planLevel: schemeInfo?.planLevel,
    schemeId,
    checksumValid,
    randomBytesHex: payload.subarray(1).toString('hex'),
    payloadHex: payload.toString('hex'),
    checksumHex: checksum.toString('hex'),
  };
}

function printResult(result: DecodeResult, code: string) {
  console.log('============================');
  console.log(`兑换码: ${code}`);
  console.log(`版本号: ${result.version}`);
  console.log(`方案标识: ${result.scheme}`);
  if (result.schemeDisplayName) {
    console.log(`方案名称: ${result.schemeDisplayName}`);
  }
  if (result.planLevel) {
    console.log(`套餐等级: ${result.planLevel}`);
  }
  console.log(`方案编码 (6 bits): ${result.schemeId}`);
  console.log(`校验结果: ${result.checksumValid ? '合法' : '校验失败'}`);
  console.log(`随机部分(剩余字节): 0x${result.randomBytesHex}`);
  console.log(`载荷十六进制: 0x${result.payloadHex}`);
  console.log(`校验码十六进制: 0x${result.checksumHex}`);
  console.log('提示: 兑换码仅携带方案ID，请在后端方案表中查找具体奖励配置。');
  console.log('============================');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('用法: pnpm tsx packages/redeem-code/scripts/decode-redeem-code.ts <redeemCode>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未配置');
  }

  const code = args[0].trim();

  try {
    const lookup = await loadSchemeLookup();
    const result = decodeRedeemCode(code, lookup);
    printResult(result, code);
  } catch (err: any) {
    throw err;
  }
}

main()
  .catch((error) => {
    console.error('解码失败:', (error as Error).message);
    process.exit(1);
  })
  .then(() => {
    setTimeout(() => process.exit(0), 1000);
  });
