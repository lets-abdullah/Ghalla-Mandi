import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { SaleReturn } from '../models/saleReturn.model.js';
import { PurchaseReturn } from '../models/purchaseReturn.model.js';
import { Expense } from '../models/expense.model.js';
import { createBackup } from '../services/db.service.js';

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const parseTxDate = (dateVal, createdVal) => {
  if (createdVal) {
    const d = new Date(createdVal);
    if (!isNaN(d.getTime())) return d;
  }
  if (!dateVal) return new Date();
  const raw = String(dateVal).trim();
  const ddmmyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3], 10), parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10));
  }
  const yyyymmdd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1], 10), parseInt(yyyymmdd[2], 10) - 1, parseInt(yyyymmdd[3], 10));
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const getDashboardMetrics = async (req, res) => {
  try {
    const shop_id = req.shop_id;

    const [sales, purchases, customers, suppliers, products, saleReturns, purchaseReturns, expenses] = await Promise.all([
      Sale.find({ shop_id }),
      Purchase.find({ shop_id }),
      Customer.find({ shop_id }),
      Supplier.find({ shop_id }),
      Product.find({ shop_id }),
      SaleReturn.find({ shop_id }),
      PurchaseReturn.find({ shop_id }),
      Expense.find({ shop_id })
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // All-time Net Sales and Purchases
    const allTimeGrossSales = sales.reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
    const allTimeSaleReturns = saleReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
    const totalSales = Math.max(0, allTimeGrossSales - allTimeSaleReturns);

    const allTimeGrossPurchases = purchases.reduce((acc, p) => acc + Number(p.grandTotal || p.amount || 0), 0);
    const allTimePurchaseReturns = purchaseReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
    const totalPurchases = Math.max(0, allTimeGrossPurchases - allTimePurchaseReturns);

    // Today's Sales & Purchases (net of today's returns)
    const todaySalesList = sales.filter(s => isSameDay(parseTxDate(s.date, s.created_at), today));
    const todaySaleReturnsList = saleReturns.filter(r => isSameDay(parseTxDate(r.date, r.created_at), today));
    const todayGrossSales = todaySalesList.reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
    const todaySaleReturnsVal = todaySaleReturnsList.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
    const todaySales = Math.max(0, todayGrossSales - todaySaleReturnsVal);

    const todayPurchasesList = purchases.filter(p => isSameDay(parseTxDate(p.date, p.created_at), today));
    const todayPurchaseReturnsList = purchaseReturns.filter(r => isSameDay(parseTxDate(r.date, r.created_at), today));
    const todayGrossPurchases = todayPurchasesList.reduce((acc, p) => acc + Number(p.grandTotal || p.amount || 0), 0);
    const todayPurchaseReturnsVal = todayPurchaseReturnsList.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
    const todayPurchases = Math.max(0, todayGrossPurchases - todayPurchaseReturnsVal);

    // Today's Profit
    const todayProfitGross = todaySalesList.reduce((acc, s) => acc + Number(s.profit || 0), 0);
    const todayExpenses = expenses.filter(e => isSameDay(parseTxDate(e.date, e.created_at), today)).reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const todayProfit = todayProfitGross - todayExpenses;

    const outstandingReceivables = customers.reduce((acc, c) => acc + Math.max(0, Number(c.balance || 0)), 0);
    const outstandingPayables = suppliers.reduce((acc, s) => acc + Math.max(0, Number(s.balance || 0)), 0);

    const lowStockAlerts = products
      .filter(p => Number(p.stockQty || 0) <= Number(p.minStock || 10))
      .map(p => ({
        id: p.id,
        name: p.name,
        currentStock: `${p.stockQty} ${p.unit || 'KG'}`,
        minStock: `${p.minStock || 10} ${p.unit || 'KG'}`
      }));

    const recentSales = sales.slice(0, 5).map(s => ({
      id: s.id,
      type: 'Sale',
      invoiceNo: s.invoiceNo,
      partyName: s.partyName,
      date: s.date,
      amount: s.amount,
      status: s.status
    }));

    const recentPurchases = purchases.slice(0, 5).map(p => ({
      id: p.id,
      type: 'Purchase',
      invoiceNo: p.purchaseNo,
      partyName: p.supplierName,
      date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'Today',
      amount: p.grandTotal,
      status: p.paymentStatus
    }));

    const recentTransactions = [...recentSales, ...recentPurchases].slice(0, 5);

    // Actual 7-day dynamic daily trend
    const weeklyChart = [];
    for (let i = 6; i >= 0; i--) {
      const targetDay = new Date(today);
      targetDay.setDate(targetDay.getDate() - i);
      const dateStr = targetDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      const dayGrossSales = sales.filter(s => isSameDay(parseTxDate(s.date, s.created_at), targetDay)).reduce((acc, s) => acc + Number(s.amount || s.grandTotal || 0), 0);
      const dayReturns = saleReturns.filter(r => isSameDay(parseTxDate(r.date, r.created_at), targetDay)).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

      const dayGrossPurchases = purchases.filter(p => isSameDay(parseTxDate(p.date, p.created_at), targetDay)).reduce((acc, p) => acc + Number(p.grandTotal || p.amount || 0), 0);
      const dayPurReturns = purchaseReturns.filter(r => isSameDay(parseTxDate(r.date, r.created_at), targetDay)).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

      weeklyChart.push({
        date: dateStr,
        sales: Math.max(0, dayGrossSales - dayReturns),
        purchases: Math.max(0, dayGrossPurchases - dayPurReturns)
      });
    }

    return res.json({
      success: true,
      metrics: {
        todaySales,
        todayPurchases,
        todayProfit,
        monthlyRevenue: totalSales,
        outstandingReceivables,
        receivableCustomerCount: customers.filter(c => Number(c.balance || 0) > 0).length,
        outstandingPayables,
        payableSupplierCount: suppliers.filter(s => Number(s.balance || 0) > 0).length
      },
      weeklyChart,
      lowStockAlerts,
      recentTransactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const generateBackup = async (req, res) => {
  try {
    const backupRes = await createBackup();
    return res.json({
      success: true,
      message: 'Database backup created successfully!',
      backup: backupRes
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
