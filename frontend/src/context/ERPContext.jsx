import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { authFetch } from '../services/api';

const ERPContext = createContext();

/**
 * Single Canonical Accounting Resolution for Transaction Payments, Inflows, Outflows, and Khata allocations.
 * Precedence Rules:
 * 1. Explicit Mode Check (e.g. 'Supplier Khata', 'Khata', 'Credit', 'Ledger', 'Debit Note', 'Credit Note' vs 'Cash', 'Bank', 'JazzCash', etc.)
 * 2. If Khata/Credit/Debit Note: liquid paid is 0, credit amount is gross amount.
 * 3. If Cash/Bank/Wallet:
 *    - If tx has paidAmount explicitly specified (> 0), liquid paid is paidAmount.
 *    - If status/paymentStatus is 'Paid' OR (paidAmount === 0 / undefined AND mode is explicitly 'Cash'/'Bank'/'Wallet' and not marked 'Pending'/'Unpaid'/'Credit'):
 *      liquid paid is gross amount.
 *    - Credit balance = Math.max(0, grossAmount - liquid paid).
 * 4. Refund transactions:
 *    - Check refundMode (e.g. 'Cash Refund', 'Cash' vs 'Debit Note', 'Credit Note', 'Ledger').
 *    - If cash refund, refundAmount (or amount fallback) is liquid refund.
 */
export const resolveTransactionPayment = (tx, txType = 'Sale') => {
  if (!tx) {
    return {
      channel: 'cash',
      isLiquid: false,
      isKhata: false,
      cashAmount: 0,
      bankAmount: 0,
      walletAmount: 0,
      totalLiquid: 0,
      creditAmount: 0,
      grossAmount: 0,
      refundMode: 'Cash',
      refundAmount: 0
    };
  }

  const grossAmount = Number(
    tx.amount !== undefined ? tx.amount :
    tx.grandTotal !== undefined ? tx.grandTotal :
    tx.grandtotal !== undefined ? tx.grandtotal :
    tx.refundAmount !== undefined ? tx.refundAmount :
    tx.refundamount !== undefined ? tx.refundamount : 0
  );

  const rawMode = String(
    tx.paymentMode || tx.paymentmode ||
    tx.paymentMethod || tx.paymentmethod ||
    tx.refundMode || tx.refundmode ||
    tx.mode || 'Cash'
  ).trim();

  const modeLower = rawMode.toLowerCase();

  // Identify channel category
  const isKhataOrCredit = 
    modeLower.includes('khata') ||
    modeLower.includes('credit') ||
    modeLower.includes('ledger') ||
    modeLower.includes('debit note') ||
    modeLower.includes('credit note') ||
    modeLower.includes('opening balance') ||
    modeLower.includes('udhaar') ||
    modeLower === 'pending' ||
    modeLower === 'unpaid';

  const isCard = !isKhataOrCredit && (
    modeLower.includes('card') ||
    modeLower === 'card payment' ||
    modeLower === 'pos card'
  );

  const isBank = !isKhataOrCredit && !isCard && (
    modeLower.includes('bank') ||
    modeLower.includes('transfer') ||
    modeLower.includes('raast') ||
    modeLower.includes('online') ||
    modeLower.includes('cheque')
  );

  const isCash = !isKhataOrCredit && !isCard && !isBank;

  const channel = isKhataOrCredit ? 'khata' : (isCard ? 'card' : (isBank ? 'bank' : 'cash'));

  // Handle Returns
  if (txType === 'SaleReturn' || txType === 'PurchaseReturn') {
    const isLiquidRefund = isCash || isBank || isCard;
    const refAmt = Number(
      tx.refundAmount !== undefined ? tx.refundAmount :
      tx.refundamount !== undefined ? tx.refundamount :
      tx.amount !== undefined ? tx.amount : grossAmount
    );

    return {
      channel,
      isLiquid: isLiquidRefund,
      isKhata: isKhataOrCredit,
      cashAmount: (isCash && isLiquidRefund) ? refAmt : 0,
      bankAmount: (isBank && isLiquidRefund) ? refAmt : 0,
      cardAmount: (isCard && isLiquidRefund) ? refAmt : 0,
      totalLiquid: isLiquidRefund ? refAmt : 0,
      creditAmount: isKhataOrCredit ? refAmt : 0,
      grossAmount: refAmt,
      refundMode: rawMode,
      refundAmount: refAmt
    };
  }

  // Handle Expenses
  if (txType === 'Expense') {
    const status = String(tx.status || tx.paymentStatus || '').toLowerCase();
    const isUnpaid = isKhataOrCredit || status === 'unpaid' || status === 'pending' || status === 'due';
    const expAmt = Number(tx.amount || grossAmount);

    return {
      channel: isUnpaid ? 'khata' : channel,
      isLiquid: !isUnpaid,
      isKhata: isUnpaid,
      cashAmount: (!isUnpaid && isCash) ? expAmt : 0,
      bankAmount: (!isUnpaid && isBank) ? expAmt : 0,
      cardAmount: (!isUnpaid && isCard) ? expAmt : 0,
      totalLiquid: !isUnpaid ? expAmt : 0,
      creditAmount: isUnpaid ? expAmt : 0,
      grossAmount: expAmt
    };
  }

  // Handle Opening Balance & Credit/Debit Note logs (strictly non-liquid)
  if (modeLower.includes('opening balance') || modeLower.includes('credit note') || modeLower.includes('debit note')) {
    return {
      channel: 'khata',
      isLiquid: false,
      isKhata: true,
      cashAmount: 0,
      bankAmount: 0,
      cardAmount: 0,
      totalLiquid: 0,
      creditAmount: grossAmount,
      grossAmount
    };
  }

  // Handle Sales / Purchases / Payments
  const rawPaid = Number(
    tx.paidAmount !== undefined ? tx.paidAmount :
    tx.paidamount !== undefined ? tx.paidamount :
    tx.cashReceived !== undefined ? tx.cashReceived :
    tx.cashPaid !== undefined ? tx.cashPaid : -1
  );

  const isMarkedPaid = tx.status === 'Paid' || tx.paymentStatus === 'Paid';
  const isMarkedPending = tx.status === 'Pending' || tx.paymentStatus === 'Pending' || tx.status === 'Unpaid' || tx.paymentStatus === 'Unpaid';
  const isMarkedPartial = tx.status === 'Partial' || tx.paymentStatus === 'Partial';

  let liquidPaid = 0;
  if (rawPaid > 0) {
    liquidPaid = Math.min(grossAmount, rawPaid);
  } else if (isMarkedPaid) {
    liquidPaid = grossAmount;
  } else if (isMarkedPartial && rawPaid > 0) {
    liquidPaid = Math.min(grossAmount, rawPaid);
  } else if (isKhataOrCredit || isMarkedPending) {
    liquidPaid = 0;
  } else if (!isKhataOrCredit && rawPaid === -1) {
    // Default cash sale without explicit status/paidAmount is paid
    liquidPaid = grossAmount;
  } else {
    liquidPaid = 0;
  }

  const creditDue = Math.max(0, grossAmount - liquidPaid);

  return {
    channel,
    isLiquid: liquidPaid > 0,
    isKhata: isKhataOrCredit || creditDue > 0,
    cashAmount: isCash ? liquidPaid : 0,
    bankAmount: isBank ? liquidPaid : 0,
    cardAmount: isCard ? liquidPaid : 0,
    totalLiquid: liquidPaid,
    creditAmount: creditDue,
    grossAmount
  };
};

