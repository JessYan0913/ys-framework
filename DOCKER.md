# AI Chatbot Docker 部署指南

本文档介绍如何使用 Docker 部署 AI Chatbot monorepo 项目。

## 项目结构

```
ys/
├── apps/
│   ├── ys-ui/      # Next.js 前端 (端口 3000)
│   │   └── Dockerfile
│   └── ys-api/     # NestJS 后端 (端口 3001)
│       └── Dockerfile
├── packages/
│   ├── database/           # 数据库包
│   ├── redeem-code/        # 兑换码包
│   └── eslint-config/      # ESLint 配置
├── docker-compose.yml      # Docker Compose 配置
├── nginx.conf              # Nginx 反向代理配置
├── .dockerignore           # Docker 忽略文件
└── .env.example            # 环境变量示例
```

## 快速开始

### 1. 准备环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，配置必要的环境变量
```

### 2. 启动服务

#### 仅启动基础设施（开发环境）

```bash
# 启动 PostgreSQL、Redis、MinIO
docker compose up -d
```

#### 启动完整生产环境

```bash
# 启动所有服务（包括应用和 Nginx）
docker compose --profile prod up -d
```

#### 构建并启动

```bash
# 重新构建镜像并启动
docker compose --profile prod up -d --build
```

## 服务说明

| 服务     | 端口      | 说明                          |
| -------- | --------- | ----------------------------- |
| postgres | 5432      | PostgreSQL 数据库             |
| redis    | 6379      | Redis 缓存                    |
| chrome   | 3002      | Browserless Chrome (PDF 导出) |
| minio    | 9000/9001 | MinIO 对象存储 (API/Console)  |
| web      | 3000      | Next.js 前端应用              |
| api      | 3001      | NestJS 后端 API               |
| nginx    | 80/443    | Nginx 反向代理                |

## 环境变量配置

### 必需的环境变量

```bash
# 数据库
POSTGRES_DB=ai_chatbot
POSTGRES_USER=ai_chatbot
POSTGRES_PASSWORD=your_secure_password

# 认证
AUTH_SECRET=your_auth_secret_here
JWT_SECRET=your_jwt_secret_here

# AI 模型
CHAT_MODEL_BASE_URL=your_chat_model_api_base_url
CHAT_MODEL_API_KEY=your_chat_model_api_key
CHAT_MODEL_NAME=your_chat_model_name
```

### 可选的环境变量

```bash
# 端口配置
POSTGRES_PORT=5432
REDIS_PORT=6379
CHROME_PORT=3002
MINIO_PORT=9000
WEB_PORT=3000
API_PORT=3001
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ys
```

## Chrome 服务 (PDF 导出)

PDF 导出功能使用独立的 [browserless/chrome](https://github.com/browserless/chrome) 容器，而非在应用镜像中安装 Chrome。

**优势**：

- 应用镜像体积减少约 400-500MB
- Chrome 服务可独立扩展
- 更好的资源隔离

**配置**：

- 应用通过 `PUPPETEER_BROWSER_URL=ws://chrome:3000` 连接远程 Chrome
- Chrome 服务默认支持 10 个并发会话

## 单独构建镜像

### 构建前端镜像

```bash
docker build -t ys-web -f apps/ys-ui/Dockerfile .
```

### 构建后端镜像

```bash
docker build -t ys-api -f apps/ys-api/Dockerfile .
```

## SSL 证书配置

### 1. 创建 SSL 目录

```bash
mkdir -p ssl
```

### 2. 放置证书文件

```bash
# 将证书文件放入 ssl 目录
ssl/
├── cert.pem    # SSL 证书
└── key.pem     # SSL 私钥
```

### 3. 启动 HTTPS

Nginx 会自动加载 `ssl/` 目录下的证书文件。

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f web
docker compose logs -f api

# 重启服务
docker compose restart web

# 停止所有服务
docker compose --profile prod down

# 停止并删除数据卷
docker compose --profile prod down -v

# 进入容器
docker exec -it ys-web sh
docker exec -it ys-api sh
```

## 数据库迁移

```bash
# 进入 web 容器执行迁移
docker exec -it ys-web sh
pnpm --filter @ys/database db:push
```

## 健康检查

所有服务都配置了健康检查：

- **PostgreSQL**: `pg_isready` 命令
- **Redis**: `redis-cli ping`
- **MinIO**: HTTP 健康检查端点
- **Web**: `/api/health` 端点
- **API**: `/health` 端点
- **Nginx**: `nginx -t` 配置检查

## 故障排除

### 1. 容器启动失败

```bash
# 查看详细日志
docker compose logs web
docker compose logs api
```

### 2. 数据库连接失败

确保 PostgreSQL 容器已启动并健康：

```bash
docker compose ps postgres
docker compose logs postgres
```

### 3. 构建失败

```bash
# 清理构建缓存
docker builder prune

# 重新构建
docker compose --profile prod build --no-cache
```

### 4. 端口冲突

修改 `.env` 文件中的端口配置：

```bash
WEB_PORT=3100
API_PORT=3101
```

## 生产环境建议

1. **使用强密码**: 修改所有默认密码
2. **启用 HTTPS**: 配置 SSL 证书
3. **限制端口暴露**: 只暴露 Nginx 的 80/443 端口
4. **定期备份**: 备份 PostgreSQL 和 MinIO 数据
5. **监控日志**: 配置日志收集和监控
6. **资源限制**: 为容器配置 CPU 和内存限制

## 资源限制示例

在 `docker-compose.yml` 中添加：

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```
