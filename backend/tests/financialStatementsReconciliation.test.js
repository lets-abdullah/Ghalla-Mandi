import test from 'node:test';
import assert from 'node:assert/strict';

test('Financial Statements & Accounting Reconciliation Engine', async (t) => {
  await t.test('Profit & Loss Statement Reconciliation', () => {
    const grossSales = 1500000;
    const saleReturns = 50000;
    const netSales = grossSales - saleReturns; // 1,450,000

    const grossPurchases = 1100000;
    const purchaseReturns = 60000;
    const netCOGS = grossPurchases - purchaseReturns; // 1,040,000

    const grossOperatingProfit = netSales - netCOGS; // 410,000

    const operatingExpenses = [
      { category: 'Labour & Loading (Palla)', amount: 45000 },
      { category: 'Freight & Transportation', amount: 35000 },
      { category: 'Shop Utilities', amount: 15000 }
    ];
    const totalExpenses = operatingExpenses.reduce((s, e) => s + e.amount, 0); // 95,000

    const netOperatingProfit = grossOperatingProfit - totalExpenses; // 315,000

    assert.equal(netSales, 1450000);
    assert.equal(netCOGS, 1040000);
    assert.equal(grossOperatingProfit, 410000);
    assert.equal(totalExpenses, 95000);
    assert.equal(netOperatingProfit, 315000);
  });

  await t.test('Cash in Hand Reconciliation', () => {
    const cashSales = 600000;
    const cashSaleReturns = 20000;
    const customerCashPayments = 250000;
    const supplierCashRefundsOnPR = 15000;

    const cashPurchases = 400000;
    const supplierCashPayments = 200000;
    const operatingExpenses = 95000;

    const totalCashInflow = (cashSales - cashSaleReturns) + customerCashPayments + supplierCashRefundsOnPR; // 580,000 + 250,000 + 15,000 = 845,000
    const totalCashOutflow = cashPurchases + supplierCashPayments + operatingExpenses; // 400,000 + 200,000 + 95,000 = 695,000
    const cashInHand = totalCashInflow - totalCashOutflow; // 150,000

    assert.equal(totalCashInflow, 845000);
    assert.equal(totalCashOutflow, 695000);
    assert.equal(cashInHand, 150000);
  });

  await t.test('Balance Sheet Equation (Assets = Liabilities + Equity)', () => {
    const cashInHand = 150000;
    const customerReceivables = 320000;
    const stockValuation = 450000;

    const totalAssets = cashInHand + customerReceivables + stockValuation; // 920,000
    const totalLiabilities = 240000; // Supplier payables
    const totalEquity = totalAssets - totalLiabilities; // 680,000

    assert.equal(totalAssets, 920000);
    assert.equal(totalLiabilities + totalEquity, totalAssets);
  });

  await t.test('POS Cart Line-Item & Order-Level Discount & Tax Accuracy', () => {
    const cart = [
      { qty: 2, price: 5000, discountPct: 10 }, // 10,000 - 1,000 = 9,000
      { qty: 5, price: 2000, discountPct: 0 }    // 10,000 - 0 = 10,000
    ];

    const grossSubtotal = cart.reduce((sum, item) => {
      const gross = item.qty * item.price;
      const disc = (gross * item.discountPct) / 100;
      return sum + (gross - disc);
    }, 0); // 9,000 + 10,000 = 19,000

    const orderDiscountPercent = 5; // 5% of 19,000 = 950
    const orderDiscount = (grossSubtotal * orderDiscountPercent) / 100;
    const taxableSubtotal = grossSubtotal - orderDiscount; // 18,050

    const taxPercent = 0; // 0%
    const tax = (taxableSubtotal * taxPercent) / 100;
    const grandTotal = Math.round(taxableSubtotal + tax); // 18,050

    assert.equal(grossSubtotal, 19000);
    assert.equal(orderDiscount, 950);
    assert.equal(taxableSubtotal, 18050);
    assert.equal(grandTotal, 18050);
  });
});
