import React from 'react';

const AuthBrandPanel = ({
  headline = "Centralized OIDC Identity Control Room.",
  description = "Enterprise-grade single sign-on authentication directory with real-time throughput metrics and multi-factor safety controls."
}) => {
  return (
    <div className="hidden lg:flex flex-col justify-between relative overflow-hidden w-full h-full min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-12 py-14 select-none text-left">
      {/* Glow overlays */}
      <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-60px] w-[360px] h-[360px] rounded-full bg-purple-500/25 blur-3xl pointer-events-none" />
      
      {/* Header Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg">
          <span className="text-white font-black text-base tracking-wider">B</span>
        </div>
        <span className="text-white font-black text-lg tracking-tight">Backendify IdP</span>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 text-[10px] font-extrabold uppercase tracking-widest">Identity Provider</span>
          </div>
          <div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight whitespace-pre-line">
              {headline}
            </h2>
            <p className="text-indigo-200/70 text-sm font-semibold mt-4 leading-relaxed max-w-xs">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <p className="text-white/30 text-[10px] font-semibold">
          © 2026 Backendify — Built with React & Vite
        </p>
      </div>
    </div>
  );
};

export default AuthBrandPanel;
