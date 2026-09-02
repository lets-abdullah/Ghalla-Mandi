import React from 'react';
import { StatusBadge } from './StatusBadge';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Standardized 7-Question Transaction Financial Summary Component
 * Presents transaction financials answering:
 * 1. What happened? (Bill / Invoice)
 * 2. Original Amount
 * 3. Returned Amount (if any)
 * 4. Net Amount
 * 5. Paid
 * 6. Remaining Due
 * 7. Current Status Badge
 */
export const TransactionFinancialSummary = ({
  original = 0,
  returned = 0,
  net = 0,
  paid = 0,
  due = 0,
  status = 'Pending',
  type = 'purchase', // 'purchase' | 'sale'
  compact = false,
  theme = 'light'
}) => {
  const origNum = Number(original || 0);
  const retNum = Number(returned || 0);
  const netNum = Number(net !== undefined ? net : Math.max(0, origNum - retNum));
  const paidNum = Number(paid || 0);
  const dueNum = Number(due !== undefined ? due : Math.max(0, netNum - paidNum));
  const isSettled = dueNum === 0 && (netNum > 0 || status === 'Settled' || status === 'Paid');

  if (compact) {
    return (
      <div className="font-mono text-xs space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Net:</span>
          <span className="font-bold font-mono text-slate-900 dark:text-white">Rs. {netNum.toLocaleString()}</span>
        </div>
        {retNum > 0 && (
          <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400">
            <span>Returned:</span>
            <span>- Rs. {retNum.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Paid:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Rs. {paidNum.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400">Due:</span>
          <span className={`font-black ${dueNum > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Rs. {dueNum.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border font-mono text-xs space-y-2.5 transition-colors ${
      theme === 'dark' ? 'bg-slate-900/60 border-slate-700/80 text-white' : 'bg-slate-50/90 border-slate-200 text-slate-900'
    }`}>
      {/* Header with Type & Status */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/80">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {type === 'purchase' ? 'Procurement Bill Summary' : 'Sales Invoice Summary'}
        </span>
        <StatusBadge status={status} />
      </div>

      {/* 1. Original Amount */}
      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
        <span className="font-sans font-medium">Original Amount:</span>
        <span className="font-bold text-slate-900 dark:text-white">Rs. {origNum.toLocaleString()}</span>
      </div>

      {/* 2. Returned Amount (if > 0) */}
      {retNum > 0 && (
        <div className="flex justify-between items-center text-purple-700 dark:text-purple-400 font-bold">
          <span className="font-sans font-medium">Returned Goods:</span>
          <span>- Rs. {retNum.toLocaleString()}</span>
        </div>
      )}

      {/* 3. Net Amount (only shown or emphasized when return exists) */}
      {retNum > 0 && (
        <div className="flex justify-between items-center text-slate-900 dark:text-white font-black border-t border-slate-200 dark:border-slate-700/80 pt-1.5">
          <span className="font-sans font-medium">Net {type === 'purchase' ? 'Bill' : 'Invoice'} Amount:</span>
          <span className="text-sm">Rs. {netNum.toLocaleString()}</span>
        </div>
      )}

      {/* 4. Paid */}
      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
        <span className="font-sans font-medium">Total Paid:</span>
        <span>Rs. {paidNum.toLocaleString()}</span>
      </div>

      {/* 5. Remaining Due */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700/80 font-black">
        <span className="font-sans font-medium text-slate-700 dark:text-slate-300">Remaining Due:</span>
        <span className={`text-sm ${dueNum > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          Rs. {dueNum.toLocaleString()}
        </span>
      </div>

      {/* Contextual Notice */}
      {isSettled ? (
        <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>This transaction is fully settled. No balance due.</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Outstanding balance of Rs. {dueNum.toLocaleString()} remaining.</span>
        </div>
      )}
    </div>
  );
};
