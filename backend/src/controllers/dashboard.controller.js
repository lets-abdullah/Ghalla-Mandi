import { Sale } from '../models/sale.model.js';
import { Purchase } from '../models/purchase.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Supplier } from '../models/supplier.model.js';
import { createBackup } from '../services/db.service.js';

export const getDashboardMetrics = async (req, res) => {
  try {
    const shop_id = req.shop_id;

    const sales = await Sale.find({ shop_id });
    const purchases = await Purchase.find({ shop_id });
    const customers = await Customer.find({ shop_id });
    const suppliers = await Supplier.find({ shop_id });
    const products = await Product.find({ shop_id });

    const totalSales = sales.reduce((acc, s) => acc + Number(s.amount || 0), 0);
    const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.grandTotal || 0), 0);
    const totalProfit = sales.reduce((acc, s) => acc + Number(s.profit || 0), 0);

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

    const weeklyChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      weeklyChart.push({
        date: dateStr,
        sales: Math.floor(totalSales > 0 ? (totalSales / 7) : 0),
        purchases: Math.floor(totalPurchases > 0 ? (totalPurchases / 7) : 0)
      });
    }

    return res.json({
      success: true,
      metrics: {
        todaySales: totalSales,
        todayPurchases: totalPurchases,
        todayProfit: totalProfit,
        monthlyRevenue: totalSales,
        outstandingReceivables,
        receivableCustomerCount: customers.length,
        outstandingPayables,
        payableSupplierCount: suppliers.length
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
