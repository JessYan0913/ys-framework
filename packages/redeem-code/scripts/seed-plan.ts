#!/usr/bin/env node

import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import path from 'path';

import { plan } from '@ys/database';
import { db } from '@ys/database/nextjs';

// Load environment variables from the monorepo root
config({ path: path.resolve(process.cwd(), '../../.env.local') });

type PlanSeed = {
  name: string;
  description: string;
  price: number;
  defaultPoints: number;
  defaultConversationLimit: number | null;
  features: Record<string, unknown>;
  isActive: boolean;
};

const plans: PlanSeed[] = [
  {
    name: 'free',
    description: '免费套餐，适合个人学习和体验使用。',
    price: 0,
    defaultPoints: 30_000,
    defaultConversationLimit: 200,
    features: {
      allowApiAccess: false,
      supportLevel: 'community',
      seats: 1,
    },
    isActive: true,
  },
  {
    name: 'basic',
    description: '基础套餐，为小团队提供稳定的积分额度与支持服务。',
    price: 9900,
    defaultPoints: 600_000,
    defaultConversationLimit: 800,
    features: {
      allowApiAccess: true,
      supportLevel: 'standard',
      seats: 5,
      artifacts: true,
    },
    isActive: true,
  },
  {
    name: 'pro',
    description: '专业套餐，提供更高的积分额度与客服支持。',
    price: 29900,
    defaultPoints: 2_400_000,
    defaultConversationLimit: 2000,
    features: {
      allowApiAccess: true,
      supportLevel: 'priority',
      seats: 10,
      artifacts: true,
    },
    isActive: true,
  },
  {
    name: 'enterprise',
    description: '企业套餐，提供定制化的接入能力与专属支持。',
    price: 99900,
    defaultPoints: 9_000_000,
    defaultConversationLimit: 10000,
    features: {
      allowApiAccess: true,
      supportLevel: 'dedicated',
      seats: 'unlimited',
      artifacts: true,
      customIntegrations: true,
    },
    isActive: true,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未配置');
  }

  try {
    for (const seed of plans) {
      const existing = await db.select({ id: plan.id }).from(plan).where(eq(plan.name, seed.name)).limit(1);

      if (existing.length > 0) {
        await db
          .update(plan)
          .set({
            description: seed.description,
            price: seed.price,
            defaultPoints: seed.defaultPoints,
            defaultConversationLimit: seed.defaultConversationLimit,
            features: seed.features,
            isActive: seed.isActive,
          })
          .where(eq(plan.name, seed.name));

        console.log(`已更新套餐: ${seed.name}`);
      } else {
        await db.insert(plan).values({
          name: seed.name,
          description: seed.description,
          price: seed.price,
          defaultPoints: seed.defaultPoints,
          defaultConversationLimit: seed.defaultConversationLimit,
          features: seed.features,
          isActive: seed.isActive,
        });

        console.log(`已插入套餐: ${seed.name}`);
      }
    }

    console.log('套餐初始化完成');
  } catch (error) {
    console.error('操作失败:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('初始化套餐失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .then(() => {
    // Allow time for logs to flush if needed
    setTimeout(() => process.exit(0), 1000);
  });
