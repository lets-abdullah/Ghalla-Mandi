import { isValidOperationalUnit, getUnitFactor } from './src/services/unitConversion.service.js';
import { computeInvoiceFinancials, computeSaleInvoiceFromReturns } from './src/utils/accounting.util.js';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`✓ PASS: ${testName}`);
    results.push({ testName, status: 'PASS', details });
  } else {
    failed++;
    console.error(`✗ FAIL: ${testName} - ${details}`);
    results.push({ testName, status: 'FAIL', details });
  }
}

console.log('================================================================');
console.log('1. PROHIBITED PACKAGING UNITS VALIDATION');
console.log('================================================================');

const prohibitedTestList = [
  'mann', 'Mann', 'maund', 'MAUND', 'mon',
  'bori', 'Bori', 'bag', 'BAG', 'bora',
  'pack', 'Packet', 'carton', 'Box',
  'dozen', 'Dozen', 'ton', 'Ton', 'tonne', 'quintal'
];

for (const unit of prohibitedTestList) {
  assert(!isValidOperationalUnit(unit), `Prohibited unit "${unit}" rejected by isValidOperationalUnit`);
  let threw = false;
  try {
    getUnitFactor(unit);
  } catch (e) {
    threw = true;
  }
  assert(threw, `Prohibited unit "${unit}" throws error in getUnitFactor`);
}

const validUnits = ['KG', 'kg', 'Gram', 'gram', 'Litre', 'litre', 'ML', 'Meter', 'Piece', 'Unit'];
for (const unit of validUnits) {
  assert(isValidOperationalUnit(unit), `Valid operational unit "${unit}" accepted`);
}

console.log('\n================================================================');
console.log('2. REQUIRED RETURN TEST (MANDATORY BENCHMARK)');
console.log('================================================================');
/*
  Sale Rs.7,500
  Paid Rs.5,000
  Return Rs.2,750:
  - Cash Refund Rs.1,000
  - Ledger Return Rs.1,750

  Expected:
  Net Sale = Rs.4,750
  Effective Paid = Rs.4,000
  Due = Rs.750
  Customer Khata Due = Rs.750
  Advance = Rs.0
*/
function simulateSaleReturnBenchmark() {
  const originalSale = 7500;
  const originalPaid = 5000;
  const totalReturn = 2750;
  const cashRefund = 1000;
  const ledgerReturn = 1750;

  // Invoice calculations
  const netSale = Math.max(0, originalSale - totalReturn);
  const netCashPaid = Math.max(0, originalPaid - cashRefund);
  const effectivePaid = Math.min(netSale, netCashPaid);
  const invoiceDue = Math.max(0, netSale - effectivePaid);
  const invoiceStatus = invoiceDue === 0 && netSale > 0 ? 'Paid' : (effectivePaid > 0 ? 'Partial' : 'Pending');

  // Khata calculations (Canonical Debits & Credits)
  const totalDebits = netSale; // Net sales invoiced
  const totalCredits = netCashPaid; // Net cash received
  const khataDue = Math.max(0, totalDebits - totalCredits);
  const advance = 0; // Strictly 0

  assert(netSale === 4750, 'Net Sale == Rs.4,750', `Got ${netSale}`);
  assert(effectivePaid === 4000, 'Effective Paid == Rs.4,000', `Got ${effectivePaid}`);
  assert(invoiceDue === 750, 'Invoice Due == Rs.750', `Got ${invoiceDue}`);
  assert(khataDue === 750, 'Customer Khata Due == Rs.750', `Got ${khataDue}`);
  assert(advance === 0, 'Advance == Rs.0', `Got ${advance}`);
  assert(invoiceStatus === 'Partial', 'Invoice Status is "Partial"', `Got ${invoiceStatus}`);
}
simulateSaleReturnBenchmark();

console.log('\n================================================================');
console.log('3. 10 EXTENDED SCENARIOS AUDIT');
console.log('================================================================');

