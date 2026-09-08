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
    : (due === 0 && netAmt > 0 ? 'Paid' : (effectivePaid > 0 ? 'Partial' : (due > 0 ? 'Payable' : 'Pending')));

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
  const items = Array.isArray(purchase.items) ? purchase.items : (Array.isArray(purchase.cart) ? purchase.cart : []);
  const itemsSum = items.reduce((sum, it) => {
    const qty = Number(it.qty ?? it.enteredQty ?? it.quantity ?? 1);
    const rate = Number(it.rate ?? it.price ?? it.ratePerEnteredUnit ?? 0);
    return sum + (Number(it.total ?? it.totalAmount) || (qty * rate));
  }, 0);
  const rawTotal = Number(purchase.grandTotal || purchase.amount || purchase.totalAmount || 0);
  const grossAmount = rawTotal > 0 ? rawTotal : itemsSum;
  const totalReturnAmt = relatedReturns.reduce((acc, r) => acc + extractReturnMerchandiseValue(r), 0);
  return computeInvoiceFinancials({
    grossAmount,
    returnAmount: totalReturnAmt,
    grossPaid: purchase.paidAmount || purchase.paid || 0,
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

  // Unique cash refunds actually paid out to customer
  const liquidRefunds = returnsRows.filter(r => {
    const mode = String(r.refundMode || r.refundmode || '').trim().toLowerCase();
    return (mode === 'cash' || mode === 'bank account' || mode === 'bank' || mode === 'card') && Number(r.refundAmount || 0) > 0;
  }).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  const grossPaymentsReceived = directPaidLogs + unloggedUpfrontCash;
  const effectivePaid = Math.max(0, grossPaymentsReceived - liquidRefunds);
  const totalDebits = openingBalance + netSales;
  const rawDue = totalDebits - effectivePaid;
  const canonicalDue = rawDue < 1 ? 0 : Math.round(rawDue);
  const refundLiability = rawDue < 0 ? Math.abs(Math.round(rawDue)) : 0;

  await dbRun('UPDATE customers SET balance = $1 WHERE id = $2 AND shop_id = $3', [canonicalDue, customerId, shop_id]);
  return { due: canonicalDue, refundLiability };
};

export const syncSupplierBalance = async (supplierId, shop_id, dbRun) => {
  if (!supplierId) return { payable: 0, refundDue: 0, balance: 0 };

  const supRows = await dbRun('SELECT * FROM suppliers WHERE id = $1 AND shop_id = $2', [supplierId, shop_id]);
  if (!supRows || supRows.length === 0) return { payable: 0, refundDue: 0, balance: 0 };
  const sup = supRows[0];
  const openingBalance = Number(sup.openingbalance !== undefined ? sup.openingbalance : (sup.openingBalance !== undefined ? sup.openingBalance : 0));

  const purchaseRows = await dbRun('SELECT * FROM purchases WHERE shop_id = $1 AND supplierId = $2', [shop_id, supplierId]);
  const returnsRows = await dbRun('SELECT * FROM purchase_returns WHERE shop_id = $1 AND supplierId = $2', [shop_id, supplierId]);

  const paymentRows = await dbRun(
    "SELECT * FROM payment_logs WHERE shop_id = $1 AND partyId = $2 AND LOWER(partyType) = 'supplier' AND LOWER(mode) NOT IN ('opening balance', 'credit note', 'debit note', 'purchase return', 'supplier khata')",
    [shop_id, supplierId]
  );

  let totalPurchasesPayableDue = 0;
  let totalPurchasesRefundDue = 0;

  // Compute each purchase completely independently
  purchaseRows.forEach(p => {
    const pId = String(p.id);
    const pNo = p.purchaseNo || p.purchaseno || '';
    let pItemsSum = 0;
    if (p.itemsjson) {
      try {
        const itms = typeof p.itemsjson === 'string' ? JSON.parse(p.itemsjson) : p.itemsjson;
        if (Array.isArray(itms)) {
          pItemsSum = itms.reduce((sum, it) => sum + (Number(it.total || it.totalAmount) || (Number(it.qty || 1) * Number(it.rate || it.price || 0))), 0);
        }
      } catch (e) {}
    }
    const rawTotal = Number(p.grandTotal !== undefined ? p.grandTotal : (p.grandtotal !== undefined ? p.grandtotal : (p.amount !== undefined ? p.amount : 0)));
    const pTotal = rawTotal > 0 ? rawTotal : pItemsSum;

    // Returns linked specifically to this purchase
    const pReturns = returnsRows.filter(r =>
      (r.purchaseId && String(r.purchaseId) === pId) ||
      (r.purchaseid && String(r.purchaseid) === pId) ||
      (pNo && r.purchaseNo && r.purchaseNo === pNo) ||
      (pNo && r.purchaseno && r.purchaseno === pNo)
    );
    const pReturnAmt = pReturns.reduce((acc, r) => acc + extractReturnMerchandiseValue(r), 0);
    const pNet = Math.max(0, pTotal - pReturnAmt);

    // Payments linked specifically to this purchase
    const pLogs = paymentRows.filter(pl =>
      (pl.purchaseId && String(pl.purchaseId) === pId) ||
      (pl.purchaseid && String(pl.purchaseid) === pId) ||
      (pNo && pl.ref && pl.ref.includes(pNo)) ||
      (pNo && pl.note && pl.note.includes(pNo))
    );
    const pPaidLogs = pLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0);
    const pStoredPaid = Number(p.paidAmount !== undefined ? p.paidAmount : (p.paidamount || 0));
    const pPaid = pLogs.length > 0 ? pPaidLogs : pStoredPaid;

    const pDue = Math.max(0, pNet - pPaid);
    const pRefund = Math.max(0, pPaid - pNet);

    totalPurchasesPayableDue += pDue;
    totalPurchasesRefundDue += pRefund;
  });

  // Check for any unlinked payments to supplier (e.g. general advance / opening balance payment)
  const unlinkedLogs = paymentRows.filter(pl => {
    const hasPurchaseLink = Boolean(
      pl.purchaseId ||
      pl.purchaseid ||
      purchaseRows.some(p => {
        const pNo = p.purchaseNo || p.purchaseno;
        return (pNo && ((pl.ref && pl.ref.includes(pNo)) || (pl.note && pl.note.includes(pNo))));
      })
    );
    return !hasPurchaseLink;
  });
  const unlinkedPaid = unlinkedLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0);

  // Unlinked payments can offset opening balance, but individual purchase dues remain strictly independent
  const netOpeningDue = Math.max(0, openingBalance - unlinkedPaid);
  const canonicalPayable = Math.round(totalPurchasesPayableDue + netOpeningDue);
  const canonicalRefund = Math.round(totalPurchasesRefundDue);

  await dbRun('UPDATE suppliers SET balance = $1, refundDue = $2 WHERE id = $3 AND shop_id = $4', [canonicalPayable, canonicalRefund, supplierId, shop_id]);
  return { payable: canonicalPayable, refundDue: canonicalRefund, balance: canonicalPayable };
};



