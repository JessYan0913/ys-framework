import type { InferSelectModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789');

// 套餐定义表
export const plan = pgTable(
  'Plan',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull().unique(), // e.g., 'free', 'pro', 'enterprise'
    description: text('description'),
    price: integer('price').default(0), // 月度价格（以分为单位）
    // 默认包含的积分
    defaultPoints: integer('default_points').notNull().default(0),
    // 默认的对话次数限制
    defaultConversationLimit: integer('default_conversation_limit'),
    // 套餐特性，例如是否允许 API 访问等
    features: jsonb('features').default({}),
    isActive: boolean('is_active').default(true), // 是否可被订阅
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    planNameIdx: uniqueIndex('plan_name_idx').on(table.name),
  })
);

export type Plan = InferSelectModel<typeof plan>;

// 订阅实例表 (核心)
export const subscription = pgTable(
  'Subscription',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plan.id),

    // 关联账户 ID（用户或组织）
    accountId: uuid('account_id').notNull(),

    // 当前积分与额度
    points: integer('points').notNull().default(0),
    planPoints: integer('plan_points').notNull().default(0), // 套餐积分上限
    conversationLimit: integer('conversation_limit').notNull().default(100), // 会话次数上限
    conversationCount: integer('conversation_count').notNull().default(0), // 已使用会话次数

    // 周期信息
    planExpiry: timestamp('plan_expiry'), // 套餐到期时间
    nextResetDate: timestamp('next_reset_date'), // 下次积分重置时间

    // 状态
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // 确保一个账户只有一个活跃的订阅
    accountSubscriptionUniqueIdx: uniqueIndex('account_subscription_unique_idx').on(table.accountId),
    subscriptionPlanIdx: index('subscription_plan_idx').on(table.planId),
  })
);

export type Subscription = InferSelectModel<typeof subscription>;

export const organization = pgTable(
  'Organization',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(), // 主键，默认随机 UUID
    name: varchar('name', { length: 120 }).notNull(), // 组织名称
    description: text('description'), // 组织描述信息
    slug: varchar('slug', { length: 160 }), // 组织唯一标识，用于友好 URL
    ownerId: uuid('owner_id').references(() => user.id, { onDelete: 'set null' }), // 归属人
    metadata: jsonb('metadata').default({}), // 额外配置或业务扩展信息
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), // 创建时间
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()), // 更新时间
  },
  (table) => ({
    organizationSlugIdx: index('organization_slug_idx').on(table.slug),
  })
);

export type Organization = InferSelectModel<typeof organization>;

export const app = pgTable('App', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  appId: varchar('app_id', { length: 255 }).notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 120 }).notNull().default(''),
  publicKey: varchar('public_key', { length: 512 }).notNull(),
  metadata: jsonb('metadata').default({}),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type App = InferSelectModel<typeof app>;

export const user = pgTable(
  'User',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(), // 用户主键 UUID
    name: varchar('name', { length: 100 }), // 用户昵称/展示名称
    email: varchar('email', { length: 64 }).notNull(), // 登录邮箱，唯一标识
    password: varchar('password', { length: 256 }), // 密码哈希
    phone: varchar('phone', { length: 20 }), // 手机号
    bio: text(), // 个人简介
    avatar: text(), // 头像链接
    favoriteStyle: varchar('favorite_style', { length: 50 }), // 偏好的沟通风格
    lastActive: timestamp('last_active'), // 最后活跃时间
    emailVerified: boolean('email_verified').default(false), // 邮箱是否已验证
    metadata: jsonb('metadata').default({}), // 业务扩展信息 JSON
    joinDate: timestamp('join_date').defaultNow(), // 加入时间
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(), // 记录创建时间
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()), // 记录更新时间
  },
  (table) => ({
    userEmailUniqueIdx: uniqueIndex('user_email_unique_idx').on(table.email),
  })
);

export type User = InferSelectModel<typeof user>;

// 定义交易状态枚举
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed', 'refunded']);

// 定义交易类型枚举
export const transactionTypeEnum = pgEnum('transaction_type', ['usage', 'recharge', 'reward', 'refund', 'transfer']);

