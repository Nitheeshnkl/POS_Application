# Deployment Guide

This guide helps a complete beginner deploy the POS application to Render (backend + PostgreSQL) and Vercel (frontend).

## 1. Prerequisites

Before you begin, make sure you have:
- A GitHub account
- A Render account
- A Vercel account
- A local copy of the repository
- Node.js 18+ and npm installed
- PostgreSQL access for local testing

## 2. Repository setup

1. Clone the repository.
2. Open the backend folder and install dependencies:
   - `cd Point-Of-Sale-System/backend`
   - `npm install`
3. Open the frontend folder and install dependencies:
   - `cd ../pos-frontend`
   - `npm install`
4. Copy the example environment files and change the values:
   - `cp .env.example .env`
   - `cp ../pos-frontend/.env.example .env`

## 3. Creating Render PostgreSQL

1. Sign in to Render.
2. Create a new PostgreSQL database.
3. Wait for Render to provide the database connection string.
4. Copy the value and keep it secure. This is your `DATABASE_URL`.
5. Use the external connection string for local migrations and seeds.

## 4. Deploying Backend to Render

1. In Render, create a new Web Service.
2. Connect the service to your GitHub repository.
3. Set the root directory to `Point-Of-Sale-System/backend`.
4. Set the build command to:
   - `npm install && npm run build`
5. Set the start command to:
   - `npm run start`
6. Add the following environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DATABASE_URL=<your Render PostgreSQL connection string>`
   - `JWT_ACCESS_SECRET=<generate a random secret>`
   - `JWT_REFRESH_SECRET=<generate a random secret>`
   - `JWT_EXPIRES=15m`
   - `FRONTEND_URL=https://your-frontend.vercel.app`
   - `CORS_ORIGIN=https://your-frontend.vercel.app`
7. Deploy the service.
8. Confirm the service starts successfully.

## 5. Environment variables

Required backend variables:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES`
- `FRONTEND_URL`
- `CORS_ORIGIN`

Required frontend variables:
- `VITE_API_URL=https://your-backend.onrender.com/api/v1`
- `VITE_DEV_API=http://127.0.0.1:3001`

## 6. Generating JWT secrets

Use a shell command such as:
- `openssl rand -hex 32`

Use the output for both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

## 7. Running migrations locally using the external DATABASE_URL

From the backend directory:
- `npm install`
- `npm run migrate`

This applies the SQL migrations to your local or remote database.

## 8. Running seed locally

After migrations succeed:
- `npm run seed`

This creates the default users `admin` and `cashier1`.

## 9. Verifying all tables

You can verify the database schema with a PostgreSQL client such as `psql` or a Render database shell.

Look for tables such as:
- `users`
- `products`
- `categories`
- `customers`
- `bills`
- `settings`

## 10. Verifying seed users

After seeding, verify the users exist in the `users` table.

Default credentials:
- `admin / Admin@123`
- `cashier1 / Cashier@123`

## 11. Deploying Frontend to Vercel

1. Create a new Vercel project.
2. Point it to the `Point-Of-Sale-System/pos-frontend` directory.
3. Use the framework preset for Vite.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Add the environment variable:
   - `VITE_API_URL=https://your-backend.onrender.com/api/v1`
7. Deploy the project.

## 12. Connecting Backend and Frontend

After both deployments succeed:
- Open the Vercel frontend URL.
- Confirm the app loads and can reach the backend API.
- Ensure cookies are accepted in the browser.

## 13. Cookie configuration

The backend uses secure cookies for refresh tokens in production.

Required production cookie settings:
- `httpOnly: true`
- `secure: true`
- `sameSite: "none"`
- `path: "/"`
- `domain: undefined`

## 14. CORS configuration

The backend allows the frontend origin using `CORS_ORIGIN` and `FRONTEND_URL`.

Set both variables carefully to your deployed Vercel URL.

## 15. Authentication verification

Verify these flows:
- Login
- Token refresh
- Logout
- Protected route access
- Session persistence

## 16. Health endpoint verification

After deployment, open:
- `https://your-backend.onrender.com/health`

Expected response:
- `{"status":"ok","db":"connected","env":"production"}`

## 17. End-to-end testing checklist

- Frontend loads without errors
- Backend health endpoint is reachable
- Login works
- Refresh works
- Logout works
- Database migrations run
- Seed users exist
- Protected pages load after authentication

## 18. Common Render errors

- Build failed because dependencies are missing: rerun `npm install`
- App crashed on startup: check logs and `DATABASE_URL`
- Health check failed: verify the database connection and `PORT`
- CORS errors: confirm `CORS_ORIGIN` matches the frontend URL

## 19. Common Vercel errors

- Build failed: inspect the Vercel build logs
- API requests fail: verify `VITE_API_URL`
- Login fails: ensure cookies are allowed and `CORS_ORIGIN` is correct

## 20. PostgreSQL troubleshooting

- Verify the connection string format
- Confirm the database is reachable from Render
- Check SSL settings for Render-hosted PostgreSQL
- Re-run migrations if the schema is missing

## 21. Rollback procedure

- Render: redeploy a previous working version
- Vercel: restore a previous deployment from the dashboard

## 22. Backup strategy

- Enable automated Render database backups where available
- Export a database snapshot before major changes
- Keep a local backup of critical data

## 23. Monitoring

- Enable Render health checks and alerts
- Monitor application logs regularly
- Watch for failed migrations or authentication errors

## 24. Free-tier limitations

- Free-tier services may sleep or restart
- Free PostgreSQL plans may have usage limits
- Expect slower cold starts

## 25. Security checklist

- Never commit `.env` files
- Use strong random secrets for JWT values
- Keep `CORS_ORIGIN` limited to the real frontend URL
- Use HTTPS only in production
- Review access control before opening the app publicly

## 26. Updating the application

1. Pull the latest changes
2. Run the backend and frontend builds locally
3. Run migrations if the schema changed
4. Deploy the backend first, then the frontend

## 27. Running future migrations

Use:
- `npm run migrate`

When the schema changes in the repository.

## 28. Disaster recovery

If the service is unavailable:
- Restore the previous deployment
- Re-run migrations
- Re-seed if required
- Verify the health endpoint and login flow

## 29. Frequently Asked Questions (FAQ)

### Why do I need both `FRONTEND_URL` and `CORS_ORIGIN`?
They tell the backend which frontend origins are trusted for browser requests and cookies.

### Why is `VITE_API_URL` needed?
The frontend uses it to know where the backend API lives in production.

### What if login fails after deployment?
Check the browser console, backend logs, CORS settings, and cookie settings.

### Do I need to run seed on production?
Only if the production database is empty or the default users are missing.
