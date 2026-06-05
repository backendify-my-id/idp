import React, { useState, useEffect } from 'react';
import { getClientPublicInfo, submitConsent } from '../services/api';
import AuthLayouts from '../layouts/AuthLayouts';

const SCOPE_META = {
  openid: {
    title: 'ID Unik Identitas',
    desc: 'Mengakses ID unik akun Anda untuk memverifikasi autentikasi.',
    icon: (
      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    )
  },
  email: {
    title: 'Alamat Email',
    desc: 'Melihat alamat email utama yang terdaftar pada akun Anda.',
    icon: (
      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    )
  },
  profile: {
    title: 'Profil Lengkap',
    desc: 'Membaca nama lengkap, bio, dan foto profil Anda.',
    icon: (
      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )
  },
  roles: {
    title: 'Peran & Akses',
    desc: 'Melihat grup kewenangan atau peran (roles) akun Anda.',
    icon: (
      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
        window.location.href = `http://localhost:8800/authorize${window.location.search}&token=${token}`;
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
      <div className="w-full min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#090d16] transition-colors relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-purple-500/4 dark:bg-purple-500/6 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white dark:bg-[#0e1322]/80 border border-slate-200/60 dark:border-slate-800/85 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-scale-up text-left">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-white font-black text-xl shrink-0">
              {clientInfo?.client_name ? clientInfo.client_name[0].toUpperCase() : 'A'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white tracking-tight">Izin Akses Aplikasi</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{clientInfo?.client_name || 'Aplikasi Pihak Ketiga'}</span> meminta akses ke akun Anda.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-2xl mb-5">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-normal">{error}</p>
            </div>
          )}

          {/* Scope list explanation */}
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3.5 select-none">
            Informasi yang akan dibagikan:
          </p>

          <div className="space-y-3 mb-6 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
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
                <div key={scope} className="flex gap-3.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-950/45 border border-slate-100 dark:border-slate-850 flex items-center justify-center shrink-0">
                    {meta.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{meta.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-semibold">{meta.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-6 select-none">
            Setelah disetujui, Anda akan langsung dialihkan kembali ke aplikasi klien. Anda dapat mencabut izin akses ini sewaktu-waktu melalui halaman Pengaturan Profil Backendify.
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="flex-1 py-3 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none text-center"
            >
              Batal
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting || error !== ''}
              className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider transition shadow-md hover:shadow-lg active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none text-center flex items-center justify-center"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Setujui & Lanjutkan'
              )}
            </button>
          </div>

        </div>
      </div>
    </AuthLayouts>
  );
}
