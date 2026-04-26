(function (window) {
  var app = window.KalkaApp = window.KalkaApp || {};
  var client = null;
  var attempted = false;
  var lastError = null;
  var retryCount = 0;
  var retryTimer = null;
  var maxRetries = 5;
  var retryDelay = 300;

  function setClientGlobals(value) {
    window.__supabase = value || undefined;
    window.supabaseClient = value || undefined;
    window.sb = value || undefined;
    window.SB = value || undefined;
    window.__authClientReady = !!value;
    if (typeof window.__renderBuildDebug === 'function') {
      try { window.__renderBuildDebug(window.__userSession || null); } catch (error) {}
    }
    if (value && window.__lastInitError && /Supabase JS library not loaded/i.test(String(window.__lastInitError || ''))) {
      window.__lastInitError = null;
    }
  }

  function init() {
    if (client) return client;

    var config = app.config && app.config.getSupabaseConfig ? app.config.getSupabaseConfig() : null;
    if (!config || !config.enabled) {
      lastError = new Error('Supabase config missing');
      console.error('Supabase client init failed: missing config', {
        hasUrl: !!(config && config.url),
        hasAnonKey: !!(config && config.anonKey)
      });
      setClientGlobals(null);
      window.__authConfigStatus = 'FAIL';
      window.__lastInitError = 'Supabase config missing';
      return null;
    }
    if (!window.supabase || !window.supabase.createClient) {
      lastError = new Error('Supabase JS library not loaded');
      console.error('Supabase JS library not loaded');
      setClientGlobals(null);
      window.__authConfigStatus = 'FAIL';
      window.__lastInitError = 'Supabase JS library not loaded';
      scheduleRetry();
      return null;
    }

    attempted = true;
    try {
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'kalka-supabase-auth'
        }
      });
      if (!client) {
        throw new Error('Supabase client createClient returned null');
      }
      setClientGlobals(client);
      window.__supabaseInitError = null;
      window.__authConfigStatus = 'OK';
      window.__lastInitError = null;
    } catch (error) {
      console.error('Supabase init failed:', error);
      lastError = error;
      client = null;
      setClientGlobals(null);
      window.__authConfigStatus = 'FAIL';
      window.__lastInitError = error && error.message ? error.message : 'Supabase init failed';
      scheduleRetry();
    }

    return client;
  }

  function scheduleRetry() {
    if (client || retryTimer || retryCount >= maxRetries) return;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      retryCount += 1;
      if (!client) {
        try {
          init();
        } catch (error) {
          lastError = error;
          setClientGlobals(null);
          window.__authConfigStatus = 'FAIL';
          window.__lastInitError = error && error.message ? error.message : 'Supabase init failed';
        }
      }
    }, retryDelay);
  }

  app.supabase = {
    init: init,
    getClient: init,
    isEnabled: function () {
      return !!init();
    },
    lastError: function () {
      return lastError;
    }
  };

  init();
})(window);
