import { Router } from 'express';
import * as exportController from '../controllers/export.controller.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.use(authenticate);
router.use(roleGuard(['owner']));

router.get('/bills', exportController.exportBills);
router.get('/cashout', exportController.exportCashout);
router.get('/investment', exportController.exportInvestment);
router.get('/purchases', exportController.exportPurchases);
router.get('/expenses', exportController.exportExpenses);
router.get('/profit-loss', exportController.exportProfitLoss);
router.get('/stock', exportController.exportStock);

export default router;
