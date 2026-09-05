import { Ledger } from '../models/ledger.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';
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
      }

      // Compute actual outstanding customer balance/due in real-time
      let maxCustomerDue = 0;
      if (cust) {
        maxCustomerDue = Math.max(0, Number(cust.balance || 0));
      } else if (saleId) {
        const sale = await Sale.findById(saleId, req.shop_id);
        if (sale) {
          maxCustomerDue = Math.max(0, Number(sale.amount || 0) - Number(sale.paidAmount || 0));
        }
      }

      // Calculate total customer due from sales as backup
      const allShopSalesForCalc = await Sale.find({ shop_id: req.shop_id });
      const matchingSalesForCalc = allShopSalesForCalc.filter(s => {
        const sName = (s.partyName || s.customerName || '').trim().toLowerCase();
        const tName = String(targetPartyName || partyName || '').trim().toLowerCase();
        return (cust && s.customerId === cust.id) || (tName && sName === tName);
      });

      const totalSalesNet = matchingSalesForCalc.reduce((acc, s) => acc + Number(s.netAmount !== undefined ? s.netAmount : Math.max(0, Number(s.amount || 0) - Number(s.returnAmount || 0))), 0);
      const totalSalesPaid = matchingSalesForCalc.reduce((acc, s) => acc + Number(s.paidAmount || 0), 0);
      const salesCalculatedDue = Math.max(0, totalSalesNet - totalSalesPaid);

      if (salesCalculatedDue > 0) {
        maxCustomerDue = Math.max(maxCustomerDue, salesCalculatedDue);
      }

      if (maxCustomerDue > 0 && amtNum > maxCustomerDue) {
        throw new Error(`Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the customer's outstanding balance of Rs. ${maxCustomerDue.toLocaleString()}.`);
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

        let maxSupplierPayable = 0;
        if (sup) {
          maxSupplierPayable = Math.max(0, Number(sup.balance || 0));
        } else if (purchaseId) {
          const pur = await Purchase.findById(purchaseId, req.shop_id);
          if (pur) {
            const purTarget = Number(pur.netAmount !== undefined ? pur.netAmount : Math.max(0, Number(pur.grandTotal || pur.amount || 0) - Number(pur.returnAmount || 0)));
            maxSupplierPayable = Math.max(0, purTarget - Number(pur.paidAmount || 0));
          }
        }

        // Calculate total payable from purchases as backup
        const allShopPurchasesForCalc = await Purchase.find({ shop_id: req.shop_id });
        const matchingPurchasesForCalc = allShopPurchasesForCalc.filter(p => {
          const pName = (p.supplier || p.supplierName || '').trim().toLowerCase();
          const tName = String(targetPartyName || partyName || '').trim().toLowerCase();
          return (sup && p.supplierId === sup.id) || (tName && pName === tName);
        });

        const totalPurNet = matchingPurchasesForCalc.reduce((acc, p) => acc + Number(p.netAmount !== undefined ? p.netAmount : Math.max(0, Number(p.grandTotal || p.amount || 0) - Number(p.returnAmount || 0))), 0);
        const totalPurPaid = matchingPurchasesForCalc.reduce((acc, p) => acc + Number(p.paidAmount || 0), 0);
        const purCalculatedPayable = Math.max(0, totalPurNet - totalPurPaid);

        if (purCalculatedPayable > 0) {
          maxSupplierPayable = Math.max(maxSupplierPayable, purCalculatedPayable);
        }

        if (maxSupplierPayable > 0 && amtNum > maxSupplierPayable) {
          throw new Error(`Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the supplier's outstanding payable of Rs. ${maxSupplierPayable.toLocaleString()}.`);
        }

        // SUPPLIER PAYMENT & LIQUID CASH RULE: Calculate available liquid funds in real-time
        const allShopSales = await Sale.find({ shop_id: req.shop_id });
        const allShopPurchases = await Purchase.find({ shop_id: req.shop_id });
        const allShopLogs = await Ledger.find({ shop_id: req.shop_id });
        const allShopSaleReturns = await Purchase.find ? (await import('../models/saleReturn.model.js')).SaleReturn.find({ shop_id: req.shop_id }) : [];
        const allShopPurchaseReturns = await Purchase.find ? (await import('../models/purchaseReturn.model.js')).PurchaseReturn.find({ shop_id: req.shop_id }) : [];

        let cInflow = 0, bInflow = 0, kInflow = 0;
        let cOutflow = 0, bOutflow = 0, kOutflow = 0;

        allShopSales.forEach(s => {
          const pd = Number(s.paidAmount || 0);
          if (pd > 0) {
            const m = String(s.paymentMethod || s.paymentMode || 'Cash').toLowerCase();
            if (m.includes('bank') || m.includes('transfer')) bInflow += pd;
            else if (m.includes('card') || m.includes('pos')) kInflow += pd;
            else cInflow += pd;
          }
        });

        allShopLogs.filter(l => l.partyType === 'Customer' || l.type === 'Customer Payment').forEach(l => {
          const amt = Number(l.amount || 0);
          const m = String(l.mode || 'Cash').toLowerCase();
          if (m.includes('bank') || m.includes('transfer')) bInflow += amt;
          else if (m.includes('card') || m.includes('pos')) kInflow += amt;
          else cInflow += amt;
        });

        (allShopPurchaseReturns || []).forEach(r => {
          const amt = Number(r.refundAmount || r.amount || 0);
          const m = String(r.refundMode || r.mode || 'Cash').toLowerCase();
          if (m.includes('bank') || m.includes('transfer')) bInflow += amt;
          else if (m.includes('card') || m.includes('pos')) kInflow += amt;
          else cInflow += amt;
        });

        allShopLogs.filter(l => l.partyType === 'Supplier' || l.type === 'Supplier Payment').forEach(l => {
          const amt = Number(l.amount || 0);
          const m = String(l.mode || 'Cash').toLowerCase();
          if (m.includes('bank') || m.includes('transfer')) bOutflow += amt;
          else if (m.includes('card') || m.includes('pos')) kOutflow += amt;
          else cOutflow += amt;
        });

        allShopPurchases.forEach(p => {
          const pd = Number(p.paidAmount || 0);
          if (pd > 0) {
            const m = String(p.paymentMode || p.paymentMethod || 'Cash').toLowerCase();
            if (m.includes('bank') || m.includes('transfer')) bOutflow += pd;
            else if (m.includes('card') || m.includes('pos')) kOutflow += pd;
            else cOutflow += pd;
          }
        });

        (allShopSaleReturns || []).forEach(r => {
          const amt = Number(r.refundAmount || r.amount || 0);
          const m = String(r.refundMode || r.mode || 'Cash').toLowerCase();
          if (m.includes('bank') || m.includes('transfer')) bOutflow += amt;
          else if (m.includes('card') || m.includes('pos')) kOutflow += amt;
          else cOutflow += amt;
        });

        const availCash = Math.max(0, cInflow - cOutflow);
        const availBank = Math.max(0, bInflow - bOutflow);
        const availCard = Math.max(0, kInflow - kOutflow);

        const modeLower = String(paymentMode || 'Cash').toLowerCase();
        let targetAvail = availCash;
        if (modeLower.includes('bank') || modeLower.includes('transfer')) targetAvail = availBank;
        else if (modeLower.includes('card') || modeLower.includes('pos')) targetAvail = availCard;

        if (amtNum > targetAvail) {
          throw new Error(`Insufficient Balance — Available: Rs. ${targetAvail.toLocaleString()}`);
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

        if (partyId) {
          await syncSupplierBalance(partyId, req.shop_id, tx.query);
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
          // Unwind general Khata payment from sales (LIFO - latest sales first)
          let unwindRemaining = amt;
          const allSales = await Sale.find({ shop_id: req.shop_id });
          const custSales = allSales.filter(s => {
            const matchesCust = (entry.partyId && s.customerId === entry.partyId) ||
              (entry.partyName && s.partyName && s.partyName.trim().toLowerCase() === entry.partyName.trim().toLowerCase());
            return matchesCust && Number(s.paidAmount || 0) > 0;
          }).sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());

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
          // Unwind general Supplier settlement from purchases (LIFO)
          let unwindRemaining = amt;
          const allPurchases = await Purchase.find({ shop_id: req.shop_id });
          const supPurchases = allPurchases.filter(p => {
            const matchesSup = (entry.partyId && p.supplierId === entry.partyId) ||
              (entry.partyName && p.supplier && p.supplier.trim().toLowerCase() === entry.partyName.trim().toLowerCase()) ||
              (entry.partyName && p.supplierName && p.supplierName.trim().toLowerCase() === entry.partyName.trim().toLowerCase());
            return matchesSup && Number(p.paidAmount || 0) > 0;
          }).sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());

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
