import { Sale } from '../models/sale.model.js';
import { SaleReturn } from '../models/saleReturn.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Ledger } from '../models/ledger.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { convertToKg, isValidOperationalUnit } from '../services/unitConversion.service.js';
import { withTransaction } from '../services/db.service.js';
import { computeSaleInvoiceFromReturns, syncCustomerBalance } from '../utils/accounting.util.js';

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

    // Validate operational units across all items
    for (const item of items) {
      const u = item.unitName || item.unit;
      if (u && !isValidOperationalUnit(u)) {
        return res.status(400).json({
          success: false,
          message: `Unit "${u}" is invalid. Grouped/packaging units (Mann, Bori, Bag, Pack, Ton, Carton, Dozen, Quintal) are strictly prohibited.`
        });
      }
    }

    // Deduplication key based on shop, customer, first item & count
    const dedupKey = `${req.shop_id}:${customerId || customerName || ''}:${items.length}:${items[0]?.productId}:${items[0]?.qty}:${paidAmount}`;
    const existing = recentSales.get(dedupKey);
    if (existing && Date.now() - existing.timestamp < 3000) {
      return res.status(200).json({ success: true, sale: existing.sale, deduplicated: true });
    }

    const result = await withTransaction(async (tx) => {
      let subtotal = 0;
      let totalProfit = 0;
      const processedCart = [];

      for (const item of items) {
        const product = await Product.findById(item.productId, req.shop_id);
        if (!product) {
          throw new Error(`Product not found: ${item.name || item.productName}`);
        }

        const qty = Number(item.qty || item.enteredQty) || 1;
        const rate = Number(item.rate || item.ratePerEnteredUnit || product.sellingPrice) || 0;
        const itemTotal = qty * rate;
        subtotal += itemTotal;

        const unitProfit = rate - Number(product.purchasePrice || 0);
        totalProfit += unitProfit * qty;

        const expectedUnit = product.unit || 'KG';
        const providedUnit = item.unit || item.unitName;
        if (providedUnit && providedUnit.trim().toLowerCase() !== expectedUnit.trim().toLowerCase()) {
          throw new Error(`Product "${product.name}" has fixed unit "${expectedUnit}". Transaction unit "${providedUnit}" does not match. Unit cannot be changed.`);
        }

        const itemUnit = expectedUnit;
        const qtyInKg = convertToKg(qty, itemUnit);
        const baseProductFactor = convertToKg(1, expectedUnit) || 1;
        const baseQtyDeducted = qtyInKg / baseProductFactor;

        // Update product stock in base unit
        const newStock = Math.max(0, Number(product.stockQty) - baseQtyDeducted);
        await Product.findByIdAndUpdate(product.id, { stockQty: newStock }, { shop_id: req.shop_id });

        // Audit Log
        await AuditLog.create({
          shop_id: req.shop_id,
          product: product.name,
          type: 'OUT (Sale)',
          qty: `${qty} ${itemUnit}`,
          ref: `POS Checkout`,
          date: new Date().toLocaleDateString('en-GB')
        });

        processedCart.push({
          productId: product.id,
          name: product.name,
          qty,
          rate,
          unit: expectedUnit,
          unitName: expectedUnit,
          totalAmount: itemTotal
        });
      }

      const discountVal = Number(discount) || 0;
      const taxVal = Number(tax) || 0;
      const grandTotal = Math.max(0, subtotal - discountVal + taxVal);
      const paid = Math.min(grandTotal, Math.max(0, Number(paidAmount) || 0));
      const status = paid >= grandTotal ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

      const count = await Sale.countDocuments({ shop_id: req.shop_id });
      const invoiceNo = `INV-2026-${String(count + 1).padStart(4, '0')}`;
      const dateStr = new Date().toLocaleDateString('en-GB');

      let activePartyName = customerName || 'Walk-in Customer';
      let targetCustId = customerId || null;
      let cust = null;

      if (targetCustId) {
        cust = await Customer.findById(targetCustId, req.shop_id);
        if (cust) {
          activePartyName = cust.name;
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
        discount: discountVal,
        tax: taxVal,
        paidAmount: paid,
        returnAmount: 0,
        netAmount: grandTotal,
        profit: Math.round(totalProfit),
        paymentMode: paymentMethod || 'Cash',
        paymentMethod: paymentMethod || 'Cash',
        status,
        itemsCount: processedCart.length,
        cart: processedCart
      });

      if (targetCustId && cust && paid > 0) {
        await Ledger.create({
          shop_id: req.shop_id,
          partyId: cust.id,
          partyType: 'Customer',
          partyName: cust.name,
          amount: paid,
          mode: `${paymentMethod || 'Cash'} (POS)`,
          date: dateStr,
          ref: `POS-PAY-${invoiceNo.split('-').pop()}`,
          note: `POS Payment Received via ${paymentMethod || 'Cash'} on Invoice (${invoiceNo})`,
          saleId: sale.id
        });
      }

      if (targetCustId) {
        await syncCustomerBalance(targetCustId, req.shop_id, tx.query);
      }

      return sale;
    });

    recentSales.set(dedupKey, { timestamp: Date.now(), sale: result });
    return res.status(201).json({ success: true, sale: result });
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
    const sale = await Sale.findById(req.params.id, req.shop_id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }
    return res.json({ success: true, sale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, customerId, items, paidAmount = 0, discount = 0, tax = 0, paymentMethod = 'Cash' } = req.body;

    const existingSale = await Sale.findById(id, req.shop_id);
    if (!existingSale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const u = item.unitName || item.unit;
        if (u && !isValidOperationalUnit(u)) {
          return res.status(400).json({
            success: false,
            message: `Unit "${u}" is invalid. Grouped/packaging units are strictly prohibited.`
          });
        }
      }
    }

    const updatedSale = await withTransaction(async (tx) => {
      // 1. Restore previous stock from existing sale cart
      const oldCart = Array.isArray(existingSale.cart) ? existingSale.cart : [];
      for (const oldItem of oldCart) {
        const prod = await Product.findById(oldItem.productId, req.shop_id);
        if (prod) {
          const itemUnit = oldItem.unitName || oldItem.unit || prod.unit || 'KG';
          const qtyInKg = convertToKg(Number(oldItem.qty || 1), itemUnit);
          const baseProductFactor = convertToKg(1, prod.unit || 'KG') || 1;
          const restoredBaseQty = qtyInKg / baseProductFactor;

          await Product.findByIdAndUpdate(prod.id, {
            stockQty: Number(prod.stockQty) + restoredBaseQty
          }, { shop_id: req.shop_id });
        }
      }

      // 2. Process new cart items & deduct updated stock
      let subtotal = 0;
      let totalProfit = 0;
      const processedCart = [];

      for (const item of items) {
        const product = await Product.findById(item.productId, req.shop_id);
        if (!product) {
          throw new Error(`Product not found: ${item.name || item.productName}`);
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

        const newStock = Math.max(0, Number(product.stockQty) - baseQtyDeducted);
        await Product.findByIdAndUpdate(product.id, { stockQty: newStock }, { shop_id: req.shop_id });

        processedCart.push({
          productId: product.id,
          name: product.name,
          qty,
          rate,
          unitName: product.unit || 'KG',
          totalAmount: itemTotal
        });
      }

      const discountVal = Number(discount) || 0;
      const taxVal = Number(tax) || 0;
      const grandTotal = Math.max(0, subtotal - discountVal + taxVal);
      const paid = Number(paidAmount) || 0;

      const saleReturns = await SaleReturn.find({ shop_id: req.shop_id });
      const relatedReturns = saleReturns.filter(r =>
        (r.saleId && String(r.saleId) === String(id)) ||
        (existingSale.invoiceNo && r.invoiceNo === existingSale.invoiceNo)
      );
      const oldFin = computeSaleInvoiceFromReturns(existingSale, relatedReturns);
      const newFin = computeSaleInvoiceFromReturns({ amount: grandTotal, paidAmount: paid }, relatedReturns);
      const { netAmt: netGrand, status, due: newDue } = newFin;

      let activePartyName = customerName || existingSale.partyName || 'Walk-in Customer';
      let targetCustId = customerId !== undefined ? customerId : existingSale.customerId;

      if (targetCustId) {
        const cust = await Customer.findById(targetCustId, req.shop_id);
        if (cust) {
          activePartyName = cust.name;
        }
      }

      const updated = await Sale.findByIdAndUpdate(id, {
        partyName: activePartyName,
        customerId: targetCustId,
        customerType: targetCustId ? 'Regular Party' : 'Walk-in Customer',
        amount: grandTotal,
        discount: discountVal,
        tax: taxVal,
        paidAmount: paid,
        returnAmount: newFin.totalReturnAmt,
        netAmount: netGrand,
        profit: Math.round(totalProfit),
        status,
        itemsCount: processedCart.length,
        cart: processedCart
      }, { shop_id: req.shop_id });

      if (targetCustId) {
        await syncCustomerBalance(targetCustId, req.shop_id, tx.query);
      }

      return updated;

    });

    return res.json({ success: true, sale: updatedSale });
  } catch (err) {
    console.error('Update Sale Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
