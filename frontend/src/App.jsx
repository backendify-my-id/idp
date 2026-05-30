import React from 'react';
import Layouts from './layouts/Layouts';
import Pages from './pages/Pages';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <AuthProvider>
          <Layouts>
            <Pages />
          </Layouts>
        </AuthProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}

export default App;
