---
name: Sri Murugan Store Architecture
description: Full-stack retail POS. Node.js/Express backend on port 3001, Vite/React/TS/Tailwind frontend on port 5000, PostgreSQL on helium:5432.
---

# Sri Murugan Store Architecture

**Why:** This replaced a Java Spring Boot + CRA React setup with a modern Node.js + Vite stack as per the master spec.

## Services
- **backend/** — Node.js 20 + Express + TypeScript, runs on port 3001
  - Dev: `cd backend && node -r dotenv/config dist/index.js dotenv_config_path=.env`
  - Build: `cd backend && npm run build` (tsc)
  - All routes under /api/v1/
- **pos-frontend/** — Vite + React 18 + TypeScript + Tailwind CSS, runs on port 5000
  - Dev: `cd pos-frontend && npm run dev`
  - Proxies /api/v1 → http://localhost:3001

## Database
- PostgreSQL on helium:5432, database heliumdb, user postgres
- Schema: users, categories, products, stock_movements, purchases, purchase_items, bills, bill_items, expenses, audit_logs, notifications, settings
- UUID primary keys (except seeded users which got integer IDs from non-uuid sequence during initial seed)

## Key Files
- backend/.env — all environment vars including JWT secrets and PG credentials
- backend/src/index.ts — Express app entry, all routes registered
- pos-frontend/vite.config.ts — proxy config, allowedHosts: true for Replit

**How to apply:** Always restart both workflows after code changes. Backend must start before frontend (proxy dependency).
