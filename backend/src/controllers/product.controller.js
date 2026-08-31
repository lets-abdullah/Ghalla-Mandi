import { Product } from '../models/product.model.js';
import { AuditLog } from '../models/auditLog.model.js';

export const getProducts = async (req, res) => {
  try {
    const { search, category } = req.query;
    let products = await Product.find({ shop_id: req.shop_id });

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));
    }

    if (category && category !== 'All') {
      products = products.filter(p => p.category === category);
    }

    return res.json({
      success: true,
      products,
      pagination: { total: products.length, page: 1, pages: 1 }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, category, code, baseUnit, stockQty, minStockThreshold, purchasePrice, sellingPrice, image } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Product name and category are required' });
    }

    const product = await Product.create({
      shop_id: req.shop_id,
      name,
      category,
      code: code || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      unit: baseUnit || 'KG',
      stockQty: Number(stockQty) || 0,
      minStock: Number(minStockThreshold) || 10,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      image: image || ''
    });

    await AuditLog.create({
      shop_id: req.shop_id,
      product: name,
      type: 'IN (Product Created)',
      qty: `${stockQty || 0} Units`,
      ref: req.user ? req.user.fullName : 'Admin',
      date: new Date().toLocaleDateString('en-GB')
    });

    return res.status(201).json({ success: true, product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByIdAndUpdate(id, updateData, { shop_id: req.shop_id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id, req.shop_id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustmentKg, reason } = req.body;

    if (!adjustmentKg || isNaN(adjustmentKg)) {
      return res.status(400).json({ success: false, message: 'Valid adjustment quantity required' });
    }

    const product = await Product.findById(id, req.shop_id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const newStock = Math.max(0, Number(product.stockQty) + Number(adjustmentKg));
    const updated = await Product.findByIdAndUpdate(id, { stockQty: newStock }, { shop_id: req.shop_id });

    await AuditLog.create({
      shop_id: req.shop_id,
      product: product.name,
      type: adjustmentKg >= 0 ? 'IN (Adjusted)' : 'OUT (Adjusted)',
      qty: `${Math.abs(adjustmentKg)} Units`,
      ref: reason || 'Stock Adjustment',
      date: new Date().toLocaleDateString('en-GB')
    });

    return res.json({ success: true, product: updated, newStock });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