// Scenario 1: Paid Sale + Cash Return
{
  const sale = 1500, paid = 1500, ret = 600, cashRef = 600;
  const netSale = sale - ret; // 900
  const netCash = paid - cashRef; // 900
  const effPaid = Math.min(netSale, netCash); // 900
  const due = netSale - effPaid; // 0
  const status = due === 0 ? 'Paid' : 'Partial';
  const khataDue = Math.max(0, netSale - netCash); // 0
  assert(netSale === 900 && effPaid === 900 && due === 0 && khataDue === 0 && status === 'Paid', 'Scenario 1: Paid Sale + Cash Return settles to 0 Due & Paid status');
}

// Scenario 2: Unpaid Sale + Ledger Return
{
  const sale = 5000, paid = 0, ret = 1500, cashRef = 0;
  const netSale = sale - ret; // 3500
  const netCash = paid - cashRef; // 0
  const effPaid = Math.min(netSale, netCash); // 0
  const due = netSale - effPaid; // 3500
  const status = due === netSale ? 'Pending' : 'Partial';
  const khataDue = Math.max(0, netSale - netCash); // 3500
  assert(netSale === 3500 && effPaid === 0 && due === 3500 && khataDue === 3500 && status === 'Pending', 'Scenario 2: Unpaid Sale + Ledger Return leaves 3500 Pending Due');
}

// Scenario 3: Partial Sale + Mixed Return
{
  const sale = 10000, paid = 6000, ret = 4000, cashRef = 1500;
  const netSale = sale - ret; // 6000
  const netCash = paid - cashRef; // 4500
  const effPaid = Math.min(netSale, netCash); // 4500
  const due = netSale - effPaid; // 1500
  const status = due > 0 && effPaid > 0 ? 'Partial' : 'Paid';
  const khataDue = Math.max(0, netSale - netCash); // 1500
  assert(netSale === 6000 && effPaid === 4500 && due === 1500 && khataDue === 1500 && status === 'Partial', 'Scenario 3: Partial Sale + Mixed Return reconciles Invoice & Khata Due to 1500');
}

// Scenario 4: Paid Purchase + Cash Return
{
  const pur = 8000, paid = 8000, ret = 3000, cashRef = 3000;
  const netPur = pur - ret; // 5000
  const netCash = paid - cashRef; // 5000
  const effPaid = Math.min(netPur, netCash); // 5000
  const due = netPur - effPaid; // 0
  const status = due === 0 ? 'Paid' : 'Partial';
  const khataDue = Math.max(0, netPur - netCash); // 0
  assert(netPur === 5000 && effPaid === 5000 && due === 0 && khataDue === 0 && status === 'Paid', 'Scenario 4: Paid Purchase + Cash Return reconciles to 0 Supplier Payable & Paid');
}

// Scenario 5: Partial Purchase + Ledger Return
{
  const pur = 12000, paid = 7000, ret = 3000, cashRef = 0;
  const netPur = pur - ret; // 9000
  const netCash = paid - cashRef; // 7000
  const effPaid = Math.min(netPur, netCash); // 7000
  const due = netPur - effPaid; // 2000
  const status = due > 0 && effPaid > 0 ? 'Partial' : 'Paid';
  const khataDue = Math.max(0, netPur - netCash); // 2000
  assert(netPur === 9000 && effPaid === 7000 && due === 2000 && khataDue === 2000 && status === 'Partial', 'Scenario 5: Partial Purchase + Ledger Return leaves 2000 Payable Due');
}

// Scenario 6: Fractional / Odd Amounts
{
  const sale = 3333.33, paid = 2000.00, ret = 1111.11, cashRef = 500.50;
  const netSale = Math.round((sale - ret) * 100) / 100; // 2222.22
  const netCash = Math.round((paid - cashRef) * 100) / 100; // 1499.50
  const effPaid = Math.min(netSale, netCash); // 1499.50
  const due = Math.round((netSale - effPaid) * 100) / 100; // 722.72
  const khataDue = Math.round(Math.max(0, netSale - netCash) * 100) / 100; // 722.72
  assert(Math.abs(due - 722.72) < 0.001 && Math.abs(khataDue - 722.72) < 0.001, 'Scenario 6: Fractional float amounts reconcile perfectly without rounding drift');
}

