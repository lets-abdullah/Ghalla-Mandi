/** Canonical invoice / bill financial calculations — single source of truth for backend. */

export const sumCashRefunds = (returns = []) =>
  (returns || [])
    .filter(r => String(r.refundMode || '').trim().toLowerCase() === 'cash')
    .reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

export const computeInvoiceFinancials = ({
  grossAmount,
  returnAmount = 0,
  grossPaid = 0,
  cashRefundAmount = null
}) => {
  const origAmt = Number(grossAmount) || 0;
  const totalReturnAmt = Number(returnAmount) || 0;
  const historicalPaid = Number(grossPaid) || 0;
  const netAmt = Math.max(0, origAmt - totalReturnAmt);

  const effectivePaid = Math.min(netAmt, historicalPaid);
  const due = Math.max(0, netAmt - effectivePaid);
  const actualCashRefund = Math.max(0, historicalPaid - netAmt);
  const isFull = (totalReturnAmt >= origAmt || netAmt === 0) && origAmt > 0;
  const status = isFull
    ? 'Returned'
    : (due === 0 && netAmt > 0 ? 'Paid' : (effectivePaid > 0 ? 'Partial' : 'Pending'));

  return {
    grossAmount: origAmt,
    totalReturnAmt,
    netAmt,
    historicalPaid,
    cashRefundAmt: actualCashRefund,
    effectivePaid,
    due,
    status,
    isFull,
    customerCredit: 0,
    supplierCredit: 0
  };
};


export const extractReturnMerchandiseValue = (r) => {
  if (!r) return 0;
  if (Array.isArray(r.items) && r.items.length > 0) {
    const itemsVal = r.items.reduce((sum, it) => sum + Number(it.totalAmount || it.total || ((it.qty || 0) * (it.rate || 0))), 0);
    if (itemsVal > 0) return itemsVal;
  }
  if (r.itemsjson) {
    try {
      const itms = typeof r.itemsjson === 'string' ? JSON.parse(r.itemsjson) : r.itemsjson;
      if (Array.isArray(itms) && itms.length > 0) {
        const itemsVal = itms.reduce((sum, it) => sum + Number(it.totalAmount || it.total || ((it.qty || 0) * (it.rate || 0))), 0);
        if (itemsVal > 0) return itemsVal;
      }
    } catch (e) {}
  }
  return Number(r.totalGoodsValue || r.refundAmount || 0);
};

export const computeSaleInvoiceFromReturns = (sale, relatedReturns = []) => {
  const totalReturnAmt = relatedReturns.reduce((acc, r) => acc + extractReturnMerchandiseValue(r), 0);
  return computeInvoiceFinancials({
    grossAmount: sale.amount || sale.grandTotal || 0,
    returnAmount: totalReturnAmt,
    grossPaid: sale.paidAmount || 0,
    cashRefundAmount: null
  });
};

export const computePurchaseInvoiceFromReturns = (purchase, relatedReturns = []) => {
  const totalReturnAmt = relatedReturns.reduce((acc, r) => acc + extractReturnMerchandiseValue(r), 0);
  return computeInvoiceFinancials({
    grossAmount: purchase.grandTotal || purchase.amount || 0,
    returnAmount: totalReturnAmt,
    grossPaid: purchase.paidAmount || 0,
    cashRefundAmount: null
  });
};

