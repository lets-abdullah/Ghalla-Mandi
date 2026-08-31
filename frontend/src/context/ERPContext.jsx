import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { authFetch } from '../services/api';

const ERPContext = createContext();

export const computeSaleFinancials = (sale, saleReturns = [], paymentLogs = []) => {
  if (!sale) return { total: 0, paid: 0, returnAmount: 0, due: 0, status: 'Pending', isReturned: false };
  const total = Number(sale.amount !== undefined ? sale.amount : (sale.grandTotal !== undefined ? sale.grandTotal : (sale.grandtotal !== undefined ? sale.grandtotal : 0)));
  
  // Specific payment logs for this sale invoice
  const directPaid = (paymentLogs || []).filter(pl =>
    (pl.type === 'Customer' || pl.partyType === 'Customer') &&
    (
      (pl.saleId && String(pl.saleId) === String(sale.id)) ||
      (sale.invoiceNo && pl.ref && pl.ref.includes(sale.invoiceNo))
    )
  ).reduce((acc, pl) => acc + Number(pl.amount || 0), 0);

  const isMarkedPaid = sale.status === 'Paid' || sale.paymentStatus === 'Paid';
  const upfrontPaid = isMarkedPaid ? total : Number(sale.paidAmount !== undefined ? sale.paidAmount : (sale.paidamount !== undefined ? sale.paidamount : 0));
  const paid = Math.min(total, Math.max(upfrontPaid, directPaid));

  const returns = (saleReturns || []).filter(r => (r.saleId && String(r.saleId) === String(sale.id)) || (r.invoiceNo && r.invoiceNo === sale.invoiceNo));
  const returnAmount = returns.length > 0 ? returns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0) : Number(sale.returnAmount || 0);
  const isReturned = (sale.status === 'Returned') || sale.isReturned || (sale.returnStatus && sale.returnStatus !== 'None') || (returnAmount >= total && total > 0);
  const due = Math.max(0, total - paid - returnAmount);
  const status = isReturned ? 'Returned' : ((due === 0 && total > 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

  return { total, paid, returnAmount, due, status, isReturned };
};

export const computePurchaseFinancials = (purchase, purchaseReturns = [], paymentLogs = []) => {
  if (!purchase) return { total: 0, paid: 0, returnAmount: 0, due: 0, status: 'Pending', isReturned: false };
  const total = Number(purchase.amount !== undefined ? purchase.amount : (purchase.grandTotal !== undefined ? purchase.grandTotal : (purchase.grandtotal !== undefined ? purchase.grandtotal : 0)));
  
  // Specific payment logs for this purchase
  const directPaid = (paymentLogs || []).filter(pl =>
    (pl.type === 'Supplier' || pl.partyType === 'Supplier') &&
    (
      (pl.purchaseId && String(pl.purchaseId) === String(purchase.id)) ||
      (purchase.purchaseNo && pl.ref && pl.ref.includes(purchase.purchaseNo))
    )
  ).reduce((acc, pl) => acc + Number(pl.amount || 0), 0);

  const isMarkedPaid = purchase.status === 'Paid' || purchase.paymentStatus === 'Paid';
  const upfrontPaid = isMarkedPaid ? total : Number(purchase.paidAmount !== undefined ? purchase.paidAmount : (purchase.paidamount !== undefined ? purchase.paidamount : 0));
  const paid = Math.min(total, Math.max(upfrontPaid, directPaid));

  const returns = (purchaseReturns || []).filter(r => (r.purchaseId && String(r.purchaseId) === String(purchase.id)) || (r.purchaseNo && r.purchaseNo === purchase.purchaseNo));
  const returnAmount = returns.length > 0 ? returns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0) : Number(purchase.returnAmount || 0);
  const isReturned = (purchase.status === 'Returned') || (purchase.paymentStatus === 'Returned') || purchase.isReturned || (purchase.returnStatus && purchase.returnStatus !== 'None') || (returnAmount >= total && total > 0);
  const due = Math.max(0, total - paid - returnAmount);
  const status = isReturned ? 'Returned' : ((due === 0 && total > 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

  return { total, paid, returnAmount, due, status, isReturned };
};

export const computeCustomerKhataBalance = (customer, sales = [], paymentLogs = [], saleReturns = []) => {
  if (!customer) return { openingBalance: 0, totalSale: 0, grossSale: 0, upfrontPaid: 0, directPaid: 0, totalPaid: 0, returnAmount: 0, netSale: 0, netBalance: 0, balance: 0, receivableDue: 0, advanceCredit: 0, status: 'Settled', ordersCount: 0 };
  const custId = customer.id ? String(customer.id) : null;
  const custName = (customer.name || '').trim().toLowerCase();
  const isRegularCust = custId && !custId.startsWith('walkin-') && custName !== 'walk-in customer';

  const custSales = (sales || []).filter(s => {
    const sCustId = s.customerId ? String(s.customerId) : null;
    const sPartyName = (s.partyName || s.customerName || '').trim().toLowerCase();
    const isWalkinSale = (!sCustId && (sPartyName === 'walk-in customer' || sPartyName === '')) ||
      (s.customerType || '').toLowerCase().includes('walk-in');

    if (isRegularCust) {
      if (isWalkinSale && !sCustId) return false;
      return (sCustId && sCustId === custId) || (custName && sPartyName === custName && !sPartyName.includes('walk-in'));
    } else {
      return (custId && sCustId && sCustId === custId) || (custName && sPartyName === custName);
    }
  });

  const totalSale = custSales.reduce((acc, s) => acc + Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0)), 0);

  // Customer Payment Transactions in paymentLogs
  const custPayments = (paymentLogs || []).filter(p => {
    const isCustomer = p.type === 'Customer' || p.partyType === 'Customer';
    if (!isCustomer) return false;
    const pPartyId = p.partyId ? String(p.partyId) : null;
    const pPartyName = (p.partyName || '').trim().toLowerCase();

    if (isRegularCust) {
      return (custId && pPartyId && pPartyId === custId) ||
        (custName && pPartyName === custName && !pPartyName.includes('walk-in'));
    } else {
      return (custId && pPartyId && pPartyId === custId) || (custName && pPartyName === custName);
    }
  });

  // Calculate actual total paid:
  // 1. For each sale, paid amount is full sale amount if marked Paid, or recorded paidAmount, or direct payment log for that sale
  let salesPaidSum = 0;
  custSales.forEach(s => {
    const sTotal = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));
    const isMarkedPaid = s.status === 'Paid' || s.paymentStatus === 'Paid';
    const sUpfront = isMarkedPaid ? sTotal : Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount !== undefined ? s.paidamount : 0));
    const sDirectLogs = custPayments.filter(p =>
      (p.saleId && String(p.saleId) === String(s.id)) ||
      (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
    ).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    salesPaidSum += Math.max(sUpfront, sDirectLogs);
  });

  const totalPaidLogs = custPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalPaid = Math.max(totalPaidLogs, salesPaidSum);

  const returnAmount = (saleReturns || []).filter(r => {
    const rCustId = r.customerId ? String(r.customerId) : null;
    const rCustName = (r.customerName || '').trim().toLowerCase();
    if (isRegularCust) {
      return (custId && rCustId && rCustId === custId) || (custName && rCustName === custName && !rCustName.includes('walk-in'));
    } else {
      return (custId && rCustId && rCustId === custId) || (custName && rCustName === custName);
    }
  }).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

  const openingBalance = Number(customer.openingBalance !== undefined ? customer.openingBalance : (customer.openingbalance !== undefined ? customer.openingbalance : 0));
  const netSales = Math.max(0, totalSale - returnAmount);
  // Net Balance: Opening + (Gross Sales - Returns) - Payments
  // Positive = Customer owes Mandi (Receivable Due)
  // Negative = Mandi owes Customer (Advance Credit / Overpayment)
  // Exactly 0 = Fully Settled
  const netBalance = openingBalance + (totalSale - returnAmount) - totalPaid;
  const receivableDue = Math.max(0, netBalance);
  const advanceCredit = Math.max(0, -netBalance);
  const status = netBalance > 0 ? 'Due' : (netBalance < 0 ? 'Advance' : 'Settled');

  return {
    openingBalance,
    totalSale,
    grossSale: totalSale,
    upfrontPaid: totalPaid,
    directPaid: totalPaidLogs,
    totalPaid,
    returnAmount,
    netSale: netSales,
    netBalance,
    balance: receivableDue,
    receivableDue,
    advanceCredit,
    status,
    ordersCount: custSales.length
  };
};

