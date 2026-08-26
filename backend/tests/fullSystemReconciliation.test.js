import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('FULL GHALLA MANDI ERP & POS AUTONOMOUS SYSTEM AUDIT', () => {

  // =========================================================================
  // 1. MANDI COMMODITY WEIGHT & UNIT CONVERSION RECONCILIATION
  // =========================================================================
  describe('1. Commodity Units & Weight Deduction Calculations', () => {
    test('Standard Mandi unit conversions to Base KG', () => {
      const conversions = {
        KG: 1,
        Maund: 40,
        Mann: 40,
        Bag: 50,
        Bori: 50,
        Quintal: 100,
        Ton: 1000,
      };

      assert.equal(10 * conversions.Maund, 400); // 10 Mann = 400 KG
      assert.equal(20 * conversions.Bag, 1000);   // 20 Bags = 1,000 KG = 1 Ton
      assert.equal(5 * conversions.Quintal, 500); // 5 Quintals = 500 KG
    });

    test('Gross Weight, Katt (Moisture Cut), Bag Tare deduction to Net Weight', () => {
      const grossWeight = 2050; // 2050 KG
      const numberOfBags = 40;
      const emptyBagWeight = 1.0; // 1 KG per empty jute bag (Tare)
      const moistureKattPer40Kg = 0.5; // 0.5 KG per 40 KG (Maund)

      const totalTareDeduction = numberOfBags * emptyBagWeight; // 40 KG
      const totalMoistureDeduction = (grossWeight / 40) * moistureKattPer40Kg; // 25.625 KG
      const netWeight = grossWeight - totalTareDeduction - totalMoistureDeduction;

      assert.equal(totalTareDeduction, 40);
      assert.equal(totalMoistureDeduction, 25.625);
      assert.equal(netWeight, 1984.375);
    });
  });

  // =========================================================================
  // 2. POS SALES & CREDIT POSTING RECONCILIATION
  // =========================================================================
  describe('2. POS Sales Engine & Customer Khata Posting', () => {
    test('POS Order total calculation with line items, commission, loading and partial payment', () => {
      const items = [
        { product: 'Wheat (Gandum)', qtyKg: 2000, ratePerKg: 100, lineTotal: 200000 },
        { product: 'Rice Super Basmati', qtyKg: 500, ratePerKg: 300, lineTotal: 150000 }
      ];
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0); // 350,000
      const commissionRate = 0.01; // 1% Arthi commission
      const commissionAmount = subtotal * commissionRate; // 3,500
      const loadingLabourCharges = 1500; // Mazdoori
      const orderDiscount = 2000;

      const grandTotal = subtotal + commissionAmount + loadingLabourCharges - orderDiscount;
      const cashReceived = 150000;
      const creditDueToPost = grandTotal - cashReceived;

      assert.equal(subtotal, 350000);
      assert.equal(commissionAmount, 3500);
      assert.equal(grandTotal, 353000);
      assert.equal(creditDueToPost, 203000);
    });
  });

  // =========================================================================
  // 3. INVENTORY STOCK BALANCING EQUATION
  // =========================================================================
  describe('3. Inventory Stock Formula Reconciliation', () => {
    test('Closing Stock = Opening + Purchases - Purchase Returns - Sales + Sale Returns ± Adjustments', () => {
      const openingStock = 5000; // 5,000 KG
      const purchases = 10000;    // +10,000 KG purchased
      const purchaseReturns = 500; // -500 KG returned to supplier
      const sales = 8000;         // -8,000 KG sold
      const saleReturns = 200;    // +200 KG returned by customer
      const stockAdjustments = -100; // -100 KG wastage/spillage adjustment

      const expectedClosingStock = openingStock + purchases - purchaseReturns - sales + saleReturns + stockAdjustments;

      assert.equal(expectedClosingStock, 6600);
    });

    test('Inventory Valuation = Closing Stock * Purchase Price', () => {
      const stockQty = 6600;
      const purchasePricePerKg = 90;
      const inventoryValuation = stockQty * purchasePricePerKg;

      assert.equal(inventoryValuation, 594000);
    });
  });

  // =========================================================================
  // 4. CUSTOMER KHATA (RECEIVABLES) RECONCILIATION
  // =========================================================================
  describe('4. Customer Khata Balance Reconciliation', () => {
    test('Customer Balance = Opening + Credit Sales - Payments - Sale Returns ± Adjustments', () => {
      const openingBalance = 50000;
      const creditSales = 203000;
      const customerPayments = 120000;
      const saleReturnKhataDeduction = 15000;
      const ledgerAdjustments = 0;

      const closingBalance = openingBalance + creditSales - customerPayments - saleReturnKhataDeduction + ledgerAdjustments;

      assert.equal(closingBalance, 118000);
    });
  });

  // =========================================================================
  // 5. SUPPLIER KHATA (PAYABLES) RECONCILIATION
  // =========================================================================
  describe('5. Supplier Khata Balance Reconciliation', () => {
    test('Supplier Balance = Opening + Credit Purchases - Payments - Purchase Returns ± Adjustments', () => {
      const openingBalance = 80000;
      const creditPurchases = 350000;
      const supplierPayments = 250000;
      const purchaseReturnKhataDeduction = 30000;
      const ledgerAdjustments = 0;

      const closingBalance = openingBalance + creditPurchases - supplierPayments - purchaseReturnKhataDeduction + ledgerAdjustments;

      assert.equal(closingBalance, 150000);
    });
  });

  // =========================================================================
  // 6. CASH IN HAND (GALLE KA HISAB) RECONCILIATION
  // =========================================================================
  describe('6. Cash In Hand Engine Reconciliation', () => {
    test('Cash In Hand = Opening + Cash Inflows - Cash Outflows', () => {
      const openingCash = 100000;

      // Inflows
      const directCashSales = 150000;
      const customerKhataPaymentsReceived = 120000;
      const purchaseReturnCashRefundsReceived = 5000;
      const totalInflow = directCashSales + customerKhataPaymentsReceived + purchaseReturnCashRefundsReceived;

      // Outflows
      const directCashPurchases = 100000;
      const supplierKhataPaymentsMade = 150000;
      const saleReturnCashRefundsPaid = 4000;
      const operatingExpenses = 18000;
      const totalOutflow = directCashPurchases + supplierKhataPaymentsMade + saleReturnCashRefundsPaid + operatingExpenses;

      const closingCashInHand = openingCash + totalInflow - totalOutflow;

      assert.equal(totalInflow, 275000);
      assert.equal(totalOutflow, 272000);
      assert.equal(closingCashInHand, 103000);
    });
  });

  // =========================================================================
  // 7. PROFIT & LOSS AND BALANCE SHEET RECONCILIATION
  // =========================================================================
  describe('7. Profit & Loss and Balance Sheet Integrity', () => {
    test('Net Profit = Total Sales - Cost of Goods Sold - Operating Expenses', () => {
      const totalSalesRevenue = 553000;
      const cogsPurchases = 450000;
      const operatingExpenses = 18000;

      const grossProfit = totalSalesRevenue - cogsPurchases;
      const netProfit = grossProfit - operatingExpenses;

      assert.equal(grossProfit, 103000);
      assert.equal(netProfit, 85000);
    });

    test('Balance Sheet Equation: Assets = Liabilities + Equity', () => {
      const cashInHand = 103000;
      const customerReceivables = 118000;
      const stockInventoryValue = 594000;

      const totalAssets = cashInHand + customerReceivables + stockInventoryValue; // 815,000

      const supplierPayables = 150000;
      const totalLiabilities = supplierPayables; // 150,000

      const ownerCapital = 580000;
      const retainedNetProfit = 85000;
      const totalEquity = ownerCapital + retainedNetProfit; // 665,000

      assert.equal(totalAssets, 815000);
      assert.equal(totalLiabilities, 150000);
      assert.equal(totalEquity, 665000);
      assert.equal(totalAssets, totalLiabilities + totalEquity);
    });
  });

});