export const computeSaleFinancials = (sale, saleReturns = [], paymentLogs = [], allSales = []) => {
  if (!sale) return { total: 0, grossTotal: 0, netTotal: 0, paid: 0, returnAmount: 0, due: 0, status: 'Pending', isReturned: false, isFullyReturned: false, isPartiallyReturned: false };
  const total = Number(sale.amount !== undefined ? sale.amount : (sale.grandTotal !== undefined ? sale.grandTotal : (sale.grandtotal !== undefined ? sale.grandtotal : 0)));

  const returns = (saleReturns || []).filter(r => (r.saleId && String(r.saleId) === String(sale.id)) || (r.invoiceNo && r.invoiceNo === sale.invoiceNo));
  const returnAmount = returns.length > 0 ? returns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0) : Number(sale.returnAmount || 0);
  const cashRefundAmount = returns.filter(r => String(r.refundMode || '').trim().toLowerCase() === 'cash').reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  const netDueableTotal = Math.max(0, total - returnAmount);

  // Categorize specific payment logs for this sale invoice
  const matchingLogs = (paymentLogs || []).filter(pl =>
    (pl.type === 'Customer' || pl.partyType === 'Customer') &&
    (
      (pl.saleId && String(pl.saleId) === String(sale.id)) ||
      (sale.invoiceNo && pl.ref && pl.ref.includes(sale.invoiceNo))
    ) &&
    pl.mode !== 'Opening Balance' &&
    pl.mode !== 'Credit Note'
  );

  const res = resolveTransactionPayment(sale, 'Sale');
  const upfrontPaid = res.totalLiquid;
  const totalMatchingLogs = matchingLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0);
  let rawGrossPaid = Math.max(upfrontPaid, totalMatchingLogs);

  // Unlinked general customer payments (e.g. Khata payments) allocation
  const custId = sale.customerId ? String(sale.customerId) : null;
  const partyName = (sale.partyName || sale.customerName || '').trim().toLowerCase();
  const isRegularCust = custId && !custId.startsWith('walkin-') && partyName !== 'walk-in customer';

  const unlinkedGeneralLogs = (paymentLogs || []).filter(pl => {
    const isCust = pl.type === 'Customer' || pl.partyType === 'Customer';
    if (!isCust) return false;
    const pMode = String(pl.mode || '').trim().toLowerCase();
    if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

    // Check if this log is already specifically linked to ANY sale invoice
    const hasSpecificInvoice = Boolean(
      pl.saleId ||
      (pl.ref && (pl.ref.includes('INV-') || pl.ref.includes('SAL-')))
    );
    if (hasSpecificInvoice) return false;

    // Match party
    const pPartyId = pl.partyId ? String(pl.partyId) : null;
    const pPartyName = (pl.partyName || '').trim().toLowerCase();
    if (isRegularCust) {
      return (custId && pPartyId && pPartyId === custId) ||
        (partyName && pPartyName === partyName && !pPartyName.includes('walk-in'));
    } else {
      return (custId && pPartyId && pPartyId === custId) || (partyName && pPartyName === partyName);
    }
  });

  const totalUnlinkedCash = unlinkedGeneralLogs.reduce((sum, pl) => sum + Number(pl.amount || 0), 0);

  if (totalUnlinkedCash > 0) {
    const relevantSales = (allSales && allSales.length > 0)
      ? (allSales || []).filter(s => {
          const sCustId = s.customerId ? String(s.customerId) : null;
          const sPartyName = (s.partyName || s.customerName || '').trim().toLowerCase();
          if (isRegularCust) {
            return (custId && sCustId && sCustId === custId) ||
              (partyName && sPartyName === partyName && !sPartyName.includes('walk-in'));
          } else {
            return (custId && sCustId && sCustId === custId) || (partyName && sPartyName === partyName);
          }
        }).sort((a, b) => {
          const timeA = new Date(a.created_at || a.createdAt || a.date || 0).getTime() || Number(a.id) || 0;
          const timeB = new Date(b.created_at || b.createdAt || b.date || 0).getTime() || Number(b.id) || 0;
          return timeA - timeB;
        })
      : [sale];

    let availableGeneralCash = totalUnlinkedCash;
    let generalAllocatedToThisSale = 0;

    for (const s of relevantSales) {
      if (availableGeneralCash <= 0) break;
      const sTotal = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));
      const sReturns = (saleReturns || []).filter(r => (r.saleId && String(r.saleId) === String(s.id)) || (r.invoiceNo && r.invoiceNo === s.invoiceNo));
      const sRetAmt = sReturns.length > 0 ? sReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0) : Number(s.returnAmount || 0);
      const sNetTotal = Math.max(0, sTotal - sRetAmt);

      const sMatchingLogs = (paymentLogs || []).filter(pl =>
        (pl.type === 'Customer' || pl.partyType === 'Customer') &&
        (
          (pl.saleId && String(pl.saleId) === String(s.id)) ||
          (s.invoiceNo && pl.ref && pl.ref.includes(s.invoiceNo))
        ) &&
        pl.mode !== 'Opening Balance' &&
        pl.mode !== 'Credit Note'
      );
      const sUpfront = resolveTransactionPayment(s, 'Sale').totalLiquid;
      const sSpecificPaid = Math.max(sUpfront, sMatchingLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0));
      const sRemainingDue = Math.max(0, sNetTotal - sSpecificPaid);

      const alloc = Math.min(sRemainingDue, availableGeneralCash);
      if (String(s.id) === String(sale.id)) {
        generalAllocatedToThisSale = alloc;
        break;
      }
      availableGeneralCash -= alloc;
    }

    rawGrossPaid += generalAllocatedToThisSale;
  }

  const netPaidTowardsInvoice = Math.max(0, rawGrossPaid - cashRefundAmount);
  const paid = Math.min(netDueableTotal, netPaidTowardsInvoice);

  const isFullyReturned = (sale.status === 'Returned') || sale.isReturned || (sale.returnStatus === 'Fully Returned') || (returnAmount >= (total - 0.5) && total > 0);
  const isPartiallyReturned = !isFullyReturned && returnAmount > 0;
  const isReturned = isFullyReturned;
  const due = Math.max(0, netDueableTotal - paid);
  const status = isFullyReturned ? 'Returned' : ((due === 0 && netDueableTotal > 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

  return { total, grossTotal: total, netTotal: netDueableTotal, paid, returnAmount, due, status, isReturned, isFullyReturned, isPartiallyReturned };
};

export const computePurchaseFinancials = (purchase, purchaseReturns = [], paymentLogs = [], allPurchases = []) => {
  if (!purchase) return { total: 0, grossTotal: 0, netTotal: 0, paid: 0, returnAmount: 0, due: 0, status: 'Pending', isReturned: false, isFullyReturned: false, isPartiallyReturned: false };
  const total = Number(purchase.amount !== undefined ? purchase.amount : (purchase.grandTotal !== undefined ? purchase.grandTotal : (purchase.grandtotal !== undefined ? purchase.grandtotal : 0)));

  const returns = (purchaseReturns || []).filter(r => (r.purchaseId && String(r.purchaseId) === String(purchase.id)) || (r.purchaseNo && r.purchaseNo === purchase.purchaseNo));
  const returnAmount = returns.length > 0 ? returns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0) : Number(purchase.returnAmount || 0);
  const cashRefundAmount = returns.filter(r => String(r.refundMode || '').trim().toLowerCase() === 'cash').reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  const netDueableTotal = Math.max(0, total - returnAmount);

  // Categorize specific payment logs for this purchase
  const matchingLogs = (paymentLogs || []).filter(pl =>
    (pl.type === 'Supplier' || pl.partyType === 'Supplier') &&
    (
      (pl.purchaseId && String(pl.purchaseId) === String(purchase.id)) ||
      (purchase.purchaseNo && pl.ref && pl.ref.includes(purchase.purchaseNo))
    ) &&
    pl.mode !== 'Opening Balance' &&
    pl.mode !== 'Debit Note'
  );

  const res = resolveTransactionPayment(purchase, 'Purchase');
  const upfrontPaid = res.totalLiquid;
  const totalMatchingLogs = matchingLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0);
  let rawGrossPaid = Math.max(upfrontPaid, totalMatchingLogs);

  // Unlinked general supplier settlement payments allocation
  const supId = purchase.supplierId ? String(purchase.supplierId) : null;
  const supName = (purchase.supplier || purchase.supplierName || '').trim().toLowerCase();

  const unlinkedGeneralLogs = (paymentLogs || []).filter(pl => {
    const isSup = pl.type === 'Supplier' || pl.partyType === 'Supplier';
    if (!isSup) return false;
    const pMode = String(pl.mode || '').trim().toLowerCase();
    if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

    const hasSpecificPurchase = Boolean(
      pl.purchaseId ||
      (pl.ref && (pl.ref.includes('PUR-') || pl.ref.includes('BILL-')))
    );
    if (hasSpecificPurchase) return false;

    const pPartyId = pl.partyId ? String(pl.partyId) : null;
    const pPartyName = (pl.partyName || '').trim().toLowerCase();
    return (supId && pPartyId && pPartyId === supId) || (supName && pPartyName === supName);
  });

  const totalUnlinkedCash = unlinkedGeneralLogs.reduce((sum, pl) => sum + Number(pl.amount || 0), 0);

  if (totalUnlinkedCash > 0) {
    const relevantPurchases = (allPurchases && allPurchases.length > 0)
      ? (allPurchases || []).filter(p => {
          const pSupId = p.supplierId ? String(p.supplierId) : null;
          const pSupName = (p.supplier || p.supplierName || '').trim().toLowerCase();
          return (supId && pSupId && pSupId === supId) || (supName && pSupName === supName);
        }).sort((a, b) => {
          const timeA = new Date(a.created_at || a.createdAt || a.date || 0).getTime() || Number(a.id) || 0;
          const timeB = new Date(b.created_at || b.createdAt || b.date || 0).getTime() || Number(b.id) || 0;
          return timeA - timeB;
        })
      : [purchase];

    let availableGeneralCash = totalUnlinkedCash;
    let generalAllocatedToThisPurchase = 0;

    for (const p of relevantPurchases) {
      if (availableGeneralCash <= 0) break;
      const pTotal = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const pReturns = (purchaseReturns || []).filter(r => (r.purchaseId && String(r.purchaseId) === String(p.id)) || (r.purchaseNo && r.purchaseNo === p.purchaseNo));
      const pRetAmt = pReturns.length > 0 ? pReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0) : Number(p.returnAmount || 0);
      const pNetTotal = Math.max(0, pTotal - pRetAmt);

      const pMatchingLogs = (paymentLogs || []).filter(pl =>
        (pl.type === 'Supplier' || pl.partyType === 'Supplier') &&
        (
          (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
          (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
        ) &&
        pl.mode !== 'Opening Balance' &&
        pl.mode !== 'Debit Note'
      );
      const pUpfront = resolveTransactionPayment(p, 'Purchase').totalLiquid;
      const pSpecificPaid = Math.max(pUpfront, pMatchingLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0));
      const pRemainingDue = Math.max(0, pNetTotal - pSpecificPaid);

      const alloc = Math.min(pRemainingDue, availableGeneralCash);
      if (String(p.id) === String(purchase.id)) {
        generalAllocatedToThisPurchase = alloc;
        break;
      }
      availableGeneralCash -= alloc;
    }

    rawGrossPaid += generalAllocatedToThisPurchase;
  }

  const netPaidTowardsPurchase = Math.max(0, rawGrossPaid - cashRefundAmount);
  const paid = Math.min(netDueableTotal, netPaidTowardsPurchase);

  const isFullyReturned = (purchase.status === 'Returned') || (purchase.paymentStatus === 'Returned') || purchase.isReturned || (purchase.returnStatus === 'Fully Returned') || (returnAmount >= (total - 0.5) && total > 0);
  const isPartiallyReturned = !isFullyReturned && returnAmount > 0;
  const isReturned = isFullyReturned;
  const due = Math.max(0, netDueableTotal - paid);
  const status = isFullyReturned ? 'Returned' : ((due === 0 && netDueableTotal > 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

  return { total, grossTotal: total, netTotal: netDueableTotal, paid, returnAmount, due, status, isReturned, isFullyReturned, isPartiallyReturned };
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

  const totalGrossSale = custSales.reduce((acc, s) => acc + Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0)), 0);

  // Filter returns for this customer
  const custReturns = (saleReturns || []).filter(r => {
    const rCustId = r.customerId ? String(r.customerId) : null;
    const rCustName = (r.customerName || '').trim().toLowerCase();
    if (isRegularCust) {
      return (custId && rCustId && rCustId === custId) || (custName && rCustName === custName && !rCustName.includes('walk-in'));
    } else {
      return (custId && rCustId && rCustId === custId) || (custName && rCustName === custName);
    }
  });

  const totalReturnAmount = custReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  const ledgerReturnAmount = custReturns
    .filter(r => String(r.refundMode || '').trim().toLowerCase() !== 'cash')
    .reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

  // Customer Payment Transactions in paymentLogs (excluding Opening Balance and Credit Notes)
  const custPayments = (paymentLogs || []).filter(p => {
    const isCustomer = p.type === 'Customer' || p.partyType === 'Customer';
    if (!isCustomer) return false;
    const pMode = String(p.mode || '').trim().toLowerCase();
    if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

    const pPartyId = p.partyId ? String(p.partyId) : null;
    const pPartyName = (p.partyName || '').trim().toLowerCase();

    if (isRegularCust) {
      return (custId && pPartyId && pPartyId === custId) ||
        (custName && pPartyName === custName && !pPartyName.includes('walk-in'));
    } else {
      return (custId && pPartyId && pPartyId === custId) || (custName && pPartyName === custName);
    }
  });

  const directPaidLogs = custPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Upfront POS payments on sales that do not have a separate payment log in paymentLogs
  let unloggedUpfrontCash = 0;
  if (custPayments.length === 0) {
    // If no payment logs exist at all for this customer, use sale upfront amounts
    custSales.forEach(s => {
      const sTotal = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));
      const isMarkedPaid = s.status === 'Paid' || s.paymentStatus === 'Paid';
      const sPaid = isMarkedPaid ? sTotal : Number(s.cashReceived !== undefined ? s.cashReceived : (s.paidAmount || 0));
      unloggedUpfrontCash += Math.min(sTotal, sPaid);
    });
  } else {
    // If payment logs exist, only add explicit POS cash on sales that are NOT linked to any payment log
    custSales.forEach(s => {
      const hasMatchingLog = custPayments.some(p =>
        (p.saleId && String(p.saleId) === String(s.id)) ||
        (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
      );
      if (!hasMatchingLog && s.cashReceived !== undefined && Number(s.cashReceived) > 0) {
        unloggedUpfrontCash += Number(s.cashReceived);
      }
    });
  }

  const cashRefundAmount = custReturns
    .filter(r => String(r.refundMode || '').trim().toLowerCase() === 'cash')
    .reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

  const totalActualPaymentsReceived = Math.max(0, (directPaidLogs + unloggedUpfrontCash) - cashRefundAmount);

  const openingBalance = Number(customer.openingBalance !== undefined ? customer.openingBalance : (customer.openingbalance !== undefined ? customer.openingbalance : 0));
  const netSales = Math.max(0, totalGrossSale - totalReturnAmount);

  // Canonical Accounting Equations (Rules 2 & 3: Sale Returns reduce Sales, Customer cannot be creditor)
  // Total Debits = Opening Balance (Receivable) + Net Sales Invoiced
  // Total Credits = Net Payments Received (Gross Cash - Cash Return Refunds)
  // Receivable Due = max(0, Debits - Credits)
  const totalDebits = openingBalance + netSales;
  const totalCredits = totalActualPaymentsReceived;
  const netBalance = totalDebits - totalCredits;

  const receivableDue = Math.max(0, netBalance);
  const advanceCredit = 0; // Strictly enforced: customers can never become creditors
  const status = receivableDue > 0 ? 'Due' : 'Settled';

  return {
    openingBalance,
    totalSale: totalGrossSale,
    grossSale: totalGrossSale,
    upfrontPaid: totalActualPaymentsReceived,
    directPaid: directPaidLogs,
    totalPaid: totalActualPaymentsReceived,
    returnAmount: totalReturnAmount,
    netSale: netSales,
    netBalance: receivableDue,
    balance: receivableDue,
    receivableDue,
    advanceCredit: 0,
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

const safeQty = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  const str = String(val).trim();
  const match = str.match(/^-?\d+(\.\d+)?/);
  if (match) {
    const n = parseFloat(match[0]);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  }
  const n = parseFloat(str);
  return isNaN(n) || !isFinite(n) ? 0 : n;
};

const safeNum = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? fallback : val;
  const str = String(val).trim();
  const match = str.match(/^-?\d+(\.\d+)?/);
  if (match) {
    const n = parseFloat(match[0]);
    return isNaN(n) || !isFinite(n) ? fallback : n;
  }
  const n = parseFloat(str);
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

export const getUnitFactor = (unitName = 'KG') => {
  if (!unitName || typeof unitName !== 'string') return 1;
  const clean = unitName.trim().toLowerCase();
  if (clean === 'kg' || clean === 'kgs' || clean === 'kilogram') return 1;
  if (clean === 'gram' || clean === 'gm' || clean === 'g') return 0.001;
  if (clean === 'ml' || clean === 'milliliter' || clean === 'millilitre') return 0.001;
  if (clean === 'litre' || clean === 'liter' || clean === 'ltr' || clean === 'l') return 1;
  if (clean === 'meter' || clean === 'metre' || clean === 'm') return 1;
  if (clean === 'piece' || clean === 'pieces' || clean === 'pc' || clean === 'pcs') return 1;
  if (clean === 'unit' || clean === 'units') return 1;
  return 1;
};

export const normalizeItemQty = (rawQty, enteredUnit, baseUnit = 'KG') => {
  const q = safeQty(rawQty);
  const factor = getUnitFactor(enteredUnit);
  const baseFactor = getUnitFactor(baseUnit);
  return (q * factor) / (baseFactor || 1);
};

export const computeProductValuation = (product, purchases = [], sales = [], saleReturns = [], purchaseReturns = [], stockMovements = []) => {
  if (!product) {
    return {
      qty: 0,
      avgCost: 0,
      stockValue: 0,
      sellingRate: 0,
      purchaseRate: 0,
      latestPurchaseRate: 0,
      totalInflowQty: 0,
      totalOutflowQty: 0,
      batches: [],
      activeBatches: [],
      ledger: []
    };
  }

  const prodId = product.id ? String(product.id) : null;
  const prodName = (product.name || '').trim().toLowerCase();
  const baseUnit = product.unit || product.defaultUnit || 'KG';

  const isMatch = (it) => {
    if (!it) return false;
    const itId = it.productId || it.id || it.product_id;
    if (prodId && itId && String(itId) === prodId) return true;
    const itName = (it.name || it.productName || it.item || '').trim().toLowerCase();
    return prodName && itName && (itName === prodName || itName.includes(prodName) || prodName.includes(itName));
  };

  const initialRate = safeNum(product.initialCost ?? product.initial_cost ?? product.purchasePrice ?? product.purchase_price ?? product.rate ?? 0, 0);
  const sellingRate = safeNum(product.sellingPrice ?? product.selling_price ?? 0, 0);

  // Collect authentic transaction events
  const purchaseEvents = [];
  const purchaseReturnEvents = [];
  const saleEvents = [];
  const saleReturnEvents = [];
  const adjustmentEvents = [];

  // Purchases (Stock IN)
  (purchases || []).forEach(p => {
    const pDate = new Date(p.created_at || p.createdAt || p.date || 0).getTime() || 0;
    const pDateStr = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = p.cart || p.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        const itemUnit = it.unit || it.unitName || it.enteredUnit || baseUnit;
        const qty = normalizeItemQty(it.qty ?? it.quantity ?? it.enteredQty ?? 0, itemUnit, baseUnit);
        if (qty > 0) {
          const itemTotal = safeNum(it.total ?? it.totalAmount ?? (safeQty(it.enteredQty ?? it.qty ?? 0) * safeNum(it.ratePerEnteredUnit ?? it.rate ?? it.price ?? initialRate, initialRate)), 0);
          const rate = qty > 0 && itemTotal > 0 ? (itemTotal / qty) : safeNum(it.rate ?? it.price ?? it.purchasePrice ?? initialRate, initialRate);
          purchaseEvents.push({
            id: `pur-${p.id || p.purchaseNo}-${idx}`,
            date: pDate,
            dateStr: pDateStr,
            type: 'PURCHASE',
            ref: p.purchaseNo ? `PUR-#${p.purchaseNo}` : `PUR-${p.id}`,
            qty,
            rate
          });
        }
      }
    });
  });

  // Purchase Returns (Stock OUT to supplier)
  (purchaseReturns || []).forEach(pr => {
    const prDate = new Date(pr.created_at || pr.createdAt || pr.date || 0).getTime() || 0;
    const prDateStr = pr.date || (pr.created_at ? new Date(pr.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = pr.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        const itemUnit = it.unit || it.unitName || it.enteredUnit || baseUnit;
        const qty = normalizeItemQty(it.qty ?? it.quantity ?? it.returnQty ?? 0, itemUnit, baseUnit);
        if (qty > 0) {
          purchaseReturnEvents.push({
            id: `pret-${pr.id || pr.returnNo}-${idx}`,
            date: prDate,
            dateStr: prDateStr,
            type: 'PURCHASE_RETURN',
            ref: pr.returnNo ? `PR-#${pr.returnNo}` : `PR-${pr.id}`,
            qty,
            rate: safeNum(it.rate ?? it.price ?? it.refundRate ?? initialRate, initialRate)
          });
        }
      }
    });
  });

  // Sales (Stock OUT to customer)
  (sales || []).forEach(s => {
    const sDate = new Date(s.created_at || s.createdAt || s.date || 0).getTime() || 0;
    const sDateStr = s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = s.cart || s.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        const itemUnit = it.unit || it.unitName || it.enteredUnit || baseUnit;
        const qty = normalizeItemQty(it.qty ?? it.quantity ?? it.enteredQty ?? 0, itemUnit, baseUnit);
        if (qty > 0) {
          saleEvents.push({
            id: `sale-${s.id || s.invoiceNo}-${idx}`,
            date: sDate,
            dateStr: sDateStr,
            type: 'SALE',
            ref: s.invoiceNo ? `INV-#${s.invoiceNo}` : `INV-${s.id}`,
            qty,
            rate: safeNum(it.rate ?? it.price ?? it.sellingPrice ?? sellingRate, sellingRate)
          });
        }
      }
    });
  });

  // Sale Returns (Stock IN back from customer)
  (saleReturns || []).forEach(sr => {
    const srDate = new Date(sr.created_at || sr.createdAt || sr.date || 0).getTime() || 0;
    const srDateStr = sr.date || (sr.created_at ? new Date(sr.created_at).toLocaleDateString('en-GB') : 'N/A');
    const items = sr.items || [];
    items.forEach((it, idx) => {
      if (isMatch(it)) {
        const itemUnit = it.unit || it.unitName || it.enteredUnit || baseUnit;
        const qty = normalizeItemQty(it.qty ?? it.quantity ?? it.returnQty ?? 0, itemUnit, baseUnit);
        if (qty > 0) {
          saleReturnEvents.push({
            id: `sret-${sr.id || sr.returnNo}-${idx}`,
            date: srDate,
            dateStr: srDateStr,
            type: 'SALE_RETURN',
            ref: sr.returnNo ? `SR-#${sr.returnNo}` : `SR-${sr.id}`,
            qty,
            rate: safeNum(it.rate ?? it.price ?? initialRate, initialRate)
          });
        }
      }
    });
  });

  // Stock Adjustments (Audit Log)
  (stockMovements || []).forEach((sm, smIdx) => {
    const smProd = (sm.product || sm.productName || '').trim().toLowerCase();
    if (prodName && (smProd === prodName || smProd.includes(prodName))) {
      const smDate = new Date(sm.created_at || sm.date || 0).getTime() || 0;
      const smDateStr = sm.date || (sm.created_at ? new Date(sm.created_at).toLocaleDateString('en-GB') : 'N/A');
      const smType = String(sm.type || '').toUpperCase();
      const parsedQty = safeQty(sm.qty);
      if (parsedQty > 0 && smType.includes('ADJUSTED')) {
        if (smType.includes('IN')) {
          adjustmentEvents.push({
            id: `adj-in-${sm.id || smIdx}`,
            date: smDate,
            dateStr: smDateStr,
            type: 'ADJUSTMENT_IN',
            ref: sm.ref || 'Stock Adj In',
            qty: parsedQty,
            rate: initialRate
          });
        } else if (smType.includes('OUT')) {
          adjustmentEvents.push({
            id: `adj-out-${sm.id || smIdx}`,
            date: smDate,
            dateStr: smDateStr,
            type: 'ADJUSTMENT_OUT',
            ref: sm.ref || 'Stock Adj Out',
            qty: parsedQty,
            rate: initialRate
          });
        }
      }
    }
  });

  const events = [];

  // Rule 6: Initial Stock is ALWAYS preserved and seeded as the root opening batch
  const explicitOpeningQty = safeQty(product.initialStock ?? product.initial_stock ?? product.openingStock ?? product.opening_stock ?? product.stockQty ?? 0);
  if (explicitOpeningQty > 0) {
    events.push({
      id: `open-${product.id || 0}`,
      date: product.created_at ? (new Date(product.created_at).getTime() || 0) : 0,
      dateStr: product.created_at ? new Date(product.created_at).toLocaleDateString('en-GB') : 'Opening',
      type: 'OPENING',
      ref: 'OPENING-STOCK',
      qty: explicitOpeningQty,
      rate: initialRate
    });
  }

  events.push(...purchaseEvents, ...purchaseReturnEvents, ...saleEvents, ...saleReturnEvents, ...adjustmentEvents);
  const typeOrder = { 'OPENING': 0, 'PURCHASE': 1, 'PURCHASE_RETURN': 2, 'SALE': 3, 'SALE_RETURN': 4, 'ADJUSTMENT_IN': 5, 'ADJUSTMENT_OUT': 6 };
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date - b.date;
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
  });

  // If no transactions exist, fallback to direct product stockQty and purchasePrice
  if (events.length === 0) {
    const currentStock = safeQty(product.stockQty !== undefined ? product.stockQty : (product.stockqty !== undefined ? product.stockqty : 0));
    return {
      qty: currentStock,
      avgCost: initialRate,
      stockValue: currentStock * initialRate,
      sellingRate,
      purchaseRate: initialRate,
      latestPurchaseRate: initialRate,
      totalInflowQty: currentStock,
      totalOutflowQty: 0,
      batches: currentStock > 0 ? [{
        id: 'open-0',
        batchId: 'OPENING',
        dateStr: 'Opening',
        type: 'Opening Stock',
        initialQty: currentStock,
        rate: initialRate,
        initialTotalCost: currentStock * initialRate,
        remainingQty: currentStock,
        remainingValue: currentStock * initialRate
      }] : [],
      activeBatches: currentStock > 0 ? [{
        id: 'open-0',
        batchId: 'OPENING',
        dateStr: 'Opening',
        type: 'Opening Stock',
        initialQty: currentStock,
        rate: initialRate,
        initialTotalCost: currentStock * initialRate,
        remainingQty: currentStock,
        remainingValue: currentStock * initialRate
      }] : [],
      ledger: currentStock > 0 ? [{
        id: 'led-open-0',
        dateStr: 'Opening',
        date: 0,
        ref: 'OPENING-STOCK',
        type: 'Opening Stock',
        direction: 'IN',
        qty: currentStock,
        rate: initialRate,
        total: currentStock * initialRate,
        runningStock: currentStock
      }] : []
    };
  }

  // FIFO Batch Engine & Moving Cost Tracking
  const batches = [];
  let totalInflowQty = 0;
  let totalOutflowQty = 0;
  let latestPurchaseRate = initialRate;
  let runningStockBalance = 0;
  const ledger = [];

  events.forEach((ev, evIdx) => {
    const evQty = safeQty(ev.qty);
    if (evQty <= 0) return;

    if (ev.type === 'OPENING' || ev.type === 'PURCHASE' || ev.type === 'ADJUSTMENT_IN') {
      const batchRate = safeNum(ev.rate, initialRate);
      if (batchRate > 0) {
        latestPurchaseRate = batchRate;
      }
      const initialTotalCost = evQty * batchRate;
      batches.push({
        id: ev.id,
        batchId: ev.ref || `BATCH-${batches.length + 1}`,
        dateStr: ev.dateStr,
        type: ev.type === 'OPENING' ? 'Opening Stock' : (ev.type === 'PURCHASE' ? 'Purchase' : 'Adjustment In'),
        initialQty: evQty,
        rate: batchRate,
        initialTotalCost: isNaN(initialTotalCost) ? 0 : initialTotalCost,
        remainingQty: evQty,
        remainingValue: isNaN(initialTotalCost) ? 0 : initialTotalCost
      });
      totalInflowQty += evQty;
      runningStockBalance += evQty;

      ledger.push({
        id: `led-${ev.id || evIdx}`,
        dateStr: ev.dateStr,
        date: ev.date,
        ref: ev.ref,
        type: ev.type === 'OPENING' ? 'Opening Stock' : (ev.type === 'PURCHASE' ? 'Purchase' : 'Stock Adjustment In'),
        direction: 'IN',
        qty: evQty,
        rate: batchRate,
        total: initialTotalCost,
        runningStock: runningStockBalance
      });
    } else if (ev.type === 'SALE' || ev.type === 'PURCHASE_RETURN' || ev.type === 'ADJUSTMENT_OUT') {
      let needed = evQty;
      totalOutflowQty += evQty;
      runningStockBalance = Math.max(0, runningStockBalance - evQty);

      // FIFO deduction from oldest active batches
      for (let i = 0; i < batches.length; i++) {
        if (needed <= 0) break;
        const b = batches[i];
        if (b.remainingQty > 0) {
          const deduct = Math.min(b.remainingQty, needed);
          b.remainingQty = Math.max(0, b.remainingQty - deduct);
          b.remainingValue = b.remainingQty * b.rate;
          needed -= deduct;
        }
      }

      const txRate = safeNum(ev.rate, ev.type === 'SALE' ? sellingRate : initialRate);
      ledger.push({
        id: `led-${ev.id || evIdx}`,
        dateStr: ev.dateStr,
        date: ev.date,
        ref: ev.ref,
        type: ev.type === 'SALE' ? 'Sale Invoice' : (ev.type === 'PURCHASE_RETURN' ? 'Purchase Return' : 'Stock Adjustment Out'),
        direction: 'OUT',
        qty: evQty,
        rate: txRate,
        total: evQty * txRate,
        runningStock: runningStockBalance
      });
    } else if (ev.type === 'SALE_RETURN') {
      let returnRestored = evQty;
      totalInflowQty += evQty;
      runningStockBalance += evQty;

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
        const lotCost = returnRestored * returnRate;
        batches.push({
          id: ev.id,
          batchId: ev.ref || `SR-LOT-${batches.length + 1}`,
          dateStr: ev.dateStr,
          type: 'Sale Return In',
          initialQty: returnRestored,
          rate: returnRate,
          initialTotalCost: isNaN(lotCost) ? 0 : lotCost,
          remainingQty: returnRestored,
          remainingValue: isNaN(lotCost) ? 0 : lotCost
        });
      }

      const txRate = safeNum(ev.rate, sellingRate);
      ledger.push({
        id: `led-${ev.id || evIdx}`,
        dateStr: ev.dateStr,
        date: ev.date,
        ref: ev.ref,
        type: 'Sale Return',
        direction: 'IN',
        qty: evQty,
        rate: txRate,
        total: evQty * txRate,
        runningStock: runningStockBalance
      });
    }
  });

  const totalCurrentStock = batches.reduce((sum, b) => sum + (safeQty(b.remainingQty) || 0), 0);
  const totalStockValue = batches.reduce((sum, b) => sum + (safeNum(b.remainingValue, 0) || 0), 0);
  const averageCost = totalCurrentStock > 0 ? (totalStockValue / totalCurrentStock) : (latestPurchaseRate || initialRate || 0);
  const activeBatches = batches.filter(b => (b.remainingQty || 0) > 0);

  return {
    qty: isNaN(totalCurrentStock) ? 0 : totalCurrentStock,
    avgCost: isNaN(averageCost) ? 0 : averageCost,
    stockValue: isNaN(totalStockValue) ? 0 : totalStockValue,
    sellingRate: isNaN(sellingRate) ? 0 : sellingRate,
    purchaseRate: isNaN(averageCost) ? 0 : averageCost,
    latestPurchaseRate: isNaN(latestPurchaseRate) ? (isNaN(initialRate) ? 0 : initialRate) : latestPurchaseRate,
    totalInflowQty: isNaN(totalInflowQty) ? 0 : totalInflowQty,
    totalOutflowQty: isNaN(totalOutflowQty) ? 0 : totalOutflowQty,
    batches,
    activeBatches,
    ledger: ledger.sort((a, b) => b.date - a.date)
  };
};

