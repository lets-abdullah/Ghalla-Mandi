import { SaleReturn } from '../models/saleReturn.model.js';
import { PurchaseReturn } from '../models/purchaseReturn.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Ledger } from '../models/ledger.model.js';
import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { run } from '../services/db.service.js';

// =========================================================================
// SALE RETURNS
// =========================================================================

export const getSaleReturns = async (req, res) => {
  try {
    const saleReturns = await SaleReturn.find({ shop_id: req.shop_id });
    return res.json({ success: true, returns: saleReturns, saleReturns });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createSaleReturn = async (req, res) => {
  try {
    const { saleId, invoiceNo, customerId, customerName, items, refundAmount, refundMode = 'Cash', reason = '', date } = req.body;

    const count = await SaleReturn.countDocuments({ shop_id: req.shop_id });
    const returnNo = `SR-2026-${String(count + 1).padStart(4, '0')}`;
    const dateStr = date || new Date().toLocaleDateString('en-GB');

    const createdReturn = await SaleReturn.create({
      shop_id: req.shop_id,
      returnNo,
      saleId: saleId || null,
      invoiceNo: invoiceNo || 'Direct Sale Return',
      customerId: customerId || null,
      customerName: customerName || 'Customer Party',
      items: items || [],
      refundAmount: Number(refundAmount) || 0,
      refundMode,
      reason,
      date: dateStr
    });

    // 1. Restock products in inventory
    for (const item of items || []) {
      const pId = item.productId || item.id;
      const rQty = Number(item.qty || item.enteredQty) || 0;
      if (pId && rQty > 0) {
        const prod = await Product.findOne({ id: pId, shop_id: req.shop_id });
        if (prod) {
          const newStock = Number(prod.stockQty || 0) + rQty;
          await Product.findByIdAndUpdate(prod.id, { stockQty: newStock }, { shop_id: req.shop_id });
          await AuditLog.create({
            shop_id: req.shop_id,
            product: prod.name,
            type: 'IN (Sale Return)',
            qty: `${rQty} ${prod.unit || 'KG'}`,
            ref: `Sale Return #${returnNo}`,
            date: dateStr
          });
        }
      }
    }

    // 2. Adjust customer ledger if refund mode is Ledger
    if (refundMode === 'Ledger' && customerId) {
      const cust = await Customer.findOne({ id: customerId, shop_id: req.shop_id });
      if (cust) {
        const newBal = Math.max(0, Number(cust.balance || 0) - Number(refundAmount || 0));
        await Customer.findByIdAndUpdate(cust.id, { balance: newBal }, { shop_id: req.shop_id });
        await Ledger.create({
          shop_id: req.shop_id,
          partyId: cust.id,
          partyName: cust.name,
          partyType: 'Customer',
          amount: Number(refundAmount) || 0,
          mode: 'Credit Note',
          date: dateStr,
          note: `Sale Return Credit Adjustment #${returnNo}`,
          ref: returnNo
        });
      }
    }

    // 3. Update matching sale invoice if linked
    if (saleId) {
      const sale = await Sale.findOne({ id: saleId, shop_id: req.shop_id });
      if (sale) {
        const saleReturns = await SaleReturn.find({ shop_id: req.shop_id });
        const relatedReturns = saleReturns.filter(r => String(r.saleId) === String(saleId) || (r.invoiceNo && r.invoiceNo === sale.invoiceNo));
        const totalReturnAmt = relatedReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
        const origAmt = Number(sale.amount || 0);
        const isFull = totalReturnAmt >= (origAmt - 1);
        await Sale.findByIdAndUpdate(sale.id, {
          status: isFull ? 'Returned' : (Number(sale.paidAmount || 0) >= (origAmt - totalReturnAmt) ? 'Paid' : 'Partial')
        }, { shop_id: req.shop_id });
      }
    }

    return res.status(201).json({ success: true, return: createdReturn, saleReturn: createdReturn });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSaleReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await SaleReturn.findByIdAndUpdate(id, req.shop_id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Sale return record not found' });
    }
    return res.json({ success: true, return: updated, saleReturn: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSaleReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await SaleReturn.findById(id, req.shop_id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sale return record not found' });
    }

    // 1. Reverse restocked inventory (deduct from product stock)
    const items = Array.isArray(existing.items) ? existing.items : [];
    for (const item of items) {
      const pId = item.productId || item.id;
      const rQty = Number(item.qty || item.enteredQty) || 0;
      if (pId && rQty > 0) {
        const prod = await Product.findOne({ id: pId, shop_id: req.shop_id });
        if (prod) {
          const newStock = Math.max(0, Number(prod.stockQty || 0) - rQty);
          await Product.findByIdAndUpdate(prod.id, { stockQty: newStock }, { shop_id: req.shop_id });
          await AuditLog.create({
            shop_id: req.shop_id,
            product: prod.name,
            type: 'OUT (Sale Return Deleted)',
            qty: `${rQty} ${prod.unit || 'KG'}`,
            ref: `Delete SR #${existing.returnNo}`,
            date: new Date().toLocaleDateString('en-GB')
          });
        }
      }
    }

    // 2. Reverse customer balance & remove Ledger credit note
    if (existing.refundMode === 'Ledger' && existing.customerId) {
      const cust = await Customer.findOne({ id: existing.customerId, shop_id: req.shop_id });
      if (cust) {
        const restoredBal = Number(cust.balance || 0) + Number(existing.refundAmount || 0);
        await Customer.findByIdAndUpdate(cust.id, { balance: restoredBal }, { shop_id: req.shop_id });
      }
      await run('DELETE FROM payment_logs WHERE ref = $1 AND shop_id = $2', [existing.returnNo, req.shop_id]);
    }

    // 3. Delete the sale return record
    await SaleReturn.findByIdAndDelete(id, req.shop_id);

    // 4. Update matching sale status
    if (existing.saleId) {
      const sale = await Sale.findOne({ id: existing.saleId, shop_id: req.shop_id });
      if (sale) {
        const remainingReturns = (await SaleReturn.find({ shop_id: req.shop_id })).filter(r =>
          String(r.saleId) === String(existing.saleId) || (r.invoiceNo && r.invoiceNo === sale.invoiceNo)
        );
        const totalReturnAmt = remainingReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
        const origAmt = Number(sale.amount || 0);
        const paidAmt = Number(sale.paidAmount || 0);
        const isFull = totalReturnAmt >= (origAmt - 1) && origAmt > 0;
        const newStatus = isFull ? 'Returned' : ((paidAmt >= (origAmt - totalReturnAmt) && origAmt > 0) ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Pending'));
        await Sale.findByIdAndUpdate(sale.id, { status: newStatus }, { shop_id: req.shop_id });
      }
    }

    return res.json({ success: true, message: 'Sale return deleted and inventory/balances restored successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================================
// PURCHASE RETURNS
// =========================================================================

export const getPurchaseReturns = async (req, res) => {
  try {
    const purchaseReturns = await PurchaseReturn.find({ shop_id: req.shop_id });
    return res.json({ success: true, returns: purchaseReturns, purchaseReturns });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createPurchaseReturn = async (req, res) => {
  try {
    const { purchaseId, purchaseNo, supplierId, supplierName, items, refundAmount, refundMode = 'Cash', reason = '', date } = req.body;

    const count = await PurchaseReturn.countDocuments({ shop_id: req.shop_id });
    const returnNo = `PR-2026-${String(count + 1).padStart(4, '0')}`;
    const dateStr = date || new Date().toLocaleDateString('en-GB');

    const createdReturn = await PurchaseReturn.create({
      shop_id: req.shop_id,
      returnNo,
      purchaseId: purchaseId || null,
      purchaseNo: purchaseNo || 'Direct Purchase Return',
      supplierId: supplierId || null,
      supplierName: supplierName || 'Supplier Firm',
      items: items || [],
      refundAmount: Number(refundAmount) || 0,
      refundMode,
      reason,
      date: dateStr
    });

    // 1. Deduct products from inventory
    for (const item of items || []) {
      const pId = item.productId || item.id;
      const rQty = Number(item.qty || item.enteredQty) || 0;
      if (pId && rQty > 0) {
        const prod = await Product.findOne({ id: pId, shop_id: req.shop_id });
        if (prod) {
          const newStock = Math.max(0, Number(prod.stockQty || 0) - rQty);
          await Product.findByIdAndUpdate(prod.id, { stockQty: newStock }, { shop_id: req.shop_id });
          await AuditLog.create({
            shop_id: req.shop_id,
            product: prod.name,
            type: 'OUT (Purchase Return)',
            qty: `${rQty} ${prod.unit || 'KG'}`,
            ref: `Purchase Return #${returnNo}`,
            date: dateStr
          });
        }
      }
    }

    // 2. Adjust supplier ledger if refund mode is Ledger
    if (refundMode === 'Ledger' && supplierId) {
      const sup = await Supplier.findOne({ id: supplierId, shop_id: req.shop_id });
      if (sup) {
        const newBal = Math.max(0, Number(sup.balance || 0) - Number(refundAmount || 0));
        await Supplier.findByIdAndUpdate(sup.id, { balance: newBal }, { shop_id: req.shop_id });
        await Ledger.create({
          shop_id: req.shop_id,
          partyId: sup.id,
          partyName: sup.name,
          partyType: 'Supplier',
          amount: Number(refundAmount) || 0,
          mode: 'Debit Note',
          date: dateStr,
          note: `Purchase Return Debit Adjustment #${returnNo}`,
          ref: returnNo
        });
      }
    }

    // 3. Update matching purchase invoice if linked
    if (purchaseId) {
      const purchase = await Purchase.findOne({ id: purchaseId, shop_id: req.shop_id });
      if (purchase) {
        const pReturns = await PurchaseReturn.find({ shop_id: req.shop_id });
        const relatedReturns = pReturns.filter(r => String(r.purchaseId) === String(purchaseId) || (r.purchaseNo && r.purchaseNo === purchase.purchaseNo));
        const totalReturnAmt = relatedReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
        const origAmt = Number(purchase.grandTotal || purchase.amount || 0);
        const isFull = totalReturnAmt >= (origAmt - 1);
        await Purchase.findByIdAndUpdate(purchase.id, {
          paymentStatus: isFull ? 'Returned' : (Number(purchase.paidAmount || 0) >= (origAmt - totalReturnAmt) ? 'Paid' : 'Partial')
        }, { shop_id: req.shop_id });
      }
    }

    return res.status(201).json({ success: true, return: createdReturn, purchaseReturn: createdReturn });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePurchaseReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await PurchaseReturn.findByIdAndUpdate(id, req.shop_id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Purchase return record not found' });
    }
    return res.json({ success: true, return: updated, purchaseReturn: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePurchaseReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await PurchaseReturn.findById(id, req.shop_id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase return record not found' });
    }

    // 1. Restore deducted inventory (add back to product stock)
    const items = Array.isArray(existing.items) ? existing.items : [];
    for (const item of items) {
      const pId = item.productId || item.id;
      const rQty = Number(item.qty || item.enteredQty) || 0;
      if (pId && rQty > 0) {
        const prod = await Product.findOne({ id: pId, shop_id: req.shop_id });
        if (prod) {
          const newStock = Number(prod.stockQty || 0) + rQty;
          await Product.findByIdAndUpdate(prod.id, { stockQty: newStock }, { shop_id: req.shop_id });
          await AuditLog.create({
            shop_id: req.shop_id,
            product: prod.name,
            type: 'IN (Purchase Return Deleted)',
            qty: `${rQty} ${prod.unit || 'KG'}`,
            ref: `Delete PR #${existing.returnNo}`,
            date: new Date().toLocaleDateString('en-GB')
          });
        }
      }
    }

    // 2. Reverse supplier balance & remove Ledger debit note
    if (existing.refundMode === 'Ledger' && existing.supplierId) {
      const sup = await Supplier.findOne({ id: existing.supplierId, shop_id: req.shop_id });
      if (sup) {
        const restoredBal = Number(sup.balance || 0) + Number(existing.refundAmount || 0);
        await Supplier.findByIdAndUpdate(sup.id, { balance: restoredBal }, { shop_id: req.shop_id });
      }
      await run('DELETE FROM payment_logs WHERE ref = $1 AND shop_id = $2', [existing.returnNo, req.shop_id]);
    }

    // 3. Delete the purchase return record
    await PurchaseReturn.findByIdAndDelete(id, req.shop_id);

    // 4. Update matching purchase status
    if (existing.purchaseId) {
      const purchase = await Purchase.findOne({ id: existing.purchaseId, shop_id: req.shop_id });
      if (purchase) {
        const remainingReturns = (await PurchaseReturn.find({ shop_id: req.shop_id })).filter(r =>
          String(r.purchaseId) === String(existing.purchaseId) || (r.purchaseNo && r.purchaseNo === purchase.purchaseNo)
        );
        const totalReturnAmt = remainingReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
        const origAmt = Number(purchase.grandTotal || purchase.amount || 0);
        const paidAmt = Number(purchase.paidAmount || 0);
        const isFull = totalReturnAmt >= (origAmt - 1) && origAmt > 0;
        const newStatus = isFull ? 'Returned' : ((paidAmt >= (origAmt - totalReturnAmt) && origAmt > 0) ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Pending'));
        await Purchase.findByIdAndUpdate(purchase.id, { paymentStatus: newStatus }, { shop_id: req.shop_id });
      }
    }

    return res.json({ success: true, message: 'Purchase return deleted and inventory/balances restored successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
