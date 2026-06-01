import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger', // danger, warning, info
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  validationValue = '', // If provided, requires typing exactly this string to confirm
  validationLabel = 'Type to verify:',
  targetMetadata = null, // Optional { label: string, value: string } to render target box
  icon = null
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmedDisabled = validationValue ? inputValue.trim() !== validationValue : false;

  const config = {
    danger: {
      textColor: 'text-rose-700 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20',
      btnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none focus:ring-rose-500',
      glowColor: 'bg-rose-400',
      defaultIcon: (
        <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    },
    warning: {
      textColor: 'text-amber-700 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20',
      btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none focus:ring-amber-500',
      glowColor: 'bg-amber-400',
      defaultIcon: (
        <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      textColor: 'text-indigo-700 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20',
      btnBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none focus:ring-indigo-500',
      glowColor: 'bg-indigo-400',
      defaultIcon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const current = config[type] || config.danger;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-7 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0b0f19] shadow-2xl animate-scale-up text-left">
        {/* Subtle decorative glowing backgrounds */}
        <div className={`absolute -top-10 -left-10 w-24 h-24 rounded-full filter blur-xl opacity-20 ${current.glowColor}`} />
        <div className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full filter blur-xl opacity-20 ${current.glowColor}`} />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${current.iconBg}`}>
              {icon || current.defaultIcon}
            </div>
            <div>
              <h3 className={`text-sm font-black uppercase tracking-wider ${current.textColor}`}>
                {title}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                Administrative Authorization
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>

            {/* Reusable Metadata Box */}
            {targetMetadata && (
              <div className="p-4 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-650 dark:text-rose-455 flex items-center justify-center font-bold text-[10px] uppercase">
                  {targetMetadata.label || 'Target'}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-455 dark:text-slate-500 uppercase font-black tracking-widest leading-none">
                    Identifier
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-1 select-all">
                    {targetMetadata.value}
                  </p>
                </div>
              </div>
            )}

            {/* Reusable Double-Check Input Verification */}
            {validationValue && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider block">
                  {validationLabel}
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Type "${validationValue}" to verify`}
                  className="w-full text-xs font-semibold px-4 py-3 border rounded-2xl bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 focus:border-rose-500 focus:ring-rose-500 focus:outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-850 transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              disabled={isConfirmedDisabled}
              onClick={onConfirm}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${current.btnBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
