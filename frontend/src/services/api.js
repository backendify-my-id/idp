import axios from 'axios';

export const BASE_URL = 'http://localhost:8800/api';

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
const decodeJwt = (token) => {
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

export const loginUser = (email, password) =>
  apiClient.post('/login', { email, password });

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

export const loginMfa = (mfaToken, code) =>
  apiClient.post('/login/mfa', { mfa_token: mfaToken, code });

// ─── Protected Endpoints ──────────────────────────────────────────────────────

export const getProfile = (token) =>
  apiClient.get('/profile', authConfig(token));

export const updateProfile = (token, profileData) =>
  apiClient.put('/profile', profileData, authConfig(token));

export const getMfaSetup = (token) =>
  apiClient.get('/mfa/setup', authConfig(token));

export const enableMfa = (token, code) =>
  apiClient.post('/mfa/enable', { code }, authConfig(token));

export const disableMfa = (token, code) =>
  apiClient.post('/mfa/disable', { code }, authConfig(token));

export const refreshAccessToken = (refreshToken) =>
  apiClient.post('/refresh', { refresh_token: refreshToken });

export const getClients = (token) =>
  apiClient.get('/admin/clients', authConfig(token));

export const createClient = (token, clientData) =>
  apiClient.post('/admin/clients', clientData, authConfig(token));

export const deleteClient = (token, id) =>
  apiClient.delete(`/admin/clients/${id}`, authConfig(token));

export const getUsers = (token) =>
  apiClient.get('/admin/users', authConfig(token));

export const updateUserRole = (token, id, roleName, assign) =>
  apiClient.put(`/admin/users/${id}/role`, { role_name: roleName, assign }, authConfig(token));

export const updateUserStatus = (token, id, status) =>
  apiClient.put(`/admin/users/${id}/status`, { status }, authConfig(token));
