#!/usr/bin/env node

import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import path from 'path';

import { redemptionConfig } from '@ys/database';
import { db } from '@ys/database/nextjs';

// Load environment variables from the monorepo root
config({ path: path.resolve(process.cwd(), '../../.env.local') });

const seeds = [
  {
    schemeKey: 'scheme_gift_s',
    displayName: '礼品卡 S 档（10万积分）',
    planLevel: 'gift',
    months: 0,
    monthlyPoints: null,
    bonusPoints: 100_000,
    metadata: {
      schemeId: 0b000001,
      tier: 'S',
      estimatedRmb: 10,
      description: '赠送客户 100,000 积分，约等值 10 元票面价值',
    },
  },
  {
    schemeKey: 'scheme_gift_m',
    displayName: '礼品卡 M 档（30万积分）',
    planLevel: 'gift',
    months: 0,
    monthlyPoints: null,
    bonusPoints: 300_000,
    metadata: {
      schemeId: 0b000010,
      tier: 'M',
      estimatedRmb: 30,
      description: '赠送客户 300,000 积分，约等值 30 元票面价值',
    },
  },
  {
    schemeKey: 'scheme_gift_l',
    displayName: '礼品卡 L 档（60万积分）',
    planLevel: 'gift',
    months: 0,
    monthlyPoints: null,
    bonusPoints: 600_000,
    metadata: {
      schemeId: 0b000011,
      tier: 'L',
      estimatedRmb: 60,
      description: '赠送客户 600,000 积分，约等值 60 元票面价值',
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未配置');
  }

  try {
    for (const seed of seeds) {
      const existing = await db
        .select({ id: redemptionConfig.id })
        .from(redemptionConfig)
        .where(eq(redemptionConfig.schemeKey, seed.schemeKey))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(redemptionConfig)
          .set({
            displayName: seed.displayName,
            planLevel: seed.planLevel,
            months: seed.months,
            monthlyPoints: seed.monthlyPoints,
            bonusPoints: seed.bonusPoints,
            metadata: seed.metadata,
          })
          .where(eq(redemptionConfig.schemeKey, seed.schemeKey));

        console.log(`已更新方案: ${seed.schemeKey}`);
      } else {
        await db.insert(redemptionConfig).values({
          schemeKey: seed.schemeKey,
          displayName: seed.displayName,
          planLevel: seed.planLevel,
          months: seed.months,
          monthlyPoints: seed.monthlyPoints,
          bonusPoints: seed.bonusPoints,
          metadata: seed.metadata,
        });

        console.log(`已插入方案: ${seed.schemeKey}`);
      }
    }

    console.log('兑换码方案初始化完成');
  } catch (error) {
    console.error('初始化兑换码方案失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .then(() => {
    setTimeout(() => process.exit(0), 1000);
  });
