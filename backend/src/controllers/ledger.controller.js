import { Ledger } from '../models/ledger.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';

// Anti-duplicate rapid submission cache (3.5s window)
const recentPayments = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of recentPayments.entries()) {
    if (now - v.timestamp > 10000) {
      recentPayments.delete(k);
    }
  }
}, 60000);

export const getLedgerEntries = async (req, res) => {
  try {
    const { partyId, partyType } = req.query;
    let filter = { shop_id: req.shop_id };
    if (partyId) filter.partyId = partyId;

    const entries = await Ledger.find(filter);
    return res.json({ success: true, entries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { partyId, partyName, partyType, amount, paymentMode = 'Cash', note = '', saleId = null, purchaseId = null } = req.body;
    const amtNum = Number(amount);

    if (!amtNum || amtNum <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    // Double-click / panic rapid click deduplication protection
    const dedupKey = `${req.shop_id}:${partyId || partyName || ''}:${partyType}:${amtNum}:${saleId || ''}:${purchaseId || ''}`;
    const existing = recentPayments.get(dedupKey);
    if (existing && Date.now() - existing.timestamp < 3500) {
      return res.status(200).json({ success: true, entry: existing.entry, deduplicated: true });
    }

    const dateStr = new Date().toLocaleDateString('en-GB');
    const ref = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    let targetPartyName = partyName || 'Party';

    if (partyType === 'Customer') {
      let cust = partyId && !String(partyId).startsWith('walkin-') ? await Customer.findById(partyId, req.shop_id) : null;
      if (!cust && partyName) {
        cust = await Customer.findOne({ name: partyName, shop_id: req.shop_id });
      }
      if (!cust && saleId) {
        const targetSale = await Sale.findById(saleId, req.shop_id);
        if (targetSale?.customerId) {
          cust = await Customer.findById(targetSale.customerId, req.shop_id);
        }
      }

      // Compute actual outstanding customer balance/due in real-time
      let maxCustomerDue = 0;
      if (cust) {
        targetPartyName = cust.name;
        maxCustomerDue = Math.max(0, Number(cust.balance || 0));
      } else if (saleId) {
        const sale = await Sale.findById(saleId, req.shop_id);
        if (sale) {
          maxCustomerDue = Math.max(0, Number(sale.amount || 0) - Number(sale.paidAmount || 0));
        }
      }

      if (maxCustomerDue <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer has no outstanding due to pay (account is already settled).'
        });
      }

      if (amtNum > maxCustomerDue) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the customer's outstanding balance of Rs. ${maxCustomerDue.toLocaleString()}.`
        });
      }

      if (cust) {
        const currentBal = Number(cust.balance || 0);
        const newBalance = Math.max(0, currentBal - amtNum);
        await Customer.findByIdAndUpdate(cust.id, { balance: newBalance }, { shop_id: req.shop_id });
      } else {
        targetPartyName = partyName || 'Walk-in Customer';
      }

      // If specific sale is targeted, update its paidAmount and cascade any excess
      if (saleId) {
        const sale = await Sale.findById(saleId, req.shop_id);
        if (sale) {
          const maxSaleDue = Math.max(0, Number(sale.netAmount !== undefined ? sale.netAmount : (sale.amount - (sale.returnAmount || 0))) - Number(sale.paidAmount || 0));
          const effectivePay = Math.min(maxSaleDue, amtNum);
          const newPaid = Number(sale.paidAmount || 0) + effectivePay;
          const targetSaleTotal = Number(sale.netAmount !== undefined ? sale.netAmount : Math.max(0, Number(sale.amount || 0) - Number(sale.returnAmount || 0)));
          const newStatus = (newPaid >= targetSaleTotal && targetSaleTotal > 0) ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
          await Sale.findByIdAndUpdate(saleId, { paidAmount: newPaid, status: newStatus }, { shop_id: req.shop_id });

          let excessAmt = amtNum - effectivePay;
          if (excessAmt > 0) {
            const allShopSales = await Sale.find({ shop_id: req.shop_id });
            const openSales = allShopSales.filter(s => {
              const matchesCust = (cust && s.customerId === cust.id) ||
                (targetPartyName && s.partyName && s.partyName.trim().toLowerCase() === targetPartyName.trim().toLowerCase());
              const sTarget = Number(s.netAmount !== undefined ? s.netAmount : Math.max(0, Number(s.amount || 0) - Number(s.returnAmount || 0)));
              const isUnpaid = String(s.id) !== String(saleId) && (s.status === 'Pending' || s.status === 'Partial' || (Number(s.paidAmount || 0) < sTarget));
              return matchesCust && isUnpaid && s.status !== 'Returned';
            }).sort((a, b) => new Date(a.created_at || a.date || 0).getTime() - new Date(b.created_at || b.date || 0).getTime());

            for (const s of openSales) {
              if (excessAmt <= 0) break;
              const sTarget = Number(s.netAmount !== undefined ? s.netAmount : Math.max(0, Number(s.amount || 0) - Number(s.returnAmount || 0)));
              const due = Math.max(0, sTarget - Number(s.paidAmount || 0));
              const payTowardsSale = Math.min(due, excessAmt);
              const nextPaid = Number(s.paidAmount || 0) + payTowardsSale;
              const nextStatus = (nextPaid >= sTarget && sTarget > 0) ? 'Paid' : 'Partial';
              await Sale.findByIdAndUpdate(s.id, { paidAmount: nextPaid, status: nextStatus }, { shop_id: req.shop_id });
              excessAmt -= payTowardsSale;
            }
          }
        }
      } else {
        // General Khata payment: allocate FIFO to open unpaid/partial sales
        const allShopSales = await Sale.find({ shop_id: req.shop_id });
        const openSales = allShopSales.filter(s => {
          const matchesCust = (cust && s.customerId === cust.id) ||
            (targetPartyName && s.partyName && s.partyName.trim().toLowerCase() === targetPartyName.trim().toLowerCase());
          const sTarget = Number(s.netAmount !== undefined ? s.netAmount : Math.max(0, Number(s.amount || 0) - Number(s.returnAmount || 0)));
          const isUnpaid = s.status === 'Pending' || s.status === 'Partial' || (Number(s.paidAmount || 0) < sTarget);
          return matchesCust && isUnpaid && s.status !== 'Returned';
        }).sort((a, b) => new Date(a.created_at || a.date || 0).getTime() - new Date(b.created_at || b.date || 0).getTime());

        let remainingAmt = amtNum;
        for (const s of openSales) {
          if (remainingAmt <= 0) break;
          const sTarget = Number(s.netAmount !== undefined ? s.netAmount : Math.max(0, Number(s.amount || 0) - Number(s.returnAmount || 0)));
          const due = Math.max(0, sTarget - Number(s.paidAmount || 0));
          const payTowardsSale = Math.min(due, remainingAmt);
          const newPaid = Number(s.paidAmount || 0) + payTowardsSale;
          const newStatus = (newPaid >= sTarget && sTarget > 0) ? 'Paid' : 'Partial';
          await Sale.findByIdAndUpdate(s.id, { paidAmount: newPaid, status: newStatus }, { shop_id: req.shop_id });
          remainingAmt -= payTowardsSale;
        }
      }

      const entry = await Ledger.create({
        shop_id: req.shop_id,
        partyId: cust?.id || (partyId && !String(partyId).startsWith('walkin-') ? partyId : null),
        partyType: 'Customer',
        partyName: targetPartyName,
        amount: amtNum,
        mode: paymentMode,
        date: dateStr,
        ref,
        note: note || (saleId ? `Payment for Invoice` : 'Customer payment received'),
        saleId: saleId || null
      });

      recentPayments.set(dedupKey, { timestamp: Date.now(), entry });
      return res.status(201).json({ success: true, entry });
    } else {
      // Supplier payment
      const sup = partyId ? await Supplier.findById(partyId, req.shop_id) : null;
      let maxSupplierPayable = 0;
      if (sup) {
        targetPartyName = sup.name;
        maxSupplierPayable = Math.max(0, Number(sup.balance || 0));
      } else if (purchaseId) {
        const pur = await Purchase.findById(purchaseId, req.shop_id);
        if (pur) {
          const purTarget = Number(pur.netAmount !== undefined ? pur.netAmount : Math.max(0, Number(pur.grandTotal || pur.amount || 0) - Number(pur.returnAmount || 0)));
          maxSupplierPayable = Math.max(0, purTarget - Number(pur.paidAmount || 0));
        }
      }

      if (maxSupplierPayable <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Supplier has no outstanding payable balance (account is already settled).'
        });
      }

      if (amtNum > maxSupplierPayable) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the supplier's outstanding payable of Rs. ${maxSupplierPayable.toLocaleString()}.`
        });
      }

      if (sup) {
        const currentBal = Number(sup.balance || 0);
        const newBalance = Math.max(0, currentBal - amtNum);
        await Supplier.findByIdAndUpdate(sup.id, { balance: newBalance }, { shop_id: req.shop_id });
      }

      if (purchaseId) {
        const pur = await Purchase.findById(purchaseId, req.shop_id);
        if (pur) {
          const purTarget = Number(pur.netAmount !== undefined ? pur.netAmount : Math.max(0, Number(pur.grandTotal || pur.amount || 0) - Number(pur.returnAmount || 0)));
          const maxPurDue = Math.max(0, purTarget - Number(pur.paidAmount || 0));
          const effectivePay = Math.min(maxPurDue, amtNum);
          const newPaid = Number(pur.paidAmount || 0) + effectivePay;
          const newStatus = (newPaid >= purTarget && purTarget > 0) ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
          await Purchase.findByIdAndUpdate(purchaseId, { paidAmount: newPaid, paymentStatus: newStatus }, { shop_id: req.shop_id });

          let excessAmt = amtNum - effectivePay;
          if (excessAmt > 0) {
            const allShopPurchases = await Purchase.find({ shop_id: req.shop_id });
            const openPurchases = allShopPurchases.filter(p => {
              const matchesSup = (sup && p.supplierId === sup.id) ||
                (targetPartyName && p.supplier && p.supplier.trim().toLowerCase() === targetPartyName.trim().toLowerCase()) ||
                (targetPartyName && p.supplierName && p.supplierName.trim().toLowerCase() === targetPartyName.trim().toLowerCase());
              const pTarget = Number(p.netAmount !== undefined ? p.netAmount : Math.max(0, Number(p.grandTotal || p.amount || 0) - Number(p.returnAmount || 0)));
              const isUnpaid = String(p.id) !== String(purchaseId) && (p.paymentStatus === 'Pending' || p.paymentStatus === 'Partial' || (Number(p.paidAmount || 0) < pTarget));
              return matchesSup && isUnpaid && p.paymentStatus !== 'Returned' && p.status !== 'Returned';
            }).sort((a, b) => new Date(a.created_at || a.date || 0).getTime() - new Date(b.created_at || b.date || 0).getTime());

            for (const p of openPurchases) {
              if (excessAmt <= 0) break;
              const pTarget = Number(p.netAmount !== undefined ? p.netAmount : Math.max(0, Number(p.grandTotal || p.amount || 0) - Number(p.returnAmount || 0)));
              const due = Math.max(0, pTarget - Number(p.paidAmount || 0));
              const payTowardsPur = Math.min(due, excessAmt);
              const nextPaid = Number(p.paidAmount || 0) + payTowardsPur;
              const nextStatus = (nextPaid >= pTarget && pTarget > 0) ? 'Paid' : 'Partial';
              await Purchase.findByIdAndUpdate(p.id, { paidAmount: nextPaid, paymentStatus: nextStatus }, { shop_id: req.shop_id });
              excessAmt -= payTowardsPur;
            }
          }
        }
      } else {
        // General Supplier payment: allocate FIFO to open unpaid/partial purchases
        const allShopPurchases = await Purchase.find({ shop_id: req.shop_id });
        const openPurchases = allShopPurchases.filter(p => {
          const matchesSup = (sup && p.supplierId === sup.id) ||
            (targetPartyName && p.supplier && p.supplier.trim().toLowerCase() === targetPartyName.trim().toLowerCase()) ||
            (targetPartyName && p.supplierName && p.supplierName.trim().toLowerCase() === targetPartyName.trim().toLowerCase());
          const pTarget = Number(p.netAmount !== undefined ? p.netAmount : Math.max(0, Number(p.grandTotal || p.amount || 0) - Number(p.returnAmount || 0)));
          const isUnpaid = p.paymentStatus === 'Pending' || p.paymentStatus === 'Partial' || (Number(p.paidAmount || 0) < pTarget);
          return matchesSup && isUnpaid && p.paymentStatus !== 'Returned' && p.status !== 'Returned';
        }).sort((a, b) => new Date(a.created_at || a.date || 0).getTime() - new Date(b.created_at || b.date || 0).getTime());

        let remainingAmt = amtNum;
        for (const p of openPurchases) {
          if (remainingAmt <= 0) break;
          const pTarget = Number(p.netAmount !== undefined ? p.netAmount : Math.max(0, Number(p.grandTotal || p.amount || 0) - Number(p.returnAmount || 0)));
          const due = Math.max(0, pTarget - Number(p.paidAmount || 0));
          const payTowardsPur = Math.min(due, remainingAmt);
          const newPaid = Number(p.paidAmount || 0) + payTowardsPur;
          const newStatus = (newPaid >= pTarget && pTarget > 0) ? 'Paid' : 'Partial';
          await Purchase.findByIdAndUpdate(p.id, { paidAmount: newPaid, paymentStatus: newStatus }, { shop_id: req.shop_id });
          remainingAmt -= payTowardsPur;
        }
      }

      const entry = await Ledger.create({
        shop_id: req.shop_id,
        partyId: partyId || null,
        partyType: 'Supplier',
        partyName: targetPartyName,
        amount: amtNum,
        mode: paymentMode,
        date: dateStr,
        ref,
        note: note || (purchaseId ? 'Payment for Purchase' : 'Payment paid to supplier'),
        purchaseId: purchaseId || null
      });

      recentPayments.set(dedupKey, { timestamp: Date.now(), entry });
      return res.status(201).json({ success: true, entry });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
