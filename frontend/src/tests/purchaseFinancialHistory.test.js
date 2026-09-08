import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempOutFile = path.join(__dirname, '_compiled_erp_purchase_history.js');

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

describe('Purchase and Payment Financial Relationship & Continuous History', () => {
  const supplier = {
    id: 101,
    name: 'Aslam Grain Merchant',
    openingBalance: 0
  };

  const purchase1 = {
    id: 1,
    purchaseNo: 'PUR-2026-0001',
    supplierId: 101,
    supplierName: 'Aslam Grain Merchant',
    grandTotal: 10000,
    amount: 10000,
    paidAmount: 0,
    paymentMode: 'Supplier Khata',
    date: '2026-09-01',
    createdAt: '2026-09-01T10:00:00Z'
  };

  it('Step 1: Purchase created for Rs. 10,000 has Due Rs. 10,000 and initial history step', () => {
    const { computePurchaseFinancials } = ERP;
    const fin = computePurchaseFinancials(purchase1, [], [], [purchase1]);

    assert.strictEqual(fin.grossTotal, 10000);
    assert.strictEqual(fin.paid, 0);
    assert.strictEqual(fin.due, 10000);
    assert.ok(fin.status === 'Payable' || fin.status === 'Pending');

    assert.ok(Array.isArray(fin.history));
    assert.strictEqual(fin.history.length, 1);
    assert.strictEqual(fin.history[0].type, 'Purchase');
    assert.strictEqual(fin.history[0].ref, 'PUR-2026-0001');
    assert.strictEqual(fin.history[0].debit, 10000);
    assert.strictEqual(fin.history[0].runningPaid, 0);
    assert.strictEqual(fin.history[0].runningDue, 10000);
    assert.strictEqual(fin.history[0].status, 'Payable');
  });

  it('Step 2: Payment PAY-2636 of Rs. 5,000 linked via purchaseId: Paid Rs. 5,000 → Due Rs. 5,000', () => {
    const { computePurchaseFinancials } = ERP;
    const pay1 = {
      id: 2636,
      ref: 'PAY-2636',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 5000,
      mode: 'Cash',
      purchaseId: 1,
      date: '2026-09-02',
      createdAt: '2026-09-02T11:00:00Z'
    };

    const fin = computePurchaseFinancials(purchase1, [], [pay1], [purchase1]);

    assert.strictEqual(fin.grossTotal, 10000);
    assert.strictEqual(fin.paid, 5000);
    assert.strictEqual(fin.due, 5000);
    assert.strictEqual(fin.status, 'Partial');

    assert.strictEqual(fin.history.length, 2);
    // Step 1: Purchase
    assert.strictEqual(fin.history[0].type, 'Purchase');
    assert.strictEqual(fin.history[0].runningDue, 10000);
    // Step 2: Payment PAY-2636
    assert.strictEqual(fin.history[1].type, 'Payment');
    assert.strictEqual(fin.history[1].ref, 'PAY-2636');
    assert.strictEqual(fin.history[1].credit, 5000);
    assert.strictEqual(fin.history[1].runningPaid, 5000);
    assert.strictEqual(fin.history[1].runningDue, 5000);
    assert.strictEqual(fin.history[1].status, 'Partial');
  });

  it('Step 3: Payment PAY-5354 of Rs. 1,000 linked via purchaseId: Paid Rs. 6,000 → Due Rs. 4,000', () => {
    const { computePurchaseFinancials } = ERP;
    const pay1 = {
      id: 2636,
      ref: 'PAY-2636',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 5000,
      mode: 'Cash',
      purchaseId: 1,
      date: '2026-09-02',
      createdAt: '2026-09-02T11:00:00Z'
    };
    const pay2 = {
      id: 5354,
      ref: 'PAY-5354',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 1000,
      mode: 'Bank Transfer',
      purchaseId: 1,
      date: '2026-09-03',
      createdAt: '2026-09-03T14:00:00Z'
    };

    const fin = computePurchaseFinancials(purchase1, [], [pay1, pay2], [purchase1]);

    assert.strictEqual(fin.grossTotal, 10000);
    assert.strictEqual(fin.paid, 6000);
    assert.strictEqual(fin.due, 4000);
    assert.strictEqual(fin.status, 'Partial');

    assert.strictEqual(fin.history.length, 3);
    // Step 2
    assert.strictEqual(fin.history[1].ref, 'PAY-2636');
    assert.strictEqual(fin.history[1].runningPaid, 5000);
    assert.strictEqual(fin.history[1].runningDue, 5000);
    // Step 3
    assert.strictEqual(fin.history[2].ref, 'PAY-5354');
    assert.strictEqual(fin.history[2].credit, 1000);
    assert.strictEqual(fin.history[2].runningPaid, 6000);
    assert.strictEqual(fin.history[2].runningDue, 4000);
    assert.strictEqual(fin.history[2].status, 'Partial');
  });

  it('Step 4: Later payment PAY-9999 of Rs. 4,000 settles purchase: Paid Rs. 10,000 → Due 0, Settled', () => {
    const { computePurchaseFinancials } = ERP;
    const pay1 = {
      id: 2636,
      ref: 'PAY-2636',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 5000,
      mode: 'Cash',
      purchaseId: 1,
      date: '2026-09-02',
      createdAt: '2026-09-02T11:00:00Z'
    };
    const pay2 = {
      id: 5354,
      ref: 'PAY-5354',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 1000,
      mode: 'Bank Transfer',
      purchaseId: 1,
      date: '2026-09-03',
      createdAt: '2026-09-03T14:00:00Z'
    };
    const pay3 = {
      id: 9999,
      ref: 'PAY-9999',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 4000,
      mode: 'Cash',
      purchaseId: 1,
      date: '2026-09-05',
      createdAt: '2026-09-05T16:00:00Z'
    };

    const fin = computePurchaseFinancials(purchase1, [], [pay1, pay2, pay3], [purchase1]);

    assert.strictEqual(fin.grossTotal, 10000);
    assert.strictEqual(fin.paid, 10000);
    assert.strictEqual(fin.due, 0);
    assert.strictEqual(fin.status, 'Paid');

    assert.strictEqual(fin.history.length, 4);
    assert.strictEqual(fin.history[3].ref, 'PAY-9999');
    assert.strictEqual(fin.history[3].runningPaid, 10000);
    assert.strictEqual(fin.history[3].runningDue, 0);
    assert.strictEqual(fin.history[3].status, 'Settled');
  });

  it('Step 5: Strict Isolation: Payments for a different purchase are NEVER mixed into Purchase 1', () => {
    const { computePurchaseFinancials } = ERP;
    const purchase2 = {
      id: 2,
      purchaseNo: 'PUR-2026-0002',
      supplierId: 101,
      supplierName: 'Aslam Grain Merchant',
      grandTotal: 5000,
      amount: 5000,
      paidAmount: 0,
      paymentMode: 'Supplier Khata',
      date: '2026-09-04',
      createdAt: '2026-09-04T10:00:00Z'
    };

    const payP1 = {
      id: 2636,
      ref: 'PAY-2636',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 5000,
      mode: 'Cash',
      purchaseId: 1,
      date: '2026-09-02',
      createdAt: '2026-09-02T11:00:00Z'
    };

    const payP2 = {
      id: 7777,
      ref: 'PAY-7777',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 2000,
      mode: 'Cash',
      purchaseId: 2,
      date: '2026-09-06',
      createdAt: '2026-09-06T12:00:00Z'
    };

    const allPurchases = [purchase1, purchase2];
    const allLogs = [payP1, payP2];

    const fin1 = computePurchaseFinancials(purchase1, [], allLogs, allPurchases);
    const fin2 = computePurchaseFinancials(purchase2, [], allLogs, allPurchases);

    // Purchase 1 only sees PAY-2636 (paid 5,000, due 5,000)
    assert.strictEqual(fin1.paid, 5000);
    assert.strictEqual(fin1.due, 5000);
    assert.strictEqual(fin1.history.length, 2);
    assert.strictEqual(fin1.history[1].ref, 'PAY-2636');

    // Purchase 2 only sees PAY-7777 (paid 2,000, due 3,000)
    assert.strictEqual(fin2.paid, 2000);
    assert.strictEqual(fin2.due, 3000);
    assert.strictEqual(fin2.history.length, 2);
    assert.strictEqual(fin2.history[1].ref, 'PAY-7777');
  });

  it('Step 6: computeLedgerStatement displays chronological sequence with linked purchase reference and running balance', () => {
    const { computeLedgerStatement } = ERP;
    const pay1 = {
      id: 2636,
      ref: 'PAY-2636',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 5000,
      mode: 'Cash',
      purchaseId: 1,
      date: '2026-09-02',
      createdAt: '2026-09-02T11:00:00Z'
    };
    const pay2 = {
      id: 5354,
      ref: 'PAY-5354',
      partyId: 101,
      partyName: 'Aslam Grain Merchant',
      type: 'Supplier',
      amount: 1000,
      mode: 'Bank Transfer',
      purchaseId: 1,
      date: '2026-09-03',
      createdAt: '2026-09-03T14:00:00Z'
    };

    const statement = computeLedgerStatement(supplier, {
      purchases: [purchase1],
      paymentLogs: [pay1, pay2],
      isSupplier: true
    });

    const entries = statement.chronologicalEntries;
    assert.strictEqual(entries.length, 3);

    // Entry 1: PUR-2026-0001 (Debit 10,000, Running 10,000)
    assert.strictEqual(entries[0].ref, 'PUR-2026-0001');
    assert.strictEqual(entries[0].debit, 10000);
    assert.strictEqual(entries[0].credit, 0);
    assert.strictEqual(entries[0].runningBalance, 10000);

    // Entry 2: PAY-2636 (Credit 5,000, Running 5,000)
    assert.strictEqual(entries[1].ref, 'PAY-2636');
    assert.strictEqual(entries[1].purchaseNo, 'PUR-2026-0001');
    assert.strictEqual(entries[1].credit, 5000);
    assert.strictEqual(entries[1].runningBalance, 5000);

    // Entry 3: PAY-5354 (Credit 1,000, Running 4,000)
    assert.strictEqual(entries[2].ref, 'PAY-5354');
    assert.strictEqual(entries[2].purchaseNo, 'PUR-2026-0001');
    assert.strictEqual(entries[2].credit, 1000);
    assert.strictEqual(entries[2].runningBalance, 4000);
  });
});
