import { SaleReturn } from '../models/saleReturn.model.js';
import { PurchaseReturn } from '../models/purchaseReturn.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Ledger } from '../models/ledger.model.js';
import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { run, withTransaction } from '../services/db.service.js';
import { computeSaleInvoiceFromReturns, computePurchaseInvoiceFromReturns, syncCustomerBalance, syncSupplierBalance } from '../utils/accounting.util.js';
import { convertToKg } from '../services/unitConversion.service.js';

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
    const { saleId, invoiceNo, customerId, customerName, items, reason = '', date } = req.body;

    const count = await SaleReturn.countDocuments({ shop_id: req.shop_id });
    const returnNo = `SR-2026-${String(count + 1).padStart(4, '0')}`;
    const dateStr = date || new Date().toLocaleDateString('en-GB');

    const result = await withTransaction(async (tx) => {
      const targetSale = saleId
        ? await Sale.findOne({ id: saleId, shop_id: req.shop_id })
        : (invoiceNo ? await Sale.findOne({ invoiceNo, shop_id: req.shop_id }) : null);

      let approvedTotal = 0;
      const processedItems = [];
      const origCart = targetSale && Array.isArray(targetSale.cart) ? targetSale.cart : [];

      // Fetch prior returns for quantity validation
      const existingReturns = targetSale
        ? (await SaleReturn.find({ shop_id: req.shop_id })).filter(r =>
            String(r.saleId) === String(targetSale.id) || (r.invoiceNo && r.invoiceNo === targetSale.invoiceNo)
          )
        : [];

      const priorReturnedMap = new Map();
      existingReturns.forEach(er => {
        (er.items || []).forEach(it => {
          const pKey = String(it.productId || it.id || '');
          priorReturnedMap.set(pKey, (priorReturnedMap.get(pKey) || 0) + Number(it.qty || it.enteredQty || 0));
        });
      });

      for (const item of items || []) {
        const pId = item.productId || item.id;
        const rQty = Number(item.qty || item.enteredQty) || 0;
        if (!pId || rQty <= 0) continue;

        // Rate validation against original line item
        let lineRate = Number(item.rate || item.unitPrice || 0);
        if (origCart.length > 0) {
          const matchedLine = origCart.find(c => String(c.productId || c.id) === String(pId));
          if (matchedLine) {
            lineRate = Number(matchedLine.rate || matchedLine.unitPrice || lineRate);
            const origQty = Number(matchedLine.qty || matchedLine.enteredQty || 0);
            const prevReturned = priorReturnedMap.get(String(pId)) || 0;
            const maxAllowed = Math.max(0, origQty - prevReturned);
            if (rQty > maxAllowed && origQty > 0) {
              throw new Error(`Return quantity (${rQty}) for product "${matchedLine.name || pId}" exceeds maximum eligible returned quantity (${maxAllowed}).`);
            }
          }
        }

        const itemTotal = rQty * lineRate;
        approvedTotal += itemTotal;

        const prod = await Product.findOne({ id: pId, shop_id: req.shop_id });
        const expectedUnit = prod?.unit || 'KG';
        const providedUnit = item.unit || item.unitName;
        if (providedUnit && providedUnit.trim().toLowerCase() !== expectedUnit.trim().toLowerCase()) {
          throw new Error(`Product "${prod?.name || item.name}" has fixed unit "${expectedUnit}". Return unit "${providedUnit}" does not match. Unit cannot be changed.`);
        }

        processedItems.push({
          productId: pId,
          id: pId,
          name: item.name || item.productName || prod?.name || 'Returned Product',
          qty: rQty,
          rate: lineRate,
          unit: expectedUnit,
          unitName: expectedUnit,
          totalAmount: itemTotal
        });

        // 1. Restock products in inventory — normalize qty to product base unit
        if (prod) {
          // IMPORTANT: rQty is in the item's entered unit. Normalize to product base unit
          // before adding to stockQty, which is always in base unit (e.g. KG).
          const qtyInKg = convertToKg(rQty, expectedUnit);
          const baseProductFactor = convertToKg(1, expectedUnit) || 1;
          const normalizedReturnQty = qtyInKg / baseProductFactor;
          const newStock = Number(prod.stockQty || 0) + normalizedReturnQty;
          await Product.findByIdAndUpdate(prod.id, { stockQty: newStock }, { shop_id: req.shop_id });
          await AuditLog.create({
            shop_id: req.shop_id,
            product: prod.name,
            type: 'IN (Sale Return)',
            qty: `${rQty} ${expectedUnit}`,
            ref: `Sale Return #${returnNo}`,
            date: dateStr
          });
        }
      }

      let maxEligibleCashRefund = approvedTotal;
      if (targetSale) {
        const saleTotal = Number(targetSale.amount || targetSale.grandTotal || 0);
        const salePaid = Number(targetSale.paidAmount !== undefined ? targetSale.paidAmount : (targetSale.paid || 0));
        const priorReturns = existingReturns || [];
        const priorCashRefunds = priorReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
        const priorMerchandiseValue = priorReturns.reduce((sum, r) => {
          const itemsVal = Array.isArray(r.items) ? r.items.reduce((s, it) => s + Number(it.totalAmount || it.total || ((it.qty || 0) * (it.rate || 0))), 0) : 0;
          return sum + (itemsVal > 0 ? itemsVal : Number(r.refundAmount || 0));
        }, 0);
        const newNetSale = Math.max(0, saleTotal - (priorMerchandiseValue + approvedTotal));
        maxEligibleCashRefund = Math.max(0, Math.min(approvedTotal, salePaid - newNetSale - priorCashRefunds));
      }

      const isLiquidRefundMode = ['cash', 'bank account', 'bank', 'card'].includes(String(req.body.refundMode || '').trim().toLowerCase());
      const finalRefundAmount = (isLiquidRefundMode && req.body.refundAmount !== undefined && Number(req.body.refundAmount) > 0)
        ? Math.min(Number(req.body.refundAmount), maxEligibleCashRefund)
        : 0;

      // 2. Create Sale Return Record
      const createdReturn = await SaleReturn.create({
        shop_id: req.shop_id,
        returnNo,
        saleId: targetSale ? targetSale.id : (saleId || null),
        invoiceNo: targetSale ? targetSale.invoiceNo : (invoiceNo || 'Direct Sale Return'),
        customerId: targetSale ? (targetSale.customerId || customerId || null) : (customerId || null),
        customerName: targetSale ? (targetSale.partyName || customerName || 'Customer Party') : (customerName || 'Customer Party'),
        items: processedItems,
        refundAmount: finalRefundAmount,
        refundMode: isLiquidRefundMode && finalRefundAmount > 0 ? (req.body.refundMode || 'Cash') : 'Credit',
        reason,
        date: dateStr
      });

      // 3. Update parent sale financials if linked
      if (targetSale) {
        const allSaleReturns = await SaleReturn.find({ shop_id: req.shop_id });
        const relatedReturns = allSaleReturns.filter(r =>
          (r.saleId && String(r.saleId) === String(targetSale.id)) ||
          (r.invoiceNo && r.invoiceNo === targetSale.invoiceNo)
        );
        const fin = computeSaleInvoiceFromReturns(targetSale, relatedReturns);
        await Sale.findByIdAndUpdate(targetSale.id, {
          returnAmount: fin.totalReturnAmt,
          netAmount: fin.netAmt,
          status: fin.status
        }, { shop_id: req.shop_id });
      }

      // 4. Sync customer balance strictly to canonical Khata Due
      const targetCustId = targetSale ? targetSale.customerId : customerId;
      if (targetCustId) {
        await syncCustomerBalance(targetCustId, req.shop_id, tx.query);
      }

      return createdReturn;
    });

    return res.status(201).json({ success: true, return: result, saleReturn: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSaleReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await SaleReturn.findById(id, req.shop_id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sale return record not found' });
    }

    const updated = await withTransaction(async (tx) => {
      const result = await SaleReturn.findByIdAndUpdate(id, req.shop_id, { ...req.body, refundMode: req.body.refundMode || existing.refundMode || 'Credit' });
      if (!result) return null;

      const targetSale = result.saleId
        ? await Sale.findOne({ id: result.saleId, shop_id: req.shop_id })
        : (result.invoiceNo ? await Sale.findOne({ invoiceNo: result.invoiceNo, shop_id: req.shop_id }) : null);

      if (targetSale) {
        const saleReturns = await SaleReturn.find({ shop_id: req.shop_id });
        const relatedReturns = saleReturns.filter(r =>
          (r.saleId && String(r.saleId) === String(targetSale.id)) ||
          (r.invoiceNo && r.invoiceNo === targetSale.invoiceNo)
        );
        const fin = computeSaleInvoiceFromReturns(targetSale, relatedReturns);
        await Sale.findByIdAndUpdate(targetSale.id, {
          returnAmount: fin.totalReturnAmt,
          netAmount: fin.netAmt,
          status: fin.status
        }, { shop_id: req.shop_id });
      }

      const targetCustId = targetSale ? targetSale.customerId : result.customerId;
      if (targetCustId) {
        await syncCustomerBalance(targetCustId, req.shop_id, tx.query);
      }

      return result;
    });

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

    await withTransaction(async (tx) => {
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

      // 2. Delete the sale return record
      await SaleReturn.findByIdAndDelete(id, req.shop_id);

      // 3. Update matching sale status and net amount
      if (existing.saleId) {
        const sale = await Sale.findOne({ id: existing.saleId, shop_id: req.shop_id });
        if (sale) {
          const remainingReturns = (await SaleReturn.find({ shop_id: req.shop_id })).filter(r =>
            String(r.saleId) === String(existing.saleId) || (r.invoiceNo && r.invoiceNo === sale.invoiceNo)
          );
          const fin = computeSaleInvoiceFromReturns(sale, remainingReturns);
          await Sale.findByIdAndUpdate(sale.id, {
            returnAmount: fin.totalReturnAmt,
            netAmount: fin.netAmt,
            status: fin.status
          }, { shop_id: req.shop_id });
        }
      }

      // 4. Sync customer balance
      if (existing.customerId) {
        await syncCustomerBalance(existing.customerId, req.shop_id, tx.query);
      }
    });

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
    const { purchaseId, purchaseNo, supplierId, supplierName, items, reason = '', date } = req.body;

    const count = await PurchaseReturn.countDocuments({ shop_id: req.shop_id });
    const returnNo = `PR-2026-${String(count + 1).padStart(4, '0')}`;
    const dateStr = date || new Date().toLocaleDateString('en-GB');

    const result = await withTransaction(async (tx) => {
      const targetPurchase = purchaseId
        ? await Purchase.findOne({ id: purchaseId, shop_id: req.shop_id })
        : (purchaseNo ? await Purchase.findOne({ purchaseNo, shop_id: req.shop_id }) : null);

      let approvedTotal = 0;
      const processedItems = [];
      const origCart = targetPurchase && Array.isArray(targetPurchase.itemsJson ? JSON.parse(targetPurchase.itemsJson) : (targetPurchase.items || targetPurchase.cart || []))
        ? (typeof targetPurchase.itemsJson === 'string' ? JSON.parse(targetPurchase.itemsJson) : (targetPurchase.items || targetPurchase.cart || []))
        : [];

      // Fetch prior returns for quantity validation
      const existingReturns = targetPurchase
        ? (await PurchaseReturn.find({ shop_id: req.shop_id })).filter(r =>
            String(r.purchaseId) === String(targetPurchase.id) || (r.purchaseNo && r.purchaseNo === targetPurchase.purchaseNo)
          )
        : [];

      const priorReturnedMap = new Map();
      existingReturns.forEach(er => {
        (er.items || []).forEach(it => {
          const pKey = String(it.productId || it.id || '');
          priorReturnedMap.set(pKey, (priorReturnedMap.get(pKey) || 0) + Number(it.qty || it.enteredQty || 0));
        });
      });

      for (const item of items || []) {
        const pId = item.productId || item.id;
        const rQty = Number(item.qty || item.enteredQty) || 0;
        if (!pId || rQty <= 0) continue;

        // Rate validation against original line item
        let lineRate = Number(item.rate || item.unitPrice || 0);
        if (origCart.length > 0) {
          const matchedLine = origCart.find(c => String(c.productId || c.id) === String(pId));
          if (matchedLine) {
            lineRate = Number(matchedLine.rate || matchedLine.unitPrice || lineRate);
            const origQty = Number(matchedLine.qty || matchedLine.enteredQty || 0);
            const prevReturned = priorReturnedMap.get(String(pId)) || 0;
            const maxAllowed = Math.max(0, origQty - prevReturned);
            if (rQty > maxAllowed && origQty > 0) {
              throw new Error(`Return quantity (${rQty}) for product "${matchedLine.name || pId}" exceeds maximum eligible returned quantity (${maxAllowed}).`);
            }
          }
        }

        const itemTotal = rQty * lineRate;
        approvedTotal += itemTotal;

        const prod = await Product.findOne({ id: pId, shop_id: req.shop_id });
        const expectedUnit = prod?.unit || 'KG';
        const providedUnit = item.unit || item.unitName;
        if (providedUnit && providedUnit.trim().toLowerCase() !== expectedUnit.trim().toLowerCase()) {
          throw new Error(`Product "${prod?.name || item.name}" has fixed unit "${expectedUnit}". Return unit "${providedUnit}" does not match. Unit cannot be changed.`);
        }

        processedItems.push({
          productId: pId,
          id: pId,
          name: item.name || item.productName || prod?.name || 'Returned Product',
          qty: rQty,
          rate: lineRate,
          unit: expectedUnit,
          unitName: expectedUnit,
          totalAmount: itemTotal
        });

        // 1. Deduct products from inventory — normalize qty to product base unit
        if (prod) {
          // IMPORTANT: rQty is in the item's entered unit. Normalize to product base unit
          // before subtracting from stockQty, which is always in base unit (e.g. KG).
          const qtyInKg = convertToKg(rQty, expectedUnit);
          const baseProductFactor = convertToKg(1, expectedUnit) || 1;
          const normalizedReturnQty = qtyInKg / baseProductFactor;
          const availableStock = Number(prod.stockQty || 0);
          if (normalizedReturnQty > availableStock + 0.0001) {
            throw new Error(`Insufficient Stock — Available: ${availableStock} ${expectedUnit}. Maximum returnable quantity: ${availableStock} ${expectedUnit}.`);
          }
          const newStock = Math.max(0, availableStock - normalizedReturnQty);
          await Product.findByIdAndUpdate(prod.id, { stockQty: newStock }, { shop_id: req.shop_id });
          await AuditLog.create({
            shop_id: req.shop_id,
            product: prod.name,
            type: 'OUT (Purchase Return)',
            qty: `${rQty} ${expectedUnit}`,
            ref: `Purchase Return #${returnNo}`,
            date: dateStr
          });
        }
      }

      let maxEligibleCashRefund = approvedTotal;
      if (targetPurchase) {
        const purTotal = Number(targetPurchase.grandTotal || targetPurchase.amount || 0);
        const purPaid = Number(targetPurchase.paidAmount !== undefined ? targetPurchase.paidAmount : (targetPurchase.paid || 0));
        const priorReturns = existingReturns || [];
        const priorCashRefunds = priorReturns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
        const priorMerchandiseValue = priorReturns.reduce((sum, r) => {
          const itemsVal = Array.isArray(r.items) ? r.items.reduce((s, it) => s + Number(it.totalAmount || it.total || ((it.qty || 0) * (it.rate || 0))), 0) : 0;
          return sum + (itemsVal > 0 ? itemsVal : Number(r.refundAmount || 0));
        }, 0);
        const newNetPur = Math.max(0, purTotal - (priorMerchandiseValue + approvedTotal));
        maxEligibleCashRefund = Math.max(0, Math.min(approvedTotal, purPaid - newNetPur - priorCashRefunds));
      }

      const automaticRefundAmount = maxEligibleCashRefund;
      const finalRefundAmount = req.body.refundAmount !== undefined
        ? Math.min(Number(req.body.refundAmount), maxEligibleCashRefund)
        : automaticRefundAmount;
      const finalRefundMode = finalRefundAmount > 0 ? (req.body.refundMode || 'Cash') : 'Credit';

      // 2. Create Purchase Return Record
      const createdReturn = await PurchaseReturn.create({
        shop_id: req.shop_id,
        returnNo,
        purchaseId: targetPurchase ? targetPurchase.id : (purchaseId || null),
        purchaseNo: targetPurchase ? targetPurchase.purchaseNo : (purchaseNo || 'Direct Purchase Return'),
        supplierId: targetPurchase ? (targetPurchase.supplierId || supplierId || null) : (supplierId || null),
        supplierName: targetPurchase ? (targetPurchase.supplierName || supplierName || 'Supplier Firm') : (supplierName || 'Supplier Firm'),
        items: processedItems,
        refundAmount: finalRefundAmount,
        refundMode: finalRefundMode,
        reason,
        date: dateStr
      });

      // 3. Update matching purchase invoice if linked
      if (targetPurchase) {
        const allPurchaseReturns = await PurchaseReturn.find({ shop_id: req.shop_id });
        const relatedReturns = allPurchaseReturns.filter(r =>
          (r.purchaseId && String(r.purchaseId) === String(targetPurchase.id)) ||
          (r.purchaseNo && r.purchaseNo === targetPurchase.purchaseNo)
        );
        const fin = computePurchaseInvoiceFromReturns(targetPurchase, relatedReturns);
        await Purchase.findByIdAndUpdate(targetPurchase.id, {
          returnAmount: fin.totalReturnAmt,
          netAmount: fin.netAmt,
          paymentStatus: fin.status
        }, { shop_id: req.shop_id });
      }

      // 4. Sync supplier balance
      const targetSupId = targetPurchase ? targetPurchase.supplierId : supplierId;
      if (targetSupId) {
        await syncSupplierBalance(targetSupId, req.shop_id, tx.query);
      }

      return createdReturn;
    });

    return res.status(201).json({ success: true, return: result, purchaseReturn: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePurchaseReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await PurchaseReturn.findById(id, req.shop_id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase return record not found' });
    }

    const updated = await withTransaction(async (tx) => {
      const result = await PurchaseReturn.findByIdAndUpdate(id, req.shop_id, { ...req.body, refundMode: req.body.refundMode || existing.refundMode || 'Credit' });
      if (!result) return null;

      const targetPurchase = result.purchaseId
        ? await Purchase.findOne({ id: result.purchaseId, shop_id: req.shop_id })
        : (result.purchaseNo ? await Purchase.findOne({ purchaseNo: result.purchaseNo, shop_id: req.shop_id }) : null);

      if (targetPurchase) {
        const purchaseReturns = await PurchaseReturn.find({ shop_id: req.shop_id });
        const relatedReturns = purchaseReturns.filter(r =>
          (r.purchaseId && String(r.purchaseId) === String(targetPurchase.id)) ||
          (r.purchaseNo && r.purchaseNo === targetPurchase.purchaseNo)
        );
        const fin = computePurchaseInvoiceFromReturns(targetPurchase, relatedReturns);
        await Purchase.findByIdAndUpdate(targetPurchase.id, {
          returnAmount: fin.totalReturnAmt,
          netAmount: fin.netAmt,
          paymentStatus: fin.status
        }, { shop_id: req.shop_id });
      }

      const targetSupId = targetPurchase ? targetPurchase.supplierId : result.supplierId;
      if (targetSupId) {
        await syncSupplierBalance(targetSupId, req.shop_id, tx.query);
      }

      return result;
    });

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

    await withTransaction(async (tx) => {
      // 1. Restore deducted inventory (add back to product stock) — normalize to base unit
      const items = Array.isArray(existing.items) ? existing.items : [];
      for (const item of items) {
        const pId = item.productId || item.id;
        const rQty = Number(item.qty || item.enteredQty) || 0;
        if (pId && rQty > 0) {
          const prod = await Product.findOne({ id: pId, shop_id: req.shop_id });
          if (prod) {
            const itemUnit = item.unit || item.unitName || prod.unit || 'KG';
            const qtyInKg = convertToKg(rQty, itemUnit);
            const baseProductFactor = convertToKg(1, prod.unit || 'KG') || 1;
            const normalizedQty = qtyInKg / baseProductFactor;
            const newStock = Number(prod.stockQty || 0) + normalizedQty;
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

      // 2. Delete the purchase return record
      await PurchaseReturn.findByIdAndDelete(id, req.shop_id);

      // 3. Update matching purchase status and net amount
      if (existing.purchaseId) {
        const purchase = await Purchase.findOne({ id: existing.purchaseId, shop_id: req.shop_id });
        if (purchase) {
          const remainingReturns = (await PurchaseReturn.find({ shop_id: req.shop_id })).filter(r =>
            String(r.purchaseId) === String(existing.purchaseId) || (r.purchaseNo && r.purchaseNo === purchase.purchaseNo)
          );
          const fin = computePurchaseInvoiceFromReturns(purchase, remainingReturns);
          await Purchase.findByIdAndUpdate(purchase.id, {
            returnAmount: fin.totalReturnAmt,
            netAmount: fin.netAmt,
            paymentStatus: fin.status
          }, { shop_id: req.shop_id });
        }
      }

      // 4. Sync supplier balance
      if (existing.supplierId) {
        await syncSupplierBalance(existing.supplierId, req.shop_id, tx.query);
      }
    });

    return res.json({ success: true, message: 'Purchase return deleted and inventory/balances restored successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


