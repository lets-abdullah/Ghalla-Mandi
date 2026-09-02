import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * EmptyState — Consistent empty state component used across all ERP pages.
 *
 * Props:
 *   icon        — Lucide icon component
 *   title       — Main heading (e.g. "No Sales Found")
 *   description — Helpful subtitle (e.g. "Click 'New Sale' to create your first sale.")
 *   action      — Optional action element (button, link, etc.)
 *   compact     — Smaller version for use inside table cells
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}) => {
  const { theme } = useTheme();

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          {title || 'No records found'}
        </p>
        {description && (
          <p className="text-[11px] text-slate-400 font-medium max-w-[200px]">{description}</p>
        )}
        {action && <div className="mt-1">{action}</div>}
      </div>
    );
  }

  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <div className="space-y-1">
        <p className="empty-state-title">{title || 'No records found'}</p>
        {description && (
          <p className="empty-state-desc">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
