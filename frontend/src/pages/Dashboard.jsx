import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getProfile, updateProfile, getMfaSetup, enableMfa, disableMfa,
  getClients, createClient, deleteClient, getUsers, updateUserRole, updateUserStatus 
} from '../services/api';
import AlertModal from '../components/AlertModal';
import DashboardLayout from '../layouts/DashboardLayout';

// Sub Page Component Imports
import Analytics from './Analytics';
import ProfileConfig from './ProfileConfig';
import SecurityMfa from './SecurityMfa';
import OidcClients from './OidcClients';
import IdentityUsers from './IdentityUsers';
import DashboardOverview from './DashboardOverview';

const Dashboard = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Real-time Socket & Telemetry States
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [activeSessions, setActiveSessions] = useState(1);
  const [realtimeData, setRealtimeData] = useState([]);
  const [wsLogs, setWsLogs] = useState([]);

  // Profile Credentials States
  const [profile, setProfile] = useState({ fullName: '', avatarUrl: '', bio: '' });
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [roles, setRoles] = useState([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Directory & Clients Lists States
  const [clientsList, setClientsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // MFA Setup Variables
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState({ secret: '', url: '' });
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);

  // OIDC Client Creation Form States
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [isPkceRequired, setIsPkceRequired] = useState(false);
  const [redirectUrls, setRedirectUrls] = useState(['']);

  // Global Alert State
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  // Refs
  const socketRef = useRef(null);
  const fallbackIntervalRef = useRef(null);

  // Curated charts color palettes
  const COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#f59e0b'];

  // Initialize Auth Profile details
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      const res = await getProfile(token);
      setIsLoadingProfile(false);

      if (res.success && res.data) {
        setProfile({
          fullName: res.data.full_name || '',
          avatarUrl: res.data.avatar_url || '',
          bio: res.data.bio || '',
        });
        setEmail(res.data.email || '');
        setUserId(res.data.id || '');
        setRoles(res.data.roles || []);
        setMfaEnabled(res.data.mfa_enabled || false);
      } else {
        onLogout();
      }
    };
    fetchProfile();
  }, [token]);

  // Tab Pre-fetching dynamically
  useEffect(() => {
    if (activeTab === 'clients') {
      fetchClients();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    const res = await getClients(token);
    setIsLoadingClients(false);
    if (res.success) setClientsList(res.data || []);
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    const res = await getUsers(token);
    setIsLoadingUsers(false);
    if (res.success) setUsersList(res.data || []);
  };

  // Real-Time Socket.io Connection & Stream emulator Fallback
  useEffect(() => {
    const now = new Date();
    const initialData = Array.from({ length: 12 }, (_, i) => {
      const timeStr = new Date(now.getTime() - (11 - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return { time: timeStr, requests: Math.floor(Math.random() * 20) + 5 };
    });
    setRealtimeData(initialData);

    socketRef.current = io('http://localhost:8800', {
      transports: ['websocket'],
      timeout: 5000,
      reconnectionAttempts: 3
    });

    socketRef.current.on('connect', () => {
      setSocketStatus('connected');
      addWsLog('Real-time tunnel connected to backend WS server.');
    });

    socketRef.current.on('connect_error', () => {
      setSocketStatus('fallback');
      addWsLog('Go WS server offline. Launching fallback real-time emulator...');
    });

    socketRef.current.on('system_activity', (data) => {
      handleNewDataPoint(data.requests, data.sessions);
    });

    fallbackIntervalRef.current = setInterval(() => {
      if (socketRef.current && !socketRef.current.connected) {
        const dummyReqs = Math.floor(Math.random() * 30) + 8;
        const dummySessions = Math.max(1, activeSessions + (Math.random() > 0.55 ? 1 : -1));
        handleNewDataPoint(dummyReqs, dummySessions);
      }
    }, 3000);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      clearInterval(fallbackIntervalRef.current);
    };
  }, [activeSessions]);

  const handleNewDataPoint = (reqs, sessions) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRealtimeData((prev) => {
      const next = [...prev, { time: timeStr, requests: reqs }];
      if (next.length > 12) next.shift();
      return next;
    });
    setActiveSessions(sessions);
    addWsLog(`[Live Telemetry] Throughput: ${reqs} req/s. Connected tunnels: ${sessions}.`);
  };

  const addWsLog = (msg) => {
    const logStr = `[${new Date().toLocaleTimeString()}] ${msg}`;
    setWsLogs((prev) => {
      const next = [logStr, ...prev];
      if (next.length > 25) next.pop();
      return next;
    });
  };

  // Recharts Helper Data Mappings
  const getRolesPieData = () => {
    if (usersList.length === 0) {
      return [
        { name: 'Admin', value: 1 },
        { name: 'Developer', value: 2 },
        { name: 'IDP Support', value: 1 },
        { name: 'Standard User', value: 4 }
      ];
    }
    const rolesMap = {};
    usersList.forEach(u => {
      const role = u.roles?.[0] || 'user';
      rolesMap[role] = (rolesMap[role] || 0) + 1;
    });
    return Object.entries(rolesMap).map(([key, val]) => ({
      name: key.toUpperCase().replace('_', ' '),
      value: val
    }));
  };

  const getClientBarData = () => {
    if (clientsList.length === 0) {
      return [
        { name: 'Super App', requests: 14 },
        { name: 'Web Client', requests: 25 },
        { name: 'Mobile API', requests: 8 }
      ];
    }
    return clientsList.map(c => ({
      name: c.client_name,
      requests: Math.floor(Math.random() * 40) + 10
    }));
  };

  // Action Handlers
  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoadingProfile(true);
    const res = await updateProfile(token, {
      full_name: profile.fullName,
      avatar_url: profile.avatarUrl,
      bio: profile.bio
    });
    setIsLoadingProfile(false);

    if (res.success) {
      setAlert({
        isOpen: true,
        title: 'Success',
        message: 'Your profile has been updated successfully!',
        type: 'success'
      });
    } else {
      setAlert({ isOpen: true, title: 'Error', message: res.message, type: 'error' });
    }
  };

  const handleMfaInit = async () => {
    setIsSettingUpMfa(true);
    const res = await getMfaSetup(token);
    if (res.success && res.data) {
      setMfaSetupData({
        secret: res.data.secret,
        url: res.data.url
      });
    } else {
      setIsSettingUpMfa(false);
      setAlert({ isOpen: true, title: 'MFA Error', message: res.message, type: 'error' });
    }
  };

  const handleMfaEnableSubmit = async (e) => {
    e.preventDefault();
    const res = await enableMfa(token, mfaVerifyCode);
    if (res.success) {
      setMfaEnabled(true);
      setIsSettingUpMfa(false);
      setMfaVerifyCode('');
      setAlert({ isOpen: true, title: 'MFA Active', message: 'Two-Factor Authentication is successfully activated!', type: 'success' });
    } else {
      setAlert({ isOpen: true, title: 'MFA Error', message: res.message, type: 'error' });
    }
  };

  const handleMfaDisableSubmit = async (e) => {
    e.preventDefault();
    const res = await disableMfa(token, mfaVerifyCode);
    if (res.success) {
      setMfaEnabled(false);
      setIsDisablingMfa(false);
      setMfaVerifyCode('');
      setAlert({ isOpen: true, title: 'MFA Inactive', message: 'Two-Factor Authentication has been disabled.', type: 'info' });
    } else {
      setAlert({ isOpen: true, title: 'MFA Error', message: res.message, type: 'error' });
    }
  };

  const handleCreateClientSubmit = async (e) => {
    e.preventDefault();
    const res = await createClient(token, {
      client_name: clientName,
      client_id: clientId,
      is_pkce_required: isPkceRequired,
      redirect_urls: redirectUrls.filter(u => u.trim() !== '')
    });

    if (res.success) {
      setClientName('');
      setClientId('');
      setIsPkceRequired(false);
      setRedirectUrls(['']);
      setAlert({
        isOpen: true,
        title: 'Client Registered',
        message: `OIDC Client "${res.data.client_name}" successfully configured! Secret key generated.`,
        type: 'success'
      });
      fetchClients();
    } else {
      setAlert({ isOpen: true, title: 'Error', message: res.message, type: 'error' });
    }
  };

  const handleDeleteClientClick = async (id, name) => {
    const res = await deleteClient(token, id);
    if (res.success) {
      setAlert({ isOpen: true, title: 'Client Deleted', message: `OIDC Client "${name}" removed.`, type: 'info' });
      fetchClients();
    } else {
      setAlert({ isOpen: true, title: 'Error', message: res.message, type: 'error' });
    }
  };

  const handleAddUrlField = () => setRedirectUrls([...redirectUrls, '']);
  const handleRemoveUrlField = (idx) => setRedirectUrls(redirectUrls.filter((_, i) => i !== idx));

  const handleRoleToggleClick = async (id, currentRoles, roleName) => {
    const assign = !currentRoles.includes(roleName);
    const res = await updateUserRole(token, id, roleName, assign);
    if (res.success) {
      setAlert({ isOpen: true, title: 'Role Updated', message: 'User role modified successfully.', type: 'success' });
      fetchUsers();
    } else {
      setAlert({ isOpen: true, title: 'Error', message: res.message, type: 'error' });
    }
  };

  const handleStatusToggleClick = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await updateUserStatus(token, id, nextStatus);
    if (res.success) {
      setAlert({ isOpen: true, title: 'Status Modified', message: `User status changed to ${nextStatus}.`, type: 'info' });
      fetchUsers();
    } else {
      setAlert({ isOpen: true, title: 'Error', message: res.message, type: 'error' });
    }
  };

  // Compile active user object
  const userObj = {
    full_name: profile.fullName,
    email: email,
    avatar_url: profile.avatarUrl,
    status: 'active',
    roles: roles
  };

  return (
    <DashboardLayout
      user={userObj}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={onLogout}
    >
      {isLoadingProfile ? (
        <div className="flex flex-col items-center justify-center py-36 animate-fade-in">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mt-4">Syncing Profile Details...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardOverview
              user={userObj}
              usersCount={usersList.length}
              clientsCount={clientsList.length}
              activeSessions={activeSessions}
              socketStatus={socketStatus}
              wsLogs={wsLogs}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics
              socketStatus={socketStatus}
              activeSessions={activeSessions}
              realtimeData={realtimeData}
              wsLogs={wsLogs}
              usersCount={usersList.length}
              clientsCount={clientsList.length}
              getRolesPieData={getRolesPieData}
              getClientBarData={getClientBarData}
              COLORS={COLORS}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileConfig
              profile={profile}
              setProfile={setProfile}
              onSubmitProfile={handleUpdateProfileSubmit}
              isLoadingProfile={isLoadingProfile}
            />
          )}

          {activeTab === 'security' && (
            <SecurityMfa
              mfaEnabled={mfaEnabled}
              isSettingUpMfa={isSettingUpMfa}
              setIsSettingUpMfa={setIsSettingUpMfa}
              mfaSetupData={mfaSetupData}
              mfaVerifyCode={mfaVerifyCode}
              setMfaVerifyCode={setMfaVerifyCode}
              isDisablingMfa={isDisablingMfa}
              setIsDisablingMfa={setIsDisablingMfa}
              onMfaInit={handleMfaInit}
              onMfaEnableSubmit={handleMfaEnableSubmit}
              onMfaDisableSubmit={handleMfaDisableSubmit}
            />
          )}

          {activeTab === 'clients' && roles.includes('admin') && (
            <OidcClients
              clientName={clientName}
              setClientName={setClientName}
              clientId={clientId}
              setClientId={setClientId}
              isPkceRequired={isPkceRequired}
              setIsPkceRequired={setIsPkceRequired}
              redirectUrls={redirectUrls}
              setRedirectUrls={setRedirectUrls}
              clientsList={clientsList}
              isLoadingClients={isLoadingClients}
              onCreateClient={handleCreateClientSubmit}
              onDeleteClient={handleDeleteClientClick}
              onAddUrlField={handleAddUrlField}
              onRemoveUrlField={handleRemoveUrlField}
            />
          )}

          {activeTab === 'users' && (roles.includes('admin') || roles.includes('idp_support')) && (
            <IdentityUsers
              usersList={usersList}
              isLoadingUsers={isLoadingUsers}
              currentUserId={userId}
              onRoleToggle={handleRoleToggleClick}
              onStatusToggle={handleStatusToggleClick}
            />
          )}
        </>
      )}

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </DashboardLayout>
  );
};

export default Dashboard;
