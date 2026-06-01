import React from 'react';

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
  onDeleteClient,
  onAddUrlField,
  onRemoveUrlField
}) => {
  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">OIDC Client Registries</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
          Manage authorized Single Sign-On (SSO) client credentials and PKCE redirect verification scopes.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Client Creation Form */}
        <div className="xl:col-span-1 p-6 border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/15 backdrop-blur-md rounded-3xl space-y-4">
          <h5 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
            Register Client Application
          </h5>
          
          <form onSubmit={onCreateClient} className="space-y-4">
            <div>
              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Application Name
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="My Dashboard App"
                className="w-full px-3 py-2.5 border rounded-xl text-xs"
              />
            </div>
            
            <div>
              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Client Identifier
              </label>
              <input
                type="text"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="dashboard-sso-id"
                className="w-full px-3 py-2.5 border rounded-xl text-xs"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="pkce"
                checked={isPkceRequired}
                onChange={(e) => setIsPkceRequired(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="pkce" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                Enforce PKCE Flow
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                    className="grow px-3 py-2 border rounded-xl text-xs"
                  />
                  {redirectUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveUrlField(idx)}
                      className="px-2 text-rose-500 font-extrabold hover:text-rose-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={onAddUrlField}
                className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block hover:text-indigo-600 transition-colors"
              >
                + Add Another Redirect URI
              </button>
            </div>
            
            <button
              type="submit"
              className="w-full py-3 btn-primary text-xs font-bold text-white rounded-xl cursor-pointer"
            >
              Verify & Register application
            </button>
          </form>
        </div>

        {/* Right Side: Active Client Registries */}
        <div className="xl:col-span-2 space-y-4">
          <h5 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Active Application Registries ({clientsList.length})
          </h5>
          
          {isLoadingClients ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-xs uppercase tracking-wider">
              Syncing client databases...
            </div>
          ) : clientsList.length === 0 ? (
            <div className="p-8 border border-dashed rounded-3xl text-center text-slate-400 font-semibold text-xs uppercase tracking-wider">
              No registered clients found. Get started using the wizard!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientsList.map((c) => (
                <div
                  key={c.id}
                  className="p-5 border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/10 backdrop-blur rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:scale-[1.01] transition-transform min-w-0 overflow-hidden"
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="font-extrabold text-sm text-slate-850 dark:text-white block truncate">
                          {c.client_name}
                        </span>
                        <code className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-500 dark:text-indigo-400 font-bold mt-1 inline-block truncate max-w-full">
                          {c.client_id}
                        </code>
                      </div>
                      
                      <button
                        onClick={() => onDeleteClient(c.id, c.client_name)}
                        className="p-1 text-rose-450 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                        title="Delete Client Registry"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="text-[9.5px] text-slate-500 font-semibold space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-400">PKCE FLOW:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${
                          c.is_pkce_required 
                           ? 'bg-purple-50 text-purple-700 border-purple-100' 
                           : 'bg-slate-50 text-slate-450 border-slate-200'
                        }`}>
                          {c.is_pkce_required ? 'ENFORCED' : 'OPTIONAL'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-slate-400 block mb-0.5">CALLBACK URIS:</span>
                        <div className="space-y-0.5 font-mono text-[8.5px] truncate text-slate-600 dark:text-slate-350 min-w-0">
                          {c.redirect_urls?.map((url, i) => (
                            <div key={i} className="truncate max-w-full">• {url}</div>
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

    </div>
  );
};

export default OidcClients;
