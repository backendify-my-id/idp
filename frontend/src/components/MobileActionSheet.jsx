import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * MobileActionSheet – A bottom sheet that renders via React Portal
 * so it escapes any overflow:hidden parent containers.
 *
 * Props:
 *  - isOpen      {boolean}  – whether the sheet is visible
 *  - onClose     {fn}       – called to close the sheet
 *  - title       {string}   – header text (e.g. user display name)
 *  - subtitle    {string}   – sub-text (e.g. user email)
 *  - items       {Array}    – action items to render:
 *      { label, icon, onClick, variant, disabled }
 *      variant: 'default' | 'danger'
 */
const MobileActionSheet = ({ isOpen, onClose, title, subtitle, items = [] }) => {
  const sheetRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white dark:bg-[#0f172a] shadow-2xl border-t border-slate-200/50 dark:border-slate-700/50 animate-slide-up"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-50 to-purple-600 flex items-center justify-center text-white text-sm font-black uppercase shadow-sm shrink-0">
            {title ? title[0] : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{title || 'User'}</p>
            {subtitle && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors shrink-0"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions List */}
        <div className="px-3 py-3 space-y-1 pb-safe-area-inset-bottom pb-6">
          {items.map((item, idx) => {
            if (item.type === 'divider') {
              return (
                <div key={`divider-${idx}`} className="py-1">
                  {item.label && (
                    <p className="px-3 text-[8px] font-black uppercase tracking-widest text-rose-500/70 mb-1">
                      {item.label}
                    </p>
                  )}
                  {!item.label && (
                    <div className="border-t border-slate-100 dark:border-slate-800/60 my-1" />
                  )}
                </div>
              );
            }

            if (item.type === 'section') {
              return (
                <p key={`section-${idx}`} className="px-3 pt-1 pb-0.5 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {item.label}
                </p>
              );
            }

            const isDanger = item.variant === 'danger';

            return (
              <button
                key={idx}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.();
                    onClose();
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] text-left ${
                  item.disabled
                    ? 'opacity-35 pointer-events-none'
                    : isDanger
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {item.icon && (
                  <span className={`shrink-0 ${isDanger ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileActionSheet;
