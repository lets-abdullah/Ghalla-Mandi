import express from 'express';
import {
  getSaleReturns,
  createSaleReturn,
  updateSaleReturn,
  deleteSaleReturn,
  getPurchaseReturns,
  createPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn
} from '../controllers/return.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

// Sale Returns
router.get('/sales', getSaleReturns);
router.post('/sales', createSaleReturn);
router.put('/sales/:id', updateSaleReturn);
router.delete('/sales/:id', deleteSaleReturn);

// Purchase Returns
router.get('/purchases', getPurchaseReturns);
router.post('/purchases', createPurchaseReturn);
router.put('/purchases/:id', updatePurchaseReturn);
router.delete('/purchases/:id', deletePurchaseReturn);

export default router;
