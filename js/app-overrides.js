(function (window) {
  var app = window.KalkaApp = window.KalkaApp || {};
  var legacy = {
    dbLoad: window.dbLoad,
    dbGet: window.dbGet,
    dbSet: window.dbSet,
    dbSave: window.dbSave,
    doLogin: window.doLogin,
    doLogout: window.doLogout,
    saveMyProfile: window.saveMyProfile,
    detectStructure: window.detectStructure,
    extractPrice: window.extractPrice,
    cleanRows: window.cleanRows,
    processSupPriceRows: window.processSupPriceRows,
    renderPriceEditTable: window.renderPriceEditTable
  };

  var LOCAL_DB_KEY = 'kalka_app_state_v1';
  var LAST_USER_KEY = 'kalka_last_user';
  var CLIENT_STATE_VERSION = 2;
  var loggingOut = false;
  var authBound = false;
  var restoreInFlight = false;
  if (typeof window.__loginInProgress === 'undefined') window.__loginInProgress = false;
  if (typeof window.__restoreInProgress === 'undefined') window.__restoreInProgress = false;
  if (typeof window.__sessionReady === 'undefined') window.__sessionReady = false;
  var bootstrapPromises = {};

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getDefaults() {
    if (typeof window._getDefaults === 'function') return window._getDefaults();
    return { users: [], restaurants: [], audit: [] };
  }

  function isServerFirstMode() {
    return !!(app.supabase && app.supabase.isEnabled && app.supabase.isEnabled());
  }

  function ensureArrays(db) {
    var base = db && typeof db === 'object' ? clone(db) : getDefaults();
    if (!Array.isArray(base.users)) base.users = [];
    if (!Array.isArray(base.restaurants)) base.restaurants = [];
    if (!Array.isArray(base.audit)) base.audit = [];
    if (!Array.isArray(base.supProds)) base.supProds = [];
    if (!Array.isArray(base.supsData)) base.supsData = [];
    if (!Array.isArray(base.products)) base.products = [];
    if (!Array.isArray(base.orders)) base.orders = [];
    if (!Array.isArray(base.techCards)) base.techCards = [];
    if (!Array.isArray(base.supplierImportTemplates)) base.supplierImportTemplates = [];
    if (!base.__clientStateVersion) base.__clientStateVersion = CLIENT_STATE_VERSION;
    return base;
  }

  function isCompatibleLocalState(db) {
    return !!(db && Number(db.__clientStateVersion || 0) === CLIENT_STATE_VERSION && hasMeaningfulState(db));
  }

  function hasMeaningfulState(db) {
    var normalized = ensureArrays(db);
    return !!(
      normalized.users.length ||
      normalized.restaurants.length ||
      normalized.audit.length ||
      normalized.supProds.length ||
      normalized.supsData.length ||
      normalized.products.length ||
      normalized.orders.length ||
      normalized.techCards.length ||
      normalized.supplierImportTemplates.length
    );
  }

  function syncRuntime(db) {
    var normalized = ensureArrays(db);
    normalized.__clientStateVersion = CLIENT_STATE_VERSION;
    window._dbCache = normalized;
    try { SUP_PRODS = normalized.supProds.slice(); } catch (error) {}
    try { SUPS_DATA = normalized.supsData.slice(); } catch (error) {}
    try { PRODUCTS = normalized.products.slice(); } catch (error) {}
    try { ORDERS = normalized.orders.slice(); } catch (error) {}
    try { TECH_CARDS = normalized.techCards.slice(); } catch (error) {}
    try {
      var allSups = [];
      normalized.supsData.forEach(function (item) {
        if (item && item.name && allSups.indexOf(item.name) < 0) allSups.push(item.name);
      });
      normalized.supProds.forEach(function (item) {
        var name = item && (item._supplier || item.supplier);
        if (name && allSups.indexOf(name) < 0) allSups.push(name);
      });
      normalized.products.forEach(function (item) {
        (item.suppliers || []).forEach(function (supplier) {
          if (supplier && supplier.name && allSups.indexOf(supplier.name) < 0) allSups.push(supplier.name);
        });
      });
      ALL_SUPS = allSups;
      if (typeof selSups !== 'undefined' && (!selSups || !selSups.length)) selSups = allSups.slice();
    } catch (error) {}
    if (!isServerFirstMode()) {
      try {
        localStorage.setItem('pv_cache', JSON.stringify(normalized));
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(normalized));
      } catch (error) {}
    }
    return normalized;
  }

  function markLoginStage(stage, extra) {
    try {
      if (!window.__loginPerf) window.__loginPerf = [];
      window.__loginPerf.push({
        ts: Date.now(),
        stage: stage,
        extra: extra || ''
      });
      if (window.__loginPerf.length > 20) window.__loginPerf.shift();
    } catch (error) {}
  }

  function withTimeout(promise, ms, timeoutMessage) {
    var timeout = Number(ms || 10000);
    return Promise.race([
      promise,
      new Promise(function (resolve, reject) {
        setTimeout(function () {
          var err = new Error(timeoutMessage || 'Timeout');
          err.code = 'TIMEOUT';
          err.details = '';
          err.hint = '';
          reject(err);
        }, timeout);
      })
    ]);
  }

  function readLocalState() {
    if (isServerFirstMode()) return null;
    try {
      var raw = localStorage.getItem(LOCAL_DB_KEY) || localStorage.getItem('pv_cache');
      if (!raw) return null;
      var parsed = ensureArrays(JSON.parse(raw));
      return isCompatibleLocalState(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function clearClientRuntimeState() {
    try {
      window.__userSession = null;
      window._dbCache = null;
      window.CU = null;
      window.activeRest = { id: 'r0', name: 'Все рестораны', emoji: '🌐' };
      if (typeof window.cart !== 'undefined') window.cart = [];
      if (typeof window.tenderChanges !== 'undefined') window.tenderChanges = [];
      if (typeof window.tenderLoaded !== 'undefined') window.tenderLoaded = false;
      if (typeof window.ordersRestFilter !== 'undefined') window.ordersRestFilter = 'all';
      if (typeof window.catFilter !== 'undefined') window.catFilter = 'all';
      if (typeof window.ordFilter !== 'undefined') window.ordFilter = 'all';
      if (typeof window.tcFilter !== 'undefined') window.tcFilter = 'all';
      if (typeof window.selSups !== 'undefined') window.selSups = [];
      if (typeof window.ALL_SUPS !== 'undefined') window.ALL_SUPS = [];
      if (typeof window._supPriceOrganizationId !== 'undefined') window._supPriceOrganizationId = '';
      if (typeof window._supPriceLegalEntityIds !== 'undefined') window._supPriceLegalEntityIds = [];
      if (typeof window._supPriceLegalEntityNames !== 'undefined') window._supPriceLegalEntityNames = [];
      if (typeof window._orderLegalEntityIds !== 'undefined') window._orderLegalEntityIds = [];
      if (typeof window._orderLegalEntityNames !== 'undefined') window._orderLegalEntityNames = [];
    } catch (error) {}
  }

  function clearClientStorage() {
    try {
      Object.keys(localStorage).forEach(function (key) {
        if (/^(pv_|kalka_)/.test(key)) localStorage.removeItem(key);
      });
      localStorage.removeItem(LOCAL_DB_KEY);
      localStorage.removeItem('pv_cache');
      localStorage.removeItem(LAST_USER_KEY);
    } catch (error) {}
    try { sessionStorage.clear(); } catch (error) {}
  }

  function saveLastUser(user) {
    try {
      localStorage.setItem(LAST_USER_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        first: user.first,
        last: user.last,
        company: user.company,
        role: user.role,
        status: user.status
      }));
    } catch (error) {}
  }

  function clearLastUser() {
    try {
      localStorage.removeItem(LAST_USER_KEY);
    } catch (error) {}
  }

  async function loadStateFromSupabase() {
    if (!isServerFirstMode()) return null;
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    if (!client) return null;

    var response = await client
      .from('app_state')
      .select('payload')
      .eq('scope', 'default')
      .maybeSingle();

    if (response.error || !response.data || !response.data.payload) return null;
    var payload = ensureArrays(response.data.payload);
    return hasMeaningfulState(payload) ? payload : null;
  }

  async function saveStateToSupabase(db) {
    if (!isServerFirstMode()) return false;
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    if (!client) return false;

    var response = await client
      .from('app_state')
      .upsert({
        scope: 'default',
        payload: db,
        updated_at: new Date().toISOString()
      }, { onConflict: 'scope' });

    return !response.error;
  }

  async function hydrateStateFromSupabase() {
    try {
      var loaded = await loadStateFromSupabase();
      if (loaded) {
        syncRuntime(loaded);
        return loaded;
      }
    } catch (error) {
      console.error('Supabase state hydrate failed:', error);
    }
    return null;
  }

  async function loadBusinessDataFromSupabase(baseDb) {
    if (window.__loginInProgress || isServerFirstMode() || !app.commerce || !app.commerce.load) return baseDb;
    try {
      var loaded = await app.commerce.load(baseDb);
      return loaded || baseDb;
    } catch (error) {
      console.error('Supabase business data hydrate failed:', error);
      return baseDb;
    }
  }

  function saveBusinessDataSnapshot(db) {
    if (window.__loginInProgress || window.__restoreInProgress || !isServerFirstMode() || !app.commerce || !app.commerce.save) return;
    app.commerce.save(db).catch(function (error) {
      console.error('Supabase business data save failed:', error);
    });
  }

  function setSessionReady(session) {
    try {
      window.__sessionReady = !!(session && session.currentUser && !session.currentUser.noOrganization || session);
    } catch (error) {}
    return session;
  }

  function getBootstrapKey(authUser) {
    return authUser && authUser.id ? String(authUser.id) : '__anonymous__';
  }

  function getOrCreateBootstrapPromise(authUser, loader) {
    var key = getBootstrapKey(authUser);
    if (bootstrapPromises[key]) return bootstrapPromises[key];
    bootstrapPromises[key] = Promise.resolve()
      .then(loader)
      .finally(function () {
        delete bootstrapPromises[key];
      });
    return bootstrapPromises[key];
  }

  async function loadLegalEntitiesForOrganization(organizationId) {
    if (window.__loginInProgress || window.__restoreInProgress) return [];
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    var orgId = String(organizationId || '').trim();
    if (!client || !orgId) return [];
    try {
      console.info('supabase request start', 'legal_entities');
      var response = await client
        .from('legal_entities')
        .select('id, organization_id, name, inn, kpp, ogrn, legal_address, status, created_at, updated_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (response.error) {
        console.warn('legal_entities query failed', {
          code: response.error.code || '',
          message: response.error.message || '',
          details: response.error.details || '',
          hint: response.error.hint || '',
          raw: response.error
        });
        return [];
      }
      return (response.data || []).map(normalizeLegalEntityRow).filter(Boolean);
    } catch (error) {
      console.warn('legal_entities query failed', {
        code: error && error.code ? error.code : '',
        message: error && error.message ? error.message : '',
        details: error && error.details ? error.details : '',
        hint: error && error.hint ? error.hint : '',
        raw: error
      });
      return [];
    }
  }
  window.loadLegalEntitiesForOrganization = loadLegalEntitiesForOrganization;

  function upsertUserInDb(user) {
    var db = ensureArrays(window._dbCache || readLocalState() || getDefaults());
    var index = db.users.findIndex(function (item) {
      return item && item.email && item.email.toLowerCase() === user.email.toLowerCase();
    });

    if (index >= 0) {
      db.users[index] = Object.assign({}, db.users[index], user, { id: user.id, email: user.email.toLowerCase() });
    } else {
      db.users.push(user);
    }

    syncRuntime(db);
    saveStateToSupabase(db).catch(function () {});
    return db;
  }

  async function fetchProfile(authUser) {
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    if (!client || !authUser) return null;

    var byId = await client
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!byId.error && byId.data) return byId.data;

    var byEmail = await client
      .from('profiles')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle();

    return byEmail.error ? null : byEmail.data;
  }

  async function resolveAppUser(authUser) {
    var profile = await fetchProfile(authUser);
    var db = ensureArrays(window._dbCache || readLocalState() || getDefaults());
    var existing = db.users.find(function (item) {
      return item && item.email && item.email.toLowerCase() === String(authUser.email || '').toLowerCase();
    });
    var meta = authUser.user_metadata || {};
    var first = (existing && existing.first) || (profile && (profile.first_name || profile.first)) || meta.first_name || meta.first || 'Пользователь';
    var last = (existing && existing.last) || (profile && (profile.last_name || profile.last)) || meta.last_name || meta.last || '';
    var company = (existing && existing.company) || (profile && profile.company) || meta.company || 'КальКа';
    var role = (existing && existing.role) || (profile && profile.role) || meta.role || meta.app_role || 'manager';
    var status = (existing && existing.status) || (profile && profile.status) || 'active';

    var user = Object.assign({}, existing || {}, {
      id: authUser.id,
      first: first,
      last: last,
      company: company,
      email: String(authUser.email || '').toLowerCase(),
      role: role,
      status: status,
      ev: existing && typeof existing.ev !== 'undefined' ? existing.ev : true,
      created: (existing && existing.created) || new Date().toISOString().slice(0, 10)
    });

    upsertUserInDb(user);
    return user;
  }

  function fastResolveAppUser(authUser) {
    var db = ensureArrays(window._dbCache || readLocalState() || getDefaults());
    var existing = db.users.find(function (item) {
      return item && item.email && item.email.toLowerCase() === String(authUser.email || '').toLowerCase();
    });
    var meta = authUser.user_metadata || {};
    var first = (existing && existing.first) || meta.first_name || meta.first || 'Пользователь';
    var last = (existing && existing.last) || meta.last_name || meta.last || '';
    var company = (existing && existing.company) || meta.company || 'КальКа';
    var role = (existing && existing.role) || meta.role || meta.app_role || 'manager';
    var status = (existing && existing.status) || 'active';

    return Object.assign({}, existing || {}, {
      id: authUser.id,
      first: first,
      last: last,
      company: company,
      email: String(authUser.email || '').toLowerCase(),
      role: role,
      status: status,
      ev: existing && typeof existing.ev !== 'undefined' ? existing.ev : true,
      created: (existing && existing.created) || new Date().toISOString().slice(0, 10)
    });
  }

  function normalizeProfileRow(row) {
    if (!row) return null;
    return {
      id: row.id || '',
      auth_user_id: row.auth_user_id || '',
      email: row.email || '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      phone: row.phone || '',
      status: row.status || 'active',
      created_at: row.created_at || '',
      updated_at: row.updated_at || ''
    };
  }

  function normalizeOrganizationRow(row) {
    if (!row) return null;
    return {
      id: row.id || '',
      name: row.name || '',
      type: row.type || 'organization',
      status: row.status || 'active',
      created_at: row.created_at || '',
      updated_at: row.updated_at || ''
    };
  }

  function normalizeMembershipRow(row) {
    if (!row) return null;
    return {
      id: row.id || '',
      organization_id: row.organization_id || '',
      user_profile_id: row.user_profile_id || '',
      role: row.role || 'manager',
      status: row.status || 'active',
      created_at: row.created_at || '',
      updated_at: row.updated_at || ''
    };
  }

  function normalizeLegalEntityRow(row) {
    if (!row) return null;
    return {
      id: row.id || '',
      organization_id: row.organization_id || '',
      name: row.name || '',
      inn: row.inn || '',
      kpp: row.kpp || '',
      ogrn: row.ogrn || '',
      legal_address: row.legal_address || '',
      status: row.status || 'active',
      created_at: row.created_at || '',
      updated_at: row.updated_at || ''
    };
  }

  function normalizeUiRole(role) {
    return role === 'platform_owner' ? 'owner' : (role || 'manager');
  }

  function buildFallbackProfile(authUser) {
    var meta = (authUser && authUser.user_metadata) || {};
    var email = String((authUser && authUser.email) || '').toLowerCase();
    return {
      id: authUser && authUser.id ? String(authUser.id) : '',
      auth_user_id: authUser && authUser.id ? String(authUser.id) : '',
      email: email,
      first_name: meta.first_name || meta.firstName || meta.name || 'Пользователь',
      last_name: meta.last_name || meta.lastName || '',
      phone: meta.phone || '',
      status: meta.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function buildNoOrganizationSession(authUser, profile) {
    var safeProfile = profile || buildFallbackProfile(authUser);
    var email = String((safeProfile && safeProfile.email) || (authUser && authUser.email) || '').toLowerCase();
    return {
      profile: safeProfile,
      memberships: [],
      organizations: [],
      legalEntities: [],
      noOrganization: true,
      activeOrganization: null,
      activeOrganizationId: null,
      activeLegalEntities: [],
      activeLegalEntityIds: [],
      activeLegalEntityNames: [],
      currentMembership: null,
      role: 'unassigned',
      permissions: [],
      currentUser: {
        id: authUser && authUser.id ? authUser.id : '',
        profileId: safeProfile.id || '',
        first: safeProfile.first_name || 'Пользователь',
        last: safeProfile.last_name || '',
        company: 'КальКа',
        email: email,
        role: 'unassigned',
        status: safeProfile.status || 'active',
        ev: true,
        created: (safeProfile.created_at || new Date().toISOString()).slice(0, 10),
        organizationId: null,
        noOrganization: true,
        memberships: []
      },
      suppliers: [],
      dbUsers: []
    };
  }

  function mapProfileToLegacyUser(profile, memberships, organizations, activeOrganization) {
    var firstMembership = memberships[0] || null;
    var orgName = (activeOrganization && activeOrganization.name) || (organizations[0] && organizations[0].name) || '';
    return {
      id: profile.auth_user_id || profile.id,
      profileId: profile.id,
      first: profile.first_name || profile.first || 'Пользователь',
      last: profile.last_name || profile.last || '',
      company: orgName || profile.company || 'КальКа',
      email: String(profile.email || '').toLowerCase(),
      role: normalizeUiRole((firstMembership && firstMembership.role) || profile.role || 'manager'),
      status: profile.status || 'active',
      ev: true,
      created: (profile.created_at || profile.created || new Date().toISOString()).slice(0, 10),
      organizationId: (firstMembership && firstMembership.organization_id) || '',
      memberships: memberships.map(function (item) {
        return {
          organizationId: item.organization_id,
          role: normalizeUiRole(item.role),
          status: item.status
        };
      })
    };
  }

  function normalizeSupplierRow(row) {
    if (!row) return null;
    return {
      id: row.id || '',
      organization_id: row.organization_id || '',
      name: row.name || '',
      emoji: row.emoji || '🏭',
      kind: row.kind || 'Поставщик',
      rating: Number(row.rating || 0) || 0,
      orders_count: parseInt(row.orders_count || 0, 10) || 0,
      delivery: row.delivery || '1-2 дня',
      min_order_text: row.min_order_text || '₽1 000',
      status: row.status || 'active',
      tags: Array.isArray(row.tags) ? row.tags.slice() : (row.tags || []),
      contact: row.contact || '',
      phone: row.phone || '',
      hidden: !!row.hidden,
      legacy_key: row.legacy_key || '',
      created_at: row.created_at || '',
      updated_at: row.updated_at || ''
    };
  }

  function mapSupplierRowToLegacy(row) {
    return {
      id: row.id,
      organizationId: row.organization_id || '',
      emoji: row.emoji || '🏭',
      name: row.name || '',
      type: row.kind || 'Поставщик',
      rating: Number(row.rating || 0) || 0,
      orders: parseInt(row.orders_count || 0, 10) || 0,
      delivery: row.delivery || '1-2 дня',
      min: row.min_order_text || '₽1 000',
      status: row.status || 'active',
      tags: Array.isArray(row.tags) ? row.tags.slice() : [],
      contact: row.contact || '',
      phone: row.phone || '',
      hidden: !!row.hidden,
      legacy_key: row.legacy_key || '',
      legalName: row.contact || row.name || ''
    };
  }

  function getDataCache() {
    if (!window.__dataCache || typeof window.__dataCache !== 'object') {
      window.__dataCache = {};
    }
    if (!window.__dataCache.suppliersByOrg || typeof window.__dataCache.suppliersByOrg !== 'object') {
      window.__dataCache.suppliersByOrg = {};
    }
    if (!window.__dataCache.suppliersPromisesByOrg || typeof window.__dataCache.suppliersPromisesByOrg !== 'object') {
      window.__dataCache.suppliersPromisesByOrg = {};
    }
    if (!window.__dataCache.suppliersErrorsByOrg || typeof window.__dataCache.suppliersErrorsByOrg !== 'object') {
      window.__dataCache.suppliersErrorsByOrg = {};
    }
    if (!window.__dataCache.suppliersLoadingByOrg || typeof window.__dataCache.suppliersLoadingByOrg !== 'object') {
      window.__dataCache.suppliersLoadingByOrg = {};
    }
    if (!window.__dataCache.ownerUsers || typeof window.__dataCache.ownerUsers !== 'object') {
      window.__dataCache.ownerUsers = { items: null, loading: false, error: null, promise: null, loadedAt: 0 };
    }
    return window.__dataCache;
  }

  function supplierErrorInfo(error) {
    return {
      code: error && error.code ? error.code : '',
      message: error && error.message ? error.message : '',
      details: error && error.details ? error.details : '',
      hint: error && error.hint ? error.hint : '',
      raw: error
    };
  }

  async function loadSuppliersForOrganization(organizationId) {
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    var orgId = String(organizationId || '').trim();
    if (!client || !orgId) return [];
    var cache = getDataCache();
    if (Array.isArray(cache.suppliersByOrg[orgId])) {
      return cache.suppliersByOrg[orgId].slice();
    }
    if (cache.suppliersPromisesByOrg[orgId]) {
      return cache.suppliersPromisesByOrg[orgId];
    }
    cache.suppliersLoadingByOrg[orgId] = true;
    delete cache.suppliersErrorsByOrg[orgId];
    var promise = (async function () {
      try {
        if (window.performance && window.performance.mark) window.performance.mark('suppliers_load_start');
      } catch (markError) {}
      console.info('suppliers_load_start', orgId);
      try {
        var response = await client
          .from('suppliers')
          .select('id, organization_id, name, phone, contact, status, created_at')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .order('name', { ascending: true })
          .limit(100);
        if (response.error) {
          console.error('loadSuppliersForOrganization failed', {
            request: 'suppliers',
            organizationId: orgId,
            code: response.error.code || '',
            message: response.error.message || '',
            details: response.error.details || '',
            hint: response.error.hint || '',
            raw: response.error
          });
        try {
          if (window.performance && window.performance.mark) window.performance.mark('suppliers_load_failed');
        } catch (markError) {}
        console.info('suppliers_load_failed', orgId);
        if (typeof window.__printPerfTable === 'function') {
          window.__printPerfTable();
        }
        cache.suppliersErrorsByOrg[orgId] = supplierErrorInfo(response.error);
        cache.suppliersByOrg[orgId] = [];
        return [];
      }
      var suppliers = (response.data || []).map(normalizeSupplierRow).filter(Boolean);
      cache.suppliersByOrg[orgId] = suppliers.slice();
      delete cache.suppliersErrorsByOrg[orgId];
      try {
        if (window.performance && window.performance.mark) window.performance.mark('suppliers_load_success');
      } catch (markError) {}
      console.info('suppliers_load_success', orgId, suppliers.length);
      if (typeof window.__printPerfTable === 'function') {
        window.__printPerfTable();
      }
      return suppliers.slice();
      } catch (error) {
        console.error('loadSuppliersForOrganization failed', {
          request: 'suppliers',
          organizationId: orgId,
          code: error && error.code ? error.code : '',
          message: error && error.message ? error.message : '',
          details: error && error.details ? error.details : '',
          hint: error && error.hint ? error.hint : '',
          raw: error
        });
        try {
          if (window.performance && window.performance.mark) window.performance.mark('suppliers_load_failed');
        } catch (markError) {}
        console.info('suppliers_load_failed', orgId);
        if (typeof window.__printPerfTable === 'function') {
          window.__printPerfTable();
        }
        cache.suppliersErrorsByOrg[orgId] = supplierErrorInfo(error);
        cache.suppliersByOrg[orgId] = [];
        return [];
      } finally {
        cache.suppliersLoadingByOrg[orgId] = false;
        delete cache.suppliersPromisesByOrg[orgId];
      }
    })();
    cache.suppliersPromisesByOrg[orgId] = promise;
    return promise;
  }

  window.loadSuppliersForOrganization = loadSuppliersForOrganization;

  async function loadOwnerUsers() {
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    if (!client) return [];
    var cache = getDataCache();
    if (Array.isArray(cache.ownerUsers.items)) {
      return cache.ownerUsers.items.slice();
    }
    if (cache.ownerUsers.promise) {
      return cache.ownerUsers.promise;
    }
    cache.ownerUsers.loading = true;
    cache.ownerUsers.error = null;
    cache.ownerUsers.promise = (async function () {
      try {
        console.info('supabase request start', 'owner user_profiles');
        var profilesResponse = await client
          .from('user_profiles')
          .select('id, auth_user_id, email, first_name, last_name, status, created_at')
          .order('created_at', { ascending: false });
        if (profilesResponse.error) {
          console.error('owner user_profiles query failed', {
            request: 'owner user_profiles',
            code: profilesResponse.error.code || '',
            message: profilesResponse.error.message || '',
            details: profilesResponse.error.details || '',
            hint: profilesResponse.error.hint || '',
            raw: profilesResponse.error
          });
          cache.ownerUsers.error = supplierErrorInfo(profilesResponse.error);
          cache.ownerUsers.items = [];
          return [];
        }
        console.info('supabase request start', 'owner organization_members');
        var membershipsResponse = await client
          .from('organization_members')
          .select('id, organization_id, user_profile_id, role, status, created_at')
          .order('created_at', { ascending: true });
        if (membershipsResponse.error) {
          console.error('owner organization_members query failed', {
            request: 'owner organization_members',
            code: membershipsResponse.error.code || '',
            message: membershipsResponse.error.message || '',
            details: membershipsResponse.error.details || '',
            hint: membershipsResponse.error.hint || '',
            raw: membershipsResponse.error
          });
          cache.ownerUsers.error = supplierErrorInfo(membershipsResponse.error);
          cache.ownerUsers.items = [];
          return [];
        }
        var profiles = (profilesResponse.data || []).map(function (row) {
          return {
            id: row.id,
            auth_user_id: row.auth_user_id || '',
            email: String(row.email || '').toLowerCase(),
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            status: row.status || 'active',
            created_at: row.created_at || '',
            memberships: []
          };
        }).filter(Boolean);
        var memberships = (membershipsResponse.data || []).map(function (row) {
          return {
            id: row.id,
            organization_id: row.organization_id || '',
            user_profile_id: row.user_profile_id || '',
            role: row.role || 'manager',
            status: row.status || 'active',
            created_at: row.created_at || ''
          };
        }).filter(Boolean);
        var orgMap = {};
        (window.__userSession && Array.isArray(window.__userSession.organizations) ? window.__userSession.organizations : []).forEach(function (org) {
          if (org && org.id) orgMap[String(org.id)] = org;
        });
        var items = profiles.map(function (profile) {
          var userMemberships = memberships.filter(function (member) {
            return String(member.user_profile_id || '') === String(profile.id || '');
          });
          return {
            id: profile.auth_user_id || profile.id,
            profileId: profile.id,
            authUserId: profile.auth_user_id || '',
            first: profile.first_name || '',
            last: profile.last_name || '',
            email: profile.email || '',
            role: userMemberships[0] ? normalizeUiRole(userMemberships[0].role) : 'unassigned',
            status: profile.status || 'active',
            organizationId: userMemberships[0] ? userMemberships[0].organization_id || '' : '',
            company: userMemberships[0] && orgMap[userMemberships[0].organization_id] ? (orgMap[userMemberships[0].organization_id].name || '') : '',
            noOrganization: !userMemberships.length,
            memberships: userMemberships.map(function (member) {
              return {
                organizationId: member.organization_id,
                role: normalizeUiRole(member.role),
                status: member.status
              };
            }),
            created: profile.created_at ? String(profile.created_at).slice(0, 10) : ''
          };
        });
        cache.ownerUsers.items = items.slice();
        cache.ownerUsers.loadedAt = Date.now();
        cache.ownerUsers.error = null;
        return items.slice();
      } catch (error) {
        cache.ownerUsers.error = supplierErrorInfo(error);
        console.error('loadOwnerUsers failed', {
          request: 'owner users',
          code: error && error.code ? error.code : '',
          message: error && error.message ? error.message : '',
          details: error && error.details ? error.details : '',
          hint: error && error.hint ? error.hint : '',
          raw: error
        });
        return [];
      } finally {
        cache.ownerUsers.loading = false;
        cache.ownerUsers.promise = null;
      }
    })();
    return cache.ownerUsers.promise;
  }

  window.loadOwnerUsers = loadOwnerUsers;
  window.retryOwnerUsersLoad = function () {
    var cache = getDataCache();
    cache.ownerUsers = { items: null, loading: true, error: null, promise: null, loadedAt: 0 };
    return loadOwnerUsers().then(function (items) {
      if (typeof window.renderAdmin === 'function') window.renderAdmin();
      return items;
    }).catch(function (error) {
      console.error('retryOwnerUsersLoad failed', error);
      if (typeof window.renderAdmin === 'function') window.renderAdmin();
      return [];
    });
  };

  function normalizeOwnerUserIdentity(row) {
    if (!row) return null;
    var authUserId = String(row.auth_user_id || row.authUserId || row.auth_user || row.userId || row.id || '').trim();
    var profileId = String(row.profileId || row.user_profile_id || row.user_profile || row.profile_id || row.userProfileId || '').trim();
    var email = String(row.email || '').trim().toLowerCase();
    var first = String(row.first || row.first_name || row.firstName || '').trim();
    var last = String(row.last || row.last_name || row.lastName || '').trim();
    var status = String(row.status || 'active').trim() || 'active';
    return {
      id: authUserId || profileId || email,
      auth_user_id: authUserId,
      profileId: profileId || '',
      user_profile_id: profileId || '',
      email: email,
      first: first,
      last: last,
      status: status,
      company: String(row.company || row.orgName || row.organization || '').trim(),
      role: row.role || '',
      memberships: Array.isArray(row.memberships) ? row.memberships.slice() : [],
      organizations: Array.isArray(row.organizations) ? row.organizations.slice() : []
    };
  }

  function findOwnerUserCandidate(userId, userProfileId, email) {
    var cache = getDataCache();
    var candidates = [];
    if (cache && cache.ownerUsers && Array.isArray(cache.ownerUsers.items)) candidates = candidates.concat(cache.ownerUsers.items);
    var db = ensureArrays(window._dbCache || getDefaults());
    if (db && Array.isArray(db.users)) candidates = candidates.concat(db.users);
    var normalizedEmail = String(email || '').trim().toLowerCase();
    var normalizedUserId = String(userId || '').trim();
    var normalizedProfileId = String(userProfileId || '').trim();
    var looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedUserId);
    for (var i = 0; i < candidates.length; i++) {
      var item = normalizeOwnerUserIdentity(candidates[i]);
      if (!item) continue;
      if (normalizedProfileId && (item.user_profile_id === normalizedProfileId || item.profileId === normalizedProfileId)) return item;
      if (normalizedUserId && item.auth_user_id && item.auth_user_id === normalizedUserId) return item;
      if (normalizedUserId && looksLikeUuid && String(item.id || '').trim() === normalizedUserId) return item;
      if (normalizedEmail && item.email && item.email === normalizedEmail) return item;
    }
    return null;
  }

  async function ensureAssignableUserProfile(client, identifiers) {
    if (!client || !identifiers) return null;
    var profileId = String(identifiers.userProfileId || '').trim();
    var authUserId = String(identifiers.authUserId || '').trim();
    var email = String(identifiers.email || '').trim().toLowerCase();
    var first = String(identifiers.first || '').trim();
    var last = String(identifiers.last || '').trim();
    var phone = String(identifiers.phone || '').trim();
    var status = String(identifiers.status || 'active').trim() || 'active';

    if (profileId) {
      console.info('supabase request start', 'resolve user_profiles by id');
      var byIdResponse = await client
        .from('user_profiles')
        .select('id, auth_user_id, email, first_name, last_name, phone, status')
        .eq('id', profileId)
        .maybeSingle();
      if (byIdResponse.error) {
        console.error('resolve user_profiles by id failed', {
          code: byIdResponse.error.code || '',
          message: byIdResponse.error.message || '',
          details: byIdResponse.error.details || '',
          hint: byIdResponse.error.hint || '',
          raw: byIdResponse.error
        });
        throw byIdResponse.error;
      }
      if (byIdResponse.data) return byIdResponse.data;
    }

    if (authUserId) {
      console.info('supabase request start', 'resolve user_profiles by auth_user_id');
      var byAuthResponse = await client
        .from('user_profiles')
        .select('id, auth_user_id, email, first_name, last_name, phone, status')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (byAuthResponse.error) {
        console.error('resolve user_profiles by auth_user_id failed', {
          code: byAuthResponse.error.code || '',
          message: byAuthResponse.error.message || '',
          details: byAuthResponse.error.details || '',
          hint: byAuthResponse.error.hint || '',
          raw: byAuthResponse.error
        });
        throw byAuthResponse.error;
      }
      if (byAuthResponse.data) return byAuthResponse.data;

      console.info('supabase request start', 'user_profiles create from auth identity');
      var createResponse = await client
        .from('user_profiles')
        .upsert({
          auth_user_id: authUserId,
          email: email,
          first_name: first || 'Пользователь',
          last_name: last || '',
          phone: phone || '',
          status: status
        }, { onConflict: 'auth_user_id' })
        .select('id, auth_user_id, email, first_name, last_name, phone, status')
        .maybeSingle();
      if (createResponse.error) {
        console.error('create user_profiles from auth identity failed', {
          code: createResponse.error.code || '',
          message: createResponse.error.message || '',
          details: createResponse.error.details || '',
          hint: createResponse.error.hint || '',
          raw: createResponse.error
        });
        throw createResponse.error;
      }
      if (createResponse.data) return createResponse.data;
    }

    if (email) {
      console.info('supabase request start', 'resolve user_profiles by email');
      var byEmailResponse = await client
        .from('user_profiles')
        .select('id, auth_user_id, email, first_name, last_name, phone, status')
        .ilike('email', email)
        .maybeSingle();
      if (byEmailResponse.error) {
        console.error('resolve user_profiles by email failed', {
          code: byEmailResponse.error.code || '',
          message: byEmailResponse.error.message || '',
          details: byEmailResponse.error.details || '',
          hint: byEmailResponse.error.hint || '',
          raw: byEmailResponse.error
        });
        throw byEmailResponse.error;
      }
      if (byEmailResponse.data) return byEmailResponse.data;
    }

    return null;
  }

  function pickActiveOrganization(organizations, memberships) {
    var orgIds = {};
    (memberships || []).forEach(function (item) {
      if (item && item.organization_id) orgIds[String(item.organization_id)] = true;
    });
    var list = (organizations || []).filter(function (org) {
      return !!org && !!org.id && (!!orgIds[String(org.id)] || !Object.keys(orgIds).length);
    });
    return list[0] || null;
  }

  function loadSuppliersWithTimeout(organizationId, timeoutMs) {
    var timeout = Number(timeoutMs || 2500);
    return Promise.race([
      loadSuppliersForOrganization(organizationId),
      new Promise(function (resolve) {
        setTimeout(function () {
          resolve({ __timeout: true });
        }, timeout);
      })
    ]).then(function (result) {
      if (result && result.__timeout) {
        console.warn('loadSuppliersForOrganization timeout for organization:', organizationId);
        return [];
      }
      return Array.isArray(result) ? result : [];
    }).catch(function (error) {
      console.error('loadSuppliersForOrganization failed:', error);
      return [];
    });
  }

  function applyServerSession(session) {
    window.__userSession = session || null;
    if (!session || !session.currentUser) {
      return null;
    }

    var activeOrganization = session.activeOrganization || null;
    if (activeOrganization) {
      window.activeRest = {
        id: activeOrganization.id,
        organizationId: activeOrganization.id,
        name: activeOrganization.name || 'Организация',
        brandName: activeOrganization.name || 'Организация',
        legalName: activeOrganization.name || 'Организация',
        type: activeOrganization.type || 'organization',
        status: activeOrganization.status || 'active',
        emoji: '🏢'
      };
    } else {
      window.activeRest = { id: 'r0', name: 'Нет доступных организаций', emoji: '🔒' };
    }

    return session.currentUser;
  }

  async function refreshActiveOrganizationSession(session, organizationId) {
    var orgId = String(organizationId || '').trim();
    var organizations = session && Array.isArray(session.organizations) ? session.organizations : [];
    var targetOrg = organizations.find(function (org) {
      return org && String(org.id || '').trim() === orgId;
    }) || null;
    if (!targetOrg) {
      throw new Error('Организация недоступна для текущего пользователя');
    }

    session.activeOrganization = targetOrg;
    session.activeOrganizationId = targetOrg.id;
    session.noOrganization = false;
    session.activeLegalEntities = Array.isArray(session.legalEntities)
      ? session.legalEntities.filter(function (item) {
          return item && String(item.organization_id || '').trim() === String(targetOrg.id || '').trim();
        })
      : [];
    session.activeLegalEntityIds = session.activeLegalEntities.map(function (item) { return item.id; });
    session.activeLegalEntityNames = session.activeLegalEntities.map(function (item) { return item.name; });

    var membership = (session.memberships || []).find(function (item) {
      return String(item.organization_id || '').trim() === String(targetOrg.id || '').trim();
    }) || null;
    session.currentMembership = membership;
    session.role = membership ? normalizeUiRole(membership.role || 'manager') : 'unassigned';
    session.permissions = session.role && window.ROLES && window.ROLES[session.role] && window.ROLES[session.role].pages
      ? window.ROLES[session.role].pages.slice()
      : [];
    session.currentUser.role = session.role;
    session.currentUser.noOrganization = false;
    session.currentUser.organizationId = targetOrg.id;
    session.currentUser.company = targetOrg.name || session.currentUser.company || 'КальКа';
    session.currentUser.memberships = (session.memberships || []).map(function (item) {
      return {
        organizationId: item.organization_id,
        role: normalizeUiRole(item.role),
        status: item.status
      };
    });

    session.suppliers = Array.isArray(session.suppliers) ? session.suppliers : [];

    var baseDb = ensureArrays(window._dbCache || getDefaults());
    baseDb.users = session.dbUsers || [];
    baseDb.supsData = (session.suppliers || []).map(mapSupplierRowToLegacy);
    baseDb.__serverSession = {
      profileId: session.profile.id,
      activeOrganizationId: session.activeOrganizationId,
      role: session.role,
      membershipCount: (session.memberships || []).length
    };
    window.SUPS_DATA = baseDb.supsData.slice();
    syncRuntime(baseDb);
    applyServerSession(session);

    if (typeof window.renderDash === 'function') window.renderDash();
    if (typeof window.renderRestaurants === 'function') window.renderRestaurants();
    if (typeof window.renderSuppliers === 'function') window.renderSuppliers();
    if (typeof window.renderAdmin === 'function') window.renderAdmin();
    if (typeof window.renderOrders === 'function') window.renderOrders();
    if (typeof window.renderBudget === 'function') window.renderBudget();
    if (typeof window.goPage === 'function') window.goPage('dashboard');
    if (typeof window.toast === 'function') {
      window.toast('Активная организация: ' + (targetOrg.name || 'Организация'), 'ok');
    }
    return session;
  }

  window.setActiveOrganization = async function (organizationId) {
    try {
      var session = window.__userSession || null;
      if (!session || !session.currentUser) {
        throw new Error('Сначала войдите в систему');
      }
      if (!session.organizations || !session.organizations.length) {
        throw new Error('У вас пока нет доступных организаций');
      }
      return await refreshActiveOrganizationSession(session, organizationId);
    } catch (error) {
      console.error('setActiveOrganization failed:', error);
      if (typeof window.toast === 'function') {
        window.toast(error && error.message ? error.message : 'Не удалось переключить организацию', 'err');
      }
      return null;
    }
  };

  async function loadServerSession(authUser) {
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    if (!client || !authUser) return null;

    console.info('supabase request start', 'user_profiles');
    var profileResponse = await client
      .from('user_profiles')
      .select('id, auth_user_id, email, first_name, last_name, phone, status, created_at, updated_at')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    if (profileResponse.error) {
      console.error('user_profiles query failed', {
        code: profileResponse.error.code || '',
        message: profileResponse.error.message || '',
        details: profileResponse.error.details || '',
        hint: profileResponse.error.hint || '',
        raw: profileResponse.error
      });
    }
    var rawProfile = profileResponse && profileResponse.data ? profileResponse.data : null;
    var profile = normalizeProfileRow(rawProfile || buildFallbackProfile(authUser));
    if (!profile) return null;
    if (!rawProfile) {
      try {
        console.info('supabase request start', 'user_profiles bootstrap upsert');
        await client
          .from('user_profiles')
          .upsert({
            auth_user_id: authUser.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            status: profile.status
          }, { onConflict: 'auth_user_id' });
      } catch (profileError) {
        console.error('user_profiles bootstrap upsert failed:', profileError);
      }
    }

    console.info('supabase request start', 'organization_members');
    var membershipsResponse = await client
      .from('organization_members')
      .select('id, organization_id, user_profile_id, role, status, created_at, updated_at')
      .eq('user_profile_id', profile.id)
      .order('created_at', { ascending: true });
    if (membershipsResponse.error) {
      console.error('organization_members query failed', {
        code: membershipsResponse.error.code || '',
        message: membershipsResponse.error.message || '',
        details: membershipsResponse.error.details || '',
        hint: membershipsResponse.error.hint || '',
        raw: membershipsResponse.error
      });
      return null;
    }
    var memberships = (membershipsResponse.data || []).map(normalizeMembershipRow).filter(Boolean);
    console.info('membership query result', {
      authUserId: authUser.id,
      resolvedUserProfileId: profile.id,
      membershipsCount: memberships.length
    });

    var orgIds = Array.from(new Set(memberships.map(function (item) {
      return item.organization_id;
    }).filter(Boolean)));

    console.info('supabase request start', 'organizations');
    var organizationsResponse = orgIds.length
      ? await client
          .from('organizations')
          .select('id, name, type, status, created_at, updated_at')
          .in('id', orgIds)
          .order('created_at', { ascending: true })
      : { error: null, data: [] };
    if (organizationsResponse.error) {
      console.error('organizations query failed', {
        code: organizationsResponse.error.code || '',
        message: organizationsResponse.error.message || '',
        details: organizationsResponse.error.details || '',
        hint: organizationsResponse.error.hint || '',
        raw: organizationsResponse.error
      });
      return null;
    }
    var organizations = (organizationsResponse.data || []).map(normalizeOrganizationRow).filter(Boolean);

    var activeOrganization = pickActiveOrganization(organizations, memberships);
    var activeMembership = activeOrganization
      ? memberships.find(function (item) { return String(item.organization_id) === String(activeOrganization.id); }) || memberships[0] || null
      : memberships[0] || null;
    var legalEntities = [];
    var activeLegalEntities = [];
    var suppliers = [];
    var accessibleProfiles = [profile];

    var noOrganization = !activeOrganization || !memberships.length;
    var uiRole = noOrganization ? 'unassigned' : normalizeUiRole((activeMembership && activeMembership.role) || 'manager');
    console.info('initUserSession resolved', {
      authUserId: authUser.id,
      profileId: profile.id,
      membershipsCount: memberships.length,
      organizationsCount: organizations.length,
      activeOrganizationId: activeOrganization ? activeOrganization.id : null,
      noOrganization: noOrganization
    });
    console.info('initUserSession resolved', {
      authUserId: authUser && authUser.id,
      profileId: profile.id,
      membershipsCount: memberships.length,
      organizationsCount: organizations.length,
      activeOrganizationId: activeOrganization ? activeOrganization.id : null,
      noOrganization: noOrganization
    });
    var session = {
      profile: profile,
      memberships: memberships,
      organizations: organizations,
      legalEntities: legalEntities,
      noOrganization: noOrganization,
      activeOrganization: activeOrganization,
      activeOrganizationId: activeOrganization ? activeOrganization.id : null,
      activeLegalEntities: activeLegalEntities,
      activeLegalEntityIds: activeLegalEntities.map(function (item) { return item.id; }),
      activeLegalEntityNames: activeLegalEntities.map(function (item) { return item.name; }),
      currentMembership: activeMembership,
      role: uiRole,
      permissions: noOrganization ? [] : ((window.ROLES && window.ROLES[uiRole] && window.ROLES[uiRole].pages) ? window.ROLES[uiRole].pages.slice() : []),
      currentUser: {
        id: authUser.id,
        profileId: profile.id,
        first: profile.first_name || 'Пользователь',
        last: profile.last_name || '',
        company: (activeOrganization && activeOrganization.name) || profile.company || 'КальКа',
        email: String(profile.email || authUser.email || '').toLowerCase(),
        role: uiRole,
        status: profile.status || 'active',
        ev: true,
        created: (profile.created_at || new Date().toISOString()).slice(0, 10),
        organizationId: activeOrganization ? activeOrganization.id : null,
        noOrganization: noOrganization,
        memberships: memberships.map(function (item) {
          return {
            organizationId: item.organization_id,
            role: normalizeUiRole(item.role),
            status: item.status
          };
        })
      },
      suppliers: suppliers,
      dbUsers: accessibleProfiles.map(function (row) {
        var membership = memberships.filter(function (item) {
          return String(item.user_profile_id) === String(row.id);
        });
        return mapProfileToLegacyUser(row, membership, organizations, activeOrganization);
      })
    };

    if (noOrganization) {
      session.activeOrganization = null;
      session.activeOrganizationId = null;
      session.activeLegalEntities = [];
      session.activeLegalEntityIds = [];
      session.activeLegalEntityNames = [];
      session.suppliers = [];
      session.currentMembership = null;
      session.permissions = [];
      session.currentUser.role = 'unassigned';
      session.currentUser.noOrganization = true;
      session.currentUser.company = 'КальКа';
    }

    applyServerSession(session);
    return session;
  }

  window.initUserSession = async function (authUser) {
    if (!authUser) {
      clearClientRuntimeState();
      window.__userSession = null;
      window.__sessionReady = false;
      return null;
    }

    try {
      var session = await getOrCreateBootstrapPromise(authUser, function () {
        if (window.__sessionReady && window.__userSession && window.__userSession.currentUser && String(window.__userSession.currentUser.id || '') === String(authUser.id || '')) {
          return window.__userSession;
        }
        return loadServerSession(authUser);
      });
      if (!session) {
        clearClientRuntimeState();
        window.__userSession = null;
        window.__sessionReady = false;
        return null;
      }

      var baseDb = ensureArrays(window._dbCache || getDefaults());
      baseDb.users = session.dbUsers || [];
      baseDb.supsData = (session.suppliers || []).map(mapSupplierRowToLegacy);
      window.SUPS_DATA = baseDb.supsData.slice();
      baseDb.__serverSession = {
        profileId: session.profile.id,
        activeOrganizationId: session.activeOrganizationId,
        role: session.role,
        membershipCount: session.memberships.length
      };
      syncRuntime(baseDb);

      if (typeof window.CU !== 'undefined' && window.CU) {
        window.CU = Object.assign({}, window.CU, session.currentUser);
      } else {
        window.CU = session.currentUser;
      }
      window.__sessionReady = true;

      return session;
    } catch (error) {
      console.error('initUserSession failed:', error);
      window.__sessionReady = false;
      return null;
    }
  };

  window.submitSup = async function () {
    var errEl = document.getElementById('supSub') || document.getElementById('supGrid');
    var btn = document.getElementById('as-submit-btn');
    var editId = (document.getElementById('as-edit-id') || { value: '' }).value;
    var activeOrgId = String((window.__userSession && window.__userSession.activeOrganizationId) || '').trim();
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Сохраняем...';
    }

    function finish() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = editId !== '' ? 'Сохранить' : 'Добавить';
      }
    }

    try {
      if (!client || !app.supabase || !app.supabase.isEnabled || !app.supabase.isEnabled()) {
        throw new Error('Supabase не настроен');
      }
      if (!activeOrgId) {
        throw new Error('Нет активной организации. Выберите организацию и попробуйте снова.');
      }

      var name = ((document.getElementById('as-n') || {}).value || '').trim();
      if (!name) throw new Error('Укажите название поставщика');

      var supplierId = editId !== '' && window.__userSession && Array.isArray(window.__userSession.suppliers)
        ? (window.__userSession.suppliers[Number(editId)] && window.__userSession.suppliers[Number(editId)].id) || ''
        : '';
      var existing = supplierId && window.__userSession && Array.isArray(window.__userSession.suppliers)
        ? window.__userSession.suppliers.find(function (item) { return String(item.id) === String(supplierId); })
        : null;

      var payload = {
        organization_id: activeOrgId,
        legacy_key: existing && existing.legacy_key ? existing.legacy_key : ('sup_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
        name: name,
        emoji: ((document.getElementById('as-em2') || {}).value || '🏭').trim() || '🏭',
        kind: ((document.getElementById('as-c') || {}).value || 'Поставщик').trim() || 'Поставщик',
        rating: existing && typeof existing.rating === 'number' ? existing.rating : 0,
        orders_count: existing && typeof existing.orders === 'number' ? existing.orders : 0,
        delivery: ((document.getElementById('as-dl') || {}).value || '1-2 дня').trim() || '1-2 дня',
        min_order_text: (((document.getElementById('as-mn') || {}).value || '').trim() ? '₽' + ((document.getElementById('as-mn') || {}).value || '').trim() : '₽1 000'),
        status: 'active',
        tags: Array.isArray(existing && existing.tags) ? existing.tags.slice() : [],
        contact: ((document.getElementById('as-ct') || {}).value || '').trim(),
        phone: ((document.getElementById('as-ph') || {}).value || '').trim(),
        hidden: false
      };

      var upsertResult;
      if (supplierId) {
        upsertResult = await client
          .from('suppliers')
          .update(payload)
          .eq('id', supplierId)
          .eq('organization_id', activeOrgId)
          .select('*')
          .maybeSingle();
      } else {
        upsertResult = await client
          .from('suppliers')
          .insert(payload)
          .select('*')
          .maybeSingle();
      }

      if (upsertResult.error) throw upsertResult.error;

      var refreshedSuppliers = await loadSuppliersForOrganization(activeOrgId);
      if (window.__userSession) {
        window.__userSession.suppliers = refreshedSuppliers.slice();
      }
      try {
        var runtimeDb = ensureArrays(window._dbCache || getDefaults());
        runtimeDb.supsData = refreshedSuppliers.map(mapSupplierRowToLegacy);
        syncRuntime(runtimeDb);
        window.SUPS_DATA = runtimeDb.supsData.slice();
      } catch (runtimeError) {
        console.error('Failed to refresh supplier runtime after save:', runtimeError);
      }

      if (typeof window.closeSupplierModal === 'function') window.closeSupplierModal();
      if (typeof window.renderSuppliers === 'function') window.renderSuppliers();
      if (typeof window.renderCatalog === 'function') window.renderCatalog();
      if (typeof window.renderOwner === 'function' && window.CU && window.CU.role === 'owner') window.renderOwner();
      if (typeof window.toast === 'function') {
        window.toast('✅ Поставщик сохранён', 'ok');
      }
      if (window.logAudit) {
        window.logAudit(auditActor(), (supplierId ? 'Обновил' : 'Добавил') + ' поставщика «' + name + '»', 'Поставщики');
      }
    } catch (error) {
      console.error('Supplier save failed:', error);
      if (typeof window.toast === 'function') {
        window.toast('Не удалось сохранить поставщика', 'err');
      }
      return false;
    } finally {
      finish();
    }
    return true;
  };

  function bindAuthListener() {
    if (authBound) return;
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    if (!client) return;
    authBound = true;

    client.auth.onAuthStateChange(function (event) {
      var currentUser = null;
      try { currentUser = CU; } catch (error) { currentUser = window.CU || null; }
      if (event === 'SIGNED_OUT' && !loggingOut && currentUser) {
        legacy.doLogout && legacy.doLogout();
      }
    });
  }

  var legacyEnterApp = window.enterApp;
  if (typeof legacyEnterApp === 'function') {
    window.enterApp = function (user) {
      saveLastUser(user);
      return legacyEnterApp(user);
    };
  }

  var legacyScSw = window.scSw;
  if (typeof legacyScSw === 'function') {
    window.scSw = function (state) {
      if ((state === 'Login' || state === 'login') && restoreInFlight) {
        return;
      }
      return legacyScSw(state);
    };
  }

  window.dbGet = function () {
    if (isServerFirstMode()) {
      return ensureArrays(window._dbCache || getDefaults());
    }
    return ensureArrays(window._dbCache || readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
  };

  window.dbSet = function (db) {
    if (window.__loginInProgress || window.__restoreInProgress) {
      console.warn('dbSet skipped during auth bootstrap');
      return ensureArrays(window._dbCache || getDefaults());
    }
    var currentState = ensureArrays(window._dbCache || readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
    var normalized = syncRuntime(db);
    if (!hasMeaningfulState(normalized) && hasMeaningfulState(currentState)) {
      console.warn('dbSet skipped empty overwrite because meaningful state already exists');
      syncRuntime(currentState);
      return currentState;
    }
    saveBusinessDataSnapshot(normalized);
    saveStateToSupabase(normalized).catch(function () {
      if (legacy.dbSet) legacy.dbSet(normalized);
    });
    return normalized;
  };

  window.dbSave = window.dbSet;

  window.dbLoad = function (callback) {
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (callback) callback();
    }

    (async function () {
      try {
        if (window.__loginInProgress) {
          finish();
          return;
        }
        if (window.__restoreInProgress || window.__sessionReady) {
          finish();
          return;
        }
        if (isServerFirstMode()) {
          try {
            window.__restoreInProgress = true;
            var sessionResponse = await app.supabase.getClient().auth.getSession();
            if (sessionResponse && sessionResponse.data && sessionResponse.data.session && sessionResponse.data.session.user) {
              await window.initUserSession(sessionResponse.data.session.user);
            } else {
              window.__userSession = null;
              window.CU = null;
              window.activeRest = { id: 'r0', name: 'Нет доступных организаций', emoji: '🔒' };
            }
          } catch (serverError) {
            console.error('Server-first dbLoad failed:', serverError);
          } finally {
            window.__restoreInProgress = false;
          }
          finish();
          return;
        }

        setTimeout(function () {
          if (!finished && !isServerFirstMode()) {
            console.error('dbLoad timeout: fallback to local state');
            try {
              syncRuntime(readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
            } catch (error) {
              console.error('dbLoad timeout fallback failed:', error);
            }
            finish();
          }
        }, 4500);

        if (legacy.dbLoad) {
          legacy.dbLoad(async function () {
            try {
              var fallbackState = window._dbCache || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults();
              var mergedFallback = await loadBusinessDataFromSupabase(fallbackState);
              var normalizedFallback = syncRuntime(mergedFallback);
              if (hasMeaningfulState(normalizedFallback)) {
                saveBusinessDataSnapshot(normalizedFallback);
                saveStateToSupabase(normalizedFallback).catch(function () {});
              }
            } catch (error) {
              console.error('legacy dbLoad fallback hydrate failed:', error);
              try {
                syncRuntime(window._dbCache || (legacy.dbGet ? legacy.dbGet() : null) || readLocalState() || getDefaults());
              } catch (innerError) {
                console.error('legacy dbLoad final fallback failed:', innerError);
              }
            }
            finish();
          });
          return;
        }

        try {
          var mergedLocalState = await loadBusinessDataFromSupabase(readLocalState() || getDefaults());
          var localState = syncRuntime(mergedLocalState);
          if (hasMeaningfulState(localState)) {
            saveBusinessDataSnapshot(localState);
            saveStateToSupabase(localState).catch(function () {});
          }
        } catch (error) {
          console.warn('dbLoad secondary hydrate failed:', error);
          try {
            syncRuntime(readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
          } catch (innerError) {
            console.error('dbLoad local recovery failed:', innerError);
          }
        }
      } catch (error) {
        console.error('dbLoad fatal fallback path failed:', error);
        try {
          syncRuntime(readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
        } catch (innerError) {
          console.error('dbLoad local recovery failed:', innerError);
        }
      }
      finish();
    })();
  };

  window.doLogin = async function () {
    var errEl = document.getElementById('liErr');
    var email = ((document.getElementById('liE') || {}).value || '').trim().toLowerCase();
    var password = ((document.getElementById('liP') || {}).value || '');
    var button = document.getElementById('loginBtn');
    var config = app.config && app.config.getSupabaseConfig ? app.config.getSupabaseConfig() : null;

    console.info('supabase config', {
      hasUrl: !!(config && config.url),
      hasAnonKey: !!(config && config.anonKey),
      source: config && config.source ? config.source : 'unknown'
    });

    if (errEl) errEl.textContent = '';
    if (!email || !password) {
      if (errEl) errEl.textContent = 'Заполните email и пароль';
      return;
    }
    if (!app.supabase || !app.supabase.isEnabled || !app.supabase.isEnabled()) {
      if (errEl) errEl.textContent = 'Сервис авторизации временно недоступен. Обратитесь к администратору';
      return;
    }

    if (window.__sessionReady && window.__userSession && window.__userSession.currentUser) {
      if (button) {
        button.textContent = 'Войти в систему →';
        button.disabled = false;
      }
      if (typeof window.enterApp === 'function') window.enterApp(window.__userSession.currentUser);
      return;
    }

    if (button) {
      button.textContent = 'Входим...';
      button.disabled = true;
    }

    try {
      window.__loginInProgress = true;
      window.__sessionReady = false;
      console.info('login started');
      markLoginStage('login:start', email);
      bindAuthListener();
      var client = app.supabase.getClient();
      if (!client) {
        throw new Error('Сервис авторизации временно недоступен. Обратитесь к администратору');
      }
      console.info('signIn started');
      var response;
      try {
        response = await withTimeout(
          client.auth.signInWithPassword({ email: email, password: password }),
          10000,
          'Не удалось выполнить вход. Проверьте интернет или попробуйте позже.'
        );
      } catch (signInError) {
        console.error('supabase request failed', {
          request: 'auth signInWithPassword',
          code: signInError && signInError.code ? signInError.code : '',
          message: signInError && signInError.message ? signInError.message : '',
          details: signInError && signInError.details ? signInError.details : '',
          hint: signInError && signInError.hint ? signInError.hint : '',
          raw: signInError
        });
        if (signInError && signInError.code === 'TIMEOUT') {
          try {
            console.info('supabase request start', 'auth getSession after signIn timeout');
            var timeoutSession = await client.auth.getSession();
            if (timeoutSession && timeoutSession.data && timeoutSession.data.session && timeoutSession.data.session.user) {
              response = { data: { session: timeoutSession.data.session, user: timeoutSession.data.session.user }, error: null };
            } else {
              throw signInError;
            }
          } catch (timeoutSessionError) {
            console.error('signIn timeout recovery failed', {
              code: timeoutSessionError && timeoutSessionError.code ? timeoutSessionError.code : '',
              message: timeoutSessionError && timeoutSessionError.message ? timeoutSessionError.message : '',
              details: timeoutSessionError && timeoutSessionError.details ? timeoutSessionError.details : '',
              hint: timeoutSessionError && timeoutSessionError.hint ? timeoutSessionError.hint : '',
              raw: timeoutSessionError
            });
            throw signInError;
          }
        } else {
          throw signInError;
        }
      }
      if (response.error) {
        throw response.error;
      }

      var authUser = (response.data && response.data.user) || (response.data && response.data.session && response.data.session.user) || null;
      if (!authUser && client && client.auth && client.auth.getSession) {
        try {
          console.info('supabase request start', 'auth getSession after signIn');
          var postSignInSession = await client.auth.getSession();
          authUser = postSignInSession && postSignInSession.data && postSignInSession.data.session && postSignInSession.data.session.user
            ? postSignInSession.data.session.user
            : null;
        } catch (getSessionError) {
          console.error('signIn post-session fetch failed', getSessionError);
        }
      }
      if (!authUser) {
        console.warn('signIn completed without immediate auth user, trying existing session');
        try {
          var fallbackSessionResponse = await client.auth.getSession();
          authUser = fallbackSessionResponse && fallbackSessionResponse.data && fallbackSessionResponse.data.session && fallbackSessionResponse.data.session.user
            ? fallbackSessionResponse.data.session.user
            : null;
        } catch (fallbackSessionError) {
          console.error('signIn fallback session fetch failed', fallbackSessionError);
        }
      }
      if (!authUser) throw new Error('Не удалось определить пользователя');
      console.info('auth success', authUser.id);
      markLoginStage('login:auth-ok', authUser.email || '');

      clearClientRuntimeState();
      console.info('initUserSession started');
      var session = await withTimeout(
        window.initUserSession(authUser),
        15000,
        'Не удалось загрузить профиль пользователя. Обратитесь к администратору'
      ).catch(function (error) {
        console.error('supabase request failed', {
          request: 'initUserSession',
          code: error && error.code ? error.code : '',
          message: error && error.message ? error.message : '',
          details: error && error.details ? error.details : '',
          hint: error && error.hint ? error.hint : '',
          raw: error
        });
        throw error;
      });
      if (!session || !session.currentUser) {
        session = buildNoOrganizationSession(authUser);
      }
      if (!session.currentUser.noOrganization && session.currentUser.status === 'blocked') {
        await client.auth.signOut();
        if (errEl) errEl.textContent = 'Аккаунт заблокирован';
        return;
      }
      if (!session.currentUser.noOrganization && session.currentUser.status === 'pending') {
        await client.auth.signOut();
        if (errEl) errEl.textContent = 'Заявка ещё не одобрена владельцем или администратором';
        return;
      }
      if (!session.currentUser.noOrganization && session.currentUser.status === 'rejected') {
        await client.auth.signOut();
        if (errEl) errEl.textContent = 'Заявка отклонена. Обратитесь к владельцу платформы';
        return;
      }

      if (session.noOrganization) {
        console.info('no organization mode');
      }
      markLoginStage('login:state-hydrated', session.noOrganization ? 'no-organization' : 'server-first');
      if (typeof window.enterApp === 'function') window.enterApp(session.currentUser);
      window.__sessionReady = true;
    } catch (error) {
      console.error('signIn failed', error);
      if (errEl) errEl.textContent = error && error.message ? error.message : 'Ошибка входа';
    } finally {
      window.__loginInProgress = false;
      if (button) {
        button.textContent = 'Войти в систему →';
        button.disabled = false;
      }
    }
  };

  window.openAssignUserToOrganizationModal = function (userId) {
    if (!window.CU || window.CU.role !== 'owner') {
      if (typeof window.toast === 'function') window.toast('Только владелец может назначать организации', 'err');
      return;
    }
    var user = findOwnerUserCandidate(userId, '', '');
    if (!user) {
      if (typeof window.toast === 'function') window.toast('Пользователь не найден', 'err');
      return;
    }
    var title = document.querySelector('#ov-assignUserOrg .m-title');
    if (title) title.textContent = '🏢 Назначить организацию и роль';
    var info = document.getElementById('auo-user-info');
    if (info) info.innerHTML = '<b>' + [user.first, user.last].filter(Boolean).join(' ') + '</b><br><span style="color:var(--t3);font-size:12px;">' + (user.email || '—') + '</span>';
    var userIdInput = document.getElementById('auo-user-id');
    if (userIdInput) userIdInput.value = user.auth_user_id || user.id || '';
    var authUserIdInput = document.getElementById('auo-auth-user-id');
    if (authUserIdInput) authUserIdInput.value = user.auth_user_id || user.id || '';
    var userProfileIdInput = document.getElementById('auo-user-profile-id');
    if (userProfileIdInput) userProfileIdInput.value = user.profileId || '';
    var emailInput = document.getElementById('auo-email');
    if (emailInput) emailInput.value = user.email || '';
    var orgSelect = document.getElementById('auo-org');
    if (orgSelect) {
      var organizations = (window.__userSession && Array.isArray(window.__userSession.organizations)) ? window.__userSession.organizations : [];
      orgSelect.innerHTML = '<option value="">Выберите организацию</option>' + organizations.map(function (org) {
        return '<option value="' + org.id + '">' + (org.name || 'Организация') + '</option>';
      }).join('');
    }
    var roleSelect = document.getElementById('auo-role');
    if (roleSelect) roleSelect.value = user.role && ROLES[user.role] ? user.role : 'manager';
    var statusSelect = document.getElementById('auo-status');
    if (statusSelect) statusSelect.value = 'active';
    var errEl = document.getElementById('auo-err');
    if (errEl) errEl.textContent = '';
    if (typeof window.openModal === 'function') {
      window.openModal('assignUserOrg');
    }
  };

  window.submitAssignUserToOrganization = async function () {
    var errEl = document.getElementById('auo-err');
    var okEl = document.getElementById('auo-ok');
    var btn = document.getElementById('auo-submit-btn');
    var legacyUserId = ((document.getElementById('auo-user-id') || {}).value || '').trim();
    var authUserId = ((document.getElementById('auo-auth-user-id') || {}).value || '').trim();
    var userProfileId = ((document.getElementById('auo-user-profile-id') || {}).value || '').trim();
    var email = ((document.getElementById('auo-email') || {}).value || '').trim().toLowerCase();
    var orgId = ((document.getElementById('auo-org') || {}).value || '').trim();
    var role = ((document.getElementById('auo-role') || {}).value || '').trim();
    var status = ((document.getElementById('auo-status') || {}).value || 'active').trim() || 'active';
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;

    if (errEl) errEl.textContent = '';
    if (okEl) okEl.textContent = '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Сохраняем...';
    }

    try {
      console.info('assign user started');
      if (!window.CU || window.CU.role !== 'owner') {
        throw new Error('Только владелец может назначать пользователей');
      }
      if (!client || !app.supabase || !app.supabase.isEnabled || !app.supabase.isEnabled()) {
        throw new Error('Supabase не настроен');
      }
      if (!orgId) throw new Error('Выберите организацию');
      if (!role) throw new Error('Выберите роль');
      console.info('selected organization_id', orgId);
      console.info('selected role', role);
      console.info('auth_user_id', authUserId || legacyUserId || '');
      console.info('resolved user_profile_id input', userProfileId || '');
      console.info('email', email || '');

      if (!legacyUserId && !authUserId && !userProfileId && !email) {
        throw new Error('Пользователь не найден');
      }

      var selectedUser = findOwnerUserCandidate(legacyUserId || authUserId, userProfileId, email);
      if (!selectedUser) {
        selectedUser = normalizeOwnerUserIdentity({
          auth_user_id: authUserId || legacyUserId,
          profileId: userProfileId,
          email: email
        });
      }
      if (!selectedUser || (!selectedUser.auth_user_id && !selectedUser.profileId && !selectedUser.email)) {
        throw new Error('Не удалось найти пользователя в public.user_profiles');
      }

      var profileRow = await ensureAssignableUserProfile(client, {
        userProfileId: selectedUser.profileId || userProfileId,
        authUserId: selectedUser.auth_user_id || authUserId || legacyUserId,
        email: selectedUser.email || email,
        first: selectedUser.first,
        last: selectedUser.last,
        phone: selectedUser.phone,
        status: selectedUser.status || 'active'
      });
      if (!profileRow || !profileRow.id) {
        console.error('failed to create or resolve user profile', {
          legacyUserId: legacyUserId,
          authUserId: authUserId,
          userProfileId: userProfileId,
          email: email
        });
        throw new Error('Не удалось создать профиль пользователя');
      }

      var profileId = String(profileRow.id || selectedUser.profileId || userProfileId || '').trim();
      if (!profileId) throw new Error('Не удалось определить профиль пользователя');
      console.info('resolved user_profile_id', profileId);

      var memberPayload = {
        organization_id: orgId,
        user_profile_id: profileId,
        role: role,
        status: status
      };
      console.info('supabase request start', 'organization_members lookup');
      var existingMemberResponse = await client
        .from('organization_members')
        .select('id, organization_id, user_profile_id, role, status')
        .eq('organization_id', orgId)
        .eq('user_profile_id', profileId)
        .maybeSingle();
      if (existingMemberResponse.error) {
        console.error('organization_members lookup failed', {
          code: existingMemberResponse.error.code || '',
          message: existingMemberResponse.error.message || '',
          details: existingMemberResponse.error.details || '',
          hint: existingMemberResponse.error.hint || '',
          raw: existingMemberResponse.error
        });
        throw existingMemberResponse.error;
      }
      if (existingMemberResponse.data && existingMemberResponse.data.id) {
        console.info('supabase request start', 'organization_members update');
        var updateMemberResponse = await client
          .from('organization_members')
          .update({ role: role, status: status })
          .eq('id', existingMemberResponse.data.id);
        if (updateMemberResponse.error) {
          console.error('organization_members update failed', {
            code: updateMemberResponse.error.code || '',
            message: updateMemberResponse.error.message || '',
            details: updateMemberResponse.error.details || '',
            hint: updateMemberResponse.error.hint || '',
            raw: updateMemberResponse.error
          });
          throw updateMemberResponse.error;
        }
      } else {
        console.info('supabase request start', 'organization_members insert');
        var insertMemberResponse = await client
          .from('organization_members')
          .insert(memberPayload);
        if (insertMemberResponse.error) {
          console.error('organization_members insert failed', {
            code: insertMemberResponse.error.code || '',
            message: insertMemberResponse.error.message || '',
            details: insertMemberResponse.error.details || '',
            hint: insertMemberResponse.error.hint || '',
            raw: insertMemberResponse.error
          });
          throw insertMemberResponse.error;
        }
      }
      console.info('supabase request start', 'organization_members verify');
      var verifyMemberResponse = await client
        .from('organization_members')
        .select('id, organization_id, user_profile_id, role, status')
        .eq('organization_id', orgId)
        .eq('user_profile_id', profileId)
        .maybeSingle();
      if (verifyMemberResponse.error) {
        console.error('organization_members verify failed', {
          code: verifyMemberResponse.error.code || '',
          message: verifyMemberResponse.error.message || '',
          details: verifyMemberResponse.error.details || '',
          hint: verifyMemberResponse.error.hint || '',
          raw: verifyMemberResponse.error
        });
        throw verifyMemberResponse.error;
      }
      if (!verifyMemberResponse.data || !verifyMemberResponse.data.id) {
        throw new Error('Не удалось подтвердить сохранение membership');
      }
      console.info('membership saved');

      try {
        console.info('supabase request start', 'auth getUser refresh');
        var authResult = await client.auth.getUser();
        var currentAuthUser = authResult && authResult.data && authResult.data.user ? authResult.data.user : null;
        if (currentAuthUser) {
          await window.initUserSession(currentAuthUser, { forceReload: true });
        }
      } catch (refreshError) {
        console.error('user membership refresh failed', {
          code: refreshError && refreshError.code ? refreshError.code : '',
          message: refreshError && refreshError.message ? refreshError.message : '',
          details: refreshError && refreshError.details ? refreshError.details : '',
          hint: refreshError && refreshError.hint ? refreshError.hint : '',
          raw: refreshError
        });
      }

      if (typeof window.closeModal === 'function') window.closeModal('assignUserOrg');
      if (window.retryOwnerUsersLoad) {
        try { await window.retryOwnerUsersLoad(); } catch (ownerReloadError) {}
      }
      if (typeof window.renderAdmin === 'function') window.renderAdmin();
      if (typeof window.renderOwner === 'function') window.renderOwner();
      if (typeof window.toast === 'function') window.toast('Пользователь добавлен в организацию', 'ok');
      if (window.logAudit) {
        window.logAudit(auditActor(), 'Назначил организацию и роль пользователю ' + (profileRow.email || selectedUser.email || email || legacyUserId) + ' → ' + orgId + ' / ' + role, 'Пользователи');
      }
      return true;
    } catch (error) {
      console.error('assign user to organization failed:', error);
      console.error('membership not saved');
      if (errEl) errEl.textContent = error && error.message ? error.message : 'Не удалось назначить организацию';
      return false;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✅ Сохранить';
      }
    }
  };

  window.doRegister = async function () {
    var errEl = document.getElementById('sr-err');
    var okEl = document.getElementById('sr-ok');
    var button = document.getElementById('selfRegisterBtn');
    var first = ((document.getElementById('sr-fi') || {}).value || '').trim();
    var last = ((document.getElementById('sr-la') || {}).value || '').trim();
    var company = ((document.getElementById('sr-co') || {}).value || '').trim();
    var email = (((document.getElementById('sr-em') || {}).value || '').trim()).toLowerCase();
    var password = ((document.getElementById('sr-pa') || {}).value || '');
    var role = ((document.getElementById('sr-ro') || {}).value || 'manager').trim() || 'manager';
    var note = ((document.getElementById('sr-note') || {}).value || '').trim();

    if (errEl) errEl.textContent = '';
    if (okEl) okEl.textContent = '';

    if (!first || !last) {
      if (errEl) errEl.textContent = 'Укажите имя и фамилию';
      return;
    }
    if (!company) {
      if (errEl) errEl.textContent = 'Укажите компанию или организацию';
      return;
    }
    if (!email || !/@/.test(email)) {
      if (errEl) errEl.textContent = 'Введите корректный email';
      return;
    }
    if (!password || password.length < 6) {
      if (errEl) errEl.textContent = 'Пароль должен быть не короче 6 символов';
      return;
    }
    if (!app.supabase || !app.supabase.isEnabled || !app.supabase.isEnabled()) {
      if (errEl) errEl.textContent = 'Supabase не настроен';
      return;
    }

    if (button) {
      button.textContent = 'Создаём...';
      button.disabled = true;
    }

    try {
      var client = app.supabase.getClient();
      var response = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: first,
            last_name: last,
            company: company,
            role: role,
            status: 'pending',
            note: note
          }
        }
      });

      if (response.error) {
        console.error('loadSuppliersForOrganization failed', {
          code: response.error.code || '',
          message: response.error.message || '',
          details: response.error.details || '',
          hint: response.error.hint || '',
          raw: response.error
        });
        throw response.error;
      }

      if (response.data && response.data.user) {
        try {
          console.info('supabase request start', 'registration user_profiles upsert');
          var registrationProfileResponse = await client
            .from('user_profiles')
            .upsert({
              auth_user_id: response.data.user.id,
              email: email,
              first_name: first,
              last_name: last,
              phone: '',
              status: 'pending'
            }, { onConflict: 'auth_user_id' })
            .select('id, auth_user_id, email, first_name, last_name, phone, status')
            .maybeSingle();
          if (registrationProfileResponse.error) {
            console.error('registration user_profiles upsert failed', {
              code: registrationProfileResponse.error.code || '',
              message: registrationProfileResponse.error.message || '',
              details: registrationProfileResponse.error.details || '',
              hint: registrationProfileResponse.error.hint || '',
              raw: registrationProfileResponse.error
            });
          }
        } catch (registrationProfileError) {
          console.error('registration user_profiles upsert failed', registrationProfileError);
        }
      }

      var db = ensureArrays(window._dbCache || readLocalState() || getDefaults());
      var pendingUser = {
        id: response.data.user ? response.data.user.id : ('u' + Date.now()),
        first: first,
        last: last,
        company: company,
        email: email,
        role: role,
        status: 'pending',
        ev: true,
        created: new Date().toISOString().slice(0, 10),
        reason: note,
        createdBy: 'self-signup'
      };
      upsertUserInDb(pendingUser);

      if (response.data.session) {
        await client.auth.signOut();
      } else if (okEl) {
        okEl.textContent = 'Аккаунт создан. Подтвердите email, если письмо пришло, и дождитесь одобрения. Для простого входа владельцу лучше включить Auto Confirm в Supabase Email Auth.';
      }

      ['sr-fi', 'sr-la', 'sr-co', 'sr-em', 'sr-pa', 'sr-note'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });

      if (okEl && response.data.session) {
        okEl.textContent = 'Аккаунт создан. Дождитесь одобрения владельцем или администратором, затем войдите.';
      }
    } catch (error) {
      var message = error && error.message ? error.message : 'Ошибка регистрации';
      if (/already registered/i.test(message)) {
        message = 'Этот email уже зарегистрирован. Попробуйте войти или используйте другой email.';
      }
      if (errEl) errEl.textContent = message;
    } finally {
      if (button) {
        button.textContent = 'Зарегистрироваться';
        button.disabled = false;
      }
    }
  };

  window.doLogout = async function () {
    var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
    loggingOut = true;
    window.__sessionReady = false;
    window.__restoreInProgress = false;
    clearLastUser();
    clearClientRuntimeState();
    clearClientStorage();
    try {
      if (client) await client.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    if (legacy.doLogout) legacy.doLogout();
    loggingOut = false;
  };

  window.saveMyProfile = async function () {
    if (!window.CU) {
      if (legacy.saveMyProfile) return legacy.saveMyProfile();
      return;
    }

    var err = document.getElementById('mp-err');
    var ok = document.getElementById('mp-ok');
    if (err) err.textContent = '';
    if (ok) ok.textContent = '';

    var first = ((document.getElementById('mp-fi') || {}).value || '').trim();
    var last = ((document.getElementById('mp-la') || {}).value || '').trim();
    var company = ((document.getElementById('mp-co') || {}).value || '').trim();
    var newEmail = (((document.getElementById('mp-em') || {}).value || '').trim()).toLowerCase();
    var oldPw = ((document.getElementById('mp-old') || {}).value || '');
    var newPw = ((document.getElementById('mp-new') || {}).value || '');
    var newPw2 = ((document.getElementById('mp-new2') || {}).value || '');

    if (!first || !last) {
      if (err) err.textContent = 'Укажите имя и фамилию';
      return;
    }
    if (!company) {
      if (err) err.textContent = 'Укажите компанию';
      return;
    }
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      if (err) err.textContent = 'Введите корректный email';
      return;
    }
    if ((newPw || oldPw) && newPw.length < 6) {
      if (err) err.textContent = 'Новый пароль должен быть не короче 6 символов';
      return;
    }
    if ((newPw || oldPw) && newPw !== newPw2) {
      if (err) err.textContent = 'Новые пароли не совпадают';
      return;
    }

    if (!app.supabase || !app.supabase.isEnabled || !app.supabase.isEnabled()) {
      if (legacy.saveMyProfile) return legacy.saveMyProfile();
      if (err) err.textContent = 'Supabase не настроен';
      return;
    }

    try {
      var client = app.supabase.getClient();
      var db = ensureArrays(window._dbCache || readLocalState() || getDefaults());
      var currentUser = window.CU || null;
      var idx = db.users.findIndex(function (item) {
        return currentUser && item && item.id === currentUser.id;
      });
      if (idx < 0) {
        if (err) err.textContent = 'Пользователь не найден';
        return;
      }

      var currentEmail = String((db.users[idx] && db.users[idx].email) || (currentUser && currentUser.email) || '').toLowerCase();
      if (newEmail !== currentEmail) {
        var taken = db.users.some(function (item, index) {
          return index !== idx && item && String(item.email || '').toLowerCase() === newEmail;
        });
        if (taken) {
          if (err) err.textContent = 'Этот email уже занят другим пользователем';
          return;
        }
      }

      if (newPw) {
        if (!oldPw) {
          if (err) err.textContent = 'Введите текущий пароль';
          return;
        }
        var reauth = await client.auth.signInWithPassword({
          email: currentEmail,
          password: oldPw
        });
        if (reauth.error) {
          if (err) err.textContent = 'Неверный текущий пароль';
          return;
        }
      }

      var payload = {
        data: {
          first_name: first,
          last_name: last,
          company: company,
          role: db.users[idx].role || (currentUser && currentUser.role) || 'manager',
          status: db.users[idx].status || (currentUser && currentUser.status) || 'active'
        }
      };
      if (newEmail !== currentEmail) payload.email = newEmail;
      if (newPw) payload.password = newPw;

      var updateResult = await client.auth.updateUser(payload);
      if (updateResult.error) throw updateResult.error;

      db.users[idx].first = first;
      db.users[idx].last = last;
      db.users[idx].company = company;
      db.users[idx].email = newEmail;
      window.dbSet(db);

      if (currentUser) {
        currentUser.first = first;
        currentUser.last = last;
        currentUser.company = company;
        currentUser.email = newEmail;
      }

      var sbName = document.getElementById('sbName');
      if (sbName) sbName.textContent = first + ' ' + last;
      var sbRole = document.getElementById('sbRole');
      if (sbRole) sbRole.textContent = company;
      var mpEmail = document.getElementById('mpEmail');
      if (mpEmail) mpEmail.textContent = newEmail;
      ['mp-old', 'mp-new', 'mp-new2'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });

      if (ok) {
        ok.textContent = newPw || newEmail !== currentEmail
          ? 'Профиль обновлён. Если для email включено подтверждение, завершите его по письму.'
          : 'Данные профиля сохранены.';
      }
    } catch (error) {
      if (err) err.textContent = error && error.message ? error.message : 'Не удалось обновить профиль';
    }
  };

  app.auth = {
    initUserSession: async function (authUser, opts) {
      return window.initUserSession ? window.initUserSession(authUser, opts) : null;
    },
    restoreSession: async function () {
      var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
      if (!client) return false;
      if (loggingOut || window.__loginInProgress || window.__sessionReady) return false;
      if (window.__restoreInProgress) return false;

      window.__restoreInProgress = true;
      restoreInFlight = true;
      bindAuthListener();
      try {
        var response = await client.auth.getSession();
        if (response.error || !response.data || !response.data.session || !response.data.session.user) {
          return false;
        }
        if (window.__loginInProgress || window.__sessionReady) {
          return false;
        }

        clearClientRuntimeState();
        var currentUser = null;
        try { currentUser = CU; } catch (error) { currentUser = window.CU || null; }
        var sessionPromise = window.initUserSession(response.data.session.user);
        var session = await Promise.race([sessionPromise, new Promise(function (resolve) {
          setTimeout(function () { resolve({ __timeout: true, __loading: true }); }, 4500);
        })]);
        if (window.__loginInProgress || window.__sessionReady) {
          return true;
        }
        if (session && session.__loading) {
          session = await sessionPromise.catch(function (error) {
            console.error('restoreSession failed:', error);
            return buildNoOrganizationSession(response.data.session.user);
          });
        }
        if (!session || !session.currentUser) {
          session = buildNoOrganizationSession(response.data.session.user);
        }
        if (typeof window.enterApp === 'function' && (!currentUser || currentUser.id !== session.currentUser.id || !document.getElementById('APP') || !document.getElementById('APP').classList.contains('on'))) {
          window.enterApp(session.currentUser);
        }
        setTimeout(function () {
          if (window.__userSession && window.__userSession.currentUser && typeof window.enterApp === 'function') {
            window.CU = Object.assign({}, window.CU || {}, window.__userSession.currentUser);
          }
        }, 0);
        window.__sessionReady = true;
        return true;
      } finally {
        restoreInFlight = false;
        window.__restoreInProgress = false;
      }
    }
  };

  function sanitizeProductName(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^[\d\s./-]+(?=[A-Za-zА-Яа-яЁё])/g, '')
      .replace(/[|]+/g, ' ')
      .replace(/\b(руб|₽|price|цена)\b.*$/i, '')
      .trim();
  }

  function isJunkProductName(value) {
    var name = sanitizeProductName(value).toLowerCase();
    if (!name) return true;
    if (/^(итого|итог|всего|сумма|примечание|примеч|комментарий|дата|поставщик|прайс|прайс-лист|лист|страница|номер|код|артикул)$/i.test(name)) {
      return true;
    }
    if (/^(итого|всего|сумма|дата|номер|код|артикул|прайс|поставщик)\b/i.test(name)) {
      return true;
    }
    if (!/[A-Za-zА-Яа-яЁё]/.test(name)) return true;
    if (/^\d+([.,]\d+)?$/.test(name)) return true;
    return false;
  }

  function looksLikeTextCell(value) {
    var text = sanitizeProductName(value);
    if (!text || isJunkProductName(text)) return false;
    if (window.extractPrice(text) > 0) return false;
    return /[A-Za-zА-Яа-яЁё]/.test(text);
  }

  function scoreNameCell(value, colIndex, layout) {
    var text = sanitizeProductName(value);
    if (!looksLikeTextCell(text)) return -1000;

    var score = 0;
    if (layout && layout.nameCol === colIndex) score += 30;
    if (colIndex <= 2) score += 12;
    if (text.length >= 3 && text.length <= 80) score += 10;
    if (text === text.toUpperCase() && text.length > 12) score -= 15;
    if (/^[A-ZА-ЯЁ\s,."-]+$/.test(text) && text.length > 12) score -= 8;
    if (layout && layout.nameCol >= 0) {
      score -= Math.abs(colIndex - layout.nameCol) * 14;
    }
    if (/\b(россия|перу|китай|египет|иран|турция|сербия|марокко|израиль|узбекистан|таиланд|азербайджан|армения|грузия|индия|пакистан|бразилия|аргентина|чили|эквадор|юар)\b/i.test(text)) {
      score -= 40;
    }
    if (/^[A-ZА-ЯЁ ,."()-]+$/.test(text) && text.length > 6) {
      score -= 18;
    }
    return score;
  }

  function scorePriceCell(value, colIndex, layout, unitIndex) {
    var price = window.extractPrice(value);
    if (!price || price <= 0) return -1000;

    var score = 0;
    if (layout && layout.priceCol === colIndex) score += 30;
    score += Math.min(colIndex, 12) * 2;
    if (unitIndex >= 0) score += Math.max(0, 14 - Math.abs(unitIndex - colIndex) * 4);
    if (price > 20) score += 10;
    if (price > 100) score += 8;
    if (price === 10 || price === 20) score -= 18;
    if (price < 1) score -= 25;
    return score;
  }

  function extractRowStructuredData(parts, layout) {
    if (!Array.isArray(parts) || !parts.length) return null;

    var unitIndex = -1;
    var unitValue = '';
    for (var i = 0; i < parts.length; i++) {
      var rawUnit = String(parts[i] || '').trim();
      if (unitLike(rawUnit)) {
        unitIndex = i;
        unitValue = rawUnit;
        if (layout && layout.unitCol === i) break;
      }
    }

    var bestName = { score: -1000, value: '', index: -1 };
    for (var n = 0; n < parts.length; n++) {
      var nameScore = scoreNameCell(parts[n], n, layout);
      if (nameScore > bestName.score) {
        bestName = { score: nameScore, value: sanitizeProductName(parts[n]), index: n };
      }
    }

    if (layout && layout.nameCol >= 0) {
      var strictName = sanitizeProductName(parts[layout.nameCol]);
      if (looksLikeTextCell(strictName) && !isJunkProductName(strictName)) {
        bestName = {
          score: 999,
          value: strictName,
          index: layout.nameCol
        };
      }
    }

    var bestPrice = { score: -1000, value: 0, index: -1 };
    for (var p = 0; p < parts.length; p++) {
      var priceScore = scorePriceCell(parts[p], p, layout, unitIndex);
      if (priceScore > bestPrice.score) {
        bestPrice = { score: priceScore, value: window.extractPrice(parts[p]), index: p };
      }
    }

    if (!bestName.value || isJunkProductName(bestName.value)) return null;
    if (!bestPrice.value || bestPrice.value <= 0) return null;

    var unit = 'кг';
    try {
      unit = typeof window.normalizeUnit === 'function'
        ? (window.normalizeUnit(unitValue, bestName.value) || 'кг')
        : (unitValue || 'кг');
    } catch (error) {
      unit = unitValue || 'кг';
    }

    return {
      name: bestName.value,
      unit: unit,
      price: bestPrice.value
    };
  }

  function extractImportedPriceRows(rows, layout) {
    var extracted = [];
    var seen = {};
    var startRow = layout && layout.headerRow >= 0 ? layout.headerRow + 1 : 0;

    for (var i = startRow; i < (rows || []).length; i++) {
      var parsed = extractRowStructuredData(rows[i], layout);
      if (!parsed) continue;
      var key = parsed.name.toLowerCase() + '|' + parsed.unit + '|' + parsed.price;
      if (seen[key]) continue;
      seen[key] = true;
      extracted.push(parsed);
    }

    return extracted;
  }

  function normalizeImportedPriceRow(parts, layout) {
    if (!Array.isArray(parts) || !layout) return null;

    return extractRowStructuredData(parts, layout);
  }

  function unitLike(value) {
    var text = String(value || '').trim().toLowerCase();
    return ['кг', 'г', 'гр', 'шт', 'шт.', 'л', 'мл', 'kg', 'g', 'pcs', 'l', 'ml'].indexOf(text) >= 0;
  }

  function detectComplexPriceLayout(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;

    var headerRow = -1;
    var nameCol = -1;
    for (var i = 0; i < Math.min(rows.length, 20); i++) {
      var row = rows[i] || [];
      for (var j = 0; j < row.length; j++) {
        var cell = String(row[j] || '').toLowerCase().trim();
        if (cell.indexOf('наименование товара') >= 0 || cell === 'наименование') {
          headerRow = i;
          nameCol = j;
          break;
        }
      }
      if (headerRow >= 0) break;
    }

    if (headerRow < 0 || nameCol < 0) return null;

    var stats = {};
    var dataStart = Math.min(headerRow + 1, rows.length - 1);
    var dataEnd = Math.min(rows.length, headerRow + 120);

    for (var r = dataStart; r < dataEnd; r++) {
      var parts = rows[r] || [];
      for (var c = 0; c < parts.length; c++) {
        var value = parts[c];
        if (!stats[c]) stats[c] = { numeric: 0, units: 0, text: 0, sample: [] };
        var normalized = String(value || '').trim();
        if (!normalized) continue;
        if (window.extractPrice(normalized) > 0) stats[c].numeric++;
        if (unitLike(normalized)) stats[c].units++;
        if (/[A-Za-zА-Яа-яЁё]/.test(normalized) && !unitLike(normalized) && window.extractPrice(normalized) === 0) {
          stats[c].text++;
        }
        if (stats[c].sample.length < 5) stats[c].sample.push(normalized);
      }
    }

    var priceCol = -1;
    var unitCol = -1;
    var bestNumeric = -1;
    var bestUnits = -1;

    Object.keys(stats).forEach(function (key) {
      var col = parseInt(key, 10);
      if (col === nameCol) return;
      if (stats[col].numeric > bestNumeric) {
        bestNumeric = stats[col].numeric;
        priceCol = col;
      }
      if (stats[col].units > bestUnits) {
        bestUnits = stats[col].units;
        unitCol = col;
      }
    });

    if (priceCol >= 0 && unitCol < 0 && stats[priceCol + 1] && stats[priceCol + 1].units > 0) {
      unitCol = priceCol + 1;
    }
    if (priceCol >= 0 && unitCol < 0 && stats[priceCol - 1] && stats[priceCol - 1].units > 0) {
      unitCol = priceCol - 1;
    }

    if (priceCol < 0 || bestNumeric < 3) return null;

    return {
      headerRow: headerRow,
      nameCol: nameCol,
      unitCol: unitCol,
      priceCol: priceCol,
      confidence: 100 + bestNumeric + Math.max(bestUnits, 0),
      method: 'complex_price_layout'
    };
  }

  window.extractPrice = function (raw) {
    if (raw === null || raw === undefined || raw === '') return 0;
    var value = String(raw).replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
    if (!value) return 0;

    var comma = value.lastIndexOf(',');
    var dot = value.lastIndexOf('.');
    if (comma > dot) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else if (dot > comma) {
      value = value.replace(/,/g, '');
    } else {
      value = value.replace(',', '.');
    }

    var number = parseFloat(value);
    if (isNaN(number) || number <= 0) {
      return legacy.extractPrice ? legacy.extractPrice(raw) : 0;
    }
    return Math.round(number * 100) / 100;
  };

  window.cleanRows = function (rows, headerRow) {
    var base = legacy.cleanRows ? legacy.cleanRows(rows, headerRow) : rows.slice(headerRow + 1);
    return base.filter(function (row) {
      if (!row || !row.length) return false;
      var textCells = row.filter(function (cell) {
        var value = sanitizeProductName(cell);
        return value && /[A-Za-zА-Яа-яЁё]/.test(value);
      });
      var numericCells = row.filter(function (cell) {
        return window.extractPrice(cell) > 0;
      });
      return textCells.length > 0 && numericCells.length > 0;
    });
  };

  window.detectStructure = function (rows) {
    var special = detectComplexPriceLayout(rows);
    var base = legacy.detectStructure ? legacy.detectStructure(rows) : null;

    if (special && (!base || special.confidence > (base.confidence || 0))) {
      return special;
    }
    return base || special || { headerRow: -1, nameCol: -1, unitCol: -1, priceCol: -1, confidence: 0, method: 'unknown' };
  };

  window.renderPriceEditTable = function (rows, layout, supName, append, priceName, allowedUserIds) {
    if (!layout || !Array.isArray(rows)) {
      return legacy.renderPriceEditTable ? legacy.renderPriceEditTable(rows, layout, supName, append, priceName, allowedUserIds) : undefined;
    }

    window._priceEditLayout = layout;
    window._priceEditContext = {
      rows: rows,
      supName: supName,
      append: append,
      priceName: priceName,
      allowedUserIds: allowedUserIds
    };

    window._priceEditRows = [];
    window._priceEditRows = extractImportedPriceRows(rows, layout);

    if (typeof window._renderEditTable === 'function') {
      window._renderEditTable();
    } else if (legacy.renderPriceEditTable) {
      legacy.renderPriceEditTable(rows, layout, supName, append, priceName, allowedUserIds);
    }
  };

  window.processSupPriceRows = function (rows, cols, supName, append, priceName, allowedUserIds) {
    var preparedRows = extractImportedPriceRows(rows, cols).map(function (item) {
      return [item.name, item.unit, String(item.price)];
    });

    var effectiveCols = preparedRows.length
      ? { nameCol: 0, unitCol: 1, priceCol: 2, headerRow: -1, method: 'filtered_import', confidence: 100 }
      : cols;

    return legacy.processSupPriceRows(preparedRows, effectiveCols, supName, append, priceName, allowedUserIds);
  };

  document.addEventListener('DOMContentLoaded', function () {
    function tryRestore() {
      if (window.__loginInProgress || window.__sessionReady || window.__restoreInProgress) return;
      if (app.auth && app.auth.restoreSession) {
        app.auth.restoreSession().catch(function (error) {
          restoreInFlight = false;
          window.__restoreInProgress = false;
          console.error('Session restore failed:', error);
        });
      }
    }

    setTimeout(tryRestore, 0);
    setTimeout(function () {
      var currentUser = null;
      try { currentUser = CU; } catch (error) { currentUser = window.CU || null; }
      if (!currentUser) tryRestore();
    }, 1200);
  });
})(window);
