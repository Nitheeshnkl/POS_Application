# Deployment Guide

This guide describes steps to deploy the POS Application using Render (backend + PostgreSQL) and Vercel (frontend).

1. Create Render PostgreSQL
   - Provision a new PostgreSQL database on Render.
   - Copy the `DATABASE_URL` value (postgres://...)

2. Deploy backend to Render
   - Create a new Web Service on Render.
   - Connect to the repository and set the build command: `npm install && npm run build`.
   - Set the start command: `npm run start`.
   - Set environment variables (use Render's env UI): `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES`, `FRONTEND_URL`, `CORS_ORIGIN`, `NODE_ENV=production`, `PORT=3001`.
   - Add a health check route to `/health` (already present).
   - After deployment, verify `/health` returns `{"status":"ok","db":"connected","env":"production"}`.

3. Deploy PostgreSQL on Render
   - Optionally attach the DB to the service using Render's Databases link.
   - Ensure `DATABASE_URL` corresponds to the created DB.

4. Deploy frontend to Vercel
   - Create a new Vercel project, point to the `pos-frontend` directory.
   - Ensure framework is detected as Vite.
   - Build command: `npm run build`.
   - Output directory: `dist`.
   - Set environment variable `VITE_API_URL` to your Render backend URL (e.g. `https://your-backend.onrender.com/api/v1`).
   - Add custom domain and verify SSL via Vercel UI.

5. DNS and SSL
   - Configure DNS for custom domain on Vercel.
   - Enforce HTTPS via Vercel settings.

6. Rollback
   - Render: use the service's previous deploys list to rollback.
   - Vercel: use the deployments history to restore a previous deployment.

7. Monitoring and backups
   - Enable Render health checks and alerts.
   - Schedule periodic DB backups (Render provides automated backups on paid plans). Export backups offsite if needed.

8. Additional notes
   - Do not commit `.env` files with secrets. Use `.env.example` as a template.
   - Use `npm run migrate` on startup or via Render's post-deploy hook to run pending migrations.
