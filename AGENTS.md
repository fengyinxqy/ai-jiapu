# Repository Guidelines

## Project Structure & Module Organization

- `backend/` — FastAPI application. Routers live in `app/api/` (`auth.py`, `families.py`), the DeepSeek tool-calling loop in `app/agent/`, with data models in `app/models.py`, startup migrations in `app/migrations.py`, and password/token helpers in `app/security.py`.
- `backend/tests/` — pytest suite (auth, family isolation, invites, roles, agent scoping, migrations).
- `frontend/` — Vite + React + TypeScript app. Components live in `src/components/` (shadcn/ui primitives in `src/components/ui/`), shared utilities in `src/lib/`, and tests in `src/__tests__/`.
- `backend/data/jiapu.db` — local SQLite database (gitignored).

## Build, Test, and Development Commands

- Backend server: `.venv\Scripts\python.exe -m uvicorn app.main:app --reload` (port 8000; serves the built frontend).
- Backend tests: `.venv\Scripts\python.exe -m pytest` — runs the full backend suite.
- Frontend dev: `npm run dev` — Vite on port 5173 with `/api` proxied to the backend.
- Frontend tests: `npm test` (Vitest).
- Production build: `npm run build` — type-checks (`tsc --noEmit`) and bundles to `frontend/dist`.

## Coding Style & Naming Conventions

- Python: PEP 8, type hints, SQLAlchemy 2.0 `Mapped[...]` style; route modules are named after their domain (`auth`, `families`).
- TypeScript/React: strict mode; components use PascalCase, services/hooks camelCase; use `cn()` for conditional classes and semantic tokens (`bg-primary`, `text-muted-foreground`) instead of raw colors.
- UI copy is Simplified Chinese; all source files are UTF-8.

## Testing Guidelines

- Backend: pytest with FastAPI `TestClient`; shared fixtures (`db_session`, `client`) in `backend/tests/conftest.py`; test files and functions are named `test_*`.
- Frontend: Vitest + Testing Library; tests live in `src/__tests__/*.test.ts(x)`.
- Run both suites and `npm run build` before pushing.

## Commit & Pull Request Guidelines

- Commit messages are Chinese with conventional prefixes (`feat:`, `fix:`, `docs:`) — see `git log`.
- Before committing, confirm sensitive files stay untracked (`backend/.env`, `backend/data/`, `node_modules`, `dist`) and grep for secrets (`sk-`, `ghp_`); GitHub push protection rejects leaked secrets.
- Solo work pushes to `main`; larger changes open a PR describing what changed, why, and how it was validated.

## Security & Configuration

- The DeepSeek API key lives only in `backend/.env` (gitignored); `.env.example` must remain a placeholder.
- Passwords are PBKDF2-hashed (`app/security.py`); session tokens are stored hashed.
- Every family-data query must filter by `family_id`; enforce roles as owner > editor > viewer (see `app/api/families.py`).