export const computeAllCustomersFinancials = (customers = [], sales = [], paymentLogs = [], saleReturns = []) => {
  const registeredCustIds = new Set((customers || []).map(c => String(c.id)));
  const registeredCustNames = new Set((customers || []).map(c => (c.name || '').trim().toLowerCase()));

  // 1. Registered Customers
  const registeredList = (customers || []).map(cust => {
    const fin = computeCustomerKhataBalance(cust, sales, paymentLogs, saleReturns);
    const isWalkin = (cust.customerType || '').toLowerCase().includes('walk-in');
    return {
      ...cust,
      customerType: isWalkin ? 'Walk-in Customer' : 'Regular Customer',
      isRegistered: true,
      ...fin
    };
  });

  // 2. Walk-in Customer Parties
  const walkinSalesMap = new Map();
  (sales || []).forEach(s => {
    const sCustId = s.customerId ? String(s.customerId) : null;
    const sName = (s.partyName || s.customerName || '').trim().toLowerCase();
    const isRegistered = (sCustId && registeredCustIds.has(sCustId)) ||
      (sName && registeredCustNames.has(sName) && sName !== 'walk-in customer');

    if (!isRegistered) {
      const rawName = (s.partyName || s.customerName || 'Walk-in Customer').trim();
      const key = rawName.toLowerCase();
      if (!walkinSalesMap.has(key)) {
        walkinSalesMap.set(key, { name: rawName, sales: [] });
      }
      walkinSalesMap.get(key).sales.push(s);
    }
  });

  const walkinList = [];
  walkinSalesMap.forEach((val, key) => {
    const fin = computeCustomerKhataBalance({ id: `walkin-${key}`, name: val.name, customerType: 'Walk-in Customer' }, val.sales, paymentLogs, saleReturns);
    walkinList.push({
      id: `walkin-${key}`,
      name: val.name,
      businessName: 'Walk-in Party',
      phone: 'Counter Sale',
      city: 'Local Mandi',
      customerType: 'Walk-in Customer',
      isRegistered: false,
      ...fin
    });
  });

  const allCustomers = [...registeredList, ...walkinList];

  const totalGrossSales = allCustomers.reduce((sum, c) => sum + Number(c.totalSale || 0), 0);
  const totalReturns = allCustomers.reduce((sum, c) => sum + Number(c.returnAmount || 0), 0);
  const totalNetSales = allCustomers.reduce((sum, c) => sum + Number(c.netSale || 0), 0);
  const totalPaymentsReceived = allCustomers.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0);
  const totalReceivables = allCustomers.reduce((sum, c) => sum + Number(c.receivableDue || 0), 0);
  const totalCustomerCredits = allCustomers.reduce((sum, c) => sum + Number(c.advanceCredit || 0), 0);
  const settledCount = allCustomers.filter(c => c.status === 'Settled' || c.netBalance === 0).length;

  return {
    allCustomers,
    registeredList,
    walkinList,
    totalGrossSales,
    totalReturns,
    totalNetSales,
    totalPaymentsReceived,
    totalReceivables,
    totalCustomerCredits,
    settledCount
  };
};