// 交易记录表
export const transaction = pgTable(
  'Transaction',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),

    // 使用枚举定义类型和状态
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').notNull().default('completed'),

    // 积分变动（正数收入，负数支出）
    points: integer('points').notNull(),

    // 余额追踪
    balanceBefore: integer('balance_before').notNull(),
    balanceAfter: integer('balance_after').notNull(),

    // 来源标识与扩展信息
    source: varchar('source', { length: 32 }).notNull().default('system'),
    metadata: jsonb('metadata').default({}),

    // 时间戳
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    transactionSubscriptionIdx: index('transaction_subscription_idx').on(table.subscriptionId),
    transactionTypeIdx: index('transaction_type_idx').on(table.type),
    transactionStatusIdx: index('transaction_status_idx').on(table.status),
  })
);

export type Transaction = InferSelectModel<typeof transaction>;

// 兑换记录表
export const redemptionRecord = pgTable(
  'RedemptionRecord',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 255 }).notNull(),
    transactionId: uuid('transaction_id').references(() => transaction.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').default({}),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    redemptionRecordSubscriptionIdx: index('redemption_record_subscription_idx').on(table.subscriptionId),
    redemptionRecordCodeIdx: uniqueIndex('redemption_record_code_idx').on(table.code),
  })
);

export type RedemptionRecord = InferSelectModel<typeof redemptionRecord>;

export const redemptionConfig = pgTable(
  'RedemptionConfig',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(), // 主键
    schemeKey: varchar('scheme_key', { length: 64 }).notNull(), // 方案唯一标识，对应兑换码中的 scheme key
    displayName: varchar('display_name', { length: 120 }), // 运营展示名称
    planLevel: varchar('plan_level', { length: 32 }), // 套餐等级，例如 basic/pro
    months: integer('months').notNull().default(1), // 套餐持续月份
    monthlyPoints: integer('monthly_points'), // 每月积分额度（套餐类奖励）
    bonusPoints: integer('bonus_points'), // 一次性奖励积分
    metadata: jsonb('metadata')
      .$type<{
        schemeId: number;
      }>()
      .default({ schemeId: 0 }), // 额外配置，如额度、限制
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), // 创建时间
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()), // 更新时间
  },
  (table) => ({
    redeemSchemeConfigSchemeKeyIdx: uniqueIndex('redeem_scheme_config_scheme_key_unique_idx').on(table.schemeKey),
  })
);

export type RedemptionConfig = InferSelectModel<typeof redemptionConfig>;

export const organizationMembers = pgTable(
  'OrganizationMembers',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).default('member'),
    status: varchar('status', { length: 20 }).default('active'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.organizationId, table.userId] }),
    organizationMembersOrgIdx: index('organization_members_org_idx').on(table.organizationId),
    organizationMembersUserIdx: index('organization_members_user_idx').on(table.userId),
  })
);

export type OrganizationMember = InferSelectModel<typeof organizationMembers>;

export const chat = pgTable(
  'Chat',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    accountId: uuid('account_id').notNull(),
    projectId: varchar('projectId', { length: 191 }),
    visibility: varchar('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
    attachments: json('attachments').notNull().default([]),
  },
  (table) => ({
    chatAccountIdx: index('chat_account_idx').on(table.accountId),
  })
);

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['code', 'image', 'sheet', 'mdx'] })
      .notNull()
      .default('mdx'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

// 项目资源表结构
export const project = pgTable(
  'Project',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 255 }).notNull(),
    desc: varchar('desc', { length: 255 }),
    proCode: varchar('pro_code', { length: 255 }).notNull(),
    creatorId: uuid('creator_id').references(() => user.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organization.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    codeUniqueIdx: uniqueIndex('project_code_unique_idx').on(table.code),
    projectCreatorIdx: index('project_creator_idx').on(table.creatorId),
    projectOrgIdx: index('project_org_idx').on(table.organizationId),
    ownershipConstraint: check('project_ownership_constraint', sql`(organization_id IS NULL)`),
  })
);

export type Project = InferSelectModel<typeof project>;

// 知识库表 - 仅支持组织知识库(参照项目表设计)
export const knowledgeBase = pgTable(
  'KnowledgeBase',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // 创建者和组织信息
    creatorId: uuid('creator_id').references(() => user.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organization.id, { onDelete: 'set null' }),

    // 配置信息
    metadata: jsonb('metadata').default({}),

    // 向量化配置
    parserConfig: jsonb('parser_config').default({}),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    knowledgeBaseCreatorIdx: index('knowledge_base_creator_idx').on(table.creatorId),
    knowledgeBaseOrgIdx: index('knowledge_base_org_idx').on(table.organizationId),
  })
);

