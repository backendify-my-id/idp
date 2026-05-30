import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const ProfileTab = ({ profile, setProfile, handleUpdateProfile }) => {
  const { t } = useLanguage();

  return (
    <form onSubmit={handleUpdateProfile} className="space-y-6">
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-4 mb-2">
        <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">{t('profile.title')}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{t('profile.subtitle')}</p>
      </div>

      <div>
        <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-left">
          {t('profile.fullName')}
        </label>
        <input
          type="text"
          value={profile.fullName || ''}
          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
          placeholder={t('profile.placeholderName')}
          className="mt-1 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-left">
          {t('profile.avatarUrl')}
        </label>
        <input
          type="url"
          value={profile.avatarUrl || ''}
          onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
          placeholder={t('profile.placeholderAvatar')}
          className="mt-1 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-left">
          {t('profile.bio')}
        </label>
        <textarea
          rows="3"
          value={profile.bio || ''}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          placeholder={t('profile.placeholderBio')}
          className="mt-1 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 transition-all"
        />
      </div>

      <button
        type="submit"
        className="w-full btn-primary flex justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
      >
        {t('common.save')}
      </button>
    </form>
  );
};

export default ProfileTab;
