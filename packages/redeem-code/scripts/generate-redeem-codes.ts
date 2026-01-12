#!/usr/bin/env node

import crypto from 'crypto';
import { config } from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

import { redemptionConfig } from '@ys/database';
import { db } from '@ys/database/nextjs';
import {
  base36Encode,
  createRedeemCodeChecksum,
  getRedeemCodeSecret,
  padRedeemCode,
  REDEEM_CODE_CONFIG,
  REDEEM_CODE_TOTAL_LENGTH,
} from '@ys/redeem-code';

// Load environment variables from the monorepo root
config({ path: path.resolve(process.cwd(), '../../.env.local') });

const SECRET = getRedeemCodeSecret(process.env.REDEEM_CODE_SECRET);
const { PAYLOAD_LENGTH, MAX_SCHEME_ID, VERSION } = REDEEM_CODE_CONFIG;
const TOTAL_LENGTH = REDEEM_CODE_TOTAL_LENGTH;

type SchemeKey = string;

type SchemeInfo = {
  schemeKey: string;
  schemeId: number;
  displayName: string;
  planLevel: string;
  months: number;
  monthlyPoints: number | null;
  bonusPoints: number | null;
  metadata: Record<string, unknown> | null;
};

type SchemeMap = Record<SchemeKey, SchemeInfo>;

type SchemeRow = {
  schemeKey: string;
  displayName: string;
  planLevel: string;
  months: number;
  monthlyPoints: number | null;
  bonusPoints: number | null;
  metadata: Record<string, unknown> | null;
};

async function loadSchemeMap(): Promise<SchemeMap> {
  const rows = (await db
    .select({
      schemeKey: redemptionConfig.schemeKey,
      displayName: redemptionConfig.displayName,
      planLevel: redemptionConfig.planLevel,
      months: redemptionConfig.months,
      monthlyPoints: redemptionConfig.monthlyPoints,
      bonusPoints: redemptionConfig.bonusPoints,
      metadata: redemptionConfig.metadata,
    })
    .from(redemptionConfig)) as SchemeRow[];

  if (rows.length === 0) {
    throw new Error('数据库中未找到任何兑换方案配置，请先在 RedeemSchemeConfig 表中插入记录');
  }

  const schemeMap: SchemeMap = {};
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
    if (schemeMap[row.schemeKey] !== undefined) {
      throw new Error(`检测到重复的 schemeKey: ${row.schemeKey}`);
    }

    schemeMap[row.schemeKey] = {
      schemeKey: row.schemeKey,
      schemeId: schemeIdValue,
      displayName: row.displayName,
      planLevel: row.planLevel,
      months: row.months,
      monthlyPoints: row.monthlyPoints,
      bonusPoints: row.bonusPoints,
      metadata: row.metadata,
    };
  });

  return schemeMap;
}

function createPayload(scheme: SchemeKey, schemeMap: SchemeMap): Buffer {
  const payload = Buffer.alloc(PAYLOAD_LENGTH);

  const schemeInfo = schemeMap[scheme];
  if (!schemeInfo) {
    throw new Error(`未找到方案标识: ${scheme}`);
  }
  if (schemeInfo.schemeId > MAX_SCHEME_ID) {
    throw new Error(`方案 ${scheme} 的编码超出 6 位限制 (${MAX_SCHEME_ID})`);
  }

  const randomBytes = crypto.randomBytes(PAYLOAD_LENGTH - 1);
  randomBytes.copy(payload, 1);

  payload[0] = (VERSION << 6) | schemeInfo.schemeId;

  return payload;
}

function createRedeemCodeInternal(scheme: SchemeKey, schemeMap: SchemeMap): string {
  const payload = createPayload(scheme, schemeMap);
  const checksum = createRedeemCodeChecksum(payload, SECRET);

  const combined = Buffer.concat([payload, checksum], TOTAL_LENGTH);
  const encoded = base36Encode(combined);

  return padRedeemCode(encoded);
}

function escapeCsvField(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

async function writeCodesToCsv(codes: string[], schemeInfo: SchemeInfo): Promise<void> {
  const metadataDescription =
    typeof schemeInfo.metadata?.description === 'string' ? schemeInfo.metadata.description : '';
  const csvLines = [
    ['code', 'displayName', 'planLevel', 'description'].map(escapeCsvField).join(','),
    ...codes.map((code) => {
      return [code, schemeInfo.displayName, schemeInfo.planLevel, metadataDescription].map(escapeCsvField).join(',');
    }),
  ];

  const fileName = `${schemeInfo.schemeKey}.csv`;
  await fs.writeFile(fileName, csvLines.join('\n'), 'utf8');
  console.log(`已输出 CSV 文件: ${fileName}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未配置');
  }

  // loadSchemeMap now accesses shared db directly
  const schemeMap = await loadSchemeMap();
  const schemeList = Object.keys(schemeMap);

  if (args.length < 1) {
    console.error('用法: pnpm tsx packages/redeem-code/scripts/generate-redeem-codes.ts <schemeKey> [count=1] [--csv]');
    console.error('选项:');
    console.error('  --csv  写入 CSV 文件（默认不写入）');
    console.error(`可用方案: ${schemeList.join(', ')}`);
    process.exit(1);
  }

  const scheme = args[0];
  if (!schemeList.includes(scheme)) {
    console.error(`无效的 schemeKey "${scheme}"，必须为以下之一: ${schemeList.join(', ')}`);
    process.exit(1);
  }

  let count = 1;
  let writeCsv = false;

  // 解析 count 和 --csv 选项
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--csv') {
      writeCsv = true;
    } else {
      const parsed = Number.parseInt(args[i], 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        console.error('Count 必须是大于 0 的整数');
        process.exit(1);
      }
      count = parsed;
    }
  }

  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(createRedeemCodeInternal(scheme, schemeMap));
  }

  const codeArray = Array.from(codes);
  console.log(`已生成 ${codeArray.length} 个 ${scheme} 兑换码:`);
  console.log('-------------------');
  codeArray.forEach((code, index) => {
    console.log(`${index + 1}. ${code}`);
  });
  console.log('-------------------');

  if (writeCsv) {
    await writeCodesToCsv(codeArray, schemeMap[scheme]);
  }
}

main()
  .catch((error) => {
    console.error('生成兑换码时出错:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .then(() => {
    setTimeout(() => process.exit(0), 1000);
  });
