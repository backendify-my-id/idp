import React, { useState, useEffect } from 'react';
import { getClientPublicInfo, submitConsent } from '../services/api';
import AuthLayouts from '../layouts/AuthLayouts';

const SCOPE_META = {
  openid: {
    title: 'ID Identitas Digital',
    desc: 'Mengakses pengenal unik Anda agar sistem mengenali sesi masuk Anda dengan aman.',
    icon: (
      <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    )
  },
  email: {
    title: 'Alamat Email Utama',
    desc: 'Melihat alamat email utama yang terdaftar untuk keperluan verifikasi dan kontak.',
    icon: (
      <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    )
  },
  profile: {
    title: 'Profil Pengguna',
    desc: 'Membaca informasi profil umum seperti nama lengkap, bio singkat, dan foto profil.',
    icon: (
      <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  roles: {
    title: 'Peran & Hak Akses',
    desc: 'Membaca grup otoritas atau peran (roles) akun Anda di dalam sistem.',
    icon: (
      <svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    )
  }
};

export default function Consent() {
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Parse OIDC parameters from URL Query
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const scopeStr = params.get('scope') || 'openid';
  const scopes = scopeStr.split(' ');
  const state = params.get('state') || '';

  const token = localStorage.getItem('idp_token');

  useEffect(() => {
    if (!clientId) {
      setError('Client ID is missing in authorization request.');
      setLoading(false);
      return;
    }

    getClientPublicInfo(clientId)
      .then((res) => {
        if (res && res.success) {
          setClientInfo(res.data);
        } else {
          setError(res.message || 'Failed to retrieve client details.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch OIDC client info.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clientId]);

  const handleApprove = async () => {
    if (!token) {
      // If session is lost, send back to login
      window.location.href = `/login${window.location.search}`;
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitConsent(token, clientId, scopes);
      if (res && res.success) {
        // Redirect back to backend authorize endpoint with original query parameters
        // The backend will now see the granted consent and redirect to client redirect_uri
        window.location.href = `http://localhost:8800/oauth/authorize${window.location.search}&token=${token}`;
      } else {
        setError(res.message || 'Failed to register scope consent.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.message || 'Network error submitting scope consent.');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (redirectUri) {
      // Redirect back to client callback with access_denied error parameter
      const cancelUrl = `${redirectUri}?error=access_denied&error_description=User+denied+consent&state=${state}`;
      window.location.href = cancelUrl;
    } else {
      setError('Cannot redirect: redirect_uri parameter is missing.');
    }
  };

  if (loading) {
    return (
      <AuthLayouts>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mt-4">Memuat Permintaan Izin...</p>
          </div>
        </div>
      </AuthLayouts>
    );
  }

  return (
    <AuthLayouts>
      <div className="w-full min-h-screen flex items-center justify-center p-6 bg-slate-55 dark:bg-[#090d16] transition-colors relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-purple-500/8 dark:bg-purple-500/12 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

        <div className="w-full max-w-[460px] bg-white dark:bg-[#0e1322]/80 border border-slate-200/60 dark:border-slate-800/85 rounded-[32px] p-8 sm:p-9 shadow-2xl backdrop-blur-md animate-scale-up text-left relative z-10">
          
          {/* Integration Bridge Graphic */}
          <div className="flex items-center justify-center gap-6 mb-8 mt-2 select-none relative">
            <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full filter blur-xl scale-75 -z-10 animate-pulse" />

            {/* Left App: Backendify (IDP) */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 opacity-20 dark:opacity-30 blur-sm group-hover:opacity-40 transition-opacity duration-300" />
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-lg relative z-10 transition-transform duration-300 group-hover:scale-105">
                <svg className="w-9 h-9 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>

            {/* Connection Bridge */}
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-full h-0.5 border-t-2 border-dashed border-slate-200 dark:border-slate-700/80 absolute" />
              <div className="absolute w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 flex items-center justify-center shadow-md relative z-10">
                <svg className="w-4 h-4 text-indigo-605 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Right App: Requesting Client App */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 dark:opacity-30 blur-sm group-hover:opacity-40 transition-opacity duration-300" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-650 to-pink-500 flex items-center justify-center shadow-lg relative z-10 transition-transform duration-300 group-hover:scale-105 text-white font-black text-2xl tracking-tighter">
                {clientInfo?.client_name ? clientInfo.client_name[0].toUpperCase() : 'A'}
              </div>
            </div>
          </div>

          {/* Trust Signal Badge */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/20 shadow-sm">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Aplikasi Terverifikasi
            </div>
          </div>

          {/* Headline Text */}
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight mb-2">
              Hubungkan Aplikasi
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Aplikasi <strong className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 font-extrabold text-sm">{clientInfo?.client_name || 'Aplikasi Pihak Ketiga'}</strong> meminta izin untuk mengakses detail akun Backendify Anda.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-2xl mb-6">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-normal">{error}</p>
            </div>
          )}

          {/* Scope list explanation */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-350 uppercase tracking-widest">
                Izin yang Diminta
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {scopes.length} Akses diperlukan
              </span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1.5 scrollbar-thin">
              {scopes.map((scope) => {
                const meta = SCOPE_META[scope] || {
                  title: scope.toUpperCase(),
                  desc: `Izin akses khusus untuk cakupan ${scope}.`,
                  icon: (
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.97-8.97m-8.97 8.97L15 15M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
                    </svg>
                  )
                };

                return (
                  <div key={scope} className="group flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/40 hover:border-indigo-500/35 dark:hover:border-indigo-500/25 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {meta.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal font-semibold">
                        {meta.desc}
                      </p>
                    </div>
                    <div className="shrink-0 self-center">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                        <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secure Encryption Shield Indicator Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-500/5 dark:bg-slate-400/5 border border-slate-200/40 dark:border-slate-800/40 mb-8 select-none">
            <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
              <strong>Koneksi Terenkripsi:</strong> Backendify tidak membagikan kata sandi Anda dengan aplikasi ini. Akses dapat dicabut kapan saja melalui halaman Profil.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="flex-1 py-3.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 active:scale-95 font-extrabold uppercase tracking-wider text-xs rounded-2xl cursor-pointer disabled:opacity-40 disabled:pointer-events-none text-center"
            >
              Batal
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting || error !== ''}
              className="flex-[2] py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-750 to-violet-700 hover:from-indigo-550 hover:via-indigo-650 hover:to-violet-650 text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)] dark:shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.45)] active:scale-95 transition-all duration-300 font-extrabold uppercase tracking-wider text-xs rounded-2xl cursor-pointer disabled:opacity-40 disabled:pointer-events-none text-center flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Setujui & Lanjutkan</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </AuthLayouts>
  );
}

