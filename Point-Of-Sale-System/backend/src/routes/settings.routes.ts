import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.use(authenticate);
router.use(roleGuard(['owner']));

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

export default router;
