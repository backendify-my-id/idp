export const BASE_URL = 'http://localhost:8800/api';

// ─── Token Utilities ──────────────────────────────────────────────────────────

/** Decode a JWT payload without verifying the signature (client-side only). */
const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

/** Returns true if the token is missing, malformed, or past its exp claim. */
export const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

// ─── Public Auth Endpoints ────────────────────────────────────────────────────

export const loginUser = async (email, password) => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const registerUser = async (email, password) => {
  const response = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const verifyEmail = async (email, otp) => {
  const response = await fetch(`${BASE_URL}/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return response.json();
};

export const resendOtp = async (email) => {
  const response = await fetch(`${BASE_URL}/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

export const forgotPassword = async (email) => {
  const response = await fetch(`${BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await fetch(`${BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });
  return response.json();
};

export const loginMfa = async (mfaToken, code) => {
  const response = await fetch(`${BASE_URL}/login/mfa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfa_token: mfaToken, code }),
  });
  return response.json();
};

// ─── Protected Endpoints ──────────────────────────────────────────────────────

/** Attaches _status to the returned object so callers can detect 401. */
export const getProfile = async (token) => {
  const response = await fetch(`${BASE_URL}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json();
  data._status = response.status;
  return data;
};

export const updateProfile = async (token, profileData) => {
  const response = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  return response.json();
};

export const getMfaSetup = async (token) => {
  const response = await fetch(`${BASE_URL}/mfa/setup`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};

export const enableMfa = async (token, code) => {
  const response = await fetch(`${BASE_URL}/mfa/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  return response.json();
};

export const disableMfa = async (token, code) => {
  const response = await fetch(`${BASE_URL}/mfa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  return response.json();
};

export const refreshAccessToken = async (refreshToken) => {
  const response = await fetch(`${BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return response.json();
};

export const getClients = async (token) => {
  const response = await fetch(`${BASE_URL}/admin/clients`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

export const createClient = async (token, clientData) => {
  const response = await fetch(`${BASE_URL}/admin/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(clientData)
  });
  return response.json();
};

export const deleteClient = async (token, id) => {
  const response = await fetch(`${BASE_URL}/admin/clients/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

export const getUsers = async (token) => {
  const response = await fetch(`${BASE_URL}/admin/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

export const updateUserRole = async (token, id, roleName, assign) => {
  const response = await fetch(`${BASE_URL}/admin/users/${id}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ role_name: roleName, assign })
  });
  return response.json();
};

export const updateUserStatus = async (token, id, status) => {
  const response = await fetch(`${BASE_URL}/admin/users/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  return response.json();
};



