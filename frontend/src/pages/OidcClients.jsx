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
  onRemoveUrlField
}) => {
  // State to manage client editing modal
  const [editingClient, setEditingClient] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPkce, setEditPkce] = useState(false);
  const [editUrls, setEditUrls] = useState(['']);

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

            <div>
              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Client Identifier
              </label>
              <input
                type="text"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="dashboard-sso-id"
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
                        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg text-indigo-700 dark:text-indigo-300 font-black mt-1 inline-block truncate max-w-full">
                          {c.client_id}
                        </code>
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

                    <div className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold space-y-2 pt-2.5 border-t border-slate-150 dark:border-slate-800/60 min-w-0">
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
