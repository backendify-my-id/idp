import React from 'react';
import MetricCard from '../components/MetricCard';

const DashboardOverview = ({
  user,
  usersCount = 0,
  clientsCount = 0,
  activeSessions = 1,
  socketStatus = 'connecting',
  wsLogs = []
}) => {
  const getFirstName = () => {
    if (user?.full_name) {
      return user.full_name.split(' ')[0];
    }
    return 'User';
  };

  // Mock server resources status
  const systemHealth = [
    { name: 'Core API Server', status: 'healthy', value: '100% Up-time' },
    { name: 'Memory Utilization', status: 'nominal', value: '142 MB / 512 MB' },
    { name: 'CPU Load', status: 'low', value: '2.4% Usage' },
    { name: 'Active DB Pool', status: 'active', value: '3 Active Conns' }
  ];

  return (
    <div className="space-y-8 animate-fade-in text-left">

      {/* 🏠 Welcome Home Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white relative overflow-hidden shadow-xl select-none">
        <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-60px] w-[260px] h-[260px] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-100">Control Console</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome Back, {getFirstName()}!</h3>
            <p className="text-xs text-indigo-100/85 font-semibold max-w-xl leading-relaxed">
              This is the identity provider dashboard. Monitor operational metrics, configure OIDC clients, promote security credentials, and review live directory events.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm shrink-0 flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-200 block">System State</span>
            <span className="text-sm font-black text-white mt-1 uppercase tracking-wider">Operational</span>
          </div>
        </div>
      </div>

      {/* 📊 Key Statistics Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Database Users"
          value={usersCount || 0}
          subText="+12% this month"
          type="indigo"
          icon={
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />

        <MetricCard
          title="OIDC Clients"
          value={clientsCount || 0}
          subText="PKCE flow enabled"
          type="purple"
          icon={
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          }
        />

        <MetricCard
          title="Active Sessions"
          value={activeSessions}
          subText="WS active sockets"
          type="cyan"
          icon={
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />

        <MetricCard
          title="Core Network"
          value={socketStatus === 'connected' ? 'Online' : 'Fallback'}
          subText="Gateway operational"
          type="emerald"
          icon={
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left column: Server System Health Diagnostics */}
        <div className="lg:col-span-1 p-6 border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/15 backdrop-blur-md rounded-3xl space-y-4">
          <h5 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider">
            Server Resource Auditing
          </h5>

          <div className="space-y-3">
            {systemHealth.map((sys, idx) => (
              <div key={idx} className="p-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-150/40 dark:border-slate-800/40 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{sys.name}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-bold">{sys.value}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {sys.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Recent Event Registry (Live Tickers Audit logs) */}
        <div className="lg:col-span-2 p-6 border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/15 backdrop-blur-md rounded-3xl space-y-4">
          <h5 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider">
            Recent System Activity Log
          </h5>

          <div className="h-[210px] overflow-y-auto scrollbar-thin space-y-2 pr-1">
            {wsLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-16 text-center font-bold">Awaiting server event activity stream...</p>
            ) : (
              wsLogs.slice(0, 10).map((log, idx) => (
                <div key={idx} className="p-2.5 bg-slate-100/30 dark:bg-slate-900/10 border border-slate-150/20 dark:border-slate-800/20 rounded-xl flex items-start gap-3 text-xs min-w-0 overflow-hidden">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <p className="font-semibold text-slate-650 dark:text-slate-350 tracking-tight leading-relaxed break-all min-w-0">{log}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default DashboardOverview;
