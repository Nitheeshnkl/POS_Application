# Sri Murugan Store POS

Full-stack Point-of-Sale and store management system for Sri Murugan Store.

## Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (port 5000)
- **Backend**: Node.js + Express + TypeScript (port 3001)
- **Database**: PostgreSQL (auto-migrated on backend startup)
- **Auth**: JWT access tokens (15 min) + httpOnly refresh cookies (7 days)
- **i18n**: English + Tamil via `LanguageContext`

## Project layout
```
Point-Of-Sale-System/
  backend/       Express API + migrations + seed script
  pos-frontend/  Vite React app
```

## Running locally

### Prerequisites
Both `backend/` and `pos-frontend/` need their `npm install` run first.

### Backend
```bash
cd Point-Of-Sale-System/backend
npm install
npm run build
# Set env vars (see below), then:
node dist/index.js
```

### Frontend
```bash
cd Point-Of-Sale-System/pos-frontend
npm install
npm run dev   # starts on port 5000, proxies /api/v1 → localhost:3001
```

## Environment variables (backend)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes (or PG* vars) | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Random secret ≥32 chars |
| `JWT_REFRESH_SECRET` | Yes | Random secret ≥32 chars |
| `CORS_ORIGIN` | No | Defaults to `http://localhost:5173`; set to your frontend URL in prod |
| `PORT` | No | Defaults to `3001` |
| `NODE_ENV` | No | Set to `production` for prod cookie & CORS behavior |

## Database setup
Migrations run automatically at startup via `runMigrations()` in `src/config/db.ts`.

After first startup, seed default users:
```bash
cd Point-Of-Sale-System/backend
npm run seed
# Creates: admin/Admin@123 (owner) and cashier1/Cashier@123 (cashier)
```

## Deployment (Render + Vercel)
See the deployment guide in the user's original request. Key points:
- Backend → Render Web Service, Root: `Point-Of-Sale-System/backend`
- Frontend → Vercel, Root: `Point-Of-Sale-System/pos-frontend`
- Set `VITE_API_BASE_URL` on Vercel to the Render backend URL
- Set `CORS_ORIGIN` on Render to the exact Vercel domain (https, no trailing slash)
- Cookies require `SameSite=None; Secure` (auto-applied in production mode)

## User preferences
- Do not install dependencies unless absolutely required
- Refine existing source code directly — no architecture rewrites
- Only run builds if needed to verify a specific fix
