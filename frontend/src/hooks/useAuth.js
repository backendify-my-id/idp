import { useState, useEffect } from 'react';
import { 
  loginUser, 
  registerUser, 
  verifyEmail, 
  getProfile, 
  updateProfile, 
  getMfaSetup, 
  enableMfa, 
  disableMfa, 
  loginMfa,
  resendOtp,
  forgotPassword,
  resetPassword,
  isTokenExpired,
  refreshAccessToken
} from '../services/api';

export const useAuthInternal = () => {
  // Authentication states
  const [isSignUp, setIsSignUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userToken, setUserToken] = useState(() => {
    const t = localStorage.getItem('idp_token');
    const r = localStorage.getItem('idp_refresh_token');
    if (t && isTokenExpired(t)) {
      if (!r) {
        localStorage.removeItem('idp_token');
        return null;
      }
    }
    return t;
  });

  // Forgot / Reset Password flow
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // Profile Dashboard State
  const [profile, setProfile] = useState({ fullName: '', avatarUrl: '', bio: '' });
  const [userId, setUserId] = useState('');
  const [roles, setRoles] = useState([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // MFA Interactive State
  const [isMfaVerifyingLogin, setIsMfaVerifyingLogin] = useState(false);
  const [mfaLoginToken, setMfaLoginToken] = useState('');
  const [mfaLoginCode, setMfaLoginCode] = useState('');
  
  // Dashboard MFA Setup State
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState({ secret: '', url: '' });
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');

  // App Alert State
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [oidcParams, setOidcParams] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Automatic Silent Refresh Timer
  useEffect(() => {
    const checkAndRefresh = async () => {
      const token = localStorage.getItem('idp_token');
      const rToken = localStorage.getItem('idp_refresh_token');
      if (!rToken) return;

      let isExpiredOrClose = false;
      if (!token) {
        isExpiredOrClose = true;
      } else {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          const bufferTime = 2 * 60 * 1000; // 2 minutes buffer
          if (decoded && decoded.exp) {
            isExpiredOrClose = (Date.now() + bufferTime) >= decoded.exp * 1000;
          }
        } catch {
          isExpiredOrClose = true;
        }
      }

      if (isExpiredOrClose) {
        try {
          const res = await refreshAccessToken(rToken);
          if (res.success) {
            const newAccess = res.data.access_token;
            const newRefresh = res.data.refresh_token;
            localStorage.setItem('idp_token', newAccess);
            localStorage.setItem('idp_refresh_token', newRefresh);
            setUserToken(newAccess);
            console.log("[SILENT REFRESH] Access token refreshed successfully.");
          } else {
            console.warn("[SILENT REFRESH] Failed to refresh, logging out...", res.message);
            handleLogout();
          }
        } catch (err) {
          console.error("[SILENT REFRESH] Error during silent refresh:", err);
          handleLogout();
        }
      }
    };

    if (userToken || localStorage.getItem('idp_refresh_token')) {
      checkAndRefresh();
    }

    const interval = setInterval(() => {
      checkAndRefresh();
    }, 15000);

    return () => clearInterval(interval);
  }, [userToken]);

  // Lockout Timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const formatLockoutTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `Account locked due to too many failed attempts. Try again in ${mins} minutes and ${secs} seconds.`;
    }
    return `Account locked due to too many failed attempts. Try again in ${secs} seconds.`;
  };

  // Parse OIDC Parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const client_id = params.get('client_id');
    const redirect_uri = params.get('redirect_uri');
    const response_type = params.get('response_type');
    const scope = params.get('scope');
    const state = params.get('state');
    const code_challenge = params.get('code_challenge');
    const code_challenge_method = params.get('code_challenge_method');

    if (client_id && redirect_uri) {
      setOidcParams({
        client_id,
        redirect_uri,
        response_type,
        scope,
        state,
        code_challenge,
        code_challenge_method,
      });
    }
  }, []);

  // Fetch Profile if Token exists
  useEffect(() => {
    if (userToken) {
      fetchUserProfile();
    }
  }, [userToken]);

  const fetchUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await getProfile(userToken);
      if (res._status === 401) {
        handleLogout();
        setAlert({ isOpen: true, title: 'Session Expired', message: 'Your session has expired. Please sign in again.', type: 'error' });
        return;
      }
      if (res.success) {
        setProfile({
          fullName: res.data.profile.FullName || '',
          avatarUrl: res.data.profile.AvatarUrl || '',
          bio: res.data.profile.Bio || '',
        });
        setMfaEnabled(res.data.mfa_enabled);
        if (res.data.email) setEmail(res.data.email);
        if (res.data.roles) setRoles(res.data.roles);
        if (res.data.user_id) setUserId(res.data.user_id);
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Failed to fetch profile data', type: 'error' });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile(userToken, {
        full_name: profile.fullName,
        avatar_url: profile.avatarUrl,
        bio: profile.bio,
      });
      if (res.success) {
        setAlert({ isOpen: true, title: 'Success', message: 'Profile updated successfully!', type: 'success' });
        setProfile({
          fullName: res.data.FullName || '',
          avatarUrl: res.data.AvatarUrl || '',
          bio: res.data.Bio || '',
        });
      } else {
        setAlert({ isOpen: true, title: 'Error', message: res.message || 'Failed to update profile', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Failed to update profile', type: 'error' });
    }
  };

  const handleSetupMfa = async () => {
    try {
      const res = await getMfaSetup(userToken);
      if (res.success) {
        setMfaSetupData({
          secret: res.data.secret,
          url: res.data.url
        });
        setIsSettingUpMfa(true);
        setMfaVerifyCode('');
      } else {
        setAlert({ isOpen: true, title: 'Setup Failed', message: res.message || 'Failed to initiate MFA setup', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Something went wrong', type: 'error' });
    }
  };

  const handleEnableMfaSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await enableMfa(userToken, mfaVerifyCode);
      if (res.success) {
        setAlert({ isOpen: true, title: 'MFA Enabled', message: 'Two-Factor Authentication has been successfully enabled!', type: 'success' });
        setMfaEnabled(true);
        setIsSettingUpMfa(false);
        setMfaVerifyCode('');
      } else {
        setAlert({ isOpen: true, title: 'Verification Failed', message: res.message || 'Incorrect verification code', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Failed to enable MFA', type: 'error' });
    }
  };

  const handleDisableMfaSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await disableMfa(userToken, mfaVerifyCode);
      if (res.success) {
        setAlert({ isOpen: true, title: 'MFA Disabled', message: 'Two-Factor Authentication has been disabled.', type: 'success' });
        setMfaEnabled(false);
        setIsDisablingMfa(false);
        setMfaVerifyCode('');
      } else {
        setAlert({ isOpen: true, title: 'Verification Failed', message: res.message || 'Incorrect verification code', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Failed to disable MFA', type: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      if (password !== confirmPassword) {
        setAlert({ isOpen: true, title: 'Validation Error', message: 'Passwords do not match', type: 'error' });
        return;
      }

      try {
        const res = await registerUser(email, password);
        if (res.success) {
          setAlert({ 
            isOpen: true, 
            title: 'Registration Successful', 
            message: 'Account created! Please enter the 6-digit OTP code sent to your email to verify.', 
            type: 'success' 
          });
          setIsVerifying(true);
          setPassword('');
          setConfirmPassword('');
        } else {
          setAlert({ isOpen: true, title: 'Registration Failed', message: res.message || 'Failed to register account', type: 'error' });
        }
      } catch (err) {
        setAlert({ isOpen: true, title: 'Error', message: 'Something went wrong during registration', type: 'error' });
      }
    } else {
      try {
        const res = await loginUser(email, password);
        if (res.success) {
          if (res.data?.mfa_required) {
            setMfaLoginToken(res.data.mfa_token);
            setIsMfaVerifyingLogin(true);
            setMfaLoginCode('');
            setAlert({ isOpen: true, title: 'MFA Required', message: 'Please enter the 6-digit code from your authenticator app.', type: 'info' });
            return;
          }

          const token = res.data?.access_token;
          const refreshToken = res.data?.refresh_token;
          handleSuccessfulLogin(token, refreshToken);
        } else {
          if (res.retry_after) {
            setLockoutSeconds(res.retry_after);
            setAlert({ isOpen: true, title: 'Account Locked', message: res.message || 'Account locked', type: 'error' });
          } else {
            setAlert({ isOpen: true, title: 'Error', message: res.message || 'Login failed', type: 'error' });
          }
        }
      } catch (err) {
        setAlert({ isOpen: true, title: 'Error', message: 'Something went wrong', type: 'error' });
      }
    }
  };

  const handleMfaLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginMfa(mfaLoginToken, mfaLoginCode);
      if (res.success) {
        const token = res.data?.access_token;
        const refreshToken = res.data?.refresh_token;
        setIsMfaVerifyingLogin(false);
        setMfaLoginToken('');
        setMfaLoginCode('');
        handleSuccessfulLogin(token, refreshToken);
      } else {
        setAlert({ isOpen: true, title: 'Verification Failed', message: res.message || 'Incorrect verification code', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'MFA verification failed', type: 'error' });
    }
  };

  const handleSuccessfulLogin = (token, refreshToken) => {
    if (token) {
      localStorage.setItem('idp_token', token);
    }
    if (refreshToken) {
      localStorage.setItem('idp_refresh_token', refreshToken);
    }
    if (oidcParams && token) {
      setAlert({ 
        isOpen: true, 
        title: 'Authorizing', 
        message: 'Authentication successful. Redirecting back to your application...', 
        type: 'success' 
      });
      
      setTimeout(() => {
        const query = new URLSearchParams({
          client_id: oidcParams.client_id,
          redirect_uri: oidcParams.redirect_uri,
          response_type: oidcParams.response_type || 'code',
          scope: oidcParams.scope || 'openid',
          state: oidcParams.state || '',
          code_challenge: oidcParams.code_challenge || '',
          code_challenge_method: oidcParams.code_challenge_method || '',
          token: token
        });
        window.location.href = `http://localhost:8800/authorize?${query.toString()}`;
      }, 1500);
    } else {
      setAlert({ isOpen: true, title: 'Success', message: 'Logged in successfully', type: 'success' });
      setUserToken(token);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const res = await verifyEmail(email, otp);
      if (res.success) {
        setAlert({
          isOpen: true,
          title: 'Verification Successful',
          message: 'Your email has been verified! You can now sign in.',
          type: 'success'
        });
        setIsVerifying(false);
        setIsSignUp(false);
        setOtp('');
      } else {
        setAlert({ isOpen: true, title: 'Verification Failed', message: res.message || 'Incorrect OTP code', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Something went wrong during verification', type: 'error' });
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      setAlert({ isOpen: true, title: 'Validation Error', message: 'Please enter your email address first.', type: 'error' });
      return;
    }
    try {
      const res = await resendOtp(email);
      if (res.success) {
        setAlert({ isOpen: true, title: 'OTP Resent', message: res.message || 'A new 6-digit OTP code has been sent to your email.', type: 'success' });
      } else {
        setAlert({ isOpen: true, title: 'Failed to Resend', message: res.message || 'Failed to resend verification code.', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Something went wrong', type: 'error' });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setAlert({ isOpen: true, title: 'Validation Error', message: 'Please enter your email address.', type: 'error' });
      return;
    }
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setAlert({ isOpen: true, title: 'Reset Code Sent', message: res.message, type: 'success' });
        setIsForgotPassword(false);
        setIsResetPassword(true);
        setNewPassword('');
        setConfirmNewPassword('');
        setOtp('');
      } else {
        setAlert({ isOpen: true, title: 'Error', message: res.message || 'Failed to send reset code.', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Something went wrong', type: 'error' });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setAlert({ isOpen: true, title: 'Validation Error', message: 'Passwords do not match.', type: 'error' });
      return;
    }
    try {
      const res = await resetPassword(email, otp, newPassword);
      if (res.success) {
        setAlert({ isOpen: true, title: 'Password Reset', message: res.message, type: 'success' });
        setIsResetPassword(false);
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setAlert({ isOpen: true, title: 'Reset Failed', message: res.message || 'Failed to reset password.', type: 'error' });
      }
    } catch (err) {
      setAlert({ isOpen: true, title: 'Error', message: 'Something went wrong', type: 'error' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('idp_token');
    localStorage.removeItem('idp_refresh_token');
    setUserToken(null);
    setEmail('');
    setPassword('');
    setProfile({ fullName: '', avatarUrl: '', bio: '' });
    setMfaEnabled(false);
    setIsSettingUpMfa(false);
    setIsDisablingMfa(false);
    setAlert({ isOpen: true, title: 'Logged Out', message: 'You have been logged out.', type: 'success' });
  };

  const getInitials = () => {
    if (profile.fullName) {
      const names = profile.fullName.split(' ');
      if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
      return profile.fullName[0].toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  const getQrCodeSrc = () => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaSetupData.url)}`;
  };

  return {
    isSignUp,
    setIsSignUp,
    isVerifying,
    setIsVerifying,
    userToken,
    setUserToken,
    isForgotPassword,
    setIsForgotPassword,
    isResetPassword,
    setIsResetPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    otp,
    setOtp,
    profile,
    setProfile,
    userId,
    roles,
    setRoles,
    mfaEnabled,
    setMfaEnabled,
    isLoadingProfile,
    isMfaVerifyingLogin,
    setIsMfaVerifyingLogin,
    mfaLoginCode,
    setMfaLoginCode,
    isSettingUpMfa,
    setIsSettingUpMfa,
    isDisablingMfa,
    setIsDisablingMfa,
    mfaSetupData,
    mfaVerifyCode,
    setMfaVerifyCode,
    alert,
    setAlert,
    oidcParams,
    lockoutSeconds,
    formatLockoutTime,
    handleSubmit,
    handleMfaLoginSubmit,
    handleVerifyOTP,
    handleResendOTP,
    handleForgotPassword,
    handleResetPassword,
    handleLogout,
    handleUpdateProfile,
    handleSetupMfa,
    handleEnableMfaSubmit,
    handleDisableMfaSubmit,
    getInitials,
    getQrCodeSrc,
  };
};
