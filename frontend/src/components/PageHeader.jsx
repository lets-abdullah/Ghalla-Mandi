import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  primaryAction,
  secondaryActions
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`mb-4 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'bg-brand-50 text-brand-600 border border-brand-200'}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h1>
            {subtitle && (
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {secondaryActions}
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-brand-500/20"
              >
                {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
                <span>{primaryAction.label}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
