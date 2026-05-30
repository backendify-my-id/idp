import React from 'react';

const ForgotPasswordForm = ({
  handleForgotPasswordSubmit,
  email,
  setEmail,
  setIsForgotPassword,
  setAlert,
  alert,
}) => {
  return (
    <form onSubmit={handleForgotPasswordSubmit} className="space-y-5 animate-scale-up">
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center font-medium">
        Enter your email below and we will send a 6-digit verification code to reset your password.
      </p>
      <div>
        <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-355 uppercase tracking-wider mb-2 text-left">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full flex justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md shadow-rose-200 dark:shadow-none transition-all transform active:scale-98 cursor-pointer"
      >
        Send Reset Code
      </button>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsForgotPassword(false);
            setAlert({ ...alert, isOpen: false });
          }}
          className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-wider transition-colors focus:outline-none cursor-pointer"
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
