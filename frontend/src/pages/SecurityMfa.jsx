import React, { useState, useEffect } from 'react';
import { getSessions, revokeSession, revokeAllOtherSessions } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import VerificationCodeInput from '../components/VerificationCodeInput';

const SecurityMfa = ({
  token,
  setAlert,
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
  onMfaDisableSubmit,
  backupCodes,
  setBackupCodes
}) => {
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Custom Modal Confirmation State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: '', // 'revoke_single' or 'revoke_all'
    targetId: null,
    targetName: ''
  });

  // Fetch active sessions
  const fetchSessions = async () => {
    if (!token) return;
    setIsLoadingSessions(true);
    const res = await getSessions(token);
    setIsLoadingSessions(false);
    if (res.success) {
      setSessions(res.data || []);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [token]);

  const triggerRevokeSingleConfirm = (sessionId, appName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Session',
      message: `Are you sure you want to terminate your active login session on "${appName}"? This device will be logged out immediately.`,
      actionType: 'revoke_single',
      targetId: sessionId,
      targetName: appName
    });
  };

  const triggerRevokeAllConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Log Out Other Devices',
      message: 'Are you sure you want to terminate all other active login sessions? Every other connected device will be logged out instantly.',
      actionType: 'revoke_all',
      targetId: null,
      targetName: ''
    });
  };

  const handleConfirmAction = async () => {
    const { actionType, targetId, targetName } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    if (actionType === 'revoke_single') {
      const res = await revokeSession(token, targetId);
      if (res.success) {
        setAlert({
          isOpen: true,
          title: 'Session Revoked',
          message: `Device session on "${targetName}" has been successfully logged out.`,
          type: 'info'
        });
        fetchSessions();
      } else {
        setAlert({ isOpen: true, title: 'Revocation Error', message: res.message, type: 'error' });
      }
    } else if (actionType === 'revoke_all') {
      const res = await revokeAllOtherSessions(token);
      if (res.success) {
        setAlert({
          isOpen: true,
          title: 'Sessions Cleared',
          message: 'All other active sessions have been successfully revoked.',
          type: 'success'
        });
        fetchSessions();
      } else {
        setAlert({ isOpen: true, title: 'Revocation Error', message: res.message, type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-10 animate-fade-in text-left">
      {/* Multi-Factor Authentication Section */}
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Security Settings</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Secure your identity control panel registry with advanced Multi-Factor Authentication (MFA).
          </p>
        </div>

        {/* 2FA Status Panel */}
        {!mfaEnabled ? (
          <div className="space-y-4 max-w-xl">
            <p className="text-xs text-slate-550 dark:text-slate-455 font-semibold leading-relaxed">
              Highly recommended! Enabling two-factor authentication prevents unauthorized access to your registered client applications and role promoter controls.
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
                
                <VerificationCodeInput
                  value={mfaVerifyCode}
                  onChange={setMfaVerifyCode}
                  onSubmit={onMfaEnableSubmit}
                  btnText="Verify & Activate"
                />
                
                <button
                  type="button"
                  onClick={() => setIsSettingUpMfa(false)}
                  className="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 transition-colors block mt-2"
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
              <div className="p-6 border border-rose-100 dark:border-slate-800 rounded-3xl bg-rose-50/10 dark:bg-slate-950/10 space-y-4 max-w-sm">
                <h5 className="font-extrabold text-xs text-rose-900 dark:text-rose-455 uppercase tracking-wider">
                  Confirm MFA Deactivation
                </h5>
                <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                  Submit an authenticator verification code to deactivate MFA.
                </p>
                <VerificationCodeInput
                  value={mfaVerifyCode}
                  onChange={setMfaVerifyCode}
                  onSubmit={onMfaDisableSubmit}
                  btnText="Verify & Disable"
                  cancelText="Cancel"
                  onCancel={() => setIsDisablingMfa(false)}
                />
              </div>
            )}
          </div>
        )}

        {/* Emergency Backup Codes Box */}
        {backupCodes && backupCodes.length > 0 && (
          <div className="p-6 border border-amber-200 dark:border-amber-900/40 rounded-3xl bg-amber-50/15 dark:bg-amber-950/10 max-w-xl space-y-4">
            <div>
              <h5 className="font-black text-xs text-amber-800 dark:text-amber-455 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4.5 h-4.5 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Emergency Backup Codes
              </h5>
              <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
                Save these codes immediately in a safe offline space. Each code can be used exactly once to bypass MFA if you lose your phone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-white dark:bg-slate-950/50 p-4 border border-slate-100 dark:border-slate-900 rounded-2xl">
              {backupCodes.map((code, idx) => (
                <code key={idx} className="text-xs font-bold text-center text-slate-700 dark:text-slate-300 tracking-widest select-all">
                  {code}
                </code>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                  alert('Backup codes copied to clipboard.');
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-extrabold uppercase hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
              >
                Copy Codes
              </button>
              <button
                onClick={() => setBackupCodes([])}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white rounded-xl text-[10px] font-extrabold uppercase cursor-pointer"
              >
                Done / I Saved Them
              </button>
            </div>
          </div>
        )}
      </div>

      <hr className="border-slate-100 dark:border-slate-800/80" />

      {/* Active Device Session Management Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Active Device Sessions</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Monitor and terminate active connections accessing your identity profile.
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={triggerRevokeAllConfirm}
              className="py-2.5 px-4 border border-rose-200 hover:border-rose-300 dark:border-rose-900/40 dark:hover:border-rose-900/80 text-rose-650 dark:text-rose-455 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
            >
              Log Out Other Devices
            </button>
          )}
        </div>

        {isLoadingSessions ? (
          <div className="flex justify-center py-10">
            <span className="w-6 h-6 rounded-full border-2 border-indigo-600/40 border-t-indigo-600 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">No Active Sessions Recorded</p>
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-100 dark:border-slate-800/60 rounded-3xl bg-white/40 dark:bg-slate-900/20 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60">
                    <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">App Name / Portal</th>
                    <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">IP Address</th>
                    <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Last Active / Created</th>
                    <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Browser / System</th>
                    <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{sess.app_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-[11px] font-bold text-slate-600 dark:text-slate-400 select-all">{sess.ip_address}</code>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-455">
                        {sess.created_at}
                      </td>
                      <td className="px-5 py-4 text-[10px] font-semibold text-slate-500 dark:text-slate-455 max-w-xs truncate" title={sess.user_agent}>
                        {sess.user_agent}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => triggerRevokeSingleConfirm(sess.id, sess.app_name)}
                          className="py-1.5 px-3 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200 dark:border-slate-800 hover:border-rose-200 hover:text-rose-600 rounded-xl text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition-colors text-slate-650 dark:text-slate-400"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reusable Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
        confirmText="Yes, Log Out"
        cancelText="Cancel"
        targetMetadata={confirmModal.actionType === 'revoke_single' ? { label: 'Device', value: confirmModal.targetName } : null}
      />
    </div>
  );
};

export default SecurityMfa;
