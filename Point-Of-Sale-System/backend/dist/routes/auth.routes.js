import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
const router = Router();
router.get('/setup-required', authController.setupRequired);
router.post('/setup', authController.setup);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
export default router;
