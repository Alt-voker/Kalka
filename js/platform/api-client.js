(function (window) {
  function getClient() {
    if (window.__supabase) return window.__supabase;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.sb) return window.sb;
    if (window.KalkaApp && window.KalkaApp.supabase && typeof window.KalkaApp.supabase.getClient === 'function') {
      return window.KalkaApp.supabase.getClient();
    }
    return null;
  }

  function rpc(name, params) {
    var client = getClient();
    if (!client || typeof client.rpc !== 'function') {
      return Promise.reject(new Error('Supabase client not available')); 
    }
    return client.rpc(name, params || {});
  }

  function select(table, options) {
    var client = getClient();
    if (!client || typeof client.from !== 'function') {
      return Promise.reject(new Error('Supabase client not available'));
    }
    options = options || {};
    var q = client.from(table).select(options.columns || '*');
    if (Array.isArray(options.eq)) options.eq.forEach(function (pair) { if (pair && pair.length >= 2) q = q.eq(pair[0], pair[1]); });
    if (Array.isArray(options.in)) options.in.forEach(function (pair) { if (pair && pair.length >= 2) q = q.in(pair[0], pair[1]); });
    if (Array.isArray(options.order)) options.order.forEach(function (pair) { if (pair && pair.length >= 1) q = q.order(pair[0], { ascending: pair[1] !== false }); });
    if (options.limit !== undefined && options.limit !== null) q = q.limit(options.limit);
    if (options.single) q = q.single();
    return q;
  }

  function insert(table, values) {
    var client = getClient();
    if (!client || typeof client.from !== 'function') {
      return Promise.reject(new Error('Supabase client not available'));
    }
    return client.from(table).insert(values || []);
  }

  function update(table, values, options) {
    var client = getClient();
    if (!client || typeof client.from !== 'function') {
      return Promise.reject(new Error('Supabase client not available'));
    }
    options = options || {};
    var q = client.from(table).update(values || {});
    if (Array.isArray(options.eq)) options.eq.forEach(function (pair) { if (pair && pair.length >= 2) q = q.eq(pair[0], pair[1]); });
    if (Array.isArray(options.in)) options.in.forEach(function (pair) { if (pair && pair.length >= 2) q = q.in(pair[0], pair[1]); });
    if (options.single) q = q.single();
    return q;
  }

  window.KalkaApi = window.KalkaApi || {};
  window.KalkaApi.getClient = getClient;
  window.KalkaApi.rpc = rpc;
  window.KalkaApi.select = select;
  window.KalkaApi.insert = insert;
  window.KalkaApi.update = update;
})(window);
