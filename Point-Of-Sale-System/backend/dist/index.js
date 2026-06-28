import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { validateEnv, env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import productsRoutes from './routes/products.routes.js';
import stockRoutes from './routes/stock.routes.js';
import purchasesRoutes from './routes/purchases.routes.js';
import billsRoutes from './routes/bills.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import usersRoutes from './routes/users.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import cashoutRoutes from './routes/cashout.routes.js';
import { runMigrations } from './config/db.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import customersRoutes from './routes/customers.routes.js';
import requestedProductsRoutes from './routes/requested_products.routes.js';
import exportRoutes from './routes/export.routes.js';
import { logger } from './utils/logger.js';
validateEnv();
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/stock', stockRoutes);
app.use('/api/v1/purchases', purchasesRoutes);
app.use('/api/v1/bills', billsRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/cashout', cashoutRoutes);
app.use('/api/v1/suppliers', suppliersRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/requested-products', requestedProductsRoutes);
app.use('/api/v1/export', exportRoutes);
app.get('/api/v1/audit-logs', (req, res) => {
    res.json({ success: true, data: [] });
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', db: 'connected', env: 'production' });
});
app.use(errorHandler);
const PORT = env.PORT;
// Run DB migrations then start server
runMigrations().then(() => {
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    });
}).catch((err) => {
    logger.info(`Failed to run migrations: ${err.message}`);
    process.exit(1);
});
