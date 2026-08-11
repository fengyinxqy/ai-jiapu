# AI 家谱（AI Jiapu）

一个细分赛道的 Agent 应用：用自然语言口述家人信息，AI 自动解析人名、称谓与关系，实时生成交互式家谱图。当前版本已支持多账号与多家庭协作：注册登录、创建多个家谱、邀请码加入、角色权限控制（创建者 / 编辑者 / 只读）。

## 功能

- 账号系统：注册 / 登录 / 登出 / 修改密码，家谱数据按账号隔离。
- 多家庭协作：每人可创建多个家谱，通过 6 位邀请码邀请家人加入。
- 角色权限：创建者（全权，含成员管理）、编辑者（可对话建谱与编辑）、只读（仅查看）。
- 对话式建谱：和 AI 聊天即可添加成员与关系（配偶、亲子），AI 自动推断称谓并追问缺失信息，不编造。
- 聊天消息支持 Markdown 渲染（加粗、列表、引用、代码等格式清晰展示）。
- 交互式家谱图：夫妻同排、世代分层，点击节点可编辑或删除成员。
- 日期选择器：支持键盘输入（YYYY-MM-DD）与日历快捷选年，全中文界面。
- 中文界面，暖色中式纸感风格。

## 技术栈

- 后端：FastAPI + SQLAlchemy + SQLite + DeepSeek（`deepseek-chat`，函数调用）
- 前端：React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui 组件库 + antd（日期选择器）+ React Flow（dagre 自动布局）

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

> 从旧版单机版升级时，启动会自动把原有家谱数据迁移到默认账号 `admin / admin123`（登录后可在「设置」中修改密码）。

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
# 后端（认证、家谱隔离、邀请协作、角色权限、迁移）
cd backend
pytest

# 前端
cd frontend
npm test
npm run build   # 类型检查 + 构建
```

## 隐私说明

- 家谱数据保存在本机 `backend/data/jiapu.db`，按账号与家谱隔离；若部署到公网服务器，即为自托管的「云端」多用户服务。
- 对话内容会发送至 DeepSeek API 用于生成回复，请勿输入不必要的敏感信息。
- 密码使用 PBKDF2 加盐哈希存储，会话 token 仅存哈希值。

## 升级预留

- 老谱数字化（拍照/扫描上传，AI OCR 识别人名与关系入谱）。
- 知识库 RAG（姓氏源流、辈分字派等公开资料）。
- 所有权转让、邮箱验证/找回密码、限流与审计日志。
