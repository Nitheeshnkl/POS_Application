import { Router } from 'express';
import {
  getRequestedProducts,
  createRequestedProduct,
  updateRequestedProductStatus,
} from '../controllers/requested_products.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getRequestedProducts);
router.post('/', createRequestedProduct);
router.put('/:id/status', updateRequestedProductStatus);

export default router;
