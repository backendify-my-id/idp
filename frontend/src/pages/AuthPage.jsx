import React from 'react';
import LoginForm from '../components/LoginForm';
import MfaVerifyForm from '../components/MfaVerifyForm';
import OtpVerifyForm from '../components/OtpVerifyForm';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import ResetPasswordForm from '../components/ResetPasswordForm';

const AuthPage = ({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  otp,
  setOtp,
  isSignUp,
  setIsSignUp,
  isVerifying,
  setIsVerifying,
  isMfaVerifyingLogin,
  setIsMfaVerifyingLogin,
  mfaLoginCode,
  setMfaLoginCode,
  isForgotPassword,
  setIsForgotPassword,
  isResetPassword,
  setIsResetPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  alert,
  setAlert,
  oidcParams,
  lockoutSeconds,
  formatLockoutTime,
  handleSubmit,
  handleMfaLoginSubmit,
  handleVerifyOTP,
  handleResendOTP,
  handleForgotPasswordSubmit,
  handleResetPasswordSubmit,
}) => {
  return (
    <div className="glass-card p-8 sm:p-10 rounded-3xl w-full max-w-md transition-all duration-500 transform animate-scale-up space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-150 mx-auto mb-4 animate-scale-up">
          <span className="text-white font-black text-xl tracking-wider">B</span>
        </div>
        <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 to-indigo-955 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
          {isForgotPassword
            ? 'Forgot Password'
            : isResetPassword
            ? 'Reset Password'
            : isMfaVerifyingLogin
            ? 'Two-Factor Auth'
            : isVerifying
            ? 'Verify Your Email'
            : isSignUp
            ? 'Create Account'
            : oidcParams
            ? 'Authorize App'
            : 'Welcome Back'}
        </h2>
        {isMfaVerifyingLogin ? (
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs leading-relaxed font-medium">
            Two-Factor Authentication is active. Please enter the 6-digit code from your authenticator app.
          </p>
        ) : isVerifying ? (
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs leading-relaxed font-medium">
            We have sent a 6-digit OTP code to <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{email}</strong>. Enter it below to verify.
          </p>
        ) : oidcParams ? (
          <div className="mt-3 p-3 bg-indigo-50/70 dark:bg-indigo-950/20 backdrop-blur-sm rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-left">
            <p className="text-indigo-955 dark:text-indigo-300 font-extrabold text-xs">Authorization Request</p>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 font-semibold leading-relaxed">
              Authorize client <code className="bg-indigo-100 dark:bg-indigo-955 px-1.5 py-0.5 rounded font-bold text-indigo-700 dark:text-indigo-300">{oidcParams.client_id}</code> to access your profile data.
            </p>
          </div>
        ) : (
          <p className="text-slate-450 dark:text-slate-400 mt-1.5 text-xs font-bold uppercase tracking-wider">
            {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
        )}
      </div>

      {/* Inline Error Alert Box */}
      {alert.isOpen && alert.type === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 flex gap-3 items-start animate-scale-up relative">
          <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <div className="grow text-left">
            <h4 className="text-sm font-extrabold text-rose-800 dark:text-rose-455">{alert.title}</h4>
            <p className="text-xs text-rose-600 dark:text-rose-350 mt-1 leading-relaxed font-semibold">
              {lockoutSeconds > 0 && alert.title === 'Account Locked'
                ? formatLockoutTime(lockoutSeconds)
                : alert.message}
            </p>
          </div>
          <button
            onClick={() => setAlert({ ...alert, isOpen: false })}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors focus:outline-none shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}

      {isMfaVerifyingLogin ? (
        <MfaVerifyForm
          handleMfaLoginSubmit={handleMfaLoginSubmit}
          mfaLoginCode={mfaLoginCode}
          setMfaLoginCode={setMfaLoginCode}
          setIsMfaVerifyingLogin={setIsMfaVerifyingLogin}
        />
      ) : isForgotPassword ? (
        <ForgotPasswordForm
          handleForgotPasswordSubmit={handleForgotPasswordSubmit}
          email={email}
          setEmail={setEmail}
          setIsForgotPassword={setIsForgotPassword}
          setAlert={setAlert}
          alert={alert}
        />
      ) : isResetPassword ? (
        <ResetPasswordForm
          handleResetPasswordSubmit={handleResetPasswordSubmit}
          email={email}
          otp={otp}
          setOtp={setOtp}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmNewPassword={confirmNewPassword}
          setConfirmNewPassword={setConfirmNewPassword}
          setIsResetPassword={setIsResetPassword}
          setIsForgotPassword={setIsForgotPassword}
          setAlert={setAlert}
          alert={alert}
        />
      ) : isVerifying ? (
        <OtpVerifyForm
          handleVerifyOTP={handleVerifyOTP}
          email={email}
          setEmail={setEmail}
          otp={otp}
          setOtp={setOtp}
          handleResendOTP={handleResendOTP}
          setIsVerifying={setIsVerifying}
          setIsSignUp={setIsSignUp}
        />
      ) : (
        <LoginForm
          handleSubmit={handleSubmit}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isSignUp={isSignUp}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          oidcParams={oidcParams}
        />
      )}

      {!isVerifying && !isMfaVerifyingLogin && (
        <div className="mt-6 text-center border-t border-slate-150/85 dark:border-slate-800/40 pt-5 flex flex-col gap-3">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsForgotPassword(false);
              setIsResetPassword(false);
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-xs font-bold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-wider transition-colors cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>

          {!isSignUp && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsVerifying(true);
                  setOtp('');
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider transition-all focus:outline-none cursor-pointer"
              >
                Unverified account? Verify email
              </button>

              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setOtp('');
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 uppercase tracking-wider transition-all focus:outline-none cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthPage;
