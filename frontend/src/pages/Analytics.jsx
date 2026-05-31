import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const Analytics = ({
  socketStatus,
  activeSessions,
  realtimeData,
  wsLogs,
  getRolesPieData,
  getClientBarData,
  COLORS
}) => {
  const throughputAvg = realtimeData.length > 0 
    ? Math.round(realtimeData.reduce((acc, curr) => acc + curr.requests, 0) / realtimeData.length) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Real-time Telemetry Analytics</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
          Deep-dive analysis of token request throughput, role distribution weights, and active application load events.
        </p>
      </div>

      {/* Grid Quick Diagnostics Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-4 border border-indigo-100/50 dark:border-slate-800/80 bg-indigo-50/15 dark:bg-slate-950/20 rounded-2xl">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-550 dark:text-indigo-400">WS Connection Tunnel</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-2 h-2 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase leading-none">
              {socketStatus === 'connected' ? 'Operational / Safe' : 'Fallback Simulator'}
            </h5>
          </div>
        </div>

        <div className="p-4 border border-purple-100/50 dark:border-slate-800/80 bg-purple-50/15 dark:bg-slate-950/20 rounded-2xl">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-550 dark:text-purple-400">Total Live Active sessions</span>
          <h5 className="text-sm font-black text-slate-850 dark:text-white mt-1.5">
            {activeSessions} Connected Sockets
          </h5>
        </div>

        <div className="p-4 border border-cyan-100/50 dark:border-slate-800/80 bg-cyan-50/15 dark:bg-slate-950/20 rounded-2xl">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-550 dark:text-cyan-400">Average request throughput</span>
          <h5 className="text-sm font-black text-slate-850 dark:text-white mt-1.5">
            {throughputAvg} auth_requests / sec
          </h5>
        </div>
      </div>

      {/* 📈 Real-time System Throughput AreaChart (Recharts) */}
      <div className="p-5 border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/15 backdrop-blur-md rounded-3xl space-y-4">
        <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">System Requests Throughput (Hits / Sec)</h5>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={realtimeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.15} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
              <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '11px' }} />
              <Area type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRequests)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Sub Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Role Distribution Pie Chart */}
        <div className="p-5 border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/15 backdrop-blur-md rounded-3xl space-y-3">
          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider text-left">Credential Security Roles distribution</h5>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getRolesPieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getRolesPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: '12px', color: '#fff', fontSize: '10px' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Active requests Bar Chart */}
        <div className="p-5 border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/15 backdrop-blur-md rounded-3xl space-y-3">
          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider text-left">Active Load per Registered Client Application</h5>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getClientBarData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: '12px', color: '#fff', fontSize: '10px' }} />
                <Bar dataKey="requests" fill="#a855f7" radius={[6, 6, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* WebSocket diagnostics events console */}
      <div className="p-5 border border-slate-200/50 dark:border-slate-800/80 bg-slate-950/5 dark:bg-slate-950/45 rounded-3xl space-y-3">
        <h5 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left">WebSocket Diagnostic Console logger</h5>
        <div className="h-32 overflow-y-auto font-mono text-[9.5px] text-indigo-900 dark:text-indigo-300/90 space-y-1.5 scrollbar-thin text-left">
          {wsLogs.map((log, idx) => (
            <div key={idx} className="border-b border-indigo-150/20 dark:border-slate-800/20 pb-1 flex items-start gap-2">
              <span className="text-indigo-400 font-extrabold shrink-0">❯</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Analytics;
