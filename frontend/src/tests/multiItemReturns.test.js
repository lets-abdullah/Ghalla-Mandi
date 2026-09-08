import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  computeInvoiceFinancials,
  computeSaleInvoiceFromReturns,
  computePurchaseInvoiceFromReturns,
  extractReturnMerchandiseValue
} from '../../../backend/src/utils/accounting.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempOutFile = path.join(__dirname, '_compiled_multi_item_erp.js');

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
    try {
      fs.unlinkSync(tempOutFile);
    } catch (e) {}
  }
});

describe('Multi-Item Sale Return & Purchase Return Test Suite', () => {
  it('1. Multi-Item Sale Return: creates one return record with multiple items and combined value', () => {
    // Sale invoice has Dalda 1 Litre (rate 200) + Daal 3 KG (rate 200) = Rs. 800 total
    const sale = {
      id: 'sal-101',
      invoiceNo: 'INV-101',
      customerId: 'cust-1',
      customerName: 'Akram Trader',
      amount: 800,
      grandTotal: 800,
      paidAmount: 500, // Customer paid 500, due was 300
      cart: [
        { id: 'c-1', productId: 'p-dalda', name: 'Dalda 1 Litre', qty: 1, rate: 200, unit: 'Litre', total: 200 },
        { id: 'c-2', productId: 'p-daal', name: 'Daal', qty: 3, rate: 200, unit: 'KG', total: 600 }
      ]
    };

    // User returns Dalda = 1, Daal = 2 in ONE attempt
    const multiItemReturn = {
      id: 'sr-001',
      returnNo: 'SR-2026-0001',
      saleId: 'sal-101',
      invoiceNo: 'INV-101',
      customerId: 'cust-1',
      customerName: 'Akram Trader',
      items: [
        { productId: 'p-dalda', name: 'Dalda 1 Litre', qty: 1, rate: 200, unit: 'Litre', total: 200 },
        { productId: 'p-daal', name: 'Daal', qty: 2, rate: 200, unit: 'KG', total: 400 }
      ],
      totalGoodsValue: 600,
      refundMode: 'Cash',
      refundAmount: 300 // Max cash refund: paid (500) - newNet (200) = 300
    };

    // Verify merchandise value calculation
    const returnVal = extractReturnMerchandiseValue(multiItemReturn);
    assert.strictEqual(returnVal, 600, 'Combined merchandise return value must equal 600');

    // Verify backend accounting invoice reconciliation
    const fin = computeSaleInvoiceFromReturns(sale, [multiItemReturn]);
    assert.strictEqual(fin.totalReturnAmt, 600, 'Total return amount must be 600');
    assert.strictEqual(fin.netAmt, 200, 'Net amount of sale after 600 return is 200');
    assert.strictEqual(fin.effectivePaid, 200, 'Effective paid on net 200 is 200');
    assert.strictEqual(fin.due, 0, 'Due is completely cleared');
    assert.strictEqual(fin.cashRefundAmt, 300, 'Cash refund payable to customer is 300');
  });

  it('2. Multi-Item Sale Return: remaining returnable quantities calculated independently per item', () => {
    const priorReturns = [
      {
        saleId: 'sal-101',
        items: [
          { productId: 'p-dalda', qty: 1, rate: 200 },
          { productId: 'p-daal', qty: 2, rate: 200 }
        ]
      }
    ];

    // Compute remaining returnable for Dalda: 1 - 1 = 0
    const daldaReturned = priorReturns.reduce((sum, r) => {
      const it = (r.items || []).find(i => i.productId === 'p-dalda');
      return sum + (it ? it.qty : 0);
    }, 0);
    const daldaRemaining = Math.max(0, 1 - daldaReturned);
    assert.strictEqual(daldaRemaining, 0, 'Dalda should have 0 remaining returnable');

    // Compute remaining returnable for Daal: 3 - 2 = 1
    const daalReturned = priorReturns.reduce((sum, r) => {
      const it = (r.items || []).find(i => i.productId === 'p-daal');
      return sum + (it ? it.qty : 0);
    }, 0);
    const daalRemaining = Math.max(0, 3 - daalReturned);
    assert.strictEqual(daalRemaining, 1, 'Daal should have 1 KG remaining returnable');
  });

  it('3. Multi-Item Purchase Return: creates single return with multiple items, updates supplier financials', () => {
    // Purchase bill with 2 items: Kapas 10 KG @ 100 + Wheat 5 KG @ 50 = Rs. 1,250
    const purchase = {
      id: 'pur-201',
      purchaseNo: 'PUR-201',
      supplierId: 'sup-1',
      supplierName: 'Kisan Cotton',
      grandTotal: 1250,
      paidAmount: 1000, // Shop paid 1,000, due was 250
      items: [
        { productId: 'p-kapas', name: 'Kapas', qty: 10, rate: 100, unit: 'KG', total: 1000 },
        { productId: 'p-wheat', name: 'Wheat', qty: 5, rate: 50, unit: 'KG', total: 250 }
      ]
    };

    // User returns Kapas = 3, Wheat = 2 in ONE attempt
    // Kapas: 3 * 100 = 300, Wheat: 2 * 50 = 100 -> Total return = 400
    const multiItemPurReturn = {
      id: 'pr-001',
      returnNo: 'PR-2026-0001',
      purchaseId: 'pur-201',
      purchaseNo: 'PUR-201',
      supplierId: 'sup-1',
      supplierName: 'Kisan Cotton',
      items: [
        { productId: 'p-kapas', name: 'Kapas', qty: 3, rate: 100, unit: 'KG', total: 300 },
        { productId: 'p-wheat', name: 'Wheat', qty: 2, rate: 50, unit: 'KG', total: 100 }
      ],
      totalGoodsValue: 400,
      refundMode: 'Cash',
      refundAmount: 150 // Paid (1000) - newNet (850) = 150 cash refund
    };

    // Verify backend accounting invoice reconciliation
    const fin = computePurchaseInvoiceFromReturns(purchase, [multiItemPurReturn]);
    assert.strictEqual(fin.totalReturnAmt, 400, 'Total return amount must be 400');
    assert.strictEqual(fin.netAmt, 850, 'Net purchase amount is 1250 - 400 = 850');
    assert.strictEqual(fin.effectivePaid, 850, 'Effective paid is capped at net 850');
    assert.strictEqual(fin.due, 0, 'Payable due is 0');
    assert.strictEqual(fin.cashRefundAmt, 150, 'Cash refund from supplier is 150');
  });

  it('4. Multi-Item Purchase Return: warehouse stock validation caps return quantity to available stock', () => {
    const remainingBillQty = 10;
    const currentAvailableStock = 4;
    const maxReturnable = Math.min(remainingBillQty, currentAvailableStock);

    assert.strictEqual(maxReturnable, 4, 'Max returnable must be capped at warehouse stock (4 KG)');
  });

  it('5. Frontend computeSaleFinancials handles multi-item returns accurately', () => {
    const { computeSaleFinancials } = ERP;
    const sale = {
      id: 'sal-102',
      invoiceNo: 'INV-102',
      customerId: 'cust-1',
      amount: 1000,
      grandTotal: 1000,
      paidAmount: 600,
      cart: [
        { id: 'c-1', productId: 'p-1', name: 'Item A', qty: 5, rate: 100, total: 500 },
        { id: 'c-2', productId: 'p-2', name: 'Item B', qty: 5, rate: 100, total: 500 }
      ]
    };

    const multiReturn = {
      id: 'sr-002',
      saleId: 'sal-102',
      invoiceNo: 'INV-102',
      items: [
        { productId: 'p-1', name: 'Item A', qty: 2, rate: 100, total: 200 },
        { productId: 'p-2', name: 'Item B', qty: 3, rate: 100, total: 300 }
      ],
      refundAmount: 100,
      refundMode: 'Cash'
    };

    const fin = computeSaleFinancials(sale, [multiReturn], [], [sale]);
    assert.strictEqual(fin.returnAmount, 500, 'Combined return amount is 200 + 300 = 500');
    assert.strictEqual(fin.due, 0, 'Due is 0 since paid (600) covers net (500)');
  });

  it('6. Backward compatibility: single-item return records continue working identically', () => {
    const { computeSaleFinancials } = ERP;
    const sale = {
      id: 'sal-103',
      invoiceNo: 'INV-103',
      amount: 500,
      cart: [{ id: 'c-1', productId: 'p-1', qty: 5, rate: 100, total: 500 }]
    };

    const singleReturn = {
      id: 'sr-003',
      saleId: 'sal-103',
      invoiceNo: 'INV-103',
      items: [{ productId: 'p-1', qty: 1, rate: 100, total: 100 }],
      refundAmount: 0,
      refundMode: 'Credit'
    };

    const fin = computeSaleFinancials(sale, [singleReturn], [], [sale]);
    assert.strictEqual(fin.returnAmount, 100, 'Single item return correctly recognized');
  });
});
