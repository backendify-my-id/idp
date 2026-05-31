import React, { useState } from 'react';
import { loginUser, loginMfa } from '../services/api';
import AlertModal from '../components/AlertModal';
import AuthLayouts from '../layouts/AuthLayouts';

const Login = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
      const res = await loginMfa(mfaToken, mfaCode);
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
      const res = await loginUser(email, password);
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
        setAlert({
          isOpen: true,
          title: 'Authentication Error',
          message: res.message || 'Invalid email or password combination.',
          type: 'error',
        });
      }
    }
  };

  return (
    <AuthLayouts>
      <div className="w-full min-h-screen flex lg:grid lg:grid-cols-2 items-stretch relative">
        {/* Left Side: Brand Panel */}
        <div className="hidden lg:flex flex-col justify-between relative overflow-hidden w-full h-full min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-12 py-14 select-none">
          <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-100px] right-[-60px] w-[360px] h-[360px] rounded-full bg-purple-500/25 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-base tracking-wider">B</span>
            </div>
            <span className="text-white font-black text-lg tracking-tight">Backendify IdP</span>
          </div>

          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm self-start">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/80 text-[10px] font-extrabold uppercase tracking-widest">Identity Provider</span>
              </div>
              <div>
                <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
                  Secure your<br />
                  <span className="text-indigo-200">digital identity.</span>
                </h2>
                <p className="text-indigo-200/70 text-sm font-semibold mt-4 leading-relaxed max-w-xs">
                  Enterprise-grade authentication with real-time analytics, OIDC, and multi-factor security.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-white/30 text-[10px] font-semibold">
              © 2026 Backendify — Built with React & Vite
            </p>
          </div>
        </div>

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
                {isMfaRequired ? 'Enter MFA Code' : 'Welcome Back'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1.5">
                {isMfaRequired 
                  ? 'Verify authentication with your 6-digit MFA app code.' 
                  : 'Sign in to access your secure dashboard registry.'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isMfaRequired ? (
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
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-left">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaLoginCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="mt-1 block w-full text-center tracking-[0.5em] placeholder-slate-350 text-2xl font-bold px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm rounded-2xl transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isLoading && (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {isMfaRequired ? 'Verify & Sign In' : 'Sign In'}
              </button>
            </form>

            <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex flex-col items-center gap-3">
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
      />
    </AuthLayouts>
  );
};

export default Login;
