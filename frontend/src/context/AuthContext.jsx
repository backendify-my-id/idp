import React, { createContext, useState, useContext, useEffect } from 'react';
import { isTokenExpired, logoutUser, refreshAccessToken, decodeJwt } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('idp_token');
    // Check if token exists and is valid
    if (savedToken && !isTokenExpired(savedToken)) {
      return savedToken;
    }
    // Remove if expired
    localStorage.removeItem('idp_token');
    localStorage.removeItem('idp_refresh_token');
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedToken = localStorage.getItem('idp_token');
    return !!savedToken && !isTokenExpired(savedToken);
  });

  const login = (accessToken, refreshToken) => {
    localStorage.setItem('idp_token', accessToken);
    localStorage.setItem('idp_active_tab', 'dashboard');
    if (refreshToken) {
      localStorage.setItem('idp_refresh_token', refreshToken);
    } else {
      localStorage.removeItem('idp_refresh_token');
    }
    setToken(accessToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    const savedToken = localStorage.getItem('idp_token');
    if (savedToken) {
      logoutUser(savedToken).catch(err => console.error("Session logout error:", err));
    }
    localStorage.removeItem('idp_token');
    localStorage.removeItem('idp_refresh_token');
    localStorage.removeItem('idp_active_tab');
    setToken(null);
    setIsAuthenticated(false);
  };

  // Periodic check for token validity and proactive automatic refresh
  useEffect(() => {
    if (!token) return;

    let isRefreshing = false;

    const checkAndRefreshToken = async () => {
      if (isRefreshing) return;

      const savedRefreshToken = localStorage.getItem('idp_refresh_token');
      if (!savedRefreshToken) {
        // Fall back to checking absolute expiration if no refresh token is present
        if (isTokenExpired(token)) {
          logout();
        }
        return;
      }

      try {
        // Decode the JWT to inspect the exp claim
        const decoded = decodeJwt(token);
        if (decoded) {
          const nowInSecs = Math.floor(Date.now() / 1000);

          // If the token is already expired OR expires in less than 5 minutes (300 seconds), refresh it
          if (decoded.exp && (decoded.exp - nowInSecs < 300)) {
            isRefreshing = true;
            console.log("Access token is expiring soon, initiating automatic refresh...");
            const res = await refreshAccessToken(savedRefreshToken);
            if (res.success && res.data?.access_token) {
              const { access_token, refresh_token } = res.data;
              localStorage.setItem('idp_token', access_token);
              if (refresh_token) {
                localStorage.setItem('idp_refresh_token', refresh_token);
              }
              setToken(access_token);
              console.log("Access token refreshed successfully.");
            } else {
              console.warn("Failed to refresh access token, logging out user:", res.message);
              logout();
            }
          }
        } else {
          // If token format is invalid, log out
          logout();
        }
      } catch (err) {
        console.error("Error checking or refreshing access token:", err);
        if (isTokenExpired(token)) {
          logout();
        }
      } finally {
        isRefreshing = false;
      }
    };

    // Run check immediately on mount or when token changes
    checkAndRefreshToken();

    // Check periodically every 10 seconds
    const interval = setInterval(checkAndRefreshToken, 10000);

    return () => clearInterval(interval);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
