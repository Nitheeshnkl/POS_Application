import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.use(authenticate);
router.use(roleGuard(['owner']));

router.get('/dashboard', reportsController.getDashboardMetrics);
router.get('/sales', reportsController.getSalesReport);
router.get('/stock', reportsController.getStockReport);
router.get('/purchases', reportsController.getPurchasesReport);
router.get('/profit-loss', reportsController.getProfitLossReport);
router.get('/gst', reportsController.getGstReport);
router.get('/cashier-performance', reportsController.getCashierPerformance);
router.get('/top-products', reportsController.getTopProducts);
router.get('/daily-sales', reportsController.getDailySales);
router.get('/monthly-sales', reportsController.getMonthlySales);

export default router;
