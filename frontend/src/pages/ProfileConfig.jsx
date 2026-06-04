import React, { useState } from 'react';
import {
  initiateEmailChangeStep1,
  verifyEmailChangeStep1,
  checkNewEmailStep2,
  confirmEmailChangeStep3,
  changePasswordStep1,
  changePasswordStep2Mfa,
  changePasswordStep3Update
} from '../services/api';

const ProfileConfig = ({
  profile,
  setProfile,
  onSubmitProfile,
  isLoadingProfile,
  token,
  currentEmail,
  onEmailChanged,
  setAlert,
  onLogout
}) => {
  const [flowStep, setFlowStep] = useState('idle'); // 'idle' | 'step1_otp' | 'step2_new' | 'step3_otp'
  const [tempToken, setTempToken] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password Change Flow States:
  const [pwdStep, setPwdStep] = useState('idle');
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdMfaCode, setPwdMfaCode] = useState('');
  const [pwdTempToken, setPwdTempToken] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handlePwdStartFlow = () => {
    setPwdStep('step1_verify');
    setPwdOld('');
    setPwdNew('');
    setPwdConfirm('');
    setPwdMfaCode('');
    setPwdTempToken('');
  };

  const handlePwdVerifyOldSubmit = async (e) => {
    e.preventDefault();
    if (!pwdOld) {
      setAlert({ isOpen: true, title: 'Input Required', message: 'Please enter your current password.', type: 'error' });
      return;
    }

    setPwdLoading(true);
    const res = await changePasswordStep1(token, pwdOld);
    setPwdLoading(false);

    if (res.success && res.data) {
      setPwdTempToken(res.data.temp_token);
      if (res.data.mfa_required) {
        setPwdStep('step2_mfa');
        setAlert({
          isOpen: true,
          title: 'MFA Verification Required',
          message: 'Multi-Factor Authentication is enabled on this account. Please enter your 6-digit OTP code or an emergency backup code.',
          type: 'info'
        });
      } else {
        setPwdStep('step3_update');
      }
    } else {
      setAlert({ isOpen: true, title: 'Verification Failed', message: res.message || 'Incorrect password.', type: 'error' });
    }
  };

  const handlePwdMfaSubmit = async (e) => {
    e.preventDefault();
    if (!pwdMfaCode) {
      setAlert({ isOpen: true, title: 'Code Required', message: 'Please enter your MFA verification code.', type: 'error' });
      return;
    }

    setPwdLoading(true);
    const res = await changePasswordStep2Mfa(token, pwdTempToken, pwdMfaCode);
    setPwdLoading(false);

    if (res.success) {
      setPwdStep('step3_update');
    } else {
      setAlert({ isOpen: true, title: 'MFA Code Invalid', message: res.message || 'Please check your authenticator code.', type: 'error' });
    }
  };

  const handlePwdUpdateSubmit = async (e) => {
    e.preventDefault();
    if (pwdNew.length < 8) {
      setAlert({ isOpen: true, title: 'Weak Password', message: 'Your new password must be at least 8 characters long.', type: 'error' });
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setAlert({ isOpen: true, title: 'Mismatched Passwords', message: 'The new password and password confirmation do not match.', type: 'error' });
      return;
    }

    setPwdLoading(true);
    const res = await changePasswordStep3Update(token, pwdTempToken, pwdNew);
    setPwdLoading(false);

    if (res.success) {
      setAlert({
        isOpen: true,
        title: 'Password Updated',
        message: 'Your password has been changed successfully. For security reasons, you have been logged out of all devices. Please sign in again with your new credentials.',
        type: 'success'
      });
      // Force user to log in again on all devices
      setTimeout(() => {
        onLogout();
      }, 3500);
    } else {
      setAlert({ isOpen: true, title: 'Update Failed', message: res.message, type: 'error' });
    }
  };

  const handlePwdResetFlow = () => {
    setPwdStep('idle');
    setPwdOld('');
    setPwdNew('');
    setPwdConfirm('');
    setPwdMfaCode('');
    setPwdTempToken('');
  };

  const handleStartFlow = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    const res = await initiateEmailChangeStep1(token);
    setIsLoading(false);

    if (res.success) {
      setFlowStep('step1_otp');
      setOtpCode('');
      setAlert({
        isOpen: true,
        title: 'OTP Sent',
        message: 'A 6-digit verification code has been sent to your current email address. Please verify to continue.',
        type: 'success'
      });
    } else {
      setAlert({ isOpen: true, title: 'Request Failed', message: res.message, type: 'error' });
    }
  };

  const handleVerifyOldOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setAlert({ isOpen: true, title: 'Invalid Code', message: 'Please enter a valid 6-digit OTP code.', type: 'error' });
      return;
    }

    setIsLoading(true);
    const res = await verifyEmailChangeStep1(token, otpCode);
    setIsLoading(false);

    if (res.success && res.data?.temp_token) {
      setTempToken(res.data.temp_token);
      setFlowStep('step2_new');
      setOtpCode('');
      setAlert({
        isOpen: true,
        title: 'Identity Verified',
        message: 'Your identity has been verified. You may now input your new email address.',
        type: 'success'
      });
    } else {
      setAlert({ isOpen: true, title: 'Verification Failed', message: res.message || 'Incorrect OTP code.', type: 'error' });
    }
  };

  const handleCheckNewEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) {
      setAlert({ isOpen: true, title: 'Invalid Email', message: 'Please enter a different email address.', type: 'error' });
      return;
    }

    setIsLoading(true);
    const res = await checkNewEmailStep2(token, tempToken, newEmail);
    setIsLoading(false);

    if (res.success) {
      setFlowStep('step3_otp');
      setOtpCode('');
      setAlert({
        isOpen: true,
        title: 'Email Available',
        message: 'The new email is available. A verification code has been sent to it.',
        type: 'success'
      });
    } else {
      setAlert({ isOpen: true, title: 'Check Failed', message: res.message, type: 'error' });
    }
  };

  const handleConfirmNewEmail = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setAlert({ isOpen: true, title: 'Invalid Code', message: 'Please enter a valid 6-digit OTP code.', type: 'error' });
      return;
    }

    setIsLoading(true);
    const res = await confirmEmailChangeStep3(token, tempToken, otpCode);
    setIsLoading(false);

    if (res.success) {
      onEmailChanged(newEmail);
      setFlowStep('idle');
      setNewEmail('');
      setTempToken('');
      setOtpCode('');
      setAlert({
        isOpen: true,
        title: 'Email Updated',
        message: 'Your account email has been updated successfully. Please use your new email next time you sign in.',
        type: 'success'
      });
    } else {
      setAlert({ isOpen: true, title: 'Verification Failed', message: res.message || 'Incorrect OTP code.', type: 'error' });
    }
  };

  const handleResetFlow = () => {
    setFlowStep('idle');
    setTempToken('');
    setNewEmail('');
    setOtpCode('');
  };

  return (
    <div className="space-y-10 animate-fade-in text-left">
      {/* Profile Details Form */}
      <form onSubmit={onSubmitProfile} className="space-y-6">
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Profile Configuration</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Manage your public identity card, avatar URL, and biographical statements.
          </p>
        </div>
        
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              placeholder="John Doe"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Avatar Image URL
            </label>
            <input
              type="url"
              value={profile.avatarUrl}
              onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Personal Bio
            </label>
            <textarea
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Introduce yourself to OIDC client integrations..."
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoadingProfile}
          className="px-6 py-3.5 btn-primary text-xs font-extrabold text-white uppercase tracking-wider rounded-2xl cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isLoadingProfile && (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          <span>Save Changes</span>
        </button>
      </form>

      <hr className="border-slate-100 dark:border-slate-800/80" />

      {/* Enterprise Double-Verification Email Change Flow */}
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Credential Security & Email Change</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Safely update your login email. Updates require multi-stage verification to protect against account takeover.
          </p>
        </div>

        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Current Email Address
            </label>
            <input
              type="email"
              disabled
              value={currentEmail}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/45 rounded-2xl text-xs font-bold text-slate-450 cursor-not-allowed"
            />
          </div>

          {flowStep === 'idle' && (
            <button
              type="button"
              onClick={handleStartFlow}
              disabled={isLoading}
              className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-650 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              <span>Change Email Address</span>
            </button>
          )}

          {flowStep === 'step1_otp' && (
            <form onSubmit={handleVerifyOldOtp} className="p-6 border border-indigo-250/20 dark:border-indigo-500/20 rounded-3xl bg-indigo-50/5 dark:bg-indigo-950/5 space-y-5 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h5 className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Step 1 of 3: Verify Identity
                </h5>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                We have generated a 6-digit OTP code and sent it to your current inbox. Please check your current email to confirm your identity.
              </p>
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  OTP Code (Current Email)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP..."
                  className="w-full max-w-xs px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 max-w-xs py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Verify Identity</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFlow}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-extrabold uppercase text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {flowStep === 'step2_new' && (
            <form onSubmit={handleCheckNewEmail} className="p-6 border border-teal-250/20 dark:border-teal-500/20 rounded-3xl bg-teal-50/5 dark:bg-teal-950/5 space-y-5 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <h5 className="font-extrabold text-xs text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  Step 2 of 3: Proposed New Email
                </h5>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Identity verified. Please enter the new email address you want to bind to your account.
              </p>
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Check & Send OTP</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFlow}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-extrabold uppercase text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {flowStep === 'step3_otp' && (
            <form onSubmit={handleConfirmNewEmail} className="p-6 border border-amber-250/20 dark:border-amber-500/20 rounded-3xl bg-amber-50/5 dark:bg-amber-950/5 space-y-5 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h5 className="font-extrabold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Step 3 of 3: Verify New Email
                </h5>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                A 6-digit OTP code has been sent to your proposed new email address (<strong className="text-slate-700 dark:text-slate-200">{newEmail}</strong>). Please enter the OTP to confirm ownership.
              </p>
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  OTP Code (New Email)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP..."
                  className="w-full max-w-xs px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                />
              </div>
            </form>
          )}
        </div>
      </div>

      <hr className="border-slate-100 dark:border-slate-800/80" />

      {/* Change Password Protection Section */}
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Change Password Protection</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Ensure your account remains safe. Password updates require old credential verification and MFA authorization (if enabled).
          </p>
        </div>

        <div className="space-y-4 max-w-xl">
          {pwdStep === 'idle' && (
            <button
              type="button"
              onClick={handlePwdStartFlow}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Change Account Password
            </button>
          )}

          {pwdStep === 'step1_verify' && (
            <form onSubmit={handlePwdVerifyOldSubmit} className="p-6 border border-slate-250/20 dark:border-slate-800 rounded-3xl bg-slate-50/5 dark:bg-slate-950/25 space-y-5 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                <h5 className="font-extrabold text-xs text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                  Verify Current Password
                </h5>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Please verify your identity by entering your current password below.
              </p>
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={pwdOld}
                  onChange={(e) => setPwdOld(e.target.value)}
                  placeholder="Enter current password..."
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-750 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {pwdLoading && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Verify Password</span>
                </button>
                <button
                  type="button"
                  onClick={handlePwdResetFlow}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {pwdStep === 'step2_mfa' && (
            <form onSubmit={handlePwdMfaSubmit} className="p-6 border border-purple-250/20 dark:border-purple-500/20 rounded-3xl bg-purple-50/5 dark:bg-purple-950/5 space-y-5 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <h5 className="font-extrabold text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  MFA Authentication Challenge
                </h5>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Multi-Factor Authentication is active. Enter the 6-digit OTP code from your authenticator app or one of your emergency backup codes.
              </p>
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  OTP or Backup Code
                </label>
                <input
                  type="text"
                  required
                  value={pwdMfaCode}
                  onChange={(e) => setPwdMfaCode(e.target.value)}
                  placeholder="Enter code..."
                  className="w-full max-w-xs px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 max-w-xs py-3 bg-purple-650 hover:bg-purple-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {pwdLoading && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Verify Identity</span>
                </button>
                <button
                  type="button"
                  onClick={handlePwdResetFlow}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-extrabold uppercase text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {pwdStep === 'step3_update' && (
            <form onSubmit={handlePwdUpdateSubmit} className="p-6 border border-emerald-250/20 dark:border-emerald-500/20 rounded-3xl bg-emerald-50/5 dark:bg-emerald-950/5 space-y-5 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h5 className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Update Account Password
                </h5>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Verification completed successfully. Please choose a strong new password (minimum 8 characters, uppercase, lowercase, numbers, and symbols).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Confirm new password..."
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-600/10"
                >
                  {pwdLoading && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Commit Password Change</span>
                </button>
                <button
                  type="button"
                  onClick={handlePwdResetFlow}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-extrabold uppercase text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileConfig;