export const computeProductValuation = (product, purchases = [], sales = [], saleReturns = [], purchaseReturns = [], stockMovements = []) => {
  if (!product) return { qty: 0, avgCost: 0, stockValue: 0, sellingRate: 0, purchaseRate: 0, latestPurchaseRate: 0, totalInflowQty: 0, totalOutflowQty: 0, batches: [], activeBatches: [] };
  
  const prodId = product.id ? String(product.id) : null;
  const prodName = (product.name || '').trim().toLowerCase();

  const isMatch = (it) => {
    if (!it) return false;
    const itId = it.productId || it.id || it.product_id;
    if (prodId && itId && String(itId) === prodId) return true;
    const itName = (it.name || it.productName || it.item || '').trim().toLowerCase();
    return prodName && itName && (itName === prodName || itName.includes(prodName) || prodName.includes(itName));
  };

  const initialQty = Number(product.openingStock ?? product.initialStock ?? product.opening_stock ?? product.initial_stock ?? product.stockQty ?? product.stock_qty ?? 0);
  const initialRate = Number(product.purchasePrice ?? product.purchase_price ?? product.rate ?? 0);
  const sellingRate = Number(product.sellingPrice ?? product.selling_price ?? 0);

  // Collect all transactions in chronological order
  const events = [];

  if (initialQty > 0) {
    events.push({
      id: `open-${product.id || 0}`,
      date: new Date(product.created_at || '2026-01-01').getTime() || 0,
      dateStr: product.created_at ? new Date(product.created_at).toLocaleDateString('en-GB') : 'Opening',
      type: 'OPENING',
      ref: 'OPENING-STOCK',
      qty: initialQty,
      rate: initialRate
    });
  }

  // Purchases (IN)
  (purchases || []).forEach(p => {
    const pDate = new Date(p.created_at || p.createdAt || p.date || 0).getTime() || 0;
    const pDateStr = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = p.cart || p.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        events.push({
          id: `pur-${p.id || p.purchaseNo}-${idx}`,
          date: pDate,
          dateStr: pDateStr,
          type: 'PURCHASE',
          ref: p.purchaseNo ? `PUR-#${p.purchaseNo}` : `PUR-${p.id}`,
          qty: Number(it.qty || it.quantity || 0),
          rate: Number(it.rate ?? it.price ?? it.purchasePrice ?? initialRate)
        });
      }
    });
  });

  // Purchase Returns (OUT to vendor)
  (purchaseReturns || []).forEach(pr => {
    const prDate = new Date(pr.created_at || pr.createdAt || pr.date || 0).getTime() || 0;
    const prDateStr = pr.date || (pr.created_at ? new Date(pr.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = pr.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        events.push({
          id: `pret-${pr.id || pr.returnNo}-${idx}`,
          date: prDate,
          dateStr: prDateStr,
          type: 'PURCHASE_RETURN',
          ref: pr.returnNo ? `PR-#${pr.returnNo}` : `PR-${pr.id}`,
          qty: Number(it.qty || it.quantity || 0),
          rate: Number(it.rate ?? it.price ?? it.refundRate ?? 0)
        });
      }
    });
  });

  // Sales (OUT to customer)
  (sales || []).forEach(s => {
    const sDate = new Date(s.created_at || s.createdAt || s.date || 0).getTime() || 0;
    const sDateStr = s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = s.cart || s.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        events.push({
          id: `sale-${s.id || s.invoiceNo}-${idx}`,
          date: sDate,
          dateStr: sDateStr,
          type: 'SALE',
          ref: s.invoiceNo ? `INV-#${s.invoiceNo}` : `INV-${s.id}`,
          qty: Number(it.qty || it.quantity || 0),
          rate: Number(it.rate ?? it.price ?? it.sellingPrice ?? sellingRate)
        });
      }
    });
  });

  // Sale Returns (IN back from customer)
  (saleReturns || []).forEach(sr => {
    const srDate = new Date(sr.created_at || sr.createdAt || sr.date || 0).getTime() || 0;
    const srDateStr = sr.date || (sr.created_at ? new Date(sr.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = sr.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        events.push({
          id: `sret-${sr.id || sr.returnNo}-${idx}`,
          date: srDate,
          dateStr: srDateStr,
          type: 'SALE_RETURN',
          ref: sr.returnNo ? `SR-#${sr.returnNo}` : `SR-${sr.id}`,
          qty: Number(it.qty || it.quantity || 0),
          rate: Number(it.rate ?? it.price ?? 0)
        });
      }
    });
  });

  // Manual Adjustments from stockMovements
  (stockMovements || []).forEach((m, idx) => {
    const mDate = new Date(m.created_at || m.createdAt || m.date || 0).getTime() || 0;
    const mDateStr = m.date || (m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : 'N/A');
    if (isMatch(m) || isMatch({ name: m.product || m.productName })) {
      const typeUpper = (m.type || '').toUpperCase();
      const refUpper = (m.ref || '').toUpperCase();
      const isAlreadyTracked = refUpper.includes('PURCHASE') || refUpper.includes('SALE') || refUpper.includes('RETURN') || refUpper.includes('INV-') || refUpper.includes('PUR-');
      if (!isAlreadyTracked) {
        const isStockIn = typeUpper.includes('IN') || Number(m.qty || 0) > 0;
        events.push({
          id: `adj-${m.id || idx}`,
          date: mDate,
          dateStr: mDateStr,
          type: isStockIn ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          ref: m.ref || 'Adjustment',
          qty: Math.abs(Number(m.qty || 0)),
          rate: Number(m.rate ?? initialRate)
        });
      }
    }
  });

  // Sort chronologically
  events.sort((a, b) => a.date - b.date);

  // If no transactions exist, fallback to direct product stockQty and purchasePrice
  if (events.length === 0) {
    const currentStock = Number(product.stockQty !== undefined ? product.stockQty : (product.stockqty !== undefined ? product.stockqty : 0));
    return {
      qty: currentStock,
      avgCost: initialRate,
      stockValue: currentStock * initialRate,
      sellingRate,
      purchaseRate: initialRate,
      latestPurchaseRate: initialRate,
      totalInflowQty: currentStock,
      totalOutflowQty: 0,
      batches: initialQty > 0 ? [{
        id: 'open-0',
        batchId: 'OPENING',
        dateStr: 'Opening',
        type: 'Opening Stock',
        initialQty,
        rate: initialRate,
        initialTotalCost: initialQty * initialRate,
        remainingQty: initialQty,
        remainingValue: initialQty * initialRate
      }] : [],
      activeBatches: []
    };
  }

  // FIFO Batch Engine & Moving Cost Tracking
  const batches = [];
  let totalInflowQty = 0;
  let totalOutflowQty = 0;
  let latestPurchaseRate = initialRate;

  events.forEach(ev => {
    if (ev.type === 'OPENING' || ev.type === 'PURCHASE' || ev.type === 'ADJUSTMENT_IN') {
      const batchRate = ev.rate > 0 ? ev.rate : initialRate;
      if (ev.type === 'PURCHASE' || (ev.type === 'OPENING' && latestPurchaseRate === 0)) {
        latestPurchaseRate = batchRate;
      }
      batches.push({
        id: ev.id,
        batchId: ev.ref || `BATCH-${batches.length + 1}`,
        dateStr: ev.dateStr,
        type: ev.type === 'OPENING' ? 'Opening Stock' : (ev.type === 'PURCHASE' ? 'Purchase' : 'Adjustment In'),
        initialQty: ev.qty,
        rate: batchRate,
        initialTotalCost: ev.qty * batchRate,
        remainingQty: ev.qty,
        remainingValue: ev.qty * batchRate
      });
      totalInflowQty += ev.qty;
    } else if (ev.type === 'SALE' || ev.type === 'PURCHASE_RETURN' || ev.type === 'ADJUSTMENT_OUT') {
      let needed = ev.qty;
      totalOutflowQty += ev.qty;

      // FIFO deduction from oldest active batches
      for (let i = 0; i < batches.length; i++) {
        if (needed <= 0) break;
        const b = batches[i];
        if (b.remainingQty > 0) {
          const deduct = Math.min(b.remainingQty, needed);
          b.remainingQty -= deduct;
          b.remainingValue = b.remainingQty * b.rate;
          needed -= deduct;
        }
      }
    } else if (ev.type === 'SALE_RETURN') {
      let returnRestored = ev.qty;
      totalInflowQty += ev.qty;

      // Restore to most recently deducted batch
      for (let i = batches.length - 1; i >= 0; i--) {
        if (returnRestored <= 0) break;
        const b = batches[i];
        const capacity = b.initialQty - b.remainingQty;
        if (capacity > 0) {
          const restore = Math.min(capacity, returnRestored);
          b.remainingQty += restore;
          b.remainingValue = b.remainingQty * b.rate;
          returnRestored -= restore;
        }
      }

      // If more returned than original batch capacities, add as return lot
      if (returnRestored > 0) {
        const returnRate = latestPurchaseRate > 0 ? latestPurchaseRate : initialRate;
        batches.push({
          id: ev.id,
          batchId: ev.ref || `SR-LOT-${batches.length + 1}`,
          dateStr: ev.dateStr,
          type: 'Sale Return In',
          initialQty: returnRestored,
          rate: returnRate,
          initialTotalCost: returnRestored * returnRate,
          remainingQty: returnRestored,
          remainingValue: returnRestored * returnRate
        });
      }
    }
  });

  const totalCurrentStock = batches.reduce((sum, b) => sum + b.remainingQty, 0);
  const totalStockValue = batches.reduce((sum, b) => sum + b.remainingValue, 0);
  const averageCost = totalCurrentStock > 0 ? (totalStockValue / totalCurrentStock) : (latestPurchaseRate || initialRate);
  const activeBatches = batches.filter(b => b.remainingQty > 0);

  return {
    qty: totalCurrentStock,
    avgCost: averageCost,
    stockValue: totalStockValue,
    sellingRate,
    purchaseRate: averageCost,
    latestPurchaseRate,
    totalInflowQty,
    totalOutflowQty,
    batches,
    activeBatches
  };
};

export const computeWalkinUncollectedDues = (sales = [], saleReturns = []) => {
  return (sales || []).filter(s => {
    const sCustId = s.customerId ? String(s.customerId) : null;
    const sPartyName = (s.partyName || s.customerName || '').trim().toLowerCase();
    const isWalkin = !sCustId || sPartyName === 'walk-in customer' || (s.customerType || '').toLowerCase().includes('walk-in');
    return isWalkin;
  }).reduce((acc, s) => {
    const fin = computeSaleFinancials(s, saleReturns);
    return acc + Math.max(0, fin.due);
  }, 0);
};

