import React from 'react';

const ResetPasswordForm = ({
  handleResetPasswordSubmit,
  email,
  otp,
  setOtp,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  setIsResetPassword,
  setIsForgotPassword,
  setAlert,
  alert,
}) => {
  return (
    <form onSubmit={handleResetPasswordSubmit} className="space-y-5 animate-scale-up">
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center font-medium">
        Enter the 6-digit code sent to <strong className="text-rose-600 font-bold">{email}</strong> and configure your new credentials.
      </p>
      <div>
        <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-355 uppercase tracking-wider mb-2 text-left">
          Reset Code (OTP)
        </label>
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="mt-1.5 block w-full text-center tracking-[0.5em] placeholder-slate-300 text-2xl font-bold px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl transition-all"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-355 uppercase tracking-wider mb-2 text-left">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
          className="mt-1.5 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-355 uppercase tracking-wider mb-2 text-left">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Confirm new password"
          className="mt-1.5 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full flex justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md shadow-rose-200 dark:shadow-none transition-all transform active:scale-98 cursor-pointer"
      >
        Reset Password
      </button>
      <div className="mt-4 text-center flex gap-6 justify-center">
        <button
          type="button"
          onClick={() => {
            setIsResetPassword(false);
            setIsForgotPassword(true);
            setAlert({ ...alert, isOpen: false });
          }}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider transition-colors focus:outline-none cursor-pointer"
        >
          Resend Code
        </button>
        <button
          type="button"
          onClick={() => {
            setIsResetPassword(false);
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

export default ResetPasswordForm;
