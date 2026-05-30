import React, { useState, useEffect } from 'react';
import { getClients, createClient, deleteClient } from '../services/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import { useLanguage } from '../context/LanguageContext';

const OidcClientManager = ({ token }) => {
  const { t } = useLanguage();
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Client secret display overlay
  const [newClientSecret, setNewClientSecret] = useState('');
  const [showSecretModal, setShowSecretModal] = useState(false);

  // New Client Form State
  const [name, setName] = useState('');
  const [appClientID, setAppClientID] = useState('');
  const [isPkceRequired, setIsPkceRequired] = useState(true);
  const [redirectUrls, setRedirectUrls] = useState(['']);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [pkceFilter, setPkceFilter] = useState('all'); // 'all', 'pkce', 'no-pkce'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5); // 5 cards per page by default

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {}
  });

  // Toast Notification State
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const res = await getClients(token);
      if (res.success) {
        setClients(res.data || []);
      } else {
        setErrorMessage(res.message || 'Failed to load client applications.');
      }
    } catch (err) {
      setErrorMessage('Failed to load OIDC clients.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadClients();
    }
  }, [token]);

  // Reset to first page when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pkceFilter, rowsPerPage]);

  const handleAddUrlField = () => {
    setRedirectUrls([...redirectUrls, '']);
  };

  const handleRemoveUrlField = (index) => {
    if (redirectUrls.length === 1) return;
    const newUrls = [...redirectUrls];
    newUrls.splice(index, 1);
    setRedirectUrls(newUrls);
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...redirectUrls];
    newUrls[index] = value;
    setRedirectUrls(newUrls);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    // Filter out blank redirect URLs
    const filteredUrls = redirectUrls.filter(url => url.trim() !== '');
    if (filteredUrls.length === 0) {
      setErrorMessage('At least one redirect URL is required.');
      return;
    }

    try {
      const res = await createClient(token, {
        client_name: name,
        client_id: appClientID,
        is_pkce_required: isPkceRequired,
        redirect_urls: filteredUrls
      });

      if (res.success) {
        setSuccessMessage('Client application registered successfully!');
        setNewClientSecret(res.data.client_secret || '');
        setShowSecretModal(true);
        setIsCreating(false);
        // Reset form
        setName('');
        setAppClientID('');
        setIsPkceRequired(true);
        setRedirectUrls(['']);
        loadClients();
        
        // Show Success Toast
        setToastMessage('Successfully registered client application!');
        setToastType('success');
        setToastOpen(true);
      } else {
        setErrorMessage(res.message || 'Failed to register client application.');
      }
    } catch (err) {
      setErrorMessage('Something went wrong during registration.');
    }
  };

  const handleDeleteClick = (id, clientName) => {
    setConfirmData({
      title: 'Delete Client Application',
      message: `Are you sure you want to delete "${clientName}"? Any applications relying on this Client ID will immediately fail.`,
      type: 'danger',
      onConfirm: () => executeDelete(id, clientName)
    });
    setIsConfirmOpen(true);
  };

  const executeDelete = async (id, clientName) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await deleteClient(token, id);
      if (res.success) {
        setSuccessMessage(`Application "${clientName}" has been successfully deleted.`);
        setToastMessage(`Application "${clientName}" has been deleted.`);
        setToastType('success');
        setToastOpen(true);
        loadClients();
      } else {
        setErrorMessage(res.message || 'Failed to delete client application.');
      }
    } catch (err) {
      setErrorMessage('Failed to delete client.');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(newClientSecret);
    setToastMessage('Client secret copied to clipboard!');
    setToastType('success');
    setToastOpen(true);
  };

  // Perform Client-Side Filtering
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      (client.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.client_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPkce =
      pkceFilter === 'all' ||
      (pkceFilter === 'pkce' && client.is_pkce_required) ||
      (pkceFilter === 'no-pkce' && !client.is_pkce_required);

    return matchesSearch && matchesPkce;
  });

  // Calculate Paginated Subset
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  return (
    <div className="pt-2 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            {t('clients.title')}
          </h5>
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-405 rounded-full text-[9px] font-extrabold uppercase tracking-wide border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            {filteredClients.length} of {clients.length}
          </span>
        </div>
        <button
          onClick={() => {
            setIsCreating(!isCreating);
            setErrorMessage('');
            setSuccessMessage('');
          }}
          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-305 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          {isCreating ? t('common.cancel') : `+ ${t('clients.createClientBtn')}`}
        </button>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl text-left animate-scale-up">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 text-xs font-semibold rounded-xl text-left animate-scale-up">
          {successMessage}
        </div>
      )}

      {/* Client Secret Single-View Modal */}
      {showSecretModal && (
        <div className="p-5 border border-amber-200 dark:border-amber-900/35 bg-amber-50/20 dark:bg-amber-950/10 backdrop-blur-sm rounded-3xl space-y-4 animate-scale-up text-left shadow-sm transition-colors">
          <h5 className="font-extrabold text-xs text-amber-900 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
            ⚠️ {t('clients.showSecretTitle')}
          </h5>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            {t('clients.showSecretWarning')}
          </p>

          <div className="flex gap-2 items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <code className="text-xs font-bold text-slate-900 dark:text-slate-200 select-all break-all grow tracking-wider">{newClientSecret}</code>
            <button
              onClick={handleCopySecret}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-[9px] font-extrabold uppercase tracking-wider hover:bg-amber-700 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md shadow-amber-100 dark:shadow-none"
            >
              {t('common.confirm')}
            </button>
          </div>

          <button
            onClick={() => setShowSecretModal(false)}
            className="w-full py-2.5 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
          >
            {t('clients.showSecretBtn')}
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      {!isLoading && !isCreating && clients.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs animate-fade-in">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('clients.searchPlaceholder')}
              className="block w-full pl-10 pr-4 py-2 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200"
            />
          </div>

          {/* PKCE Filter Segment */}
          <div className="flex bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 w-full sm:w-auto shadow-inner animate-fade-in">
            {[
              { value: 'all', label: 'All Apps' },
              { value: 'pkce', label: 'PKCE Enforced' },
              { value: 'no-pkce', label: 'No PKCE' }
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setPkceFilter(tab.value)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  pkceFilter === tab.value
                    ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/40'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isCreating ? (
        /* Create OIDC Client Form */
        <form onSubmit={handleCreateSubmit} className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white/20 dark:bg-slate-950/10 backdrop-blur-sm rounded-3xl space-y-5 animate-scale-up text-left shadow-sm transition-colors">
          <h5 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-400 uppercase tracking-wider">Register OIDC Client Application</h5>
          
          <div>
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-left">
              Application Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Portal Karyawan"
              className="mt-1 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-305 uppercase tracking-wider mb-2 text-left">
              App Client ID (Unique String)
            </label>
            <input
              type="text"
              value={appClientID}
              onChange={(e) => setAppClientID(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="e.g. portal-karyawan-app"
              className="mt-1 block w-full px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 transition-all"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pkce"
              checked={isPkceRequired}
              onChange={(e) => setIsPkceRequired(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer dark:border-slate-800 dark:bg-slate-900"
            />
            <label htmlFor="pkce" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              Require PKCE (Recommended for SPA/Mobile Apps)
            </label>
          </div>

          {/* Dynamic Redirect URLs */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-left">
              Allowed Redirect Callback URLs
            </label>
            {redirectUrls.map((url, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  placeholder="https://example.com/callback"
                  className="grow px-4 py-3 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleRemoveUrlField(index)}
                  className="px-2.5 py-1.5 text-slate-450 hover:text-rose-500 text-sm font-extrabold shrink-0 cursor-pointer transition-all focus:outline-none"
                  disabled={redirectUrls.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddUrlField}
              className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-800 transition-colors focus:outline-none cursor-pointer uppercase tracking-wider"
            >
              + Add Another Redirect URL
            </button>
          </div>

          <button
            type="submit"
            className="w-full btn-primary flex justify-center py-3.5 px-4 rounded-2xl text-sm font-bold text-white transition-all transform active:scale-98 cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
          >
            Register Client Application
          </button>
        </form>
      ) : (
        /* OIDC Client List */
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mt-2">Loading applications...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl animate-fade-in bg-slate-50/20 dark:bg-slate-950/5">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">No matching OIDC client applications registered yet.</p>
            </div>
          ) : (
            <>
              <div className="max-h-[520px] overflow-y-auto pr-1.5 space-y-3.5 scrollbar-thin">
                {paginatedClients.map((client) => (
                  <div
                    key={client.id}
                    className="p-5 border border-slate-200 dark:border-slate-800/60 bg-white/20 dark:bg-slate-950/10 backdrop-blur-sm rounded-3xl text-left relative flex justify-between gap-4 items-start shadow-sm hover:border-indigo-100 dark:hover:border-indigo-900/20 hover:bg-white/40 dark:hover:bg-slate-950/15 transition-all duration-200 animate-scale-up"
                  >
                    <div className="space-y-2 grow">
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{client.client_name}</span>
                        <span className={`text-[8px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm transition-colors ${
                          client.is_pkce_required
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 border-slate-250 dark:border-slate-700'
                        }`}>
                          {client.is_pkce_required ? 'PKCE Enforced' : 'No PKCE'}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1.5">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider text-[9px]">Client ID:</span>{' '}
                          <code className="bg-white/80 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-250 select-all transition-colors">{client.client_id}</code>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider text-[9px] block mb-1">Callback URLs:</span>
                          <ul className="list-disc pl-4 space-y-0.5 mt-0.5 text-slate-600 dark:text-slate-400 font-semibold">
                            {client.redirect_urls && client.redirect_urls.map((url, idx) => (
                              <li key={idx} className="break-all">{url}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteClick(client.id, client.client_name)}
                      className="px-2.5 py-2 text-rose-400 dark:text-rose-450 hover:text-rose-600 dark:hover:text-rose-350 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/35 transition-all shrink-0 focus:outline-none cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                      title="Delete Application"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center sm:text-left">
                    Showing <span className="text-slate-800 dark:text-slate-200 font-bold">{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{endIndex}</span> of{' '}
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{totalItems}</span> applications
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide">Show</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-extrabold text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                      >
                        {[5, 10, 15, 25].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>

                    {/* Page navigation buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-all focus:outline-none shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, index, arr) => {
                          const isGap = index > 0 && page - arr[index - 1] > 1;
                          return (
                            <React.Fragment key={page}>
                              {isGap && <span className="px-1 text-slate-400 text-xs">...</span>}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all focus:outline-none cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${
                                  currentPage === page
                                    ? 'bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white border-transparent'
                                    : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-all focus:outline-none shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Premium Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        message={confirmData.message}
        type={confirmData.type}
      />

      {/* Premium Toast Feedbacks */}
      <Toast
        isOpen={toastOpen}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
};

export default OidcClientManager;
