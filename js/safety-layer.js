(function () {
  window.normalizeRoleSafe ||= function(role) {
    if (!role) return 'unassigned';
    if (role === 'platform_owner') return 'owner';
    return String(role).trim();
  };

  window.setLastInitError ||= function(error) {
    console.error('init error', error);
  };

  window.markPerf ||= function(){};

  window.getDataCache ||= function() {
    window.__dataCache = window.__dataCache || {};
    return window.__dataCache;
  };

  window.safeArray ||= function(value) {
    return Array.isArray(value) ? value : [];
  };

  window.safeObject ||= function(value) {
    return value && typeof value === 'object' ? value : {};
  };

  window.safeRender ||= function(name, fn, onError) {
    try {
      return fn();
    } catch (error) {
      console.error('Render failed:', name, error);
      if (typeof onError === 'function') {
        try { onError(error); } catch (callbackError) {}
      }
      return null;
    }
  };

  window.addEventListener('error', function (event) {
    console.error('Global UI error', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection', event.reason);
  });

  window.runPlatformSmokeTest = function() {
    return {
      hasSupabaseClient: !!(window.__supabase || window.supabaseClient || window.sb),
      hasSession: !!window.__userSession,
      hasCurrentUser: !!window.CU,
      hasActiveOrganization: !!window.activeRest,
      hasPermissionHelper: typeof window.hasPermission === 'function',
      hasNormalizeRoleSafe: typeof window.normalizeRoleSafe === 'function',
      hasDataCache: typeof window.getDataCache === 'function'
    };
  };

  console.info('safety-layer loaded');
  try {
    console.table(window.runPlatformSmokeTest());
  } catch (error) {}
})();
