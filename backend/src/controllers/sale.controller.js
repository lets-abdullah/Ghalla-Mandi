import { Sale } from '../models/sale.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Ledger } from '../models/ledger.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { convertToKg } from '../services/unitConversion.service.js';

// Anti-duplicate rapid submission cache
const recentSales = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of recentSales.entries()) {
    if (now - v.timestamp > 10000) {
      recentSales.delete(k);
    }
  }
}, 60000);

export const createSale = async (req, res) => {
  try {
    const { customerName, customerId, items, paidAmount = 0, discount = 0, tax = 0, paymentMethod = 'Cash' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one sale item is required' });
    }

    // Deduplication key based on shop, customer, first item & count
    const dedupKey = `${req.shop_id}:${customerId || customerName || ''}:${items.length}:${items[0]?.productId}:${items[0]?.qty}:${paidAmount}`;
    const existing = recentSales.get(dedupKey);
    if (existing && Date.now() - existing.timestamp < 3000) {
      return res.status(200).json({ success: true, sale: existing.sale, deduplicated: true });
    }

    let subtotal = 0;
    let totalProfit = 0;
    const processedCart = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.name || item.productName}` });
      }

      const qty = Number(item.qty || item.enteredQty) || 1;
      const rate = Number(item.rate || item.ratePerEnteredUnit || product.sellingPrice) || 0;
      const itemTotal = qty * rate;
      subtotal += itemTotal;

      const unitProfit = rate - Number(product.purchasePrice || 0);
      totalProfit += unitProfit * qty;

      const itemUnit = item.unitName || item.unit || product.unit || 'KG';
      const qtyInKg = convertToKg(qty, itemUnit);
      const baseProductFactor = convertToKg(1, product.unit || 'KG') || 1;
      const baseQtyDeducted = qtyInKg / baseProductFactor;

      // Update product stock in base unit
      const newStock = Math.max(0, Number(product.stockQty) - baseQtyDeducted);
      await Product.findByIdAndUpdate(product.id, { stockQty: newStock });

      // Audit Log
      await AuditLog.create({
        shop_id: req.shop_id,
        product: product.name,
        type: 'OUT (Sale)',
        qty: `${qty} ${itemUnit} (${baseQtyDeducted} ${product.unit || 'KG'})`,
        ref: `POS Checkout`,
        date: new Date().toLocaleDateString('en-GB')
      });

      processedCart.push({
        productId: product.id,
        name: product.name,
        qty,
        rate,
        unitName: product.unit || 'KG',
        totalAmount: itemTotal
      });
    }

    const grandTotal = Math.max(0, subtotal - Number(discount) + Number(tax));
    const paid = Number(paidAmount) || 0;
    const status = paid >= grandTotal ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

    const count = await Sale.countDocuments({ shop_id: req.shop_id });
    const invoiceNo = `INV-2026-${String(count + 1).padStart(4, '0')}`;
    const dateStr = new Date().toLocaleDateString('en-GB');

    let activePartyName = customerName || 'Walk-in Customer';
    let targetCustId = customerId || null;

    if (targetCustId) {
      const cust = await Customer.findById(targetCustId);
      if (cust) {
        activePartyName = cust.name;
        const unpaid = Math.max(0, grandTotal - paid);
        await Customer.findByIdAndUpdate(cust.id, { balance: Number(cust.balance) + unpaid });

        if (paid > 0) {
          await Ledger.create({
            shop_id: req.shop_id,
            partyId: cust.id,
            partyType: 'Customer',
            partyName: cust.name,
            amount: paid,
            mode: `${paymentMethod || 'Cash'} (POS)`,
            date: dateStr,
            ref: `PAY-${invoiceNo.split('-').pop()}`,
            note: `POS Payment Received via ${paymentMethod || 'Cash'} on Invoice (${invoiceNo})`
          });
        }
      }
    }

    const sale = await Sale.create({
      shop_id: req.shop_id,
      invoiceNo,
      partyName: activePartyName,
      customerId: targetCustId,
      customerType: targetCustId ? 'Regular Party' : 'Walk-in Customer',
      date: dateStr,
      amount: grandTotal,
      paidAmount: paid,
      profit: Math.round(totalProfit),
      status,
      itemsCount: processedCart.length,
      cart: processedCart
    });

    recentSales.set(dedupKey, { timestamp: Date.now(), sale });
    return res.status(201).json({ success: true, sale });
  } catch (err) {
    console.error('Sale Creation Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSales = async (req, res) => {
  try {
    const { search } = req.query;
    let sales = await Sale.find({ shop_id: req.shop_id });

    if (search) {
      const q = search.toLowerCase();
      sales = sales.filter(s => s.invoiceNo.toLowerCase().includes(q) || s.partyName.toLowerCase().includes(q));
    }

    return res.json({
      success: true,
      sales,
      pagination: { total: sales.length, page: 1, pages: 1 }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }
    return res.json({ success: true, sale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
