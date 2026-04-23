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
  var loggingOut = false;
  var authBound = false;
  var restoreInFlight = false;
  var OWNER_EMAILS = [
    'owner@provision.ru',
    'michaelkeepcalm@gmail.com',
    'keepcalm3300@gmail.com',
    'keepcalm3300gmail.com',
    'michaelkeepcalm3300gmail.com',
    'keepcalm3300gmail.com@MacBook-Air-Mihail.local'
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getDefaults() {
    if (typeof window._getDefaults === 'function') return window._getDefaults();
    return { users: [], restaurants: [], audit: [] };
  }

  function ensureArrays(db) {
    var base = db && typeof db === 'object' ? clone(db) : getDefaults();
    if (!Array.isArray(base.users)) base.users = [];
    if (!Array.isArray(base.restaurants)) base.restaurants = [];
    if (!Array.isArray(base.audit)) base.audit = [];
    if (!Array.isArray(base.supProds)) base.supProds = [];
    if (!Array.isArray(base.supsData)) base.supsData = [];
    if (!Array.isArray(base.products)) base.products = [];
    if (!Array.isArray(base.supplierPriceLists)) base.supplierPriceLists = [];
    if (!Array.isArray(base.supplierPriceListLegals)) base.supplierPriceListLegals = [];
    if (!Array.isArray(base.supplierPriceItems)) base.supplierPriceItems = [];
    if (!Array.isArray(base.orders)) base.orders = [];
    if (!Array.isArray(base.techCards)) base.techCards = [];
    if (!Array.isArray(base.supplierImportTemplates)) base.supplierImportTemplates = [];
    if (!Array.isArray(base.priceImportBatches)) base.priceImportBatches = [];
    if (!Array.isArray(base.priceImportItems)) base.priceImportItems = [];
    return base;
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
      normalized.supplierPriceLists.length ||
      normalized.supplierPriceListLegals.length ||
      normalized.supplierPriceItems.length ||
      normalized.priceImportBatches.length ||
      normalized.priceImportItems.length ||
      normalized.orders.length ||
      normalized.techCards.length ||
      normalized.supplierImportTemplates.length
    );
  }

  function syncRuntime(db) {
    var normalized = ensureArrays(db);
    window._dbCache = normalized;
    try { SUP_PRODS = normalized.supProds.slice(); } catch (error) {}
    try { SUPS_DATA = normalized.supsData.slice(); } catch (error) {}
    try { PRODUCTS = normalized.products.slice(); } catch (error) {}
    try { SUP_PRICE_LISTS = normalized.supplierPriceLists.slice(); } catch (error) {}
    try { SUP_PRICE_LIST_LEGALS = normalized.supplierPriceListLegals.slice(); } catch (error) {}
    try { SUP_PRICE_ITEMS = normalized.supplierPriceItems.slice(); } catch (error) {}
    try { window.priceImportBatches = normalized.priceImportBatches.slice(); } catch (error) {}
    try { window.priceImportItems = normalized.priceImportItems.slice(); } catch (error) {}
    try { window.supplierImportTemplates = normalized.supplierImportTemplates.slice(); } catch (error) {}
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
    try {
      localStorage.setItem('pv_cache', JSON.stringify(normalized));
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(normalized));
    } catch (error) {}
    return normalized;
  }

  function readLocalState() {
    try {
      var raw = localStorage.getItem(LOCAL_DB_KEY) || localStorage.getItem('pv_cache');
      return raw ? ensureArrays(JSON.parse(raw)) : null;
    } catch (error) {
      return null;
    }
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

  function isOwnerIdentity(email, profile, meta) {
    var raw = String(email || '').toLowerCase().trim();
    if (meta && meta.role === 'owner') return true;
    if (profile && profile.role === 'owner') return true;
    if (!raw) return false;
    return OWNER_EMAILS.some(function (item) {
      return raw === item || raw.indexOf(item) >= 0 || item.indexOf(raw) >= 0;
    });
  }

  function normalizeRole(role, user) {
    if (window.normalizeUserRole) return window.normalizeUserRole(role, user);
    if (isOwnerIdentity(user && user.email, null, { role: role })) return 'owner';
    var key = String(role || '').trim().toLowerCase();
    return key || 'manager';
  }

  async function loadStateFromSupabase() {
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
    if (!app.commerce || !app.commerce.load) return baseDb;
    try {
      var loaded = await app.commerce.load(baseDb);
      return loaded || baseDb;
    } catch (error) {
      console.error('Supabase business data hydrate failed:', error);
      return baseDb;
    }
  }

  function saveBusinessDataSnapshot(db) {
    if (!app.commerce || !app.commerce.save) return;
    app.commerce.save(db).catch(function (error) {
      console.error('Supabase business data save failed:', error);
    });
  }

  function upsertUserInDb(user) {
    var db = ensureArrays(window._dbCache || readLocalState() || getDefaults());
    if (isOwnerIdentity(user && user.email, null, { role: user && user.role })) {
      user = Object.assign({}, user, { role: 'owner', status: 'active' });
    }
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
    var ownerIdentity = isOwnerIdentity(authUser.email, profile, meta) || (existing && existing.role === 'owner') || (profile && profile.role === 'owner');
    var role = ownerIdentity ? 'owner' : normalizeRole((existing && existing.role) || (profile && profile.role) || meta.role || meta.app_role || 'manager', { email: authUser.email, role: existing && existing.role });
    var status = ownerIdentity ? 'active' : ((existing && existing.status) || (profile && profile.status) || 'active');

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
    return ensureArrays(window._dbCache || readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
  };

  window.dbSet = function (db) {
    var currentState = ensureArrays(window._dbCache || readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
    var normalized = syncRuntime(db);
    normalized.users = (normalized.users || []).map(function (u) {
      if (!u || !u.email) return u;
      return isOwnerIdentity(u.email, null, { role: u.role })
        ? Object.assign({}, u, { role: 'owner', status: 'active' })
        : u;
    });
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

    setTimeout(function () {
      if (!finished) {
        console.error('dbLoad timeout: fallback to local state');
        try {
          syncRuntime(readLocalState() || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults());
        } catch (error) {
          console.error('dbLoad timeout fallback failed:', error);
        }
        finish();
      }
    }, 4500);

    (async function () {
      try {
        var loaded = null;

        try {
          loaded = await loadStateFromSupabase();
        } catch (error) {
          console.error('loadStateFromSupabase failed during dbLoad:', error);
          loaded = null;
        }

        if (loaded) {
          var mergedLoaded = await loadBusinessDataFromSupabase(loaded);
          syncRuntime(mergedLoaded);
          finish();
          return;
        }

        if (legacy.dbLoad) {
          legacy.dbLoad(async function () {
            try {
              var fallbackState = window._dbCache || (legacy.dbGet ? legacy.dbGet() : null) || getDefaults();
              var mergedFallback = await loadBusinessDataFromSupabase(fallbackState);
              var normalizedFallback = syncRuntime(mergedFallback);
              normalizedFallback.users = (normalizedFallback.users || []).map(function (u) {
                if (!u || !u.email) return u;
                return isOwnerIdentity(u.email, null, { role: u.role })
                  ? Object.assign({}, u, { role: 'owner', status: 'active' })
                  : u;
              });
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

        var mergedLocalState = await loadBusinessDataFromSupabase(readLocalState() || getDefaults());
        var localState = syncRuntime(mergedLocalState);
        localState.users = (localState.users || []).map(function (u) {
          if (!u || !u.email) return u;
          return isOwnerIdentity(u.email, null, { role: u.role })
            ? Object.assign({}, u, { role: 'owner', status: 'active' })
            : u;
        });
        if (hasMeaningfulState(localState)) {
          saveBusinessDataSnapshot(localState);
          saveStateToSupabase(localState).catch(function () {});
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

    if (errEl) errEl.textContent = '';
    if (!email || !password) {
      if (errEl) errEl.textContent = 'Заполните email и пароль';
      return;
    }
    if (!app.supabase || !app.supabase.isEnabled || !app.supabase.isEnabled()) {
      if (legacy.doLogin) return legacy.doLogin();
      if (errEl) errEl.textContent = 'Supabase не настроен';
      return;
    }

    if (button) {
      button.textContent = 'Входим...';
      button.disabled = true;
    }

    try {
      bindAuthListener();
      var client = app.supabase.getClient();
      var response = await client.auth.signInWithPassword({ email: email, password: password });
      if (response.error) {
        throw response.error;
      }

      await hydrateStateFromSupabase();
      var user = await resolveAppUser(response.data.user || (response.data.session && response.data.session.user));
      user.role = normalizeRole(user.role, user);
      if (isOwnerIdentity(user.email, null, { role: user.role })) {
        user.role = 'owner';
        user.status = 'active';
      }
      if (user.status === 'blocked') {
        await client.auth.signOut();
        if (errEl) errEl.textContent = 'Аккаунт заблокирован';
        return;
      }
      if (user.status === 'pending') {
        await client.auth.signOut();
        if (errEl) errEl.textContent = 'Заявка ещё не одобрена владельцем или администратором';
        return;
      }
      if (user.status === 'rejected') {
        await client.auth.signOut();
        if (errEl) errEl.textContent = 'Заявка отклонена. Обратитесь к владельцу платформы';
        return;
      }
      if (typeof window.enterApp === 'function') window.enterApp(user);
    } catch (error) {
      if (errEl) errEl.textContent = error && error.message ? error.message : 'Ошибка входа';
    } finally {
      if (button) {
        button.textContent = 'Войти в систему →';
        button.disabled = false;
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

      if (response.error) throw response.error;

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
    clearLastUser();
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
          role: isOwnerIdentity(currentEmail, null, { role: db.users[idx].role || (currentUser && currentUser.role) })
            ? 'owner'
            : (db.users[idx].role || (currentUser && currentUser.role) || 'manager'),
          status: isOwnerIdentity(currentEmail, null, { role: db.users[idx].role || (currentUser && currentUser.role) })
            ? 'active'
            : (db.users[idx].status || (currentUser && currentUser.status) || 'active')
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
    restoreSession: async function () {
      var client = app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
      if (!client) return false;

      restoreInFlight = true;
      bindAuthListener();
      var response = await client.auth.getSession();
      if (response.error || !response.data || !response.data.session || !response.data.session.user) {
        restoreInFlight = false;
        return false;
      }

      await hydrateStateFromSupabase();
      var user = await resolveAppUser(response.data.session.user);
      user.role = normalizeRole(user.role, user);
      if (isOwnerIdentity(user.email, null, { role: user.role })) {
        user.role = 'owner';
        user.status = 'active';
      }
      var currentUser = null;
      try { currentUser = CU; } catch (error) { currentUser = window.CU || null; }
      if (typeof window.enterApp === 'function' && (!currentUser || currentUser.id !== user.id)) {
        window.enterApp(user);
      }
      restoreInFlight = false;
      return true;
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
      if (app.auth && app.auth.restoreSession) {
        app.auth.restoreSession().catch(function (error) {
          restoreInFlight = false;
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
