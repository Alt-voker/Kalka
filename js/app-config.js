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
    var metaConfig = {
      url: readMeta('kalka-supabase-url') || readMeta('supabase-url') || '',
      anonKey: readMeta('kalka-supabase-anon-key') || readMeta('supabase-anon-key') || ''
    };
    var windowConfig = window.__KALKA_SUPABASE__ || {};
    var storedConfig = {};
    try {
      storedConfig = parseJson(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (storageError) {
      storedConfig = {};
    }
    var raw = {
      url: windowConfig.url || windowConfig.supabaseUrl || metaConfig.url || '',
      anonKey: windowConfig.anonKey || windowConfig.supabaseAnonKey || metaConfig.anonKey || ''
    };
    var source = 'window.__KALKA_SUPABASE__';
    if (!raw.url || !raw.anonKey) {
      if (metaConfig.url && metaConfig.anonKey) {
        raw.url = raw.url || metaConfig.url;
        raw.anonKey = raw.anonKey || metaConfig.anonKey;
        source = 'meta';
    } else if (!window.__authServerFirstMode && (storedConfig.url || storedConfig.supabaseUrl || storedConfig.anonKey || storedConfig.supabaseAnonKey)) {
        raw.url = raw.url || storedConfig.url || storedConfig.supabaseUrl || '';
        raw.anonKey = raw.anonKey || storedConfig.anonKey || storedConfig.supabaseAnonKey || '';
        source = 'localStorage';
      } else {
        source = 'empty';
      }
    }
    var config = {
      url: raw.url,
      anonKey: raw.anonKey
    };
    config.enabled = !!(config.url && config.anonKey);
    config.source = source;
    console.info('supabase config check', {
      hasUrl: !!config.url,
      hasAnonKey: !!config.anonKey,
      source: config.source,
      host: config.url ? (function () { try { return new URL(config.url).host; } catch (e) { return ''; } })() : ''
    });
    if (!config.enabled) {
      console.error('missing Supabase config', {
        hasUrl: !!config.url,
        hasAnonKey: !!config.anonKey,
        source: config.source
      });
    }
    if (config.enabled && !window.__KALKA_SUPABASE__) {
      window.__KALKA_SUPABASE__ = { url: config.url, anonKey: config.anonKey };
    }
    return config;
  }

  app.config = {
    storageKey: STORAGE_KEY,
    getSupabaseConfig: getSupabaseConfig
  };
})(window);
