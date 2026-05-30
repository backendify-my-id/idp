import React, { useState } from 'react';
import OidcClientManager from '../components/OidcClientManager';
import UserManager from '../components/UserManager';
import ProfileTab from '../components/ProfileTab';
import SecurityTab from '../components/SecurityTab';
import { useLanguage } from '../context/LanguageContext';

const DashboardPage = ({
  profile,
  setProfile,
  roles,
  token,
  userId,
  email,
  mfaEnabled,
  isLoadingProfile,
  isSettingUpMfa,
  setIsSettingUpMfa,
  isDisablingMfa,
  setIsDisablingMfa,
  mfaSetupData,
  mfaVerifyCode,
  setMfaVerifyCode,
  handleLogout,
  handleUpdateProfile,
  handleSetupMfa,
  handleEnableMfaSubmit,
  handleDisableMfaSubmit,
  getInitials,
  getQrCodeSrc,
}) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'clients', 'users'
  const [visitedTabs, setVisitedTabs] = useState({
    profile: true,
    security: false,
    clients: false,
    users: false,
  });
  
  const { t } = useLanguage();

  const isAdmin = roles && roles.includes('admin');
  const isSupport = roles && (roles.includes('admin') || roles.includes('idp_support'));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => ({
      ...prev,
      [tab]: true,
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start px-4 transition-all duration-300 animate-scale-up overflow-x-hidden">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 shrink-0 glass-card p-5 lg:p-6 rounded-3xl flex flex-col gap-6 lg:space-y-6 lg:gap-0 overflow-hidden">
        <div className="flex flex-col gap-5 lg:space-y-6 lg:gap-0 w-full">
          {/* User Brief profile */}
          <div className="flex flex-row lg:flex-col items-center lg:text-center gap-4 pb-4 lg:pb-6 border-b border-slate-200/40 dark:border-slate-800/40 w-full lg:w-auto">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl border-2 border-indigo-500/80 shadow-md object-cover"
                onError={() => setProfile({ ...profile, avatarUrl: '' })}
              />
            ) : (
              <div className="w-12 h-12 lg:w-16 lg:h-16 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md text-white text-base lg:text-xl font-black">
                {getInitials()}
              </div>
            )}
            <div className="flex-1 lg:flex-initial text-left lg:text-center min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{profile.fullName || 'Identity User'}</h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider truncate block mt-0.5">{email}</span>
              
              {/* Minimalist Verified badge */}
              <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-full text-[9px] font-extrabold text-emerald-700 dark:text-emerald-450 uppercase tracking-wide">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></span>
                Verified
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="w-full overflow-x-auto scrollbar-none py-1">
            <nav className="flex flex-row lg:flex-col gap-1.5 min-w-max lg:min-w-0">
              <button
                type="button"
                onClick={() => handleTabChange('profile')}
                className={`flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                {t('nav.profile')}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('security')}
                className={`flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'security'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                {t('nav.security')}
              </button>

              {isSupport && (
                <div className="hidden lg:block pt-4 pb-1 border-t border-slate-200/40 dark:border-slate-800/40 mt-2">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 px-4">{t('nav.adminRoom')}</span>
                </div>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTabChange('clients')}
                  className={`flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'clients'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 dark:shadow-none'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                  </svg>
                  {t('nav.clients')}
                </button>
              )}

              {isSupport && (
                <button
                  type="button"
                  onClick={() => handleTabChange('users')}
                  className={`flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'users'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 dark:shadow-none'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H7m0 0v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  {t('nav.users')}
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Logout Bottom Button */}
        <button
          onClick={handleLogout}
          className="w-full lg:mt-6 flex items-center justify-center gap-2 px-4 py-3 border border-rose-250 dark:border-rose-900/35 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-98 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          {t('common.logout')}
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="grow w-full glass-card p-4 sm:p-10 rounded-3xl min-h-[480px]">
        {isLoadingProfile ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mt-4">Syncing Profile Details...</p>
          </div>
        ) : (
          <div className="animate-fade-in relative">
            {/* Tab: My Profile */}
            {visitedTabs.profile && (
              <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                <ProfileTab
                  profile={profile}
                  setProfile={setProfile}
                  handleUpdateProfile={handleUpdateProfile}
                />
              </div>
            )}

            {/* Tab: Security / MFA */}
            {visitedTabs.security && (
              <div className={activeTab === 'security' ? 'block' : 'hidden'}>
                <SecurityTab
                  mfaEnabled={mfaEnabled}
                  isSettingUpMfa={isSettingUpMfa}
                  setIsSettingUpMfa={setIsSettingUpMfa}
                  isDisablingMfa={isDisablingMfa}
                  setIsDisablingMfa={setIsDisablingMfa}
                  mfaSetupData={mfaSetupData}
                  mfaVerifyCode={mfaVerifyCode}
                  setMfaVerifyCode={setMfaVerifyCode}
                  handleSetupMfa={handleSetupMfa}
                  handleEnableMfaSubmit={handleEnableMfaSubmit}
                  handleDisableMfaSubmit={handleDisableMfaSubmit}
                  getQrCodeSrc={getQrCodeSrc}
                />
              </div>
            )}

            {/* Tab: OIDC Clients */}
            {isAdmin && visitedTabs.clients && (
              <div className={activeTab === 'clients' ? 'block' : 'hidden'}>
                <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-4 mb-4">
                  <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">{t('clients.title')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{t('clients.subtitle')}</p>
                </div>
                <OidcClientManager token={token} />
              </div>
            )}

            {/* Tab: Identity Users */}
            {isSupport && visitedTabs.users && (
              <div className={activeTab === 'users' ? 'block' : 'hidden'}>
                <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-4 mb-4">
                  <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">{t('users.title')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{t('users.subtitle')}</p>
                </div>
                <UserManager token={token} currentUserId={userId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
