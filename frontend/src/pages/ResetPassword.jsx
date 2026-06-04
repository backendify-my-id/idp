import React, { useState } from 'react';
import { forgotPassword, resetPassword } from '../services/api';
import AlertModal from '../components/AlertModal';
import AuthLayouts from '../layouts/AuthLayouts';
import AuthBrandPanel from '../components/AuthBrandPanel';

const ResetPassword = ({ onResetSuccess, onNavigateToLogin, initialEmail = '' }) => {
  const [step, setStep] = useState('forgot'); // 'forgot', 'reset'
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Loading & Alert state
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    const res = await forgotPassword(email);
    setIsLoading(false);
    if (res.success) {
      setAlert({
        isOpen: true,
        title: 'OTP Sent',
        message: 'A secure password reset OTP has been dispatched to your email address.',
        type: 'success',
      });
      setStep('reset');
    } else {
      setAlert({
        isOpen: true,
        title: 'Error',
        message: res.message || 'Failed to request password reset.',
        type: 'error',
      });
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword) return;
    setIsLoading(true);
    const res = await resetPassword(email, otp, newPassword);
    setIsLoading(false);
    if (res.success) {
      setAlert({
        isOpen: true,
        title: 'Password Reset Success',
        message: 'Your password has been changed successfully. You can now log in.',
        type: 'success',
      });
      setTimeout(() => {
        onResetSuccess(email);
      }, 2000);
    } else {
      setAlert({
        isOpen: true,
        title: 'Error',
        message: res.message || 'Invalid or expired OTP token.',
        type: 'error',
      });
    }
  };

  return (
    <AuthLayouts>
      <div className="w-full min-h-screen flex lg:grid lg:grid-cols-2 items-stretch relative">
        <AuthBrandPanel
          headline={`Recover your\ncredentials.`}
          description="Enterprise-grade authentication with real-time analytics, OIDC, and multi-factor security."
        />

        {/* Right Side: Form Panel */}
        <div className="flex flex-col items-center justify-center w-full min-h-screen px-6 py-12 sm:px-10 lg:px-12 xl:px-20 relative overflow-hidden bg-slate-50 dark:bg-[#090d16] transition-colors">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/8 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-purple-500/4 dark:bg-purple-500/6 blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-[360px] animate-scale-up">
            {/* Mobile Logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
                <span className="text-white font-black text-sm">B</span>
              </div>
              <span className="font-black text-base bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Backendify IdP
              </span>
            </div>

            <div className="mb-7 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {step === 'forgot' ? 'Reset Password' : 'Update Credentials'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1.5 leading-relaxed">
                {step === 'forgot' 
                  ? 'Enter your email address below to request a recovery OTP.' 
                  : 'Enter the verification OTP and your new secure password.'
                }
              </p>
            </div>

            {step === 'forgot' ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full btn-primary flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isLoading && (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Request Reset Token</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="mt-1 block w-full px-4 py-3 border border-slate-100 dark:border-slate-850 bg-slate-100 dark:bg-slate-900 rounded-2xl text-sm font-bold text-slate-455 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="mt-1 block w-full text-center tracking-[0.5em] placeholder-slate-350 text-2xl font-bold px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="mt-1 block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !otp || !newPassword}
                  className="w-full btn-primary flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isLoading && (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Update Password</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('forgot')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  >
                    Resend Token
                  </button>
                </div>
              </form>
            )}

            <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex flex-col items-center gap-3">
              <button
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </AuthLayouts>
  );
};

export default ResetPassword;
