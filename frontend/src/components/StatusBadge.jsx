import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * StatusBadge — Standardized status display component
 * 
 * status values (canonical):
 *   'Paid'     → PAID (emerald)
 *   'Partial'  → PARTIAL (amber)
 *   'Pending'  → UNPAID (rose)
 *   'Unpaid'   → UNPAID (rose)
 *   'Returned' → RETURNED (slate)
 *   'Settled'  → SETTLED (green)
 *   'Due'      → DUE (orange)
 * 
 * size: 'sm' | 'md' | 'lg'
 */
export const StatusBadge = ({ status, size = 'md', className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const normalize = (s) => {
    if (!s) return 'unknown';
    const lower = String(s).toLowerCase().trim();
    if (lower === 'paid') return 'paid';
    if (lower === 'partial' || lower === 'partially paid') return 'partial';
    if (lower === 'pending' || lower === 'unpaid' || lower === 'due') return 'unpaid';
    if (lower === 'returned' || lower === 'fully returned') return 'returned';
    if (lower === 'settled') return 'settled';
    return 'unknown';
  };

  const normalized = normalize(status);

  const labels = {
    paid: 'PAID',
    partial: 'PARTIAL',
    unpaid: 'UNPAID',
    returned: 'RETURNED',
    settled: 'SETTLED',
    unknown: String(status || '').toUpperCase(),
  };

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-[11px] px-2.5 py-1',
  };

  return (
    <span
      className={`status-badge status-${normalized} ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {labels[normalized]}
    </span>
  );
};

/**
 * StatusDot — Minimal dot indicator version
 */
export const StatusDot = ({ status }) => {
  const normalize = (s) => {
    if (!s) return 'unknown';
    const lower = String(s).toLowerCase().trim();
    if (lower === 'paid') return 'paid';
    if (lower === 'partial' || lower === 'partially paid') return 'partial';
    if (lower === 'pending' || lower === 'unpaid' || lower === 'due') return 'unpaid';
    if (lower === 'returned' || lower === 'fully returned') return 'returned';
    if (lower === 'settled') return 'settled';
    return 'unknown';
  };

  const colors = {
    paid: 'bg-emerald-500',
    partial: 'bg-amber-500',
    unpaid: 'bg-rose-500',
    returned: 'bg-slate-400',
    settled: 'bg-green-500',
    unknown: 'bg-slate-300',
  };

  const normalized = normalize(status);
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[normalized]}`} />
  );
};

export default StatusBadge;
