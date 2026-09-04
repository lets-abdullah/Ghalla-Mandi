import { Purchase } from '../models/purchase.model.js';
import { PurchaseReturn } from '../models/purchaseReturn.model.js';
import { Product } from '../models/product.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Ledger } from '../models/ledger.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { convertToKg, isValidOperationalUnit } from '../services/unitConversion.service.js';
import { withTransaction, run } from '../services/db.service.js';
import { computePurchaseInvoiceFromReturns, syncSupplierBalance } from '../utils/accounting.util.js';

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

    // Validate operational units across all items
    for (const item of items) {
      const u = item.unit || item.unitName || item.enteredUnit;
      if (u && !isValidOperationalUnit(u)) {
        return res.status(400).json({
          success: false,
          message: `Unit "${u}" is invalid. Grouped/packaging units (Mann, Bori, Bag, Pack, Ton, Carton, Dozen, Quintal) are strictly prohibited.`
        });
      }
    }

    // Deduplication key based on shop, supplier, items length and first item
    const dedupKey = `${req.shop_id}:${supplierId || supplierName || ''}:${items.length}:${items[0]?.productId}:${items[0]?.enteredQty || items[0]?.qty}:${paidAmount}`;
    const existing = recentPurchases.get(dedupKey);
    if (existing && Date.now() - existing.timestamp < 3000) {
      return res.status(200).json({ success: true, purchase: existing.purchase, deduplicated: true });
    }

    const result = await withTransaction(async (tx) => {
      let totalGrand = 0;
      const processedItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId, req.shop_id);
        if (!product) {
          throw new Error(`Product not found: ${item.productName}`);
        }

        const qty = Number(item.enteredQty || item.qty) || 1;
        const rate = Number(item.ratePerEnteredUnit || item.rate) || 0;
        const itemTotal = qty * rate;
        totalGrand += itemTotal;

        const itemUnit = item.unit || item.unitName || item.enteredUnit || product.unit || product.baseUnit || 'KG';
        const qtyInKg = convertToKg(qty, itemUnit);
        const baseProductFactor = convertToKg(1, product.unit || 'KG') || 1;
        const baseQtyAdded = qtyInKg / baseProductFactor;

        // Update product stock and moving weighted average purchase price
        const currentStock = Math.max(0, Number(product.stockQty) || 0);
        const currentPrice = Number(product.purchasePrice) || 0;
        const newStock = currentStock + baseQtyAdded;
        let newAvgCost = currentPrice;
        if (newStock > 0 && rate > 0) {
          newAvgCost = Math.round(((currentStock * currentPrice) + (baseQtyAdded * rate)) / newStock * 100) / 100;
        }

        await Product.findByIdAndUpdate(product.id, {
          stockQty: newStock,
          purchasePrice: newAvgCost
        }, { shop_id: req.shop_id });

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

      const paid = Math.max(0, Number(paidAmount) || 0);
      const rawMode = String(req.body.paymentMode || req.body.paymentMethod || '').trim();
      const isKhataMode = rawMode.toLowerCase().includes('khata') || (!rawMode && paid === 0);
      const effectivePaymentMode = isKhataMode ? 'Supplier Khata' : (rawMode || (paid >= totalGrand ? 'Cash' : 'Supplier Khata'));
      const paymentStatus = req.body.paymentStatus || (isKhataMode && paid === 0 ? 'Pending' : (paid >= totalGrand && totalGrand > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending'));

      const count = await Purchase.countDocuments({ shop_id: req.shop_id });
      const purchaseNo = `PUR-2026-${String(count + 1).padStart(4, '0')}`;
      const dateStr = new Date().toLocaleDateString('en-GB');

      let activeSupplierName = supplierName || 'Supplier';
      let targetSupId = supplierId || null;

      if (!targetSupId && supplierName) {
        const allSuppliers = await Supplier.find({ shop_id: req.shop_id });
        const matched = allSuppliers.find(s => s.name.trim().toLowerCase() === String(supplierName).trim().toLowerCase());
        if (matched) {
          targetSupId = matched.id;
          activeSupplierName = matched.name;
        } else {
          const createdSup = await Supplier.create({
            shop_id: req.shop_id,
            name: supplierName.trim(),
            city: 'Local Mandi',
            openingBalance: 0,
            balance: 0,
            refundDue: 0
          });
          targetSupId = createdSup.id;
          activeSupplierName = createdSup.name;
        }
      }

      const purchase = await Purchase.create({
        shop_id: req.shop_id,
        purchaseNo,
        supplierName: activeSupplierName,
        supplierId: targetSupId,
        grandTotal: totalGrand,
        paidAmount: paid,
        returnAmount: 0,
        netAmount: totalGrand,
        paymentStatus,
        paymentMode: effectivePaymentMode,
        notes,
        items: processedItems
      });

      if (targetSupId) {
        const sup = await Supplier.findById(targetSupId, req.shop_id);
        if (sup) {
          activeSupplierName = sup.name;

          // Record upfront payment as distinct Payment transaction only if paid > 0
          if (paid > 0) {
            await Ledger.create({
              shop_id: req.shop_id,
              partyId: sup.id,
              partyType: 'Supplier',
              partyName: sup.name,
              amount: paid,
              mode: effectivePaymentMode,
              date: dateStr,
              ref: `PAY-${purchaseNo.split('-').pop()}`,
              note: `Payment made on Purchase (${purchaseNo}) via ${effectivePaymentMode}`,
              purchaseId: purchase.id
            });
          }
        }
        await syncSupplierBalance(targetSupId, req.shop_id, tx.query);
      }

      return purchase;

    });

    recentPurchases.set(dedupKey, { timestamp: Date.now(), purchase: result });
    return res.status(201).json({ success: true, purchase: result });
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

export const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierName, supplierId, items, paidAmount, notes, paymentMode } = req.body;

    const existingPurchase = await Purchase.findById(id, req.shop_id);
    if (!existingPurchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const u = item.unit || item.unitName || item.enteredUnit;
        if (u && !isValidOperationalUnit(u)) {
          return res.status(400).json({
            success: false,
            message: `Unit "${u}" is invalid. Grouped/packaging units are strictly prohibited.`
          });
        }
      }
    }

    const updatedPurchase = await withTransaction(async (tx) => {
      // 1. Revert previous stock from existing purchase items
      const oldItems = Array.isArray(existingPurchase.items) ? existingPurchase.items : [];
      for (const oldItem of oldItems) {
        if (oldItem.productId) {
          const prod = await Product.findById(oldItem.productId, req.shop_id);
          if (prod) {
            const itemUnit = oldItem.unit || oldItem.unitName || prod.unit || 'KG';
            const qtyInKg = convertToKg(Number(oldItem.qty || oldItem.enteredQty || 1), itemUnit);
            const baseProductFactor = convertToKg(1, prod.unit || 'KG') || 1;
            const revertedBaseQty = qtyInKg / baseProductFactor;
            const adjustedStock = Math.max(0, Number(prod.stockQty) - revertedBaseQty);
            await Product.findByIdAndUpdate(prod.id, { stockQty: adjustedStock }, { shop_id: req.shop_id });
          }
        }
      }

      // 2. Process updated items & add new stock
      let totalGrand = 0;
      const processedItems = [];

      const rawItems = items || existingPurchase.items || [];
      for (const item of rawItems) {
        const product = await Product.findById(item.productId, req.shop_id);
        const qty = Number(item.enteredQty || item.qty) || 1;
        const rate = Number(item.ratePerEnteredUnit || item.rate || item.price) || 0;
        const itemTotal = qty * rate;
        totalGrand += itemTotal;

        const itemUnit = item.unit || item.unitName || item.enteredUnit || product?.unit || 'KG';

        if (product) {
          const qtyInKg = convertToKg(qty, itemUnit);
          const baseProductFactor = convertToKg(1, product.unit || 'KG') || 1;
          const addedBaseQty = qtyInKg / baseProductFactor;
          const currentStock = Math.max(0, Number(product.stockQty) || 0);
          const currentPrice = Number(product.purchasePrice) || 0;
          const newStock = currentStock + addedBaseQty;
          let newAvgCost = currentPrice;
          if (newStock > 0 && rate > 0) {
            newAvgCost = Math.round(((currentStock * currentPrice) + (addedBaseQty * rate)) / newStock * 100) / 100;
          }

          await Product.findByIdAndUpdate(product.id, {
            stockQty: newStock,
            purchasePrice: newAvgCost
          }, { shop_id: req.shop_id });

          await AuditLog.create({
            shop_id: req.shop_id,
            product: product.name,
            type: 'IN (Purchase Updated)',
            qty: `${qty} ${itemUnit}`,
            ref: `Purchase #${existingPurchase.purchaseNo}`,
            date: new Date().toLocaleDateString('en-GB')
          });
        }

        processedItems.push({
          productId: product ? product.id : item.productId,
          name: product ? product.name : (item.name || item.productName),
          productName: product ? product.name : (item.name || item.productName),
          unit: itemUnit,
          unitName: itemUnit,
          enteredUnit: itemUnit,
          qty,
          enteredQty: qty,
          rate,
          ratePerEnteredUnit: rate,
          price: rate,
          total: itemTotal,
          totalAmount: itemTotal
        });
      }

      const paid = Number(paidAmount !== undefined ? paidAmount : existingPurchase.paidAmount) || 0;

      const purchaseReturns = await PurchaseReturn.find({ shop_id: req.shop_id });
      const relatedReturns = purchaseReturns.filter(r =>
        (r.purchaseId && String(r.purchaseId) === String(id)) ||
        (existingPurchase.purchaseNo && r.purchaseNo === existingPurchase.purchaseNo)
      );
      const oldFin = computePurchaseInvoiceFromReturns(existingPurchase, relatedReturns);
      const newFin = computePurchaseInvoiceFromReturns({ grandTotal: totalGrand, amount: totalGrand, paidAmount: paid }, relatedReturns);
      const { netAmt: netGrand, status: paymentStatus, due: newDue, totalReturnAmt: returnAmt } = newFin;

      let activeSupplierName = supplierName || existingPurchase.supplierName || 'Supplier';
      let targetSupId = supplierId !== undefined ? supplierId : existingPurchase.supplierId;

      if (targetSupId) {
        const sup = await Supplier.findById(targetSupId, req.shop_id);
        if (sup) {
          activeSupplierName = sup.name;
          const balanceDiff = newDue - oldFin.due;
          if (balanceDiff !== 0) {
            await Supplier.findByIdAndUpdate(sup.id, { balance: Math.max(0, Number(sup.balance || 0) + balanceDiff) }, { shop_id: req.shop_id });
          }
        }
      }

      // 3. Synchronize Ledger entry for this purchase
      const allLedger = await Ledger.find({ shop_id: req.shop_id });
      const existingLog = allLedger.find(l =>
        (l.purchaseId && String(l.purchaseId) === String(id)) ||
        (existingPurchase.purchaseNo && l.ref && l.ref.includes(existingPurchase.purchaseNo.split('-').pop()))
      );

      if (existingLog) {
        if (paid > 0) {
          await run('UPDATE payment_logs SET amount = $1, mode = $2 WHERE id = $3 AND shop_id = $4', [
            paid,
            paymentMode || existingLog.mode || 'Cash',
            existingLog.id,
            req.shop_id
          ]);
        } else {
          await run('DELETE FROM payment_logs WHERE id = $1 AND shop_id = $2', [existingLog.id, req.shop_id]);
        }
      } else if (paid > 0 && targetSupId) {
        const dateStr = new Date().toLocaleDateString('en-GB');
        await Ledger.create({
          shop_id: req.shop_id,
          partyId: targetSupId,
          partyType: 'Supplier',
          partyName: activeSupplierName,
          amount: paid,
          mode: paymentMode || 'Cash',
          date: dateStr,
          ref: `PAY-${existingPurchase.purchaseNo.split('-').pop()}`,
          note: `Payment made on Purchase (${existingPurchase.purchaseNo})`,
          purchaseId: id
        });
      }

      const updated = await Purchase.findByIdAndUpdate(id, {
        supplierName: activeSupplierName,
        supplierId: targetSupId,
        grandTotal: totalGrand,
        amount: totalGrand,
        netAmount: netGrand,
        paidAmount: paid,
        paymentStatus,
        paymentMode: paymentMode || existingPurchase.paymentMode || 'Supplier Khata',
        notes: notes !== undefined ? notes : existingPurchase.notes,
        items: processedItems
      }, { shop_id: req.shop_id });

      if (targetSupId) {
        await syncSupplierBalance(targetSupId, req.shop_id, tx.query);
      }

      return updated;
    });

    return res.json({ success: true, purchase: updatedPurchase });
  } catch (err) {
    console.error('Update Purchase Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
