import { Ledger } from '../models/ledger.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';
import { SaleReturn } from '../models/saleReturn.model.js';
import { PurchaseReturn } from '../models/purchaseReturn.model.js';
import { withTransaction, run, query } from '../services/db.service.js';
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

/**
 * Recompute a purchase's paidAmount strictly from the payment_logs table.
 *
 * CANONICAL RULE: purchases.paidAmount = SUM of all payment_logs WHERE purchaseId = <id>
 *
 * This is the single source of truth for invoice-level payment.
 * The creation-time paidAmount is ONLY used for the initial upfront payment log that
 * was inserted during purchase creation. After that, the column tracks the sum of logs.
 *
 * Returns: { totalPaid, paymentStatus }
 */
const recomputePurchasePaidFromLogs = async (purchaseId, shop_id) => {
  if (!purchaseId || !shop_id) return null;

  const pur = await Purchase.findById(purchaseId, shop_id);
  if (!pur) return null;

  // Sum all valid payment logs explicitly linked to this purchase
  const logs = await query(
    `SELECT amount FROM payment_logs
     WHERE shop_id = $1 AND purchaseId = $2
     AND LOWER(mode) NOT IN ('opening balance', 'credit note', 'debit note', 'supplier khata', 'purchase return', 'purchase', 'bill')`,
    [shop_id, purchaseId]
  );
  const totalFromLogs = logs.reduce((sum, l) => sum + Number(l.amount || 0), 0);

  // The purchase may have had an upfront creation payment that was stored in paidAmount
  // but NOT necessarily in payment_logs (older records). Check if there is already a log.
  // If at least one log exists, we use the log sum as the authoritative paid amount.
  // If no logs exist at all, fall back to the stored paidAmount (creation-time upfront).
  const allLogsForPurchase = await query(
    `SELECT id FROM payment_logs WHERE shop_id = $1 AND purchaseId = $2`,
    [shop_id, purchaseId]
  );

  let canonicalPaid;
  if (allLogsForPurchase.length > 0) {
    // Logs exist — sum is authoritative. This prevents double-counting paidAmount+log.
    canonicalPaid = totalFromLogs;
  } else {
    // No logs exist — use stored paidAmount (creation-time value, e.g. upfront cash without a log).
    canonicalPaid = Number(pur.paidAmount || 0);
  }

  // Compute net dueable total from grandTotal and returnAmount
  const grandTotal = Number(pur.grandTotal || pur.amount || 0);
  const returnAmount = Number(pur.returnAmount || 0);
  const netDueable = Math.max(0, grandTotal - returnAmount);

  const isReturned = (pur.paymentStatus === 'Returned') || (pur.status === 'Returned') || (returnAmount >= (grandTotal - 0.5) && grandTotal > 0);

  const newStatus =
    isReturned
      ? 'Returned'
      : (canonicalPaid >= netDueable && netDueable > 0
        ? 'Paid'
        : canonicalPaid > 0
          ? 'Partial'
          : 'Pending');

  await Purchase.findByIdAndUpdate(purchaseId, {
    paidAmount: canonicalPaid,
    paymentStatus: newStatus
  }, { shop_id });

  return { totalPaid: canonicalPaid, paymentStatus: newStatus };
};

/**
 * Mirror for sales — recompute sale.paidAmount from its canonical transactions.
 * Strict Source-of-Truth Hierarchy for Initial POS Payment:
 * 1. Existing POS-PAY log for this sale in payment_logs.
 * 2. Immutable sale.initialPaidAmount stored on the sale record.
 * 3. Legacy sale.paidAmount ONLY if there are no non-POS payment logs for this sale at all.
 * 4. Never treat a later non-POS payment as the initial payment.
 * 5. If backfilling a missing POS log, only backfill the true initial payment.
 */
