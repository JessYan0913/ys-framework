<p align="center">
  An Open-Source AI Chatbot Template Built With Next.js and the AI SDK by Vercel.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Vercel Postgres powered by Neon](https://vercel.com/storage/postgres) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [NextAuth.js](https://github.com/nextauthjs/next-auth)
  - Simple and secure authentication

## Model Providers

This template ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fys&env=AUTH_SECRET&envDescription=Generate%20a%20random%20secret%20to%20use%20for%20authentication&envLink=https%3A%2F%2Fgenerate-secret.vercel.app%2F32&project-name=my-awesome-chatbot&repository-name=my-awesome-chatbot&demo-title=AI%20Chatbot&demo-description=An%20Open-Source%20AI%20Chatbot%20Template%20Built%20With%20Next.js%20and%20the%20AI%20SDK%20by%20Vercel&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22api-key%22%2C%22integrationSlug%22%3A%22groq%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](../../.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000/).

## 积分与计费体系 (Points and Billing System)

本项目采用积分制来衡量模型的使用量。积分与人民币的兑换关系如下：

- **核心汇率**: `1元 = 10,000积分`

Token的消耗成本采用阶梯计费模式，具体价格取决于每次请求的 **输入Token数量**，并结合“思考模式”和“批量推理”进行动态计算。所有价格单位均为 **元 / 千Token**。

### 计费规则详情

| 输入Token范围           | 模式          | 输入价格 (元/千Token) | 输出价格 (元/千Token) |
| :---------------------- | :------------ | :-------------------- | :-------------------- |
| **<= 128k**             | **标准**      | 0.0008                | 0.002                 |
|                         | **思考**      | 0.0008                | 0.008                 |
|                         | **批量**      | 0.0004                | 0.001                 |
|                         | **思考+批量** | 0.0004                | 0.004                 |
| **128k < 输入 <= 256k** | **标准**      | 0.0024                | 0.02                  |
|                         | **思考**      | 0.0024                | 0.024                 |
|                         | **批量**      | 0.0012                | 0.01                  |
|                         | **思考+批量** | 0.0012                | 0.012                 |
| **256k < 输入 <= 1M**   | **标准**      | 0.0048                | 0.048                 |
|                         | **思考**      | 0.0048                | 0.064                 |
|                         | **批量**      | 0.0024                | 0.024                 |
|                         | **思考+批量** | 0.0024                | 0.032                 |

最终消耗的积分会根据计算出的人民币成本，通过核心汇率转换并向上取整。计算逻辑已在 `lib/token-cost.ts` 中实现。

#### 积分与Token的动态关系 (Dynamic Relationship between Points and Tokens)

**重要提示**: `1积分` **不等于** `1 Token`。积分与Token的兑换比例是动态的，它取决于Token在不同使用场景下的实际人民币成本。

**示例:**

- **便宜场景 (标准模式, 低用量):** 2,000个Token (1k输入+1k输出) 可能仅消耗 `28积分`。
- **昂贵场景 (思考模式, 高用量):** 350,000个Token (300k输入+50k输出) 可能消耗 `46,400积分`。

这种设计确保了积分消耗能精确地反映真实的运营成本。

#### 定价策略与盈利模式 (Pricing Strategy and Profit Model)

本项目采用“调整充值价格”的方式实现盈利，而非改变积分消耗计算。具体来说：

1. **成本计算**: 我们使用固定汇率 `1元 = 10,000积分` 来计算模型使用的真实成本。

2. **充值定价**: 在充值套餐中，我们可能会调整积分与人民币的兑换比例，例如：
   - 标准套餐：100元 = 800,000积分（而非成本价的1,000,000积分）
   - 大额充值：500元 = 4,500,000积分（体现批量折扣）

3. **透明原则**: 我们始终在充值页面清晰地展示每个套餐的价格和对应的积分数量，确保用户充分知情。

这种模式保证了系统的一致性和透明度，同时为运营提供了灵活的盈利空间。
