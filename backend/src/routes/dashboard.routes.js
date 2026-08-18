import express from 'express';
import { getDashboardMetrics } from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

router.get('/metrics', getDashboardMetrics);

export default router;
