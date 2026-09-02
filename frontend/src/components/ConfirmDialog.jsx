import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * ConfirmDialog — Replaces window.confirm() for destructive actions.
 *
 * Props:
 *   isOpen       — Whether dialog is visible
 *   onConfirm    — Called when user confirms
 *   onCancel     — Called when user cancels or closes
 *   title        — Dialog title (e.g. "Delete Sale?")
 *   message      — Description of what will happen
 *   confirmLabel — Text on confirm button (default: "Delete")
 *   cancelLabel  — Text on cancel button (default: "Cancel")
 *   isDestructive — Whether confirm button is red (default: true)
 *   isLoading    — Shows loading state on confirm button
 */
export const ConfirmDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className={`relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl border animate-slide-up ${
        isDark
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-slate-200'
      }`}>
        {/* Close button */}
        <button
          onClick={onCancel}
          className={`absolute top-3 right-3 p-1.5 rounded-xl transition cursor-pointer ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${
            isDestructive
              ? 'bg-rose-100 text-rose-600'
              : 'bg-amber-100 text-amber-600'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>

          {/* Title */}
          <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h3>

          {/* Message */}
          <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {message}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              } disabled:opacity-50`}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
