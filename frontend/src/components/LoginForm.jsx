import React from 'react';

const LoginForm = ({
  handleSubmit,
  email,
  setEmail,
  password,
  setPassword,
  isSignUp,
  confirmPassword,
  setConfirmPassword,
  oidcParams,
}) => {
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="mt-1.5 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
          required
        />
      </div>

      {isSignUp && (
        <div className="animate-fade-in">
          <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-355 uppercase tracking-wider mb-2 text-left">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="mt-1.5 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
            required
          />
        </div>
      )}

      <button
        type="submit"
        className="w-full btn-primary flex justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer mt-2"
      >
        {isSignUp ? 'Register & Sign Up' : oidcParams ? 'Authorize & Sign In' : 'Sign In'}
      </button>
    </form>
  );
};

export default LoginForm;
