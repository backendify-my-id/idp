import React, { useState } from 'react';

const IdentityUsers = ({
  usersList,
  isLoadingUsers,
  currentUserId,
  onRoleToggle,
  onStatusToggle
}) => {
  const [query, setQuery] = useState('');

  const filteredUsers = usersList.filter(u => 
    u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Identity User Directory</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Audit registered identities, promotion state claims, and status suspension records.
          </p>
        </div>
        
        {/* Compact User Search Bar */}
        <div className="w-full sm:w-64 relative shrink-0">
          <span className="absolute left-3 top-3 text-slate-450">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search directory..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-9 pr-4 py-2 border rounded-xl bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {isLoadingUsers ? (
        <div className="py-24 text-center text-slate-400 font-semibold text-xs uppercase tracking-wider">
          Syncing directory registries...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-16 border border-dashed rounded-3xl text-center text-slate-400 font-semibold text-xs uppercase tracking-wider">
          No directory records found matching details.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/15 backdrop-blur-md shadow-sm">
          <table className="min-w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-850">
            <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Identity Profile</th>
                <th className="px-6 py-4">Auth Status</th>
                <th className="px-6 py-4">MFA State</th>
                <th className="px-6 py-4">Access Roles</th>
                <th className="px-6 py-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-650 dark:text-slate-300">
              {filteredUsers.map((user) => {
                const isSelf = currentUserId && user.id === currentUserId;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                    
                    {/* User Identity cell */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt="Avatar"
                            className="w-9 h-9 rounded-xl border border-slate-100 dark:border-slate-800 object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-black uppercase shadow-sm">
                            {user.full_name ? user.full_name[0] : (user.email ? user.email[0] : 'U')}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-850 dark:text-white truncate">
                            {user.full_name || 'Identity User'}
                            {isSelf && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 font-extrabold text-[8px] tracking-widest uppercase">Self</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Status cell */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] border font-extrabold tracking-wider uppercase ${
                        user.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                          : 'bg-rose-50 text-rose-750 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                      }`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    
                    {/* MFA status cell */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] border font-extrabold tracking-wider uppercase ${
                        user.mfa_enabled 
                          ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30' 
                          : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900/20 dark:text-slate-500 dark:border-slate-800'
                      }`}>
                        {user.mfa_enabled ? 'MFA ACTIVE' : 'NO 2FA'}
                      </span>
                    </td>
                    
                    {/* Roles Cell */}
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {user.roles?.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-full text-[8.5px] font-extrabold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/20 uppercase tracking-wide"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    
                    {/* Action controls */}
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        disabled={isSelf}
                        onClick={() => onStatusToggle(user.id, user.status)}
                        className="px-2.5 py-1.5 rounded-xl border text-[9px] uppercase tracking-wider font-extrabold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 cursor-pointer disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-850"
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      
                      <button
                        disabled={isSelf}
                        onClick={() => onRoleToggle(user.id, user.roles || [], 'admin')}
                        className="px-2.5 py-1.5 rounded-xl border text-[9px] uppercase tracking-wider font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-100 hover:bg-indigo-100/50 cursor-pointer disabled:opacity-40"
                      >
                        {user.roles?.includes('admin') ? 'Demote Admin' : 'Make Admin'}
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IdentityUsers;
