import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Toast = ({ isOpen, message, type = 'success', onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const config = {
    success: {
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50/95 dark:bg-[#0f172a]/95',
      borderColor: 'border-emerald-100 dark:border-emerald-900/30',
      glow: 'shadow-emerald-100 dark:shadow-none',
      icon: (
        <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    },
    error: {
      textColor: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-50/95 dark:bg-[#0f172a]/95',
      borderColor: 'border-rose-100 dark:border-rose-900/30',
      glow: 'shadow-rose-100 dark:shadow-none',
      icon: (
        <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      )
    },
    info: {
      textColor: 'text-indigo-700 dark:text-indigo-400',
      bgColor: 'bg-indigo-50/95 dark:bg-[#0f172a]/95',
      borderColor: 'border-indigo-100 dark:border-indigo-900/30',
      glow: 'shadow-indigo-100 dark:shadow-none',
      icon: (
        <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    }
  };

  const current = config[type] || config.success;

  return createPortal(
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-4 w-full max-w-sm animate-fade-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-scale-up ${current.bgColor} ${current.borderColor} ${current.glow}`}>
        {current.icon}
        <p className={`text-sm font-semibold leading-relaxed grow ${current.textColor}`}>{message}</p>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none shrink-0 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default Toast;
