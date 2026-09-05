import React from 'react';
import {
  ShoppingCart,
  Wallet,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const SupplierLedgerTimeline = ({
  supplier,
  entries = [],
  theme = 'light',
  isSupplier = true
}) => {
  const currentBalance = Number(
    supplier?.balance !== undefined
      ? supplier.balance
      : (supplier?.payableDue !== undefined ? supplier.payableDue : 0)
  );
  const refundDue = Number(
    supplier?.refundDue !== undefined
      ? supplier.refundDue
      : (supplier?.advanceCredit || 0)
  );
  const isSettled = currentBalance <= 0 && refundDue <= 0;

  // Calculate totals for quick summary
  const totalPurchases = (entries || [])
    .filter(e => e.txType === 'Purchases' || e.txType === 'Sales')
    .reduce((sum, e) => sum + Number(e.debit || e.sales || 0), 0);

  const totalPayments = (entries || [])
    .filter(e => e.txType === 'Payments')
    .reduce((sum, e) => sum + Number(e.credit || 0), 0);

  const totalReturns = (entries || [])
    .filter(e => e.txType === 'Returns')
    .reduce((sum, e) => sum + Number(e.credit || e.returnAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP BALANCE SUMMARY CARD */}
      {/* ========================================================================= */}
      <div
        className={`border rounded-3xl p-5 sm:p-6 card-shadow transition-all ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/80">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {isSupplier ? 'Supplier Account' : 'Customer Account'}
            </div>
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 mt-0.5">
              <Building2 className="w-5 h-5 text-brand-500" />
              <span>{supplier?.name || (isSupplier ? 'ABC Traders' : 'Customer')}</span>
            </h2>
            {(supplier?.city || supplier?.phone) && (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                {supplier?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {supplier.city}
                  </span>
                )}
                {supplier?.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5" />
                    {supplier.phone}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Large Current Balance & Status */}
          <div className="sm:text-right w-full sm:w-auto p-3 sm:p-0 rounded-2xl sm:rounded-none bg-slate-50 sm:bg-transparent dark:bg-slate-900/40 sm:dark:bg-transparent">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {refundDue > 0 ? 'Supplier Refund Due' : 'Current Balance'}
            </div>
            <div className="flex sm:justify-end items-baseline gap-2 mt-0.5">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  refundDue > 0
                    ? 'text-teal-600 dark:text-teal-400'
                    : isSettled
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-500 dark:text-amber-400'
                }`}
              >
                Rs. {(refundDue > 0 ? refundDue : Math.abs(currentBalance)).toLocaleString()}
              </span>
            </div>
            <div className="flex sm:justify-end items-center gap-1.5 mt-1.5">
              {refundDue > 0 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refund Due (Receivable from Supplier)</span>
                </span>
              ) : isSettled ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Settled (No payment required)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Payable Due: Rs. {currentBalance.toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4-Stat Strip: Purchases, Payments, Returns, Balance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              {isSupplier ? 'Total Purchases' : 'Total Sales'}
            </div>
            <div className="text-sm font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              Rs. {totalPurchases.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Total Payments Made
            </div>
            <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              Rs. {totalPayments.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Returns Adjusted
            </div>
            <div className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              - Rs. {totalReturns.toLocaleString()}
            </div>
          </div>

          <div
            className={`p-3 rounded-2xl border ${
              refundDue > 0
                ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300'
                : isSettled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
            }`}
          >
            <div className="text-[10px] font-bold uppercase">
              {refundDue > 0 ? 'Supplier Refund Due' : 'Amount Due'}
            </div>
            <div className="text-sm font-black font-mono mt-0.5">
              Rs. {(refundDue > 0 ? refundDue : currentBalance).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TRANSACTION TIMELINE (EXPLAINING THE OUTCOME STEP BY STEP) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-500" />
            <span>Transaction Timeline (Chronological Flow)</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Shows how balance changed step by step
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center border rounded-3xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs font-bold">
            No transactions recorded for this supplier.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
            {entries.map((entry, idx) => {
              const isPurchase = entry.txType === 'Purchases' || entry.txType === 'Sales';
              const isPayment = entry.txType === 'Payments';
              const isReturn = entry.txType === 'Returns';
              const isOpening = entry.txType === 'Opening Balance';

              // Calculate previous balance for this step if possible
              const stepBalance = Number(entry.runningBalance || 0);
              const isRefundDue = entry.balanceStatus === 'Refund Due' || Number(entry.supplierRefundDue || 0) > 0;

              return (
                <div key={entry.id || idx} className="relative group">
                  {/* Timeline Dot Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center -translate-x-1/2 z-10 shadow-xs transition-transform group-hover:scale-110 ${
                      isPurchase
                        ? 'bg-blue-500 border-white text-white dark:border-slate-900'
                        : isPayment
                        ? 'bg-emerald-500 border-white text-white dark:border-slate-900'
                        : isReturn
                        ? 'bg-purple-600 border-white text-white dark:border-slate-900'
                        : 'bg-slate-500 border-white text-white dark:border-slate-900'
                    }`}
                  >
                    {isPurchase && <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    {isPayment && <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
                    {isReturn && <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
                    {isOpening && <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  </div>

                  {/* Transaction Card */}
                  <div
                    className={`border rounded-2xl p-4 sm:p-5 card-shadow transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header Row: Step #, Label, Date, Running Due */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          Step {idx + 1}
                        </span>
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                            isPurchase
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : isPayment
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : isReturn
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              : 'bg-slate-100 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isPurchase && 'Purchase'}
                          {isPayment && 'Payment'}
                          {isReturn && 'Purchase Return'}
                          {isOpening && 'Opening Balance'}
                        </span>
                        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                          {entry.ref}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400 font-mono">{entry.date}</span>
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">
                            {isRefundDue ? 'Refund due after step:' : 'Due after step:'}
                          </span>
                          <span
                            className={`font-black ${
                              isRefundDue
                                ? 'text-teal-600 dark:text-teal-400'
                                : stepBalance === 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-500'
                            }`}
                          >
                            Rs. {stepBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step Body */}
                    <div className="pt-3 space-y-2.5">
                      {/* 1. PURCHASE STEP */}
                      {isPurchase && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-semibold">
                              Bill Amount Incurred:
                            </span>
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                              Rs. {(entry.debit || entry.sales || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Upfront payment if any */}
                          {entry.paidAmount > 0 && (
                            <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span>Paid upfront with bill:</span>
                              <span className="font-mono font-bold">
                                - Rs. {entry.paidAmount.toLocaleString()}
                              </span>
                            </div>
                          )}

                          {entry.desc && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              {entry.desc}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. PAYMENT STEP */}
                      {isPayment && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-semibold">
                              Amount Paid to Supplier:
                            </span>
                            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                              Rs. {(entry.credit || 0).toLocaleString()} paid
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Payment Mode: <b>{entry.paymentMethod || entry.notes || 'Cash'}</b></span>
                            <span>Remaining Due: <b className="font-mono text-slate-700 dark:text-slate-200">Rs. {stepBalance.toLocaleString()}</b></span>
                          </div>
                        </div>
                      )}

                      {/* 3. PURCHASE RETURN STEP (EXPLICIT ADJUSTMENT CALLOUT) */}
                      {isReturn && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-semibold">
                              Merchandise Returned to Supplier:
                            </span>
                            <span className="font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                              Rs. {(entry.credit || entry.returnAmount || 0).toLocaleString()} returned
                            </span>
                          </div>

                          {/* Contextual Explanatory Message */}
                          <div className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                            isRefundDue
                              ? 'bg-teal-500/10 border-teal-500/30 text-teal-800 dark:text-teal-200'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isRefundDue ? 'text-teal-600' : 'text-emerald-600'}`} />
                            <div>
                              <span>
                                Rs. {(entry.credit || entry.returnAmount || 0).toLocaleString()} return adjusted against supplier account.
                              </span>
                              <div className="text-[11px] font-extrabold mt-0.5">
                                {isRefundDue
                                  ? `✓ Supplier Refund Due: Rs. ${stepBalance.toLocaleString()} (Receivable from Supplier)`
                                  : stepBalance === 0
                                  ? '✓ No payment required. Account is fully settled.'
                                  : `Remaining Due: Rs. ${stepBalance.toLocaleString()}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. OPENING BALANCE */}
                      {isOpening && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">
                            Opening Due Recorded:
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            Rs. {(entry.debit || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ========================================================================= */}
            {/* 3. FINAL OUTCOME CARD (CLEANLY COMMUNICATES FINAL FINANCIAL STATE) */}
            {/* ========================================================================= */}
            <div className="relative pt-2">
              <div
                className={`border rounded-3xl p-5 sm:p-6 card-shadow text-center space-y-2 ${
                  isSettled
                    ? 'bg-gradient-to-b from-emerald-500/10 to-transparent border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                    : 'bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/30 text-amber-950 dark:text-amber-100'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-xs bg-white dark:bg-slate-800">
                  {isSettled ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-amber-500" />
                  )}
                </div>

                <div className="text-base sm:text-lg font-black tracking-tight">
                  {isSettled ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Amount Due: Rs. 0 • Status: Settled
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Amount Due: Rs. {currentBalance.toLocaleString()} • Status: Due
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {isSettled
                    ? `All purchases, payments, and return adjustments for ${supplier?.name || 'this supplier'} are fully balanced. No further payment is required.`
                    : `There is an outstanding balance of Rs. ${currentBalance.toLocaleString()} remaining to be settled with this supplier.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
