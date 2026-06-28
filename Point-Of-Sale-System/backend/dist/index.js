import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import suppliersRoutes from './routes/suppliers.routes.js';
import requestedProductsRoutes from './routes/requested_products.routes.js';
import { logger } from './utils/logger.js';
validateEnv();
const app = express();
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
app.use('/api/v1/cashouts', cashoutRoutes);
app.use('/api/v1/suppliers', suppliersRoutes);
app.use('/api/v1/requested-products', requestedProductsRoutes);
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.use(errorHandler);
const PORT = env.PORT;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});