export const computeWalkinUncollectedDues = (sales = [], saleReturns = [], paymentLogs = []) => {
  return (sales || []).filter(s => {
    const sCustId = s.customerId ? String(s.customerId) : null;
    const sPartyName = (s.partyName || s.customerName || '').trim().toLowerCase();
    const isWalkin = !sCustId || sPartyName === 'walk-in customer' || (s.customerType || '').toLowerCase().includes('walk-in');
    return isWalkin;
  }).reduce((acc, s) => {
    const fin = computeSaleFinancials(s, saleReturns, paymentLogs);
    return acc + Math.max(0, fin.due);
  }, 0);
};

export const computeSupplierKhataBalance = (supplier, purchases = [], paymentLogs = [], purchaseReturns = []) => {
  if (!supplier) return { openingBalance: 0, totalPurchase: 0, grossPurchase: 0, upfrontPaid: 0, directPaid: 0, totalPaid: 0, returnAmount: 0, netPurchase: 0, netBalance: 0, balance: 0, payableDue: 0, advanceCredit: 0, status: 'Settled', ordersCount: 0 };
  const supId = supplier.id ? String(supplier.id) : null;
  const supName = (supplier.name || '').trim().toLowerCase();

  const supPurchases = (purchases || []).filter(p => {
    const pSupId = p.supplierId ? String(p.supplierId) : null;
    const pSupName = (p.supplier || p.supplierName || '').trim().toLowerCase();
    return (supId && pSupId && pSupId === supId) || (supName && pSupName === supName);
  });

  const totalGrossPurchase = supPurchases.reduce((acc, p) => acc + Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0)), 0);

  const supReturns = (purchaseReturns || []).filter(r => {
    const rSupId = r.supplierId ? String(r.supplierId) : null;
    const rSupName = (r.supplierName || '').trim().toLowerCase();
    return (supId && rSupId && rSupId === supId) || (supName && rSupName === supName);
  });

  const totalReturnAmount = supReturns.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  const ledgerReturnAmount = supReturns
    .filter(r => String(r.refundMode || '').trim().toLowerCase() !== 'cash')
    .reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

  // Supplier Payment Transactions recorded in paymentLogs (excluding Opening Balance and Debit Notes)
  const supPayments = (paymentLogs || []).filter(p => {
    const isSupplier = p.type === 'Supplier' || p.partyType === 'Supplier';
    if (!isSupplier) return false;
    const pMode = String(p.mode || '').trim().toLowerCase();
    if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

    const pPartyId = p.partyId ? String(p.partyId) : null;
    const pPartyName = (p.partyName || '').trim().toLowerCase();
    return (supId && pPartyId && pPartyId === supId) || (supName && pPartyName === supName);
  });

  const directPaidLogs = supPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  let unloggedUpfrontCash = 0;
  if (supPayments.length === 0) {
    supPurchases.forEach(p => {
      const pTotal = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const isMarkedPaid = p.status === 'Paid' || p.paymentStatus === 'Paid';
      const pPaid = isMarkedPaid ? pTotal : Number(p.cashPaid !== undefined ? p.cashPaid : (p.paidAmount || 0));
      unloggedUpfrontCash += Math.min(pTotal, pPaid);
    });
  } else {
    supPurchases.forEach(p => {
      const hasMatchingLog = supPayments.some(pl =>
        (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
        (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
      );
      if (!hasMatchingLog && p.cashPaid !== undefined && Number(p.cashPaid) > 0) {
        unloggedUpfrontCash += Number(p.cashPaid);
      }
    });
  }

  const cashRefundAmount = supReturns
    .filter(r => String(r.refundMode || '').trim().toLowerCase() === 'cash')
    .reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);

  const totalActualPaymentsPaid = Math.max(0, (directPaidLogs + unloggedUpfrontCash) - cashRefundAmount);

  const openingBalance = Number(supplier.openingBalance !== undefined ? supplier.openingBalance : (supplier.openingbalance !== undefined ? supplier.openingbalance : 0));
  const netPurchases = Math.max(0, totalGrossPurchase - totalReturnAmount);

  // Canonical Accounting Equations (Rules 4 & 5: Purchase Returns reduce Purchases, No Supplier Advances)
  // Credits (Payable Liability) = Opening Balance + Net Purchases Billed
  // Debits = Net Payments Paid (Gross Paid - Supplier Cash Return Refunds)
  // Payable Due = max(0, Credits - Debits)
  const totalCredits = openingBalance + netPurchases;
  const totalDebits = totalActualPaymentsPaid;
  const netBalance = totalCredits - totalDebits;

  const payableDue = Math.max(0, netBalance);
  const advanceCredit = 0; // Strictly enforced: No supplier advances
  const status = payableDue > 0 ? 'Payable' : 'Settled';

  return {
    openingBalance,
    totalPurchase: totalGrossPurchase,
    grossPurchase: totalGrossPurchase,
    upfrontPaid: totalActualPaymentsPaid,
    directPaid: directPaidLogs,
    totalPaid: totalActualPaymentsPaid,
    returnAmount: totalReturnAmount,
    netPurchase: netPurchases,
    netBalance: payableDue,
    balance: payableDue,
    payableDue,
    advanceCredit: 0,
    status,
    ordersCount: supPurchases.length
  };
};