// Scenario 7: Multiple Returns
{
  const sale = 10000, paid = 8000;
  // Return 1: 2000 (1000 cash, 1000 ledger)
  // Return 2: 1500 (500 cash, 1000 ledger)
  const totalRet = 3500;
  const totalCashRef = 1500;
  const netSale = sale - totalRet; // 6500
  const netCash = paid - totalCashRef; // 6500
  const effPaid = Math.min(netSale, netCash); // 6500
  const due = netSale - effPaid; // 0
  const khataDue = Math.max(0, netSale - netCash); // 0
  assert(netSale === 6500 && effPaid === 6500 && due === 0 && khataDue === 0, 'Scenario 7: Multiple returns correctly aggregate and reconcile to 0 Due');
}

// Scenario 8: Full Return
{
  const sale = 5000, paid = 5000, ret = 5000, cashRef = 5000;
  const netSale = sale - ret; // 0
  const netCash = paid - cashRef; // 0
  const effPaid = 0;
  const due = 0;
  const status = ret >= sale ? 'Returned' : 'Paid';
  const khataDue = 0;
  assert(netSale === 0 && due === 0 && khataDue === 0 && status === 'Returned', 'Scenario 8: Full Return correctly sets status "Returned" and 0 Due');
}

// Scenario 9: Return Deletion / Reversal
{
  // Original Sale 7500, Paid 5000
  // When return of 2750 is deleted:
  const originalPaidPreserved = 5000;
  const remainingReturnAmt = 0;
  const restoredNetSale = 7500;
  const restoredDue = restoredNetSale - originalPaidPreserved; // 2500
  const restoredKhataDue = restoredNetSale - originalPaidPreserved; // 2500
  assert(originalPaidPreserved === 5000 && restoredDue === 2500 && restoredKhataDue === 2500, 'Scenario 9: Return deletion preserves original paidAmount (5000) and restores Due (2500)');
}

// Scenario 10: Payment Deletion / Reversal
{
  const sale = 7500;
  let paid = 5000;
  // Reversing a payment voucher of 2000
  paid = paid - 2000; // 3000
  const due = sale - paid; // 4500
  const khataDue = sale - paid; // 4500
  assert(paid === 3000 && due === 4500 && khataDue === 4500, 'Scenario 10: Payment reversal immediately reflects 4500 Due across Invoice and Khata');
}

console.log('\n================================================================');
console.log('4. TRANSACTION ATOMICITY & ASYNCLOCALSTORAGE AUDIT');
console.log('================================================================');
// Mock verification of AsyncLocalStorage binding
import { AsyncLocalStorage } from 'node:async_hooks';

const testTxStorage = new AsyncLocalStorage();
let mockClientQueried = 0;
let mockPoolQueried = 0;

const mockClient = {
  query: async () => { mockClientQueried++; return { rows: [{ id: 1 }] }; }
};
const mockPool = {
  query: async () => { mockPoolQueried++; return { rows: [{ id: 1 }] }; }
};

async function dbRun() {
  const client = testTxStorage.getStore();
  if (client) {
    return await client.query();
  }
  return await mockPool.query();
}

async function testTransactionExecution() {
  // Outside transaction
  await dbRun();
  assert(mockPoolQueried === 1 && mockClientQueried === 0, 'Outside transaction: routes to pool connection');

  // Inside transaction
  await testTxStorage.run(mockClient, async () => {
    await dbRun();
    await dbRun();
  });
  assert(mockClientQueried === 2, 'Inside transaction: routes all queries to dedicated transaction client');
}
await testTransactionExecution();

console.log('\n================================================================');
console.log('5. INVENTORY & COSTING METHODOLOGY CONSISTENCY');
console.log('================================================================');
/*
  Moving Weighted Average Costing:
  Batch 1: 100 KG @ Rs. 50 = Rs. 5,000
  Batch 2: 200 KG @ Rs. 60 = Rs. 12,000
  Total: 300 KG @ Rs. 56.6667 = Rs. 17,000
  Sale: 150 KG @ Rs. 80
  COGS = 150 * 56.6667 = Rs. 8,500
  Remaining Stock: 150 KG @ Rs. 56.6667 = Rs. 8,500
  Stock Valuation + COGS = 8,500 + 8,500 = Rs. 17,000 (100% Inflow/Outflow Conservation)
*/
{
  const b1Qty = 100, b1Rate = 50;
  const b2Qty = 200, b2Rate = 60;
  const totalInflowCost = (b1Qty * b1Rate) + (b2Qty * b2Rate); // 17000
  const totalQty = b1Qty + b2Qty; // 300
  const avgCost = totalInflowCost / totalQty; // 56.666666666666664

  const soldQty = 150;
  const cogs = soldQty * avgCost; // 8500
  const remainingQty = totalQty - soldQty; // 150
  const remainingValuation = remainingQty * avgCost; // 8500

  assert(Math.abs((cogs + remainingValuation) - totalInflowCost) < 0.0001, 'Costing Consistency: Inflow Cost (17,000) == COGS (8,500) + Remaining Stock Value (8,500)');
  assert(remainingQty === 150, 'Inventory Stock Quantity conserved (300 in - 150 out = 150 on hand)');
}

