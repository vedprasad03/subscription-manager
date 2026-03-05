# Claude Code Instructions — Subscription Manager

## Git workflow
- Always use the `git-workflow` skill for any git or GitHub operation
- Never commit or push without explicit user approval
- Never include a `Co-Authored-By` line in any commit message
- Follow Conventional Commits format: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`
- Branch for major changes; commit on current branch for minor/patch changes

## Key project facts
- `.env` lives in the **project root** (`subscription-manager/.env`), not in `backend/`
- `config.py` uses an absolute path to find it — do not change this
- Backend is run from `backend/` directory: `uvicorn app.main:app --reload`
- Uvicorn `--reload` only watches `.py` files — `.env` changes require a manual restart
- `bcrypt` is pinned to `4.0.1` in `requirements.txt` — do not upgrade (passlib 1.7.4 incompatibility)
- Tailwind CSS v4 is used — no `tailwind.config.js`, configured via `@tailwindcss/vite` plugin only

## Coding conventions
- Backend: Python 3.13, FastAPI, SQLAlchemy ORM, Pydantic v2
- Frontend: TypeScript strict mode with `verbatimModuleSyntax` — use `import type` for type-only imports
- All database queries must be scoped by `user_id` — never return another user's data
- New Alembic migrations: `alembic revision --autogenerate -m "description"` then `alembic upgrade head`

## What not to do
- Do not add features, refactors, or "improvements" beyond what is explicitly requested
- Do not add docstrings or comments to code that wasn't changed
- Do not create new files unless absolutely necessary
- Do not commit `.env` or any file containing secrets
