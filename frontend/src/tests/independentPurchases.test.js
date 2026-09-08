import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempOutFile = path.join(__dirname, '_compiled_erp_independent_purchases.js');

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

describe('Independent Purchases from Same Supplier Test Suite', () => {
  const supplier = {
    id: 'SUP-SAMENAME',
    name: 'Haji Shafi Grain Merchants',
    balance: 0,
    openingBalance: 0
  };

  const purchase1 = {
    id: 'PUR-001',
    purchaseNo: 'PUR-2026-0001',
    supplierId: 'SUP-SAMENAME',
    supplierName: 'Haji Shafi Grain Merchants',
    amount: 10000,
    grandTotal: 10000,
    paidAmount: 4000,
    paymentMode: 'Cash',
    status: 'Partial',
    date: '01/09/2026',
    created_at: '2026-09-01T08:00:00.000Z'
  };

  const upfrontLog_P1 = {
    id: 'PAY-P1-UPFRONT',
    ref: 'PAY-PUR-001',
    purchaseId: 'PUR-001',
    partyId: 'SUP-SAMENAME',
    partyName: 'Haji Shafi Grain Merchants',
    type: 'Supplier',
    amount: 4000,
    mode: 'Cash',
    date: '01/09/2026',
    created_at: '2026-09-01T08:00:05.000Z'
  };

  const purchase2 = {
    id: 'PUR-002',
    purchaseNo: 'PUR-2026-0002',
    supplierId: 'SUP-SAMENAME',
    supplierName: 'Haji Shafi Grain Merchants',
    amount: 5000,
    grandTotal: 5000,
    paidAmount: 0,
    paymentMode: 'Supplier Khata',
    status: 'Pending',
    date: '02/09/2026',
    created_at: '2026-09-02T10:00:00.000Z'
  };

  const return_P1 = {
    id: 'PR-001',
    returnNo: 'PR-2026-0001',
    purchaseId: 'PUR-001',
    purchaseNo: 'PUR-2026-0001',
    supplierId: 'SUP-SAMENAME',
    supplierName: 'Haji Shafi Grain Merchants',
    items: [
      { productId: 'P-1', name: 'Wheat', qty: 70, rate: 100, totalAmount: 7000 }
    ],
    refundAmount: 1000,
    refundMode: 'Cash',
    date: '03/09/2026',
    created_at: '2026-09-03T11:00:00.000Z'
  };

  const payment_P2 = {
    id: 'PAY-P2-DIRECT',
    ref: 'PAY-PUR-002',
    purchaseId: 'PUR-002',
    partyId: 'SUP-SAMENAME',
    partyName: 'Haji Shafi Grain Merchants',
    type: 'Supplier',
    amount: 2000,
    mode: 'Bank',
    date: '04/09/2026',
    created_at: '2026-09-04T12:00:00.000Z'
  };

  const unlinkedGeneralPayment = {
    id: 'PAY-UNLINKED-99',
    ref: 'PAY-UNLINKED-99',
    partyId: 'SUP-SAMENAME',
    partyName: 'Haji Shafi Grain Merchants',
    type: 'Supplier',
    amount: 1500,
    mode: 'Cash',
    date: '05/09/2026',
    created_at: '2026-09-05T09:00:00.000Z'
  };

  const allPurchases = [purchase1, purchase2];

  it('1. Initial State: Purchase 1 and Purchase 2 have independent financials', () => {
    const { computePurchaseFinancials } = ERP;
    const fin1 = computePurchaseFinancials(purchase1, [], [upfrontLog_P1], allPurchases);
    assert.strictEqual(fin1.grossTotal, 10000);
    assert.strictEqual(fin1.paid, 4000);
    assert.strictEqual(fin1.due, 6000);
    assert.strictEqual(fin1.status, 'Partial');

    const fin2 = computePurchaseFinancials(purchase2, [], [upfrontLog_P1], allPurchases);
    assert.strictEqual(fin2.grossTotal, 5000);
    assert.strictEqual(fin2.paid, 0);
    assert.strictEqual(fin2.due, 5000);
    assert.strictEqual(fin2.status, 'Pending');
  });

  it('2. Return & Refund on Purchase 1 must NOT reduce Purchase 2 due', () => {
    const { computePurchaseFinancials } = ERP;
    const returns = [return_P1];
    const logs = [upfrontLog_P1];

    // Purchase 1: 10,000 gross - 7,000 return = 3,000 net; 4,000 paid => 0 due, 1,000 refund/cashback, Paid status
    const fin1 = computePurchaseFinancials(purchase1, returns, logs, allPurchases);
    assert.strictEqual(fin1.netTotal, 3000);
    assert.strictEqual(fin1.paid, 4000);
    assert.strictEqual(fin1.due, 0);
    assert.strictEqual(fin1.refundCashback, 1000);
    assert.strictEqual(fin1.status, 'Paid');

    // Purchase 2: Must be completely unaffected — due MUST remain 5,000
    const fin2 = computePurchaseFinancials(purchase2, returns, logs, allPurchases);
    assert.strictEqual(fin2.grossTotal, 5000);
    assert.strictEqual(fin2.netTotal, 5000);
    assert.strictEqual(fin2.paid, 0);
    assert.strictEqual(fin2.due, 5000, 'Purchase 2 due must NOT absorb Purchase 1 refund');
    assert.strictEqual(fin2.status, 'Pending');
  });

  it('3. Payment on Purchase 2 must ONLY credit Purchase 2, leaving Purchase 1 untouched', () => {
    const { computePurchaseFinancials } = ERP;
    const returns = [return_P1];
    const logs = [upfrontLog_P1, payment_P2];

    const fin2 = computePurchaseFinancials(purchase2, returns, logs, allPurchases);
    assert.strictEqual(fin2.paid, 2000, 'Purchase 2 paid must be 2000');
    assert.strictEqual(fin2.due, 3000, 'Purchase 2 due must be 3000');
    assert.strictEqual(fin2.status, 'Partial');

    // Purchase 1 remains completely unchanged
    const fin1 = computePurchaseFinancials(purchase1, returns, logs, allPurchases);
    assert.strictEqual(fin1.paid, 4000, 'Purchase 1 paid must remain 4000');
    assert.strictEqual(fin1.due, 0, 'Purchase 1 due must remain 0');
    assert.strictEqual(fin1.refundCashback, 1000);
    assert.strictEqual(fin1.status, 'Paid');
  });

  it('4. Unlinked payment must NEVER be auto-allocated or shifted to either purchase', () => {
    const { computePurchaseFinancials } = ERP;
    const returns = [return_P1];
    const logs = [upfrontLog_P1, payment_P2, unlinkedGeneralPayment];

    const fin1 = computePurchaseFinancials(purchase1, returns, logs, allPurchases);
    assert.strictEqual(fin1.paid, 4000, 'P1 must not receive unlinked payment');
    assert.strictEqual(fin1.due, 0);

    const fin2 = computePurchaseFinancials(purchase2, returns, logs, allPurchases);
    assert.strictEqual(fin2.paid, 2000, 'P2 must not receive unlinked payment');
    assert.strictEqual(fin2.due, 3000, 'P2 due must remain 3000');
  });

  it('5. Supplier Khata & Aggregate totals must reflect sum of independent purchases', () => {
    const { computeSupplierKhataBalance } = ERP;
    const returns = [return_P1];
    const logs = [upfrontLog_P1, payment_P2];

    const khata = computeSupplierKhataBalance(supplier, allPurchases, logs, returns);

    // Total gross: 10,000 + 5,000 = 15,000
    assert.strictEqual(khata.totalPurchase, 15000);
    // Total returns: 7,000
    assert.strictEqual(khata.returnAmount, 7000);
    // Net purchases: 8,000
    assert.strictEqual(khata.netPurchase, 8000);
    // Total paid on purchases: 4000 (P1) + 2000 (P2) = 6000
    assert.strictEqual(khata.totalPaid, 6000);
    // Refund due/cashback from P1: 1000
    assert.strictEqual(khata.refundCashback, 1000);
    // Payable due strictly reflects P2 due of 3000 (0 on P1 + 3000 on P2)
    assert.strictEqual(khata.payableDue, 3000);
  });
});
