import { Ledger } from '../models/ledger.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';
import { SaleReturn } from '../models/saleReturn.model.js';
import { PurchaseReturn } from '../models/purchaseReturn.model.js';
import { withTransaction } from '../services/db.service.js';
import { syncCustomerBalance, syncSupplierBalance } from '../utils/accounting.util.js';

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
    const amtNum = Math.round(Number(amount));

    if (!amtNum || amtNum <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    // Double-click / panic rapid click deduplication protection
    const dedupKey = `${req.shop_id}:${partyId || partyName || ''}:${partyType}:${amtNum}:${saleId || ''}:${purchaseId || ''}`;
    const existing = recentPayments.get(dedupKey);
    if (existing && Date.now() - existing.timestamp < 3500) {
      return res.status(200).json({ success: true, entry: existing.entry, deduplicated: true });
    }

    const savedEntry = await withTransaction(async (tx) => {
      const dateStr = new Date().toLocaleDateString('en-GB');
      const ref = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
      let targetPartyName = partyName || 'Party';

      if (partyType === 'Customer') {
        let cust = partyId && !String(partyId).startsWith('walkin-') ? await Customer.findById(partyId, req.shop_id) : null;
        if (!cust && partyName) {
          const allCustomers = await Customer.find({ shop_id: req.shop_id });
          cust = allCustomers.find(c => (c.name || '').trim().toLowerCase() === String(partyName).trim().toLowerCase());
        }
        if (!cust && saleId) {
          const targetSale = await Sale.findById(saleId, req.shop_id);
          if (targetSale?.customerId) {
            cust = await Customer.findById(targetSale.customerId, req.shop_id);
          }
        }

        if (cust) {
          targetPartyName = cust.name;
        } else if (partyName) {
          targetPartyName = partyName;
        } else {
          targetPartyName = 'Walk-in Customer';
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

        if (cust?.id) {
          await syncCustomerBalance(cust.id, req.shop_id, tx.query);
        }

        return entry;
      } else {
        // Supplier payment
        let sup = partyId ? await Supplier.findById(partyId, req.shop_id) : null;
        if (!sup && partyName) {
          const allSuppliers = await Supplier.find({ shop_id: req.shop_id });
          sup = allSuppliers.find(s => (s.name || '').trim().toLowerCase() === String(partyName).trim().toLowerCase());
        }

        if (sup) {
          targetPartyName = sup.name;
        } else if (partyName) {
          targetPartyName = partyName;
        }

        const entry = await Ledger.create({
          shop_id: req.shop_id,
          partyId: sup?.id || (partyId ? partyId : null),
          partyType: 'Supplier',
          partyName: targetPartyName,
          amount: amtNum,
          mode: paymentMode,
          date: dateStr,
          ref,
          note: note || (purchaseId ? `Payment for Purchase Bill` : 'Supplier payment made'),
          purchaseId: purchaseId || null
        });

        if (sup?.id) {
          await syncSupplierBalance(sup.id, req.shop_id, tx.query);
        }

        return entry;
      }
    });

    recentPayments.set(dedupKey, { timestamp: Date.now(), entry: savedEntry });
    return res.status(201).json({ success: true, entry: savedEntry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteLedgerEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Ledger.findById(id, req.shop_id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Ledger payment entry not found' });
    }

    await withTransaction(async (tx) => {
      const amt = Number(entry.amount || 0);

      if (entry.partyType === 'Customer') {
        if (entry.partyId) {
          const cust = await Customer.findById(entry.partyId, req.shop_id);
          if (cust) {
            const restoredBal = Number(cust.balance || 0) + amt;
            await Customer.findByIdAndUpdate(cust.id, { balance: restoredBal }, { shop_id: req.shop_id });
          }
        }
        if (entry.saleId) {
          const sale = await Sale.findById(entry.saleId, req.shop_id);
          if (sale) {
            const newPaid = Math.max(0, Number(sale.paidAmount || 0) - amt);
            const targetTotal = Number(sale.netAmount !== undefined ? sale.netAmount : Math.max(0, Number(sale.amount || 0) - Number(sale.returnAmount || 0)));
            const newStatus = (newPaid >= targetTotal && targetTotal > 0) ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Pending');
            await Sale.findByIdAndUpdate(sale.id, { paidAmount: newPaid, status: newStatus }, { shop_id: req.shop_id });
          }
        } else {
          // Unwind general Khata payment from sales using FIFO (oldest first, matching original payment order)
          let unwindRemaining = amt;
          const allSales = await Sale.find({ shop_id: req.shop_id });
          const custSales = allSales.filter(s => {
            const matchesCust = (entry.partyId && s.customerId === entry.partyId) ||
              (entry.partyName && s.partyName && s.partyName.trim().toLowerCase() === entry.partyName.trim().toLowerCase());
            return matchesCust && Number(s.paidAmount || 0) > 0;
          }).sort((a, b) => new Date(a.created_at || a.date || 0).getTime() - new Date(b.created_at || b.date || 0).getTime());

          for (const s of custSales) {
            if (unwindRemaining <= 0) break;
            const currentPaid = Number(s.paidAmount || 0);
            const deduct = Math.min(currentPaid, unwindRemaining);
            const nextPaid = currentPaid - deduct;
            const targetTotal = Number(s.netAmount !== undefined ? s.netAmount : Math.max(0, Number(s.amount || 0) - Number(s.returnAmount || 0)));
            const nextStatus = (nextPaid >= targetTotal && targetTotal > 0) ? 'Paid' : (nextPaid > 0 ? 'Partial' : 'Pending');
            await Sale.findByIdAndUpdate(s.id, { paidAmount: nextPaid, status: nextStatus }, { shop_id: req.shop_id });
            unwindRemaining -= deduct;
          }
        }
      } else if (entry.partyType === 'Supplier') {
        if (entry.partyId) {
          const sup = await Supplier.findById(entry.partyId, req.shop_id);
          if (sup) {
            const restoredBal = Number(sup.balance || 0) + amt;
            await Supplier.findByIdAndUpdate(sup.id, { balance: restoredBal }, { shop_id: req.shop_id });
          }
        }
        if (entry.purchaseId) {
          const pur = await Purchase.findById(entry.purchaseId, req.shop_id);
          if (pur) {
            const newPaid = Math.max(0, Number(pur.paidAmount || 0) - amt);
            const targetTotal = Number(pur.netAmount !== undefined ? pur.netAmount : Math.max(0, Number(pur.grandTotal || pur.amount || 0) - Number(pur.returnAmount || 0)));
            const newStatus = (newPaid >= targetTotal && targetTotal > 0) ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Pending');
            await Purchase.findByIdAndUpdate(pur.id, { paidAmount: newPaid, paymentStatus: newStatus }, { shop_id: req.shop_id });
          }
        } else {
          // Unwind general Supplier settlement from purchases using FIFO (oldest first, matching original payment order)
          let unwindRemaining = amt;
          const allPurchases = await Purchase.find({ shop_id: req.shop_id });
          const supPurchases = allPurchases.filter(p => {
            const matchesSup = (entry.partyId && p.supplierId === entry.partyId) ||
              (entry.partyName && p.supplier && p.supplier.trim().toLowerCase() === entry.partyName.trim().toLowerCase()) ||
              (entry.partyName && p.supplierName && p.supplierName.trim().toLowerCase() === entry.partyName.trim().toLowerCase());
            return matchesSup && Number(p.paidAmount || 0) > 0;
          }).sort((a, b) => new Date(a.created_at || a.date || 0).getTime() - new Date(b.created_at || b.date || 0).getTime());

          for (const p of supPurchases) {
            if (unwindRemaining <= 0) break;
            const currentPaid = Number(p.paidAmount || 0);
            const deduct = Math.min(currentPaid, unwindRemaining);
            const nextPaid = currentPaid - deduct;
            const targetTotal = Number(p.netAmount !== undefined ? p.netAmount : Math.max(0, Number(p.grandTotal || p.amount || 0) - Number(p.returnAmount || 0)));
            const nextStatus = (nextPaid >= targetTotal && targetTotal > 0) ? 'Paid' : (nextPaid > 0 ? 'Partial' : 'Pending');
            await Purchase.findByIdAndUpdate(p.id, { paidAmount: nextPaid, paymentStatus: nextStatus }, { shop_id: req.shop_id });
            unwindRemaining -= deduct;
          }
        }
      }

      await Ledger.findByIdAndDelete(id, req.shop_id);

      if (entry.partyType === 'Customer' && entry.partyId) {
        await syncCustomerBalance(entry.partyId, req.shop_id, tx.query);
      } else if (entry.partyType === 'Supplier' && entry.partyId) {
        await syncSupplierBalance(entry.partyId, req.shop_id, tx.query);
      }
    });


    return res.json({ success: true, message: 'Payment entry reversed and deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
