---
name: Sri Murugan Auth Setup
description: JWT auth with access token (15min) + refresh token (7d httpOnly cookie). Seed credentials and .env location.
---

# Sri Murugan Auth Details

**Seed Credentials:**
- Owner: username=`admin`, password=`Admin@123`
- Cashier: username=`cashier1`, password=`Cashier@123`

**JWT:**
- Access token: 15 min, stored in Zustand authStore (memory only)
- Refresh token: 7 days, httpOnly cookie
- Secrets in backend/.env

**API Endpoints:**
- GET /api/v1/auth/setup-required → { required: bool }
- POST /api/v1/auth/login → { user, accessToken } + sets refreshToken cookie
- POST /api/v1/auth/refresh → new accessToken
- POST /api/v1/auth/logout → clears cookie
- GET /api/v1/auth/me → current user

**Role Guard:** roleGuard(['owner']) in route middleware for owner-only endpoints.

**Why:** Frontend axios interceptor auto-retries on 401 by calling /api/v1/auth/refresh, then redirects to /login if that also fails.
