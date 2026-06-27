import { Router } from 'express';
import * as purchasesController from '../controllers/purchases.controller.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.use(authenticate);

router.get('/', purchasesController.getAllPurchases);
router.post('/', roleGuard(['owner']), purchasesController.createPurchase);
router.get('/summary', purchasesController.getPurchasesSummary);
router.get('/:id', purchasesController.getPurchaseById);

export default router;
