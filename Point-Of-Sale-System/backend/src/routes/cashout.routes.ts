import { Router } from 'express';
import * as cashoutController from '../controllers/cashout.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/today-summary', cashoutController.getTodaySummary);
router.get('/', cashoutController.getCashouts);
router.post('/', cashoutController.createCashout);
router.get('/:id', cashoutController.getCashoutById);

export default router;