export type KnowledgeBase = InferSelectModel<typeof knowledgeBase>;

// 任务类型枚举
export const ParserTypeEnum = pgEnum('parser_type', [
  'naive', // 常规解析
  'qa', // Q&A 解析
  'book', // 书籍解析
  'presentation', // 演示文稿解析
  'manual', // 手册解析
  'table', // 表格解析
]);

// 知识库文档表 - 关联知识库的文档
export const knowledgeBaseDocument = pgTable(
  'KnowledgeBaseDocument',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    bucketName: varchar('bucket_name', { length: 255 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileType: varchar('file_type', { length: 100 }),
    fileSize: integer('file_size'),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    // 进度信息
    parserId: ParserTypeEnum('parser_id').notNull().default('naive'),
    progress: real('progress').notNull().default(0.0), // 0~1 的进度
    progressMsg: text('progress_msg'), // 当前进度文字描述
    processBeginAt: timestamp('process_begin_at', { withTimezone: true }),
    processDuration: real('process_duration').default(0.0), // 处理时长(秒)
    chunkNums: integer('chunk_nums'),

    // 关联知识库
    knowledgeBaseId: varchar('knowledge_base_id', { length: 191 })
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),

    // 创建者
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    titleIdx: index('kb_document_title_idx').on(table.fileName),
    kbDocumentCreatorIdx: index('kb_document_creator_idx').on(table.creatorId),
    kbDocumentKbIdx: index('kb_document_kb_idx').on(table.knowledgeBaseId),
    kbDocumentStatusIdx: index('kb_document_status_idx').on(table.status),
  })
);

export type KnowledgeBaseDocument = InferSelectModel<typeof knowledgeBaseDocument>;

// 原有的知识文档表(保持不变)
export const knowledgeDocument = pgTable(
  'KnowledgeDocument',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    title: varchar('title', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    creatorId: uuid('creator_id').references(() => user.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id').references(() => user.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organization.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    titleIdx: index('knowledge_document_title_idx').on(table.title),
    knowledgeDocumentCreatorIdx: index('knowledge_document_creator_idx').on(table.creatorId),
    knowledgeDocumentOwnerIdx: index('knowledge_document_owner_idx').on(table.ownerId),
    knowledgeDocumentOrgIdx: index('knowledge_document_org_idx').on(table.organizationId),
    ownershipConstraint: check('ownership_constraint', sql`(owner_id IS NULL) OR (organization_id IS NULL)`),
  })
);

export type KnowledgeDocument = InferSelectModel<typeof knowledgeDocument>;

// 文档标签表结构
export const tag = pgTable(
  'Tag',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // 标签名全局唯一，便于通过名称直接引用
    nameIdx: index('tag_name_unique_idx').on(table.name),
  })
);

export type Tag = InferSelectModel<typeof tag>;

// 文档-标签 多对多关联表
export const knowledgeDocumentTag = pgTable(
  'KnowledgeDocumentTag',
  {
    documentId: varchar('document_id', { length: 191 })
      .notNull()
      .references(() => knowledgeDocument.id, { onDelete: 'cascade' }),
    tagId: varchar('tag_id', { length: 191 })
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.documentId, table.tagId] }),
    documentIdx: index('kdt_document_idx').on(table.documentId),
    tagIdx: index('kdt_tag_idx').on(table.tagId),
  })
);

export type KnowledgeDocumentTag = InferSelectModel<typeof knowledgeDocumentTag>;

// 组织邀请链接表
export const organizationInvite = pgTable(
  'OrganizationInvite',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    token: varchar('token', { length: 191 }).notNull(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).notNull().default('member'),
    maxUses: integer('max_uses').default(1),
    usedCount: integer('used_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    status: varchar('status', { length: 16 }).notNull().default('active'), // active | revoked
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationInviteTokenIdx: uniqueIndex('organization_invite_token_unique_idx').on(table.token),
    organizationInviteOrgIdx: index('organization_invite_org_idx').on(table.organizationId),
  })
);

export type OrganizationInvite = InferSelectModel<typeof organizationInvite>;

export const toolResults = pgTable(
  'ToolResults',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    toolName: varchar('toolName', { length: 255 }).notNull(),
    executionId: varchar('executionId', { length: 255 }).notNull(),
    result: jsonb('result'),
    status: varchar('status', { length: 32 }).notNull(),
    error: text('error'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    executionIdIdx: index('tool_results_execution_id_idx').on(table.executionId),
  })
);

