import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, adjustStock } from '../controllers/product.controller.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenantScope.middleware.js';

const router = express.Router();
router.use(authenticateToken, requireTenant);

// Category Routes
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Product Routes
router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/adjust-stock', adjustStock);

export default router;
