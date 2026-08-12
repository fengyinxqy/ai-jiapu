# Repository Guidelines

## Project Structure & Module Organization

- `backend/` — FastAPI application. Routers live in `app/api/` (`auth.py`, `families.py`), the DeepSeek tool-calling loop in `app/agent/`, with data models in `app/models.py`, startup migrations in `app/migrations.py`, and password/token helpers in `app/security.py`.
- `backend/tests/` — pytest suite (auth, family isolation, invites, roles, agent scoping, migrations).
- `frontend/` — Vite + React + TypeScript app. Components live in `src/components/` and are built on the antd component library; tests live in `src/__tests__/`.
- `backend/data/jiapu.db` — local SQLite database (gitignored).

## Architecture & Layering

- Backend keeps one-way dependencies: `app/api/` → `app/agent/` → `app/models.py`; `security.py` / `migrations.py` are cross-cutting helpers.
- `app/api/` is the HTTP boundary only: auth, role checks, validation, serialization. It must not contain business logic or raw queries.
- `app/agent/tools.py` owns family business/data rules (name dedupe, cycle detection, date validation) and every query must filter by `family_id`.
- `app/models.py` / `database.py` only define ORM models and session management; lower layers must not know about HTTP or the Agent loop.
- Frontend follows the same idea: components never call `fetch` directly — all requests go through `src/api.ts`; shared types live in `src/types.ts`; theme tokens are centralized in `src/main.tsx` (antd ConfigProvider) and `src/styles.css`.
- Cross-layer access happens only through defined interfaces; no reverse dependencies or bypassing layers.

## Build, Test, and Development Commands

- Backend server: `.venv\Scripts\python.exe -m uvicorn app.main:app --reload` (port 8000; serves the built frontend).
- Backend tests: `.venv\Scripts\python.exe -m pytest` — runs the full backend suite.
- Frontend dev: `npm run dev` — Vite on port 5173 with `/api` proxied to the backend.
- Frontend tests: `npm test` (Vitest).
- Production build: `npm run build` — type-checks (`tsc --noEmit`) and bundles to `frontend/dist`.

## Coding Style & Naming Conventions

- Python: PEP 8, type hints, SQLAlchemy 2.0 `Mapped[...]` style; route modules are named after their domain (`auth`, `families`).
- TypeScript/React: strict mode; components use PascalCase, services/hooks camelCase; UI controls use antd components themed by the ConfigProvider in `src/main.tsx` (warm paper palette); Tailwind utilities are used for layout only.
- UI copy is Simplified Chinese; all source files are UTF-8.

## Testing Guidelines

- Backend: pytest with FastAPI `TestClient`; shared fixtures (`db_session`, `client`) in `backend/tests/conftest.py`; test files and functions are named `test_*`.
- Frontend: Vitest + Testing Library; tests live in `src/__tests__/*.test.ts(x)`.
- Run both suites and `npm run build` before pushing.

## Commit & Pull Request Guidelines

- Commits must be atomic: one commit = one logical change (a feature, fix, refactor, or docs update). Do not mix unrelated edits; stage only the intended files with explicit `git add <path>`.
- Before committing, review `git status` and `git diff --cached`; if a change unavoidably spans layers, keep it minimal and explain why in the commit body.
- Commit messages are Chinese with conventional prefixes (`feat:`, `fix:`, `docs:`) — see `git log`.
- Before committing, confirm sensitive files stay untracked (`backend/.env`, `backend/data/`, `node_modules`, `dist`) and grep for secrets (`sk-`, `ghp_`); GitHub push protection rejects leaked secrets.
- Solo work pushes to `main`; larger changes open a PR describing what changed, why, and how it was validated.

## Security & Configuration

- The DeepSeek API key lives only in `backend/.env` (gitignored); `.env.example` must remain a placeholder.
- Passwords are PBKDF2-hashed (`app/security.py`); session tokens are stored hashed.
- Every family-data query must filter by `family_id`; enforce roles as owner > editor > viewer (see `app/api/families.py`).
