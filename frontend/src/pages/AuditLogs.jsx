import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAuditLogs } from '../services/api';

const COMMON_ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'LOGIN_SUCCESS', label: 'Login Success' },
  { value: 'LOGIN_FAILURE', label: 'Login Failure' },
  { value: 'REGISTER_SUCCESS', label: 'Registration Success' },
  { value: 'VERIFY_EMAIL_SUCCESS', label: 'Email Verified' },
  { value: 'CREATE_OIDC_CLIENT', label: 'OIDC Client Created' },
  { value: 'UPDATE_OIDC_CLIENT', label: 'OIDC Client Updated' },
  { value: 'DELETE_OIDC_CLIENT', label: 'OIDC Client Deleted' },
  { value: 'UPDATE_USER_ROLE', label: 'User Role Updated' },
  { value: 'UPDATE_USER_STATUS', label: 'User Status Updated' },
  { value: 'DELETE_USER', label: 'User Deleted' },
  { value: 'UNLOCK_USER_SUCCESS', label: 'User Unlocked' },
  { value: 'MFA_SETUP_INIT', label: 'MFA Setup Initiated' },
  { value: 'MFA_SETUP_SUCCESS', label: 'MFA Enabled' },
  { value: 'MFA_DISABLE_SUCCESS', label: 'MFA Disabled' }
];

