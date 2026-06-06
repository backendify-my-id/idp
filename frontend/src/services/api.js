import axios from 'axios';

export const BASE_URL = `http://${window.location.hostname}:8800/api`;

// Create Axios Instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios response interceptor to format responses exactly as the app expects
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data || {};
    data._status = response.status;
    return data;
  },
  (error) => {
    const data = error.response?.data || { success: false, message: error.message };
    data._status = error.response?.status || 500;
    return data;
  }
);

// Token Utilities
export const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

// Request Config Helper
const authConfig = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// ─── Public Auth Endpoints ────────────────────────────────────────────────────

export const loginUser = (email, password, rememberMe = false) =>
  apiClient.post('/login', { email, password, remember_me: rememberMe });

export const registerUser = (email, password) =>
  apiClient.post('/register', { email, password });

export const verifyEmail = (email, otp) =>
  apiClient.post('/verify-email', { email, otp });

export const resendOtp = (email) =>
  apiClient.post('/resend-otp', { email });

export const forgotPassword = (email) =>
  apiClient.post('/forgot-password', { email });

export const resetPassword = (email, otp, newPassword) =>
  apiClient.post('/reset-password', { email, otp, new_password: newPassword });

export const loginMfa = (mfaToken, code, rememberMe = false) =>
  apiClient.post('/login/mfa', { mfa_token: mfaToken, code, remember_me: rememberMe });

// ─── Protected Endpoints ──────────────────────────────────────────────────────

export const getProfile = (token) =>
  apiClient.get('/profile', authConfig(token));

export const updateProfile = (token, profileData) =>
  apiClient.put('/profile', profileData, authConfig(token));

export const initiateEmailChangeStep1 = (token) =>
  apiClient.post('/profile/email-change/step1-initiate', {}, authConfig(token));

export const verifyEmailChangeStep1 = (token, otp) =>
  apiClient.post('/profile/email-change/step1-verify', { otp }, authConfig(token));

export const checkNewEmailStep2 = (token, tempToken, newEmail) =>
  apiClient.post('/profile/email-change/step2-check', { temp_token: tempToken, new_email: newEmail }, authConfig(token));

export const confirmEmailChangeStep3 = (token, tempToken, otp) =>
  apiClient.post('/profile/email-change/step3-confirm', { temp_token: tempToken, otp }, authConfig(token));

export const getSessions = (token) =>
  apiClient.get('/profile/sessions', authConfig(token));

export const revokeSession = (token, sessionId) =>
  apiClient.delete(`/profile/sessions/${sessionId}`, authConfig(token));

export const revokeAllOtherSessions = (token) =>
  apiClient.delete('/profile/sessions', authConfig(token));

export const getMfaSetup = (token) =>
  apiClient.get('/mfa/setup', authConfig(token));

export const enableMfa = (token, code) =>
  apiClient.post('/mfa/enable', { code }, authConfig(token));

export const disableMfa = (token, code) =>
  apiClient.post('/mfa/disable', { code }, authConfig(token));

export const refreshAccessToken = (refreshToken) =>
  apiClient.post('/refresh', { refresh_token: refreshToken });

export const logoutUser = (token) =>
  apiClient.post('/logout', {}, authConfig(token));

export const getClients = (token) =>
  apiClient.get('/admin/clients', authConfig(token));

export const createClient = (token, clientData) =>
  apiClient.post('/admin/clients', clientData, authConfig(token));

export const updateClient = (token, id, clientData) =>
  apiClient.put(`/admin/clients/${id}`, clientData, authConfig(token));

export const deleteClient = (token, id) =>
  apiClient.delete(`/admin/clients/${id}`, authConfig(token));

export const regenerateClientSecret = (token, id) =>
  apiClient.post(`/admin/clients/${id}/regenerate-secret`, {}, authConfig(token));

export const getUsers = (token) =>
  apiClient.get('/admin/users', authConfig(token));

export const updateUserRole = (token, id, roleName, assign) =>
  apiClient.put(`/admin/users/${id}/role`, { role_name: roleName, assign }, authConfig(token));

export const updateUserStatus = (token, id, status) =>
  apiClient.put(`/admin/users/${id}/status`, { status }, authConfig(token));

export const unlockUser = (token, id) =>
  apiClient.put(`/admin/users/${id}/unlock`, {}, authConfig(token));

export const deleteUser = (token, id) =>
  apiClient.delete(`/admin/users/${id}`, authConfig(token));

export const getClientPublicInfo = (clientId) =>
  apiClient.get(`/oidc/client/${clientId}`);

export const submitConsent = (token, clientId, scopes) =>
  apiClient.post('/oidc/consent', { client_id: clientId, scopes }, authConfig(token));

// ─── Notification Endpoints ────────────────────────────────────────────────────
export const getNotifications = (token) =>
  apiClient.get('/notifications', authConfig(token));

export const createNotification = (token, text) =>
  apiClient.post('/notifications', { text }, authConfig(token));

export const markNotificationsRead = (token) =>
  apiClient.put('/notifications/read', {}, authConfig(token));

export const getAuditLogs = (token, page = 1, limit = 20, action = '', search = '') => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', limit);
  if (action) params.append('action', action);
  if (search) params.append('search', search);
  return apiClient.get(`/admin/audit-logs?${params.toString()}`, authConfig(token));
};

export const changePasswordStep1 = (token, oldPassword) =>
  apiClient.post('/profile/change-password/step1-verify', { old_password: oldPassword }, authConfig(token));

export const changePasswordStep2Mfa = (token, tempToken, code) =>
  apiClient.post('/profile/change-password/step2-mfa', { temp_token: tempToken, code }, authConfig(token));

export const changePasswordStep3Update = (token, tempToken, newPassword) =>
  apiClient.post('/profile/change-password/step3-update', { temp_token: tempToken, new_password: newPassword }, authConfig(token));
