# AI Jiapu (AI Family Tree)

[简体中文](README.md) · [English](README.en.md)

> Build your family tree through conversation. The AI records family members, stories, and biographies — and lets your family collaborate to preserve memories worth passing down.

![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![antd](https://img.shields.io/badge/antd-6-1677ff)
![DeepSeek](https://img.shields.io/badge/DeepSeek-tool%20calling-4d6bfe)
![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy%202.0-003b57)

## Features

**Conversational AI tree building**
- Describe your family in plain language; the AI parses names, kinship terms, and relationships (spouses, parent–child) into a living family tree
- Infers sibling relationships, asks follow-up questions when information is missing, and never fabricates facts
- Organizes biographies and records family stories, automatically attributed to the right member

**Collaboration & permissions**
- Register and log in; one account can hold many family trees, fully isolated by `family_id`
- Share a 6-character invite code; roles are owner / editor / viewer
- The family tree is shared, while each member's conversation history stays private

**Interactive family tree**
- Automatic layout: spouses side by side, generations layered (dagre)
- Click any node to edit details — name, gender, birth/death dates (date picker supports typing and quick year jump)
- Biographies and multiple stories per member, kept with the person

**Experience**
- Simplified-Chinese UI with a warm, paper-like theme (themed via antd)
- Markdown chat, multi-line dictation input, and a collapsible chat panel with a floating button (state is remembered)

## Screenshots

> Coming soon: family tree canvas, member detail (biography/stories), member management, sign-in page.

## Architecture

```
Browser (React 19 + antd + React Flow)
        │  HTTP / JSON
FastAPI  ─ app/api      HTTP boundary: auth, role checks, serialization
        │  app/agent    DeepSeek tool-calling loop + family business rules (dedupe/cycle/date)
        │  app/models   SQLAlchemy 2.0 models (single SQLite file)
        │
SQLite (local data, FK cascade, automatic migrations on startup)
```

- One-way dependencies: `api → agent → models`; lower layers never know about HTTP
- Every family-data query is forced to filter by `family_id`; role matrix owner > editor > viewer
- The frontend routes all requests through `src/api.ts`; components never call `fetch` directly

## Quick Start

### 1. Start the backend (port 8000; serves the built frontend)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
```

Add your DeepSeek API key to `backend/.env`:

```text
DEEPSEEK_API_KEY=sk-xxxx
```

```bash
uvicorn app.main:app --reload
```

> When upgrading from the single-user version, legacy data is migrated to the default account `admin / admin123` (change the password in Settings after signing in).

### 2. Frontend dev mode (optional, port 5173)

```bash
cd frontend
npm install
npm run dev
```

### 3. Production build

```bash
cd frontend
npm run build
# The output in frontend/dist is served automatically by the backend
```

Open http://localhost:8000.

## Testing

```bash
# Backend: 45 tests (auth, family isolation, invites, roles, agent scoping, migrations)
cd backend && .venv\Scripts\python.exe -m pytest

# Frontend: 9 tests (Vitest + Testing Library)
cd frontend && npm test

# Type-check + build
cd frontend && npm run build
```

## Project Structure

```text
backend/    FastAPI backend (api / agent / models / migrations / security) + pytest
frontend/   React 19 + TypeScript + antd frontend (components / api / types) + Vitest
```

## Roadmap

- [ ] OCR digitization of paper family trees (upload → transcribe → import)
- [ ] Export: images / PDF family albums, GEDCOM interoperability
- [ ] Public share links (read-only preview without login)
- [ ] Knowledge base RAG (surname origins, generation characters, kinship glossary)
- [ ] Deployment: Docker + HTTPS

## Contributing

Issues and pull requests are welcome. See [AGENTS.md](AGENTS.md) for guidelines:

- Atomic commits: one commit = one logical change; messages use Chinese with conventional prefixes (`feat:` / `fix:` / `docs:`)
- Layered architecture: one-way `api → agent → models`; family queries must filter by `family_id`
- Check sensitive files (`backend/.env`, database, `node_modules`) and secrets before committing

## License

MIT — see [LICENSE](LICENSE).

## Notes

- Family data lives in the local `backend/data/jiapu.db`, isolated by account and family; deployed publicly it becomes a self-hosted multi-user service
- Chat content is sent to the DeepSeek API to generate replies; avoid entering unnecessary sensitive information
- Passwords are salted PBKDF2 hashes; session tokens are stored hashed
