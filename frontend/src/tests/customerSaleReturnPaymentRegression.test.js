import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  computeInvoiceFinancials,
  computeSaleInvoiceFromReturns
} from '../../../backend/src/utils/accounting.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempOutFile = path.join(__dirname, '_compiled_customer_regression_erp.js');

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
    try { fs.unlinkSync(tempOutFile); } catch (e) {}
  }
});

describe('Customer Sale Return & Payment Calculation ROOT Regression Suite', () => {

  const customer = {
    id: 'cust-101',
    name: 'Tariq Mehmood',
    openingBalance: 0,
    balance: 0
  };

  const originalSale = {
    id: 'sal-2000',
    invoiceNo: 'INV-2026-0001',
    customerId: 'cust-101',
    partyName: 'Tariq Mehmood',
    customerName: 'Tariq Mehmood',
    amount: 2000,
    grandTotal: 2000,
    paidAmount: 500,
    initialPaidAmount: 500,
    status: 'Partial',
    date: '01/09/2026',
    created_at: '2026-09-01T10:00:00.000Z',
    cart: [
      { id: 'item-1', name: 'Basmati Rice', qty: 20, rate: 100, unit: 'KG', total: 2000 }
    ]
  };

  const saleReturn1400 = {
    id: 'sr-1400',
    returnNo: 'SR-2026-0001',
    saleId: 'sal-2000',
    invoiceNo: 'INV-2026-0001',
    customerId: 'cust-101',
    customerName: 'Tariq Mehmood',
    items: [
      { id: 'item-1', name: 'Basmati Rice', qty: 14, rate: 100, unit: 'KG', total: 1400, totalAmount: 1400 }
    ],
    totalGoodsValue: 1400,
    refundAmount: 0,
    refundMode: 'Credit',
    date: '02/09/2026',
    created_at: '2026-09-02T10:00:00.000Z'
  };

  const posPaymentLog = {
    id: 'pay-pos-500',
    saleId: 'sal-2000',
    partyId: 'cust-101',
    partyName: 'Tariq Mehmood',
    partyType: 'Customer',
    type: 'Customer',
    amount: 500,
    mode: 'Cash (POS)',
    ref: 'POS-PAY-0001',
    date: '01/09/2026',
    created_at: '2026-09-01T10:00:01.000Z'
  };

  const laterPaymentLog100 = {
    id: 'pay-settle-100',
    saleId: 'sal-2000',
    partyId: 'cust-101',
    partyName: 'Tariq Mehmood',
    partyType: 'Customer',
    type: 'Customer',
    amount: 100,
    mode: 'Cash',
    ref: 'PAY-7821',
    note: 'Remaining settlement payment',
    date: '03/09/2026',
    created_at: '2026-09-03T10:00:00.000Z'
  };

  it('1. Core Scenario: Rs. 2,000 Sale + Rs. 500 Initial + Rs. 1,400 Return + Rs. 100 Later Payment = Rs. 0 Due (NEVER Rs. 400)', () => {
    const paymentLogs = [posPaymentLog, laterPaymentLog100];
    const financials = ERP.computeSaleFinancials(originalSale, [saleReturn1400], paymentLogs, [originalSale]);

    // Mandatory User Assertions
    assert.strictEqual(financials.netTotal, 600, 'Net Sale must be Rs. 600');
    assert.strictEqual(financials.paid, 600, 'Total Received must be Rs. 600');
    assert.strictEqual(financials.due, 0, 'Final Due must be Rs. 0');
    assert.strictEqual(financials.refundCashback, 0, 'Refund/Cashback must be Rs. 0');
    assert.strictEqual(financials.status, 'Paid', 'Status must be Paid/Settled');

    // Anti-bug assertions
    assert.notStrictEqual(financials.due, 400, 'Due MUST NOT be Rs. 400');
    assert.notStrictEqual(financials.due, 500, 'Due MUST NOT be Rs. 500');
    assert.notStrictEqual(financials.paid, 200, 'Paid MUST NOT be Rs. 200');
    assert.notStrictEqual(financials.paid, 100, 'Paid MUST NOT be Rs. 100');
  });

  it('2. Legacy Sale without POS log in logs: hierarchy preserves immutable initial payment', () => {
    // Only the later payment log exists in payment_logs (POS log was not created)
    const paymentLogsWithoutPos = [laterPaymentLog100];
    const financials = ERP.computeSaleFinancials(originalSale, [saleReturn1400], paymentLogsWithoutPos, [originalSale]);

    assert.strictEqual(financials.netTotal, 600, 'Net Sale must be Rs. 600');
    assert.strictEqual(financials.paid, 600, 'Total Received must be Rs. 600');
    assert.strictEqual(financials.due, 0, 'Final Due must be Rs. 0');
    assert.strictEqual(financials.refundCashback, 0, 'Refund/Cashback must be Rs. 0');
    assert.strictEqual(financials.status, 'Paid');
    assert.notStrictEqual(financials.due, 400, 'Due MUST NOT be Rs. 400');
  });

  it('3. Interim State: Before Rs. 100 payment, Due is strictly Rs. 100 (not Rs. 1,500, not Rs. 0)', () => {
    // Only upfront payment of Rs. 500 exists, return of Rs. 1,400 applied
    const financials = ERP.computeSaleFinancials(originalSale, [saleReturn1400], [posPaymentLog], [originalSale]);

    assert.strictEqual(financials.grossTotal, 2000);
    assert.strictEqual(financials.returnAmount, 1400);
    assert.strictEqual(financials.netTotal, 600);
    assert.strictEqual(financials.paid, 500);
    assert.strictEqual(financials.due, 100, 'Due before Rs. 100 settlement must be exactly Rs. 100');
    assert.strictEqual(financials.refundCashback, 0);
    assert.strictEqual(financials.status, 'Partial');
  });

  it('4. Customer Khata Balance: Settles to Rs. 0 Due and Settled status', () => {
    const paymentLogs = [posPaymentLog, laterPaymentLog100];
    const khata = ERP.computeCustomerKhataBalance(customer, [originalSale], paymentLogs, [saleReturn1400]);

    assert.strictEqual(khata.grossSale, 2000);
    assert.strictEqual(khata.returnAmount, 1400);
    assert.strictEqual(khata.netSale, 600);
    assert.strictEqual(khata.totalPaid, 600);
    assert.strictEqual(khata.receivableDue, 0, 'Khata receivable Due must be Rs. 0');
    assert.strictEqual(khata.balance, 0, 'Customer balance must be Rs. 0');
    assert.strictEqual(khata.refundLiability, 0, 'No refund liability');
    assert.strictEqual(khata.status, 'Settled');
  });

  it('5. Customer Ledger Statement: Correct chronological debit/credit entries with zero running balance', () => {
    const paymentLogs = [posPaymentLog, laterPaymentLog100];
    const statement = ERP.computeLedgerStatement(customer, {
      sales: [originalSale],
      saleReturns: [saleReturn1400],
      paymentLogs: paymentLogs,
      isSupplier: false
    });

    assert.strictEqual(statement.totalDebit, 2000, 'Total debit must be 2000 (Sale Invoice)');
    assert.strictEqual(statement.totalCredit, 2000, 'Total credit must be 2000 (500 POS + 1400 Return + 100 Later Payment)');
    assert.strictEqual(statement.closingBalance, 0, 'Closing balance must be exactly 0');
    assert.strictEqual(statement.receivableDue, 0, 'Receivable due must be 0');
    assert.strictEqual(statement.status, 'Settled', 'Statement status must be Settled');

    // Verify chronological entries
    const entries = statement.chronologicalEntries;
    assert.strictEqual(entries.length, 4, 'Must have exactly 4 ledger events: Sale, POS Pay, Return, Settle Pay');
    assert.strictEqual(entries[entries.length - 1].runningBalance, 0, 'Final running balance after Rs. 100 payment must be 0');
  });

  it('6. Overpayment Scenario: Excess payment generates pure Refund/Cashback and NEVER a fake Due', () => {
    // Customer pays Rs. 300 later instead of Rs. 100: Total Paid = 500 + 300 = 800. Net Sale = 600.
    const overpaymentLog = {
      ...laterPaymentLog100,
      amount: 300
    };
    const paymentLogs = [posPaymentLog, overpaymentLog];
    const financials = ERP.computeSaleFinancials(originalSale, [saleReturn1400], paymentLogs, [originalSale]);

    assert.strictEqual(financials.netTotal, 600);
    assert.strictEqual(financials.paid, 800);
    assert.strictEqual(financials.due, 0, 'Due must remain Rs. 0');
    assert.strictEqual(financials.refundCashback, 200, 'Excess Rs. 200 becomes Refund/Cashback');
    assert.strictEqual(financials.status, 'Paid');
  });

  it('7. Backend Canonical Accounting Util parity', () => {
    const finAfterReturn = computeSaleInvoiceFromReturns(originalSale, [saleReturn1400]);
    assert.strictEqual(finAfterReturn.netAmt, 600);
    assert.strictEqual(finAfterReturn.due, 100);
    assert.strictEqual(finAfterReturn.status, 'Partial');

    const finAfterPayment = computeInvoiceFinancials({
      grossAmount: 2000,
      returnAmount: 1400,
      grossPaid: 600
    });
    assert.strictEqual(finAfterPayment.netAmt, 600);
    assert.strictEqual(finAfterPayment.due, 0);
    assert.strictEqual(finAfterPayment.cashRefundAmt, 0);
    assert.strictEqual(finAfterPayment.status, 'Paid');
  });
});
