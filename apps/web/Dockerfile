# ============================================================================
#                    AI Chatbot UI (Next.js) Dockerfile
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
COPY apps/ys-ui/package.json ./apps/ys-ui/
COPY packages/database/package.json ./packages/database/
COPY packages/redeem-code/package.json ./packages/redeem-code/
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
COPY --from=deps /app/apps/ys-ui/node_modules ./apps/ys-ui/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/redeem-code/node_modules ./packages/redeem-code/node_modules

# 复制源代码
COPY . .

# 设置构建时环境变量
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=1

# 先构建依赖包
RUN pnpm --filter @ys/database build || true
RUN pnpm --filter @ys/redeem-code build || true

# 构建 Next.js 应用
RUN pnpm --filter @ys/web build

# ==========================================================================
# 阶段 4: 生产运行阶段
# ==========================================================================
FROM node:18-slim AS runner

WORKDIR /app

# 设置运行时环境变量
ENV NODE_ENV=production
ENV WEB_PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# 安装运行时依赖（仅基础工具，Chrome 通过外部服务提供）
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    fonts-wqy-zenhei \
    fonts-noto-cjk \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Puppeteer 配置 - 使用远程 Chrome 服务 (browserless/chrome)
# 通过环境变量 PUPPETEER_BROWSER_URL 指定远程 Chrome 地址
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 创建非 root 用户
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/apps/ys-ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/ys-ui/.next/static ./apps/ys-ui/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/ys-ui/public ./apps/ys-ui/public

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["node", "apps/ys-ui/server.js"]
