import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const OidcClients = ({
  clientName,
  setClientName,
  clientId,
  setClientId,
  isPkceRequired,
  setIsPkceRequired,
  redirectUrls,
  setRedirectUrls,
  clientsList,
  isLoadingClients,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onAddUrlField,
  onRemoveUrlField,
  newlyCreatedClient,
  clearNewlyCreatedClient
}) => {
  // State to manage client editing modal
  const [editingClient, setEditingClient] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPkce, setEditPkce] = useState(false);
  const [editUrls, setEditUrls] = useState(['']);

  // Copy success indicator states
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopySecret = (secret) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const startEdit = (client) => {
    setEditingClient(client);
    setEditName(client.client_name);
    setEditPkce(client.is_pkce_required);
    setEditUrls(client.redirect_urls && client.redirect_urls.length > 0 ? [...client.redirect_urls] : ['']);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingClient) return;

    const success = await onUpdateClient(editingClient.id, editName, editPkce, editUrls);
    if (success) {
      setEditingClient(null);
    }
  };

  const addEditUrlField = () => setEditUrls([...editUrls, '']);
  const removeEditUrlField = (idx) => setEditUrls(editUrls.filter((_, i) => i !== idx));

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">OIDC Client Registries</h4>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
          Manage authorized Single Sign-On (SSO) client credentials and PKCE redirect verification scopes.
        </p>
      </div>

      {newlyCreatedClient && (
        <div className="p-6 rounded-3xl border border-amber-250/70 dark:border-amber-900/35 bg-amber-50/50 dark:bg-amber-950/15 backdrop-blur-md shadow-sm space-y-4 animate-scale-up relative">
          <button
            onClick={clearNewlyCreatedClient}
            className="absolute top-4 right-4 p-1.5 rounded-full text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition duration-150 cursor-pointer"
            title="Dismiss Credentials"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1.5 flex-1 min-w-0 pr-6">
              <h5 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider select-none">
                Salin Kredensial Klien OIDC Baru Anda!
              </h5>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400/90 leading-relaxed select-none">
                Aplikasi <strong>{newlyCreatedClient.client_name}</strong> berhasil dikonfigurasi. Demi keamanan, Client Secret ini tidak akan pernah dapat dilihat kembali setelah Anda menutup pemberitahuan ini.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Client ID Card */}
            <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl flex flex-col justify-between relative group/cid">
              <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider select-none">Client ID</span>
              <div className="flex justify-between items-center mt-2.5 gap-2">
                <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 truncate select-all">{newlyCreatedClient.client_id}</span>
                <button
                  onClick={() => handleCopyId(newlyCreatedClient.client_id)}
                  className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer shrink-0"
                >
                  {copiedId ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Client Secret Card */}
            <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl flex flex-col justify-between relative group/sec">
              <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider select-none">Client Secret</span>
              <div className="flex justify-between items-center mt-2.5 gap-2">
                <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 truncate select-all">{newlyCreatedClient.client_secret}</span>
                <button
                  onClick={() => handleCopySecret(newlyCreatedClient.client_secret)}
                  className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer shrink-0"
                >
                  {copiedSecret ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">

        {/* Left Side: Client Creation Form */}
        <div className="xl:col-span-1 p-6 border border-slate-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/40 backdrop-blur-md rounded-3xl space-y-4 shadow-sm">
          <h5 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
            Register Client Application
          </h5>

          <form onSubmit={onCreateClient} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Application Name
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="My Dashboard App"
                className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="pkce"
                checked={isPkceRequired}
                onChange={(e) => setIsPkceRequired(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="pkce" className="text-xs font-bold text-slate-850 dark:text-slate-200 cursor-pointer select-none">
                Enforce PKCE Flow
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Redirect Callback URLs
              </label>
              {redirectUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => {
                      const next = [...redirectUrls];
                      next[idx] = e.target.value;
                      setRedirectUrls(next);
                    }}
                    placeholder="http://localhost:3000/callback"
                    className="grow px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                  {redirectUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveUrlField(idx)}
                      className="px-2 text-rose-500 font-extrabold hover:text-rose-600 transition-colors cursor-pointer text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={onAddUrlField}
                className="text-[11px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-wider block transition-colors cursor-pointer"
              >
                + Add Another Redirect URI
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 btn-primary text-xs font-black uppercase tracking-wider text-white rounded-xl cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
            >
              Verify & Register application
            </button>
          </form>
        </div>        {/* Right Side: Active Client Registries */}
        <div className="xl:col-span-2 space-y-4">
          <h5 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
            Active Application Registries ({clientsList.length})
          </h5>

          {isLoadingClients ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
              Syncing client databases...
            </div>
          ) : clientsList.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-250 dark:border-slate-800 rounded-3xl text-center text-slate-450 font-bold text-xs uppercase tracking-wider">
              No registered clients found. Get started using the wizard!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientsList.map((c) => (
                <div
                  key={c.id}
                  className="p-5 border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/20 backdrop-blur rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:scale-[1.01] transition-transform min-w-0 overflow-hidden"
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white block truncate">
                          {c.client_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Edit Client Application"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteClient(c.id, c.client_name)}
                          className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Client Registry"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-700 dark:text-slate-350 font-semibold space-y-2.5 pt-2.5 border-t border-slate-150 dark:border-slate-800/60 min-w-0">

                      {/* Client ID Registry Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-800 dark:text-slate-200">CLIENT ID:</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code className="text-[9.5px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300 truncate max-w-[120px] sm:max-w-[160px]">{c.client_id}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(c.client_id);
                            }}
                            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400 transition"
                            title="Copy Client ID"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7.5a3 3 0 013-3h3.5m-3.5 3h-4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h5m0 0v5m0-5L14 9" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Client Secret Registry Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-800 dark:text-slate-200">CLIENT SECRET:</span>
                        <div className="flex items-center gap-1.5">
                          <code className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500">••••••••••••••••</code>
                          <button
                            onClick={() => onRegenerateSecret(c.id, c.client_name)}
                            className="px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:hover:bg-amber-950/45 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30 rounded transition cursor-pointer"
                            title="Regenerate Client Secret"
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-800 dark:text-slate-200">PKCE FLOW:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold border ${c.is_pkce_required
                          ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30'
                          : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
                          }`}>
                          {c.is_pkce_required ? 'ENFORCED' : 'OPTIONAL'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-slate-800 dark:text-slate-200 block mb-1">CALLBACK URIS:</span>
                        <div className="space-y-1 font-mono text-[9px] text-slate-900 dark:text-slate-100 min-w-0">
                          {c.redirect_urls?.map((url, i) => (
                            <div key={i} className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 font-bold truncate max-w-full">
                              {url}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Edit Client Modal Overlay using React Portal */}
      {editingClient && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setEditingClient(null)} />          <div className="relative w-full max-w-md p-6 bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl animate-scale-up space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Edit Client Application
              </h5>
              <button
                onClick={() => setEditingClient(null)}
                className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] md:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] md:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Client Identifier
                </label>
                <input
                  type="text"
                  disabled
                  value={editingClient.client_id}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs md:text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                />
                <span className="text-[10px] text-slate-450 mt-1 block">Client ID cannot be modified after registration.</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-pkce"
                  checked={editPkce}
                  onChange={(e) => setEditPkce(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="edit-pkce" className="text-xs font-bold text-slate-850 dark:text-slate-200 cursor-pointer select-none">
                  Enforce PKCE Flow
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] md:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Redirect Callback URLs
                </label>
                {editUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => {
                        const next = [...editUrls];
                        next[idx] = e.target.value;
                        setEditUrls(next);
                      }}
                      placeholder="http://localhost:3000/callback"
                      className="grow px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-semibold"
                    />
                    {editUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEditUrlField(idx)}
                        className="px-2 text-rose-500 font-extrabold hover:text-rose-600 transition-colors cursor-pointer text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEditUrlField}
                  className="text-[11px] md:text-xs font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-wider block transition-colors cursor-pointer"
                >
                  + Add Another Redirect URI
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="flex-1 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-xs md:text-sm font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 btn-primary text-xs md:text-sm font-bold text-white rounded-xl cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OidcClients;