export const computeSupplierKhataBalance = (supplier, purchases = [], paymentLogs = [], purchaseReturns = []) => {
  if (!supplier) return { openingBalance: 0, totalPurchase: 0, upfrontPaid: 0, directPaid: 0, totalPaid: 0, returnAmount: 0, balance: 0, status: 'Clear', ordersCount: 0 };
  const supId = supplier.id ? String(supplier.id) : null;
  const supName = (supplier.name || '').trim().toLowerCase();

  const supPurchases = (purchases || []).filter(p => {
    const pSupId = p.supplierId ? String(p.supplierId) : null;
    const pSupName = (p.supplier || p.supplierName || '').trim().toLowerCase();
    return (supId && pSupId && pSupId === supId) || (supName && pSupName === supName);
  });

  const totalPurchase = supPurchases.reduce((acc, p) => acc + Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0)), 0);

  // Single Source of Truth: Supplier Payment Transactions recorded in paymentLogs
  const supPayments = (paymentLogs || []).filter(p => {
    const isSupplier = p.type === 'Supplier' || p.partyType === 'Supplier';
    if (!isSupplier) return false;
    const pPartyId = p.partyId ? String(p.partyId) : null;
    const pPartyName = (p.partyName || '').trim().toLowerCase();
    return (supId && pPartyId && pPartyId === supId) || (supName && pPartyName === supName);
  });

  const totalPaidLogs = supPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Fallback to upfront purchase paidAmount only if no ledger payment logs exist
  const upfrontOnly = supPurchases.reduce((acc, p) => acc + Number(p.paidAmount || 0), 0);
  const totalPaid = totalPaidLogs > 0 ? totalPaidLogs : upfrontOnly;

  const returnAmount = (purchaseReturns || []).filter(r => {
    const rSupId = r.supplierId ? String(r.supplierId) : null;
    const rSupName = (r.supplierName || '').trim().toLowerCase();
    return (supId && rSupId && rSupId === supId) || (supName && rSupName === supName);
  }).reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

  const openingBalance = Number(supplier.openingBalance !== undefined ? supplier.openingBalance : (supplier.openingbalance !== undefined ? supplier.openingbalance : 0));
  const netPurchases = Math.max(0, totalPurchase - returnAmount);
  const balance = Math.max(0, openingBalance + netPurchases - totalPaid);
  const status = balance > 0 ? 'Payable' : 'Settled';

  return {
    openingBalance,
    totalPurchase,
    upfrontPaid: totalPaid,
    directPaid: totalPaidLogs,
    totalPaid,
    returnAmount,
    balance,
    status,
    ordersCount: supPurchases.length
  };
};

const normalizePurchase = (p) => {
  if (!p) return null;
  const grandTotal = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : (p.grandtotal !== undefined ? p.grandtotal : 0)));
  const paidAmount = Number(p.paidAmount !== undefined ? p.paidAmount : (p.paidamount !== undefined ? p.paidamount : 0));
  const supplierName = p.supplier || p.supplierName || p.suppliername || 'Supplier';
  const purchaseNo = p.purchaseNo || p.purchaseno || '';
  const status = (p.status === 'Returned' || p.paymentStatus === 'Returned') ? 'Returned' : ((paidAmount >= grandTotal && grandTotal > 0) ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');
  const date = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const items = Array.isArray(p.items) ? p.items : (Array.isArray(p.cart) ? p.cart : []);
  const paymentMode = p.paymentMode || p.paymentmode || p.paymentMethod || p.paymentmethod || (paidAmount > 0 ? 'Cash' : 'Supplier Khata');

  return {
    ...p,
    id: p.id,
    purchaseNo,
    purchaseno: purchaseNo,
    supplier: supplierName,
    supplierName,
    suppliername: supplierName,
    amount: grandTotal,
    grandTotal,
    grandtotal: grandTotal,
    paidAmount,
    paidamount: paidAmount,
    paymentMode,
    paymentmode: paymentMode,
    paymentMethod: paymentMode,
    status,
    paymentStatus: status,
    date,
    items,
    cart: p.cart || items
  };
};

const normalizeSale = (s) => {
  if (!s) return null;
  const amount = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : (s.grandtotal !== undefined ? s.grandtotal : 0)));
  const paidAmount = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount !== undefined ? s.paidamount : 0));
  const partyName = s.partyName || s.partyname || s.customerName || s.customername || 'Walk-in Customer';
  const invoiceNo = s.invoiceNo || s.invoiceno || '';
  const isReturned = (s.status === 'Returned') || (s.returnStatus && s.returnStatus !== 'None');
  const status = isReturned ? 'Returned' : ((paidAmount >= amount && amount > 0) ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');
  const date = s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const profit = Number(s.profit !== undefined ? s.profit : 0);
  const cart = Array.isArray(s.cart) ? s.cart : (Array.isArray(s.items) ? s.items : []);
  const paymentMode = s.paymentMode || s.paymentmode || s.paymentMethod || s.paymentmethod || (paidAmount > 0 ? 'Cash' : 'Khata (Udhaar)');

  return {
    ...s,
    id: s.id,
    invoiceNo,
    invoiceno: invoiceNo,
    partyName,
    customerName: partyName,
    amount,
    grandTotal: amount,
    paidAmount,
    paidamount: paidAmount,
    paymentMode,
    paymentmode: paymentMode,
    paymentMethod: paymentMode,
    status,
    paymentStatus: status,
    profit,
    date,
    cart,
    items: s.items || cart
  };
};

const normalizeProduct = (p) => {
  if (!p) return null;
  const purchasePrice = Number(p.purchasePrice !== undefined ? p.purchasePrice : (p.purchaseprice !== undefined ? p.purchaseprice : 0));
  const sellingPrice = Number(p.sellingPrice !== undefined ? p.sellingPrice : (p.sellingprice !== undefined ? p.sellingprice : 0));
  const stockQty = Number(p.stockQty !== undefined ? p.stockQty : (p.stockqty !== undefined ? p.stockqty : 0));
  const minStock = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : (p.minStockThreshold !== undefined ? p.minStockThreshold : 10)));
  const unit = p.unit || p.baseUnit || 'KG';

  return {
    ...p,
    id: p.id,
    shop_id: p.shop_id,
    code: p.code || '',
    name: p.name || '',
    category: p.category || 'General',
    purchasePrice,
    purchaseprice: purchasePrice,
    sellingPrice,
    sellingprice: sellingPrice,
    stockQty,
    stockqty: stockQty,
    minStock,
    minstock: minStock,
    minStockThreshold: minStock,
    unit,
    baseUnit: unit,
    image: p.image || ''
  };
};

const normalizeCustomer = (c) => {
  if (!c) return null;
  const openingBalance = Number(c.openingBalance !== undefined ? c.openingBalance : (c.openingbalance !== undefined ? c.openingbalance : 0));
  const balance = Number(c.balance !== undefined ? c.balance : openingBalance);
  const customerType = c.customerType || c.customertype || 'Regular Party';

  return {
    ...c,
    id: c.id,
    shop_id: c.shop_id,
    name: c.name || '',
    phone: c.phone || '',
    city: c.city || '',
    customerType,
    customertype: customerType,
    openingBalance,
    openingbalance: openingBalance,
    balance
  };
};

const normalizeSupplier = (s) => {
  if (!s) return null;
  const openingBalance = Number(s.openingBalance !== undefined ? s.openingBalance : (s.openingbalance !== undefined ? s.openingbalance : 0));
  const balance = Number(s.balance !== undefined ? s.balance : openingBalance);
  const suppliedProducts = s.suppliedProducts || s.suppliedproductsjson || [];

  return {
    ...s,
    id: s.id,
    shop_id: s.shop_id,
    name: s.name || '',
    phone: s.phone || '',
    city: s.city || '',
    openingBalance,
    openingbalance: openingBalance,
    balance,
    suppliedProducts
  };
};

