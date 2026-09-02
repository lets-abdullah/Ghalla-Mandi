import express from 'express';
import { getLedgerEntries, recordPayment, deleteLedgerEntry } from '../controllers/ledger.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

router.get('/', getLedgerEntries);
router.post('/payment', recordPayment);
router.delete('/:id', deleteLedgerEntry);

export default router;
