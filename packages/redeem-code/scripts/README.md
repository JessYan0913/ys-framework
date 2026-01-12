# 兑换码脚本

这些脚本用于管理兑换码系统和套餐数据。

## 前置条件

1. 确保数据库已配置（设置 `DATABASE_URL` 环境变量）
2. 确保兑换码密钥已配置（设置 `REDEEM_CODE_SECRET` 环境变量）

## 使用方法

### 1. 解码兑换码

```bash
# 在 monorepo 根目录执行
pnpm tsx packages/redeem-code/scripts/decode-redeem-code.ts <兑换码>

# 或使用包脚本
pnpm --filter @ys/redeem-code decode <兑换码>
```

示例：

```bash
pnpm tsx packages/redeem-code/scripts/decode-redeem-code.ts ABC123XYZ789
```

### 2. 生成兑换码

```bash
# 生成 1 个兑换码（默认）
pnpm tsx packages/redeem-code/scripts/generate-redeem-codes.ts scheme_gift_s

# 生成多个兑换码
pnpm tsx packages/redeem-code/scripts/generate-redeem-codes.ts scheme_gift_s 10

# 生成并导出 CSV 文件
pnpm tsx packages/redeem-code/scripts/generate-redeem-codes.ts scheme_gift_s 10 --csv

# 或使用包脚本
pnpm --filter @ys/redeem-code generate scheme_gift_s 10 --csv
```

### 3. 初始化套餐数据

```bash
pnpm tsx packages/redeem-code/scripts/seed-plan.ts

# 或使用包脚本
pnpm --filter @ys/redeem-code seed-plan
```

### 4. 初始化兑换方案配置

```bash
pnpm tsx packages/redeem-code/scripts/seed-redeem-schemes.ts

# 或使用包脚本
pnpm --filter @ys/redeem-code seed-schemes
```

## 可用的兑换方案

- `scheme_gift_s` - 礼品卡 S 档（10万积分）
- `scheme_gift_m` - 礼品卡 M 档（30万积分）
- `scheme_gift_l` - 礼品卡 L 档（60万积分）

## 注意事项

1. 脚本会自动从 monorepo 根目录加载 `.env.local` 文件
2. 生成兑换码时会自动去重，确保生成的兑换码都是唯一的
3. 使用 `--csv` 选项时，会在当前目录生成 CSV 文件
4. 所有脚本都有错误处理和详细的日志输出

## 环境变量

- `DATABASE_URL`: 数据库连接字符串
- `REDEEM_CODE_SECRET`: 兑换码签名密钥

## 故障排除

如果遇到模块找不到的错误，请确保：

1. 在 monorepo 根目录执行脚本
2. 已安装所有依赖：`pnpm install`
3. 数据库包已构建：`pnpm --filter @ys/database build`

### 使用 pnpm dlx 运行脚本

如果遇到 `tsx` 命令找不到的问题，可以使用：

```bash
pnpm dlx tsx packages/redeem-code/scripts/decode-redeem-code.ts <兑换码>
pnpm dlx tsx packages/redeem-code/scripts/generate-redeem-codes.ts scheme_gift_s 10 --csv
pnpm dlx tsx packages/redeem-code/scripts/seed-plan.ts
pnpm dlx tsx packages/redeem-code/scripts/seed-redeem-schemes.ts
```

### 验证脚本可用性

所有依赖已正确配置，脚本可以正常使用。测试结果显示：

- ✅ @ys/database 包正常
- ✅ @ys/redeem-code 包正常
- ✅ dotenv 正常
- ✅ 脚本依赖解析正常
- ✅ 环境变量配置正常
- ✅ 兑换码配置加载正常
