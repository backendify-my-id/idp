import React, { useState } from 'react';
import { loginUser, loginMfa } from '../services/api';
import AlertModal from '../components/AlertModal';
import AuthLayouts from '../layouts/AuthLayouts';
import AuthBrandPanel from '../components/AuthBrandPanel';
import VerificationCodeInput from '../components/VerificationCodeInput';

const Login = ({ onLoginSuccess, onNavigateToRegister, onNavigateToResetPassword, onNavigateToVerifyEmail }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // MFA Login states
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [mfaToken, setMfaLoginToken] = useState('');
  const [mfaCode, setMfaLoginCode] = useState('');

  // Loading & Alert state
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isMfaRequired) {
      // Submit MFA Code
      const res = await loginMfa(mfaToken, mfaCode, rememberMe);
      setIsLoading(false);

      if (res.success && res.data?.access_token) {
        localStorage.setItem('idp_token', res.data.access_token);
        localStorage.setItem('idp_refresh_token', res.data.refresh_token || '');
        setAlert({
          isOpen: true,
          title: 'Success',
          message: 'Authenticated successfully!',
          type: 'success',
        });
        setTimeout(() => {
          onLoginSuccess(res.data.access_token);
        }, 1500);
      } else {
        setAlert({
          isOpen: true,
          title: 'MFA Error',
          message: res.message || 'Invalid verification code.',
          type: 'error',
        });
      }
    } else {
      // Submit normal Login
      const res = await loginUser(email, password, rememberMe);
      setIsLoading(false);

      if (res.success) {
        if (res.data?.mfa_required) {
          setIsMfaRequired(true);
          setMfaLoginToken(res.data.mfa_token);
          setAlert({
            isOpen: true,
            title: 'MFA Verification',
            message: 'Multi-factor authentication is active on your profile. Please enter your 6-digit code.',
            type: 'info',
          });
        } else if (res.data?.access_token) {
          localStorage.setItem('idp_token', res.data.access_token);
          localStorage.setItem('idp_refresh_token', res.data.refresh_token || '');
          setAlert({
            isOpen: true,
            title: 'Success',
            message: 'Authenticated successfully!',
            type: 'success',
          });
          setTimeout(() => {
            onLoginSuccess(res.data.access_token);
          }, 1500);
        }
      } else {
        const isUnverified = res._status === 403 || res.message?.toLowerCase().includes('verify');
        const isSuspended = res.message?.toLowerCase().includes('suspended');
        const isBanned = res.message?.toLowerCase().includes('banned');
        
        let alertTitle = 'Authentication Error';
        let alertMessage = res.message || 'Invalid email or password combination.';
        let customAction = null;

        if (isUnverified) {
          alertTitle = 'Email Unverified';
          customAction = {
            label: 'Verify Email Address Now',
            onClick: () => {
              onNavigateToVerifyEmail(email);
            }
          };
        } else if (isSuspended) {
          alertTitle = 'Account Suspended';
          alertMessage = 'Your account has been temporarily suspended due to a policy violation or administrator action. Please contact support to resolve this issue.';
        } else if (isBanned) {
          alertTitle = 'Account Banned';
          alertMessage = 'Your account has been permanently banned from the identity directory. Access is strictly denied.';
        }

        setAlert({
          isOpen: true,
          title: alertTitle,
          message: alertMessage,
          type: 'error',
          customAction: customAction
        });
      }
    }
  };

  return (
    <AuthLayouts>
      <div className="w-full min-h-screen flex lg:grid lg:grid-cols-2 items-stretch relative">
        <AuthBrandPanel
          headline={`Secure your\ndigital identity.`}
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
                {isMfaRequired ? 'Enter MFA Code' : 'Welcome Back'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1.5 font-sans">
                {isMfaRequired 
                  ? 'Verify authentication with your 6-digit MFA app code.' 
                  : 'Sign in to access your secure dashboard registry.'
                }
              </p>
            </div>

            {!isMfaRequired ? (
              <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="mt-1 block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all text-slate-900 dark:text-white"
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
                    className="mt-1 block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between py-1 select-none">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-200 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 accent-indigo-650 bg-white/50"
                    />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isLoading && (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Sign In</span>
                </button>
              </form>
            ) : (
              <VerificationCodeInput
                value={mfaCode}
                onChange={setMfaLoginCode}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                btnText="Verify & Sign In"
                cancelText="Back to Login"
                onCancel={() => setIsMfaRequired(false)}
              />
            )}

            <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => onNavigateToResetPassword(email)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
              <button
                onClick={onNavigateToRegister}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Don't have an account? Sign Up
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
        customAction={alert.customAction}
      />
    </AuthLayouts>
  );
};

export default Login;
