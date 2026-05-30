import React from 'react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger' }) => {
  if (!isOpen) return null;

  const config = {
    danger: {
      textColor: 'text-rose-700 dark:text-rose-400',
      borderColor: 'border-rose-100 dark:border-rose-900/30',
      btnColor: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-none focus:ring-rose-500',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/20 flex items-center justify-center text-rose-500 mx-auto mb-4 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
      )
    },
    warning: {
      textColor: 'text-amber-700 dark:text-amber-400',
      borderColor: 'border-amber-100 dark:border-amber-900/30',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 dark:shadow-none focus:ring-amber-500',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/20 flex items-center justify-center text-amber-500 mx-auto mb-4 animate-pulse">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
      )
    },
    info: {
      textColor: 'text-indigo-700 dark:text-indigo-400',
      borderColor: 'border-indigo-100 dark:border-indigo-900/30',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none focus:ring-indigo-500',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/20 flex items-center justify-center text-indigo-500 mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      )
    }
  };

  const current = config[type] || config.info;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`p-6 sm:p-8 rounded-3xl border bg-white dark:bg-[#0f172a] shadow-2xl max-w-sm w-full text-center relative overflow-hidden transform transition-all duration-300 animate-scale-up ${current.borderColor}`}>
        {/* Subtle decorative glowing background */}
        <div className={`absolute -top-10 -left-10 w-24 h-24 rounded-full filter blur-xl opacity-20 ${
          type === 'danger' ? 'bg-rose-500' : (type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500')
        }`}></div>
        <div className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full filter blur-xl opacity-20 ${
          type === 'danger' ? 'bg-rose-500' : (type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500')
        }`}></div>

        <div className="relative z-10">
          {current.icon}
          <h3 className={`text-xl font-black mb-2 tracking-tight ${current.textColor}`}>{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-semibold text-xs">{message}</p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl shadow-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${current.btnColor}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
