import express from 'express';
import { getStockMovements } from '../controllers/inventory.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

router.get('/movements', getStockMovements);

export default router;
