import express from 'express';
import { login, register, getMe, updateProfile } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateToken, requireTenant, getMe);
router.put('/profile', authenticateToken, requireTenant, updateProfile);

export default router;

