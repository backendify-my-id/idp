import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';

const MainApp = () => {
  const { token, isAuthenticated, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [verifyEmailAddr, setVerifyEmailAddr] = useState('');
  const [verifyOnRegister, setVerifyOnRegister] = useState(false);

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
