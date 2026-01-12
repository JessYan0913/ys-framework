# ============================================================================
#                    AI Chatbot API (NestJS) Dockerfile
# ============================================================================
# 多阶段构建，支持 pnpm monorepo 结构
# 构建上下文应为项目根目录
# ============================================================================

# ==========================================================================
# 阶段 1: 基础镜像 - 安装 pnpm
# ==========================================================================
FROM node:18-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ==========================================================================
# 阶段 2: 依赖安装
# ==========================================================================
FROM base AS deps

WORKDIR /app

# 复制 pnpm 工作区配置
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# 复制所有 package.json 文件（保持目录结构）
COPY apps/ys-api/package.json ./apps/ys-api/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# ==========================================================================
# 阶段 3: 构建阶段
# ==========================================================================
FROM base AS builder

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ys-api/node_modules ./apps/ys-api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules

# 复制源代码
COPY . .

# 设置构建时环境变量
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# 先构建依赖包
RUN pnpm --filter @ys/database build || true

# 构建 NestJS 应用
RUN pnpm --filter @ys/api build

# ==========================================================================
# 阶段 4: 生产依赖安装
# ==========================================================================
FROM base AS prod-deps

WORKDIR /app

# 复制 pnpm 工作区配置
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# 复制所有 package.json 文件
COPY apps/ys-api/package.json ./apps/ys-api/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# ==========================================================================
# 阶段 5: 生产运行阶段
# ==========================================================================
FROM node:18-alpine AS runner

WORKDIR /app

# 设置运行时环境变量
ENV NODE_ENV=production
ENV API_PORT=3001

# 安装运行时必要工具
RUN apk add --no-cache curl

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nestjs

# 复制生产依赖
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/ys-api/node_modules ./apps/ys-api/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/packages/database/node_modules ./packages/database/node_modules

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/ys-api/dist ./apps/ys-api/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/src ./packages/database/src

# 复制必要的配置文件
COPY --from=builder --chown=nestjs:nodejs /app/apps/ys-api/package.json ./apps/ys-api/
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./packages/database/

# 复制邮件模板等资源文件
COPY --from=builder --chown=nestjs:nodejs /app/apps/ys-api/assets ./apps/ys-api/assets

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 启动命令
CMD ["node", "apps/ys-api/dist/main.js"]