export const computeAllSuppliersFinancials = (suppliers = [], purchases = [], paymentLogs = [], purchaseReturns = []) => {
  const allSuppliers = (suppliers || []).map(sup => {
    const fin = computeSupplierKhataBalance(sup, purchases, paymentLogs, purchaseReturns);
    return {
      ...sup,
      ...fin
    };
  });

  const totalGrossPurchases = allSuppliers.reduce((sum, s) => sum + Number(s.totalPurchase || 0), 0);
  const totalReturns = allSuppliers.reduce((sum, s) => sum + Number(s.returnAmount || 0), 0);
  const totalNetPurchases = allSuppliers.reduce((sum, s) => sum + Number(s.netPurchase || 0), 0);
  const totalPaymentsPaid = allSuppliers.reduce((sum, s) => sum + Number(s.totalPaid || 0), 0);
  const totalPayables = allSuppliers.reduce((sum, s) => sum + Number(s.payableDue || 0), 0);
  const totalSupplierAdvances = 0;
  const settledCount = allSuppliers.filter(s => s.status === 'Settled' || s.payableDue === 0).length;

  return {
    allSuppliers,
    totalGrossPurchases,
    totalReturns,
    totalNetPurchases,
    totalPaymentsPaid,
    totalPayables,
    totalSupplierAdvances,
    settledCount
  };
};

