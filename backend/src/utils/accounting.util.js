/** Canonical invoice / bill financial calculations — single source of truth for backend. */

export const sumCashRefunds = (returns = []) =>
  (returns || [])
    .filter(r => String(r.refundMode || '').trim().toLowerCase() === 'cash')
    .reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

export const computeInvoiceFinancials = ({
  grossAmount,
  returnAmount = 0,
  grossPaid = 0,
  cashRefundAmount = 0
}) => {
  const origAmt = Number(grossAmount) || 0;
  const totalReturnAmt = Number(returnAmount) || 0;
  const cashRefundAmt = Number(cashRefundAmount) || 0;
  const netAmt = Math.max(0, origAmt - totalReturnAmt);
  const netCashPaid = Math.max(0, Number(grossPaid) - cashRefundAmt);
  const effectivePaid = Math.min(netAmt, netCashPaid);
  const due = Math.max(0, netAmt - effectivePaid);
  const isFull = totalReturnAmt >= (origAmt - 1) && origAmt > 0;
  const status = isFull
    ? 'Returned'
    : ((effectivePaid >= netAmt && netAmt > 0) ? 'Paid' : (effectivePaid > 0 ? 'Partial' : 'Pending'));

  return { netAmt, effectivePaid, due, status, isFull, netCashPaid, totalReturnAmt };
};

export const computeSaleInvoiceFromReturns = (sale, relatedReturns = []) => {
  const totalReturnAmt = relatedReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  return computeInvoiceFinancials({
    grossAmount: sale.amount || sale.grandTotal || 0,
    returnAmount: totalReturnAmt,
    grossPaid: sale.paidAmount || 0,
    cashRefundAmount: sumCashRefunds(relatedReturns)
  });
};

export const computePurchaseInvoiceFromReturns = (purchase, relatedReturns = []) => {
  const totalReturnAmt = relatedReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  return computeInvoiceFinancials({
    grossAmount: purchase.grandTotal || purchase.amount || 0,
    returnAmount: totalReturnAmt,
    grossPaid: purchase.paidAmount || 0,
    cashRefundAmount: sumCashRefunds(relatedReturns)
  });
};
