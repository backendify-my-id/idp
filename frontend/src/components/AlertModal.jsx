import React from 'react';
import { createPortal } from 'react-dom';

const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  const config = {
    success: {
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50/80',
      borderColor: 'border-emerald-100 dark:border-emerald-900/30',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none focus:ring-emerald-500',
      icon: (
        <svg className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    },
    error: {
      textColor: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-50/80',
      borderColor: 'border-rose-100 dark:border-rose-900/30',
      btnColor: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-none focus:ring-rose-500',
      icon: (
        <svg className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      )
    },
    info: {
      textColor: 'text-indigo-700 dark:text-indigo-400',
      bgColor: 'bg-indigo-50/80',
      borderColor: 'border-indigo-100 dark:border-indigo-900/30',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none focus:ring-indigo-500',
      icon: (
        <svg className="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    }
  };

  const current = config[type] || config.info;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`p-8 rounded-3xl border bg-white dark:bg-[#0f172a] shadow-2xl max-w-sm w-full text-center relative overflow-hidden transform transition-transform duration-300 animate-scale-up ${current.borderColor}`}>
        {/* Subtle decorative glowing background */}
        <div className={`absolute -top-10 -left-10 w-24 h-24 rounded-full filter blur-xl opacity-30 ${type === 'success' ? 'bg-emerald-450' : (type === 'error' ? 'bg-rose-450' : 'bg-indigo-450')}`}></div>
        <div className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full filter blur-xl opacity-30 ${type === 'success' ? 'bg-emerald-450' : (type === 'error' ? 'bg-rose-450' : 'bg-indigo-450')}`}></div>

        <div className="relative z-10">
          {current.icon}
          <h3 className={`text-2xl font-black mb-3 tracking-tight ${current.textColor}`}>{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-semibold text-xs">{message}</p>
          
          <button
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-xl shadow-lg font-bold text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform active:scale-95 cursor-pointer ${current.btnColor}`}
          >
            Okay, Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AlertModal;
