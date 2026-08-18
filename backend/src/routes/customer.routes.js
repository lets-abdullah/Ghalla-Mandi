import express from 'express';
import { getCustomers, createCustomer, getCustomerLedger, updateCustomer, deleteCustomer } from '../controllers/customer.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/:id/ledger', getCustomerLedger);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
