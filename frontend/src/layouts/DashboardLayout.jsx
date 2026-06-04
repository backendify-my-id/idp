import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import SidebarToggleButton from '../components/SidebarToggleButton';

const DashboardLayout = ({ children, user, activeTab, setActiveTab, onLogout, notifications = [], setNotifications, onMarkAllRead }) => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [latency, setLatency] = useState(12);

  // Mock search query
  const [searchQuery, setSearchQuery] = useState('');

  // Periodic latency simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 15) + 6);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = () => {
    if (user?.full_name) {
      const words = user.full_name.split(' ');
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return user.full_name[0].toUpperCase();
    }
    return user?.email ? user.email[0].toUpperCase() : 'U';
  };

  const hasRole = (role) => user?.roles?.includes(role) || false;

  const markAllRead = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const getRoleColor = () => {
    if (hasRole('admin')) return 'from-indigo-500 to-purple-600 border-indigo-200/40 text-indigo-700 dark:text-indigo-300';
    if (hasRole('idp_support')) return 'from-emerald-500 to-cyan-600 border-emerald-200/40 text-emerald-700 dark:text-emerald-300';
    if (hasRole('developer')) return 'from-blue-500 to-indigo-600 border-blue-200/40 text-blue-700 dark:text-blue-300';
    return 'from-slate-400 to-slate-500 border-slate-200/40 text-slate-700 dark:text-slate-350';
  };

  const getRoleLabel = () => {
    if (hasRole('admin')) return 'ADMINISTRATOR';
    if (hasRole('idp_support')) return 'IDP SUPPORT';
    if (hasRole('developer')) return 'DEVELOPER';
    return 'STANDARD USER';
  };

  // Nav Items with SVGs
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      visible: true
    },
    {
      id: 'analytics',
      label: 'Real-time Analytics',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      visible: hasRole('admin')
    },
    {
      id: 'profile',
      label: 'Profile Config',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      visible: true
    },
    {
      id: 'security',
      label: 'Security / MFA',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      visible: true
    },
    {
      id: 'clients',
      label: 'OIDC Clients',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      visible: hasRole('admin') || hasRole('developer')
    },
    {
      id: 'users',
      label: 'Identity Users',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      visible: hasRole('admin') || hasRole('idp_support')
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      visible: hasRole('admin')
    }
  ];

  const renderSidebarContent = (isMobile = false) => {
    // When rendered inside the mobile overlay, always show expanded!
    const collapsed = isMobile ? false : isSidebarCollapsed;

    return (
      <div className="flex flex-col h-full justify-between select-none overflow-y-auto scrollbar-none pb-4">
        <div className="space-y-6">
          
          {/* Modernized Sidebar Header */}
          <div className={`flex items-center gap-3 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-2'}`}>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-base">
              B
            </div>
            <div className={`flex flex-col text-left transition-all duration-300 origin-left overflow-hidden ${
              collapsed ? 'max-w-0 opacity-0 scale-90 pointer-events-none' : 'max-w-48 opacity-100 scale-100'
            }`}>
              <span className="font-black text-sm tracking-tight text-slate-800 dark:text-white leading-tight whitespace-nowrap">Backendify IdP</span>
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-0.5 whitespace-nowrap">Control Center</span>
            </div>
          </div>



          {/* Navigation List */}
          <nav className="space-y-1">
            {navItems.filter(item => item.visible).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3 text-left'
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 dark:shadow-none'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="shrink-0 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <span className={`transition-all duration-300 origin-left overflow-hidden whitespace-nowrap ${
                    collapsed ? 'max-w-0 opacity-0 translate-x-[-8px] pointer-events-none' : 'max-w-48 opacity-100 translate-x-0'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Log out block */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center justify-center border border-rose-200 dark:border-rose-900/35 rounded-xl text-xs font-extrabold uppercase tracking-wider text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all duration-300 cursor-pointer active:scale-98 ${
            collapsed ? 'p-3' : 'gap-2 px-4 py-3'
          }`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <div className="shrink-0 transition-transform duration-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className={`transition-all duration-300 origin-left overflow-hidden whitespace-nowrap ${
            collapsed ? 'max-w-0 opacity-0 translate-x-[-8px] pointer-events-none' : 'max-w-48 opacity-100 translate-x-0'
          }`}>
            Sign Out
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className={`h-[100dvh] w-full max-w-full overflow-hidden font-sans transition-colors duration-300 flex flex-col ${
      theme === 'dark' ? 'dark bg-[#06080f] text-slate-100' : 'bg-[#f4f7fc] text-slate-900'
    }`}>
      {/* Dynamic Glowing Meshes */}
      <div className="absolute top-[-250px] left-[-200px] w-[600px] h-[600px] rounded-full bg-indigo-500/8 dark:bg-indigo-500/12 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-250px] right-[-200px] w-[600px] h-[600px] rounded-full bg-purple-500/6 dark:bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Grid Layout Container */}
      <div className="flex w-full h-full overflow-hidden relative">
        
        {/* Desktop Sidebar (Left Panel) with collapsible widths - overflow set to visible to avoid button clipping */}
        <aside className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200/40 dark:border-slate-800/40 bg-white/70 dark:bg-[#0b0f19]/70 backdrop-blur-xl h-full sticky top-0 transition-all duration-300 ease-in-out relative z-30 ${
          isSidebarCollapsed ? 'w-20 px-3 py-8' : 'w-72 px-6 py-8'
        }`}>
          {/* Collapse/Expand Floating border trigger button */}
          <SidebarToggleButton
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex absolute top-6 -right-3 w-6 h-6"
          />

          {renderSidebarContent(false)}
        </aside>

        {/* Content Shell (Right Panel) */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          
          {/* Top Sticky Header Bar */}
          <header className="h-20 w-full shrink-0 border-b border-slate-200/35 dark:border-slate-800/35 bg-white/40 dark:bg-[#06080f]/40 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-40 transition-colors">
            
            {/* Left: Mobile Toggler, Desktop Sidebar Toggle & Breadcrumbs */}
            <div className="flex items-center gap-3.5">
              {/* Mobile Toggler */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 cursor-pointer active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>


              
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workspace / Overview</span>
                <h2 className="text-sm font-black text-slate-800 dark:text-white capitalize mt-0.5">
                  {activeTab === 'analytics' ? 'Real-time Metrics Hub' : activeTab.replace('-', ' ')}
                </h2>
              </div>
            </div>

            {/* Middle: Premium Global Search Bar */}
            <div className="hidden md:flex items-center w-72 relative">
              <span className="absolute left-3.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search registry parameters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-10 pr-10 py-2.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-850/50 rounded-xl"
              />
              <span className="absolute right-3 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 border pointer-events-none select-none">
                ⌘K
              </span>
            </div>

            {/* Right Side Settings & Action Indicators */}
            <div className="flex items-center gap-3">
              
              {/* API Connection Indicator */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">LATENCY: {latency}ms</span>
              </div>

              {/* Theme Switcher Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm"
                title="Toggle Light/Dark Mode"
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                  </svg>
                )}
              </button>

              {/* Notification Toggler Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm relative"
                  title="System Notifications"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-[-2px] right-[-2px] w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute top-[-2px] right-[-2px] w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </button>

                {/* Notifications Dropdown Panel Card */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] shadow-2xl p-4 z-50 animate-scale-up text-left">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800/60 mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Notifications ({unreadCount})</span>
                      <button onClick={markAllRead} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600">Mark all read</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-2.5 rounded-xl border transition-colors ${
                          n.unread 
                            ? 'bg-indigo-50/20 dark:bg-indigo-950/15 border-indigo-100/50 dark:border-indigo-900/20' 
                            : 'bg-slate-50/20 dark:bg-slate-900/10 border-slate-100/40 dark:border-slate-800/30'
                        }`}>
                          <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{n.text}</p>
                          <span className="text-[8px] text-slate-400 mt-1 block font-bold">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all cursor-pointer select-none text-left"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt="Avatar"
                      className="w-8 h-8 rounded-lg border border-indigo-500/20 shadow-sm object-cover shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md text-white text-[10px] font-black">
                      {getInitials()}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px]">
                      {user?.full_name || 'Identity User'}
                    </span>
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-0.5">
                      {getRoleLabel()}
                    </span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isUserDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsUserDropdownOpen(false)} />
                    <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] shadow-2xl p-2.5 z-40 animate-scale-up text-left">
                      <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/60 mb-1.5">
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{user?.full_name || 'Identity User'}</p>
                        <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                      </div>
                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('security');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Security / MFA
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-1" />
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer text-left"
                        >
                          <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

          </header>

          {/* Core Dynamic Content Frame */}
          <main className="p-4 sm:p-6 lg:p-8 h-[calc(100dvh-80px)] overflow-y-auto overflow-x-hidden scrollbar-thin w-full max-w-[1600px] mx-auto space-y-6">
            {children}
          </main>

        </div>
      </div>

      {/* Slide-in Mobile Sidebar Overlay Menu Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />
          
          {/* Drawer Sheet */}
          <aside className="relative flex flex-col w-72 bg-white dark:bg-[#0b0f19] border-r border-slate-200/40 dark:border-slate-800/40 p-6 h-full shadow-2xl z-50 animate-scale-up">
            {/* Close Button Inside Drawer */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-450 dark:text-slate-500 cursor-pointer active:scale-95"
            >
              ✕
            </button>
            <div className="grow mt-6">
              {renderSidebarContent(true)}
            </div>
          </aside>
        </div>
      )}

    </div>
  );
};

export default DashboardLayout;
