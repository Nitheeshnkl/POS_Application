# Production Readiness Audit

Date: 2026-06-28

Summary: initial automated audit of the POS Application repository. Findings below are grouped by severity. Items marked "Critical" should be addressed before public deployment.

## Critical
- Hardcoded localhost references in multiple files and committed `.env` files: `pos-frontend/.env`, various test scripts, and documentation. (See grep results: many `http://localhost:5000` and `http://localhost:5173` instances.)
- Committed environment files containing `VITE_API_URL` values — must not contain secrets or production credentials.

## High
- Console logging and test scripts with hardcoded API URLs exist in repository root and scripts directories (e.g., `test-*.js`, `scratch-e2e`). Remove or mark as dev-only.
- CORS defaulting to `http://localhost:5000` in backend config — must be configured via env `CORS_ORIGIN`.
- No enforced production-only requirement for `DATABASE_URL` previously; updated to require it in production.

## Medium
- Vite config contained hardcoded proxy to `http://localhost:3001` and a dev port; updated to read from env.
- LanguageContext had a direct fallback to localhost; replaced to use `VITE_API_URL` or relative path.
- Logger printed info-level logs in production — adjusted to suppress info in production.

## Low
- Several helper scripts and attached assets reference local hosts; keep for developer docs but flag in repo.
- `vercel.json` rewrite exists; verify SPA rewrites after deployment.

Next steps taken in this pass:
- Replaced a number of hardcoded fallbacks and added `.env.example` and `.env.production` files for frontend and backend.
- Added rate limiting, a basic request timeout, and tightened error handler behavior.

Files changed: see commit for `pos-frontend/vite.config.ts`, `pos-frontend/src/i18n/LanguageContext.tsx`, `backend/src/config/env.ts`, `backend/src/index.ts`, `backend/src/middleware/errorHandler.ts`, `backend/src/utils/logger.ts`.
