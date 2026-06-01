import React, { useState } from 'react';
import { registerUser, verifyEmail, resendOtp } from '../services/api';
import AlertModal from '../components/AlertModal';
import AuthLayouts from '../layouts/AuthLayouts';
import AuthBrandPanel from '../components/AuthBrandPanel';

const Register = ({ onRegisterSuccess, onNavigateToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');

  // Loading & Alert state
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isVerifying) {
      // Submit OTP Verification
      const res = await verifyEmail(email, otp);
      setIsLoading(false);

      if (res.success) {
        setAlert({
          isOpen: true,
          title: 'Email Verified',
          message: 'Your email has been verified successfully! You can now log in.',
          type: 'success',
        });
        setTimeout(() => {
          onRegisterSuccess();
        }, 2000);
      } else {
        setAlert({
          isOpen: true,
          title: 'Verification Failed',
          message: res.message || 'Invalid or expired OTP code.',
          type: 'error',
        });
      }
    } else {
      // Validate Password Match
      if (password !== confirmPassword) {
        setIsLoading(false);
        setAlert({
          isOpen: true,
          title: 'Validation Error',
          message: 'Passwords do not match.',
          type: 'error',
        });
        return;
      }

      // Submit Register Request
      const res = await registerUser(email, password);
      setIsLoading(false);

      if (res.success) {
        setIsVerifying(true);
        setAlert({
          isOpen: true,
          title: 'Verification Sent',
          message: 'A 6-digit verification code has been sent to your email address.',
          type: 'info',
        });
      } else {
        setAlert({
          isOpen: true,
          title: 'Registration Error',
          message: res.message || 'Account registration failed.',
          type: 'error',
        });
      }
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    const res = await resendOtp(email);
    setIsLoading(false);

    if (res.success) {
      setAlert({
        isOpen: true,
        title: 'OTP Resent',
        message: 'A new 6-digit verification code has been dispatched to your email.',
        type: 'success',
      });
    } else {
      setAlert({
        isOpen: true,
        title: 'Error',
        message: res.message || 'Failed to dispatch a new OTP code.',
        type: 'error',
      });
    }
  };

  return (
    <AuthLayouts>
      <div className="w-full min-h-screen flex lg:grid lg:grid-cols-2 items-stretch relative">
        <AuthBrandPanel
          headline={`Start your\nidentity registry.`}
          description="Create a secure, centralized identity account and manage OIDC client configurations instantly."
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

            <div className="mb-7">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {isVerifying ? 'Verify Your Email' : 'Create Account'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1.5">
                {isVerifying 
                  ? `Enter the 6-digit code sent to ${email}.`
                  : 'Register a centralized identity profile to get started.'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isVerifying ? (
                <>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="mt-1 block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="mt-1 block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all"
                    />
                  </div>
                </>
              ) : (
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
                    className="mt-1 block w-full text-center tracking-[0.5em] placeholder-slate-350 text-2xl font-bold px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl transition-all"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 btn-primary flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isLoading && (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {isVerifying ? 'Verify OTP' : 'Register'}
                </button>

                {isVerifying && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="px-4 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>

            <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex flex-col items-center gap-3">
              <button
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Already have an account? Sign In
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

export default Register;
