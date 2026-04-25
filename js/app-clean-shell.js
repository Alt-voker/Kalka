(function (window, document) {
  'use strict';
  console.info('clean shell loaded');

  var app = window.KalkaApp = window.KalkaApp || {};
  var state = {
    session: null,
    currentTab: 'dashboard',
    loginInProgress: false,
    bootInProgress: false,
    error: '',
    users: { status: 'idle', rows: [], error: '' },
    suppliers: { status: 'idle', rows: [], error: '', orgId: '' }
  };
  var cache = window.__cleanShellCache = window.__cleanShellCache || {
    suppliersByOrg: {},
    suppliersPromises: {},
    suppliersErrors: {}
  };

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function withTimeout(promise, ms, label) {
    var timeout = Number(ms || 10000);
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          var err = new Error(label || 'Timeout');
          err.code = 'TIMEOUT';
          reject(err);
        }, timeout);
      })
    ]);
  }

  function normalizeRpcRow(data) {
    return Array.isArray(data) ? (data[0] || null) : (data || null);
  }

  function getClient() {
    return app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
  }

  function getConfig() {
    return app.config && app.config.getSupabaseConfig ? app.config.getSupabaseConfig() : { enabled: false, url: '', anonKey: '', source: 'unknown' };
  }

  function diagnostics() {
    var config = getConfig();
    var host = '';
    try { host = config.url ? new URL(config.url).host : ''; } catch (e) {}
    return {
      hasUrl: !!config.url,
      hasAnonKey: !!config.anonKey,
      source: config.source || 'unknown',
      host: host
    };
  }

  function clearRuntime() {
    state.session = null;
    state.currentTab = 'dashboard';
    state.error = '';
    state.users = { status: 'idle', rows: [], error: '' };
    state.suppliers = { status: 'idle', rows: [], error: '', orgId: '' };
    window.__userSession = null;
    window.__sessionReady = false;
    window.__loginInProgress = false;
    window.__restoreInProgress = false;
    window.CU = null;
    window.activeRest = null;
    if (window.__dataCache) {
      window.__dataCache.suppliersByOrg = {};
      window.__dataCache.suppliersPromisesByOrg = {};
      window.__dataCache.suppliersErrorsByOrg = {};
      window.__dataCache.ownerUsers = null;
    }
    cache.suppliersByOrg = {};
    cache.suppliersPromises = {};
    cache.suppliersErrors = {};
  }

  function ensureBaseShell() {
    document.body.innerHTML = [
      '<style>',
      ':root{--bg:#0d1117;--bg2:#111826;--bg3:#172033;--tx:#e7edf7;--t2:#b6c2d6;--t3:#7f8aa3;--ac:#7dd3fc;--gr:#4ade80;--rd:#f87171;--br:#26324a;--r:14px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      'body{margin:0;background:linear-gradient(180deg,#08111f,#0b1220 40%,#0b1324 100%);color:var(--tx);min-height:100vh;}',
      '.cs-wrap{max-width:1200px;margin:0 auto;padding:24px;}',
      '.cs-card{background:rgba(17,24,38,.9);border:1px solid var(--br);border-radius:18px;box-shadow:0 20px 70px rgba(0,0,0,.22);}',
      '.cs-auth{max-width:440px;margin:8vh auto 0;padding:28px;}',
      '.cs-title{font-size:28px;font-weight:800;margin:0 0 8px;}',
      '.cs-sub{color:var(--t2);font-size:14px;line-height:1.5;margin:0 0 18px;}',
      '.cs-input,.cs-select{width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:12px 14px;color:var(--tx);font-size:14px;outline:none;}',
      '.cs-btn{border:none;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#38bdf8,#22c55e);color:#04111f;}',
      '.cs-btn.secondary{background:var(--bg3);border:1px solid var(--br);color:var(--tx);}',
      '.cs-row{display:flex;gap:12px;flex-wrap:wrap;}',
      '.cs-nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;}',
      '.cs-tab{background:var(--bg3);border:1px solid var(--br);color:var(--t2);padding:10px 14px;border-radius:999px;cursor:pointer;}',
      '.cs-tab.active{background:rgba(125,211,252,.12);border-color:rgba(125,211,252,.35);color:var(--ac);}',
      '.cs-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px;}',
      '.cs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}',
      '.cs-item{background:var(--bg2);border:1px solid var(--br);border-radius:16px;padding:14px;}',
      '.cs-k{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;}', 
      '.cs-v{font-size:14px;margin-top:6px;word-break:break-word;}',
      '.cs-msg{margin:14px 0;padding:12px 14px;border-radius:12px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);color:#fecaca;}',
      '.cs-ok{margin:14px 0;padding:12px 14px;border-radius:12px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);color:#bbf7d0;}',
      '.cs-muted{color:var(--t3);}',
      '.cs-section{margin-top:18px;}',
      '.cs-list{display:grid;gap:10px;}',
      '.cs-table{width:100%;border-collapse:collapse;}',
      '.cs-table th,.cs-table td{padding:10px 8px;border-bottom:1px solid var(--br);text-align:left;font-size:13px;vertical-align:top;}',
      '.cs-footer{margin-top:18px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--br);color:var(--t3);font-size:12px;line-height:1.6;}',
      '.cs-debug{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:12px;}',
      '.cs-debug div{padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid var(--br);border-radius:12px;font-size:12px;}',
      '.cs-small{font-size:12px;color:var(--t3);}',
      '</style>',
      '<div id="cs-root"></div>'
    ].join('');
  }

  function renderLogin() {
    ensureBaseShell();
    var root = qs('#cs-root');
    var cfg = diagnostics();
    root.innerHTML = [
      '<div class="cs-card cs-auth">',
      '<div class="cs-title">КальКа</div>',
      '<p class="cs-sub">Production shell без legacy bootstrap. Вход только через Supabase Auth и RPC session.</p>',
      cfg.hasUrl && cfg.hasAnonKey ? '<div class="cs-ok">Сервис авторизации готов: ' + escapeHtml(cfg.host) + '</div>' : '<div class="cs-msg">Сервис авторизации временно недоступен. Обратитесь к администратору.</div>',
      '<form id="csLoginForm" class="cs-list" style="margin-top:14px;">',
      '<input class="cs-input" id="csEmail" type="email" placeholder="Email" autocomplete="email">',
      '<input class="cs-input" id="csPassword" type="password" placeholder="Пароль" autocomplete="current-password">',
      '<div id="csLoginError" class="cs-small" style="min-height:18px;color:var(--rd);"></div>',
      '<button class="cs-btn" id="csLoginBtn" type="submit">Войти в систему →</button>',
      '</form>',
      '</div>'
    ].join('');
    var form = qs('#csLoginForm');
    var btn = qs('#csLoginBtn');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        console.info('login form mounted');
        startLogin();
      });
    }
    if (btn) {
      btn.addEventListener('click', function () {
        console.info('login button clicked');
      });
    }
  }

  function renderShell() {
    ensureBaseShell();
    var session = state.session;
    var root = qs('#cs-root');
    var isOwner = session && (session.role === 'owner' || session.role === 'platform_owner');
    var tabs = [
      '<button class="cs-tab active" data-tab="dashboard">Дашборд</button>',
      '<button class="cs-tab" data-tab="organizations">Организации</button>',
      '<button class="cs-tab" data-tab="suppliers">Поставщики</button>'
    ];
    if (isOwner) tabs.push('<button class="cs-tab" data-tab="users">Пользователи</button>');
    root.innerHTML = [
      '<div class="cs-wrap">',
      '<div class="cs-card" style="padding:18px 18px 14px;">',
      '<div class="cs-head">',
      '<div>',
      '<h1 class="cs-title" style="font-size:24px;margin-bottom:4px;">' + escapeHtml((session.currentUser && (session.currentUser.first || session.currentUser.last)) ? [session.currentUser.first, session.currentUser.last].filter(Boolean).join(' ') : session.currentUser.email || 'Пользователь') + '</h1>',
      '<div class="cs-sub" style="margin-bottom:0;">Роль: <b>' + escapeHtml(session.role || 'unassigned') + '</b> · Активная организация: <b>' + escapeHtml(session.activeOrganization ? session.activeOrganization.name : 'нет') + '</b></div>',
      '</div>',
      '<div class="cs-row">',
      '<button class="cs-btn secondary" id="csLogoutBtn">Выйти</button>',
      '</div>',
      '</div>',
      '<div class="cs-nav" id="csTabs">' + tabs.join('') + '</div>',
      '<div id="csMessage"></div>',
      '<div id="csContent"></div>',
      '<div class="cs-debug">',
      '<div>commit: ' + escapeHtml(window.__APP_COMMIT__ || '') + '</div>',
      '<div>clean shell: enabled</div>',
      '<div>session role: ' + escapeHtml(session.role || '') + '</div>',
      '<div>activeOrganizationId: ' + escapeHtml(session.activeOrganizationId || '') + '</div>',
      '<div>noOrganization: ' + escapeHtml(String(!!session.noOrganization)) + '</div>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');
    qs('#csLogoutBtn').addEventListener('click', logout);
    qsa('#csTabs .cs-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.currentTab = btn.getAttribute('data-tab');
        renderTab();
      });
    });
    renderTab();
  }

  function showMessage(text, tone) {
    var el = qs('#csMessage');
    if (!el) return;
    if (!text) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = '<div class="' + (tone === 'ok' ? 'cs-ok' : 'cs-msg') + '">' + escapeHtml(text) + '</div>';
  }

  function renderTab() {
    qsa('#csTabs .cs-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === state.currentTab);
    });
    var content = qs('#csContent');
    var session = state.session || {};
    if (!content) return;
    if (state.currentTab === 'dashboard') {
      content.innerHTML = session.noOrganization
        ? '<div class="cs-card" style="padding:16px;"><div class="cs-msg">Вы вошли в систему, но пока не добавлены ни в одну организацию.</div><div class="cs-small">Обратитесь к владельцу платформы или ожидайте приглашения.</div></div>'
        : '<div class="cs-grid">' +
          '<div class="cs-item"><div class="cs-k">Пользователь</div><div class="cs-v">' + escapeHtml((session.currentUser.first || '') + ' ' + (session.currentUser.last || '')).trim() + '</div></div>' +
          '<div class="cs-item"><div class="cs-k">Роль</div><div class="cs-v">' + escapeHtml(session.role || '') + '</div></div>' +
          '<div class="cs-item"><div class="cs-k">Активная организация</div><div class="cs-v">' + escapeHtml(session.activeOrganization ? session.activeOrganization.name : '') + '</div></div>' +
        '</div>';
      return;
    }
    if (state.currentTab === 'organizations') {
      var orgs = session.organizations || [];
      if (!orgs.length) {
        content.innerHTML = '<div class="cs-card" style="padding:16px;"><div class="cs-msg">У вас пока нет доступных организаций.</div></div>';
        return;
      }
      content.innerHTML = '<div class="cs-list">' + orgs.map(function (org) {
        var active = String(session.activeOrganizationId || '') === String(org.id || '');
        return '<div class="cs-item">' +
          '<div class="cs-row" style="justify-content:space-between;align-items:center;">' +
          '<div><div class="cs-k">Организация</div><div class="cs-v"><b>' + escapeHtml(org.name || '') + '</b></div></div>' +
          '<button class="cs-btn secondary" data-org="' + escapeHtml(org.id || '') + '">' + (active ? 'Текущая организация' : 'Сделать активной') + '</button>' +
          '</div>' +
          '<div class="cs-small">Статус: ' + escapeHtml(org.status || '') + '</div>' +
          '</div>';
      }).join('') + '</div>';
      qsa('#csContent [data-org]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setActiveOrganization(btn.getAttribute('data-org'));
        });
      });
      return;
    }
    if (state.currentTab === 'suppliers') {
      renderSuppliers();
      return;
    }
    if (state.currentTab === 'users' && (session.role === 'owner' || session.role === 'platform_owner')) {
      renderOwnerUsers(false).catch(function () {});
      return;
    }
    content.innerHTML = '<div class="cs-card" style="padding:16px;"><div class="cs-msg">Доступ к разделу ограничен.</div></div>';
  }

  function renderSuppliers() {
    var content = qs('#csContent');
    var session = state.session || {};
    var orgId = session.activeOrganizationId;
    if (!orgId) {
      content.innerHTML = '<div class="cs-card" style="padding:16px;"><div class="cs-msg">Организация не выбрана.</div></div>';
      return;
    }
    if (cache.suppliersByOrg[orgId]) {
      content.innerHTML = suppliersMarkup(cache.suppliersByOrg[orgId], null, orgId, true);
      return;
    }
    if (cache.suppliersPromises[orgId]) {
      content.innerHTML = suppliersMarkup([], null, orgId, false, true);
      return;
    }
    content.innerHTML = suppliersMarkup([], null, orgId, false, true);
    loadSuppliersForOrg(orgId).then(function (rows) {
      if ((state.session && state.session.activeOrganizationId) !== orgId) return;
      content.innerHTML = suppliersMarkup(rows, null, orgId, true);
    }).catch(function (error) {
      if ((state.session && state.session.activeOrganizationId) !== orgId) return;
      content.innerHTML = suppliersMarkup([], error, orgId, false, false);
    });
  }

  function suppliersMarkup(rows, error, orgId, loaded, loading) {
    if (error) {
      return [
        '<div class="cs-card" style="padding:16px;">',
        '<div class="cs-msg">Не удалось загрузить поставщиков. Повторить</div>',
        '<div class="cs-small">Организация: ' + escapeHtml(orgId) + '</div>',
        '<div class="cs-small" style="margin-top:8px;">' + escapeHtml(error.message || error.code || 'Ошибка загрузки') + '</div>',
        '<button class="cs-btn secondary" id="csRetrySuppliers" style="margin-top:12px;">Повторить</button>',
        '</div>'
      ].join('');
    }
    if (loading) {
      return '<div class="cs-card" style="padding:16px;"><div class="cs-small">Загрузка поставщиков...</div></div>';
    }
    if (!rows || !rows.length) {
      return '<div class="cs-card" style="padding:16px;"><div class="cs-msg">Нет поставщиков</div></div>';
    }
    return [
      '<div class="cs-card" style="padding:16px;">',
      '<div class="cs-row" style="justify-content:space-between;align-items:center;margin-bottom:12px;">',
      '<div><div class="cs-k">Поставщики</div><div class="cs-small">Организация ' + escapeHtml(orgId) + '</div></div>',
      '<button class="cs-btn secondary" id="csRetrySuppliers">Повторить</button>',
      '</div>',
      '<div class="cs-list">',
      rows.map(function (row) {
        return '<div class="cs-item">' +
          '<div class="cs-v"><b>' + escapeHtml(row.name || '') + '</b></div>' +
          '<div class="cs-small">Телефон: ' + escapeHtml(row.phone || '') + '</div>' +
          '<div class="cs-small">Контакт: ' + escapeHtml(row.contact || '') + '</div>' +
          '<div class="cs-small">Статус: ' + escapeHtml(row.status || '') + '</div>' +
          '</div>';
      }).join(''),
      '</div>',
      '</div>'
    ].join('');
  }

  async function loadSuppliersForOrg(orgId) {
    if (!orgId) return [];
    if (cache.suppliersByOrg[orgId]) return cache.suppliersByOrg[orgId];
    if (cache.suppliersPromises[orgId]) return cache.suppliersPromises[orgId];
    var client = getClient();
    if (!client) throw new Error('Сервис авторизации временно недоступен. Обратитесь к администратору');
    console.info('suppliers_load_start', orgId);
    var promise = withTimeout(
      client.from('suppliers')
        .select('id, organization_id, name, phone, contact, status, created_at')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(100),
      8000,
      'Не удалось загрузить поставщиков. Повторить'
    ).then(function (response) {
      if (response && response.error) {
        console.error('suppliers_load_failed', { request: 'suppliers', organizationId: orgId, code: response.error.code, message: response.error.message, details: response.error.details, hint: response.error.hint, raw: response.error });
        cache.suppliersErrors[orgId] = response.error;
        throw response.error;
      }
      var rows = response && Array.isArray(response.data) ? response.data.slice() : [];
      cache.suppliersByOrg[orgId] = rows;
      cache.suppliersErrors[orgId] = null;
      console.info('suppliers_load_success', orgId, rows.length);
      return rows;
    }).catch(function (error) {
      cache.suppliersErrors[orgId] = error;
      console.error('suppliers_load_failed', { request: 'suppliers', organizationId: orgId, code: error && error.code ? error.code : '', message: error && error.message ? error.message : '', details: error && error.details ? error.details : '', hint: error && error.hint ? error.hint : '', raw: error });
      throw error;
    }).finally(function () {
      delete cache.suppliersPromises[orgId];
    });
    cache.suppliersPromises[orgId] = promise;
    return promise;
  }

  async function renderOwnerUsers(force) {
    var content = qs('#csContent');
    if (!force && state.users.status === 'success') {
      content.innerHTML = usersMarkup(state.users.rows);
      return;
    }
    content.innerHTML = '<div class="cs-card" style="padding:16px;"><div class="cs-small">Загрузка пользователей...</div></div>';
    try {
      var client = getClient();
      var response = await withTimeout(client.rpc('owner_list_users'), 8000, 'Не удалось загрузить пользователей. Повторить');
      if (response && response.error) throw response.error;
      var rows = response && Array.isArray(response.data) ? response.data.slice() : [];
      state.users = { status: 'success', rows: rows, error: '' };
      content.innerHTML = usersMarkup(rows);
    } catch (error) {
      state.users = { status: 'error', rows: [], error: error };
      console.error('owner_list_users failed', { request: 'owner_list_users', code: error && error.code ? error.code : '', message: error && error.message ? error.message : '', details: error && error.details ? error.details : '', hint: error && error.hint ? error.hint : '', raw: error });
      content.innerHTML = [
        '<div class="cs-card" style="padding:16px;">',
        '<div class="cs-msg">Не удалось загрузить пользователей. Повторить</div>',
        '<button class="cs-btn secondary" id="csRetryUsers" style="margin-top:12px;">Повторить</button>',
        '</div>'
      ].join('');
      var btn = qs('#csRetryUsers');
      if (btn) btn.addEventListener('click', function () { renderOwnerUsers(true); });
      return;
    }
  }

  function usersMarkup(rows) {
    if (!rows || !rows.length) {
      return '<div class="cs-card" style="padding:16px;"><div class="cs-msg">Пользователи не найдены</div></div>';
    }
    return [
      '<div class="cs-card" style="padding:16px;">',
      '<table class="cs-table">',
      '<thead><tr><th>Email</th><th>Имя</th><th>Статус</th><th>Роль / организации</th><th></th></tr></thead>',
      '<tbody>',
      rows.map(function (row) {
        var memberships = Array.isArray(row.memberships) ? row.memberships : [];
        var orgs = Array.isArray(row.organizations) ? row.organizations : [];
        return '<tr>' +
          '<td>' + escapeHtml(row.email || '') + '</td>' +
          '<td>' + escapeHtml([row.first_name, row.last_name].filter(Boolean).join(' ')) + '</td>' +
          '<td>' + escapeHtml(row.status || '') + '</td>' +
          '<td>' + escapeHtml((orgs.length ? orgs.map(function (o) { return o.name + ' · ' + (memberships.find(function (m) { return String(m.organization_id || '') === String(o.id || ''); }) || {}).role || row.role || ''; }).join('; ') : row.no_organization ? 'без организации' : (row.role || ''))) + '</td>' +
          '<td><button class="cs-btn secondary" data-assign-user="' + escapeHtml(row.profile_id || row.profileId || '') + '">Назначить</button></td>' +
          '</tr>';
      }).join(''),
      '</tbody></table>',
      '</div>'
    ].join('');
  }

  function renderDashboard() {
    renderShell();
  }

  async function setActiveOrganization(orgId) {
    if (!state.session || !orgId) return;
    var org = (state.session.organizations || []).find(function (o) { return String(o.id || '') === String(orgId || ''); }) || null;
    if (!org) return;
    state.session.activeOrganizationId = org.id;
    state.session.activeOrganization = org;
    state.session.currentUser.organizationId = org.id;
    state.session.currentUser.activeOrganizationId = org.id;
    state.session.currentUser.activeOrganizationName = org.name || '';
    state.currentTab = 'dashboard';
    renderShell();
    await loadSuppliersForOrg(org.id).catch(function () {});
    if (state.currentTab === 'suppliers') renderTab();
  }

  async function refreshSession() {
    var client = getClient();
    var session = client && client.auth && client.auth.getSession ? await client.auth.getSession() : null;
    var authUser = session && session.data && session.data.session && session.data.session.user ? session.data.session.user : null;
    if (!authUser) return null;
    var rpc = await withTimeout(client.rpc('get_my_session'), 8000, 'Не удалось загрузить профиль пользователя');
    if (rpc && rpc.error) throw rpc.error;
    var row = normalizeRpcRow(rpc && rpc.data);
    if (!row) throw new Error('Не удалось загрузить профиль пользователя');
    var memberships = Array.isArray(row.memberships) ? row.memberships.slice() : [];
    var organizations = Array.isArray(row.organizations) ? row.organizations.slice() : [];
    var noOrganization = row.noOrganization ?? row.no_organization ?? false;
    var membershipsCount = row.membershipsCount ?? row.memberships_count ?? memberships.length;
    if (membershipsCount > 0) noOrganization = false;
    var activeOrganizationId = row.activeOrganizationId ?? row.active_organization_id ?? null;
    var activeOrganizationName = row.activeOrganizationName ?? row.active_organization_name ?? null;
    var activeOrganization = activeOrganizationId ? organizations.find(function (org) { return String(org.id || '') === String(activeOrganizationId || ''); }) || null : null;
    if (!activeOrganization && activeOrganizationId && activeOrganizationName) {
      activeOrganization = { id: activeOrganizationId, name: activeOrganizationName, type: 'organization', status: 'active' };
    }
    var role = row.role || 'unassigned';
    state.session = {
      currentUser: {
        id: row.profileId || row.profile_id || '',
        email: row.email || authUser.email || '',
        first: row.first_name || '',
        last: row.last_name || '',
        role: noOrganization ? 'unassigned' : role,
        status: row.status || 'active',
        noOrganization: !!noOrganization,
        profileId: row.profileId || row.profile_id || '',
        authUserId: authUser.id,
        activeOrganizationId: noOrganization ? null : activeOrganizationId,
        activeOrganizationName: noOrganization ? '' : activeOrganizationName || (activeOrganization && activeOrganization.name) || '',
        organizationId: noOrganization ? null : activeOrganizationId
      },
      profileId: row.profileId || row.profile_id || '',
      memberships: memberships,
      organizations: organizations,
      activeOrganizationId: noOrganization ? null : activeOrganizationId,
      activeOrganization: noOrganization ? null : activeOrganization,
      role: noOrganization ? 'unassigned' : role,
      noOrganization: !!noOrganization,
      suppliers: [],
      legalEntities: [],
      createdAt: Date.now()
    };
    window.__userSession = state.session;
    window.CU = state.session.currentUser;
    window.activeRest = state.session.activeOrganization ? { id: state.session.activeOrganization.id, name: state.session.activeOrganization.name || '', emoji: '🏢' } : null;
    window.__sessionReady = true;
    return state.session;
  }

  async function startLogin() {
    if (state.loginInProgress || window.__sessionReady) return;
    state.loginInProgress = true;
    var email = (qs('#csEmail') && qs('#csEmail').value || '').trim();
    var password = (qs('#csPassword') && qs('#csPassword').value || '').trim();
    var btn = qs('#csLoginBtn');
    var err = qs('#csLoginError');
    if (btn) { btn.disabled = true; btn.textContent = 'Входим...'; }
    if (err) err.textContent = '';
    try {
      console.info('login form mounted');
      var client = getClient();
      if (!client) {
        throw new Error('Сервис авторизации временно недоступен. Обратитесь к администратору');
      }
      console.info('auth: signIn started');
      var signIn = await withTimeout(client.auth.signInWithPassword({ email: email, password: password }), 10000, 'Не удалось подключиться к серверу авторизации');
      if (signIn && signIn.error) throw signIn.error;
      console.info('auth: signIn success');
      var session = await refreshSession();
      if (!session) throw new Error('Не удалось загрузить профиль пользователя');
      showApp(session);
    } catch (error) {
      var message = authErrorMessage(error);
      if (err) err.textContent = message;
      console.error('signIn failed', { message: message, raw: error, diagnostics: diagnostics() });
      showLoginError(message);
    } finally {
      state.loginInProgress = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Войти в систему →'; }
    }
  }

  function authErrorMessage(error) {
    var msg = (error && error.message) ? String(error.message) : '';
    if (/failed to fetch|networkerror|err_connection_reset/i.test(msg)) return 'Не удалось подключиться к серверу авторизации. Проверьте интернет или попробуйте позже';
    if (/profile/i.test(msg)) return 'Не удалось загрузить профиль пользователя';
    if (/organization/i.test(msg) && /load|загруз/i.test(msg)) return 'Не удалось загрузить организации пользователя';
    if (/auth|server/i.test(msg)) return 'Не удалось подключиться к серверу авторизации. Проверьте интернет или попробуйте позже';
    return msg || 'Не удалось подключиться к серверу авторизации';
  }

  function showLoginError(message) {
    ensureBaseShell();
    var err = qs('#csLoginError');
    if (err) err.textContent = message || '';
    renderLogin();
    var err2 = qs('#csLoginError');
    if (err2) err2.textContent = message || '';
  }

  function showApp(session) {
    state.session = session;
    state.currentTab = 'dashboard';
    renderShell();
    showMessage(session.noOrganization ? 'Вы вошли, но пока не добавлены ни в одну организацию' : '', session.noOrganization ? 'err' : 'ok');
    if (!session.noOrganization) {
      loadSuppliersForOrg(session.activeOrganizationId).catch(function () {});
    }
    if (session.role === 'owner' || session.role === 'platform_owner') {
      renderOwnerUsers(false).catch(function () {});
    }
  }

  async function loadOwnerList() {
    var client = getClient();
    var response = await withTimeout(client.rpc('owner_list_users'), 8000, 'Не удалось загрузить пользователей. Повторить');
    if (response && response.error) throw response.error;
    return response && Array.isArray(response.data) ? response.data.slice() : [];
  }

  async function assignUserModal(user) {
    var session = state.session || {};
    var orgs = session.organizations || [];
    var html = [
      '<div class="cs-card" style="padding:16px;margin-top:16px;">',
      '<div class="cs-title" style="font-size:18px;">Назначить организацию и роль</div>',
      '<div class="cs-small" style="margin-bottom:12px;">' + escapeHtml(user.email || '') + '</div>',
      '<input type="hidden" id="au_profile_id" value="' + escapeHtml(user.profile_id || user.profileId || '') + '">',
      '<input type="hidden" id="au_auth_user_id" value="' + escapeHtml(user.auth_user_id || user.authUserId || '') + '">',
      '<input type="hidden" id="au_email" value="' + escapeHtml(user.email || '') + '">',
      '<label class="cs-small">Организация</label>',
      '<select id="au_org" class="cs-select">' + orgs.map(function (o) { return '<option value="' + escapeHtml(o.id) + '">' + escapeHtml(o.name) + '</option>'; }).join('') + '</select>',
      '<label class="cs-small" style="margin-top:10px;display:block;">Роль</label>',
      '<select id="au_role" class="cs-select">',
      ['organization_owner','manager','buyer','chef','bar_manager','accountant','warehouse'].map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join(''),
      '</select>',
      '<div id="au_err" class="cs-small" style="min-height:18px;color:var(--rd);margin-top:10px;"></div>',
      '<div class="cs-row" style="margin-top:12px;">',
      '<button class="cs-btn secondary" id="au_cancel">Отмена</button>',
      '<button class="cs-btn" id="au_save">Сохранить</button>',
      '</div>',
      '</div>'
    ].join('');
    var content = qs('#csContent');
    content.innerHTML = html;
    qs('#au_cancel').addEventListener('click', function () { renderOwnerUsers(true); });
    qs('#au_save').addEventListener('click', async function () {
      var profileId = qs('#au_profile_id').value || '';
      var authUserId = qs('#au_auth_user_id').value || '';
      var email = qs('#au_email').value || '';
      var orgId = qs('#au_org').value || '';
      var role = qs('#au_role').value || '';
      var err = qs('#au_err');
      if (!orgId || !role) {
        if (err) err.textContent = 'Выберите организацию и роль';
        return;
      }
      try {
        var client = getClient();
        var response = await withTimeout(client.rpc('owner_assign_user_to_organization', {
          target_user_profile_id: profileId || null,
          target_auth_user_id: authUserId || null,
          target_email: email || null,
          target_organization_id: orgId,
          target_role: role
        }), 8000, 'Не удалось добавить пользователя в организацию');
        if (response && response.error) throw response.error;
        var row = normalizeRpcRow(response && response.data);
        if (!row || !row.membership_id) throw new Error('Не удалось добавить пользователя в организацию');
        if (err) err.textContent = '';
        renderOwnerUsers(true);
        showMessage('Пользователь добавлен в организацию', 'ok');
      } catch (error) {
        console.error('owner_assign_user_to_organization failed', { code: error && error.code ? error.code : '', message: error && error.message ? error.message : '', details: error && error.details ? error.details : '', hint: error && error.hint ? error.hint : '', raw: error });
        if (err) err.textContent = 'Не удалось добавить пользователя в организацию';
      }
    });
  }

  async function init() {
    clearRuntime();
    if (!window.__CLEAN_SHELL_MODE) return;
    ensureBaseShell();
    showLoginError('');
    var client = getClient();
    if (!client) {
      renderLogin();
      return;
    }
    try {
      var auth = await client.auth.getSession();
      var authUser = auth && auth.data && auth.data.session && auth.data.session.user ? auth.data.session.user : null;
      if (!authUser) {
        renderLogin();
        return;
      }
      state.bootInProgress = true;
      var session = await refreshSession();
      if (session) {
        showApp(session);
      } else {
        renderLogin();
      }
    } catch (error) {
      console.error('clean shell init failed', error);
      renderLogin();
    } finally {
      state.bootInProgress = false;
    }
  }

  async function logout() {
    var client = getClient();
    try {
      clearRuntime();
      if (client && client.auth && client.auth.signOut) {
        await client.auth.signOut();
      }
    } catch (error) {
      console.error('logout failed', error);
    } finally {
      clearRuntime();
      renderLogin();
    }
  }

  function wireGlobalApi() {
    window.app = window.app || {};
    window.app.cleanShell = {
      init: init,
      logout: logout,
      refreshSession: refreshSession,
      loadOwnerList: loadOwnerList,
      loadSuppliersForOrg: loadSuppliersForOrg
    };
  }

  document.addEventListener('click', function (ev) {
    var assignBtn = ev.target && ev.target.closest ? ev.target.closest('[data-assign-user]') : null;
    if (assignBtn && state.session && (state.session.role === 'owner' || state.session.role === 'platform_owner')) {
      var profileId = assignBtn.getAttribute('data-assign-user');
      var user = (state.users.rows || []).find(function (row) { return String(row.profile_id || row.profileId || '') === String(profileId || ''); }) || null;
      if (user) assignUserModal(user);
    }
    if (ev.target && ev.target.id === 'csRetrySuppliers') {
      var orgId = state.session && state.session.activeOrganizationId;
      if (!orgId) return;
      cache.suppliersByOrg[orgId] = null;
      renderSuppliers();
    }
  });

  function boot() {
    wireGlobalApi();
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