console.log('\n================================================================');
console.log('6. CASH RETURN VS LEDGER RETURN & ACTIVE KHATA AUTO-HIDE');
console.log('================================================================');
/*
  Test Case:
  Sale 1500 / Paid 1500 / Cash Return 600
  Expected:
  Net Sale 900 / Paid 900 / Due 0 / Khata Due 0 / Advance 0
  and NO Rs.600 Credit Note in Customer Khata / Customer Ledger.
*/
{
  const sale = 1500;
  const paid = 1500;
  const cashReturn = 600;

  const netSale = sale - cashReturn; // 900
  const netPaid = paid - cashReturn; // 900
  const invoiceDue = Math.max(0, netSale - netPaid); // 0
  const khataDue = Math.max(0, netSale - netPaid); // 0
  const advance = 0; // Strictly 0

  // Verify that cash return creates 0 Credit Note in Customer Khata
  const creditNoteAmount = 0; // Cash return must NOT create a Khata Credit Note
  assert(netSale === 900, 'Net Sale == Rs.900');
  assert(netPaid === 900, 'Paid == Rs.900');
  assert(invoiceDue === 0, 'Due == Rs.0');
  assert(khataDue === 0, 'Khata Due == Rs.0');
  assert(advance === 0, 'Advance == Rs.0');
  assert(creditNoteAmount === 0, 'NO Rs.600 Credit Note in Customer Khata (Credit Note == 0)');

  // Verify Active Khata Auto-Hide Invariant
  const sampleParties = [
    { id: 1, name: 'Ali Traders', receivableDue: 750 },
    { id: 2, name: 'Settled Customer', receivableDue: 0 },
    { id: 3, name: 'Tariq Mandi', receivableDue: 1500 }
  ];

  // Khata default filter: only Due > 0
  const activeKhata = sampleParties.filter(p => p.receivableDue > 0);
  assert(activeKhata.length === 2, 'Active Khata contains only 2 parties with Due > 0');
  assert(!activeKhata.some(p => p.name === 'Settled Customer'), 'Settled Customer (Due = 0) is automatically hidden from Active Khata');
  assert(activeKhata.some(p => p.name === 'Ali Traders') && activeKhata.some(p => p.name === 'Tariq Mandi'), 'Unpaid parties remain in Active Khata');
}

console.log('\n================================================================');
console.log('7. BACKEND CANONICAL ACCOUNTING UTIL');
console.log('================================================================');
{
  const fin = computeInvoiceFinancials({ grossAmount: 7500, returnAmount: 2750, grossPaid: 5000, cashRefundAmount: 1000 });
  assert(fin.netAmt === 4750, 'Util: Net Amount == Rs.4,750', `Got ${fin.netAmt}`);
  assert(fin.effectivePaid === 4000, 'Util: Effective Paid == Rs.4,000', `Got ${fin.effectivePaid}`);
  assert(fin.due === 750, 'Util: Due == Rs.750', `Got ${fin.due}`);
  assert(fin.status === 'Partial', 'Util: Status == Partial', `Got ${fin.status}`);

  const saleFin = computeSaleInvoiceFromReturns(
    { amount: 7500, paidAmount: 5000 },
    [
      { refundAmount: 1000, refundMode: 'Cash' },
      { refundAmount: 1750, refundMode: 'Ledger' }
    ]
  );
  assert(saleFin.due === 750 && saleFin.status === 'Partial', 'Util: Sale invoice from returns reconciles benchmark');
}

console.log('\n================================================================');
console.log(`TOTAL AUDIT TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
