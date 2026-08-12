# 部署到 Vercel

项目使用 Vercel Services 将前端（Vite + React）和后端（FastAPI）作为
同一个 Vercel 项目部署，`/api/*` 路由到后端服务，其余路径由前端服务处理。

## 部署步骤

1. 确保已安装 Vercel CLI 并登录：`vercel whoami`。
2. 在项目根目录执行 `vercel deploy --prod`。
3. 在 Vercel 项目设置中确认 Framework Preset 为 `Services`。

## 环境变量

需要在 Vercel 项目中配置以下环境变量（Production）：

| 变量 | 说明 |
| --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API Key，必填 |
| `DEEPSEEK_MODEL` | 模型名，默认 `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `MAX_TOOL_ROUNDS` | Agent 工具调用轮次上限 |
| `CHAT_HISTORY_LIMIT` | 聊天上下文条数上限 |
| `DATABASE_URL` | 可选，生产环境强烈建议配置 |

## 数据库说明

- Vercel 函数文件系统只读，SQLite 只能写入 `/tmp`，**冷启动后数据会丢失**。
- 未配置 `DATABASE_URL` 时，应用会使用 `/tmp` 下的临时 SQLite 运行，仅适合体验。
- 生产环境请创建 PostgreSQL（如 Neon / Supabase 免费实例），将连接串配置为
  `DATABASE_URL` 后重新部署；代码已支持跨 SQLite / PostgreSQL 的迁移逻辑。

## 本地预览

```bash
vercel dev
```
