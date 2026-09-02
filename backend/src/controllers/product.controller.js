import { Product } from '../models/product.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { isValidOperationalUnit } from '../services/unitConversion.service.js';

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
    const { name, category, code, baseUnit, unit, stockQty, minStockThreshold, purchasePrice, sellingPrice, image } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Product name and category are required' });
    }

    const assignedUnit = baseUnit || unit || 'KG';
    if (!isValidOperationalUnit(assignedUnit)) {
      return res.status(400).json({
        success: false,
        message: `Unit "${assignedUnit}" is invalid. Only genuine base units (KG, Gram, Litre, ML, Meter, Piece, Unit) are permitted. Grouped/packaging units (Mann, Bori, Bag, Pack, Ton, Carton, Dozen) are strictly prohibited.`
      });
    }

    const initialStockQty = Number(stockQty) || 0;
    const initialPurchaseCost = Number(purchasePrice) || 0;

    const product = await Product.create({
      shop_id: req.shop_id,
      name,
      category,
      code: code || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      unit: assignedUnit,
      stockQty: initialStockQty,
      initialStock: initialStockQty,
      initialCost: initialPurchaseCost,
      minStock: Number(minStockThreshold) || 10,
      purchasePrice: initialPurchaseCost,
      sellingPrice: Number(sellingPrice) || 0,
      image: image || ''
    });

    await AuditLog.create({
      shop_id: req.shop_id,
      product: name,
      type: 'IN (Product Created)',
      qty: `${initialStockQty} ${assignedUnit}`,
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

    if (updateData.unit && !isValidOperationalUnit(updateData.unit)) {
      return res.status(400).json({
        success: false,
        message: `Unit "${updateData.unit}" is invalid. Only genuine base units (KG, Gram, Litre, ML, Meter, Piece, Unit) are permitted.`
      });
    }

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
