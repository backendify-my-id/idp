import React from 'react';

const MfaVerifyForm = ({
  handleMfaLoginSubmit,
  mfaLoginCode,
  setMfaLoginCode,
  setIsMfaVerifyingLogin,
}) => {
  return (
    <form onSubmit={handleMfaLoginSubmit} className="space-y-5 animate-scale-up">
      <div>
        <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-355 uppercase tracking-wider mb-2 text-left">
          6-Digit Authenticator Code
        </label>
        <input
          type="text"
          maxLength={6}
          value={mfaLoginCode}
          onChange={(e) => setMfaLoginCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="mt-1.5 block w-full text-center tracking-[0.5em] placeholder-slate-300 text-2xl font-bold px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl transition-all"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full btn-primary flex justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer"
      >
        Verify & Sign In
      </button>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsMfaVerifyingLogin(false);
            setMfaLoginCode('');
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-400 uppercase tracking-wider transition-colors focus:outline-none cursor-pointer"
        >
          Back to Login
        </button>
      </div>
    </form>
  );
};

export default MfaVerifyForm;
