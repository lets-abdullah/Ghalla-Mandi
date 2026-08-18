import express from 'express';
import { getSuppliers, createSupplier, getSupplierLedger, updateSupplier, deleteSupplier } from '../controllers/supplier.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.get('/:id/ledger', getSupplierLedger);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
