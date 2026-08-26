import test from 'node:test';
import assert from 'node:assert/strict';

test('Customer Ledger & Khata Accounting Reconciliation', async (t) => {
  await t.test('Customer balance reconciliation formula', () => {
    const openingBalance = 50000; // Customer owed Rs. 50,000 initially

    // 1. Credit Sale 1: Rs. 100,000 (Paid Rs. 30,000 at POS, Unpaid Due Rs. 70,000)
    const sale1 = { gross: 100000, paid: 30000, due: 70000 };

    // 2. Credit Sale 2: Rs. 45,000 (Paid Rs. 0 at POS, Unpaid Due Rs. 45,000)
    const sale2 = { gross: 45000, paid: 0, due: 45000 };

    // 3. Direct Khata Payment received: Rs. 60,000
    const payment1 = 60000;

    // 4. Sale Return Credit Note (Ledger mode refund): Rs. 15,000
    const returnCreditNote = 15000;

    // Expected Balance = 50000 + 70000 + 45000 - 60000 - 15000 = 90,000
    const netCustomerBalance = openingBalance + sale1.due + sale2.due - payment1 - returnCreditNote;
    assert.equal(netCustomerBalance, 90000);
  });

  await t.test('Customer Ledger Statement Running Balances match Current Balance', () => {
    const entries = [
      { type: 'Opening Balance', debit: 50000, credit: 0 },
      { type: 'Sale INV-001', debit: 100000, credit: 0 },
      { type: 'POS Payment', debit: 0, credit: 30000 },
      { type: 'Sale INV-002', debit: 45000, credit: 0 },
      { type: 'Direct Payment', debit: 0, credit: 60000 },
      { type: 'Sale Return Credit Note', debit: 0, credit: 15000 }
    ];

    let runningBal = 0;
    const computedStatement = entries.map(e => {
      runningBal += (e.debit - e.credit);
      return { ...e, balance: runningBal };
    });

    const totalDebits = entries.reduce((s, e) => s + e.debit, 0); // 50,000 + 100,000 + 45,000 = 195,000
    const totalCredits = entries.reduce((s, e) => s + e.credit, 0); // 30,000 + 60,000 + 15,000 = 105,000

    assert.equal(totalDebits, 195000);
    assert.equal(totalCredits, 105000);
    assert.equal(totalDebits - totalCredits, 90000);
    assert.equal(computedStatement[computedStatement.length - 1].balance, 90000);
  });

  await t.test('Customer advance payment (Credit/Negative balance)', () => {
    let balance = 10000;
    const advanceDeposit = 25000;
    balance -= advanceDeposit;
    assert.equal(balance, -15000); // Rs. 15,000 advance in customer favor
  });
});
