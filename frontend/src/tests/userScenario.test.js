/**
 * EXACT USER-SPECIFIED SCENARIO TEST
 *
 * Purchase 1: Rs. 10,000 | Paid at creation Rs. 4,000 | Return Rs. 7,000 | Refund Rs. 1,000 | Payable Rs. 0 | Settled
 * Purchase 2: Rs. 5,000  | Paid at creation Rs. 0     | Payable Rs. 5,000
 * New Payment: Rs. 2,000 explicitly for Purchase 2
 *
 * EXPECTED:
 * Purchase 1 → unchanged: paid=4000, return=7000, refund=1000, payable=0, Settled
 * Purchase 2 → paid=2000, due=3000, Partial
 * Supplier aggregate → gross=15000, returns=7000, net=8000, paid=6000, refund=1000, payable=3000
 */
import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempOutFile = path.join(__dirname, '_compiled_erp_user_scenario.js');

let ERP;

before(async () => {
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '../context/ERPContext.jsx')],
    bundle: true,
    format: 'esm',
    outfile: tempOutFile,
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:5000/api'),
      'import.meta.env': JSON.stringify({})
    },
    external: ['react', 'react-dom', 'react-router-dom', 'lucide-react']
  });
  ERP = await import(pathToFileURL(tempOutFile).href);
});

after(() => {
  if (fs.existsSync(tempOutFile)) {
    fs.unlinkSync(tempOutFile);
  }
});

