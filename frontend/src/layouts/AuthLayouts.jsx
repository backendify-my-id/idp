import React from 'react';
import { useTheme } from '../context/ThemeContext';

const AuthLayouts = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col w-full max-w-full overflow-x-hidden ${
      theme === 'dark' ? 'dark bg-[#090d16] text-slate-100' : 'bg-[#fcfdff] text-slate-900'
    }`}>
      {/* Settings Toggle Bar */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white/20 dark:bg-slate-800/40 hover:bg-white/40 dark:hover:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/40 backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 text-slate-600 dark:text-slate-400 shadow-sm"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
            </svg>
          )}
        </button>
      </div>

      <main className="grow flex flex-col w-full max-w-full">
        {children}
      </main>
    </div>
  );
};

export default AuthLayouts;
