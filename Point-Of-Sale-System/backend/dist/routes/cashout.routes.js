import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { getCurrentDrawer, saveCashout, editCashout, getCashoutHistory, 
// Legacy aliases — both map to saveCashout
openDrawer, closeDrawer, } from '../controllers/cashout.controller.js';
const router = Router();
const ownerOnly = [authenticate, roleGuard(['owner'])];
const cashierOrOwner = [authenticate, roleGuard(['owner', 'cashier'])];
// ── Active routes ──────────────────────────────────────────────────────────
router.get('/current', cashierOrOwner, getCurrentDrawer);
router.post('/save', ownerOnly, saveCashout); // new simple daily save
router.put('/:id', ownerOnly, editCashout);
router.get('/history', ownerOnly, getCashoutHistory);
// ── Legacy routes (kept for backward compat, both map to saveCashout) ─────
router.post('/open', ownerOnly, openDrawer);
router.post('/close', ownerOnly, closeDrawer);
export default router;
