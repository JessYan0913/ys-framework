# AI Chatbot Monorepo

智能对话机器人平台，支持多模态交互、语音识别、文档处理等功能。

## 项目结构

```
ys/
├── apps/
│   ├── ys-api/        # 后端 API 服务 (NestJS)
│   └── ys-ui/         # 前端 Web 应用 (Next.js)
├── packages/
│   ├── database/              # 数据库层 (Drizzle ORM)
│   ├── eslint-config/         # ESLint 配置
│   └── redeem-code/           # 兑换码模块
├── docs/                      # 文档
├── scripts/                   # 脚本工具
├── .env.example               # 环境变量模板
├── docker-compose.yml         # Docker 编排
├── nginx.conf                 # Nginx 配置
├── pnpm-workspace.yaml        # pnpm 工作空间配置
├── turbo.json                 # Turbo 构建配置
└── package.json               # 根项目配置
```

## 核心功能

### 🤖 AI 对话

- 多模型支持 (OpenAI, Ollama, 兼容 OpenAI API)
- 流式响应
- 上下文记忆
- 工具调用集成

### 🎤 语音交互

- 语音识别 (Porcupine + Vosk)
- 语音合成
- 唤醒词检测
- 实时语音处理

### 📄 文档处理

- PDF 解析和高亮
- Word 文档处理
- Excel 表格展示
- Markdown 渲染
- 图片预览

### 🏢 组织管理

- 多租户支持
- 组织切换
- 积分系统
- 兑换码功能

### 🔐 身份认证

- JWT 认证
- 邮箱登录
- 应用 Token 认证
- 权限管理

## 技术栈

### 前端 (ys-ui)

- **框架**: Next.js 15.3.6 + React 19.1.2
- **UI**: Tailwind CSS + Radix UI + shadcn/ui
- **状态管理**: React Hooks + SWR
- **表单**: React Hook Form + Zod
- **编辑器**: TipTap
- **图表**: Chart.js + Recharts
- **语音**: Picovoice + Web Voice Kit

### 后端 (ys-api)

- **框架**: NestJS 10
- **数据库**: PostgreSQL + Drizzle ORM
- **认证**: JWT + Passport.js
- **缓存**: Redis
- **存储**: MinIO + Vercel Blob
- **队列**: BullMQ
- **日志**: Pino

### 开发工具

- **包管理**: pnpm + Turborepo
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript
- **测试**: Jest + Playwright
- **容器化**: Docker + Docker Compose

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 9.0
- PostgreSQL 数据库
- Redis (可选，用于缓存)

### 安装依赖

```bash
# 安装 pnpm (如果未安装)
npm install -g pnpm

# 安装所有依赖
pnpm install

# 构建所有包
pnpm build
```

### 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
# 配置数据库连接、JWT 密钥等
```

### 启动开发环境

```bash
# 启动所有服务 (前端 + 后端)
pnpm dev

# 仅启动前端
pnpm start:web

# 仅启动后端
pnpm start:api
```

访问地址：

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001

## 数据库操作

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 推送 schema 到数据库
pnpm db:push

# 打开 Drizzle Studio
pnpm db:studio
```

## 项目脚本

### 开发相关

```bash
pnpm dev              # 启动所有服务
pnpm start:web        # 仅启动前端
pnpm start:api        # 仅启动后端
pnpm build            # 构建所有项目
pnpm lint             # 代码检查
pnpm lint:fix         # 自动修复代码问题
pnpm format           # 代码格式化
```

### 测试相关

```bash
pnpm test             # 运行测试
pnpm test:watch       # 监视模式运行测试
pnpm test:cov         # 测试覆盖率
```

### 数据库相关

```bash
pnpm db:generate      # 生成迁移
pnpm db:migrate       # 执行迁移
pnpm db:push          # 推送 schema
pnpm db:studio        # 打开 Studio
```

## 应用说明

### ys-ui (前端)

- **端口**: 3000
- **框架**: Next.js 15 + React 19
- **主要功能**:
  - AI 对话界面
  - 语音交互
  - 文档处理
  - 用户管理
  - 组织管理

### ys-api (后端)

- **端口**: 3001
- **框架**: NestJS 10
- **主要功能**:
  - RESTful API
  - WebSocket 支持
  - 文件上传/下载
  - 用户认证
  - 积分管理

## 部署

### Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 生产构建

```bash
# 构建所有项目
pnpm build

# 启动生产服务
pnpm start:api    # 后端
pnpm start        # 前端
```

## 环境变量

主要配置项：

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/ai_chatbot

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ys

# AI 模型
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# 邮件
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 开发指南

### 添加新包

```bash
# 在 packages 目录创建新包
cd packages
mkdir new-package
cd new-package

# 初始化 package.json
pnpm init

# 在根目录安装依赖
pnpm install
```

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 配置
- 提交前自动运行 lint 和 format
- 使用 Conventional Commits 规范

### 测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# 测试覆盖率
pnpm test:cov
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 支持

如有问题，请提交 Issue 或联系维护者。

---

**注意**: 这是一个活跃开发中的项目，API 可能会发生变化。建议在生产环境使用前进行充分测试。
