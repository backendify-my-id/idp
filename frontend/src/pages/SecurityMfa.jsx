import React from 'react';

const SecurityMfa = ({
  mfaEnabled,
  isSettingUpMfa,
  setIsSettingUpMfa,
  mfaSetupData,
  mfaVerifyCode,
  setMfaVerifyCode,
  isDisablingMfa,
  setIsDisablingMfa,
  onMfaInit,
  onMfaEnableSubmit,
  onMfaDisableSubmit
}) => {
  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Security Settings</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
          Secure your identity control panel registry with advanced Multi-Factor Authentication (MFA).
        </p>
      </div>

      {!mfaEnabled ? (
        <div className="space-y-4 max-w-xl">
          <p className="text-xs text-slate-550 dark:text-slate-450 font-semibold leading-relaxed">
            highly recommended! Enabling two-factor authentication prevents unauthorized access to your registered client applications and role promoter controls.
          </p>
          
          {!isSettingUpMfa ? (
            <button
              onClick={onMfaInit}
              className="py-3.5 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-md text-xs font-extrabold uppercase tracking-wider cursor-pointer active:scale-98 transition-transform"
            >
              Enable 2FA Protection
            </button>
          ) : (
            <div className="p-6 border border-indigo-100 dark:border-slate-800 rounded-3xl bg-indigo-50/20 dark:bg-slate-950/20 backdrop-blur space-y-4 text-center max-w-md">
              <h5 className="font-extrabold text-xs text-indigo-900 dark:text-indigo-400 uppercase tracking-wider text-left">
                Configure Authenticator
              </h5>
              <p className="text-[10px] text-slate-500 leading-relaxed text-left font-semibold">
                Scan this QR using your authenticator application (e.g. Google Authenticator) and enter the 6-digit code.
              </p>
              
              <div className="flex justify-center p-3 bg-white border border-indigo-100 rounded-2xl w-fit mx-auto shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(mfaSetupData.url)}`}
                  alt="MFA QR Code"
                  className="w-36 h-36"
                />
              </div>
              
              <div className="text-left space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                <p className="text-[8px] uppercase font-extrabold text-indigo-500 tracking-wider">Secret Key</p>
                <code className="text-xs font-bold select-all break-all block text-indigo-900 dark:text-indigo-300">
                  {mfaSetupData.secret}
                </code>
              </div>
              
              <form onSubmit={onMfaEnableSubmit} className="flex gap-3">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaVerifyCode}
                  onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="grow text-center tracking-[0.4em] text-md font-bold rounded-xl px-2 py-2 border bg-white dark:bg-slate-900"
                />
                <button
                  type="submit"
                  className="py-2.5 px-4 btn-primary text-xs font-bold text-white rounded-xl cursor-pointer"
                >
                  Verify & Active
                </button>
              </form>
              
              <button
                type="button"
                onClick={() => setIsSettingUpMfa(false)}
                className="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 transition-colors"
              >
                Cancel Setup
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-xl">
          <div className="flex gap-4 items-center p-5 border border-emerald-250/30 dark:border-emerald-900/35 bg-emerald-50/20 dark:bg-emerald-950/10 backdrop-blur rounded-3xl">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">MFA Security Active</p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">
                Two-Factor Authentication is actively guarding identity tokens and OIDC registries.
              </p>
            </div>
          </div>
          
          {!isDisablingMfa ? (
            <button
              onClick={() => setIsDisablingMfa(true)}
              className="py-3 px-5 bg-rose-50/80 hover:bg-rose-100 text-rose-650 border border-rose-200/50 dark:border-rose-900/20 rounded-2xl text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              Disable 2FA Protection
            </button>
          ) : (
            <form onSubmit={onMfaDisableSubmit} className="p-6 border border-rose-100 dark:border-slate-800 rounded-3xl bg-rose-50/10 dark:bg-slate-950/10 space-y-4 max-w-sm">
              <h5 className="font-extrabold text-xs text-rose-900 dark:text-rose-455 uppercase tracking-wider">
                Confirm MFA Deactivation
              </h5>
              <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                Submit an authenticator verification code to deactivate MFA.
              </p>
              <input
                type="text"
                required
                maxLength={6}
                value={mfaVerifyCode}
                onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center tracking-[0.4em] text-md font-bold px-3 py-2 border rounded-xl bg-white dark:bg-slate-900"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Verify & Disable
                </button>
                <button
                  type="button"
                  onClick={() => setIsDisablingMfa(false)}
                  className="px-4 py-2.5 border rounded-xl text-xs font-bold text-slate-550 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityMfa;