export const syncCustomerBalance = async (customerId, shop_id, dbRun) => {
  if (!customerId || String(customerId).startsWith('walkin-')) return 0;
  
  const custRows = await dbRun('SELECT * FROM customers WHERE id = $1 AND shop_id = $2', [customerId, shop_id]);
  if (!custRows || custRows.length === 0) return 0;
  const cust = custRows[0];
  const openingBalance = Number(cust.openingbalance !== undefined ? cust.openingbalance : (cust.openingBalance !== undefined ? cust.openingBalance : 0));

  const salesRows = await dbRun('SELECT * FROM sales WHERE shop_id = $1 AND customerId = $2', [shop_id, customerId]);
  const grossSales = salesRows.reduce((acc, s) => acc + Number(s.amount || s.grandtotal || 0), 0);

  const returnsRows = await dbRun('SELECT * FROM sale_returns WHERE shop_id = $1 AND customerId = $2', [shop_id, customerId]);
  const totalReturns = returnsRows.reduce((acc, r) => acc + extractReturnMerchandiseValue(r), 0);
  const netSales = Math.max(0, grossSales - totalReturns);

  const paymentRows = await dbRun(
    "SELECT * FROM payment_logs WHERE shop_id = $1 AND partyId = $2 AND LOWER(partyType) = 'customer' AND LOWER(mode) NOT IN ('opening balance', 'credit note', 'debit note')",
    [shop_id, customerId]
  );
  const directPaidLogs = paymentRows.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Upfront POS payments on sales that do not have a separate payment log
  let unloggedUpfrontCash = 0;
  salesRows.forEach(s => {
    const hasMatchingLog = paymentRows.some(p =>
      (p.saleId && String(p.saleId) === String(s.id)) ||
      (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
    );
    if (!hasMatchingLog) {
      const sTotal = Number(s.amount !== undefined ? s.amount : (s.grandtotal !== undefined ? s.grandtotal : 0));
      const sPaid = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount || 0));
      if (sPaid > 0) {
        unloggedUpfrontCash += Math.min(sTotal, sPaid);
      }
    }
  });

  const totalPayments = directPaidLogs + unloggedUpfrontCash;
  const effectivePaymentsReceived = Math.min(totalPayments, netSales);
  const totalDebits = openingBalance + netSales;
  const totalCredits = effectivePaymentsReceived;
  const rawDue = totalDebits - totalCredits;
  const canonicalDue = rawDue < 1 ? 0 : Math.round(rawDue);

  await dbRun('UPDATE customers SET balance = $1 WHERE id = $2 AND shop_id = $3', [canonicalDue, customerId, shop_id]);
  return canonicalDue;
};

export const syncSupplierBalance = async (supplierId, shop_id, dbRun) => {
  if (!supplierId) return { payable: 0, refundDue: 0, balance: 0 };

  const supRows = await dbRun('SELECT * FROM suppliers WHERE id = $1 AND shop_id = $2', [supplierId, shop_id]);
  if (!supRows || supRows.length === 0) return { payable: 0, refundDue: 0, balance: 0 };
  const sup = supRows[0];
  const openingBalance = Number(sup.openingbalance !== undefined ? sup.openingbalance : (sup.openingBalance !== undefined ? sup.openingBalance : 0));

  const purchaseRows = await dbRun('SELECT * FROM purchases WHERE shop_id = $1 AND supplierId = $2', [shop_id, supplierId]);
  const grossPurchases = purchaseRows.reduce((acc, p) => acc + Number(p.grandTotal || p.amount || 0), 0);

  const returnsRows = await dbRun('SELECT * FROM purchase_returns WHERE shop_id = $1 AND supplierId = $2', [shop_id, supplierId]);
  const totalReturns = returnsRows.reduce((acc, r) => acc + extractReturnMerchandiseValue(r), 0);
  const netPurchases = Math.max(0, grossPurchases - totalReturns);

  const paymentRows = await dbRun(
    "SELECT * FROM payment_logs WHERE shop_id = $1 AND partyId = $2 AND LOWER(partyType) = 'supplier' AND LOWER(mode) NOT IN ('opening balance', 'credit note', 'debit note', 'purchase return', 'supplier khata')",
    [shop_id, supplierId]
  );
  const directPaidLogs = paymentRows.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Liquid cash/bank refunds actually received back from supplier
  const liquidRefunds = returnsRows.filter(r => {
    const m = String(r.refundMode || r.refundmode || '').trim().toLowerCase();
    return m === 'cash' || m === 'bank' || m === 'card';
  }).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  let unloggedUpfrontCash = 0;
  purchaseRows.forEach(p => {
    const hasMatchingLog = paymentRows.some(pl =>
      (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
      (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
    );
    if (!hasMatchingLog) {
      const pTotal = Number(p.grandTotal || p.amount || 0);
      const pPaid = Number(p.paidAmount !== undefined ? p.paidAmount : (p.paidamount || 0));
      if (pPaid > 0) {
        unloggedUpfrontCash += Math.min(pTotal, pPaid);
      }
    }
  });

  const totalPayments = directPaidLogs + unloggedUpfrontCash;
  const netPaid = Math.max(0, totalPayments - liquidRefunds);
  const netBilled = openingBalance + netPurchases;

  let canonicalPayable = 0;
  let canonicalRefundDue = 0;

  if (netBilled >= netPaid) {
    canonicalPayable = Math.round(netBilled - netPaid);
    canonicalRefundDue = 0;
  } else {
    canonicalPayable = 0;
    canonicalRefundDue = Math.round(netPaid - netBilled);
  }

  await dbRun('UPDATE suppliers SET balance = $1, refundDue = $2 WHERE id = $3 AND shop_id = $4', [canonicalPayable, canonicalRefundDue, supplierId, shop_id]);
  return { payable: canonicalPayable, refundDue: canonicalRefundDue, balance: canonicalPayable };
};



