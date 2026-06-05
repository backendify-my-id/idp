import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import Consent from './pages/Consent';

const MainApp = () => {
  const { token, isAuthenticated, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [verifyEmailAddr, setVerifyEmailAddr] = useState('');
  const [verifyOnRegister, setVerifyOnRegister] = useState(false);

  // If user is authenticated and OIDC query parameters are present on login/home path, redirect back to backend authorize endpoint
  useEffect(() => {
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get('client_id');
      const redirectUri = params.get('redirect_uri');
      
      if (clientId && redirectUri && window.location.pathname !== '/consent') {
        const authorizeUrl = `http://localhost:8800/authorize${window.location.search}&token=${token}`;
        window.location.href = authorizeUrl;
      }
    }
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return (
        <Register
          onRegisterSuccess={() => {
            setVerifyEmailAddr('');
            setVerifyOnRegister(false);
            setCurrentPage('login');
          }}
          onNavigateToLogin={() => {
            setVerifyEmailAddr('');
            setVerifyOnRegister(false);
            setCurrentPage('login');
          }}
          initialEmail={verifyEmailAddr}
          initialIsVerifying={verifyOnRegister}
        />
      );
    }
    if (currentPage === 'reset-password') {
      return (
        <ResetPassword
          onResetSuccess={(email) => {
            setResetEmail(email);
            setCurrentPage('login');
          }}
          onNavigateToLogin={() => setCurrentPage('login')}
          initialEmail={resetEmail}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={(accessToken) => login(accessToken)}
        onNavigateToRegister={() => {
          setVerifyEmailAddr('');
          setVerifyOnRegister(false);
          setCurrentPage('register');
        }}
        onNavigateToResetPassword={(email) => {
          setResetEmail(email);
          setCurrentPage('reset-password');
        }}
        onNavigateToVerifyEmail={(email) => {
          setVerifyEmailAddr(email);
          setVerifyOnRegister(true);
          setCurrentPage('register');
        }}
      />
    );
  }

  if (window.location.pathname === '/consent') {
    return <Consent />;
  }

  return (
    <Dashboard token={token} onLogout={logout} />
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
