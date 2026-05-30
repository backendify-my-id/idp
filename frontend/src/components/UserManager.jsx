import React, { useState, useEffect } from 'react';
import { getUsers, updateUserRole, updateUserStatus } from '../services/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import { useLanguage } from '../context/LanguageContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_ROLES = ['admin', 'idp_support', 'developer', 'user'];
const BASE_ROLE = 'user'; // cannot be removed

const ROLE_META = {
  admin: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    ),
    desc: 'Full system access, user management, and all admin privileges.',
    badge: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
    active: 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
    toggle: 'bg-indigo-600',
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
    dot: 'bg-indigo-500',
  },
  idp_support: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/>
      </svg>
    ),
    desc: 'View and manage user accounts, statuses, and audit logs.',
    badge: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50',
    active: 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/40',
    toggle: 'bg-violet-600',
    iconBg: 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  developer: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>
    ),
    desc: 'Access to OIDC client registration and API integrations.',
    badge: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50',
    active: 'border-cyan-400 dark:border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40',
    toggle: 'bg-cyan-600',
    iconBg: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-500',
  },
  user: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    ),
    desc: 'Standard identity user. Base role — cannot be removed.',
    badge: 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60',
    active: 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40',
    toggle: 'bg-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
};

const getRoleLabel = (role, t) => {
  const map = {
    admin: t('users.roleAdmin'),
    idp_support: t('users.roleIdpSupport'),
    developer: t('users.roleDeveloper'),
    user: t('users.roleUser'),
  };
  return map[role] || role;
};

