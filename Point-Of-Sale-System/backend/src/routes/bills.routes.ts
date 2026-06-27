import { Router } from 'express';
import * as billsController from '../controllers/bills.controller.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.use(authenticate);

router.get('/', billsController.getBills);
router.post('/', billsController.createBill);
router.get('/:id', billsController.getBillById);
router.put('/:id/cancel', roleGuard(['owner']), billsController.cancelBill);

export default router;