const normalizePaymentLog = (p) => {
  if (!p) return null;
  const partyId = p.partyId || p.partyid || null;
  const partyType = p.partyType || p.partytype || 'Customer';
  const partyName = p.partyName || p.partyname || 'Party';
  const amount = Number(p.amount !== undefined ? p.amount : 0);
  const mode = p.mode || p.paymentMode || 'Cash';
  const date = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const ref = p.ref || '';
  const note = p.note || '';

  return {
    ...p,
    id: p.id,
    shop_id: p.shop_id,
    partyId,
    partyid: partyId,
    partyType,
    partytype: partyType,
    partyName,
    partyname: partyName,
    amount,
    mode,
    paymentMode: mode,
    date,
    ref,
    note
  };
};

const normalizeSaleReturn = (r) => {
  if (!r) return null;
  const refundAmount = Number(r.refundAmount !== undefined ? r.refundAmount : (r.refundamount !== undefined ? r.refundamount : 0));
  const items = Array.isArray(r.items) ? r.items : (Array.isArray(r.itemsJson) ? r.itemsJson : []);
  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    returnNo: r.returnNo || r.returnno || '',
    saleId: r.saleId || r.saleid || null,
    invoiceNo: r.invoiceNo || r.invoiceno || '',
    customerId: r.customerId || r.customerid || null,
    customerName: r.customerName || r.customername || 'Customer Party',
    refundAmount,
    refundamount: refundAmount,
    refundMode: r.refundMode || r.refundmode || 'Cash',
    reason: r.reason || '',
    date: r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')),
    items,
    itemsJson: items
  };
};

const normalizePurchaseReturn = (r) => {
  if (!r) return null;
  const refundAmount = Number(r.refundAmount !== undefined ? r.refundAmount : (r.refundamount !== undefined ? r.refundamount : 0));
  const items = Array.isArray(r.items) ? r.items : (Array.isArray(r.itemsJson) ? r.itemsJson : []);
  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    returnNo: r.returnNo || r.returnno || '',
    purchaseId: r.purchaseId || r.purchaseid || null,
    purchaseNo: r.purchaseNo || r.purchaseno || '',
    supplierId: r.supplierId || r.supplierid || null,
    supplierName: r.supplierName || r.suppliername || 'Supplier Firm',
    refundAmount,
    refundamount: refundAmount,
    refundMode: r.refundMode || r.refundmode || 'Cash',
    reason: r.reason || '',
    date: r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')),
    items,
    itemsJson: items
  };
};