// ─── Role Management Modal ────────────────────────────────────────────────────
const RoleModal = ({ isOpen, user, onClose, onApply, t, isLoading }) => {
  const [localRoles, setLocalRoles] = useState([]);

  useEffect(() => {
    if (isOpen && user) {
      setLocalRoles([...(user.roles || [])]);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const toggleRole = (role) => {
    if (role === BASE_ROLE) return; // protect base role
    setLocalRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const hasChanges = () => {
    const orig = [...(user.roles || [])].sort().join(',');
    const curr = [...localRoles].sort().join(',');
    return orig !== curr;
  };

  const getInitials = (fullName, email) => {
    if (fullName) {
      const names = fullName.split(' ');
      if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
      return fullName[0].toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm" />

      {/* Modal Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden animate-scale-up">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shadow-sm">
                  {getInitials(user.full_name, user.email)}
                </div>
              )}
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {user.full_name || 'New User'}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('users.confirmRoleTitle')} — Toggle to assign or revoke
            </p>
          </div>
        </div>

        {/* Role Cards */}
        <div className="px-6 py-4 space-y-2.5 max-h-[380px] overflow-y-auto scrollbar-thin">
          {ALL_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const isActive = localRoles.includes(role);
            const isBase = role === BASE_ROLE;

            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                disabled={isBase}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group cursor-pointer disabled:cursor-default ${
                  isActive
                    ? `${meta.active} shadow-sm`
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent'
                }`}
              >
                {/* Role Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive ? meta.iconBg : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {meta.icon}
                </div>

                {/* Role Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-extrabold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {getRoleLabel(role, t)}
                    </span>
                    {isBase && (
                      <span className="px-1.5 py-0.5 rounded-md text-[7px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                        BASE
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] font-medium mt-0.5 leading-relaxed transition-colors ${
                    isActive ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'
                  }`}>
                    {meta.desc}
                  </p>
                </div>

                {/* Toggle Switch */}
                <div className={`relative w-10 h-5.5 flex-shrink-0 rounded-full transition-all duration-200 ${
                  isActive ? meta.toggle : 'bg-slate-200 dark:bg-slate-700'
                } ${isBase ? 'opacity-50' : ''}`}
                  style={{ height: '22px', width: '40px' }}
                >
                  <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all duration-200 ${
                    isActive ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                    style={{ width: '18px', height: '18px', top: '2px', left: isActive ? '20px' : '2px' }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
            {localRoles.length} role{localRoles.length !== 1 ? 's' : ''} assigned
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={!hasChanges() || isLoading}
              onClick={() => onApply(localRoles)}
              className="px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-none hover:from-indigo-500 hover:to-indigo-600 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center gap-2"
            >
              {isLoading && (
                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Compact Role Badges (read-only display in table row) ─────────────────────
const RoleBadges = ({ userRoles, t }) => (
  <div className="flex items-center gap-1 flex-wrap">
    {userRoles.length === 0 && (
      <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/30">
        {t('users.roleNone')}
      </span>
    )}
    {userRoles.map((role) => {
      const meta = ROLE_META[role] || ROLE_META.user;
      return (
        <span
          key={role}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border shadow-sm transition-all ${meta.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
          {getRoleLabel(role, t)}
        </span>
      );
    })}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const UserManager = ({ token, currentUserId }) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Role Modal State
  const [roleModalUser, setRoleModalUser] = useState(null);

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  });

  // Toast Notification State
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getUsers(token);
      if (res.success) {
        setUsers(res.data || []);
      } else {
        setErrorMessage(res.message || 'Failed to load users.');
      }
    } catch {
      setErrorMessage('Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadUsers();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, rowsPerPage]);

  // ── Apply all role changes from modal ─────────────────────────────────────
  const handleApplyRoles = async (newRoles) => {
    if (!roleModalUser) return;
    const { id, email, roles: oldRoles } = roleModalUser;

    const toAdd = newRoles.filter((r) => !oldRoles.includes(r));
    const toRemove = oldRoles.filter((r) => !newRoles.includes(r) && r !== BASE_ROLE);

    if (toAdd.length === 0 && toRemove.length === 0) {
      setRoleModalUser(null);
      return;
    }

    setIsRoleLoading(true);
    setErrorMessage('');
    let anyFailed = false;

    try {
      for (const role of toAdd) {
        const res = await updateUserRole(token, id, role, true);
        if (!res.success) { anyFailed = true; }
      }
      for (const role of toRemove) {
        const res = await updateUserRole(token, id, role, false);
        if (!res.success) { anyFailed = true; }
      }

      if (!anyFailed) {
        showToast(`Roles updated for ${email}.`, 'success');
        setSuccessMessage(`Roles successfully updated for ${email}.`);
      } else {
        showToast('Some role changes failed.', 'error');
        setErrorMessage('Some role changes could not be applied.');
      }
      loadUsers();
    } catch {
      showToast('Failed to update roles.', 'error');
      setErrorMessage('Failed to update roles.');
    } finally {
      setIsRoleLoading(false);
      setRoleModalUser(null);
    }
  };

  // ── Status handler ─────────────────────────────────────────────────────────
  const handleStatusChange = (userId, userEmail, nextStatus) => {
    const type = nextStatus === 'banned' ? 'danger' : nextStatus === 'suspended' ? 'warning' : 'info';
    setConfirmData({
      title: `Set Status: ${nextStatus.toUpperCase()}`,
      message: `Are you sure you want to change the status of ${userEmail} to ${nextStatus.toUpperCase()}?`,
      type,
      onConfirm: () => executeStatusChange(userId, userEmail, nextStatus),
    });
    setIsConfirmOpen(true);
  };

  const executeStatusChange = async (userId, userEmail, nextStatus) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await updateUserStatus(token, userId, nextStatus);
      if (res.success) {
        const msg = `Updated ${userEmail} status to ${nextStatus.toUpperCase()}.`;
        setSuccessMessage(msg);
        showToast(msg, 'success');
        loadUsers();
      } else {
        setErrorMessage(res.message || 'Failed to update user status.');
        showToast(res.message || 'Status update failed.', 'error');
      }
    } catch {
      setErrorMessage('Failed to update status.');
      showToast('Failed to update status.', 'error');
    }
  };

  const getInitials = (fullName, email) => {
    if (fullName) {
      const names = fullName.split(' ');
      if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
      return fullName[0].toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  // ── Filtering & Pagination ─────────────────────────────────────────────────
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="pt-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            {t('users.title')}
          </h5>
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 rounded-full text-[9px] font-extrabold uppercase tracking-wide border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            {t('users.totalCountLabel', { filtered: filteredUsers.length, total: users.length })}
          </span>
        </div>
      </div>

      {/* Message alerts */}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl text-left animate-scale-up">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 text-xs font-semibold rounded-xl text-left animate-scale-up">
          {successMessage}
        </div>
      )}

      {/* Filters & Search Toolbar */}
      {!isLoading && users.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="block w-full pl-10 pr-4 py-2 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 w-full sm:w-auto shadow-inner">
            {['all', 'active', 'suspended', 'banned'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/40'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t(`users.filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mt-2">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">{t('users.noUsersText')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm bg-white/20 dark:bg-slate-950/10 backdrop-blur-sm max-h-[440px] overflow-y-auto transition-colors scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/60 text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10 font-extrabold text-slate-700 dark:text-slate-355 uppercase tracking-wider text-[9px] transition-colors border-b border-slate-200/60 dark:border-slate-800/60">
                <tr>
                  <th className="px-4 py-3">{t('users.tableHeaderName')}</th>
                  <th className="px-4 py-3">{t('users.tableHeaderStatus')}</th>
                  <th className="px-4 py-3">{t('security.title')}</th>
                  <th className="px-4 py-3">{t('users.tableHeaderRoles')}</th>
                  <th className="px-4 py-3 text-right">{t('users.tableHeaderActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/30 dark:bg-[#0f172a]/20 backdrop-blur-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors">
                {paginatedUsers.map((user) => {
                  const isSelf = currentUserId && user.id === currentUserId;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors animate-fade-in">

                      {/* User profile column */}
                      <td className="px-4 py-3 flex items-center gap-2.5">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200/80 dark:border-slate-700 shadow-sm" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold shadow-sm transition-colors">
                            {getInitials(user.full_name, user.email)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1.5">
                            {user.full_name || 'New User'}
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded-md text-[7px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{user.email}</span>
                        </div>
                      </td>

                      {/* Status column */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border shadow-sm transition-colors ${
                          user.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                            : user.status === 'suspended'
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455 border-rose-200 dark:border-rose-900/30'
                        }`}>
                          {user.status}
                        </span>
                      </td>

                      {/* Security column */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold tracking-wider border shadow-sm transition-colors ${
                            user.is_email_verified
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20'
                              : 'bg-amber-50/80 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/20'
                          }`}>
                            {user.is_email_verified ? 'VERIFIED' : 'UNVERIFIED'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold tracking-wider border shadow-sm transition-colors ${
                            user.mfa_enabled
                              ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/20'
                              : 'bg-slate-50 dark:bg-slate-805 text-slate-450 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}>
                            {user.mfa_enabled ? '2FA ACTIVE' : 'NO 2FA'}
                          </span>
                        </div>
                      </td>

                      {/* Roles column — badges only, click to edit */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <RoleBadges userRoles={user.roles || []} t={t} />
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setRoleModalUser(user)}
                              title="Manage Roles"
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer flex-shrink-0"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions column — status only */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <select
                          value={user.status}
                          disabled={isSelf}
                          onChange={(e) => handleStatusChange(user.id, user.email, e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border text-[9px] font-extrabold uppercase tracking-wider bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <option value="active">{t('users.statusActive')}</option>
                          <option value="suspended">{t('users.statusSuspended')}</option>
                          <option value="banned">{t('users.statusBanned')}</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center sm:text-left">
                Showing <span className="text-slate-800 dark:text-slate-200 font-bold">{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
                <span className="text-slate-800 dark:text-slate-200 font-bold">{endIndex}</span> of{' '}
                <span className="text-slate-800 dark:text-slate-200 font-bold">{totalItems}</span> users
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide">Show</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-extrabold text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-all focus:outline-none shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, arr) => {
                      const isGap = index > 0 && page - arr[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {isGap && <span className="px-1 text-slate-400 text-xs">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all focus:outline-none cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${
                              currentPage === page
                                ? 'bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white border-transparent'
                                : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-all focus:outline-none shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Role Management Modal */}
      <RoleModal
        isOpen={!!roleModalUser}
        user={roleModalUser}
        onClose={() => setRoleModalUser(null)}
        onApply={handleApplyRoles}
        t={t}
        isLoading={isRoleLoading}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        message={confirmData.message}
        type={confirmData.type}
      />

      {/* Toast Feedback */}
      <Toast
        isOpen={toastOpen}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
};

export default UserManager;
