import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import pool, { runMigrations } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import billsRoutes from './routes/bills.routes.js';
import cashoutRoutes from './routes/cashout.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import customersRoutes from './routes/customers.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import exportRoutes from './routes/export.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import productsRoutes from './routes/products.routes.js';
import purchasesRoutes from './routes/purchases.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import requestedProductsRoutes from './routes/requested_products.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import stockRoutes from './routes/stock.routes.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import usersRoutes from './routes/users.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Global rate limiter — 300 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

// Stricter limiter for auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

app.use(globalLimiter);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/bills', billsRoutes);
app.use('/api/v1/cashout', cashoutRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/purchases', purchasesRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/requested-products', requestedProductsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/stock', stockRoutes);
app.use('/api/v1/suppliers', suppliersRoutes);
app.use('/api/v1/users', usersRoutes);

app.use(errorHandler);

async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established.');
    await runMigrations();
    logger.info('Database migrations applied.');
  } catch (error: any) {
    logger.error(`Startup database error: ${error.message}`);
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Backend server listening on port ${env.PORT}`);
  });
}

start();
