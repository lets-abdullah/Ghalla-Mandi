import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { computePurchaseInvoiceFromReturns, computeInvoiceFinancials } from '../../../backend/src/utils/accounting.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempOutFile = path.join(__dirname, '_compiled_erp_purchase_total_test.js');

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

describe('Root Cause Fix: Purchase Total & Payable Status Calculations', () => {
  const purchaseDaldaWithZeroStoredAmount = {
    id: 2,
    purchaseNo: 'PUR-2026-0002',
    supplierId: 'sup-101',
    supplierName: 'one',
    grandTotal: 0,
    amount: 0,
    paidAmount: 0,
    paymentMode: 'Supplier Khata',
    items: [
      {
        productId: 'prod-dalda',
        name: 'Dalda',
        productName: 'Dalda',
        unit: 'KG',
        qty: 51,
        rate: 100,
        total: 5100
      }
    ]
  };

  it('1. Root Cause: computePurchaseFinancials derives Rs. 5,100 from items when stored total is 0', () => {
    const { computePurchaseFinancials } = ERP;
    const fin = computePurchaseFinancials(purchaseDaldaWithZeroStoredAmount, [], [], [purchaseDaldaWithZeroStoredAmount]);

    assert.strictEqual(fin.grossTotal, 5100, 'Gross total must be 5100, not 0');
    assert.strictEqual(fin.total, 5100, 'Total must be 5100, not 0');
    assert.strictEqual(fin.netTotal, 5100, 'Net total must be 5100, not 0');
    assert.strictEqual(fin.paid, 0, 'Paid must be 0');
    assert.strictEqual(fin.due, 5100, 'Due must be 5100, never 0');
    assert.strictEqual(fin.status, 'Payable', 'Status must be Payable, never Settled or Paid');
  });

  it('2. Newly created purchase with explicit amount: 5100 and paid: 0 calculates Due: 5100 and status: Payable', () => {
    const { computePurchaseFinancials } = ERP;
    const newPur = {
      id: 3,
      purchaseNo: 'PUR-2026-0003',
      supplierId: 'sup-101',
      supplierName: 'one',
      grandTotal: 5100,
      amount: 5100,
      paidAmount: 0,
      paymentMode: 'Supplier Khata',
      items: [
        {
          name: 'Dalda',
          qty: 51,
          rate: 100,
          total: 5100
        }
      ]
    };
    const fin = computePurchaseFinancials(newPur, [], [], [newPur]);

    assert.strictEqual(fin.grossTotal, 5100);
    assert.strictEqual(fin.paid, 0);
    assert.strictEqual(fin.due, 5100);
    assert.strictEqual(fin.status, 'Payable');
  });

  it('3. Immediate receipt modal payload with totalAmount: 5100 and paidAmount: 0 calculates Due: 5100 and status: Payable', () => {
    const { computePurchaseFinancials } = ERP;
    const receiptPayload = {
      purchaseNo: 'PUR-2026-0002',
      supplierName: 'one',
      items: [{ name: 'Dalda', qty: 51, rate: 100, price: 100, total: 5100 }],
      totalAmount: 5100,
      paidAmount: 0
    };
    const fin = computePurchaseFinancials(receiptPayload, [], [], []);

    assert.strictEqual(fin.grossTotal, 5100, 'grossTotal must be 5100');
    assert.strictEqual(fin.due, 5100, 'due must be 5100');
    assert.strictEqual(fin.paid, 0, 'paid must be 0');
    assert.strictEqual(fin.status, 'Payable', 'status must be Payable, never Settled');
  });

  it('4. Backend accounting utility: computePurchaseInvoiceFromReturns correctly computes 5100 and Payable status', () => {
    const backendPur = {
      grandTotal: 0,
      amount: 0,
      paidAmount: 0,
      items: [
        { name: 'Dalda', qty: 51, rate: 100, total: 5100 }
      ]
    };
    const fin = computePurchaseInvoiceFromReturns(backendPur, []);

    assert.strictEqual(fin.grossAmount, 5100, 'Backend grossAmount must derive 5100 from items');
    assert.strictEqual(fin.due, 5100, 'Backend due must be 5100');
    assert.strictEqual(fin.effectivePaid, 0, 'Backend paid must be 0');
    assert.strictEqual(fin.status, 'Payable', 'Backend status must be Payable');
  });

  it('5. Status transition: partial payment PAY-100 of Rs. 2,000 moves status to Partial, due = 3,100', () => {
    const { computePurchaseFinancials } = ERP;
    const paymentLog = {
      id: 'log-1',
      purchaseId: 2,
      amount: 2000,
      mode: 'Cash',
      type: 'Supplier',
      partyType: 'Supplier',
      partyId: 'sup-101',
      date: '2026-09-08'
    };

    const fin = computePurchaseFinancials(purchaseDaldaWithZeroStoredAmount, [], [paymentLog], [purchaseDaldaWithZeroStoredAmount]);
    assert.strictEqual(fin.grossTotal, 5100);
    assert.strictEqual(fin.paid, 2000);
    assert.strictEqual(fin.due, 3100);
    assert.strictEqual(fin.status, 'Partial');
  });

  it('6. Status transition: full payment of Rs. 5,100 moves status to Paid / Settled, due = 0', () => {
    const { computePurchaseFinancials } = ERP;
    const paymentLog = {
      id: 'log-2',
      purchaseId: 2,
      amount: 5100,
      mode: 'Cash',
      type: 'Supplier',
      partyType: 'Supplier',
      partyId: 'sup-101',
      date: '2026-09-08'
    };

    const fin = computePurchaseFinancials(purchaseDaldaWithZeroStoredAmount, [], [paymentLog], [purchaseDaldaWithZeroStoredAmount]);
    assert.strictEqual(fin.grossTotal, 5100);
    assert.strictEqual(fin.paid, 5100);
    assert.strictEqual(fin.due, 0);
    assert.strictEqual(fin.status, 'Paid');
  });
});
