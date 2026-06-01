import React from 'react';

const VerificationCodeInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = '000000',
  maxLength = 6,
  isLoading = false,
  btnText = 'Verify & Confirm',
  cancelText = '',
  onCancel = null
}) => {
  const handleChange = (e) => {
    // Only allow numeric characters
    const val = e.target.value.replace(/\D/g, '');
    onChange(val);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-sm w-full text-left">
      <div className="relative">
        <input
          type="text"
          required
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full text-center tracking-[0.4em] placeholder:tracking-[0.1em] text-lg font-mono font-bold rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none transition-all text-slate-900 dark:text-white"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading || value.length < maxLength}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading && (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          <span>{btnText}</span>
        </button>

        {cancelText && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-extrabold uppercase text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
        )}
      </div>
    </form>
  );
};

export default VerificationCodeInput;
