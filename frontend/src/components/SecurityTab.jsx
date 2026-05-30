import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SecurityTab = ({
  mfaEnabled,
  isSettingUpMfa,
  setIsSettingUpMfa,
  isDisablingMfa,
  setIsDisablingMfa,
  mfaSetupData,
  mfaVerifyCode,
  setMfaVerifyCode,
  handleSetupMfa,
  handleEnableMfaSubmit,
  handleDisableMfaSubmit,
  getQrCodeSrc,
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-4 mb-2">
        <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">{t('security.title')}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{t('security.subtitle')}</p>
      </div>

      {!mfaEnabled ? (
        /* MFA Setup Inactive */
        <div className="space-y-5 text-left">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            {t('security.mfaWarning')}
          </p>

          {!isSettingUpMfa ? (
            <button
              type="button"
              onClick={handleSetupMfa}
              className="py-3.5 px-6 bg-purple-650 hover:bg-purple-700 text-white rounded-2xl shadow-md shadow-purple-150 dark:shadow-none text-xs font-extrabold uppercase tracking-wider transition-all focus:outline-none cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              {t('security.enableMfaBtn')}
            </button>
          ) : (
            /* MFA Setup In Progress */
            <div className="p-6 border border-indigo-100 dark:border-slate-800 rounded-3xl bg-indigo-50/20 dark:bg-slate-950/20 backdrop-blur-sm space-y-5 animate-scale-up text-center">
              <h5 className="font-extrabold text-xs text-indigo-955 dark:text-indigo-400 uppercase tracking-wider text-left">{t('security.mfaSetupTitle')}</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                {t('security.mfaSetupSteps')}
              </p>

              <div className="flex justify-center p-3 bg-white rounded-2xl border border-indigo-100 w-fit mx-auto shadow-sm">
                <img src={getQrCodeSrc()} alt="MFA QR Code" className="w-36 h-36" />
              </div>

              <div className="text-left space-y-1 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-inner">
                <p className="text-[9px] uppercase font-extrabold text-indigo-500 tracking-wider">{t('security.mfaSetupSecret')}</p>
                <code className="text-xs font-bold text-indigo-900 dark:text-indigo-300 tracking-wider select-all break-all block">{mfaSetupData.secret}</code>
              </div>

              <form onSubmit={handleEnableMfaSubmit} className="flex gap-3 items-end justify-center w-full max-w-sm mx-auto">
                <div className="grow">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaVerifyCode}
                    onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.4em] placeholder-slate-400 text-md font-bold px-3 py-2.5 border border-slate-200 bg-white rounded-xl transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="py-3 px-5 bg-indigo-650 hover:bg-indigo-705 text-white font-extrabold text-xs rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer active:scale-98"
                >
                  {t('security.verifyBtn')}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setIsSettingUpMfa(false)}
                className="text-[10px] uppercase tracking-wider font-extrabold text-slate-455 hover:text-slate-650 dark:hover:text-slate-200 block mx-auto mt-2 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* MFA ENABLED VIEW */
        <div className="space-y-5 text-left animate-fade-in">
          <div className="flex gap-4.5 items-center p-5 border border-emerald-150 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10 backdrop-blur-sm rounded-3xl">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-955 dark:text-emerald-400 uppercase tracking-wider">{t('security.mfaStatus')}: {t('common.success')}</p>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                {t('security.mfaEnabledText')}
              </p>
            </div>
          </div>

          {!isDisablingMfa ? (
            <button
              type="button"
              onClick={() => {
                setIsDisablingMfa(true);
                setMfaVerifyCode('');
              }}
              className="py-3 px-5 bg-rose-50/50 hover:bg-rose-100/80 border border-rose-100 dark:border-rose-900/30 text-rose-600 rounded-2xl text-xs font-bold transition-all focus:outline-none cursor-pointer"
            >
              {t('security.disableMfaBtn')}
            </button>
          ) : (
            /* MFA Disable Confirmation */
            <div className="p-6 border border-rose-100 dark:border-slate-800 rounded-3xl bg-rose-50/10 dark:bg-slate-950/20 backdrop-blur-sm space-y-4 animate-scale-up text-center">
              <h5 className="font-extrabold text-xs text-rose-955 dark:text-rose-400 uppercase tracking-wider text-left">{t('security.disableMfaConfirmTitle')}</h5>
              <p className="text-xs text-slate-400 leading-relaxed text-left font-semibold">
                {t('security.disableMfaConfirmText')}
              </p>

              <form onSubmit={handleDisableMfaSubmit} className="flex gap-3 items-end justify-center w-full max-w-sm mx-auto">
                <div className="grow">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaVerifyCode}
                    onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.4em] placeholder-slate-300 text-md font-bold px-3 py-2.5 border border-slate-200 bg-white rounded-xl transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="py-3 px-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer active:scale-98"
                >
                  {t('security.disableMfaSubmitBtn')}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setIsDisablingMfa(false)}
                className="text-[10px] uppercase tracking-wider font-extrabold text-slate-455 hover:text-rose-500 block mx-auto mt-2 cursor-pointer transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityTab;