const getEventIcon = (action) => {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('login_success')) {
    return {
      icon: (
        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      bgClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
    };
  }

  if (actionLower.includes('login_failure') || actionLower.includes('fail')) {
    return {
      icon: (
        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bgClass: 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30'
    };
  }

  if (actionLower.includes('mfa')) {
    return {
      icon: (
        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      bgClass: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/30'
    };
  }

  if (actionLower.includes('client')) {
    return {
      icon: (
        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      bgClass: 'bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30'
    };
  }

  if (actionLower.includes('user_role') || actionLower.includes('role')) {
    return {
      icon: (
        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      bgClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
    };
  }

  if (actionLower.includes('user_status') || actionLower.includes('unlock') || actionLower.includes('delete_user')) {
    return {
      icon: (
        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bgClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30'
    };
  }

  // Fallback default icon
  return {
    icon: (
      <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-12-12m12 12a9 9 0 01-12 12m12-12H3" />
      </svg>
    ),
    bgClass: 'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
  };
};

const formatTime = (timeString) => {
  try {
    const date = new Date(timeString);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return timeString;
  }
};

const convertToCSV = (logsArray) => {
  const headers = ['ID', 'Action', 'Timestamp', 'Actor ID', 'IP Address', 'Email Hash', 'Details', 'User Agent'];
  const rows = logsArray.map(log => [
    log.ID || '',
    log.Action || '',
    log.Timestamp || '',
    log.ActorID || '',
    log.IpAddress || '',
    log.EmailHash || '',
    (log.Details || '').replace(/"/g, '""'),
    (log.UserAgent || '').replace(/"/g, '""')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${val}"`).join(','))
  ].join('\r\n');

  return csvContent;
};

const AuditLogs = ({ token }) => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  // Reset copy state when selected log changes
  useEffect(() => {
    setCopied(false);
  }, [selectedLog]);

  const handleCopyDetails = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    if (total === 0) return;
    setExporting(true);
    try {
      const res = await getAuditLogs(token, 1, total, action, search);
      if (res && res.success) {
        const allLogs = res.data.logs || [];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `audit_logs_${timestamp}`;

        if (format === 'json') {
          const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", url);
          downloadAnchor.setAttribute("download", `${filename}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          URL.revokeObjectURL(url);
        } else if (format === 'csv') {
          const csvContent = convertToCSV(allLogs);
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", url);
          downloadAnchor.setAttribute("download", `${filename}.csv`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('Failed to export audit logs', err);
    } finally {
      setExporting(false);
    }
  };

  // Lock body scroll when inspector modal is open
  useEffect(() => {
    if (selectedLog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedLog]);

  // Fetch function
  const fetchLogs = async (currentPage, filterAction, searchStr) => {
    setLoading(true);
    try {
      const res = await getAuditLogs(token, currentPage, limit, filterAction, searchStr);
      if (res && res.success) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchLogs(page, action, search);
  }, [page, action]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, action, search);
  };

  const handleClearFilters = () => {
    setSearch('');
    setAction('');
    setPage(1);
    fetchLogs(1, '', '');
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Welcome/Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Security Audit Logs</h2>
          <p className="text-xs sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Trace user logins, MFA settings updates, OIDC Client deployments, and admin role assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/30 px-4 py-2 rounded-2xl select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">GDPR Compliant Hashing Enabled</span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0b0f19] border border-slate-200/50 dark:border-slate-850/50 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search ActorID, IP Address, Details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="min-w-[180px]">
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="w-full text-xs font-bold text-slate-650 dark:text-slate-300 py-2.5 px-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {COMMON_ACTIONS.map(act => (
                <option key={act.value} value={act.value}>{act.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider transition shadow-sm hover:shadow active:scale-98 cursor-pointer shrink-0"
            >
              Search
            </button>
            {(search || action) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2.5 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition active:scale-98 cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Export Actions Group */}
        <div className="flex gap-2 w-full lg:w-auto shrink-0 justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            disabled={exporting || total === 0}
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 hover:dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-xs font-extrabold uppercase tracking-wider transition active:scale-98 cursor-pointer shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          
          <button
            type="button"
            disabled={exporting || total === 0}
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 hover:dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-xs font-extrabold uppercase tracking-wider transition active:scale-98 cursor-pointer shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>{exporting ? 'Exporting...' : 'Export JSON'}</span>
          </button>
        </div>
      </div>

      {/* Main timeline listing container */}
      <div className="relative">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#0b0f19] border border-slate-200/50 dark:border-slate-850/50 rounded-3xl shadow-sm">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mt-4">Retrieving audit timeline...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0b0f19] border border-slate-200/50 dark:border-slate-850/50 rounded-3xl shadow-sm text-center px-4">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-600 mb-4">
              <svg className="w-6.5 h-6.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Audit Event Records Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed font-semibold">
              No security events match the current search query or action category parameters. Try resetting filters.
            </p>
          </div>
        ) : (
          <div className="relative pb-4">
            
            {/* Timeline Vertical Guide Line */}
            <div className="absolute left-6.5 sm:left-9.5 top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-800" />

            <div className="space-y-4">
              {logs.map((logItem, index) => {
                const { icon, bgClass } = getEventIcon(logItem.Action);
                const isFailure = logItem.Action.includes('FAILURE');
                
                return (
                  <div key={logItem.ID || index} className="relative pl-14 sm:pl-20 group transition-all duration-300">
                    
                    {/* Node marker with hover magnification */}
                    <div className={`absolute left-4 sm:left-6.5 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110 ${bgClass}`}>
                      {icon}
                    </div>

                    {/* Timeline card row */}
                    <div className="p-4 sm:p-5 rounded-2.5xl bg-white dark:bg-[#0b0f19] border border-slate-200/50 dark:border-slate-850/50 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-x-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800/40 text-slate-650 dark:text-slate-350 px-2 py-0.5 rounded">
                            {logItem.Action}
                          </span>
                          {logItem.IpAddress && (
                            <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 tracking-wider">
                              IP: {logItem.IpAddress}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed truncate max-w-xl">
                          {logItem.Details || 'No details provided'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold text-slate-400">
                          {logItem.ActorID && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Actor: {logItem.ActorID.substring(0, 18)}{logItem.ActorID.length > 18 ? '...' : ''}
                            </span>
                          )}
                          {logItem.EmailHash && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                              </svg>
                              Hash: {logItem.EmailHash.substring(0, 12)}...
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTime(logItem.Timestamp)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedLog(logItem)}
                        className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition active:scale-95 cursor-pointer shrink-0"
                      >
                        Inspect Details
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-slate-100 dark:border-slate-900 select-none">
                <span className="text-[10px] sm:text-xs font-bold text-slate-450">
                  Showing page <strong className="text-slate-700 dark:text-slate-300">{page}</strong> of <strong className="text-slate-700 dark:text-slate-300">{totalPages}</strong> ({total} entries total)
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNum = index + 1;
                    const isSelected = pageNum === page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Inspect Log Details Modal Overlay using React Portal */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            onClick={() => setSelectedLog(null)} 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
          />
          
          <div className="relative bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800/80 w-full max-w-xl rounded-3xl shadow-2xl p-6 sm:p-7 animate-scale-up text-left overflow-hidden z-10 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Inspect Event Payload</span>
                <h3 className="text-base sm:text-lg font-black text-slate-850 dark:text-white mt-0.5">{selectedLog.Action}</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-200 cursor-pointer"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Scrollable Contents */}
            <div className="space-y-5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              
              {/* Context metadata (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Timestamp */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5 select-none">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Timestamp (Local)
                  </span>
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-200 mt-2 block">{formatTime(selectedLog.Timestamp)}</span>
                </div>

                {/* IP Address */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5 select-none">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a9.003 9.003 0 018.716 6.747M12 3a9.003 9.003 0 00-8.716 6.747M3 12h18" />
                    </svg>
                    IP Address
                  </span>
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-200 mt-2 block">{selectedLog.IpAddress || 'N/A'}</span>
                </div>

                {/* Separator / Category Line */}
                <div className="col-span-full border-t border-slate-100 dark:border-slate-800/60 my-1" />

                {/* Actor ID (Sub Claim) */}
                <div className="col-span-full space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5 select-none">
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Actor ID (Subject Claim)
                  </span>
                  <div className="p-3.5 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-250/30 dark:border-slate-850/30 rounded-2xl">
                    <span className="text-[11px] font-semibold font-mono text-slate-800 dark:text-slate-350 break-all select-all">{selectedLog.ActorID || 'N/A'}</span>
                  </div>
                </div>

                {/* GDPR Email Hash */}
                <div className="col-span-full space-y-1.5">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      GDPR Email Hash (HMAC-SHA256)
                    </span>
                    <span className="text-[8px] font-extrabold bg-emerald-50/80 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100/30">Compliant</span>
                  </div>
                  <div className="p-3.5 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-250/30 dark:border-slate-850/30 rounded-2xl">
                    <span className="text-[11px] font-semibold font-mono text-slate-800 dark:text-slate-350 break-all select-all">{selectedLog.EmailHash || 'N/A'}</span>
                  </div>
                </div>

                {/* User Agent */}
                <div className="col-span-full space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5 select-none">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    </svg>
                    User Agent Client
                  </span>
                  <div className="p-3.5 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-250/30 dark:border-slate-850/30 rounded-2xl">
                    <span className="text-[11.5px] font-medium text-slate-650 dark:text-slate-350 leading-relaxed break-words block">{selectedLog.UserAgent || 'N/A'}</span>
                  </div>
                </div>

                {/* Separator / Category Line */}
                <div className="col-span-full border-t border-slate-100 dark:border-slate-800/60 my-1" />

                {/* Detail Summary */}
                <div className="col-span-full space-y-2.5">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                      </svg>
                      Event Detail Summary / Payload
                    </span>
                    {selectedLog.Details && (
                      <button
                        onClick={() => handleCopyDetails(selectedLog.Details)}
                        className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100/70 hover:bg-slate-200/75 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/40 dark:border-slate-850/50 transition duration-150 flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7.5a3 3 0 013-3h3.5m-3.5 3h-4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h5m0 0v5m0-5L14 9" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-mono leading-relaxed bg-slate-50/80 dark:bg-slate-950/45 text-slate-700 dark:text-slate-350 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl break-all whitespace-pre-wrap shadow-inner max-h-48 overflow-y-auto scrollbar-thin">
                    {selectedLog.Details || 'No auxiliary details mapped to this event.'}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-300 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition active:scale-98 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AuditLogs;
