import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

const MainApp = () => {
  const { token, isAuthenticated, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('login');

  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return (
        <Register
          onRegisterSuccess={() => setCurrentPage('login')}
          onNavigateToLogin={() => setCurrentPage('login')}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={(accessToken) => login(accessToken)}
        onNavigateToRegister={() => setCurrentPage('register')}
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
