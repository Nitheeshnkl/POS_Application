import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
router.get('/', notificationsController.getNotifications);
router.put('/:id/read', notificationsController.markRead);
router.put('/read-all', notificationsController.markAllRead);
export default router;
