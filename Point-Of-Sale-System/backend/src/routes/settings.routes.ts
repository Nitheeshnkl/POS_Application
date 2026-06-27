import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/', roleGuard(['owner']), settingsController.updateSettings);

export default router;
