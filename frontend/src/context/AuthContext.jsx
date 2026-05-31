import React, { createContext, useState, useContext, useEffect } from 'react';
import { isTokenExpired } from '../services/api';

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
    if (refreshToken) {
      localStorage.setItem('idp_refresh_token', refreshToken);
    } else {
      localStorage.removeItem('idp_refresh_token');
    }
    setToken(accessToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('idp_token');
    localStorage.removeItem('idp_refresh_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  // Periodic check for token validity
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        logout();
      }
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
