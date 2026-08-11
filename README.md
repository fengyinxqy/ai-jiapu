# AI 家谱（AI Jiapu）

一个细分赛道的 Agent 应用：用自然语言口述家人信息，AI 自动解析人名、称谓与关系，实时生成交互式家谱图。第一版为本地单机版，代码结构预留多用户/云端升级路径。

## 功能

- 对话式建谱：和 AI 聊天即可添加成员与关系（配偶、亲子），AI 会自动推断称谓并追问缺失信息，不编造。
- 聊天消息支持 Markdown 渲染（加粗、列表、引用、代码等格式清晰展示）。
- 交互式家谱图：夫妻同排、世代分层，点击节点可编辑或删除成员。
- 数据本地存储：家谱与聊天记录保存在本地 SQLite，刷新页面不丢失。
- 中文界面，暖色中式纸感风格。

## 技术栈

- 后端：FastAPI + SQLAlchemy + SQLite + DeepSeek（`deepseek-chat`，函数调用）
- 前端：React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui 组件库 + React Flow（dagre 自动布局）

UI 采用 shadcn/ui 组件库与暖色纸感主题（宣纸米黄 + 朱砂红），所有颜色/圆角/字体均由 `src/styles.css` 中的语义令牌驱动，方便统一换肤。

## 目录结构

```text
backend/    FastAPI 后端、Agent 循环、SQLite 数据模型、pytest 测试
frontend/   React 前端（开发时经 Vite 代理 /api）
```

## 快速开始

### 1. 配置后端

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
```

编辑 `backend/.env`，填入你的 DeepSeek API Key：

```text
DEEPSEEK_API_KEY=sk-xxxx
```

启动后端（端口 8000）：

```bash
uvicorn app.main:app --reload
```

### 2. 启动前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173 ，前端会把 `/api` 代理到后端。

### 3. 生产模式（前后端合并运行）

```bash
cd frontend
npm run build
cd ../backend
uvicorn app.main:app
```

构建产物位于 `frontend/dist`，后端会自动托管，打开 http://localhost:8000 即可。

## 测试

```bash
# 后端
cd backend
pytest

# 前端
cd frontend
npm test
npm run build   # 类型检查 + 构建
```

## 隐私说明

- 家谱数据仅保存在本机 `backend/data/jiapu.db`，不会上传到任何云端。
- 对话内容会发送至 DeepSeek API 用于生成回复，请勿输入不必要的敏感信息。
- 后续如升级为线上多用户版本，需要注意对家谱数据做加密与访问控制。

## 升级预留

- 数据模型已预留 `owner_id` / `family_id` 字段，后续可平滑加入账号与多家谱隔离。
- API 与 Agent 分层清晰（`api/` 与 `agent/`），可在此基础上增加老谱 OCR、知识库 RAG、多人协作等功能。
