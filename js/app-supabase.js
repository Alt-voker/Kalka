(function (window) {
  var app = window.KalkaApp = window.KalkaApp || {};
  var client = null;
  var attempted = false;

  function init() {
    if (attempted) return client;
    attempted = true;

    var config = app.config && app.config.getSupabaseConfig ? app.config.getSupabaseConfig() : null;
    if (!config || !config.enabled || !window.supabase || !window.supabase.createClient) {
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
      window.__supabase = client;
      window.supabaseClient = client;
      window.sb = client;
      window.SB = client;
    } catch (error) {
      console.error('Supabase init failed:', error);
      client = null;
      window.__supabase = null;
      window.supabaseClient = null;
      window.sb = null;
      window.SB = null;
    }

    return client;
  }

  app.supabase = {
    init: init,
    getClient: init,
    isEnabled: function () {
      return !!init();
    }
  };
})(window);
