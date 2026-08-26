import test from 'node:test';
import assert from 'node:assert/strict';
import { convertToKg } from '../src/services/unitConversion.service.js';

test('Inventory Stock Reconciliation Engine', async (t) => {
  await t.test('Full lifecycle stock formula in KG', () => {
    const openingStock = 1000; // KG
    const purchases = [
      { qty: 500, unit: 'KG' },
      { qty: 10, unit: 'Mann' }, // 10 * 40 = 400 KG
      { qty: 4, unit: 'Bag' }    // 4 * 50 = 200 KG
    ];
    const purchaseReturns = [
      { qty: 50, unit: 'KG' },
      { qty: 1, unit: 'Mann' }   // 1 * 40 = 40 KG
    ];
    const sales = [
      { qty: 300, unit: 'KG' },
      { qty: 5, unit: 'Mann' },  // 5 * 40 = 200 KG
      { qty: 2, unit: 'Bag' }    // 2 * 50 = 100 KG
    ];
    const saleReturns = [
      { qty: 20, unit: 'KG' },
      { qty: 1, unit: 'Bag' }    // 1 * 50 = 50 KG
    ];
    const adjustments = [
      { qtyKg: -10, reason: 'Moisture loss / Katt' },
      { qtyKg: +5, reason: 'Weight recalibration' }
    ];

    const totalPurchasedKg = purchases.reduce((sum, p) => sum + convertToKg(p.qty, p.unit), 0); // 500 + 400 + 200 = 1100
    const totalPurchaseReturnedKg = purchaseReturns.reduce((sum, r) => sum + convertToKg(r.qty, r.unit), 0); // 50 + 40 = 90
    const totalSoldKg = sales.reduce((sum, s) => sum + convertToKg(s.qty, s.unit), 0); // 300 + 200 + 100 = 600
    const totalSaleReturnedKg = saleReturns.reduce((sum, r) => sum + convertToKg(r.qty, r.unit), 0); // 20 + 50 = 70
    const totalAdjustmentsKg = adjustments.reduce((sum, a) => sum + a.qtyKg, 0); // -10 + 5 = -5

    assert.equal(totalPurchasedKg, 1100);
    assert.equal(totalPurchaseReturnedKg, 90);
    assert.equal(totalSoldKg, 600);
    assert.equal(totalSaleReturnedKg, 70);
    assert.equal(totalAdjustmentsKg, -5);

    const closingStock = openingStock + totalPurchasedKg - totalPurchaseReturnedKg - totalSoldKg + totalSaleReturnedKg + totalAdjustmentsKg;
    // 1000 + 1100 - 90 - 600 + 70 - 5 = 1475 KG
    assert.equal(closingStock, 1475);
  });

  await t.test('Inventory Valuation formula', () => {
    const products = [
      { stockQty: 100, purchasePrice: 250 }, // 25,000
      { stockQty: 40, purchasePrice: 400 },  // 16,000
      { stockQty: 0, purchasePrice: 300 }    // 0
    ];
    const totalValuation = products.reduce((sum, p) => sum + (p.stockQty * p.purchasePrice), 0);
    assert.equal(totalValuation, 41000);
  });
});
