import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { authFetch } from '../services/api';

const ERPContext = createContext();

/**
 * Single Canonical Accounting Resolution for Transaction Payments, Inflows, Outflows, and Khata allocations.
 * Precedence Rules:
 * 1. Explicit Mode Check (e.g. 'Supplier Khata', 'Khata', 'Credit', 'Ledger', 'Debit Note', 'Credit Note' vs 'Cash', 'Bank', etc.)
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
    (txType === 'SaleReturn' || txType === 'PurchaseReturn')
      ? (tx.refundMode || tx.refundmode || tx.mode || tx.paymentMode || tx.paymentMethod || 'Credit')
      : (tx.paymentMode || tx.paymentmode || tx.paymentMethod || tx.paymentmethod || tx.mode || 'Cash')
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

  // Handle Returns - Strictly Cash Refunds (Direct cash/bank refund, no Khata adjustment)
  if (txType === 'SaleReturn' || txType === 'PurchaseReturn') {
    const refAmt = Number(
      tx.refundAmount !== undefined ? tx.refundAmount :
        tx.refundamount !== undefined ? tx.refundamount :
          tx.amount !== undefined ? tx.amount : grossAmount
    );

    const rawMode = String(
      tx.refundMode !== undefined && tx.refundMode !== null && tx.refundMode !== '' ? tx.refundMode :
        tx.refundmode !== undefined && tx.refundmode !== null && tx.refundmode !== '' ? tx.refundmode :
          tx.mode !== undefined && tx.mode !== null && tx.mode !== '' ? tx.mode :
            tx.paymentMode !== undefined && tx.paymentMode !== null && tx.paymentMode !== '' ? tx.paymentMode : 'Cash'
    ).trim().toLowerCase();

    const isNonLiquid = rawMode.includes('khata') || rawMode.includes('credit') || rawMode.includes('due') || rawMode.includes('pending') || refAmt === 0;

    const isBank = !isNonLiquid && (rawMode.includes('bank') || rawMode.includes('transfer') || rawMode.includes('raast') || rawMode.includes('online'));
    const isCard = !isNonLiquid && !isBank && rawMode.includes('card');
    const isCash = !isNonLiquid && !isBank && !isCard;

    return {
      channel: isNonLiquid ? 'khata' : (isBank ? 'bank' : (isCard ? 'card' : 'cash')),
      isLiquid: !isNonLiquid && refAmt > 0,
      isKhata: isNonLiquid,
      cashAmount: isCash ? refAmt : 0,
      bankAmount: isBank ? refAmt : 0,
      cardAmount: isCard ? refAmt : 0,
      totalLiquid: !isNonLiquid ? refAmt : 0,
      creditAmount: isNonLiquid ? refAmt : 0,
      grossAmount: refAmt,
      refundMode: isNonLiquid ? 'Khata / Due Adjustment' : (isBank ? 'Bank Account' : (isCard ? 'Card' : 'Cash')),
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
  } else if (isKhataOrCredit || isMarkedPending || rawPaid === 0) {
    liquidPaid = 0;
  } else if (isMarkedPaid) {
    liquidPaid = grossAmount;
  } else if (isMarkedPartial && rawPaid > 0) {
    liquidPaid = Math.min(grossAmount, rawPaid);
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

export const computeLiquidBalances = (
  arg1 = [],
  arg2 = [],
  arg3 = [],
  arg4 = [],
  arg5 = [],
  arg6 = []
) => {
  let sales = [];
  let purchases = [];
  let saleReturns = [];
  let purchaseReturns = [];
  let paymentLogs = [];
  let expenses = [];

  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    sales = arg1.sales || [];
    purchases = arg1.purchases || [];
    saleReturns = arg1.saleReturns || [];
    purchaseReturns = arg1.purchaseReturns || [];
    paymentLogs = arg1.paymentLogs || [];
    expenses = arg1.expenses || [];
  } else {
    sales = Array.isArray(arg1) ? arg1 : [];
    purchases = Array.isArray(arg2) ? arg2 : [];

    // Detect if arg3 was passed as paymentLogs (swapped argument order fix)
    const arg3IsPaymentLogs = Array.isArray(arg3) && arg3.some(p => p && (p.type === 'Customer Payment' || p.type === 'Supplier Payment' || p.partyType));
    if (arg3IsPaymentLogs) {
      paymentLogs = arg3;
      expenses = Array.isArray(arg4) ? arg4 : [];
      saleReturns = Array.isArray(arg5) ? arg5 : [];
      purchaseReturns = Array.isArray(arg6) ? arg6 : [];
    } else {
      saleReturns = Array.isArray(arg3) ? arg3 : [];
      purchaseReturns = Array.isArray(arg4) ? arg4 : [];
      paymentLogs = Array.isArray(arg5) ? arg5 : [];
      expenses = Array.isArray(arg6) ? arg6 : [];
    }
  }

  let cInflow = 0, bInflow = 0, kInflow = 0;
  let cOutflow = 0, bOutflow = 0, kOutflow = 0;

  const validCustPaymentLogs = (paymentLogs || []).filter(p =>
    p && (p.type === 'Customer Payment' || p.type === 'Customer' || p.partyType === 'Customer') && String(p.status || '').toLowerCase() !== 'cancelled'
  );
  const validSupPaymentLogs = (paymentLogs || []).filter(p =>
    p && (p.type === 'Supplier Payment' || p.type === 'Supplier' || p.partyType === 'Supplier') && String(p.status || '').toLowerCase() !== 'cancelled'
  );

  // 1. Sales (Upfront liquid payments)
  (sales || []).forEach(s => {
    const hasMatchingLog = validCustPaymentLogs.some(pl =>
      (pl.saleId && String(pl.saleId) === String(s.id)) ||
      (s.invoiceNo && pl.ref && pl.ref.includes(s.invoiceNo))
    );
    if (!hasMatchingLog) {
      const res = resolveTransactionPayment(s, 'Sale');
      cInflow += res.cashAmount;
      bInflow += res.bankAmount;
      kInflow += res.cardAmount;
    }
  });

  // 2. Customer Payments (Payment logs)
  validCustPaymentLogs.forEach(p => {
    const res = resolveTransactionPayment(p, 'Sale');
    cInflow += res.cashAmount;
    bInflow += res.bankAmount;
    kInflow += res.cardAmount;
  });

  // 3. Purchase Returns (Supplier refunds)
  (purchaseReturns || []).forEach(r => {
    const res = resolveTransactionPayment(r, 'PurchaseReturn');
    cInflow += res.cashAmount;
    bInflow += res.bankAmount;
    kInflow += res.cardAmount;
  });

  // 4. Supplier Payments (Payment logs)
  validSupPaymentLogs.forEach(p => {
    const res = resolveTransactionPayment(p, 'Purchase');
    cOutflow += res.cashAmount;
    bOutflow += res.bankAmount;
    kOutflow += res.cardAmount;
  });

  // 5. Purchases (Direct upfront paid)
  (purchases || []).forEach(p => {
    const hasMatchingLog = validSupPaymentLogs.some(pl =>
      (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
      (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
    );
    if (!hasMatchingLog) {
      const res = resolveTransactionPayment(p, 'Purchase');
      cOutflow += res.cashAmount;
      bOutflow += res.bankAmount;
      kOutflow += res.cardAmount;
    }
  });

  // 6. Expenses Outflows
  (expenses || []).forEach(e => {
    const res = resolveTransactionPayment(e, 'Expense');
    if (res.isLiquid && res.totalLiquid > 0) {
      cOutflow += res.cashAmount;
      bOutflow += res.bankAmount;
      kOutflow += res.cardAmount;
    }
  });

  // 7. Sale Returns Outflows
  (saleReturns || []).forEach(r => {
    const res = resolveTransactionPayment(r, 'SaleReturn');
    cOutflow += res.cashAmount;
    bOutflow += res.bankAmount;
    kOutflow += res.cardAmount;
  });

  const cashInHand = Math.max(0, cInflow - cOutflow);
  const bankBalance = Math.max(0, bInflow - bOutflow);
  const cardBalance = Math.max(0, kInflow - kOutflow);

  return {
    cashInHand,
    bankBalance,
    cardBalance,
    totalLiquidFunds: cashInHand + bankBalance + cardBalance,
    rawCash: cInflow - cOutflow,
    rawBank: bInflow - bOutflow,
    rawCard: kInflow - kOutflow
  };
};

export const extractMerchandiseReturnValue = (r) => {
  if (!r) return 0;
  if (Array.isArray(r.items) && r.items.length > 0) {
    const itemsVal = r.items.reduce((sum, it) => sum + Number(it.totalAmount || it.total || ((it.qty || 0) * (it.rate || 0))), 0);
    if (itemsVal > 0) return itemsVal;
  }
  if (r.itemsJson) {
    try {
      const itms = typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : r.itemsJson;
      if (Array.isArray(itms) && itms.length > 0) {
        const itemsVal = itms.reduce((sum, it) => sum + Number(it.totalAmount || it.total || ((it.qty || 0) * (it.rate || 0))), 0);
        if (itemsVal > 0) return itemsVal;
      }
    } catch (e) {}
  }
  return Number(r.totalGoodsValue || r.refundAmount || 0);
};

export const computeSaleFinancials = (sale, saleReturns = [], paymentLogs = [], allSales = []) => {
  if (!sale) return { total: 0, grossTotal: 0, netTotal: 0, paid: 0, returnAmount: 0, due: 0, status: 'Pending', isReturned: false, isFullyReturned: false, isPartiallyReturned: false };
  const total = Number(sale.amount !== undefined ? sale.amount : (sale.grandTotal !== undefined ? sale.grandTotal : (sale.grandtotal !== undefined ? sale.grandtotal : 0)));

  const returns = (saleReturns || []).filter(r => (r.saleId && String(r.saleId) === String(sale.id)) || (r.invoiceNo && r.invoiceNo === sale.invoiceNo));
  const returnAmount = returns.length > 0 ? returns.reduce((acc, r) => acc + extractMerchandiseReturnValue(r), 0) : Number(sale.returnAmount || 0);
  const cashRefundAmount = returns.filter(r => String(r.refundMode || '').trim().toLowerCase() === 'cash').reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
  const netDueableTotal = Math.max(0, total - returnAmount);

  // Categorize specific payment logs for this sale invoice (excluding POS checkout logs, Opening Balance, Credit Notes)
  const specificNonPosLogs = (paymentLogs || []).filter(pl =>
    (pl.type === 'Customer' || pl.partyType === 'Customer') &&
    (
      (pl.saleId && String(pl.saleId) === String(sale.id)) ||
      (sale.invoiceNo && pl.ref && pl.ref.includes(sale.invoiceNo))
    ) &&
    pl.mode !== 'Opening Balance' &&
    pl.mode !== 'Credit Note' &&
    !String(pl.ref || '').includes('POS-PAY')
  );

  // Check if a POS payment log was explicitly recorded in paymentLogs for this sale
  const hasPosLog = (paymentLogs || []).some(pl =>
    (pl.type === 'Customer' || pl.partyType === 'Customer') &&
    (
      (pl.saleId && String(pl.saleId) === String(sale.id)) ||
      (sale.invoiceNo && pl.ref && pl.ref.includes(sale.invoiceNo))
    ) &&
    String(pl.ref || '').includes('POS-PAY')
  );

  const res = resolveTransactionPayment(sale, 'Sale');
  const upfrontPaid = hasPosLog
    ? (paymentLogs || []).filter(pl => (pl.saleId && String(pl.saleId) === String(sale.id)) || (sale.invoiceNo && pl.ref && pl.ref.includes(sale.invoiceNo)))
        .reduce((sum, pl) => sum + (String(pl.ref || '').includes('POS-PAY') ? Number(pl.amount || 0) : 0), 0)
    : res.totalLiquid;

  const totalSpecificNonPos = specificNonPosLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0);
  let specificPaid = upfrontPaid + totalSpecificNonPos;

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
      (pl.ref && (pl.ref.includes('INV-') || pl.ref.includes('SAL-') || pl.ref.includes('POS-PAY')))
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
  let generalAllocatedToThisSale = 0;

  if (unlinkedGeneralLogs.length > 0) {
    const saleTime = parseNormalizedTimestamp(sale.date, sale.created_at || sale.createdAt) || (Number(sale.id) || 0);

    const relevantSales = (allSales && allSales.length > 0)
      ? (allSales || []).filter(s => {
        const sCustId = s.customerId ? String(s.customerId) : null;
        const sPartyName = (s.partyName || s.customerName || '').trim().toLowerCase();
        if (isRegularCust) {
          return (custId && sCustId && sCustId === custId) || (partyName && sPartyName === partyName && !sPartyName.includes('walk-in'));
        } else {
          return (custId && sCustId && sCustId === custId) || (partyName && sPartyName === partyName);
        }
      }).sort((a, b) => {
        const timeA = parseNormalizedTimestamp(a.date, a.created_at || a.createdAt) || (Number(a.id) || 0);
        const timeB = parseNormalizedTimestamp(b.date, b.created_at || b.createdAt) || (Number(b.id) || 0);
        return timeA - timeB;
      })
      : [sale];

    unlinkedGeneralLogs.forEach(pl => {
      const plTime = parseNormalizedTimestamp(pl.date, pl.created_at || pl.createdAt) || (Number(pl.id) || 0);
      let plCash = Number(pl.amount || 0);
      if (plCash <= 0) return;

      // Rule #3: A payment must never be allocated to an invoice that did not exist or was not outstanding when the payment occurred.
      if (plTime > 0 && saleTime > 0 && saleTime > (plTime + 1000) && String(sale.id) !== String(relevantSales[0]?.id)) {
        return;
      }

      const eligibleSales = relevantSales.filter(s => {
        const sTime = parseNormalizedTimestamp(s.date, s.created_at || s.createdAt) || (Number(s.id) || 0);
        return plTime === 0 || sTime === 0 || sTime <= (plTime + 1000) || String(s.id) === String(relevantSales[0]?.id);
      });

      for (const s of eligibleSales) {
        if (plCash <= 0) break;
        const sTotal = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));
        const sReturns = (saleReturns || []).filter(r => (r.saleId && String(r.saleId) === String(s.id)) || (r.invoiceNo && r.invoiceNo === s.invoiceNo));
        const sRetAmt = sReturns.length > 0 ? sReturns.reduce((acc, r) => acc + extractMerchandiseReturnValue(r), 0) : Number(s.returnAmount || 0);
        const sNetTotal = Math.max(0, sTotal - sRetAmt);

        const sSpecificLogs = (paymentLogs || []).filter(plog =>
          (plog.type === 'Customer' || plog.partyType === 'Customer') &&
          (
            (plog.saleId && String(plog.saleId) === String(s.id)) ||
            (s.invoiceNo && plog.ref && plog.ref.includes(s.invoiceNo))
          ) &&
          plog.mode !== 'Opening Balance' &&
          plog.mode !== 'Credit Note' &&
          !String(plog.ref || '').includes('POS-PAY')
        );

        const sHasPosLog = (paymentLogs || []).some(plog =>
          (plog.type === 'Customer' || plog.partyType === 'Customer') &&
          (
            (plog.saleId && String(plog.saleId) === String(s.id)) ||
            (s.invoiceNo && plog.ref && plog.ref.includes(s.invoiceNo))
          ) &&
          String(plog.ref || '').includes('POS-PAY')
        );

        const sUpfront = sHasPosLog
          ? (paymentLogs || []).filter(plog => (plog.saleId && String(plog.saleId) === String(s.id)) || (s.invoiceNo && plog.ref && plog.ref.includes(s.invoiceNo)))
              .reduce((sum, plog) => sum + (String(plog.ref || '').includes('POS-PAY') ? Number(plog.amount || 0) : 0), 0)
          : resolveTransactionPayment(s, 'Sale').totalLiquid;

        const sSpecificPaid = sUpfront + sSpecificLogs.reduce((acc, plog) => acc + Number(plog.amount || 0), 0);
        const sRemainingDue = Math.max(0, sNetTotal - sSpecificPaid);

        const alloc = Math.min(sRemainingDue, plCash);
        if (String(s.id) === String(sale.id)) {
          generalAllocatedToThisSale += alloc;
        }
        plCash -= alloc;
      }
    });
  }

  const rawGrossPaid = specificPaid + generalAllocatedToThisSale;
  const paid = Math.min(netDueableTotal, rawGrossPaid);
  const isFullyReturned = (sale.status === 'Returned') || sale.isReturned || (sale.returnStatus === 'Fully Returned') || (returnAmount >= (total - 0.5) && total > 0);
  const isPartiallyReturned = !isFullyReturned && returnAmount > 0;
  const isReturned = isFullyReturned;
  const due = Math.max(0, netDueableTotal - paid);
  const status = isFullyReturned ? 'Returned' : ((due === 0 && netDueableTotal > 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

  const dummyCust = { id: custId, name: partyName, customerType: isRegularCust ? 'Regular Customer' : 'Walk-in Customer' };
  const custKhata = computeCustomerKhataBalance(dummyCust, allSales.length > 0 ? allSales : [sale], paymentLogs, saleReturns);
  const autoCustRefund = Number(custKhata.refundLiability || custKhata.advanceCredit || 0);

  const relevantSales = (allSales && allSales.length > 0)
    ? (allSales || []).filter(s => {
        const sCustId = s.customerId ? String(s.customerId) : null;
        const sPartyName = (s.partyName || s.customerName || '').trim().toLowerCase();
        if (isRegularCust) {
          return (custId && sCustId && sCustId === custId) || (partyName && sPartyName === partyName && !sPartyName.includes('walk-in'));
        } else {
          return (custId && sCustId && sCustId === custId) || (partyName && sPartyName === partyName);
        }
      })
    : [sale];

  const primarySale = relevantSales.find(s => {
    const sReturns = (saleReturns || []).filter(r => (r.saleId && String(r.saleId) === String(s.id)) || (r.invoiceNo && r.invoiceNo === s.invoiceNo));
    return sReturns.length > 0;
  }) || relevantSales[0] || sale;

  const isPrimary = String(primarySale.id) === String(sale.id);
  const effectiveRefundCashback = isPrimary
    ? Math.max(cashRefundAmount, Math.max(autoCustRefund, Math.max(0, rawGrossPaid - netDueableTotal)))
    : cashRefundAmount;

  return {
    total: Math.round(total),
    grossTotal: Math.round(total),
    netTotal: Math.round(netDueableTotal),
    paid: Math.round(paid),
    returnAmount: Math.round(returnAmount),
    refundCashback: Math.round(effectiveRefundCashback),
    due: Math.round(due),
    status,
    isReturned,
    isFullyReturned,
    isPartiallyReturned
  };
};

export const computePurchaseFinancials = (purchase, purchaseReturns = [], paymentLogs = [], allPurchases = []) => {
  if (!purchase) return { total: 0, grossTotal: 0, netTotal: 0, paid: 0, returnAmount: 0, due: 0, status: 'Pending', isReturned: false, isFullyReturned: false, isPartiallyReturned: false };
  const total = Number(purchase.amount !== undefined ? purchase.amount : (purchase.grandTotal !== undefined ? purchase.grandTotal : (purchase.grandtotal !== undefined ? purchase.grandtotal : 0)));

  const returns = (purchaseReturns || []).filter(r => (r.purchaseId && String(r.purchaseId) === String(purchase.id)) || (r.purchaseNo && r.purchaseNo === purchase.purchaseNo));
  const returnAmount = returns.length > 0 ? returns.reduce((acc, r) => acc + extractMerchandiseReturnValue(r), 0) : Number(purchase.returnAmount || 0);
  const cashRefundAmount = returns.reduce((acc, r) => {
    const m = String(r.refundMode || r.mode || '').trim().toLowerCase();
    const isCredit = m === 'credit' || m === 'khata credit' || m === 'khata';
    const amt = Number(r.refundAmount !== undefined ? r.refundAmount : (r.refundamount !== undefined ? r.refundamount : (r.amount || 0)));
    if (!isCredit && amt > 0) return acc + amt;
    return acc;
  }, 0);
  const netDueableTotal = Math.max(0, total - returnAmount);

  // Categorize specific payment logs for this purchase
  const isExcludedSupplierLog = (pl) => {
    const isSup = String(pl.type || '').trim().toLowerCase() === 'supplier' || String(pl.partyType || '').trim().toLowerCase() === 'supplier';
    if (!isSup) return true;
    const pMode = String(pl.mode || '').trim().toLowerCase();
    return (
      pMode === 'opening balance' ||
      pMode === 'credit note' ||
      pMode === 'debit note' ||
      pMode === 'supplier khata' ||
      pMode.includes('khata') ||
      pMode === 'purchase' ||
      pMode === 'bill' ||
      pMode === 'purchase return'
    );
  };

  // Categorize specific payment logs for this purchase
  const matchingLogs = (paymentLogs || []).filter(pl => {
    if (isExcludedSupplierLog(pl)) return false;

    return (
      (pl.purchaseId && String(pl.purchaseId) === String(purchase.id)) ||
      (pl.purchaseid && String(pl.purchaseid) === String(purchase.id)) ||
      (purchase.purchaseNo && pl.ref && pl.ref.includes(purchase.purchaseNo))
    );
  });

  const res = resolveTransactionPayment(purchase, 'Purchase');
  const upfrontPaid = res.totalLiquid;
  const totalMatchingLogs = matchingLogs.reduce((acc, pl) => acc + Number(pl.amount || 0), 0);
  const isKhataPurchase = (purchase.paymentMode === 'Supplier Khata' || purchase.paymentmode === 'Supplier Khata') || (Number(purchase.paidAmount || purchase.paidamount || 0) === 0);
  const baseUpfront = isKhataPurchase ? 0 : upfrontPaid;
  const specificPaid = Math.max(baseUpfront, totalMatchingLogs);
  let rawGrossPaid = specificPaid;

  // Unlinked general supplier settlement payments allocation
  const supId = purchase.supplierId ? String(purchase.supplierId) : (purchase.supplierid ? String(purchase.supplierid) : null);
  const supName = (purchase.supplier || purchase.supplierName || purchase.suppliername || '').trim().toLowerCase();

  const unlinkedGeneralLogs = (paymentLogs || []).filter(pl => {
    if (isExcludedSupplierLog(pl)) return false;

    const hasSpecificPurchase = Boolean(
      pl.purchaseId ||
      pl.purchaseid ||
      (pl.ref && (pl.ref.includes('PUR-') || pl.ref.includes('BILL-')))
    );
    if (hasSpecificPurchase) return false;

    const pPartyId = pl.partyId ? String(pl.partyId) : (pl.partyid ? String(pl.partyid) : null);
    const pPartyName = (pl.partyName || pl.partyname || '').trim().toLowerCase();
    return (supId && pPartyId && pPartyId === supId) || (supName && pPartyName === supName);
  });

  let generalAllocatedToThisPurchase = 0;

  if (unlinkedGeneralLogs.length > 0) {
    const purchaseTime = parseNormalizedTimestamp(purchase.date, purchase.created_at || purchase.createdAt) || (Number(purchase.id) || 0);

    const relevantPurchases = (allPurchases && allPurchases.length > 0)
      ? (allPurchases || []).filter(p => {
        const pSupId = p.supplierId ? String(p.supplierId) : (p.supplierid ? String(p.supplierid) : null);
        const pSupName = (p.supplier || p.supplierName || p.suppliername || '').trim().toLowerCase();
        return (supId && pSupId && pSupId === supId) || (supName && pSupName === supName);
      }).sort((a, b) => {
        const timeA = parseNormalizedTimestamp(a.date, a.created_at || a.createdAt) || (Number(a.id) || 0);
        const timeB = parseNormalizedTimestamp(b.date, b.created_at || b.createdAt) || (Number(b.id) || 0);
        return timeA - timeB;
      })
      : [purchase];

    unlinkedGeneralLogs.forEach(pl => {
      const plTime = parseNormalizedTimestamp(pl.date, pl.created_at || pl.createdAt) || (Number(pl.id) || 0);
      let plCash = Number(pl.amount || 0);
      if (plCash <= 0) return;

      // Rule #3: A payment must never be allocated to an invoice that did not exist or was not outstanding when the payment occurred.
      if (plTime > 0 && purchaseTime > 0 && purchaseTime > (plTime + 1000) && String(purchase.id) !== String(relevantPurchases[0]?.id)) {
        return;
      }

      const eligiblePurchases = relevantPurchases.filter(p => {
        const pTime = parseNormalizedTimestamp(p.date, p.created_at || p.createdAt) || (Number(p.id) || 0);
        return plTime === 0 || pTime === 0 || pTime <= (plTime + 1000) || String(p.id) === String(relevantPurchases[0]?.id);
      });

      for (const p of eligiblePurchases) {
        if (plCash <= 0) break;
        const pTotal = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
        const pReturns = (purchaseReturns || []).filter(r => (r.purchaseId && String(r.purchaseId) === String(p.id)) || (r.purchaseNo && r.purchaseNo === p.purchaseNo));
        const pRetAmt = pReturns.length > 0 ? pReturns.reduce((acc, r) => acc + extractMerchandiseReturnValue(r), 0) : Number(p.returnAmount || 0);
        const pNetTotal = Math.max(0, pTotal - pRetAmt);

        const pMatchingLogs = (paymentLogs || []).filter(plog => {
          if (isExcludedSupplierLog(plog)) return false;

          return (
            (plog.purchaseId && String(plog.purchaseId) === String(p.id)) ||
            (plog.purchaseid && String(plog.purchaseid) === String(p.id)) ||
            (p.purchaseNo && plog.ref && plog.ref.includes(p.purchaseNo))
          );
        });
        const pIsKhata = (p.paymentMode === 'Supplier Khata' || p.paymentmode === 'Supplier Khata') || (Number(p.paidAmount || p.paidamount || 0) === 0);
        const pUpfront = pIsKhata ? 0 : resolveTransactionPayment(p, 'Purchase').totalLiquid;
        const pSpecificPaid = Math.max(pUpfront, pMatchingLogs.reduce((acc, plog) => acc + Number(plog.amount || 0), 0));
        const pRemainingDue = Math.max(0, pNetTotal - pSpecificPaid);

        const alloc = Math.min(pRemainingDue, plCash);
        if (String(p.id) === String(purchase.id)) {
          generalAllocatedToThisPurchase += alloc;
        }
        plCash -= alloc;
      }
    });

    rawGrossPaid = specificPaid + generalAllocatedToThisPurchase;
  } else if (isKhataPurchase && totalMatchingLogs === 0) {
    rawGrossPaid = 0;
  }

  const paid = Math.min(netDueableTotal, rawGrossPaid);
  const isFullyReturned = (purchase.status === 'Returned') || (purchase.paymentStatus === 'Returned') || purchase.isReturned || (purchase.returnStatus === 'Fully Returned') || (returnAmount >= (total - 0.5) && total > 0);
  const isPartiallyReturned = !isFullyReturned && returnAmount > 0;
  const isReturned = isFullyReturned;
  const due = Math.max(0, netDueableTotal - paid);
  const status = isFullyReturned ? 'Returned' : ((due === 0 && netDueableTotal > 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

  // Calculate canonical overall supplier refund/cashback for this supplier
  const dummySup = { id: supId, name: supName };
  const supKhata = computeSupplierKhataBalance(dummySup, allPurchases.length > 0 ? allPurchases : [purchase], paymentLogs, purchaseReturns);
  const autoSupRefund = Number(supKhata.automaticSupplierRefund || supKhata.refundCashback || 0);

  const relevantPurchases = (allPurchases && allPurchases.length > 0)
    ? (allPurchases || []).filter(p => {
        const pSupId = p.supplierId ? String(p.supplierId) : (p.supplierid ? String(p.supplierid) : null);
        const pSupName = (p.supplier || p.supplierName || p.suppliername || '').trim().toLowerCase();
        return (supId && pSupId && pSupId === supId) || (supName && pSupName && pSupName === supName);
      })
    : [purchase];

  const primaryPurchase = relevantPurchases.find(p => {
    const pReturns = (purchaseReturns || []).filter(r => (r.purchaseId && String(r.purchaseId) === String(p.id)) || (r.purchaseNo && r.purchaseNo === p.purchaseNo));
    return pReturns.length > 0;
  }) || relevantPurchases[0] || purchase;

  const isPrimary = String(primaryPurchase.id) === String(purchase.id);
  const effectiveRefundCashback = isPrimary
    ? Math.max(cashRefundAmount, Math.max(autoSupRefund, Math.max(0, rawGrossPaid - netDueableTotal)))
    : cashRefundAmount;

  return {
    total: Math.round(total),
    grossTotal: Math.round(total),
    netTotal: Math.round(netDueableTotal),
    paid: Math.round(paid),
    returnAmount: Math.round(returnAmount),
    refundCashback: Math.round(effectiveRefundCashback),
    due: Math.round(due),
    status,
    isReturned,
    isFullyReturned,
    isPartiallyReturned
  };
};

export const computeCustomerKhataBalance = (customer, sales = [], paymentLogs = [], saleReturns = []) => {
  if (!customer) return { openingBalance: 0, totalSale: 0, grossSale: 0, upfrontPaid: 0, directPaid: 0, totalPaid: 0, returnAmount: 0, netSale: 0, netBalance: 0, balance: 0, receivableDue: 0, advanceCredit: 0, status: 'Settled', ordersCount: 0 };
  const custId = customer.id ? String(customer.id) : null;
  const custName = (customer.name || '').trim().toLowerCase();

  const isGenericWalkinName = (name) => {
    if (!name) return true;
    const n = String(name).trim().toLowerCase();
    return (
      n === 'walk-in customer' ||
      n === 'walk in customer' ||
      n === 'walk-in' ||
      n === 'walkin' ||
      n === 'walk in' ||
      n === 'walk-in-customer'
    );
  };

  const isCustGenericWalkin = isGenericWalkinName(custName) || (custId && (custId.startsWith('walkin-generic') || custId === 'walkin-default'));

  const custSales = (sales || []).filter(s => {
    const sCustId = s.customerId ? String(s.customerId) : null;
    const sPartyName = (s.partyName || s.customerName || '').trim().toLowerCase();

    // 1. Explicit Customer ID match
    if (custId && sCustId && sCustId === custId) return true;

    // 2. Specific Named Customer (Regular Party or Named Walk-in like Bilal, Ali, Chaudhary)
    if (!isCustGenericWalkin) {
      if (custName && sPartyName && sPartyName === custName && !isGenericWalkinName(sPartyName)) {
        return true;
      }
      if (custId && (custId === `cust-pos-${sPartyName}` || custId === `walkin-${sPartyName}`)) {
        return true;
      }
      return false;
    }

    // 3. Generic Unnamed Walk-in Customer
    return (!sCustId || sCustId === custId) && isGenericWalkinName(sPartyName);
  });

  const totalGrossSale = custSales.reduce((acc, s) => acc + Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0)), 0);

  // Filter returns for this customer
  const custReturns = (saleReturns || []).filter(r => {
    const rCustId = r.customerId ? String(r.customerId) : null;
    const rCustName = (r.customerName || '').trim().toLowerCase();

    if (custId && rCustId && rCustId === custId) return true;

    if (!isCustGenericWalkin) {
      if (custName && rCustName && rCustName === custName && !isGenericWalkinName(rCustName)) {
        return true;
      }
      if (custId && (custId === `cust-pos-${rCustName}` || custId === `walkin-${rCustName}`)) {
        return true;
      }
      return false;
    }

    return (!rCustId || rCustId === custId) && isGenericWalkinName(rCustName);
  });

  const totalReturnAmount = custReturns.reduce((acc, r) => acc + extractMerchandiseReturnValue(r), 0);

  // Customer Payment Transactions in paymentLogs (excluding Opening Balance and Credit Notes)
  const custPayments = (paymentLogs || []).filter(p => {
    const isCustomer = p.type === 'Customer' || p.partyType === 'Customer';
    if (!isCustomer) return false;
    const pMode = String(p.mode || '').trim().toLowerCase();
    if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

    const pPartyId = p.partyId ? String(p.partyId) : null;
    const pPartyName = (p.partyName || '').trim().toLowerCase();

    if (custId && pPartyId && pPartyId === custId) return true;

    if (!isCustGenericWalkin) {
      if (custName && pPartyName && pPartyName === custName && !isGenericWalkinName(pPartyName)) {
        return true;
      }
      if (custId && (custId === `cust-pos-${pPartyName}` || custId === `walkin-${pPartyName}`)) {
        return true;
      }
      return false;
    }

    return (!pPartyId || pPartyId === custId) && isGenericWalkinName(pPartyName);
  });

  const directPaidLogs = custPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Upfront POS payments on sales that do not have a separate payment log in paymentLogs
  let unloggedUpfrontCash = 0;
  custSales.forEach(s => {
    const sTotal = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));

    // Check if this sale already has an explicit matching log in custPayments
    const hasMatchingLog = custPayments.some(p =>
      (p.saleId && String(p.saleId) === String(s.id)) ||
      (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
    );

    if (!hasMatchingLog) {
      const upfrontRes = resolveTransactionPayment(s, 'Sale');
      const upfrontPaid = upfrontRes.totalLiquid;
      if (upfrontPaid > 0) {
        unloggedUpfrontCash += Math.min(sTotal, upfrontPaid);
      }
    }
  });

  // Calculate sum of due amounts and refund liabilities across all individual sale invoices
  let totalSalesReceivableDue = 0;
  let totalSalesRefundLiability = 0;

  custSales.forEach(s => {
    const fin = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
    totalSalesReceivableDue += fin.due;
    totalSalesRefundLiability += (fin.refundCashback || 0);
  });

  // Unique liquid cash refunds actually paid out to customer
  const liquidRefundsPaid = custReturns.filter(r => {
    const res = resolveTransactionPayment(r, 'SaleReturn');
    return res.isLiquid && res.totalLiquid > 0;
  }).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  const grossPaymentsReceived = Math.round(directPaidLogs + unloggedUpfrontCash);
  const openingBalance = Math.round(Number(customer.openingBalance !== undefined ? customer.openingBalance : (customer.openingbalance !== undefined ? customer.openingbalance : 0)));
  const netSales = Math.max(0, Math.round(totalGrossSale - totalReturnAmount));
  const receivableDue = Math.round(totalSalesReceivableDue + openingBalance);
  const refundLiability = Math.max(liquidRefundsPaid, Math.round(totalSalesRefundLiability));
  const effectivePaid = Math.max(0, grossPaymentsReceived - refundLiability);
  const status = receivableDue > 0 ? 'Due' : (refundLiability > 0 ? 'Advance Credit' : 'Settled');

  return {
    openingBalance,
    totalSale: totalGrossSale,
    grossSale: totalGrossSale,
    upfrontPaid: Math.min(grossPaymentsReceived, netSales),
    directPaid: directPaidLogs,
    totalPaid: grossPaymentsReceived,
    effectivePaid,
    refundsPaid: liquidRefundsPaid,
    returnAmount: totalReturnAmount,
    netSale: netSales,
    netBalance: Math.round(rawDue),
    balance: Math.round(rawDue),
    receivableDue,
    refundLiability,
    advanceCredit: refundLiability,
    status,
    ordersCount: custSales.length
  };
};

export const computeAllCustomersFinancials = (customers = [], sales = [], paymentLogs = [], saleReturns = []) => {
  const registeredCustIds = new Set((customers || []).map(c => String(c.id)));
  const registeredCustNames = new Set((customers || []).map(c => (c.name || '').trim().toLowerCase()));

  const isGenericWalkinName = (name) => {
    if (!name) return true;
    const n = String(name).trim().toLowerCase();
    return (
      n === 'walk-in customer' ||
      n === 'walk in customer' ||
      n === 'walk-in' ||
      n === 'walkin' ||
      n === 'walk in' ||
      n === 'walk-in-customer'
    );
  };

  // 1. Saved Customer Profiles (Regular and Walk-in Customer Accounts)
  const registeredList = (customers || []).map(cust => {
    const fin = computeCustomerKhataBalance(cust, sales, paymentLogs, saleReturns);
    const rawType = cust.customerType || cust.type || 'Regular Customer';
    const isWalkin = rawType.toLowerCase().includes('walk') || isGenericWalkinName(cust.name);
    return {
      ...cust,
      customerType: isWalkin ? 'Walk-in Customer' : 'Regular Customer',
      isWalkin,
      isRegistered: true,
      ...fin
    };
  });

  // 2. POS / Counter Customer Parties (Walk-in Customers from Sales not saved as profiles)
  const unlistedSalesMap = new Map();
  (sales || []).forEach(s => {
    const sCustId = s.customerId ? String(s.customerId) : null;
    const sName = (s.partyName || s.customerName || '').trim().toLowerCase();
    const isRegistered = (sCustId && registeredCustIds.has(sCustId)) ||
      (sName && registeredCustNames.has(sName));

    if (!isRegistered) {
      const rawName = (s.partyName || s.customerName || 'Walk-in Customer').trim();
      const key = rawName.toLowerCase();
      if (!unlistedSalesMap.has(key)) {
        unlistedSalesMap.set(key, { name: rawName, sales: [] });
      }
      unlistedSalesMap.get(key).sales.push(s);
    }
  });

  const unlistedList = [];
  unlistedSalesMap.forEach((val, key) => {
    const isGeneric = isGenericWalkinName(val.name);
    const fin = computeCustomerKhataBalance({ id: `cust-pos-${key}`, name: val.name, customerType: 'Walk-in Customer' }, sales, paymentLogs, saleReturns);
    unlistedList.push({
      id: `cust-pos-${key}`,
      name: val.name,
      businessName: isGeneric ? 'Walk-in Counter' : 'Walk-in Customer',
      phone: 'Counter Sale',
      city: 'Local Mandi',
      customerType: 'Walk-in Customer',
      isWalkin: true,
      isRegistered: false,
      ...fin
    });
  });

  const allCustomers = [...registeredList, ...unlistedList];
  const walkinList = [
    ...registeredList.filter(c => (c.customerType || '').toLowerCase().includes('walk')),
    ...unlistedList
  ];
  const regularList = registeredList.filter(c => !(c.customerType || '').toLowerCase().includes('walk'));

  const totalGrossSales = Math.round(allCustomers.reduce((sum, c) => sum + Number(c.totalSale || 0), 0));
  const totalReturns = Math.round(allCustomers.reduce((sum, c) => sum + Number(c.returnAmount || 0), 0));
  const totalNetSales = Math.round(allCustomers.reduce((sum, c) => sum + Number(c.netSale || 0), 0));
  const totalPaymentsReceived = Math.round(allCustomers.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0));
  const totalReceivables = Math.round(allCustomers.reduce((sum, c) => sum + Number(c.receivableDue || 0), 0));
  const totalCustomerCredits = Math.round(allCustomers.reduce((sum, c) => sum + Number(c.advanceCredit || 0), 0));
  const settledCount = allCustomers.filter(c => c.status === 'Settled' || c.netBalance === 0).length;

  return {
    allCustomers,
    registeredList: regularList,
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
      avgCost: Math.round(initialRate),
      stockValue: Math.round(currentStock * initialRate),
      sellingRate: Math.round(sellingRate),
      purchaseRate: Math.round(initialRate),
      latestPurchaseRate: Math.round(initialRate),
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
    avgCost: isNaN(averageCost) ? 0 : Math.round(averageCost),
    stockValue: isNaN(totalStockValue) ? 0 : Math.round(totalStockValue),
    sellingRate: isNaN(sellingRate) ? 0 : Math.round(sellingRate),
    purchaseRate: isNaN(averageCost) ? 0 : Math.round(averageCost),
    latestPurchaseRate: isNaN(latestPurchaseRate) ? (isNaN(initialRate) ? 0 : Math.round(initialRate)) : Math.round(latestPurchaseRate),
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
  if (!supplier) return { openingBalance: 0, totalPurchase: 0, grossPurchase: 0, upfrontPaid: 0, directPaid: 0, totalPaid: 0, netPaid: 0, returnAmount: 0, netPurchase: 0, netBalance: 0, balance: 0, payableDue: 0, refundDue: 0, advanceCredit: 0, automaticSupplierRefund: 0, refundCashback: 0, status: 'Settled', ordersCount: 0 };
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

  const totalReturnAmount = supReturns.reduce((acc, r) => acc + extractMerchandiseReturnValue(r), 0);

  // Supplier Payment Transactions recorded in paymentLogs (excluding Opening Balance and Non-payments)
  const supPayments = (paymentLogs || []).filter(p => {
    const isSupplier = p.type === 'Supplier' || p.partyType === 'Supplier';
    if (!isSupplier) return false;
    const pMode = String(p.mode || '').trim().toLowerCase();
    if (
      pMode === 'opening balance' ||
      pMode === 'credit note' ||
      pMode === 'debit note' ||
      pMode === 'purchase return' ||
      pMode === 'supplier khata' ||
      pMode.includes('khata') ||
      pMode === 'purchase' ||
      pMode === 'bill'
    ) return false;

    const pPartyId = p.partyId ? String(p.partyId) : null;
    const pPartyName = (p.partyName || '').trim().toLowerCase();
    return (supId && pPartyId && pPartyId === supId) || (supName && pPartyName === supName);
  });

  const directPaidLogs = supPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Liquid cash/bank refunds explicitly recorded on purchase returns
  const explicitLiquidRefunds = supReturns.filter(r => {
    const res = resolveTransactionPayment(r, 'PurchaseReturn');
    return res.isLiquid && res.totalLiquid > 0;
  }).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  // Calculate sum of due amounts and refund amounts across all individual purchase invoices
  let totalPurchasesPayableDue = 0;
  let totalPurchasesRefundCashback = 0;

  supPurchases.forEach(p => {
    const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
    totalPurchasesPayableDue += fin.due;
    totalPurchasesRefundCashback += (fin.refundCashback || 0);
  });

  // Upfront cash paid on purchases that do not have a separate matching log in paymentLogs
  let unloggedUpfrontCash = 0;
  supPurchases.forEach(p => {
    const isKhata = (p.paymentMode === 'Supplier Khata' || p.paymentmode === 'Supplier Khata') || (Number(p.paidAmount || p.paidamount || 0) === 0 && p.status !== 'Paid' && p.paymentStatus !== 'Paid');
    if (isKhata) return;

    const hasMatchingLog = supPayments.some(pl =>
      (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
      (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
    );

    if (!hasMatchingLog) {
      const pTotal = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const res = resolveTransactionPayment(p, 'Purchase');
      const isMarkedPaid = p.status === 'Paid' || p.paymentStatus === 'Paid';
      const upfrontPaid = isMarkedPaid ? pTotal : (res.totalLiquid > 0 ? res.totalLiquid : Number(p.paidAmount !== undefined ? p.paidAmount : (p.cashPaid || 0)));
      if (upfrontPaid > 0) {
        unloggedUpfrontCash += Math.min(pTotal, upfrontPaid);
      }
    }
  });

  const grossPaymentsMade = directPaidLogs + unloggedUpfrontCash;
  const openingBalance = Number(supplier.openingBalance !== undefined ? supplier.openingBalance : (supplier.openingbalance !== undefined ? supplier.openingbalance : 0));
  const netPurchases = Math.max(0, Math.round(totalGrossPurchase - totalReturnAmount));
  const payableDue = Math.round(totalPurchasesPayableDue + openingBalance);

  const automaticSupplierRefund = Math.max(explicitLiquidRefunds, totalPurchasesRefundCashback);
  const netPaid = Math.max(0, Math.round(grossPaymentsMade - automaticSupplierRefund));

  const status = payableDue > 0 ? 'Payable' : 'Settled';

  return {
    openingBalance,
    totalPurchase: totalGrossPurchase,
    grossPurchase: totalGrossPurchase,
    upfrontPaid: Math.min(grossPaymentsMade, netPurchases),
    directPaid: directPaidLogs,
    totalPaid: grossPaymentsMade,
    netPaid,
    refundsPaid: explicitLiquidRefunds,
    refundCashback: automaticSupplierRefund,
    returnAmount: totalReturnAmount,
    netPurchase: netPurchases,
    netBalance: payableDue,
    balance: payableDue,
    payableDue,
    refundDue: 0,
    advanceCredit: 0,
    automaticSupplierRefund,
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

  const totalGrossPurchases = Math.round(allSuppliers.reduce((sum, s) => sum + Number(s.totalPurchase || 0), 0));
  const totalReturns = Math.round(allSuppliers.reduce((sum, s) => sum + Number(s.returnAmount || 0), 0));
  const totalNetPurchases = Math.round(allSuppliers.reduce((sum, s) => sum + Number(s.netPurchase || 0), 0));
  const totalPaymentsPaid = Math.round(allSuppliers.reduce((sum, s) => sum + Number(s.totalPaid || 0), 0));
  const totalPayables = Math.round(allSuppliers.reduce((sum, s) => sum + Number(s.payableDue || 0), 0));
  const totalSupplierRefundsReceived = Math.round(allSuppliers.reduce((sum, s) => sum + Number(s.automaticSupplierRefund || s.refundCashback || 0), 0));
  const totalSupplierRefundDue = 0;
  const totalSupplierAdvances = 0;
  const settledCount = allSuppliers.filter(s => s.status === 'Settled' || s.payableDue === 0).length;

  return {
    allSuppliers,
    totalGrossPurchases,
    totalReturns,
    totalNetPurchases,
    totalPaymentsPaid,
    totalPayables,
    totalSupplierRefundsReceived,
    totalSupplierRefundDue,
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
      status: isSupplier ? 'Payable' : 'Due',
      notes: 'Opening balance registered on account creation'
    });
  }

  if (!isSupplier) {
    const isGenericWalkinName = (name) => {
      if (!name) return true;
      const n = String(name).trim().toLowerCase();
      return (
        n === 'walk-in customer' ||
        n === 'walk in customer' ||
        n === 'walk-in' ||
        n === 'walkin' ||
        n === 'walk in' ||
        n === 'walk-in-customer'
      );
    };

    const isPartyGenericWalkin = isGenericWalkinName(partyName) || (partyId && (partyId.startsWith('walkin-generic') || partyId === 'walkin-default'));

    // 1. Filter Customer Sales
    const partySales = (sales || []).filter(s => {
      const sCustId = s.customerId ? String(s.customerId) : null;
      const sCustName = (s.customerName || s.partyName || '').trim().toLowerCase();
      if (partyId && sCustId && sCustId === partyId) return true;
      if (!isPartyGenericWalkin) {
        if (partyName && sCustName && sCustName === partyName && !isGenericWalkinName(sCustName)) {
          return true;
        }
        if (partyId && (partyId === `cust-pos-${sCustName}` || partyId === `walkin-${sCustName}`)) {
          return true;
        }
        return false;
      }
      return (!sCustId || sCustId === partyId) && isGenericWalkinName(sCustName);
    });

    // 2. Filter Customer Payments (excluding Opening Balance)
    const partyPayments = (paymentLogs || []).filter(p => {
      const isCust = p.type === 'Customer' || p.partyType === 'Customer';
      if (!isCust) return false;
      const pMode = String(p.mode || '').trim().toLowerCase();
      if (pMode === 'opening balance' || pMode === 'credit note' || pMode === 'debit note') return false;

      const pPartyId = p.partyId ? String(p.partyId) : null;
      const pPartyName = (p.partyName || '').trim().toLowerCase();
      if (partyId && pPartyId && pPartyId === partyId) return true;
      if (!isPartyGenericWalkin) {
        if (partyName && pPartyName && pPartyName === partyName && !isGenericWalkinName(pPartyName)) {
          return true;
        }
        if (partyId && (partyId === `cust-pos-${pPartyName}` || partyId === `walkin-${pPartyName}`)) {
          return true;
        }
        return false;
      }
      return (!pPartyId || pPartyId === partyId) && isGenericWalkinName(pPartyName);
    });

    // 3. Filter Customer Returns
    const partyReturns = (saleReturns || []).filter(r => {
      const rCustId = r.customerId ? String(r.customerId) : null;
      const rCustName = (r.customerName || '').trim().toLowerCase();
      if (partyId && rCustId && rCustId === partyId) return true;
      if (!isPartyGenericWalkin) {
        if (partyName && rCustName && rCustName === partyName && !isGenericWalkinName(rCustName)) {
          return true;
        }
        if (partyId && (partyId === `cust-pos-${rCustName}` || partyId === `walkin-${rCustName}`)) {
          return true;
        }
        return false;
      }
      return (!rCustId || rCustId === partyId) && isGenericWalkinName(rCustName);
    });

    // Track which sales are directly completely paid upfront so we don't double count their payment log
    const directCompletePaidSaleIds = new Set();
    const directCompletePaidInvoiceNos = new Set();

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
        ? s.cart.map(i => `${i.name || 'Commodity'} (${i.qty || 1} ${resolveProductMasterUnit(i, i.unitName || i.unit || 'KG')})`).join(', ')
        : (typeof s.items === 'string' ? s.items : 'Commodity Sale');

      const descText = sReturn > 0
        ? `Invoice #${s.invoiceNo || s.id}: ${sItems}`
        : `Invoice #${s.invoiceNo || s.id}: ${sItems}`;

      const historyNote = sReturn > 0
        ? `Original Sale: Rs. ${sGross.toLocaleString()} • Returned: Rs. ${sReturn.toLocaleString()} • Net Sale: Rs. ${sNet.toLocaleString()} | Paid: Rs. ${sPaid.toLocaleString()}, Due: Rs. ${sDue.toLocaleString()} (${sStatus})`
        : (s.saleNote || s.note || '');

      const methodLabel = s.paymentMethod || s.paymentMode || 'Cash';

      // Sale invoice entry (Debit)
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
        sales: sGross,
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
        paymentMethod: methodLabel,
        paymentAccount: methodLabel,
        status: sStatus,
        notes: historyNote
      });

      // Upfront cash paid on POS counter if no matching payment log exists
      const hasSpecificInvoiceLog = partyPayments.some(p =>
        (p.saleId && String(p.saleId) === String(s.id)) ||
        (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
      );

      const upfrontRes = resolveTransactionPayment(s, 'Sale');
      const upfrontPaid = upfrontRes.totalLiquid;

      if (upfrontPaid > 0 && !hasSpecificInvoiceLog) {
        entries.push({
          id: `pay-direct-${s.id || idx}`,
          timestamp: ts + 1,
          eventPriority: 2,
          seq: Number(s.id) || (idx + 1),
          rawDate: s.date,
          date: s.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: `POS-PAY-${s.invoiceNo || s.id}`,
          txType: 'Payments',
          desc: `POS Payment Received against Invoice #${s.invoiceNo || s.id}`,
          sales: 0,
          payment: upfrontPaid,
          debit: 0,
          credit: upfrontPaid,
          paymentMethod: methodLabel,
          paymentAccount: methodLabel,
          status: sDue === 0 ? 'Settled' : 'Partial',
          notes: s.paymentMode || s.paymentMethod || 'POS Upfront Payment'
        });
      }
    });

    // Process Returns (Credit)
    partyReturns.forEach((r, idx) => {
      const ts = parseNormalizedTimestamp(r.date, r.created_at);
      const merchandiseVal = extractMerchandiseReturnValue(r);
      const cashRefundAmt = Number(r.refundAmount !== undefined ? r.refundAmount : 0);
      const res = resolveTransactionPayment(r, 'SaleReturn');
      const isCashRefunded = res.isLiquid && res.totalLiquid > 0;

      const matchingSale = partySales.find(s => (r.saleId && String(s.id) === String(r.saleId)) || (r.invoiceNo && s.invoiceNo && r.invoiceNo === s.invoiceNo));
      const origSaleGross = matchingSale ? Number(matchingSale.amount || matchingSale.grandTotal || 0) : 0;
      const netAfterReturn = origSaleGross > 0 ? Math.max(0, origSaleGross - merchandiseVal) : 0;

      const descText = matchingSale
        ? `Sale Return #${r.returnNo || 'RET'} against Invoice ${matchingSale.invoiceNo}: ${r.reason || 'Goods Return'}`
        : `Sale Return #${r.returnNo || 'RET'}: ${r.reason || 'Produce Return'}`;

      const historyNote = origSaleGross > 0
        ? `Original Invoice ${matchingSale?.invoiceNo || ''} (Rs. ${origSaleGross.toLocaleString()}) adjusted by return of Rs. ${merchandiseVal.toLocaleString()} → Net Invoice Rs. ${netAfterReturn.toLocaleString()}.`
        : `Return of Rs. ${merchandiseVal.toLocaleString()} adjusted against customer account.`;

      // 1. Goods return credits customer account for full merchandise value
      entries.push({
        id: `sret-${r.id || idx}`,
        timestamp: ts,
        eventPriority: 3,
        seq: Number(r.id) || (idx + 1),
        rawDate: r.date,
        date: r.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: r.returnNo || `SR-${r.id || idx}`,
        matchingInvoiceNo: matchingSale?.invoiceNo || r.invoiceNo || '',
        originalGross: origSaleGross,
        returnAmount: merchandiseVal,
        autoRefundAmount: isCashRefunded ? cashRefundAmt : 0,
        isAutoRefund: isCashRefunded && cashRefundAmt > 0,
        netTotal: netAfterReturn,
        refundMode: r.refundMode || 'Khata Credit',
        txType: 'Returns',
        desc: descText,
        sales: 0,
        payment: 0,
        debit: 0,
        credit: merchandiseVal,
        paymentMethod: r.refundMode || 'Sale Return',
        paymentAccount: 'Customer Khata',
        status: 'Settled',
        notes: historyNote
      });

      // 2. If liquid cash/bank was refunded to customer, record separate Customer Refund debit
      if (isCashRefunded && cashRefundAmt > 0) {
        entries.push({
          id: `sret-cash-${r.id || idx}`,
          timestamp: ts,
          eventPriority: 4,
          seq: Number(r.id) || (idx + 1),
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: `REF-${r.returnNo || r.id || idx}`,
          matchingInvoiceNo: matchingSale?.invoiceNo || r.invoiceNo || '',
          originalGross: 0,
          returnAmount: 0,
          autoRefundAmount: cashRefundAmt,
          isAutoRefund: true,
          txType: 'Customer Refund',
          desc: `⚡ Auto Payment Refunded (${res.refundMode || 'Cash'}) for Return #${r.returnNo || r.id || idx}`,
          sales: 0,
          payment: 0,
          debit: cashRefundAmt,
          credit: 0,
          paymentMethod: res.refundMode || 'Cash Refund',
          paymentAccount: res.refundMode || 'Cash',
          status: 'Settled',
          notes: `Auto cash refund returned back to customer for return #${r.returnNo || r.id}`
        });
      }
    });

    // Process Payment Logs (Credit)
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
        methodLabel = rawPMode || 'Cash';
      }

      entries.push({
        id: `pay-${p.id || idx}`,
        timestamp: ts,
        eventPriority: 2,
        seq: Number(p.id) || (idx + 1),
        rawDate: p.date,
        date: p.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: p.ref || `PAY-${p.id || idx}`,
        txType: 'Payments',
        desc: p.note || (p.saleId ? `Payment for Invoice` : `Customer Payment Received (${methodLabel})`),
        sales: 0,
        payment: pAmt,
        debit: 0,
        credit: pAmt,
        paymentMethod: methodLabel,
        paymentAccount: methodLabel,
        status: 'Settled',
        notes: p.note || 'Payment Received'
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
      if (
        pMode === 'opening balance' ||
        pMode === 'credit note' ||
        pMode === 'debit note' ||
        pMode === 'purchase return' ||
        pMode === 'supplier khata' ||
        pMode.includes('khata') ||
        pMode === 'purchase' ||
        pMode === 'bill'
      ) return false;

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
        ? p.items.map(i => `${i.name || 'Produce'} (${i.qty || i.enteredQty || 1} ${resolveProductMasterUnit(i, i.unitName || i.unit || 'KG')})`).join(', ')
        : (typeof p.cart === 'string' ? p.cart : 'Commodity Procurement');

      const descText = pReturn > 0
        ? `Bill #${p.purchaseNo || p.id}: ${pItems}`
        : `Bill #${p.purchaseNo || p.id}: ${pItems}`;

      const historyNote = pReturn > 0
        ? `Original Bill: Rs. ${pGross.toLocaleString()} • Returned: Rs. ${pReturn.toLocaleString()} • Net Bill: Rs. ${pNet.toLocaleString()} | Paid: Rs. ${pPaid.toLocaleString()}, Payable: Rs. ${pDue.toLocaleString()} (${pStatus})`
        : (p.note || '');

      const methodLabel = p.paymentMethod || p.paymentMode || 'Cash';

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
        sales: pGross,
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
        paymentMethod: p.paymentMethod || 'Supplier Khata',
        paymentAccount: p.paymentMethod || 'Supplier Khata',
        status: pStatus,
        notes: historyNote
      });

      // Upfront payment on purchase if no matching payment log exists
      const hasSpecificPurLog = partyPayments.some(pl =>
        (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
        (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
      );

      const upfrontRes = resolveTransactionPayment(p, 'Purchase');
      const upfrontPaid = upfrontRes.totalLiquid;

      if (upfrontPaid > 0 && !hasSpecificPurLog) {
        entries.push({
          id: `pay-direct-sup-${p.id || idx}`,
          timestamp: ts + 1,
          eventPriority: 2,
          seq: Number(p.id) || (idx + 1),
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: `PUR-PAY-${p.purchaseNo || p.id}`,
          txType: 'Payments',
          desc: `Upfront Payment Made for Bill #${p.purchaseNo || p.id}`,
          sales: 0,
          payment: upfrontPaid,
          debit: 0,
          credit: upfrontPaid,
          paymentMethod: p.paymentMethod || 'Cash',
          paymentAccount: p.paymentMethod || 'Cash',
          status: pDue === 0 ? 'Settled' : 'Partial',
          notes: p.paymentMethod || 'Upfront Payment'
        });
      }
    });

    // Process Purchase Returns (Credit)
    partyReturns.forEach((r, idx) => {
      const ts = parseNormalizedTimestamp(r.date, r.created_at);
      const merchandiseVal = extractMerchandiseReturnValue(r);
      const cashRefundAmt = Number(r.refundAmount !== undefined ? r.refundAmount : 0);
      const res = resolveTransactionPayment(r, 'PurchaseReturn');
      const isCashReceived = res.isLiquid && res.totalLiquid > 0;

      const matchingPurchase = partyPurchases.find(p => (r.purchaseId && String(p.id) === String(r.purchaseId)) || (r.purchaseNo && p.purchaseNo && r.purchaseNo === p.purchaseNo));
      const origPurchaseGross = matchingPurchase ? Number(matchingPurchase.amount || matchingPurchase.grandTotal || 0) : 0;
      const netAfterReturn = origPurchaseGross > 0 ? Math.max(0, origPurchaseGross - merchandiseVal) : 0;

      const descText = matchingPurchase
        ? `Purchase Return #${r.returnNo || 'PR'} against Bill ${matchingPurchase.purchaseNo}: ${r.reason || 'Goods Return'}`
        : `Purchase Return #${r.returnNo || 'PR'}: ${r.reason || 'Commodity Return'}`;

      const historyNote = origPurchaseGross > 0
        ? `Original Bill ${matchingPurchase?.purchaseNo || ''} (Rs. ${origPurchaseGross.toLocaleString()}) adjusted by return of Rs. ${merchandiseVal.toLocaleString()} → Net Bill Rs. ${netAfterReturn.toLocaleString()}.`
        : `Return of Rs. ${merchandiseVal.toLocaleString()} adjusted against vendor account.`;

      // 1. Goods return credits supplier account for full merchandise value
      entries.push({
        id: `pret-${r.id || idx}`,
        timestamp: ts,
        eventPriority: 3,
        seq: Number(r.id) || (idx + 1),
        rawDate: r.date,
        date: r.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: r.returnNo || `PR-${r.id || idx}`,
        matchingInvoiceNo: matchingPurchase?.purchaseNo || r.purchaseNo || '',
        originalGross: origPurchaseGross,
        returnAmount: merchandiseVal,
        autoRefundAmount: isCashReceived ? cashRefundAmt : 0,
        isAutoRefund: isCashReceived && cashRefundAmt > 0,
        netTotal: netAfterReturn,
        refundMode: r.refundMode || 'Khata Credit',
        txType: 'Returns',
        desc: descText,
        sales: 0,
        payment: 0,
        debit: 0,
        credit: merchandiseVal,
        paymentMethod: r.refundMode || 'Purchase Return',
        paymentAccount: 'Supplier Khata',
        status: 'Settled',
        notes: historyNote
      });

      // 2. If liquid cash/bank was collected from supplier, record separate Refund Received debit
      if (isCashReceived && cashRefundAmt > 0) {
        entries.push({
          id: `pret-cash-${r.id || idx}`,
          timestamp: ts,
          eventPriority: 4,
          seq: Number(r.id) || (idx + 1),
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId,
          partyName: party.name,
          ref: `REF-${r.returnNo || r.id || idx}`,
          matchingInvoiceNo: matchingPurchase?.purchaseNo || r.purchaseNo || '',
          originalGross: 0,
          returnAmount: 0,
          autoRefundAmount: cashRefundAmt,
          isAutoRefund: true,
          txType: 'Supplier Refund',
          desc: `⚡ Auto Payment Back to System (${res.refundMode || 'Cash'}) for Return #${r.returnNo || r.id || idx}`,
          sales: 0,
          payment: 0,
          debit: cashRefundAmt,
          credit: 0,
          paymentMethod: res.refundMode || 'Cash',
          paymentAccount: res.refundMode || 'Cash',
          status: 'Settled',
          notes: `Auto payment returned back to system cash/bank from supplier for return #${r.returnNo || r.id}`
        });
      }
    });

    // Process Supplier Payments (Credit)
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
        methodLabel = rawPMode || 'Cash';
      }

      entries.push({
        id: `pay-sup-${p.id || idx}`,
        timestamp: ts,
        eventPriority: 2,
        seq: Number(p.id) || (idx + 1),
        rawDate: p.date,
        date: p.date || 'N/A',
        partyId,
        partyName: party.name,
        ref: p.ref || `PAY-${p.id || idx}`,
        txType: 'Payments',
        desc: p.note || (p.purchaseId ? `Bill Payment (${methodLabel})` : `Supplier Payment Made (${methodLabel})`),
        sales: 0,
        payment: pAmt,
        debit: 0,
        credit: pAmt,
        paymentMethod: methodLabel,
        paymentAccount: methodLabel,
        status: 'Settled',
        notes: p.note || 'Payment Out'
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
        : (isSupplier ? 'Refund Due' : 'Advance');

    return {
      ...entry,
      stepIndex: index + 1,
      runningBalance: Math.abs(runningBalance),
      rawRunningBalance: runningBalance,
      balanceState: entryStatus,
      status: entryStatus
    };
  });

  const closingBalance = Math.abs(runningBalance);
  const receivableDue = !isSupplier ? (runningBalance > 0 ? runningBalance : 0) : 0;
  const payableDue = isSupplier ? (runningBalance > 0 ? runningBalance : 0) : 0;
  const supplierRefundDue = isSupplier ? (runningBalance < 0 ? Math.abs(runningBalance) : 0) : 0;
  const customerAdvance = !isSupplier ? (runningBalance < 0 ? Math.abs(runningBalance) : 0) : 0;
  const advanceCredit = isSupplier ? supplierRefundDue : customerAdvance;
  const status = runningBalance === 0
    ? 'Settled'
    : (runningBalance > 0 ? (isSupplier ? 'Payable' : 'Due') : (isSupplier ? 'Refund Due' : 'Advance'));

  // 3. Reverse for Newest-First display while keeping verified chronological running balance
  const displayEntries = [...chronologicalEntries].reverse();

  return {
    party,
    openingBalance: opBal,
    totalDebit,
    totalCredit,
    netBalance: payableDue > 0 ? payableDue : (supplierRefundDue > 0 ? -supplierRefundDue : closingBalance),
    closingBalance,
    receivableDue,
    payableDue,
    supplierRefundDue,
    refundDue: supplierRefundDue,
    advanceCredit,
    status,
    chronologicalEntries,
    displayEntries
  };
};

const globalProductsUnitMap = new Map();

export const registerProductUnits = (prods = []) => {
  if (!Array.isArray(prods)) return;
  prods.forEach(p => {
    if (!p) return;
    const u = p.unit || p.baseUnit || 'KG';
    if (p.id) globalProductsUnitMap.set(String(p.id).toLowerCase(), u);
    if (p.name) globalProductsUnitMap.set(String(p.name).trim().toLowerCase(), u);
    if (p.code) globalProductsUnitMap.set(String(p.code).trim().toLowerCase(), u);
  });
};

export const resolveProductMasterUnit = (itemOrProd, fallback = 'KG') => {
  if (!itemOrProd) return fallback;
  const idKey = itemOrProd.productId || itemOrProd.id;
  if (idKey && globalProductsUnitMap.has(String(idKey).toLowerCase())) {
    return globalProductsUnitMap.get(String(idKey).toLowerCase());
  }
  const nameKey = itemOrProd.name || itemOrProd.productName;
  if (nameKey && globalProductsUnitMap.has(String(nameKey).trim().toLowerCase())) {
    return globalProductsUnitMap.get(String(nameKey).trim().toLowerCase());
  }
  return itemOrProd.unit || itemOrProd.unitName || itemOrProd.baseUnit || fallback;
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
  const rawItems = Array.isArray(p.items) ? p.items : (Array.isArray(p.cart) ? p.cart : []);
  const items = rawItems.map(it => {
    const u = resolveProductMasterUnit(it, it.unit || it.unitName || 'KG');
    return {
      ...it,
      unit: u,
      unitName: u,
      enteredUnit: u
    };
  });
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
    cart: items
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
  const rawCart = Array.isArray(s.cart) ? s.cart : (Array.isArray(s.items) ? s.items : []);
  const cart = rawCart.map(it => {
    const u = resolveProductMasterUnit(it, it.unit || it.unitName || 'KG');
    return {
      ...it,
      unit: u,
      unitName: u
    };
  });
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
    items: cart
  };
};

const normalizeProduct = (p) => {
  if (!p) return null;
  const purchasePrice = Number(p.purchasePrice !== undefined ? p.purchasePrice : (p.purchaseprice !== undefined ? p.purchaseprice : 0));
  const sellingPrice = Number(p.sellingPrice !== undefined ? p.sellingPrice : (p.sellingprice !== undefined ? p.sellingprice : 0));
  const stockQty = Number(p.stockQty !== undefined ? p.stockQty : (p.stockqty !== undefined ? p.stockqty : 0));
  const minStock = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : (p.minStockThreshold !== undefined ? p.minStockThreshold : 10)));
  const unit = p.unit || p.baseUnit || 'KG';

  registerProductUnits([p]);

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
  const rawItems = Array.isArray(r.items) ? r.items : (Array.isArray(r.itemsJson) ? r.itemsJson : []);
  const items = rawItems.map(it => {
    const u = resolveProductMasterUnit(it, it.unit || it.unitName || 'KG');
    return {
      ...it,
      unit: u,
      unitName: u
    };
  });
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
  const rawItems = Array.isArray(r.items) ? r.items : (Array.isArray(r.itemsJson) ? r.itemsJson : []);
  const items = rawItems.map(it => {
    const u = resolveProductMasterUnit(it, it.unit || it.unitName || 'KG');
    return {
      ...it,
      unit: u,
      unitName: u
    };
  });
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
      if (prodRes.success) {
        registerProductUnits(prodRes.products || []);
        setProducts(sortDesc((prodRes.products || []).map(normalizeProduct)));
      }
      if (custRes.success) setCustomers(sortDesc((custRes.customers || []).map(normalizeCustomer)));
      if (supRes.success) setSuppliers(sortDesc((supRes.suppliers || []).map(normalizeSupplier)));
      if (saleRes.success) setSales(sortDesc((saleRes.sales || []).map(normalizeSale)));
      if (purRes.success) setPurchases(sortDesc((purRes.purchases || []).map(normalizePurchase)));
      if (ledgerRes.success) {
        const cleanLogs = (ledgerRes.entries || []).filter(e => {
          const m = String(e.mode || '').trim().toLowerCase();
          return m !== 'supplier khata' && m !== 'purchase' && m !== 'bill' && !m.includes('khata credit');
        });
        setPaymentLogs(sortDesc(cleanLogs.map(normalizePaymentLog)));
      }
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

  // 3. Delete Category
  const deleteCategory = async (id) => {
    try {
      const res = await authFetch(`/api/products/categories/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setCategories(prev => prev.filter(c => c.id !== id && String(c.id) !== String(id)));
        return true;
      }
      throw new Error(res.message || 'Failed to delete category');
    } catch (err) {
      console.error('deleteCategory error:', err);
      throw err;
    }
  };

  // 4. Add Product
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
    const amtNum = Math.round(Number(amount));
    if (!amtNum || amtNum <= 0) {
      throw new Error('Valid payment amount greater than zero is required');
    }

    if (partyType === 'Customer') {
      const cust = (customers || []).find(c => (partyId && String(c.id) === String(partyId)) || (partyName && c.name && c.name.trim().toLowerCase() === partyName.trim().toLowerCase()));
      let maxCustomerDue = 0;
      if (cust) {
        const fin = computeCustomerKhataBalance(cust, sales, paymentLogs, saleReturns);
        maxCustomerDue = Math.max(0, fin.receivableDue !== undefined ? fin.receivableDue : (Number(cust.balance) || 0));
      } else if (saleId) {
        const targetSale = (sales || []).find(s => String(s.id) === String(saleId));
        if (targetSale) {
          const fin = computeSaleFinancials(targetSale, saleReturns, paymentLogs);
          maxCustomerDue = Math.max(0, fin.due || 0);
        }
      }

      if (maxCustomerDue > 0 && amtNum > maxCustomerDue) {
        throw new Error(`Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the customer's outstanding balance of Rs. ${maxCustomerDue.toLocaleString()}.`);
      }
    } else {
      const sup = (suppliers || []).find(s => (partyId && String(s.id) === String(partyId)) || (partyName && s.name && s.name.trim().toLowerCase() === partyName.trim().toLowerCase()));
      const targetSupplier = sup || { id: partyId, name: partyName };

      let maxSupplierPayable = 0;
      if (purchaseId) {
        const targetPur = (purchases || []).find(p => String(p.id) === String(purchaseId));
        if (targetPur) {
          const fin = computePurchaseFinancials(targetPur, purchaseReturns, paymentLogs);
          maxSupplierPayable = Math.max(0, fin.due || 0);
        }
      }

      if (maxSupplierPayable <= 0 && targetSupplier) {
        const fin = computeSupplierKhataBalance(targetSupplier, purchases, paymentLogs, purchaseReturns);
        maxSupplierPayable = Math.max(0, fin.payableDue !== undefined ? fin.payableDue : (Number(targetSupplier.balance) || 0));
      }

      if (maxSupplierPayable <= 0 && sup) {
        maxSupplierPayable = Math.max(0, Number(sup.balance) || 0);
      }

      if (maxSupplierPayable > 0 && amtNum > maxSupplierPayable) {
        throw new Error(`Payment amount (Rs. ${amtNum.toLocaleString()}) cannot exceed the supplier's outstanding payable of Rs. ${maxSupplierPayable.toLocaleString()}.`);
      }

      // SUPPLIER PAYMENT & LIQUID CASH RULE: Check available liquid balance before processing payment
      const currentLiquid = computeLiquidBalances(sales, purchases, saleReturns, purchaseReturns, paymentLogs, expenses);
      const modeLower = String(paymentMode || 'Cash').trim().toLowerCase();
      let availableLiquid = currentLiquid.cashInHand;
      let accountLabel = 'Cash in Hand';

      if (modeLower.includes('bank') || modeLower.includes('transfer') || modeLower.includes('online') || modeLower.includes('cheque')) {
        availableLiquid = currentLiquid.bankBalance;
        accountLabel = 'Bank Account';
      } else if (modeLower.includes('card') || modeLower.includes('pos') || modeLower.includes('machine')) {
        availableLiquid = currentLiquid.cardBalance;
        accountLabel = 'Card Account';
      }

      if (amtNum > availableLiquid) {
        throw new Error(`Insufficient Balance — Available: Rs. ${availableLiquid.toLocaleString()}`);
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
      unit: resolveProductMasterUnit(purchaseData, purchaseData.unit || purchaseData.unitName || 'KG'),
      unitName: resolveProductMasterUnit(purchaseData, purchaseData.unitName || purchaseData.unit || 'KG'),
      qty: Number(purchaseData.qtyKg || purchaseData.qty) || 1,
      rate: Number(purchaseData.rate) || 0,
      total: (Number(purchaseData.qtyKg || purchaseData.qty) || 1) * (Number(purchaseData.rate) || 0)
    }] : []);

    const items = rawItems.map(item => {
      const u = resolveProductMasterUnit(item, item.unit || item.unitName || item.enteredUnit || 'KG');
      return {
        productId: item.productId || item.id,
        name: item.name || item.productName || 'Product',
        productName: item.productName || item.name || 'Product',
        unit: u,
        unitName: u,
        enteredUnit: u,
        qty: Number(item.qty || item.enteredQty) || 1,
        enteredQty: Number(item.qty || item.enteredQty) || 1,
        rate: Number(item.rate || item.price || item.ratePerEnteredUnit) || 0,
        ratePerEnteredUnit: Number(item.rate || item.price || item.ratePerEnteredUnit) || 0,
        total: Number(item.total || item.totalAmount) || ((Number(item.qty || 1)) * (Number(item.rate || 0))),
        totalAmount: Number(item.total || item.totalAmount) || ((Number(item.qty || 1)) * (Number(item.rate || 0)))
      };
    });

    const payload = {
      supplierName: purchaseData.supplierName || purchaseData.supplier || '',
      supplierId: purchaseData.supplierId || null,
      paidAmount: Number(purchaseData.paidAmount) || 0,
      paymentMode: purchaseData.paymentMode || purchaseData.paymentMethod || 'Supplier Khata',
      paymentStatus: purchaseData.paymentStatus,
      notes: purchaseData.notes || '',
      items
    };

    // SUPPLIER PAYMENT & LIQUID CASH RULE: Check available liquid balance before processing upfront payment
    if (payload.paidAmount > 0) {
      const currentLiquid = computeLiquidBalances(sales, purchases, saleReturns, purchaseReturns, paymentLogs, expenses);
      const modeLower = String(payload.paymentMode).trim().toLowerCase();
      let availableLiquid = currentLiquid.cashInHand;

      if (modeLower.includes('bank') || modeLower.includes('transfer') || modeLower.includes('online') || modeLower.includes('cheque')) {
        availableLiquid = currentLiquid.bankBalance;
      } else if (modeLower.includes('card') || modeLower.includes('pos') || modeLower.includes('machine')) {
        availableLiquid = currentLiquid.cardBalance;
      }

      if (payload.paidAmount > availableLiquid) {
        throw new Error(`Insufficient Balance — Available: Rs. ${availableLiquid.toLocaleString()}`);
      }
    }

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
    const items = (saleData.cart || []).map(item => {
      const u = resolveProductMasterUnit(item, item.unit || item.unitName || 'KG');
      return {
        productId: item.productId || item.id,
        name: item.name,
        qty: Number(item.qty) || 1,
        rate: Number(item.rate) || 0,
        unit: u,
        unitName: u
      };
    });

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
      const sanitizedItems = (returnData.items || []).map(it => {
        const u = resolveProductMasterUnit(it, it.unit || it.unitName || 'KG');
        return {
          ...it,
          unit: u,
          unitName: u
        };
      });
      const res = await authFetch('/api/returns/sales', {
        method: 'POST',
        body: {
          ...returnData,
          items: sanitizedItems
        }
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
      // Validate available stock before initiating return
      for (const it of (returnData.items || [])) {
        const pId = it.productId || it.id;
        const rQty = Number(it.qty || it.enteredQty || 0);
        if (rQty > 0) {
          const matchedProd = (products || []).find(p =>
            (pId && (String(p.id) === String(pId) || String(p._id) === String(pId))) ||
            (it.name && (p.name || '').trim().toLowerCase() === (it.name || '').trim().toLowerCase())
          );
          if (matchedProd) {
            const val = computeProductValuation(matchedProd, purchases, sales, saleReturns, purchaseReturns, stockMovements);
            const availableStock = Math.max(0, val.qty !== undefined ? val.qty : Number(matchedProd.stockQty || 0));
            if (rQty > availableStock) {
              throw new Error(`Insufficient Stock — Available: ${availableStock} ${it.unit || matchedProd.unit || 'KG'}. Maximum returnable quantity: ${availableStock} ${it.unit || matchedProd.unit || 'KG'}.`);
            }
          }
        }
      }

      const sanitizedItems = (returnData.items || []).map(it => {
        const u = resolveProductMasterUnit(it, it.unit || it.unitName || 'KG');
        return {
          ...it,
          unit: u,
          unitName: u
        };
      });
      const res = await authFetch('/api/returns/purchases', {
        method: 'POST',
        body: {
          ...returnData,
          items: sanitizedItems
        }
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
        if (ledgerRes.success) {
          const cleanLogs = (ledgerRes.entries || []).filter(e => {
            const m = String(e.mode || '').trim().toLowerCase();
            return m !== 'supplier khata' && m !== 'purchase' && m !== 'bill' && !m.includes('khata credit');
          });
          setPaymentLogs(cleanLogs.map(normalizePaymentLog));
        }
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

  const liquidBalances = useMemo(() => {
    return computeLiquidBalances(sales, purchases, saleReturns, purchaseReturns, paymentLogs, expenses);
  }, [sales, purchases, saleReturns, purchaseReturns, paymentLogs, expenses]);

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
      liquidBalances,
      loading,
      error,
      refreshData: fetchAllData,
      addCategory,
      updateCategory,
      deleteCategory,
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
      computeLiquidBalances,
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
