import { Router } from 'express';
import * as customersController from '../controllers/customers.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', customersController.getCustomers);
router.post('/', customersController.createCustomer);
router.get('/:id', customersController.getCustomerById);
router.put('/:id', customersController.updateCustomer);

export default router;
