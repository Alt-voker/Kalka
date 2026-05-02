(function (window) {
  function readMeta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? String(el.getAttribute('content') || '').trim() : '';
  }

  function normalizeConfig(raw) {
    raw = raw || {};
    return {
      supabaseUrl: String(raw.supabaseUrl || raw.url || '').trim(),
      supabaseAnonKey: String(raw.supabaseAnonKey || raw.anonKey || '').trim(),
      storageProvider: String(raw.storageProvider || 'supabase').trim(),
      apiProvider: String(raw.apiProvider || 'supabase').trim(),
      authProvider: String(raw.authProvider || 'supabase').trim(),
      env: raw.env || {}
    };
  }

  function loadConfig() {
    var windowConfig = normalizeConfig(window.__KALKA_CONFIG__ || window.__KALKA_SUPABASE__ || {});
    var metaConfig = normalizeConfig({
      supabaseUrl: readMeta('kalka-supabase-url') || readMeta('supabase-url'),
      supabaseAnonKey: readMeta('kalka-supabase-anon-key') || readMeta('supabase-anon-key')
    });
    var config = normalizeConfig({
      supabaseUrl: windowConfig.supabaseUrl || metaConfig.supabaseUrl,
      supabaseAnonKey: windowConfig.supabaseAnonKey || metaConfig.supabaseAnonKey,
      storageProvider: windowConfig.storageProvider || metaConfig.storageProvider,
      apiProvider: windowConfig.apiProvider || metaConfig.apiProvider,
      authProvider: windowConfig.authProvider || metaConfig.authProvider,
      env: windowConfig.env || {}
    });
    config.enabled = !!(config.supabaseUrl && config.supabaseAnonKey);
    config.source = windowConfig.supabaseUrl && windowConfig.supabaseAnonKey ? 'window' : (metaConfig.supabaseUrl && metaConfig.supabaseAnonKey ? 'meta' : 'placeholder');
    window.__KALKA_CONFIG__ = config;
    if (!window.__KALKA_SUPABASE__) {
      window.__KALKA_SUPABASE__ = { url: config.supabaseUrl, anonKey: config.supabaseAnonKey };
    }
    return config;
  }

  var KalkaConfig = {
    load: loadConfig,
    current: function () {
      return window.__KALKA_CONFIG__ || loadConfig();
    },
    get: function (key, fallback) {
      var cfg = window.__KALKA_CONFIG__ || loadConfig();
      return cfg && Object.prototype.hasOwnProperty.call(cfg, key) ? cfg[key] : fallback;
    }
  };

  window.KalkaConfig = KalkaConfig;
  loadConfig();
})(window);