export type ToolResult = InferSelectModel<typeof toolResults>;

// 用户类型枚举
export const userTypeEnum = pgEnum('user_type', ['individual', 'enterprise']);

// 用户调查问卷表
export const userSurvey = pgTable(
  'UserSurvey',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    userType: userTypeEnum('user_type').notNull(),
    companyName: varchar('company_name', { length: 255 }),
    industry: varchar('industry', { length: 255 }),
    role: varchar('role', { length: 255 }),
    requirements: text('requirements'),
    expectedFeatures: text('expected_features'),
    isCompleted: boolean('is_completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // 确保每个用户只有一份问卷
    userSurveyUserIdx: uniqueIndex('user_survey_user_unique_idx').on(table.userId),
    userSurveyCompletedIdx: index('user_survey_completed_idx').on(table.isCompleted),
  })
);

export type UserSurvey = InferSelectModel<typeof userSurvey>;

// ==================== 任务调度和分片上传表 ====================

// 任务类型枚举
export const taskTypeEnum = pgEnum('task_type', [
  'document_upload', // 文件上传任务
  'document_parse', // 文档解析任务
  'chunk_index', // 分块索引任务
  'vector_embedding', // 向量化任务
  'graphrag', // GraphRAG 构建
  'raptor', // RAPTOR 处理
  'mindmap', // 思维导图生成
]);

// 任务状态枚举
export const taskStatusEnum = pgEnum('task_status', [
  'pending', // 待处理
  'queued', // 已排队
  'running', // 运行中
  'completed', // 已完成
  'failed', // 失败
  'cancelled', // 已取消
  'paused', // 已暂停
]);

// 上传状态枚举
export const uploadStatusEnum = pgEnum('upload_status', [
  'initiating', // 初始化中
  'uploading', // 上传中
  'merging', // 合并中
  'completed', // 已完成
  'failed', // 失败
  'cancelled', // 已取消
]);

/**
 * Task 表 - 异步任务调度核心
 * 负责把所有耗时操作从 HTTP 请求中解耦，让用户操作立刻返回
 */
export const task = pgTable(
  'Task',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),

    // 任务类型和状态
    taskType: taskTypeEnum('task_type').notNull(),
    status: taskStatusEnum('status').notNull().default('pending'),

    // 关联的文档ID（如果适用）
    documentId: varchar('document_id', { length: 191 }).references(() => knowledgeBaseDocument.id, {
      onDelete: 'cascade',
    }),

    // 任务负责的页码范围（支持分段并行处理）
    fromPage: integer('from_page'),
    toPage: integer('to_page'),

    // 优先级（数值越大越优先）
    priority: integer('priority').notNull().default(0),

    // 进度信息
    progress: real('progress').notNull().default(0.0), // 0~1 的进度
    progressMsg: text('progress_msg'), // 当前进度文字描述

    // 时间统计
    beginAt: timestamp('begin_at', { withTimezone: true }), // 任务真正开始执行的时间
    completedAt: timestamp('completed_at', { withTimezone: true }), // 任务完成时间
    processDuration: real('process_duration').default(0.0), // 已经耗时多少秒

    // 重试机制
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(3),

    // 任务内容摘要（防重复任务用）
    digest: varchar('digest', { length: 255 }),

    // 任务产生的 chunk ID 列表
    chunkIds: text('chunk_ids'), // JSON array of chunk IDs

    // 错误信息
    error: text('error'),
    errorStack: text('error_stack'),

    // 任务配置和结果
    config: jsonb('config').default({}), // 任务配置参数
    result: jsonb('result').default({}), // 任务执行结果

    // 创建者
    creatorId: uuid('creator_id').references(() => user.id, { onDelete: 'set null' }),

    // 元数据
    metadata: jsonb('metadata').default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    taskStatusIdx: index('task_status_idx').on(table.status),
    taskTypeIdx: index('task_type_idx').on(table.taskType),
    taskDocumentIdx: index('task_document_idx').on(table.documentId),
    taskPriorityIdx: index('task_priority_idx').on(table.priority),
    taskDigestIdx: index('task_digest_idx').on(table.digest),
    taskCreatedAtIdx: index('task_created_at_idx').on(table.createdAt),
  })
);

export type Task = InferSelectModel<typeof task>;
