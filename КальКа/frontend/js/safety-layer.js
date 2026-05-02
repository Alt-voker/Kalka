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

  window.safeSupplierText ||= function (value, fallback) {
    if (fallback === undefined) fallback = '—';
    if (value === null || value === undefined) return fallback;
    var text = String(value).trim();
    if (!text || text === 'undefined' || text === 'null') return fallback;
    return text;
  };

  window.renderSupplierLegalEntityOptions ||= function (selectedIds) {
    var legalEntities =
      (window.__legalEntitiesRuntime && Array.isArray(window.__legalEntitiesRuntime.items) && window.__legalEntitiesRuntime.items) ||
      (window.__userSession && Array.isArray(window.__userSession.legalEntities) && window.__userSession.legalEntities) ||
      [];

    if (!Array.isArray(legalEntities) || legalEntities.length === 0) {
      return '<option value="">Юрлица не добавлены</option>';
    }

    var selectedSet = new Set((selectedIds || []).map(function (item) { return String(item); }));

    return legalEntities.map(function (le) {
      var id = le && (le.id || le.legal_entity_id || le.legalEntityId || '');
      var name = le && (le.name || le.title) || 'Юрлицо без названия';
      var selected = selectedSet.has(String(id)) ? 'selected' : '';
      return '<option value="' + String(id).replace(/"/g, '&quot;') + '" ' + selected + '>' + String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</option>';
    }).join('');
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
      hasDataCache: typeof window.getDataCache === 'function',
      hasSafeSupplierText: typeof window.safeSupplierText === 'function',
      hasRenderSupplierLegalEntityOptions: typeof window.renderSupplierLegalEntityOptions === 'function'
    };
  };

  console.info('safety-layer loaded');
  try {
    console.table(window.runPlatformSmokeTest());
  } catch (error) {}
})();
