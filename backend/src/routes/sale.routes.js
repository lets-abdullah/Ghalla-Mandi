import express from 'express';
import { createSale, getSales, getSaleById } from '../controllers/sale.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();

router.use(authenticateToken, requireTenant);

router.post('/', createSale);
router.get('/', getSales);
router.get('/:id', getSaleById);

export default router;
