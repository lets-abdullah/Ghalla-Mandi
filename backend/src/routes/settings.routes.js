import express from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
