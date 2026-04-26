(function (window) {
  var app = window.KalkaApp = window.KalkaApp || {};
  var client = null;
  var attempted = false;
  var lastError = null;

  function setClientGlobals(value) {
    window.__supabase = value || undefined;
    window.supabaseClient = value || undefined;
    window.sb = value || undefined;
    window.SB = value || undefined;
  }

  function init() {
    if (attempted) return client;
    attempted = true;

    var config = app.config && app.config.getSupabaseConfig ? app.config.getSupabaseConfig() : null;
    if (!config || !config.enabled) {
      lastError = new Error('Supabase config missing');
      console.error('Supabase client init failed: missing config', {
        hasUrl: !!(config && config.url),
        hasAnonKey: !!(config && config.anonKey)
      });
      setClientGlobals(null);
      return null;
    }
    if (!window.supabase || !window.supabase.createClient) {
      lastError = new Error('Supabase JS library not loaded');
      console.error('Supabase JS library not loaded');
      setClientGlobals(null);
      return null;
    }

    try {
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'kalka-supabase-auth'
        }
      });
      setClientGlobals(client);
      window.__supabaseInitError = null;
    } catch (error) {
      console.error('Supabase init failed:', error);
      lastError = error;
      client = null;
      setClientGlobals(null);
    }

    return client;
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