const normalizeExpense = (e) => {
  if (!e) return null;
  const amount = Number(e.amount !== undefined ? e.amount : 0);
  return {
    ...e,
    id: e.id,
    shop_id: e.shop_id,
    category: e.category || 'General Miscellaneous',
    amount,
    mode: e.mode || 'Cash',
    date: e.date || (e.created_at ? new Date(e.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    desc: e.desc || e.desc_text || '',
    desc_text: e.desc || e.desc_text || ''
  };
};

export const ERPProvider = ({ children }) => {
  const { user, token } = useAuth();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [saleReturns, setSaleReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all ERP data from backend API for authenticated shop
  const fetchAllData = useCallback(async () => {
    if (!token || !user) {
      setCategories([]);
      setProducts([]);
      setCustomers([]);
      setSuppliers([]);
      setSales([]);
      setPurchases([]);
      setPaymentLogs([]);
      setStockMovements([]);
      setSaleReturns([]);
      setPurchaseReturns([]);
      setExpenses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        catRes,
        prodRes,
        custRes,
        supRes,
        saleRes,
        purRes,
        ledgerRes,
        movRes,
        expRes,
        sRetRes,
        pRetRes
      ] = await Promise.all([
        authFetch('/api/products/categories'),
        authFetch('/api/products'),
        authFetch('/api/customers'),
        authFetch('/api/suppliers'),
        authFetch('/api/sales'),
        authFetch('/api/purchases'),
        authFetch('/api/ledger'),
        authFetch('/api/inventory/movements'),
        authFetch('/api/expenses'),
        authFetch('/api/returns/sales'),
        authFetch('/api/returns/purchases')
      ]);

      const sortDesc = (arr) => [...arr].sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || a.date || 0).getTime() || Number(a.id) || 0;
        const timeB = new Date(b.created_at || b.createdAt || b.date || 0).getTime() || Number(b.id) || 0;
        return timeB - timeA;
      });

      if (catRes.success) setCategories(catRes.categories || []);
      if (prodRes.success) setProducts(sortDesc((prodRes.products || []).map(normalizeProduct)));
      if (custRes.success) setCustomers(sortDesc((custRes.customers || []).map(normalizeCustomer)));
      if (supRes.success) setSuppliers(sortDesc((supRes.suppliers || []).map(normalizeSupplier)));
      if (saleRes.success) setSales(sortDesc((saleRes.sales || []).map(normalizeSale)));
      if (purRes.success) setPurchases(sortDesc((purRes.purchases || []).map(normalizePurchase)));
      if (ledgerRes.success) setPaymentLogs(sortDesc((ledgerRes.entries || []).map(normalizePaymentLog)));
      if (movRes.success) setStockMovements(sortDesc(movRes.movements || []));
      if (expRes.success) setExpenses(sortDesc((expRes.expenses || []).map(normalizeExpense)));
      if (sRetRes.success) setSaleReturns(sortDesc((sRetRes.saleReturns || sRetRes.returns || []).map(normalizeSaleReturn)));
      if (pRetRes.success) setPurchaseReturns(sortDesc((pRetRes.purchaseReturns || pRetRes.returns || []).map(normalizePurchaseReturn)));
    } catch (err) {
      console.error('Failed to load ERP dataset from server:', err);
      setError(err.message || 'Error loading data from server');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 1. Add Category
  const addCategory = async (categoryData) => {
    try {
      const res = await authFetch('/api/products/categories', {
        method: 'POST',
        body: categoryData
      });

      if (res.success && res.category) {
        setCategories(prev => [...prev, res.category]);
        return res.category;
      }
      throw new Error(res.message || 'Failed to create category');
    } catch (err) {
      console.error('addCategory error:', err);
      throw err;
    }
  };

  // 2. Edit Category
  const updateCategory = async (id, updatedFields) => {
    try {
      const res = await authFetch(`/api/products/categories/${id}`, {
        method: 'PUT',
        body: updatedFields
      });

      if (res.success && res.category) {
        setCategories(prev => prev.map(c => c.id === id ? res.category : c));
        return res.category;
      }
      throw new Error(res.message || 'Failed to update category');
    } catch (err) {
      console.error('updateCategory error:', err);
      throw err;
    }
  };

  // 3. Add Product
  const addProduct = async (productData) => {
    try {
      const payload = {
        name: productData.name,
        category: productData.category,
        code: productData.code,
        baseUnit: productData.unit || productData.defaultUnit || 'KG',
        stockQty: Number(productData.stockQty) || 0,
        minStockThreshold: Number(productData.minStock) || 10,
        purchasePrice: Number(productData.purchasePrice) || 0,
        sellingPrice: Number(productData.sellingPrice) || 0,
        image: productData.image || ''
      };

      const res = await authFetch('/api/products', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.product) {
        const norm = normalizeProduct(res.product);
        setProducts(prev => [...prev, norm]);
        return norm;
      }
      throw new Error(res.message || 'Failed to create product');
    } catch (err) {
      console.error('addProduct error:', err);
      throw err;
    }
  };

  // 4. Update Product
  const updateProduct = async (id, updatedFields) => {
    try {
      const res = await authFetch(`/api/products/${id}`, {
        method: 'PUT',
        body: updatedFields
      });

      if (res.success && res.product) {
        const norm = normalizeProduct(res.product);
        setProducts(prev => prev.map(p => p.id === id ? norm : p));
        return norm;
      }
      throw new Error(res.message || 'Failed to update product');
    } catch (err) {
      console.error('updateProduct error:', err);
      throw err;
    }
  };

  // 5. Delete Product
  const deleteProduct = async (id) => {
    try {
      const res = await authFetch(`/api/products/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete product');
    } catch (err) {
      console.error('deleteProduct error:', err);
      throw err;
    }
  };

  // 6. Adjust Stock
  const adjustStock = async (productId, adjustmentKg, type = 'ADJUSTMENT', reason = 'Manual Stock Audit') => {
    try {
      const res = await authFetch(`/api/products/${productId}/adjust-stock`, {
        method: 'POST',
        body: { adjustmentKg: Number(adjustmentKg), reason }
      });

      if (res.success && res.product) {
        const norm = normalizeProduct(res.product);
        setProducts(prev => prev.map(p => p.id === productId ? norm : p));
        // Refresh stock movements
        const movRes = await authFetch('/api/inventory/movements');
        if (movRes.success) setStockMovements(movRes.movements || []);
        return norm;
      }
      throw new Error(res.message || 'Failed to adjust stock');
    } catch (err) {
      console.error('adjustStock error:', err);
      throw err;
    }
  };

  // 7. Add Customer
  const addCustomer = async (customerData) => {
    try {
      const payload = {
        name: customerData.name,
        businessName: customerData.businessName || customerData.shopName || '',
        phone: customerData.phone || '',
        whatsapp: customerData.whatsapp || '',
        email: customerData.email || '',
        city: customerData.city || 'Local Mandi',
        address: customerData.address || '',
        customerType: customerData.customerType || 'Regular Party',
        openingBalance: Number(customerData.openingBalance) || 0,
        bankName: customerData.bankName || '',
        accountTitle: customerData.accountTitle || '',
        accountNumber: customerData.accountNumber || customerData.iban || '',
        notes: customerData.notes || ''
      };

      const res = await authFetch('/api/customers', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.customer) {
        const fullCust = { ...payload, ...res.customer };
        setCustomers(prev => [...prev, fullCust]);
        return fullCust;
      }
      throw new Error(res.message || 'Failed to add customer');
    } catch (err) {
      console.error('addCustomer error:', err);
      throw err;
    }
  };

  const updateCustomer = async (id, updatedData) => {
    try {
      const res = await authFetch(`/api/customers/${id}`, {
        method: 'PUT',
        body: updatedData
      });

      if (res.success && res.customer) {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedData, ...res.customer } : c));
        return { ...updatedData, ...res.customer };
      }
      throw new Error(res.message || 'Failed to update customer');
    } catch (err) {
      console.error('updateCustomer error:', err);
      throw err;
    }
  };

  const deleteCustomer = async (id) => {
    try {
      const res = await authFetch(`/api/customers/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete customer');
    } catch (err) {
      console.error('deleteCustomer error:', err);
      throw err;
    }
  };

  // 8. Add Supplier
  const addSupplier = async (supplierData) => {
    try {
      const payload = {
        name: supplierData.name,
        businessName: supplierData.businessName || supplierData.firmName || '',
        phone: supplierData.phone || '',
        whatsapp: supplierData.whatsapp || '',
        email: supplierData.email || '',
        city: supplierData.city || 'Local Mandi',
        address: supplierData.address || '',
        openingBalance: Number(supplierData.openingBalance) || 0,
        suppliedProducts: supplierData.suppliedProducts || [],
        bankName: supplierData.bankName || '',
        accountTitle: supplierData.accountTitle || '',
        accountNumber: supplierData.accountNumber || supplierData.iban || '',
        status: supplierData.status || 'Active',
        notes: supplierData.notes || ''
      };

      const res = await authFetch('/api/suppliers', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.supplier) {
        const fullSup = { ...payload, ...res.supplier };
        setSuppliers(prev => [...prev, fullSup]);
        return fullSup;
      }
      throw new Error(res.message || 'Failed to add supplier');
    } catch (err) {
      console.error('addSupplier error:', err);
      throw err;
    }
  };

  const updateSupplier = async (id, updatedData) => {
    try {
      const res = await authFetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: updatedData
      });

      if (res.success && res.supplier) {
        setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updatedData, ...res.supplier } : s));
        return { ...updatedData, ...res.supplier };
      }
      throw new Error(res.message || 'Failed to update supplier');
    } catch (err) {
      console.error('updateSupplier error:', err);
      throw err;
    }
  };

  const deleteSupplier = async (id) => {
    try {
      const res = await authFetch(`/api/suppliers/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setSuppliers(prev => prev.filter(s => s.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete supplier');
    } catch (err) {
      console.error('deleteSupplier error:', err);
      throw err;
    }
  };

  const inFlightLocks = useRef(new Map());

  // 9. Record Payment with anti-duplicate lock
  const recordPayment = async ({ partyId, partyName, partyType, amount, paymentMode = 'Cash', note = '', saleId = null, purchaseId = null }) => {
    const lockKey = `pay:${partyId || partyName || ''}:${partyType}:${amount}:${saleId || ''}:${purchaseId || ''}`;
    if (inFlightLocks.current.has(lockKey)) {
      return inFlightLocks.current.get(lockKey);
    }

    const promise = (async () => {
      try {
        const res = await authFetch('/api/ledger/payment', {
          method: 'POST',
          body: { partyId, partyName, partyType, amount, paymentMode, note, saleId, purchaseId }
        });

        if (res.success && res.entry) {
          if (!res.deduplicated) {
            setPaymentLogs(prev => [res.entry, ...prev]);

            if (partyType === 'Customer') {
              const [custRes, saleRes] = await Promise.all([
                authFetch('/api/customers'),
                authFetch('/api/sales')
              ]);
              if (custRes.success) setCustomers(custRes.customers || []);
              if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
            } else {
              const [supRes, purRes] = await Promise.all([
                authFetch('/api/suppliers'),
                authFetch('/api/purchases')
              ]);
              if (supRes.success) setSuppliers(supRes.suppliers || []);
              if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
            }
          }

          return res.entry;
        }
        throw new Error(res.message || 'Failed to record payment');
      } catch (err) {
        console.error('recordPayment error:', err);
        throw err;
      } finally {
        setTimeout(() => {
          inFlightLocks.current.delete(lockKey);
        }, 2000);
      }
    })();

    inFlightLocks.current.set(lockKey, promise);
    return promise;
  };

  // 10. Record Purchase with anti-duplicate lock
  const recordPurchase = async (purchaseData) => {
    const rawItems = purchaseData.cart || (purchaseData.productId ? [{
      productId: purchaseData.productId,
      name: purchaseData.productName || purchaseData.name,
      productName: purchaseData.productName || purchaseData.name,
      unit: purchaseData.unit || purchaseData.unitName || 'KG',
      unitName: purchaseData.unitName || purchaseData.unit || 'KG',
      qty: Number(purchaseData.qtyKg || purchaseData.qty) || 1,
      rate: Number(purchaseData.rate) || 0,
      total: (Number(purchaseData.qtyKg || purchaseData.qty) || 1) * (Number(purchaseData.rate) || 0)
    }] : []);

    const items = rawItems.map(item => ({
      productId: item.productId || item.id,
      name: item.name || item.productName || 'Product',
      productName: item.productName || item.name || 'Product',
      unit: item.unit || item.unitName || item.enteredUnit || 'KG',
      unitName: item.unitName || item.unit || item.enteredUnit || 'KG',
      qty: Number(item.qty || item.enteredQty) || 1,
      enteredQty: Number(item.qty || item.enteredQty) || 1,
      rate: Number(item.rate || item.price || item.ratePerEnteredUnit) || 0,
      ratePerEnteredUnit: Number(item.rate || item.price || item.ratePerEnteredUnit) || 0,
      total: Number(item.total || item.totalAmount) || ((Number(item.qty || 1)) * (Number(item.rate || 0))),
      totalAmount: Number(item.total || item.totalAmount) || ((Number(item.qty || 1)) * (Number(item.rate || 0)))
    }));

    const payload = {
      supplierName: purchaseData.supplierName || purchaseData.supplier || '',
      supplierId: purchaseData.supplierId || null,
      paidAmount: Number(purchaseData.paidAmount) || 0,
      notes: purchaseData.notes || '',
      items
    };

    const lockKey = `pur:${payload.supplierId || payload.supplierName}:${items.length}:${items[0]?.productId}:${items[0]?.qty}:${payload.paidAmount}`;
    if (inFlightLocks.current.has(lockKey)) {
      return inFlightLocks.current.get(lockKey);
    }

    const promise = (async () => {
      try {
        const res = await authFetch('/api/purchases', {
          method: 'POST',
          body: payload
        });

        if (res.success && res.purchase) {
          const norm = normalizePurchase(res.purchase);
          if (!res.deduplicated) {
            setPurchases(prev => [norm, ...prev]);

            const [prodRes, supRes, movRes] = await Promise.all([
              authFetch('/api/products'),
              authFetch('/api/suppliers'),
              authFetch('/api/inventory/movements')
            ]);
            if (prodRes.success) setProducts(prodRes.products || []);
            if (supRes.success) setSuppliers(supRes.suppliers || []);
            if (movRes.success) setStockMovements(movRes.movements || []);
          }

          return norm;
        }
        throw new Error(res.message || 'Failed to record purchase');
      } catch (err) {
        console.error('recordPurchase error:', err);
        throw err;
      } finally {
        setTimeout(() => {
          inFlightLocks.current.delete(lockKey);
        }, 2000);
      }
    })();

    inFlightLocks.current.set(lockKey, promise);
    return promise;
  };

  // 11. Create Sale POS Invoice with anti-duplicate lock
  const createSale = async (saleData) => {
    const items = (saleData.cart || []).map(item => ({
      productId: item.productId || item.id,
      name: item.name,
      qty: Number(item.qty) || 1,
      rate: Number(item.rate) || 0,
      unitName: item.unitName || item.unit || 'KG'
    }));

    const payload = {
      customerName: saleData.customerName || 'Walk-in Customer',
      customerId: saleData.customerId || null,
      items,
      paidAmount: Number(saleData.paidAmount) || 0,
      discount: Number(saleData.discount) || 0,
      tax: Number(saleData.tax) || 0,
      paymentMethod: saleData.paymentMethod || saleData.paymentMode || 'Cash'
    };

    const lockKey = `sale:${payload.customerId || payload.customerName}:${items.length}:${items[0]?.productId}:${items[0]?.qty}:${payload.paidAmount}`;
    if (inFlightLocks.current.has(lockKey)) {
      return inFlightLocks.current.get(lockKey);
    }

    const promise = (async () => {
      try {
        const res = await authFetch('/api/sales', {
          method: 'POST',
          body: payload
        });

        if (res.success && res.sale) {
          const norm = normalizeSale(res.sale);
          if (!res.deduplicated) {
            setSales(prev => [norm, ...prev]);

            const [prodRes, custRes, movRes] = await Promise.all([
              authFetch('/api/products'),
              authFetch('/api/customers'),
              authFetch('/api/inventory/movements')
            ]);
            if (prodRes.success) setProducts(prodRes.products || []);
            if (custRes.success) setCustomers(custRes.customers || []);
            if (movRes.success) setStockMovements(movRes.movements || []);
          }

          return norm;
        }
        throw new Error(res.message || 'Failed to create sale');
      } catch (err) {
        console.error('createSale error:', err);
        throw err;
      } finally {
        setTimeout(() => {
          inFlightLocks.current.delete(lockKey);
        }, 2000);
      }
    })();

    inFlightLocks.current.set(lockKey, promise);
    return promise;
  };

  // 12. Record Sale Return (Restocks inventory, adjusts customer khata, logs return via backend API)
  const recordSaleReturn = async (returnData) => {
    try {
      const res = await authFetch('/api/returns/sales', {
        method: 'POST',
        body: returnData
      });

      if (res.success && (res.saleReturn || res.return)) {
        const norm = normalizeSaleReturn(res.saleReturn || res.return);
        setSaleReturns(prev => [norm, ...prev]);

        // Refresh products, sales, customers, ledger, and movements to reflect returns accurately
        const [prodRes, custRes, saleRes, ledgerRes, movRes] = await Promise.all([
          authFetch('/api/products'),
          authFetch('/api/customers'),
          authFetch('/api/sales'),
          authFetch('/api/ledger'),
          authFetch('/api/inventory/movements')
        ]);

        if (prodRes.success) setProducts((prodRes.products || []).map(normalizeProduct));
        if (custRes.success) setCustomers((custRes.customers || []).map(normalizeCustomer));
        if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
        if (ledgerRes.success) setPaymentLogs((ledgerRes.entries || []).map(normalizePaymentLog));
        if (movRes.success) setStockMovements(movRes.movements || []);

        return norm;
      }
      throw new Error(res.message || 'Failed to record sale return');
    } catch (err) {
      console.error('recordSaleReturn error:', err);
      throw err;
    }
  };

  const updateSaleReturn = async (id, updatedData) => {
    try {
      const res = await authFetch(`/api/returns/sales/${id}`, {
        method: 'PUT',
        body: updatedData
      });
      if (res.success && (res.saleReturn || res.return)) {
        const norm = normalizeSaleReturn(res.saleReturn || res.return);
        setSaleReturns(prev => prev.map(r => r.id === id ? norm : r));
        return norm;
      }
      throw new Error(res.message || 'Failed to update sale return');
    } catch (err) {
      console.error('updateSaleReturn error:', err);
      throw err;
    }
  };

  const deleteSaleReturn = async (id) => {
    try {
      const res = await authFetch(`/api/returns/sales/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSaleReturns(prev => prev.filter(r => r.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete sale return');
    } catch (err) {
      console.error('deleteSaleReturn error:', err);
      throw err;
    }
  };

  // 13. Record Purchase Return (Deducts stock, adjusts supplier khata, logs return via backend API)
  const recordPurchaseReturn = async (returnData) => {
    try {
      const res = await authFetch('/api/returns/purchases', {
        method: 'POST',
        body: returnData
      });

      if (res.success && (res.purchaseReturn || res.return)) {
        const norm = normalizePurchaseReturn(res.purchaseReturn || res.return);
        setPurchaseReturns(prev => [norm, ...prev]);

        // Refresh products, purchases, suppliers, ledger, and movements
        const [prodRes, supRes, purRes, ledgerRes, movRes] = await Promise.all([
          authFetch('/api/products'),
          authFetch('/api/suppliers'),
          authFetch('/api/purchases'),
          authFetch('/api/ledger'),
          authFetch('/api/inventory/movements')
        ]);

        if (prodRes.success) setProducts((prodRes.products || []).map(normalizeProduct));
        if (supRes.success) setSuppliers((supRes.suppliers || []).map(normalizeSupplier));
        if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
        if (ledgerRes.success) setPaymentLogs((ledgerRes.entries || []).map(normalizePaymentLog));
        if (movRes.success) setStockMovements(movRes.movements || []);

        return norm;
      }
      throw new Error(res.message || 'Failed to record purchase return');
    } catch (err) {
      console.error('recordPurchaseReturn error:', err);
      throw err;
    }
  };

  const updatePurchaseReturn = async (id, updatedData) => {
    try {
      const res = await authFetch(`/api/returns/purchases/${id}`, {
        method: 'PUT',
        body: updatedData
      });
      if (res.success && (res.purchaseReturn || res.return)) {
        const norm = normalizePurchaseReturn(res.purchaseReturn || res.return);
        setPurchaseReturns(prev => prev.map(r => r.id === id ? norm : r));
        return norm;
      }
      throw new Error(res.message || 'Failed to update purchase return');
    } catch (err) {
      console.error('updatePurchaseReturn error:', err);
      throw err;
    }
  };

  const deletePurchaseReturn = async (id) => {
    try {
      const res = await authFetch(`/api/returns/purchases/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setPurchaseReturns(prev => prev.filter(r => r.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete purchase return');
    } catch (err) {
      console.error('deletePurchaseReturn error:', err);
      throw err;
    }
  };

  // 14. Expense CRUD (Strictly scoped to tenant via API)
  const addExpense = async (expenseData) => {
    try {
      const res = await authFetch('/api/expenses', {
        method: 'POST',
        body: expenseData
      });

      if (res.success && res.expense) {
        const norm = normalizeExpense(res.expense);
        setExpenses(prev => [norm, ...prev]);
        return norm;
      }
      throw new Error(res.message || 'Failed to record expense');
    } catch (err) {
      console.error('addExpense error:', err);
      throw err;
    }
  };

  const updateExpense = async (id, updatedData) => {
    try {
      const res = await authFetch(`/api/expenses/${id}`, {
        method: 'PUT',
        body: updatedData
      });
      if (res.success && res.expense) {
        const norm = normalizeExpense(res.expense);
        setExpenses(prev => prev.map(e => e.id === id ? norm : e));
        return norm;
      }
      throw new Error(res.message || 'Failed to update expense');
    } catch (err) {
      console.error('updateExpense error:', err);
      throw err;
    }
  };

  const deleteExpense = async (id) => {
    try {
      const res = await authFetch(`/api/expenses/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete expense');
    } catch (err) {
      console.error('deleteExpense error:', err);
      throw err;
    }
  };

  // 15. Update Existing Sale POS Invoice
  const updateSale = async (id, saleData) => {
    const items = (saleData.cart || saleData.items || []).map(item => ({
      productId: item.productId || item.id,
      name: item.name,
      qty: Number(item.qty || item.enteredQty) || 1,
      rate: Number(item.rate || item.price || item.ratePerEnteredUnit) || 0,
      unitName: item.unitName || item.unit || 'KG'
    }));

    const payload = {
      customerName: saleData.customerName || saleData.partyName || 'Walk-in Customer',
      customerId: saleData.customerId !== undefined ? saleData.customerId : null,
      items,
      paidAmount: Number(saleData.paidAmount) || 0,
      discount: Number(saleData.discount) || 0,
      tax: Number(saleData.tax) || 0,
      paymentMethod: saleData.paymentMethod || saleData.paymentMode || 'Cash'
    };

    try {
      const res = await authFetch(`/api/sales/${id}`, {
        method: 'PUT',
        body: payload
      });

      if (res.success && res.sale) {
        const norm = normalizeSale(res.sale);
        setSales(prev => prev.map(s => s.id === id ? norm : s));

        const [prodRes, custRes, movRes] = await Promise.all([
          authFetch('/api/products'),
          authFetch('/api/customers'),
          authFetch('/api/inventory/movements')
        ]);
        if (prodRes.success) setProducts((prodRes.products || []).map(normalizeProduct));
        if (custRes.success) setCustomers((custRes.customers || []).map(normalizeCustomer));
        if (movRes.success) setStockMovements(movRes.movements || []);

        return norm;
      }
      throw new Error(res.message || 'Failed to update sale');
    } catch (err) {
      console.error('updateSale error:', err);
      throw err;
    }
  };

  const updatePurchase = async (id, purchaseData) => {
    const rawItems = purchaseData.items || purchaseData.cart || [];
    const items = rawItems.map(item => {
      const p = products.find(prod => prod.id === item.productId || prod.name === item.name);
      const unit = item.unit || item.unitName || (p ? p.unit : 'KG');
      const qty = Number(item.qty || item.enteredQty) || 1;
      const rate = Number(item.rate || item.price || item.ratePerEnteredUnit) || 0;
      return {
        productId: p ? p.id : item.productId,
        name: p ? p.name : (item.name || item.productName),
        productName: p ? p.name : (item.name || item.productName),
        unit,
        unitName: unit,
        enteredUnit: unit,
        qty,
        enteredQty: qty,
        rate,
        ratePerEnteredUnit: rate,
        price: rate,
        total: qty * rate,
        totalAmount: qty * rate
      };
    });

    const payload = {
      supplierName: purchaseData.supplierName || purchaseData.supplier || 'Supplier',
      supplierId: purchaseData.supplierId !== undefined ? purchaseData.supplierId : null,
      items,
      paidAmount: Number(purchaseData.paidAmount) || 0,
      notes: purchaseData.notes || ''
    };

    try {
      const res = await authFetch(`/api/purchases/${id}`, {
        method: 'PUT',
        body: payload
      });

      if (res.success && res.purchase) {
        const norm = normalizePurchase(res.purchase);
        setPurchases(prev => prev.map(p => p.id === id ? norm : p));

        const [prodRes, supRes] = await Promise.all([
          authFetch('/api/products'),
          authFetch('/api/suppliers')
        ]);
        if (prodRes.success) setProducts((prodRes.products || []).map(normalizeProduct));
        if (supRes.success) setSuppliers((supRes.suppliers || []).map(normalizeSupplier));

        return norm;
      }
      throw new Error(res.message || 'Failed to update purchase');
    } catch (err) {
      console.error('updatePurchase error:', err);
      throw err;
    }
  };

  return (
    <ERPContext.Provider value={{
      categories,
      products,
      customers,
      suppliers,
      sales,
      purchases,
      paymentLogs,
      stockMovements,
      saleReturns,
      purchaseReturns,
      expenses,
      loading,
      error,
      refreshData: fetchAllData,
      addCategory,
      updateCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      recordPayment,
      recordPurchase,
      createPurchase: recordPurchase,
      updatePurchase,
      createSale,
      updateSale,
      recordSaleReturn,
      updateSaleReturn,
      deleteSaleReturn,
      recordPurchaseReturn,
      updatePurchaseReturn,
      deletePurchaseReturn,
      addExpense,
      updateExpense,
      deleteExpense,
      computeSaleFinancials,
      computePurchaseFinancials,
      computeCustomerKhataBalance,
      computeWalkinUncollectedDues,
      computeSupplierKhataBalance
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => useContext(ERPContext);