export const parseNormalizedTimestamp = (dateStr, createdAt) => {
  if (createdAt) {
    const t = new Date(createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (!dateStr) return 0;
  const raw = String(dateStr).trim();
  if (raw.toLowerCase() === 'opening') return 0;
  if (raw.toLowerCase() === 'today') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).getTime();
  }
  if (raw.toLowerCase() === 'yesterday') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0).getTime();
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const hour = ddmmyyyy[4] ? parseInt(ddmmyyyy[4], 10) : 0;
    const min = ddmmyyyy[5] ? parseInt(ddmmyyyy[5], 10) : 0;
    const sec = ddmmyyyy[6] ? parseInt(ddmmyyyy[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // YYYY-MM-DD
  const yyyymmdd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:T|\s+)?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    const hour = yyyymmdd[4] ? parseInt(yyyymmdd[4], 10) : 0;
    const min = yyyymmdd[5] ? parseInt(yyyymmdd[5], 10) : 0;
    const sec = yyyymmdd[6] ? parseInt(yyyymmdd[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const d = new Date(raw);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

export const compareLedgerTransactions = (a, b) => {
  // 1. Primary: Timestamp
  const tA = a.timestamp || 0;
  const tB = b.timestamp || 0;
  if (tA !== tB) return tA - tB;

  // 2. Secondary: Logical Event Priority (0: Opening, 1: Invoice/Sale/Purchase, 2: Return, 3: Payment)
  const pA = a.eventPriority !== undefined ? a.eventPriority : 99;
  const pB = b.eventPriority !== undefined ? b.eventPriority : 99;
  if (pA !== pB) return pA - pB;

  // 3. Tertiary: Sequence Number / ID
  const seqA = Number(a.seq || 0);
  const seqB = Number(b.seq || 0);
  if (seqA !== seqB) return seqA - seqB;

  return String(a.id || '').localeCompare(String(b.id || ''));
};

export const computeLedgerStatement = (party, { sales = [], purchases = [], paymentLogs = [], saleReturns = [], purchaseReturns = [], isSupplier = false } = {}) => {
  if (!party) {
    return {
      party: null,
      openingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      netBalance: 0,
      closingBalance: 0,
      receivableDue: 0,
      payableDue: 0,
      advanceCredit: 0,
      status: 'Settled',
      chronologicalEntries: [],
      displayEntries: []
    };
  }

  const partyId = party.id ? String(party.id) : null;
  const partyName = (party.name || '').trim().toLowerCase();
  const isRegular = party.customerType ? !party.customerType.toLowerCase().includes('walk-in') : true;

  const entries = [];

  // 0. Opening Balance
  const opBal = Number(party.openingBalance !== undefined ? party.openingBalance : (party.openingbalance !== undefined ? party.openingbalance : 0));
  if (opBal > 0) {
    const opTs = parseNormalizedTimestamp(party.created_at || '2026-01-01');
    entries.push({
      id: `open-bal-${partyId || '0'}`,
      timestamp: opTs,
      eventPriority: 0,
      seq: 0,
      rawDate: party.created_at || '2026-01-01',
      date: party.created_at ? new Date(party.created_at).toLocaleDateString('en-GB') : 'Opening',
      partyId,
      partyName: party.name,
      ref: 'OPENING',
      txType: 'Opening Balance',
      desc: isSupplier ? 'Opening Payable Balance' : 'Opening Receivable Balance',
      sales: isSupplier ? 0 : opBal,
      payment: 0,
      debit: opBal,
      credit: 0,
      paymentMethod: 'Opening Balance',
      paymentAccount: 'Opening Balance',
      status: 'Due',
      notes: 'Opening balance registered on account creation'
    });
  }

  if (!isSupplier) {
    // 1. Filter Customer Sales
    const partySales = (sales || []).filter(s => {
      const sCustId = s.customerId ? String(s.customerId) : null;
      const sCustName = (s.customerName || s.partyName || '').trim().toLowerCase();
      if (isRegular) {
        return (partyId && sCustId && sCustId === partyId) || (partyName && sCustName === partyName && !sCustName.includes('walk-in'));
      }
      return (partyId && sCustId && sCustId === partyId) || (partyName && sCustName === partyName);
    });

    // 2. Filter Customer Payments (excluding Opening Balance, Credit Notes, and POS upfront counter payments)
    const partyPayments = (paymentLogs || []).filter(p => {
      const isCust = p.type === 'Customer' || p.partyType === 'Customer';
      if (!isCust) return false;
      const pMode = String(p.mode || '').trim().toLowerCase();
      if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

      // Exclude POS upfront counter payments already reflected in direct invoices
      if (p.ref && String(p.ref).startsWith('POS-PAY-')) return false;
      if (p.saleId && partySales.some(s => String(s.id) === String(p.saleId) && (!s.paymentMethod || !s.paymentMethod.toLowerCase().includes('credit')))) return false;

      const pPartyId = p.partyId ? String(p.partyId) : null;
      const pPartyName = (p.partyName || '').trim().toLowerCase();
      if (isRegular) {
        return (partyId && pPartyId && pPartyId === partyId) || (partyName && pPartyName === partyName && !pPartyName.includes('walk-in'));
      }
      return (partyId && pPartyId && pPartyId === partyId) || (partyName && pPartyName === partyName);
    });

    // 3. Filter Customer Returns
    const partyReturns = (saleReturns || []).filter(r => {
      const rCustId = r.customerId ? String(r.customerId) : null;
      const rCustName = (r.customerName || '').trim().toLowerCase();
      if (isRegular) {
        return (partyId && rCustId && rCustId === partyId) || (partyName && rCustName === partyName && !rCustName.includes('walk-in'));
      }
      return (partyId && rCustId && rCustId === partyId) || (partyName && rCustName === partyName);
    });

    // Process Sales Invoices
    partySales.forEach((s, idx) => {
      const ts = parseNormalizedTimestamp(s.date, s.created_at);
      const fin = computeSaleFinancials(s, saleReturns, paymentLogs);
      const sGross = fin.grossTotal;
      const sNet = fin.netTotal;
      const sReturn = fin.returnAmount;
      const sPaid = fin.paid;
      const sDue = fin.due;
      const sStatus = fin.status;
      const isPartiallyReturned = sReturn > 0 && sStatus !== 'Returned';
      const isFullyReturned = sStatus === 'Returned' || (sReturn >= sGross && sGross > 0);

      const sItems = Array.isArray(s.cart) && s.cart.length > 0
        ? s.cart.map(i => `${i.name || 'Commodity'} (${i.qty || 1} ${i.unitName || i.unit || 'KG'})`).join(', ')
        : (typeof s.items === 'string' ? s.items : 'Commodity Sale');

      const rawMode = String(s.paymentMethod || s.paymentMode || 'Cash').trim();
      const modeLower = rawMode.toLowerCase();
      const isCreditOnly = modeLower.includes('credit') || modeLower.includes('khata') || modeLower.includes('udhaar') || modeLower === 'unpaid' || modeLower === 'pending';

      let methodDisplay = 'Cash';
      if (modeLower.includes('bank') || modeLower.includes('transfer')) {
        methodDisplay = 'Bank Transfer';
      } else if (modeLower.includes('card')) {
        methodDisplay = 'Card Payment';
      } else if (isCreditOnly) {
        methodDisplay = 'Credit / Khata';
      } else {
        methodDisplay = 'Cash';
      }

      const descText = sReturn > 0
        ? `Invoice #${s.invoiceNo || s.id}: ${sItems}`
        : `Invoice: ${sItems}`;

      const historyNote = sReturn > 0
        ? `Original Sale: Rs. ${sGross.toLocaleString()} • Returned: Rs. ${sReturn.toLocaleString()} • Net Sale: Rs. ${sNet.toLocaleString()} | Paid: Rs. ${sPaid.toLocaleString()}, Due: Rs. ${sDue.toLocaleString()} (${sStatus})`
        : (s.saleNote || s.note || '');

      if (isCreditOnly) {
        // Credit / Khata Invoice: Creates pure debit receivable, subsequent Khata payments step down balance
        entries.push({
          id: `sale-${s.id || idx}`,
          timestamp: ts,
          eventPriority: 1, // Invoice occurs before same-day payments
          seq: Number(s.id) || (idx + 1),
          rawDate: s.date,
          date: s.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: s.invoiceNo || `INV-${s.id || idx}`,
          txType: 'Sales',
          desc: descText,
          sales: sNet,
          originalGross: sGross,
          netTotal: sNet,
          returnAmount: sReturn,
          paidAmount: sPaid,
          dueAmount: sDue,
          invoiceStatus: sStatus,
          isPartiallyReturned,
          isFullyReturned,
          payment: 0,
          debit: sGross,
          credit: 0,
          paymentMethod: 'Credit / Khata',
          paymentAccount: 'Credit / Khata',
          status: sStatus,
          notes: historyNote
        });
      } else {
        // Direct counter sale without Khata credit
        entries.push({
          id: `sale-${s.id || idx}`,
          timestamp: ts,
          eventPriority: 1,
          seq: Number(s.id) || (idx + 1),
          rawDate: s.date,
          date: s.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: s.invoiceNo || `INV-${s.id || idx}`,
          txType: 'Sales',
          desc: descText,
          sales: sNet,
          originalGross: sGross,
          netTotal: sNet,
          returnAmount: sReturn,
          paidAmount: sPaid,
          dueAmount: sDue,
          invoiceStatus: sStatus,
          isPartiallyReturned,
          isFullyReturned,
          payment: sNet,
          debit: 0,
          credit: 0,
          paymentMethod: methodDisplay,
          paymentAccount: methodDisplay,
          status: sStatus,
          notes: historyNote
        });
      }
    });

    // Process Returns
    partyReturns.forEach((r, idx) => {
      const ts = parseNormalizedTimestamp(r.date, r.created_at);
      const isCashRefund = String(r.refundMode || '').toLowerCase() === 'cash';
      const refAmt = Number(r.refundAmount !== undefined ? r.refundAmount : (r.amount || 0));

      const matchingSale = partySales.find(s => (r.saleId && String(s.id) === String(r.saleId)) || (r.invoiceNo && s.invoiceNo && r.invoiceNo === s.invoiceNo));
      const origSaleGross = matchingSale ? Number(matchingSale.amount || matchingSale.grandTotal || 0) : 0;
      const netAfterReturn = origSaleGross > 0 ? Math.max(0, origSaleGross - refAmt) : 0;

      const descText = matchingSale
        ? `Sale Return #${r.returnNo || 'RET'} against Invoice ${matchingSale.invoiceNo}: ${r.reason || 'Goods Return'}`
        : `Sale Return: ${r.reason || 'Produce Return'}`;

      const historyNote = isCashRefund
        ? (origSaleGross > 0
            ? `Direct counter cash refund of Rs. ${refAmt.toLocaleString()} given to customer. Original Invoice ${matchingSale?.invoiceNo || ''} (Rs. ${origSaleGross.toLocaleString()}) adjusted to Net Rs. ${netAfterReturn.toLocaleString()}.`
            : `Direct counter cash refund of Rs. ${refAmt.toLocaleString()} given to customer.`)
        : (origSaleGross > 0
            ? `Khata Credit Note adjusted. Original Invoice ${matchingSale?.invoiceNo || ''} (Rs. ${origSaleGross.toLocaleString()}) adjusted to Net Rs. ${netAfterReturn.toLocaleString()}.`
            : `Credit note of Rs. ${refAmt.toLocaleString()} adjusted against Khata.`);

      entries.push({
        id: `ret-${r.id || idx}`,
        timestamp: ts,
        eventPriority: 2,
        seq: Number(r.id) || (idx + 1),
        rawDate: r.date,
        date: r.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: r.returnNo || `RET-${r.id || idx}`,
        matchingInvoiceNo: matchingSale?.invoiceNo || r.invoiceNo || '',
        originalGross: origSaleGross,
        returnAmount: refAmt,
        netTotal: netAfterReturn,
        refundMode: isCashRefund ? 'Cash' : 'Ledger',
        txType: 'Returns',
        desc: descText,
        sales: 0,
        payment: refAmt,
        debit: 0,
        credit: isCashRefund ? 0 : refAmt,
        paymentMethod: isCashRefund ? 'Cash (Direct Refund)' : 'Khata Credit Note',
        paymentAccount: isCashRefund ? 'Cash in Hand' : 'Customer Khata',
        status: 'Settled',
        notes: historyNote
      });
    });

    // Process Payment Logs
    partyPayments.forEach((p, idx) => {
      const ts = parseNormalizedTimestamp(p.date, p.created_at);
      const pAmt = Number(p.amount || 0);
      const rawPMode = String(p.mode || p.paymentMode || 'Cash').trim();
      const pModeLower = rawPMode.toLowerCase();

      let methodLabel = 'Cash';
      if (pModeLower.includes('bank') || pModeLower.includes('transfer')) {
        methodLabel = 'Bank Transfer';
      } else if (pModeLower.includes('card')) {
        methodLabel = 'Card Payment';
      } else {
        methodLabel = 'Cash';
      }

      entries.push({
        id: `pay-${p.id || idx}`,
        timestamp: ts,
        eventPriority: 3,
        seq: Number(p.id) || (idx + 1),
        rawDate: p.date,
        date: p.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: p.ref || `PAY-${p.id || idx}`,
        txType: 'Payments',
        desc: p.note || `Payment Received (${methodLabel})`,
        sales: 0,
        payment: pAmt,
        debit: 0,
        credit: pAmt,
        paymentMethod: methodLabel,
        paymentAccount: methodLabel,
        status: 'Settled',
        notes: p.note || ''
      });
    });
  } else {
    // Supplier Purchases, Returns, Payments
    const partyPurchases = (purchases || []).filter(p => {
      const pSupId = p.supplierId ? String(p.supplierId) : null;
      const pSupName = (p.supplier || p.supplierName || '').trim().toLowerCase();
      return (partyId && pSupId && pSupId === partyId) || (partyName && pSupName === partyName);
    });

    const partyPayments = (paymentLogs || []).filter(p => {
      const isSup = p.type === 'Supplier' || p.partyType === 'Supplier';
      if (!isSup) return false;
      const pMode = String(p.mode || '').trim().toLowerCase();
      if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

      const pPartyId = p.partyId ? String(p.partyId) : null;
      const pPartyName = (p.partyName || '').trim().toLowerCase();
      return (partyId && pPartyId && pPartyId === partyId) || (partyName && pPartyName === partyName);
    });

    const partyReturns = (purchaseReturns || []).filter(r => {
      const rSupId = r.supplierId ? String(r.supplierId) : null;
      const rSupName = (r.supplierName || '').trim().toLowerCase();
      return (partyId && rSupId && rSupId === partyId) || (partyName && rSupName === partyName);
    });

    // Process Purchases (Debit)
    partyPurchases.forEach((p, idx) => {
      const ts = parseNormalizedTimestamp(p.date, p.created_at);
      const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs);
      const pGross = fin.grossTotal;
      const pNet = fin.netTotal;
      const pReturn = fin.returnAmount;
      const pPaid = fin.paid;
      const pDue = fin.due;
      const pStatus = fin.status;
      const isPartiallyReturned = pReturn > 0 && pStatus !== 'Returned';
      const isFullyReturned = pStatus === 'Returned' || (pReturn >= pGross && pGross > 0);

      const pItems = Array.isArray(p.items) && p.items.length > 0
        ? p.items.map(i => `${i.name || 'Produce'} (${i.qty || i.enteredQty || 1} ${i.unitName || i.unit || 'KG'})`).join(', ')
        : (typeof p.cart === 'string' ? p.cart : 'Commodity Procurement');

      const rawMode = String(p.paymentMethod || p.paymentMode || 'Cash').trim();
      const modeLower = rawMode.toLowerCase();
      const isCreditOnly = modeLower.includes('credit') || modeLower.includes('khata') || modeLower.includes('udhaar') || modeLower === 'unpaid' || modeLower === 'pending';

      let methodDisplay = 'Cash';
      if (modeLower.includes('bank') || modeLower.includes('transfer')) {
        methodDisplay = 'Bank Transfer';
      } else if (modeLower.includes('card')) {
        methodDisplay = 'Card Payment';
      } else if (isCreditOnly) {
        methodDisplay = 'Credit / Khata';
      } else {
        methodDisplay = 'Cash';
      }

      const descText = pReturn > 0
        ? `Purchase #${p.purchaseNo || p.id}: ${pItems}`
        : `Bill: ${pItems}`;

      const historyNote = pReturn > 0
        ? `Original Bill: Rs. ${pGross.toLocaleString()} • Returned: Rs. ${pReturn.toLocaleString()} • Net Bill: Rs. ${pNet.toLocaleString()} | Paid: Rs. ${pPaid.toLocaleString()}, Due: Rs. ${pDue.toLocaleString()} (${pStatus})`
        : (p.note || '');

      if (isCreditOnly) {
        entries.push({
          id: `pur-${p.id || idx}`,
          timestamp: ts,
          eventPriority: 1,
          seq: Number(p.id) || (idx + 1),
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: p.purchaseNo || `PUR-${p.id || idx}`,
          txType: 'Purchases',
          desc: descText,
          sales: pNet,
          originalGross: pGross,
          netTotal: pNet,
          returnAmount: pReturn,
          paidAmount: pPaid,
          dueAmount: pDue,
          invoiceStatus: pStatus,
          isPartiallyReturned,
          isFullyReturned,
          payment: 0,
          debit: pGross,
          credit: 0,
          paymentMethod: 'Credit / Khata',
          paymentAccount: 'Credit / Khata',
          status: pStatus,
          notes: historyNote
        });
      } else {
        entries.push({
          id: `pur-${p.id || idx}`,
          timestamp: ts,
          eventPriority: 1,
          seq: Number(p.id) || (idx + 1),
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: p.purchaseNo || `PUR-${p.id || idx}`,
          txType: 'Purchases',
          desc: descText,
          sales: pNet,
          originalGross: pGross,
          netTotal: pNet,
          returnAmount: pReturn,
          paidAmount: pPaid,
          dueAmount: pDue,
          invoiceStatus: pStatus,
          isPartiallyReturned,
          isFullyReturned,
          payment: pNet,
          debit: 0,
          credit: 0,
          paymentMethod: methodDisplay,
          paymentAccount: methodDisplay,
          status: pStatus,
          notes: historyNote
        });
      }
    });

    // Process Purchase Returns
    partyReturns.forEach((r, idx) => {
      const ts = parseNormalizedTimestamp(r.date, r.created_at);
      const isCashRefund = String(r.refundMode || '').toLowerCase() === 'cash';
      const refAmt = Number(r.refundAmount !== undefined ? r.refundAmount : (r.amount || 0));

      const matchingPurchase = partyPurchases.find(p => (r.purchaseId && String(p.id) === String(r.purchaseId)) || (r.purchaseNo && p.purchaseNo && r.purchaseNo === p.purchaseNo));
      const origPurchaseGross = matchingPurchase ? Number(matchingPurchase.amount || matchingPurchase.grandTotal || 0) : 0;
      const netAfterReturn = origPurchaseGross > 0 ? Math.max(0, origPurchaseGross - refAmt) : 0;

      const descText = matchingPurchase
        ? `Purchase Return #${r.returnNo || 'PR'} against Bill ${matchingPurchase.purchaseNo}: ${r.reason || 'Goods Return'}`
        : `Purchase Return: ${r.reason || 'Commodity Return'}`;

      const historyNote = isCashRefund
        ? (origPurchaseGross > 0
            ? `Direct counter refund of Rs. ${refAmt.toLocaleString()} received from vendor. Original Bill was Rs. ${origPurchaseGross.toLocaleString()} → Net Bill now Rs. ${netAfterReturn.toLocaleString()}.`
            : `Direct counter cash refund of Rs. ${refAmt.toLocaleString()} received from vendor.`)
        : (origPurchaseGross > 0
            ? `Khata Debit Note adjusted. Original Bill was Rs. ${origPurchaseGross.toLocaleString()} → Net Bill now Rs. ${netAfterReturn.toLocaleString()}.`
            : `Debit note of Rs. ${refAmt.toLocaleString()} adjusted against Khata.`);

      entries.push({
        id: `pret-${r.id || idx}`,
        timestamp: ts,
        eventPriority: 2,
        seq: Number(r.id) || (idx + 1),
        rawDate: r.date,
        date: r.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: r.returnNo || `PR-${r.id || idx}`,
        matchingInvoiceNo: matchingPurchase?.purchaseNo || r.purchaseNo || '',
        originalGross: origPurchaseGross,
        returnAmount: refAmt,
        netTotal: netAfterReturn,
        refundMode: isCashRefund ? 'Cash' : 'Ledger',
        txType: 'Returns',
        desc: descText,
        sales: 0,
        payment: refAmt,
        debit: 0,
        credit: isCashRefund ? 0 : refAmt,
        paymentMethod: isCashRefund ? 'Cash (Direct Refund)' : 'Khata Debit Note',
        paymentAccount: isCashRefund ? 'Cash in Hand' : 'Supplier Khata',
        status: 'Settled',
        notes: historyNote
      });
    });

    // Process Supplier Payments
    partyPayments.forEach((p, idx) => {
      const ts = parseNormalizedTimestamp(p.date, p.created_at);
      const pAmt = Number(p.amount || 0);
      const rawPMode = String(p.mode || p.paymentMode || 'Cash').trim();
      const pModeLower = rawPMode.toLowerCase();

      let methodLabel = 'Cash';
      if (pModeLower.includes('bank') || pModeLower.includes('transfer')) {
        methodLabel = 'Bank Transfer';
      } else if (pModeLower.includes('card')) {
        methodLabel = 'Card Payment';
      } else {
        methodLabel = 'Cash';
      }

      entries.push({
        id: `pay-sup-${p.id || idx}`,
        timestamp: ts,
        eventPriority: 3,
        seq: Number(p.id) || (idx + 1),
        rawDate: p.date,
        date: p.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: p.ref || `PAY-${p.id || idx}`,
        txType: 'Payments',
        desc: p.note || `Supplier Payment (${methodLabel})`,
        sales: 0,
        payment: pAmt,
        debit: 0,
        credit: pAmt,
        paymentMethod: methodLabel,
        paymentAccount: methodLabel,
        status: 'Settled',
        notes: p.note || ''
      });
    });
  }

  // 1. Sort strictly chronologically (Oldest to Newest)
  entries.sort(compareLedgerTransactions);

  // 2. Compute Running Balances in strict chronological order
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const chronologicalEntries = entries.map((entry, index) => {
    const d = Number(entry.debit || 0);
    const c = Number(entry.credit || 0);
    totalDebit += d;
    totalCredit += c;
    runningBalance = runningBalance + d - c;

    const entryStatus = runningBalance === 0
      ? 'Settled'
      : runningBalance > 0
        ? (isSupplier ? 'Payable' : 'Due')
        : 'Advance';

    return {
      ...entry,
      stepIndex: index + 1,
      runningBalance,
      balanceState: entryStatus,
      status: entryStatus
    };
  });

  const closingBalance = Math.max(0, runningBalance);
  const receivableDue = !isSupplier ? closingBalance : 0;
  const payableDue = isSupplier ? closingBalance : 0;
  const advanceCredit = 0;
  const status = closingBalance > 0
    ? (isSupplier ? 'Payable' : 'Receivable')
    : 'Settled';

  // 3. Reverse for Newest-First display while keeping verified chronological running balance
  const displayEntries = [...chronologicalEntries].reverse();

  return {
    party,
    openingBalance: opBal,
    totalDebit,
    totalCredit,
    netBalance: closingBalance,
    closingBalance,
    receivableDue,
    payableDue,
    advanceCredit,
    status,
    chronologicalEntries,
    displayEntries
  };
};

const normalizePurchase = (p) => {
  if (!p) return null;
  const grandTotal = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : (p.grandtotal !== undefined ? p.grandtotal : 0)));
  const returnAmount = Number(p.returnAmount !== undefined ? p.returnAmount : (p.returnamount !== undefined ? p.returnamount : 0));
  const netAmount = Number(p.netAmount !== undefined ? p.netAmount : (p.netamount !== undefined ? p.netamount : Math.max(0, grandTotal - returnAmount)));
  const paidAmount = Number(p.paidAmount !== undefined ? p.paidAmount : (p.paidamount !== undefined ? p.paidamount : 0));
  const supplierName = p.supplier || p.supplierName || p.suppliername || 'Supplier';
  const purchaseNo = p.purchaseNo || p.purchaseno || '';
  const isReturned = (p.status === 'Returned' || p.paymentStatus === 'Returned') || (returnAmount >= grandTotal && grandTotal > 0);
  const status = isReturned ? 'Returned' : (p.paymentStatus || p.status || ((paidAmount >= netAmount && netAmount > 0) ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending'));
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
    returnAmount,
    returnamount: returnAmount,
    netAmount,
    netamount: netAmount,
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
  const returnAmount = Number(s.returnAmount !== undefined ? s.returnAmount : (s.returnamount !== undefined ? s.returnamount : 0));
  const netAmount = Number(s.netAmount !== undefined ? s.netAmount : (s.netamount !== undefined ? s.netamount : Math.max(0, amount - returnAmount)));
  const paidAmount = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount !== undefined ? s.paidamount : 0));
  const partyName = s.partyName || s.partyname || s.customerName || s.customername || 'Walk-in Customer';
  const invoiceNo = s.invoiceNo || s.invoiceno || '';
  const isReturned = (s.status === 'Returned') || (s.returnStatus && s.returnStatus !== 'None') || (returnAmount >= amount && amount > 0);
  const status = isReturned ? 'Returned' : (s.status || ((paidAmount >= netAmount && netAmount > 0) ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending'));
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
    returnAmount,
    returnamount: returnAmount,
    netAmount,
    netamount: netAmount,
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

  // 9. Record Payment with real-time balance validation and anti-duplicate lock
  const recordPayment = async ({ partyId, partyName, partyType, amount, paymentMode = 'Cash', note = '', saleId = null, purchaseId = null }) => {
    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0) {
      throw new Error('Valid payment amount greater than zero is required');
    }

    if (partyType === 'Customer') {
      const cust = (customers || []).find(c => (partyId && String(c.id) === String(partyId)) || (partyName && c.name && c.name.trim().toLowerCase() === partyName.trim().toLowerCase()));
      let maxCustomerDue = 0;
      if (cust) {
        const fin = computeCustomerKhataBalance(cust, sales, paymentLogs, saleReturns);
        maxCustomerDue = Math.max(0, fin.receivableDue || 0);
      } else if (saleId) {
        const targetSale = (sales || []).find(s => String(s.id) === String(saleId));
        const fin = computeSaleFinancials(targetSale, saleReturns, paymentLogs);
        maxCustomerDue = Math.max(0, fin.due || 0);
      }

      if (maxCustomerDue <= 0) {
        throw new Error('Customer account is already settled. No outstanding due to pay.');
      }
      if (amtNum > maxCustomerDue) {
        throw new Error(`Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the customer's outstanding balance of Rs. ${maxCustomerDue.toLocaleString()}.`);
      }
    } else {
      const sup = (suppliers || []).find(s => (partyId && String(s.id) === String(partyId)) || (partyName && s.name && s.name.trim().toLowerCase() === partyName.trim().toLowerCase()));
      let maxSupplierPayable = 0;
      if (sup) {
        const fin = computeSupplierKhataBalance(sup, purchases, paymentLogs, purchaseReturns);
        maxSupplierPayable = Math.max(0, fin.payableDue || 0);
      } else if (purchaseId) {
        const targetPur = (purchases || []).find(p => String(p.id) === String(purchaseId));
        const fin = computePurchaseFinancials(targetPur, purchaseReturns, paymentLogs);
        maxSupplierPayable = Math.max(0, fin.due || 0);
      }

      if (maxSupplierPayable <= 0) {
        throw new Error('Supplier account is already settled. No outstanding payable balance.');
      }
      if (amtNum > maxSupplierPayable) {
        throw new Error(`Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the supplier's outstanding payable of Rs. ${maxSupplierPayable.toLocaleString()}.`);
      }
    }

    const lockKey = `pay:${partyId || partyName || ''}:${partyType}:${amtNum}:${saleId || ''}:${purchaseId || ''}`;
    if (inFlightLocks.current.has(lockKey)) {
      return inFlightLocks.current.get(lockKey);
    }

    const promise = (async () => {
      try {
        const res = await authFetch('/api/ledger/payment', {
          method: 'POST',
          body: { partyId, partyName, partyType, amount: amtNum, paymentMode, note, saleId, purchaseId }
        });

        if (res.success && res.entry) {
          if (!res.deduplicated) {
            setPaymentLogs(prev => [res.entry, ...prev]);

            if (partyType === 'Customer') {
              const [custRes, saleRes, ledgerRes] = await Promise.all([
                authFetch('/api/customers'),
                authFetch('/api/sales'),
                authFetch('/api/ledger')
              ]);
              if (custRes.success) setCustomers(custRes.customers || []);
              if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
              if (ledgerRes.success) setPaymentLogs((ledgerRes.entries || []).map(normalizePaymentLog));
            } else {
              const [supRes, purRes, ledgerRes] = await Promise.all([
                authFetch('/api/suppliers'),
                authFetch('/api/purchases'),
                authFetch('/api/ledger')
              ]);
              if (supRes.success) setSuppliers(supRes.suppliers || []);
              if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
              if (ledgerRes.success) setPaymentLogs((ledgerRes.entries || []).map(normalizePaymentLog));
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

  const deletePayment = async (id) => {
    try {
      const res = await authFetch(`/api/ledger/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setPaymentLogs(prev => prev.filter(p => String(p.id) !== String(id)));

        const [custRes, supRes, saleRes, purRes, ledgerRes] = await Promise.all([
          authFetch('/api/customers'),
          authFetch('/api/suppliers'),
          authFetch('/api/sales'),
          authFetch('/api/purchases'),
          authFetch('/api/ledger')
        ]);
        if (custRes.success) setCustomers(custRes.customers || []);
        if (supRes.success) setSuppliers(supRes.suppliers || []);
        if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
        if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
        if (ledgerRes.success) setPaymentLogs((ledgerRes.entries || []).map(normalizePaymentLog));

        return true;
      }
      throw new Error(res.message || 'Failed to delete payment');
    } catch (err) {
      console.error('deletePayment error:', err);
      throw err;
    }
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
      deletePayment,
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
      resolveTransactionPayment,
      computeSaleFinancials,
      computePurchaseFinancials,
      computeCustomerKhataBalance,
      computeWalkinUncollectedDues,
      computeSupplierKhataBalance,
      computeAllCustomersFinancials,
      computeAllSuppliersFinancials,
      computeLedgerStatement,
      compareLedgerTransactions,
      parseNormalizedTimestamp
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => useContext(ERPContext);
