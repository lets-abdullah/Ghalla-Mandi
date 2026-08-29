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
      let cust = partyId && !String(partyId).startsWith('walkin-') ? await Customer.findById(partyId) : null;
      if (!cust && partyName) {
        cust = await Customer.findOne({ name: partyName });
      }
      if (!cust && saleId) {
        const targetSale = await Sale.findById(saleId);
        if (targetSale?.customerId) {
          cust = await Customer.findById(targetSale.customerId);
        }
      }

      if (cust) {
        targetPartyName = cust.name;
        const currentBal = Math.max(0, Number(cust.balance || 0));
        const finalAmt = currentBal > 0 ? Math.min(currentBal, amtNum) : amtNum;
        const newBalance = Math.max(0, currentBal - finalAmt);
        await Customer.findByIdAndUpdate(cust.id, { balance: newBalance });
      } else {
        targetPartyName = partyName || 'Walk-in Customer';
      }

      // If specific sale is targeted, update paidAmount
      if (saleId) {
        const sale = await Sale.findById(saleId);
        if (sale) {
          const maxSaleDue = Math.max(0, Number(sale.amount || 0) - Number(sale.paidAmount || 0));
          const effectivePay = Math.min(maxSaleDue, amtNum);
          const newPaid = Number(sale.paidAmount || 0) + effectivePay;
          const newStatus = newPaid >= Number(sale.amount || 0) ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
          await Sale.findByIdAndUpdate(saleId, { paidAmount: newPaid, status: newStatus });
        }
      } else if (!cust && targetPartyName) {
        // Walk-in customer payment: allocate to open sales
        const openSales = await Sale.find({
          shop_id: req.shop_id,
          partyName: targetPartyName,
          status: { $in: ['Pending', 'Partial'] }
        });
        let remainingAmt = amtNum;
        for (const s of openSales) {
          if (remainingAmt <= 0) break;
          const due = Math.max(0, Number(s.amount || 0) - Number(s.paidAmount || 0));
          const payTowardsSale = Math.min(due, remainingAmt);
          const newPaid = Number(s.paidAmount || 0) + payTowardsSale;
          const newStatus = newPaid >= Number(s.amount || 0) ? 'Paid' : 'Partial';
          await Sale.findByIdAndUpdate(s.id, { paidAmount: newPaid, status: newStatus });
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
      const sup = partyId ? await Supplier.findById(partyId) : null;
      if (sup) {
        targetPartyName = sup.name;
        const currentBal = Math.max(0, Number(sup.balance || 0));
        const finalAmt = currentBal > 0 ? Math.min(currentBal, amtNum) : amtNum;
        const newBalance = Math.max(0, currentBal - finalAmt);
        await Supplier.findByIdAndUpdate(sup.id, { balance: newBalance });
      }

      if (purchaseId) {
        const pur = await Purchase.findById(purchaseId);
        if (pur) {
          const maxPurDue = Math.max(0, Number(pur.grandTotal || pur.amount || 0) - Number(pur.paidAmount || 0));
          const effectivePay = Math.min(maxPurDue, amtNum);
          const newPaid = Number(pur.paidAmount || 0) + effectivePay;
          const newStatus = newPaid >= Number(pur.grandTotal || 0) ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
          await Purchase.findByIdAndUpdate(purchaseId, { paidAmount: newPaid, paymentStatus: newStatus });
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
