import React from 'react';

const ProfileConfig = ({
  profile,
  setProfile,
  onSubmitProfile,
  isLoadingProfile
}) => {
  return (
    <form onSubmit={onSubmitProfile} className="space-y-6 animate-fade-in text-left">
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
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl text-xs font-semibold"
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
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl text-xs font-semibold"
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
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl text-xs font-semibold"
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
  );
};

export default ProfileConfig;
