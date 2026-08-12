# 🌳 AI 家谱（AI Jiapu）

> 用对话就能建家谱。AI 帮你记录家族成员、故事与生平，邀请家人一起协作，把散落的记忆整理成一张可以传承的家谱。

![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![antd](https://img.shields.io/badge/antd-6-1677ff)
![DeepSeek](https://img.shields.io/badge/DeepSeek-函数调用-4d6bfe)
![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy%202.0-003b57)

## ✨ 功能亮点

**🤖 AI 对话建谱**
- 用自然语言口述家人，AI 自动解析姓名、称谓与关系（配偶、亲子），生成家谱
- 智能推断兄弟姊妹等亲属关系；信息不足时主动追问，绝不编造
- 支持整理成员生平、记录家族故事，AI 自动归到对应成员名下

**👨‍👩‍👧‍👦 协作与权限**
- 注册登录、一人可建多个家谱，数据按家谱隔离
- 6 位邀请码邀请家人加入，创建者 / 编辑者 / 只读三级角色
- 家谱树共享、对话记录按成员私密，适合家庭协作

**🗺️ 交互式家谱图**
- 夫妻同排、世代分层，自动布局（dagre）
- 点击节点编辑成员：姓名、性别、出生/去世日期（日期选择器支持手输与快捷选年）
- 成员生平、多条家族故事，随人留存

**🎨 体验细节**
- 中文界面，暖色纸感主题（antd 统一配置）
- 聊天支持 Markdown、多行口述输入、面板可收起为右下角悬浮按钮（状态记忆）

## 🖼️ 界面预览

> 截图待补充：家谱图、成员详情（生平/故事）、成员管理、登录页。

## 🏗️ 架构一览

```
浏览器（React 19 + antd + React Flow）
        │  HTTP / JSON
FastAPI  ─ app/api      HTTP 边界：鉴权、角色校验、序列化
        │  app/agent    DeepSeek 函数调用 + 家谱业务规则（去重/防环/日期校验）
        │  app/models   SQLAlchemy 2.0 数据模型（SQLite 单文件）
        │
SQLite（本地数据，外键级联，启动自动迁移）
```

- 单向依赖：`api → agent → models`，下层不感知上层
- 所有家谱查询强制按 `family_id` 过滤，权限矩阵 owner > editor > viewer
- 前端所有请求统一走 `src/api.ts`，组件不直接发 fetch

## 🚀 快速开始

### 1. 启动后端（端口 8000，自动托管前端构建产物）

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
```

编辑 `backend/.env`，填入 DeepSeek API Key：

```text
DEEPSEEK_API_KEY=sk-xxxx
```

```bash
uvicorn app.main:app --reload
```

> 从旧版单机版升级时，启动会自动把原有家谱数据迁移到默认账号 `admin / admin123`（登录后可在「设置」中修改密码）。

### 2. 前端开发模式（可选，端口 5173）

```bash
cd frontend
npm install
npm run dev
```

### 3. 生产构建

```bash
cd frontend
npm run build
# 构建产物位于 frontend/dist，后端会自动托管
```

打开 http://localhost:8000 即可使用。

## 🧪 测试

```bash
# 后端：45 个测试（认证、家谱隔离、邀请协作、角色权限、Agent 作用域、迁移）
cd backend && .venv\Scripts\python.exe -m pytest

# 前端：9 个测试（Vitest + Testing Library）
cd frontend && npm test

# 类型检查 + 构建
cd frontend && npm run build
```

## 📁 项目结构

```text
backend/    FastAPI 后端（api / agent / models / migrations / security）+ pytest
frontend/   React 19 + TypeScript + antd 前端（components / api / types）+ Vitest
```

## 🗺️ 路线图

- [ ] 老谱 OCR 数字化：拍照上传族谱，AI 转录并自动入谱
- [ ] 家谱导出：图片 / PDF 家谱册，GEDCOM 标准互通
- [ ] 公开分享链接：免登录只读预览
- [ ] 知识库 RAG：姓氏源流、辈分字派、称谓百科
- [ ] 部署上线：Docker + HTTPS

## 🤝 贡献

欢迎提交 Issue 与 PR。协作规范见 [AGENTS.md](AGENTS.md)：

- 原子化提交：一次提交只做一件事，信息用中文 + 前缀（`feat:` / `fix:` / `docs:` 等）
- 分层架构：`api → agent → models` 单向依赖，家谱查询必须带 `family_id`
- 提交前检查敏感文件（`backend/.env`、数据库、`node_modules`）与密钥

## 📄 说明

- 家谱数据保存在本机 `backend/data/jiapu.db`，按账号与家谱隔离；部署到公网即为自托管的多用户服务
- 对话内容会发送至 DeepSeek API 用于生成回复，请勿输入不必要的敏感信息
- 密码使用 PBKDF2 加盐哈希，会话 token 仅存哈希