describe('User Exact Scenario: Purchase 1 Return+Refund → Purchase 2 with Later Payment', () => {

  // =========================================================
  // SHARED FIXTURES
  // =========================================================

  const supplier = { id: 'SUP-01', name: 'Test Supplier', balance: 0, openingBalance: 0 };

  // Purchase 1: Rs. 10,000, paid Rs. 4,000 at creation via Cash
  const purchase1 = {
    id: 'PUR-A1',
    purchaseNo: 'PUR-2026-0001',
    supplierId: 'SUP-01',
    supplier: 'Test Supplier',
    supplierName: 'Test Supplier',
    amount: 10000,
    grandTotal: 10000,
    paidAmount: 4000,
    paymentMode: 'Cash',
    paymentStatus: 'Partial',
    status: 'Partial',
    date: '01/09/2026',
    created_at: '2026-09-01T06:00:00.000Z'
  };

  // Upfront payment log created when Purchase 1 was submitted (linked via purchaseId)
  const upfrontLog_P1 = {
    id: 'PAY-UP-001',
    ref: 'PAY-0001',
    purchaseId: 'PUR-A1',
    partyId: 'SUP-01',
    partyName: 'Test Supplier',
    partyType: 'Supplier',
    type: 'Supplier',
    amount: 4000,
    mode: 'Cash',
    date: '01/09/2026',
    created_at: '2026-09-01T06:00:01.000Z'
  };

  // Purchase Return on Purchase 1: Rs. 7,000 goods returned, Rs. 1,000 cash refund (paid > net)
  // Net after return = 10,000 - 7,000 = 3,000; Paid = 4,000 → overpaid by 1,000 → refund Rs. 1,000
  const purchaseReturn1 = {
    id: 'PR-001',
    returnNo: 'PR-2026-0001',
    purchaseId: 'PUR-A1',
    purchaseNo: 'PUR-2026-0001',
    supplierId: 'SUP-01',
    supplierName: 'Test Supplier',
    items: [
      { productId: 'PROD-1', name: 'Rice', qty: 70, rate: 100, totalAmount: 7000 }
    ],
    refundAmount: 1000,
    refundMode: 'Cash',
    date: '01/09/2026',
    created_at: '2026-09-01T10:00:00.000Z'
  };

  // Purchase 2: Rs. 5,000, paid Rs. 0 at creation (Supplier Khata)
  const purchase2 = {
    id: 'PUR-B2',
    purchaseNo: 'PUR-2026-0002',
    supplierId: 'SUP-01',
    supplier: 'Test Supplier',
    supplierName: 'Test Supplier',
    amount: 5000,
    grandTotal: 5000,
    paidAmount: 0,
    paymentMode: 'Supplier Khata',
    paymentStatus: 'Pending',
    status: 'Pending',
    date: '02/09/2026',
    created_at: '2026-09-02T06:00:00.000Z'
  };

  // New standalone payment: Rs. 2,000 explicitly linked to Purchase 2
  const linkedLog_P2 = {
    id: 'PAY-LNK-002',
    ref: 'PAY-0002',
    purchaseId: 'PUR-B2',
    partyId: 'SUP-01',
    partyName: 'Test Supplier',
    partyType: 'Supplier',
    type: 'Supplier',
    amount: 2000,
    mode: 'Cash',
    date: '03/09/2026',
    created_at: '2026-09-03T08:00:00.000Z'
  };

  const allPurchases = [purchase1, purchase2];
  const allReturns = [purchaseReturn1];
  const allLogs_before_p2_payment = [upfrontLog_P1];
  const allLogs_after_p2_payment  = [upfrontLog_P1, linkedLog_P2];

  // =========================================================
  // PHASE 1: Before Rs. 2,000 payment is made
  // =========================================================
  it('Phase 1 — Before new payment: Purchase 1 is settled, Purchase 2 is pending', () => {
    const { computePurchaseFinancials } = ERP;

    // Purchase 1: net = 10000 - 7000 = 3000, paid = 4000 → due = 0, refund = 1000
    const fin1 = computePurchaseFinancials(purchase1, allReturns, allLogs_before_p2_payment, allPurchases);
    assert.strictEqual(fin1.grossTotal, 10000,  'P1: gross must be 10000');
    assert.strictEqual(fin1.returnAmount, 7000,  'P1: return must be 7000');
    assert.strictEqual(fin1.netTotal, 3000,      'P1: net must be 3000');
    assert.strictEqual(fin1.paid, 4000,          'P1: paid must be 4000');
    assert.strictEqual(fin1.due, 0,              'P1: due must be 0');
    assert.strictEqual(fin1.refundCashback, 1000,'P1: refund must be 1000');

    // Purchase 2: no logs, no returns → paid = 0, due = 5000
    const fin2 = computePurchaseFinancials(purchase2, allReturns, allLogs_before_p2_payment, allPurchases);
    assert.strictEqual(fin2.grossTotal, 5000,    'P2: gross must be 5000');
    assert.strictEqual(fin2.returnAmount, 0,     'P2: return must be 0');
    assert.strictEqual(fin2.paid, 0,             'P2: paid must be 0 (no payment yet)');
    assert.strictEqual(fin2.due, 5000,           'P2: due must be 5000');
  });

  // =========================================================
  // PHASE 2: After Rs. 2,000 linked payment to Purchase 2
  // =========================================================
  it('Phase 2A — After new linked payment: Purchase 1 MUST remain completely unchanged', () => {
    const { computePurchaseFinancials } = ERP;

    const fin1 = computePurchaseFinancials(purchase1, allReturns, allLogs_after_p2_payment, allPurchases);
    assert.strictEqual(fin1.grossTotal, 10000,   'P1 unchanged: gross must be 10000');
    assert.strictEqual(fin1.returnAmount, 7000,   'P1 unchanged: return must be 7000');
    assert.strictEqual(fin1.netTotal, 3000,       'P1 unchanged: net must be 3000');
    assert.strictEqual(fin1.paid, 4000,           'P1 unchanged: paid must stay 4000 — NOT affected by P2 payment');
    assert.strictEqual(fin1.due, 0,               'P1 unchanged: due must be 0');
    assert.strictEqual(fin1.refundCashback, 1000, 'P1 unchanged: refund must be 1000');
  });

  it('Phase 2B — After new linked payment: Purchase 2 MUST show paid=2000, due=3000, Partial', () => {
    const { computePurchaseFinancials } = ERP;

    const fin2 = computePurchaseFinancials(purchase2, allReturns, allLogs_after_p2_payment, allPurchases);
    assert.strictEqual(fin2.grossTotal, 5000,    'P2: gross must be 5000');
    assert.strictEqual(fin2.returnAmount, 0,     'P2: return must be 0');
    assert.strictEqual(fin2.netTotal, 5000,      'P2: net must be 5000');
    assert.strictEqual(fin2.paid, 2000,          'P2: paid must be 2000 (the linked Rs. 2,000 payment)');
    assert.strictEqual(fin2.due, 3000,           'P2: due must be 3000');
    assert.strictEqual(fin2.status, 'Partial',   'P2: status must be Partial');
  });

  it('Phase 2C — Supplier aggregate totals must be exactly correct', () => {
    const { computeSupplierKhataBalance } = ERP;

    const khata = computeSupplierKhataBalance(supplier, allPurchases, allLogs_after_p2_payment, allReturns);

    // Gross purchases: 10000 + 5000 = 15000
    assert.strictEqual(khata.totalPurchase, 15000,   'Gross purchases must be 15000');
    // Returns: 7000
    assert.strictEqual(khata.returnAmount, 7000,     'Returns must be 7000');
    // Net: 8000
    assert.strictEqual(khata.netPurchase, 8000,      'Net purchases must be 8000');
    // Payments made: 4000 (P1 upfront) + 2000 (P2 linked) = 6000
    // (NOT 4000 + 4000 = 8000 — must NOT double-count P1 paidAmount AND its log)
    assert.strictEqual(khata.totalPaid, 6000,        'Total paid must be 6000 (no double-counting)');
    // Refund cashback from return: 1000
    assert.strictEqual(khata.refundCashback, 1000,   'Refund cashback must be 1000');
    // Payable: 8000 net - 6000 paid + 1000 refund = 3000
    assert.strictEqual(khata.payableDue, 3000,       'Final supplier payable must be 3000');
  });

  // =========================================================
  // PHASE 3: Double-count prevention — P1 paidAmount vs its log
  // =========================================================
  it('Phase 3 — The upfront log (PAY-UP-001) for P1 must NOT be counted twice', () => {
    const { computePurchaseFinancials } = ERP;

    // P1 has paidAmount=4000 AND a payment log linked via purchaseId=PUR-A1 for 4000.
    // The system must only count 4000 once, not 4000 + 4000 = 8000.
    const fin1 = computePurchaseFinancials(purchase1, allReturns, allLogs_after_p2_payment, allPurchases);
    assert.strictEqual(fin1.paid, 4000, 'P1 paid must be exactly 4000 — not double-counted as 8000');
    assert.strictEqual(fin1.due, 0,    'P1 due must be 0');
  });

  // =========================================================
  // PHASE 4: The Rs. 2,000 linked payment must ONLY belong to P2
  // =========================================================
  it('Phase 4 — The linked Rs. 2,000 payment (purchaseId=PUR-B2) must ONLY credit Purchase 2', () => {
    const { computePurchaseFinancials } = ERP;

    // P1 must not absorb the 2000 P2 payment
    const fin1 = computePurchaseFinancials(purchase1, allReturns, allLogs_after_p2_payment, allPurchases);
    assert.strictEqual(fin1.paid, 4000, 'P1 paid must still be 4000, not 6000');

    // P2 must absorb exactly its own linked 2000
    const fin2 = computePurchaseFinancials(purchase2, allReturns, allLogs_after_p2_payment, allPurchases);
    assert.strictEqual(fin2.paid, 2000, 'P2 paid must be 2000 from its own linked payment');
  });

  // =========================================================
  // PHASE 5: Unlinked payment must NEVER be allocated or shifted to P1 or P2
  // =========================================================
  it('Phase 5 — Unlinked payment must NEVER be allocated or shifted to P1 or P2: each purchase remains strictly independent', () => {
    const { computePurchaseFinancials } = ERP;

    // Simulate: P1 settled (net=3000, paid=4000), P2 outstanding (5000)
    // An unlinked general payment of 2000 made AFTER both purchases exist
    const unlinkedLog = {
      id: 'PAY-UNLINKED',
      ref: 'PAY-UNLINKED',
      // NO purchaseId
      partyId: 'SUP-01',
      partyName: 'Test Supplier',
      partyType: 'Supplier',
      type: 'Supplier',
      amount: 2000,
      mode: 'Cash',
      date: '04/09/2026',
      created_at: '2026-09-04T08:00:00.000Z'
    };

    const logs = [upfrontLog_P1, unlinkedLog];

    // P1 is settled and must not receive unlinked payment
    const fin1 = computePurchaseFinancials(purchase1, allReturns, logs, allPurchases);
    assert.strictEqual(fin1.paid, 4000, 'P1 paid must not increase — strictly independent');
    assert.strictEqual(fin1.due, 0, 'P1 due must remain 0');

    // P2 must NOT receive unlinked payment — payments must be linked to exact purchase
    const fin2 = computePurchaseFinancials(purchase2, allReturns, logs, allPurchases);
    assert.strictEqual(fin2.paid, 0, 'P2 paid must remain 0 since payment was not linked to P2');
    assert.strictEqual(fin2.due, 5000, 'P2 due must remain 5000');
  });

  // =========================================================
  // PHASE 6: Payment deletion must NOT corrupt historical invoices
  // =========================================================
  it('Phase 6 — After deleting P2 payment, P2 reverts to unpaid but P1 remains settled', () => {
    const { computePurchaseFinancials } = ERP;

    // Simulate deletion: remove linkedLog_P2 from logs
    const logsAfterDeletion = [upfrontLog_P1]; // P2 payment removed

    // P1 must remain unchanged
    const fin1 = computePurchaseFinancials(purchase1, allReturns, logsAfterDeletion, allPurchases);
    assert.strictEqual(fin1.paid, 4000, 'P1 paid stays 4000 after P2 payment deleted');
    assert.strictEqual(fin1.due, 0,     'P1 due stays 0 after P2 payment deleted');

    // P2 reverts to unpaid
    const fin2 = computePurchaseFinancials(purchase2, allReturns, logsAfterDeletion, allPurchases);
    assert.strictEqual(fin2.paid, 0,    'P2 reverts to paid=0 after payment deleted');
    assert.strictEqual(fin2.due, 5000,  'P2 reverts to due=5000 after payment deleted');
  });

  // =========================================================
  // PHASE 7: Multiple payments to same purchase — no double count
  // =========================================================
  it('Phase 7 — Two separate linked payments to P2 (1000 + 1500) = 2500 paid, due = 2500', () => {
    const { computePurchaseFinancials } = ERP;

    const pay1 = {
      id: 'PAY-P2-A', ref: 'PAY-P2-A', purchaseId: 'PUR-B2',
      partyId: 'SUP-01', partyName: 'Test Supplier', partyType: 'Supplier', type: 'Supplier',
      amount: 1000, mode: 'Cash', date: '03/09/2026', created_at: '2026-09-03T08:00:00.000Z'
    };
    const pay2 = {
      id: 'PAY-P2-B', ref: 'PAY-P2-B', purchaseId: 'PUR-B2',
      partyId: 'SUP-01', partyName: 'Test Supplier', partyType: 'Supplier', type: 'Supplier',
      amount: 1500, mode: 'Bank', date: '04/09/2026', created_at: '2026-09-04T09:00:00.000Z'
    };

    const logs = [upfrontLog_P1, pay1, pay2];

    const fin2 = computePurchaseFinancials(purchase2, allReturns, logs, allPurchases);
    assert.strictEqual(fin2.paid, 2500, 'P2 paid must be 1000 + 1500 = 2500');
    assert.strictEqual(fin2.due, 2500,  'P2 due must be 5000 - 2500 = 2500');

    // P1 still untouched
    const fin1 = computePurchaseFinancials(purchase1, allReturns, logs, allPurchases);
    assert.strictEqual(fin1.paid, 4000, 'P1 paid still 4000');
    assert.strictEqual(fin1.due, 0,     'P1 due still 0');
  });

  // =========================================================
  // PHASE 8: Same-day purchases must not cross-allocate
  // =========================================================
  it('Phase 8 — Two purchases on same day with separate linked payments do not cross-allocate', () => {
    const { computePurchaseFinancials } = ERP;

    const sameDayP1 = {
      id: 'SD-P1', purchaseNo: 'PUR-SD-01', supplierId: 'SUP-01', supplier: 'Test Supplier',
      amount: 3000, grandTotal: 3000, paidAmount: 0, paymentMode: 'Supplier Khata',
      status: 'Pending', date: '05/09/2026', created_at: '2026-09-05T06:00:00.000Z'
    };
    const sameDayP2 = {
      id: 'SD-P2', purchaseNo: 'PUR-SD-02', supplierId: 'SUP-01', supplier: 'Test Supplier',
      amount: 7000, grandTotal: 7000, paidAmount: 0, paymentMode: 'Supplier Khata',
      status: 'Pending', date: '05/09/2026', created_at: '2026-09-05T06:01:00.000Z'
    };
    const paySD1 = {
      id: 'PAY-SD-1', ref: 'PAY-SD-1', purchaseId: 'SD-P1',
      partyId: 'SUP-01', partyName: 'Test Supplier', partyType: 'Supplier', type: 'Supplier',
      amount: 1500, mode: 'Cash', date: '06/09/2026', created_at: '2026-09-06T08:00:00.000Z'
    };
    const paySD2 = {
      id: 'PAY-SD-2', ref: 'PAY-SD-2', purchaseId: 'SD-P2',
      partyId: 'SUP-01', partyName: 'Test Supplier', partyType: 'Supplier', type: 'Supplier',
      amount: 4000, mode: 'Cash', date: '06/09/2026', created_at: '2026-09-06T08:01:00.000Z'
    };

    const sdPurchases = [sameDayP1, sameDayP2];
    const sdLogs = [paySD1, paySD2];

    const finSD1 = computePurchaseFinancials(sameDayP1, [], sdLogs, sdPurchases);
    assert.strictEqual(finSD1.paid, 1500, 'SD-P1 paid must be 1500 only');
    assert.strictEqual(finSD1.due, 1500,  'SD-P1 due must be 1500');

    const finSD2 = computePurchaseFinancials(sameDayP2, [], sdLogs, sdPurchases);
    assert.strictEqual(finSD2.paid, 4000, 'SD-P2 paid must be 4000 only');
    assert.strictEqual(finSD2.due, 3000,  'SD-P2 due must be 3000');
  });
});
