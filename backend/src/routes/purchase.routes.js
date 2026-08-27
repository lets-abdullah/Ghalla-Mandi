import express from 'express';
import { createPurchase, getPurchases, updatePurchase } from '../controllers/purchase.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

router.post('/', createPurchase);
router.get('/', getPurchases);
router.put('/:id', updatePurchase);

export default router;
