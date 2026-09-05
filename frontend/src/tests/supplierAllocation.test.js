import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempOutFile = path.join(__dirname, '_compiled_erp_test.js');

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

describe('Supplier & Customer Payment Allocation and Isolation Tests', () => {

  it('Scenario 1: Purchase 1 settled with return + refund, Purchase 2 created later must have Paid: 0, Due: 10,000', () => {
    const { computePurchaseFinancials, computeSupplierKhataBalance } = ERP;

    const supplier = { id: 'SUP-01', name: 'Al-Madina Traders', balance: 0, openingBalance: 0 };

    const purchase1 = {
      id: 'PUR-1',
      purchaseNo: 'PUR-2026-0001',
      supplierId: 'SUP-01',
      supplier: 'Al-Madina Traders',
      amount: 10000,
      paidAmount: 3000,
      paymentMode: 'Cash',
      status: 'Partial',
      date: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    const purchaseReturns = [
      {
        id: 'PRET-1',
        returnNo: 'RET-001',
        purchaseId: 'PUR-1',
        purchaseNo: 'PUR-2026-0001',
        supplierId: 'SUP-01',
        supplierName: 'Al-Madina Traders',
        amount: 8000,
        refundAmount: 1000,
        refundMode: 'Cash',
        date: '2026-01-01T12:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z'
      }
    ];

    // Upfront payment log generated on purchase checkout
    const upfrontLog = {
      id: 'PAY-6775',
      ref: 'PAY-6775',
      purchaseId: 'PUR-1',
      partyId: 'SUP-01',
      partyName: 'Al-Madina Traders',
      type: 'Supplier',
      amount: 3000,
      mode: 'Cash',
      date: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    // Standalone payments made afterwards
    const standaloneLog1 = {
      id: 'PAY-6654',
      ref: 'PAY-6654',
      partyId: 'SUP-01',
      partyName: 'Al-Madina Traders',
      type: 'Supplier',
      amount: 200,
      mode: 'Cash',
      date: '2026-01-02T10:00:00.000Z',
      createdAt: '2026-01-02T10:00:00.000Z'
    };

    const standaloneLog2 = {
      id: 'PAY-7900',
      ref: 'PAY-7900',
      partyId: 'SUP-01',
      partyName: 'Al-Madina Traders',
      type: 'Supplier',
      amount: 800,
      mode: 'Cash',
      date: '2026-01-02T11:00:00.000Z',
      createdAt: '2026-01-02T11:00:00.000Z'
    };

    // Purchase 2 created days later
    const purchase2 = {
      id: 'PUR-2',
      purchaseNo: 'PUR-2026-0002',
      supplierId: 'SUP-01',
      supplier: 'Al-Madina Traders',
      amount: 10000,
      paidAmount: 0,
      paymentMode: 'Supplier Khata',
      status: 'Pending',
      date: '2026-01-05T10:00:00.000Z',
      createdAt: '2026-01-05T10:00:00.000Z'
    };

    const allPurchases = [purchase1, purchase2];
    const paymentLogs = [upfrontLog, standaloneLog1, standaloneLog2];

    // Compute Purchase 1 financials
    const fin1 = computePurchaseFinancials(purchase1, purchaseReturns, paymentLogs, allPurchases);
    assert.strictEqual(fin1.grossTotal, 10000, 'Purchase 1 gross total must be 10000');
    assert.strictEqual(fin1.returnAmount, 8000, 'Purchase 1 return amount must be 8000');
    assert.strictEqual(fin1.netTotal, 2000, 'Purchase 1 net total must be 2000');
    assert.strictEqual(fin1.paid, 3000, 'Purchase 1 paid must be 3000');
    assert.strictEqual(fin1.refundCashback, 1000, 'Purchase 1 refund cashback must be 1000');
    assert.strictEqual(fin1.due, 0, 'Purchase 1 due must be 0');

    // Compute Purchase 2 financials - CRITICAL: No payments from Purchase 1 or past general payments must leak to Purchase 2
    const fin2 = computePurchaseFinancials(purchase2, purchaseReturns, paymentLogs, allPurchases);
    assert.strictEqual(fin2.grossTotal, 10000, 'Purchase 2 gross total must be 10000');
    assert.strictEqual(fin2.returnAmount, 0, 'Purchase 2 return amount must be 0');
    assert.strictEqual(fin2.netTotal, 10000, 'Purchase 2 net total must be 10000');
    assert.strictEqual(fin2.paid, 0, 'Purchase 2 paid MUST be 0 (no past payment shifting)');
    assert.strictEqual(fin2.due, 10000, 'Purchase 2 due MUST be 10000');

    // Supplier Khata Balance check
    const khata = computeSupplierKhataBalance(supplier, allPurchases, paymentLogs, purchaseReturns);
    assert.strictEqual(khata.totalPurchase, 20000, 'Supplier total purchase must be 20000');
    assert.strictEqual(khata.returnAmount, 8000, 'Supplier return amount must be 8000');
    assert.strictEqual(khata.netPurchase, 12000, 'Supplier net purchase must be 12000');
    assert.strictEqual(khata.totalPaid, 4000, 'Supplier total paid must be 4000 (3000 + 200 + 800, NOT double counted 7000)');
    assert.strictEqual(khata.refundCashback, 1000, 'Supplier refund received must be 1000');
    assert.strictEqual(khata.payableDue, 10000, 'Supplier payable due MUST be 10000');
  });

  it('Scenario 2: General payment after Purchase 2 is created allocates to Purchase 2 strictly up to its due', () => {
    const { computePurchaseFinancials, computeSupplierKhataBalance } = ERP;

    const supplier = { id: 'SUP-01', name: 'Al-Madina Traders', balance: 0, openingBalance: 0 };

    const purchase1 = {
      id: 'PUR-1',
      purchaseNo: 'PUR-2026-0001',
      supplierId: 'SUP-01',
      supplier: 'Al-Madina Traders',
      amount: 10000,
      paidAmount: 3000,
      paymentMode: 'Cash',
      status: 'Partial',
      date: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    const purchaseReturns = [
      {
        id: 'PRET-1',
        purchaseId: 'PUR-1',
        supplierId: 'SUP-01',
        amount: 8000,
        refundAmount: 1000,
        refundMode: 'Cash',
        date: '2026-01-01T12:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z'
      }
    ];

    const purchase2 = {
      id: 'PUR-2',
      purchaseNo: 'PUR-2026-0002',
      supplierId: 'SUP-01',
      supplier: 'Al-Madina Traders',
      amount: 10000,
      paidAmount: 0,
      paymentMode: 'Supplier Khata',
      status: 'Pending',
      date: '2026-01-05T10:00:00.000Z',
      createdAt: '2026-01-05T10:00:00.000Z'
    };

    // General payment of 4000 made on 2026-01-06 (after Purchase 2 exists)
    const paymentLogs = [
      {
        id: 'PAY-1',
        purchaseId: 'PUR-1',
        partyId: 'SUP-01',
        type: 'Supplier',
        amount: 3000,
        date: '2026-01-01T10:00:00.000Z',
        createdAt: '2026-01-01T10:00:00.000Z'
      },
      {
        id: 'PAY-2',
        partyId: 'SUP-01',
        type: 'Supplier',
        amount: 4000,
        date: '2026-01-06T10:00:00.000Z',
        createdAt: '2026-01-06T10:00:00.000Z'
      }
    ];

    const allPurchases = [purchase1, purchase2];

    const fin2 = computePurchaseFinancials(purchase2, purchaseReturns, paymentLogs, allPurchases);
    assert.strictEqual(fin2.paid, 4000, 'Purchase 2 paid should be 4000');
    assert.strictEqual(fin2.due, 6000, 'Purchase 2 due should be 6000');

    const khata = computeSupplierKhataBalance(supplier, allPurchases, paymentLogs, purchaseReturns);
    assert.strictEqual(khata.payableDue, 6000, 'Supplier payable due must be 6000');
  });

  it('Scenario 3: Customer Sales FIFO and isolated refund parity', () => {
    const { computeSaleFinancials, computeCustomerKhataBalance } = ERP;

    const customer = { id: 'CUST-01', name: 'Tariq Khan', balance: 0, openingBalance: 0 };

    const sale1 = {
      id: 'SAL-1',
      invoiceNo: 'INV-2026-0001',
      customerId: 'CUST-01',
      customerName: 'Tariq Khan',
      amount: 10000,
      paidAmount: 3000,
      paymentMode: 'Cash',
      status: 'Partial',
      date: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    const saleReturns = [
      {
        id: 'SRET-1',
        returnNo: 'SRET-001',
        saleId: 'SAL-1',
        invoiceNo: 'INV-2026-0001',
        customerId: 'CUST-01',
        customerName: 'Tariq Khan',
        amount: 8000,
        refundAmount: 1000,
        refundMode: 'Cash',
        date: '2026-01-01T12:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z'
      }
    ];

    const upfrontLog = {
      id: 'CPAY-1',
      ref: 'POS-PAY-INV-2026-0001',
      saleId: 'SAL-1',
      partyId: 'CUST-01',
      partyName: 'Tariq Khan',
      type: 'Customer',
      amount: 3000,
      mode: 'Cash',
      date: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    const generalPayment = {
      id: 'CPAY-2',
      ref: 'CPAY-002',
      partyId: 'CUST-01',
      partyName: 'Tariq Khan',
      type: 'Customer',
      amount: 500,
      mode: 'Cash',
      date: '2026-01-02T10:00:00.000Z',
      createdAt: '2026-01-02T10:00:00.000Z'
    };

    const sale2 = {
      id: 'SAL-2',
      invoiceNo: 'INV-2026-0002',
      customerId: 'CUST-01',
      customerName: 'Tariq Khan',
      amount: 10000,
      paidAmount: 0,
      paymentMode: 'Credit',
      status: 'Pending',
      date: '2026-01-05T10:00:00.000Z',
      createdAt: '2026-01-05T10:00:00.000Z'
    };

    const allSales = [sale1, sale2];
    const paymentLogs = [upfrontLog, generalPayment];

    const fin1 = computeSaleFinancials(sale1, saleReturns, paymentLogs, allSales);
    assert.strictEqual(fin1.grossTotal, 10000);
    assert.strictEqual(fin1.netTotal, 2000);
    assert.strictEqual(fin1.paid, 3000);
    assert.strictEqual(fin1.refundCashback, 1000);
    assert.strictEqual(fin1.due, 0);

    const fin2 = computeSaleFinancials(sale2, saleReturns, paymentLogs, allSales);
    assert.strictEqual(fin2.paid, 0, 'Sale 2 paid must be 0 (no past payment leaking)');
    assert.strictEqual(fin2.due, 10000, 'Sale 2 due must be 10000');

    const khata = computeCustomerKhataBalance(customer, allSales, paymentLogs, saleReturns);
    assert.strictEqual(khata.receivableDue, 10000, 'Customer receivable due must be 10000');
  });

  it('Scenario 4: computeLedgerStatement deduplicates upfront logs and maintains accurate running balance', () => {
    const { computeLedgerStatement } = ERP;

    const supplier = { id: 'SUP-01', name: 'Al-Madina Traders', balance: 0, openingBalance: 0 };

    const purchase1 = {
      id: 'PUR-1',
      purchaseNo: 'PUR-2026-0001',
      supplierId: 'SUP-01',
      supplier: 'Al-Madina Traders',
      amount: 10000,
      paidAmount: 3000,
      paymentMode: 'Cash',
      status: 'Partial',
      date: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    const purchaseReturns = [
      {
        id: 'PRET-1',
        returnNo: 'RET-001',
        purchaseId: 'PUR-1',
        purchaseNo: 'PUR-2026-0001',
        supplierId: 'SUP-01',
        supplierName: 'Al-Madina Traders',
        amount: 8000,
        refundAmount: 1000,
        refundMode: 'Cash',
        date: '2026-01-01T12:00:00.000Z',
        createdAt: '2026-01-01T12:00:00.000Z'
      }
    ];

    // PAY-6775 is the 3000 payment log
    const paymentLogs = [
      {
        id: 'PAY-6775',
        ref: 'PAY-6775',
        partyId: 'SUP-01',
        partyName: 'Al-Madina Traders',
        type: 'Supplier',
        amount: 3000,
        mode: 'Cash',
        date: '2026-01-01T10:00:00.000Z',
        createdAt: '2026-01-01T10:00:00.000Z'
      },
      {
        id: 'PAY-6654',
        ref: 'PAY-6654',
        partyId: 'SUP-01',
        partyName: 'Al-Madina Traders',
        type: 'Supplier',
        amount: 200,
        mode: 'Cash',
        date: '2026-01-02T10:00:00.000Z',
        createdAt: '2026-01-02T10:00:00.000Z'
      },
      {
        id: 'PAY-7900',
        ref: 'PAY-7900',
        partyId: 'SUP-01',
        partyName: 'Al-Madina Traders',
        type: 'Supplier',
        amount: 800,
        mode: 'Cash',
        date: '2026-01-02T11:00:00.000Z',
        createdAt: '2026-01-02T11:00:00.000Z'
      }
    ];

    const purchase2 = {
      id: 'PUR-2',
      purchaseNo: 'PUR-2026-0002',
      supplierId: 'SUP-01',
      supplier: 'Al-Madina Traders',
      amount: 10000,
      paidAmount: 0,
      paymentMode: 'Supplier Khata',
      status: 'Pending',
      date: '2026-01-05T10:00:00.000Z',
      createdAt: '2026-01-05T10:00:00.000Z'
    };

    const purchases = [purchase1, purchase2];

    const ledger = computeLedgerStatement(supplier, {
      sales: [],
      purchases,
      paymentLogs,
      saleReturns: [],
      purchaseReturns,
      isSupplier: true
    });

    assert.ok(ledger.chronologicalEntries.length > 0, 'Ledger entries should be generated');

    // Ensure no duplicate pay-direct-sup entry was added for PUR-1 because PAY-6775 exists
    const directPayEntries = ledger.chronologicalEntries.filter(e => e.id.startsWith('pay-direct-sup'));
    assert.strictEqual(directPayEntries.length, 0, 'Should not have duplicate pay-direct-sup entry');

    // Total supplier credits and debits check
    // Purchase 1: 10,000 debit
    // Return: 8,000 credit
    // Auto refund: 1,000 debit
    // PAY-6775: 3,000 credit
    // PAY-6654: 200 credit
    // PAY-7900: 800 credit
    // Purchase 2: 10,000 debit
    // Total debits = 10,000 + 1,000 + 10,000 = 21,000
    // Total credits = 8,000 + 3,000 + 200 + 800 = 12,000
    // Closing net balance = 21,000 - 12,000 = 9,000
    assert.strictEqual(ledger.closingBalance, 9000, 'Closing balance in ledger must match debits minus credits');
  });

  it('Scenario 5: Rule 1, 2 & 4 - Exact amounts preserved, no rewriting, and original invoice paid amounts immutable', () => {
    const { computePurchaseFinancials } = ERP;

    const purchase = {
      id: 'PUR-ORIG',
      purchaseNo: 'PUR-2026-0099',
      supplierId: 'SUP-02',
      supplier: 'Kisan Produce',
      amount: 15000,
      paidAmount: 5000,
      paymentMode: 'Cash',
      status: 'Partial',
      date: '2026-02-01T10:00:00.000Z',
      createdAt: '2026-02-01T10:00:00.000Z'
    };

    // Even if no payment logs exist, original paidAmount is respected and immutable
    const fin = computePurchaseFinancials(purchase, [], [], [purchase]);
    assert.strictEqual(fin.grossTotal, 15000);
    assert.strictEqual(fin.netTotal, 15000);
    assert.strictEqual(fin.paid, 5000, 'Original invoice upfront paid must remain immutable at 5000');
    assert.strictEqual(fin.due, 10000, 'Due must remain 10000');
    assert.strictEqual(fin.status, 'Partial');
  });

  it('Scenario 6: Rule 13 - Refund/cashback is ONLY generated when actual payments allocated > net purchase after returns', () => {
    const { computePurchaseFinancials } = ERP;

    // Case A: Purchase 10,000, Return 4,000 (Net 6,000). Paid 3,000.
    // Payments (3,000) <= Net (6,000) -> Refund MUST BE 0. Due MUST BE 3,000.
    const purchaseA = {
      id: 'PUR-A',
      purchaseNo: 'PUR-2026-0101',
      supplierId: 'SUP-03',
      supplier: 'Grain Corp',
      amount: 10000,
      paidAmount: 3000,
      paymentMode: 'Cash',
      date: '2026-03-01T10:00:00.000Z'
    };
    const returnsA = [{
      id: 'RET-A',
      purchaseId: 'PUR-A',
      supplierId: 'SUP-03',
      amount: 4000,
      totalGoodsValue: 4000,
      date: '2026-03-02T10:00:00.000Z'
    }];
    const finA = computePurchaseFinancials(purchaseA, returnsA, [], [purchaseA]);
    assert.strictEqual(finA.netTotal, 6000);
    assert.strictEqual(finA.paid, 3000);
    assert.strictEqual(finA.due, 3000);
    assert.strictEqual(finA.refundCashback, 0, 'No refund should be generated when paid <= net purchase');

    // Case B: Purchase 10,000, Return 8,000 (Net 2,000). Paid 5,000.
    // Payments (5,000) > Net (2,000) -> Refund MUST BE 3,000. Due MUST BE 0.
    const purchaseB = {
      id: 'PUR-B',
      purchaseNo: 'PUR-2026-0102',
      supplierId: 'SUP-03',
      supplier: 'Grain Corp',
      amount: 10000,
      paidAmount: 5000,
      paymentMode: 'Cash',
      date: '2026-03-01T10:00:00.000Z'
    };
    const returnsB = [{
      id: 'RET-B',
      purchaseId: 'PUR-B',
      supplierId: 'SUP-03',
      amount: 8000,
      totalGoodsValue: 8000,
      date: '2026-03-02T10:00:00.000Z'
    }];
    const finB = computePurchaseFinancials(purchaseB, returnsB, [], [purchaseB]);
    assert.strictEqual(finB.netTotal, 2000);
    assert.strictEqual(finB.paid, 5000);
    assert.strictEqual(finB.due, 0);
    assert.strictEqual(finB.refundCashback, 3000, 'Refund of 3000 must be generated when paid (5000) exceeds net (2000)');
  });
});