const recomputeSalePaidFromLogs = async (saleId, shop_id) => {
  if (!saleId || !shop_id) return null;

  const sale = await Sale.findById(saleId, shop_id);
  if (!sale) return null;

  const logs = await query(
    `SELECT amount, ref, mode FROM payment_logs
     WHERE shop_id = $1 AND saleId = $2
     AND LOWER(mode) NOT IN ('opening balance', 'credit note', 'debit note')`,
    [shop_id, saleId]
  );

  const posLogs = logs.filter(l =>
    String(l.ref || '').includes('POS-PAY') ||
    String(l.mode || '').toLowerCase().includes('pos')
  );
  const nonPosLogs = logs.filter(l =>
    !String(l.ref || '').includes('POS-PAY') &&
    !String(l.mode || '').toLowerCase().includes('pos')
  );

  const totalPosFromLogs = posLogs.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalNonPosLogs = nonPosLogs.reduce((sum, l) => sum + Number(l.amount || 0), 0);

  let initialPosPayment = 0;
  if (posLogs.length > 0) {
    // 1. Existing POS-PAY log for this sale
    initialPosPayment = totalPosFromLogs;
  } else if (sale.initialPaidAmount !== undefined && Number(sale.initialPaidAmount) >= 0) {
    // 2. Immutable initialPaidAmount stored on sale
    initialPosPayment = Number(sale.initialPaidAmount);
  } else if (nonPosLogs.length === 0) {
    // 3. Legacy paidAmount ONLY if there is no payment history at all
    initialPosPayment = Number(sale.paidAmount || 0);
  } else {
    // Non-POS logs already exist, but no POS-PAY log or initialPaidAmount exists.
    // Ensure we do not treat later non-POS payment as initial payment.
    const legacyPaid = Number(sale.paidAmount || 0);
    initialPosPayment = legacyPaid > totalNonPosLogs ? (legacyPaid - totalNonPosLogs) : 0;
  }

  // If initialPosPayment > 0 and no POS-PAY log exists yet in payment_logs, persist it permanently
  if (initialPosPayment > 0 && posLogs.length === 0) {
    const invSuffix = String(sale.invoiceNo || sale.id).split('-').pop();
    await Ledger.create({
      shop_id,
      partyId: sale.customerId || null,
      partyType: 'Customer',
      partyName: sale.partyName || 'Customer',
      amount: initialPosPayment,
      mode: `${sale.paymentMode || 'Cash'} (POS)`,
      date: sale.date || new Date().toLocaleDateString('en-GB'),
      ref: `POS-PAY-${invSuffix}`,
      note: `Initial POS Payment on Invoice (${sale.invoiceNo})`,
      saleId: sale.id
    });
  }

  const canonicalPaid = initialPosPayment + totalNonPosLogs;

  const total = Number(sale.amount || sale.grandTotal || 0);
  const returnAmount = Number(sale.returnAmount || 0);
  const netDueable = Math.max(0, total - returnAmount);

  const isFull = (returnAmount >= total && total > 0) || (netDueable === 0 && total > 0);
  const newStatus = isFull
    ? 'Returned'
    : (canonicalPaid >= netDueable && netDueable > 0
      ? 'Paid'
      : (canonicalPaid > 0
        ? 'Partial'
        : 'Pending'));

  await Sale.findByIdAndUpdate(sale.id, {
    paidAmount: canonicalPaid,
    initialPaidAmount: initialPosPayment,
    status: newStatus
  }, { shop_id });

  return { totalPaid: canonicalPaid, status: newStatus };
};


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
    const { partyId, partyName, partyType, amount, paymentMode = 'Cash', note = '', date = null, saleId = null, purchaseId = null } = req.body;
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
      let dateStr = new Date().toLocaleDateString('en-GB');
      if (date && typeof date === 'string') {
        if (date.includes('-')) {
          const parts = date.split('T')[0].split('-');
          if (parts.length === 3) {
            dateStr = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
          }
        } else if (date.includes('/')) {
          dateStr = date;
        }
      }
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

        // Update the linked sale's paidAmount from its logs (canonical source of truth)
        if (saleId) {
          await recomputeSalePaidFromLogs(saleId, req.shop_id);
        }

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

        // ---------------------------------------------------------------
        // CANONICAL SOURCE OF TRUTH UPDATE:
        // When a payment is explicitly linked to a purchaseId, recompute
        // that purchase's paidAmount from the sum of all its payment_logs.
        // This ensures:
        //   1. No double-counting of creation-time paidAmount + log amount.
        //   2. The DB column reflects exactly what has been paid for THIS invoice.
        //   3. Other invoices are NEVER touched.
        // ---------------------------------------------------------------
        if (purchaseId) {
          await recomputePurchasePaidFromLogs(purchaseId, req.shop_id);
        }

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
      // Delete the entry FIRST so that recompute helpers see the remaining logs
      await Ledger.findByIdAndDelete(id, req.shop_id);

      if (entry.partyType === 'Customer') {
        if (entry.saleId) {
          // Recompute the specific sale's paidAmount from its REMAINING logs (post-deletion)
          await recomputeSalePaidFromLogs(entry.saleId, req.shop_id);
        }
        // Sync the customer's aggregate balance
        if (entry.partyId) {
          await syncCustomerBalance(entry.partyId, req.shop_id, tx.query);
        }

      } else if (entry.partyType === 'Supplier') {
        if (entry.purchaseId) {
          // ---------------------------------------------------------------
          // CANONICAL DELETE REVERSAL:
          // Recompute the specific purchase's paidAmount from its REMAINING
          // payment_logs after deletion. This is always safe because:
          //   - It only touches the ONE purchase the payment belonged to.
          //   - It reads actual DB state (no stale column math).
          //   - Other purchases with paidAmount > 0 are NEVER modified.
          //   - A settled purchase that later receives a refund stays settled.
          // ---------------------------------------------------------------
          await recomputePurchasePaidFromLogs(entry.purchaseId, req.shop_id);
        }
        // NOTE: We intentionally do NOT run a FIFO unwind on unlinked payments.
        // Unlinked payments affect only the supplier's aggregate balance (via syncSupplierBalance).
        // Individual invoice paidAmount columns are ONLY updated when a payment is explicitly
        // linked to a purchaseId. This preserves historical transaction identity.

        // Sync the supplier's aggregate balance
        if (entry.partyId) {
          await syncSupplierBalance(entry.partyId, req.shop_id, tx.query);
        }
      }
    });

    return res.json({ success: true, message: 'Payment entry reversed and deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
