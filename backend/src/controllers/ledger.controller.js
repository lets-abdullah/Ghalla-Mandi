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
    const { partyId, partyType, amount, paymentMode = 'Cash', note = '', saleId = null, purchaseId = null } = req.body;
    const amtNum = Number(amount);

    if (!amtNum || amtNum <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    // Double-click / panic rapid click deduplication protection
    const dedupKey = `${req.shop_id}:${partyId || ''}:${partyType}:${amtNum}:${saleId || ''}:${purchaseId || ''}`;
    const existing = recentPayments.get(dedupKey);
    if (existing && Date.now() - existing.timestamp < 3500) {
      return res.status(200).json({ success: true, entry: existing.entry, deduplicated: true });
    }

    const dateStr = new Date().toLocaleDateString('en-GB');
    const ref = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    let targetPartyName = 'Party';

    if (partyType === 'Customer') {
      let cust = partyId ? await Customer.findById(partyId) : null;
      if (!cust && saleId) {
        const targetSale = await Sale.findById(saleId);
        if (targetSale?.customerId) {
          cust = await Customer.findById(targetSale.customerId);
        }
      }

      if (cust) {
        targetPartyName = cust.name;
        const newBalance = Math.max(0, Number(cust.balance || 0) - amtNum);
        await Customer.findByIdAndUpdate(cust.id, { balance: newBalance });
      }

      // If specific sale is targeted, update paidAmount
      if (saleId) {
        const sale = await Sale.findById(saleId);
        if (sale) {
          const newPaid = Number(sale.paidAmount || 0) + amtNum;
          const newStatus = newPaid >= Number(sale.amount || 0) ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
          await Sale.findByIdAndUpdate(saleId, { paidAmount: newPaid, status: newStatus });
        }
      }

      const entry = await Ledger.create({
        shop_id: req.shop_id,
        partyId: cust?.id || partyId || null,
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
        const newBalance = Math.max(0, Number(sup.balance || 0) - amtNum);
        await Supplier.findByIdAndUpdate(sup.id, { balance: newBalance });
      }

      if (purchaseId) {
        const pur = await Purchase.findById(purchaseId);
        if (pur) {
          const newPaid = Number(pur.paidAmount || 0) + amtNum;
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
