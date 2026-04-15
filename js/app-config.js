(function (window) {
  var app = window.KalkaApp = window.KalkaApp || {};
  var STORAGE_KEY = 'kalka_supabase_config';

  function readMeta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '').trim() : '';
  }

  function parseJson(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function getSupabaseConfig() {
    var raw = window.__KALKA_SUPABASE__ || parseJson(localStorage.getItem(STORAGE_KEY)) || {};
    var config = {
      url: raw.url || raw.supabaseUrl || readMeta('kalka-supabase-url') || readMeta('supabase-url') || '',
      anonKey: raw.anonKey || raw.supabaseAnonKey || readMeta('kalka-supabase-anon-key') || readMeta('supabase-anon-key') || ''
    };
    config.enabled = !!(config.url && config.anonKey);
    return config;
  }

  app.config = {
    storageKey: STORAGE_KEY,
    getSupabaseConfig: getSupabaseConfig
  };
})(window);
