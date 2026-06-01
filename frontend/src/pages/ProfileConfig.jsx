import React, { useState } from 'react';
import { initiateEmailChange, confirmEmailChange } from '../services/api';

const ProfileConfig = ({
  profile,
  setProfile,
  onSubmitProfile,
  isLoadingProfile,
  token,
  currentEmail,
  onEmailChanged,
  setAlert
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeToken, setEmailChangeToken] = useState('');
  const [isInitiatingEmail, setIsInitiatingEmail] = useState(false);
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);

  const handleInitiateEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) {
      setAlert({ isOpen: true, title: 'Invalid Email', message: 'Please enter a different email address.', type: 'error' });
      return;
    }

    setIsInitiatingEmail(true);
    const res = await initiateEmailChange(token, newEmail);
    setIsInitiatingEmail(false);

    if (res.success) {
      setIsEmailVerificationPending(true);
      setAlert({
        isOpen: true,
        title: 'Verification Dispatched',
        message: 'A secure verification token has been generated and sent to your new email. Please verify to complete the change.',
        type: 'success'
      });
    } else {
      setAlert({ isOpen: true, title: 'Request Failed', message: res.message, type: 'error' });
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    if (!emailChangeToken) {
      setAlert({ isOpen: true, title: 'Token Required', message: 'Please enter the verification token sent to your new email.', type: 'error' });
      return;
    }

    setIsConfirmingEmail(true);
    const res = await confirmEmailChange(token, emailChangeToken);
    setIsConfirmingEmail(false);

    if (res.success) {
      onEmailChanged(newEmail);
      setIsEmailVerificationPending(false);
      setNewEmail('');
      setEmailChangeToken('');
      setAlert({
        isOpen: true,
        title: 'Email Updated',
        message: 'Your login and profile email has been updated successfully. Please use your new email next time you sign in.',
        type: 'success'
      });
    } else {
      setAlert({ isOpen: true, title: 'Verification Failed', message: res.message, type: 'error' });
    }
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

          {!isEmailVerificationPending ? (
            <form onSubmit={handleInitiateEmailChange} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isInitiatingEmail}
                className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isInitiatingEmail && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                <span>Initiate Email Change</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmEmailChange} className="p-6 border border-amber-100 dark:border-slate-800/80 rounded-3xl bg-amber-50/10 dark:bg-slate-950/10 space-y-4">
              <h5 className="font-extrabold text-xs text-amber-850 dark:text-amber-400 uppercase tracking-wider">
                Double-Verification Pending
              </h5>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                We have generated a secure authorization token. Please check your new inbox (<strong className="text-slate-700 dark:text-slate-200">{newEmail}</strong>) and paste the token below.
              </p>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-wider mb-2">
                  Verification Token
                </label>
                <input
                  type="text"
                  required
                  value={emailChangeToken}
                  onChange={(e) => setEmailChangeToken(e.target.value)}
                  placeholder="Paste secure verification token..."
                  className="w-full px-4 py-3 border border-amber-250 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isConfirmingEmail}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isConfirmingEmail && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  <span>Verify & Update Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEmailVerificationPending(false);
                    setEmailChangeToken('');
                  }}
                  className="px-5 py-3 border rounded-2xl text-xs font-extrabold uppercase text-slate-550 dark:text-slate-400 cursor-pointer"
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
