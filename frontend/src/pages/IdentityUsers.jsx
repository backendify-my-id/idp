import React, { useState, useEffect } from 'react';

const IdentityUsers = ({
  usersList,
  isLoadingUsers,
  currentUserId,
  onRoleToggle,
  onStatusChange,
  onDeleteUser,
  currentUserRoles = []
}) => {
  const [query, setQuery] = useState('');
  
  // Track active dropdown row ID
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeRoleDropdownId, setActiveRoleDropdownId] = useState(null);

  // Global click outside listener to auto-close active dropdowns
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (activeDropdownId) {
        const dropdownEl = document.getElementById(`dropdown-${activeDropdownId}`);
        const buttonEl = document.getElementById(`btn-${activeDropdownId}`);
        if (
          dropdownEl && !dropdownEl.contains(event.target) &&
          buttonEl && !buttonEl.contains(event.target)
        ) {
          setActiveDropdownId(null);
        }
      }
      if (activeRoleDropdownId) {
        const dropdownEl = document.getElementById(`role-dropdown-${activeRoleDropdownId}`);
        const buttonEl = document.getElementById(`role-btn-${activeRoleDropdownId}`);
        if (
          dropdownEl && !dropdownEl.contains(event.target) &&
          buttonEl && !buttonEl.contains(event.target)
        ) {
          setActiveRoleDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeDropdownId, activeRoleDropdownId]);

  // High-Risk Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'banned', 'delete'
    userId: null,
    userName: '',
    userEmail: '',
  });

  // Verification input state for typing user email
  const [confirmInput, setConfirmInput] = useState('');

  const filteredUsers = usersList.filter(u => 
    u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase())
  );

  const openConfirmModal = (type, userId, userName, userEmail) => {
    setConfirmModal({
      isOpen: true,
      type,
      userId,
      userName,
      userEmail,
    });
    setConfirmInput(''); // reset input validation
    setActiveDropdownId(null); // close dropdown
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      type: '',
      userId: null,
      userName: '',
      userEmail: '',
    });
    setConfirmInput('');
  };

  const executeConfirmedAction = () => {
    if (confirmInput.trim() !== confirmModal.userEmail) return;

    if (confirmModal.type === 'delete') {
      onDeleteUser(confirmModal.userId);
    } else if (confirmModal.type === 'banned') {
      onStatusChange(confirmModal.userId, 'banned');
    }
    closeConfirmModal();
  };

  const handleDirectAction = (type, userId) => {
    onStatusChange(userId, type);
    setActiveDropdownId(null); // close dropdown
  };

  const getModalColorClasses = () => {
    switch (confirmModal.type) {
      case 'banned':
        return {
          title: 'Ban Identity Account',
          iconBg: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20',
          btnBg: 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )
        };
      case 'delete':
        return {
          title: 'PERMANENTLY DELETE ACCOUNT',
          iconBg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20',
          btnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )
        };
      default:
        return { title: 'Confirm Action', iconBg: 'bg-slate-100 text-slate-500', btnBg: 'bg-slate-600', icon: null };
    }
  };

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
        <div className="lg:overflow-visible overflow-x-auto rounded-3xl border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/15 backdrop-blur-md shadow-sm">
          <table className="min-w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-850">
            <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Identity Profile</th>
                <th className="px-6 py-4">Auth Status</th>
                <th className="px-6 py-4">MFA State</th>
                <th className="px-6 py-4">Access Roles</th>
                <th className="px-6 py-4 text-right">Account Status Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-650 dark:text-slate-300">
              {filteredUsers.map((user, index) => {
                const isSelf = currentUserId && user.id === currentUserId;
                const isLastFewRows = index >= filteredUsers.length - 2 && filteredUsers.length > 2;
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
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-50 to-purple-600 flex items-center justify-center text-white text-[10px] font-black uppercase shadow-sm">
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
                          : user.status === 'suspended'
                          ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-455 dark:border-amber-900/30'
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
                    <td className="px-6 py-4 relative">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {user.roles?.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-full text-[8.5px] font-extrabold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/20 uppercase tracking-wide"
                          >
                            {r}
                          </span>
                        ))}

                        {currentUserRoles.includes('admin') && !isSelf && (
                          <button
                            id={`role-btn-${user.id}`}
                            onClick={() => setActiveRoleDropdownId(activeRoleDropdownId === user.id ? null : user.id)}
                            className="p-1 rounded-lg border border-dashed border-slate-350 dark:border-slate-800 text-slate-455 hover:text-indigo-650 hover:border-indigo-600 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                            title="Manage user access roles"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </button>
                        )}

                        {activeRoleDropdownId === user.id && (
                          <div
                            id={`role-dropdown-${user.id}`}
                            className={`absolute left-6 w-44 rounded-2xl border border-slate-250/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-2xl p-1.5 z-40 animate-scale-up text-left ${
                              isLastFewRows ? 'bottom-full mb-1' : 'top-full mt-1'
                            }`}
                          >
                            <div className="px-2 py-1 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                              Manage Roles
                            </div>

                            {['admin', 'idp_support', 'developer', 'user'].map((roleName) => {
                              const hasRole = user.roles?.includes(roleName);
                              return (
                                <button
                                  key={roleName}
                                  onClick={() => {
                                    onRoleToggle(user.id, user.roles || [], roleName);
                                  }}
                                  className="w-full flex items-center justify-between px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-left transition-colors"
                                >
                                  <span className="truncate">{roleName.replace('_', ' ')}</span>
                                  {hasRole ? (
                                    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  ) : (
                                    <span className="w-3 h-3 border border-slate-300 dark:border-slate-700 rounded-md shrink-0 block" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Action controls - Single actions dropdown trigger */}
                    <td className="px-6 py-4 text-right relative whitespace-nowrap">
                      <button
                        id={`btn-${user.id}`}
                        disabled={isSelf}
                        onClick={() => setActiveDropdownId(activeDropdownId === user.id ? null : user.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-95 transition-all text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Actions
                        <svg className={`w-3 h-3 text-slate-450 transition-transform duration-200 ${activeDropdownId === user.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown overlay card */}
                      {activeDropdownId === user.id && (
                         <div 
                           id={`dropdown-${user.id}`}
                           className={`absolute right-6 w-48 rounded-2xl border border-slate-250/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-2xl p-1.5 z-40 animate-scale-up text-left ${
                            isLastFewRows ? 'bottom-full mb-1' : 'top-full mt-1'
                          }`}
                         >
                            
                            {/* Update State category */}
                            <div className="px-2 py-1 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                              Update State
                            </div>
                            
                            <button
                              disabled={user.status === 'active'}
                              onClick={() => handleDirectAction('active', user.id)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer disabled:opacity-45 disabled:pointer-events-none text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Activate
                            </button>

                            <button
                              disabled={user.status === 'suspended'}
                              onClick={() => handleDirectAction('suspended', user.id)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer disabled:opacity-45 disabled:pointer-events-none text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Suspend
                            </button>

                            {/* Divider */}
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800/60" />

                            {/* Danger Zone category */}
                            <div className="px-2 py-1 text-[8px] font-black uppercase text-rose-500/70 tracking-wider">
                              Danger Zone
                            </div>

                            <button
                              disabled={user.status === 'banned'}
                              onClick={() => openConfirmModal('banned', user.id, user.full_name || user.email, user.email)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-650 dark:text-rose-400 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 cursor-pointer disabled:opacity-45 disabled:pointer-events-none text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              Ban Account
                            </button>

                            {currentUserRoles.includes('admin') && (
                              <button
                                onClick={() => openConfirmModal('delete', user.id, user.full_name || user.email, user.email)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-650 dark:text-rose-450 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 cursor-pointer disabled:opacity-45 disabled:pointer-events-none text-left"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                                Delete Account
                              </button>
                            )}

                          </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Premium Double-Check Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur Backdrop */}
          <div 
            onClick={closeConfirmModal}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity animate-fade-in"
          />
          
          {/* Dialog Card Box */}
          <div className="relative w-full max-w-md p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-2xl shadow-2xl animate-scale-up text-left z-55">
            <div className="flex flex-col gap-4">
              
              {/* Colored Indicator Header Icon */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getModalColorClasses().iconBg}`}>
                {getModalColorClasses().icon}
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                  {getModalColorClasses().title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  You are performing a high-risk administrative action on 
                  <strong className="text-slate-800 dark:text-slate-200"> {confirmModal.userName}</strong>.
                  {confirmModal.type === 'delete' && ' This will completely delete the user profile and credentials from the database. This action is permanent and cannot be undone!'}
                  {confirmModal.type === 'banned' && ' Banning will prevent all future single-sign-on authentications immediately.'}
                </p>

                {/* Double-Check Input Verification */}
                <div className="mt-4 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider block">
                    To confirm, please type user email: <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700 dark:text-slate-350 select-all">{confirmModal.userEmail}</code>
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type user's email to verify"
                    className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-rose-500 focus:ring-rose-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={closeConfirmModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-850 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={confirmInput.trim() !== confirmModal.userEmail}
                  onClick={executeConfirmedAction}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${getModalColorClasses().btnBg}`}
                >
                  Confirm Action
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityUsers;
