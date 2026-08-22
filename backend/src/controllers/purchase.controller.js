import { Purchase } from '../models/purchase.model.js';
import { Product } from '../models/product.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Ledger } from '../models/ledger.model.js';
import { AuditLog } from '../models/auditLog.model.js';

// Anti-duplicate rapid submission cache
const recentPurchases = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of recentPurchases.entries()) {
    if (now - v.timestamp > 10000) {
      recentPurchases.delete(k);
    }
  }
}, 60000);

export const createPurchase = async (req, res) => {
  try {
    const { supplierName, supplierId, items, paidAmount = 0, notes = '' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one purchase item is required' });
    }

    // Deduplication key based on shop, supplier, items length and first item
    const dedupKey = `${req.shop_id}:${supplierId || supplierName || ''}:${items.length}:${items[0]?.productId}:${items[0]?.enteredQty || items[0]?.qty}:${paidAmount}`;
    const existing = recentPurchases.get(dedupKey);
    if (existing && Date.now() - existing.timestamp < 3000) {
      return res.status(200).json({ success: true, purchase: existing.purchase, deduplicated: true });
    }

    let totalGrand = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productName}` });
      }

      const qty = Number(item.enteredQty || item.qty) || 1;
      const rate = Number(item.ratePerEnteredUnit || item.rate) || 0;
      const itemTotal = qty * rate;
      totalGrand += itemTotal;

      // Update product stock and purchase price
      const newStock = Number(product.stockQty) + qty;
      await Product.findByIdAndUpdate(product.id, {
        stockQty: newStock,
        purchasePrice: rate > 0 ? rate : product.purchasePrice
      });

      const itemUnit = item.unit || item.unitName || item.enteredUnit || product.unit || product.baseUnit || 'KG';

      // Audit Log
      await AuditLog.create({
        shop_id: req.shop_id,
        product: product.name,
        type: 'IN (Purchase)',
        qty: `${qty} ${itemUnit}`,
        ref: `Purchase Bill`,
        date: new Date().toLocaleDateString('en-GB')
      });

      processedItems.push({
        productId: product.id,
        name: product.name,
        productName: product.name,
        unit: itemUnit,
        unitName: itemUnit,
        enteredUnit: itemUnit,
        qty: qty,
        enteredQty: qty,
        rate: rate,
        ratePerEnteredUnit: rate,
        price: rate,
        total: itemTotal,
        totalAmount: itemTotal
      });
    }

    const paid = Number(paidAmount) || 0;
    const paymentStatus = paid >= totalGrand ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

    const count = await Purchase.countDocuments({ shop_id: req.shop_id });
    const purchaseNo = `PUR-2026-${String(count + 1).padStart(4, '0')}`;
    const dateStr = new Date().toLocaleDateString('en-GB');

    let activeSupplierName = supplierName || 'Supplier';
    let targetSupId = supplierId || null;

    if (targetSupId) {
      const sup = await Supplier.findById(targetSupId);
      if (sup) {
        activeSupplierName = sup.name;
        const unpaid = Math.max(0, totalGrand - paid);
        await Supplier.findByIdAndUpdate(sup.id, { balance: Number(sup.balance) + unpaid });

        if (paid > 0) {
          await Ledger.create({
            shop_id: req.shop_id,
            partyId: sup.id,
            partyType: 'Supplier',
            partyName: sup.name,
            amount: paid,
            mode: 'Cash',
            date: dateStr,
            ref: `PAY-${purchaseNo.split('-').pop()}`,
            note: `Payment made on Purchase (${purchaseNo})`
          });
        }
      }
    }

    const purchase = await Purchase.create({
      shop_id: req.shop_id,
      purchaseNo,
      supplierName: activeSupplierName,
      supplierId: targetSupId,
      grandTotal: totalGrand,
      paidAmount: paid,
      paymentStatus,
      notes,
      items: processedItems
    });

    recentPurchases.set(dedupKey, { timestamp: Date.now(), purchase });
    return res.status(201).json({ success: true, purchase });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const { search } = req.query;
    let purchases = await Purchase.find({ shop_id: req.shop_id });

    if (search) {
      const q = search.toLowerCase();
      purchases = purchases.filter(p => p.purchaseNo.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q));
    }

    return res.json({
      success: true,
      purchases,
      pagination: { total: purchases.length, page: 1, pages: 1 }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
