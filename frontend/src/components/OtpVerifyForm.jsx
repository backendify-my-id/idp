import React from 'react';

const OtpVerifyForm = ({
  handleVerifyOTP,
  email,
  setEmail,
  otp,
  setOtp,
  handleResendOTP,
  setIsVerifying,
  setIsSignUp,
}) => {
  return (
    <form onSubmit={handleVerifyOTP} className="space-y-5 animate-scale-up">
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

      <div>
        <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-355 uppercase tracking-wider mb-2 text-left">
          6-Digit OTP Code
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

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 btn-primary flex justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer"
        >
          Verify OTP
        </button>
        <button
          type="button"
          onClick={handleResendOTP}
          className="px-4 py-3.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-98"
        >
          Resend Code
        </button>
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsVerifying(false);
            setIsSignUp(false);
            setOtp('');
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-400 uppercase tracking-wider transition-colors focus:outline-none cursor-pointer"
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );
};

export default OtpVerifyForm;
