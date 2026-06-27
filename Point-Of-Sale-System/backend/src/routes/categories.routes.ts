import { Router } from 'express';
import * as categoriesController from '../controllers/categories.controller.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.use(authenticate);

router.get('/', categoriesController.getAllCategories);
router.post('/', roleGuard(['owner']), categoriesController.createCategory);
router.put('/:id', roleGuard(['owner']), categoriesController.updateCategory);
router.delete('/:id', roleGuard(['owner']), categoriesController.deleteCategory);

export default router;
