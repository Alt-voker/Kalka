(function (window) {
  function getClient() {
    if (window.KalkaApi && typeof window.KalkaApi.getClient === 'function') return window.KalkaApi.getClient();
    if (window.__supabase) return window.__supabase;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.sb) return window.sb;
    return null;
  }

  function getAuth() {
    var client = getClient();
    return client && client.auth ? client.auth : null;
  }

  function signIn(email, password) {
    var auth = getAuth();
    if (!auth || typeof auth.signInWithPassword !== 'function') {
      return Promise.reject(new Error('Auth provider not available'));
    }
    return auth.signInWithPassword({ email: email, password: password });
  }

  function signOut() {
    var auth = getAuth();
    if (!auth || typeof auth.signOut !== 'function') {
      return Promise.resolve({ error: null });
    }
    return auth.signOut();
  }

  function getCurrentUser() {
    var auth = getAuth();
    if (!auth || typeof auth.getUser !== 'function') return Promise.resolve({ data: { user: null }, error: null });
    return auth.getUser();
  }

  function getSession() {
    var auth = getAuth();
    if (!auth || typeof auth.getSession !== 'function') return Promise.resolve({ data: { session: null }, error: null });
    return auth.getSession();
  }

  window.KalkaAuth = window.KalkaAuth || {};
  window.KalkaAuth.signIn = signIn;
  window.KalkaAuth.signOut = signOut;
  window.KalkaAuth.getCurrentUser = getCurrentUser;
  window.KalkaAuth.getSession = getSession;
})(window);
