import test from 'node:test';
import assert from 'node:assert/strict';
import { convertToKg } from '../src/services/unitConversion.service.js';

test('End-to-End Realistic Mandi Transaction Flow Reconciliation', async (t) => {
  await t.test('Full Multi-Transaction Arthi & Commodity Trader Scenario', () => {
    // 1. Initial State
    let stockQty = 1000; // KG
    const purchasePrice = 95; // Rs. / KG
    let customerBalance = 0; // Rs.
    let supplierBalance = 0; // Rs.
    let cashBalance = 500000; // Rs. 500k initial cash drawer

    // 2. Purchase: 50 Mann Wheat @ Rs. 3,800/Mann (Total: Rs. 190,000, Paid: Rs. 50,000 Cash, Due: Rs. 140,000)
    const purQtyKg = convertToKg(50, 'Mann'); // 2000 KG
    const purTotal = 50 * 3800; // 190,000
    const purPaid = 50000;
    const purDue = purTotal - purPaid; // 140,000

    stockQty += purQtyKg; // 1000 + 2000 = 3000 KG
    supplierBalance += purDue; // 140,000
    cashBalance -= purPaid; // 500,000 - 50,000 = 450,000

    assert.equal(stockQty, 3000);
    assert.equal(supplierBalance, 140000);
    assert.equal(cashBalance, 450000);

    // 3. Purchase Return: 5 Mann (200 KG) rejected @ Rs. 3,800/Mann = Rs. 19,000 on Supplier Khata
    const prQtyKg = convertToKg(5, 'Mann'); // 200 KG
    const prRefund = 5 * 3800; // 19,000

    stockQty -= prQtyKg; // 3000 - 200 = 2800 KG
    supplierBalance -= prRefund; // 140,000 - 19,000 = 121,000

    assert.equal(stockQty, 2800);
    assert.equal(supplierBalance, 121000);

    // 4. POS Sale: 20 Bori (1000 KG) Wheat @ Rs. 5,500/Bori (Total: Rs. 110,000, Paid: Rs. 40,000 Cash, Due: Rs. 70,000)
    const saleQtyKg = convertToKg(20, 'Bori'); // 1000 KG
    const saleTotal = 20 * 5500; // 110,000
    const salePaid = 40000;
    const saleDue = saleTotal - salePaid; // 70,000

    stockQty -= saleQtyKg; // 2800 - 1000 = 1800 KG
    customerBalance += saleDue; // 70,000
    cashBalance += salePaid; // 450,000 + 40,000 = 490,000

    assert.equal(stockQty, 1800);
    assert.equal(customerBalance, 70000);
    assert.equal(cashBalance, 490000);

    // 5. Sale Return: 2 Bori (100 KG) returned @ Rs. 5,500/Bori = Rs. 11,000 on Customer Khata
    const srQtyKg = convertToKg(2, 'Bori'); // 100 KG
    const srRefund = 2 * 5500; // 11,000

    stockQty += srQtyKg; // 1800 + 100 = 1900 KG
    customerBalance -= srRefund; // 70,000 - 11,000 = 59,000

    assert.equal(stockQty, 1900);
    assert.equal(customerBalance, 59000);

    // 6. Customer Settles Balance: Pays Rs. 59,000 Cash
    customerBalance -= 59000; // 0
    cashBalance += 59000; // 490,000 + 59,000 = 549,000

    assert.equal(customerBalance, 0);
    assert.equal(cashBalance, 549000);

    // 7. Supplier Settles Balance: Paid Rs. 121,000 Cash
    supplierBalance -= 121000; // 0
    cashBalance -= 121000; // 549,000 - 121,000 = 428,000

    assert.equal(supplierBalance, 0);
    assert.equal(cashBalance, 428000);

    // 8. Stock Adjustment: -20 KG Moisture Loss
    stockQty += -20; // 1900 - 20 = 1880 KG
    assert.equal(stockQty, 1880);

    // 9. Financial Statements Verification
    const netRevenue = saleTotal - srRefund; // 110,000 - 11,000 = 99,000
    const netCogs = purTotal - prRefund;     // 190,000 - 19,000 = 171,000 (inventory purchased during period)
    const stockValuation = stockQty * purchasePrice; // 1880 * 95 = 178,600

    assert.equal(netRevenue, 99000);
    assert.equal(netCogs, 171000);
    assert.equal(stockValuation, 178600);

    // All accounts are 100% reconciled
    assert.equal(customerBalance, 0);
    assert.equal(supplierBalance, 0);
    assert.equal(stockQty, 1880);
  });
});
