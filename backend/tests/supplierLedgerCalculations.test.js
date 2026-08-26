import test from 'node:test';
import assert from 'node:assert/strict';

test('Supplier Ledger & Payable Accounting Reconciliation', async (t) => {
  await t.test('Supplier balance reconciliation formula', () => {
    const openingBalance = 80000; // Owed to supplier initially

    // 1. Credit Purchase 1: Rs. 200,000 (Paid Rs. 50,000, Unpaid Due Rs. 150,000)
    const purchase1 = { gross: 200000, paid: 50000, due: 150000 };

    // 2. Credit Purchase 2: Rs. 80,000 (Paid Rs. 0, Unpaid Due Rs. 80,000)
    const purchase2 = { gross: 80000, paid: 0, due: 80000 };

    // 3. Direct Supplier Payment made: Rs. 120,000
    const payment1 = 120000;

    // 4. Purchase Return Debit Note (Supplier goods rejection deduction): Rs. 25,000
    const returnDebitNote = 25000;

    // Expected Balance = 80000 + 150000 + 80000 - 120000 - 25000 = 165,000
    const netSupplierBalance = openingBalance + purchase1.due + purchase2.due - payment1 - returnDebitNote;
    assert.equal(netSupplierBalance, 165000);
  });

  await t.test('Supplier Ledger Statement Running Balances match Current Balance', () => {
    const entries = [
      { type: 'Opening Balance', debit: 0, credit: 80000 },
      { type: 'Purchase PUR-001', debit: 0, credit: 200000 },
      { type: 'Payment on Purchase', debit: 50000, credit: 0 },
      { type: 'Purchase PUR-002', debit: 0, credit: 80000 },
      { type: 'Direct Payment', debit: 120000, credit: 0 },
      { type: 'Purchase Return Debit Note', debit: 25000, credit: 0 }
    ];

    let runningBal = 0;
    const computedStatement = entries.map(e => {
      runningBal += (e.credit - e.debit);
      return { ...e, balance: runningBal };
    });

    const totalCredits = entries.reduce((s, e) => s + e.credit, 0); // 80,000 + 200,000 + 80,000 = 360,000
    const totalDebits = entries.reduce((s, e) => s + e.debit, 0);   // 50,000 + 120,000 + 25,000 = 195,000

    assert.equal(totalCredits, 360000);
    assert.equal(totalDebits, 195000);
    assert.equal(totalCredits - totalDebits, 165000);
    assert.equal(computedStatement[computedStatement.length - 1].balance, 165000);
  });
});
