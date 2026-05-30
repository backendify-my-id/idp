import React from 'react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const LayoutsContent = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  // Apply dark class to documentElement for full Tailwind v4 dark mode compatibility
  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col w-full max-w-full overflow-x-hidden ${
      theme === 'dark' ? 'dark text-slate-100 bg-[#090d16]' : 'text-slate-900 bg-[#fcfdff]'
    }`}>
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <span className="text-white font-extrabold text-sm tracking-wider">B</span>
            </div>
            <h1 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Backendify IdP
            </h1>
          </div>
          <nav className="flex items-center gap-4sm sm:gap-5">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-400 transition-colors"
            >
              Documentation
            </a>

            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/40 dark:border-slate-700/40 transition-all cursor-pointer hover:scale-105 active:scale-95 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
              title="Toggle Language"
            >
              <svg className="w-3.5 h-3.5 shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m-4-3.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM2 12a10 10 0 1120 0 10 10 0 01-20 0z"></path>
              </svg>
              {language === 'en' ? 'EN' : 'ID'}
            </button>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/40 dark:border-slate-700/40 transition-all cursor-pointer hover:scale-105 active:scale-95 text-slate-600 dark:text-slate-350"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>
      <main className="grow flex flex-col items-center justify-start lg:justify-center w-full max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

const Layouts = ({ children }) => {
  return (
    <ThemeProvider>
      <LayoutsContent>{children}</LayoutsContent>
    </ThemeProvider>
  );
};

export default Layouts;
