(function (window) {
  'use strict';

  var app = window.KalkaApp = window.KalkaApp || {};
  var STATE = {
    UNAUTHENTICATED: 'unauthenticated',
    SIGNING_IN: 'signing_in',
    LOADING_PROFILE: 'loading_profile',
    LOADING_MEMBERSHIPS: 'loading_memberships',
    LOADING_ORGANIZATIONS: 'loading_organizations',
    AUTHENTICATED: 'authenticated',
    NO_ORGANIZATION: 'no_organization',
    AUTH_ERROR: 'auth_error'
  };

  var bootstrapPromises = {};
  var perfMarks = window.__perfMarks = window.__perfMarks || {};
  var currentState = window.__authState || STATE.UNAUTHENTICATED;
  var LAST_GOOD_COMMIT = '0871063';
  var EXPECTED_PRODUCTION_URL = 'https://kalka-hub.vercel.app/?v=0871063';

  function markPerf(name) {
    try {
      if (window.performance && window.performance.mark) window.performance.mark(name);
      perfMarks[name] = (window.performance && window.performance.now ? window.performance.now() : Date.now());
    } catch (error) {}
  }

  function printPerfTable() {
    try {
      var order = [
        'app_start',
        'auth_start',
        'auth_success',
        'profile_loaded',
        'memberships_loaded',
        'organizations_loaded',
        'session_ready',
        'app_shell_rendered',
        'suppliers_load_start',
        'suppliers_load_success',
        'suppliers_load_failed'
      ];
      var start = perfMarks.app_start;
      var rows = order.map(function (name) {
        var point = perfMarks[name];
        return {
          step: name,
          ms: typeof point === 'number' && typeof start === 'number' ? Math.round(point - start) : '',
          at: typeof point === 'number' ? Math.round(point) : ''
        };
      });
      if (console && console.table) console.table(rows);
    } catch (error) {}
  }

  window.__printPerfTable = printPerfTable;

  function setState(next, details) {
    currentState = next;
    window.__authState = next;
    window.__authStateDetails = details || null;
  }

  function setLoginButtonState(label, disabled) {
    var button = document.getElementById('loginBtn');
    if (!button) return;
    button.textContent = label || 'Войти в систему →';
    button.disabled = !!disabled;
  }

  function setAuthActionButtons(retryVisible, resetVisible) {
    var retry = document.getElementById('authRetryBtn');
    var reset = document.getElementById('authResetBtn');
    if (retry) retry.style.display = retryVisible ? 'block' : 'none';
    if (reset) reset.style.display = resetVisible ? 'block' : 'none';
  }

  function showLoginScreen(message) {
    var auth = document.getElementById('AUTH');
    var appShell = document.getElementById('APP');
    var loader = document.getElementById('pvLoad');
    if (appShell) appShell.classList.remove('on');
    if (auth) auth.classList.remove('gone');
    if (loader) loader.remove();
    if (message && document.getElementById('liErr')) {
      document.getElementById('liErr').textContent = message;
    }
  }

  function setAuthServiceStatus(message, tone) {
    var el = document.getElementById('authSvcStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = tone === 'err' ? 'var(--rd)' : (tone === 'ok' ? 'var(--gr)' : 'var(--t3)');
  }

  function setLastAuthError(error) {
    window.__lastAuthError = error ? (error.message || String(error)) : null;
  }

  function setLastRpcError(error, fallbackMessage) {
    window.__lastRpcError = error ? (error.message || fallbackMessage || String(error)) : null;
  }

  function clearErrorsAndActions() {
    setLastAuthError(null);
    setLastRpcError(null);
    setAuthActionButtons(false, false);
    setAuthServiceStatus('');
    var errEl = document.getElementById('liErr');
    if (errEl) errEl.textContent = '';
  }

  function showAppShell() {
    var auth = document.getElementById('AUTH');
    var appShell = document.getElementById('APP');
    var loader = document.getElementById('pvLoad');
    if (auth) auth.classList.add('gone');
    if (appShell) appShell.classList.add('on');
    if (loader) loader.remove();
  }

  function normalizeErrorMessage(error) {
    if (!error) return '';
    return error.message || error.msg || String(error);
  }

  function getClient() {
    return app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
  }

  function getSupabaseDiagnostics() {
    var config = app.config && typeof app.config.getSupabaseConfig === 'function'
      ? app.config.getSupabaseConfig()
      : { url: '', anonKey: '', source: 'unknown', enabled: false };
    var host = '';
    try {
      host = config.url ? new URL(config.url).host : '';
    } catch (error) {
      host = '';
    }
    return {
      hasUrl: !!config.url,
      hasAnonKey: !!config.anonKey,
      source: config.source || 'unknown',
      host: host
    };
  }

  function errorInfo(error) {
    return {
      code: error && error.code ? error.code : '',
      message: error && error.message ? error.message : '',
      details: error && error.details ? error.details : '',
      hint: error && error.hint ? error.hint : '',
      raw: error
    };
  }

  function normalizeSessionRow(data) {
    var row = Array.isArray(data) ? (data[0] || null) : (data || null);
    console.info('get_my_session raw rpc data', data);
    console.info('get_my_session normalized row', row);
    if (!row) return null;
    var memberships = Array.isArray(row.memberships) ? row.memberships.slice() : [];
    var organizations = Array.isArray(row.organizations) ? row.organizations.slice() : [];
    var membershipsCount = typeof row.membershipsCount === 'number'
      ? row.membershipsCount
      : (typeof row.memberships_count === 'number' ? row.memberships_count : memberships.length);
    var organizationsCount = typeof row.organizationsCount === 'number'
      ? row.organizationsCount
      : (typeof row.organizations_count === 'number' ? row.organizations_count : organizations.length);
    var noOrganization = row.noOrganization ?? row.no_organization ?? false;
    if (membershipsCount > 0) noOrganization = false;
    var activeOrganizationId = row.activeOrganizationId ?? row.active_organization_id ?? null;
    var activeOrganizationName = row.activeOrganizationName ?? row.active_organization_name ?? null;
    var role = row.role ?? 'unassigned';
    var profileId = row.profileId ?? row.profile_id ?? null;
    var authUserId = row.auth_user_id ?? null;
    var email = row.email ?? '';
    var firstName = row.first_name ?? '';
    var lastName = row.last_name ?? '';
    var status = row.status ?? 'active';
    return {
      row: row,
      profileId: profileId,
      authUserId: authUserId,
      email: email,
      firstName: firstName,
      lastName: lastName,
      status: status,
      memberships: memberships,
      organizations: organizations,
      activeOrganizationId: activeOrganizationId,
      activeOrganizationName: activeOrganizationName,
      membershipsCount: membershipsCount,
      organizationsCount: organizationsCount,
      noOrganization: !!noOrganization,
      role: role
    };
  }

  function withTimeout(promise, ms, message) {
    var timeout = Number(ms || 10000);
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          var err = new Error(message || 'Timeout');
          err.code = 'TIMEOUT';
          err.details = '';
          err.hint = '';
          reject(err);
        }, timeout);
      })
    ]);
  }

  function uniqueIds(items) {
    var ids = [];
    (items || []).forEach(function (item) {
      var id = String(item && item.id ? item.id : '').trim();
      if (id && ids.indexOf(id) < 0) ids.push(id);
    });
    return ids;
  }

  function buildFallbackProfile(authUser) {
    var meta = (authUser && authUser.user_metadata) || {};
    var email = String((authUser && authUser.email) || meta.email || '').toLowerCase();
    return {
      id: authUser && authUser.id ? authUser.id : '',
      auth_user_id: authUser && authUser.id ? authUser.id : '',
      email: email,
      first_name: meta.first_name || meta.firstName || (email ? email.split('@')[0] : 'Пользователь'),
      last_name: meta.last_name || meta.lastName || '',
      phone: meta.phone || '',
      status: meta.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function buildNoOrganizationSession(authUser, profile) {
    var safeProfile = profile || buildFallbackProfile(authUser);
    var currentUser = {
      id: safeProfile.id || (authUser && authUser.id) || '',
      email: safeProfile.email || (authUser && authUser.email) || '',
      first: safeProfile.first_name || safeProfile.firstName || (authUser && authUser.user_metadata && (authUser.user_metadata.first_name || authUser.user_metadata.firstName)) || '',
      last: safeProfile.last_name || safeProfile.lastName || '',
      company: '',
      role: 'unassigned',
      status: safeProfile.status || 'active',
      noOrganization: true,
      profileId: safeProfile.id || '',
      authUserId: (authUser && authUser.id) || '',
      membershipId: '',
      organizationId: '',
      activeOrganizationId: null,
      activeOrganizationName: '',
      permissions: []
    };
    return {
      currentUser: currentUser,
      profileId: safeProfile.id || '',
      memberships: [],
      organizations: [],
      legalEntities: [],
      activeLegalEntities: [],
      activeLegalEntityIds: [],
      activeLegalEntityNames: [],
      activeOrganizationId: null,
      activeOrganization: null,
      role: 'unassigned',
      permissions: [],
      noOrganization: true,
      suppliers: [],
      createdAt: Date.now()
    };
  }

  function buildSession(authUser, profile, memberships, organizations) {
    var activeMembership = memberships[0] || null;
    var activeOrganization = organizations[0] || null;
    var rawRole = activeMembership && activeMembership.role ? activeMembership.role : 'manager';
    var role = rawRole === 'platform_owner' ? 'owner' : rawRole;
    var currentUser = {
      id: profile.id,
      email: profile.email || (authUser && authUser.email) || '',
      first: profile.first_name || profile.firstName || '',
      last: profile.last_name || profile.lastName || '',
      company: activeOrganization && activeOrganization.name ? activeOrganization.name : '',
      role: role,
      status: profile.status || 'active',
      noOrganization: false,
      profileId: profile.id,
      authUserId: authUser.id,
      membershipId: activeMembership ? activeMembership.id || '' : '',
      organizationId: activeOrganization ? activeOrganization.id || '' : '',
      activeOrganizationId: activeOrganization ? activeOrganization.id || null : null,
      activeOrganizationName: activeOrganization ? activeOrganization.name || '' : '',
      permissions: [],
      memberships: memberships.slice(),
      organizations: organizations.slice()
    };

    return {
      currentUser: currentUser,
      profileId: profile.id,
      memberships: memberships.slice(),
      organizations: organizations.slice(),
      legalEntities: [],
      activeLegalEntities: [],
      activeLegalEntityIds: [],
      activeLegalEntityNames: [],
      activeOrganizationId: activeOrganization ? activeOrganization.id || null : null,
      activeOrganization: activeOrganization,
      role: role,
      permissions: [],
      noOrganization: false,
      suppliers: [],
      createdAt: Date.now()
    };
  }

  function applySession(session) {
    window.__userSession = session;
    window.CU = session && session.currentUser ? session.currentUser : null;
    window.activeRest = session && session.activeOrganization
      ? {
          id: session.activeOrganization.id,
          organizationId: session.activeOrganization.id,
          name: session.activeOrganization.name || '',
          emoji: session.activeOrganization.emoji || '🏢',
          type: session.activeOrganization.type || 'organization',
          kind: session.activeOrganization.type || 'organization',
          members: session.memberships ? session.memberships.slice() : []
        }
      : { id: 'r0', organizationId: null, name: 'Все рестораны', emoji: '🌐', type: 'all', kind: 'all', members: [] };
    window.__sessionReady = !!(session && session.currentUser);
    setState(session && session.noOrganization ? STATE.NO_ORGANIZATION : STATE.AUTHENTICATED, session || null);
    if (typeof window.__renderBuildDebug === 'function') {
      try { window.__renderBuildDebug(session); } catch (error) {}
    }
  }

  function normalizeLegacyUserFromSession(session) {
    var currentUser = session && session.currentUser ? Object.assign({}, session.currentUser) : null;
    if (!currentUser) return null;
    if (currentUser.role === 'platform_owner') currentUser.role = 'owner';
    if (currentUser.activeOrganizationId && !currentUser.organizationId) currentUser.organizationId = currentUser.activeOrganizationId;
    if (session && session.activeOrganization && !currentUser.company) currentUser.company = session.activeOrganization.name || '';
    if (session && session.noOrganization) currentUser.noOrganization = true;
    if (!currentUser.permissions || !currentUser.permissions.length) {
      var roleDef = window.ROLES && window.ROLES[currentUser.role] ? window.ROLES[currentUser.role] : null;
      currentUser.permissions = roleDef && Array.isArray(roleDef.pages) ? roleDef.pages.slice() : [];
    }
    return currentUser;
  }

  function buildLegacyUserFromRpcRow(row, activeOrganization, noOrganization, role) {
    var firstName = row && row.first_name ? row.first_name : '';
    var lastName = row && row.last_name ? row.last_name : '';
    var email = row && row.email ? row.email : '';
    var profileId = row && (row.profileId || row.profile_id) ? (row.profileId || row.profile_id) : '';
    var authUserId = row && row.auth_user_id ? row.auth_user_id : '';
    var legacyRole = role === 'platform_owner' ? 'owner' : (role || 'user');
    var displayName = ((firstName || '') + ' ' + (lastName || '')).trim() || email || 'Пользователь';
    var activeOrgId = activeOrganization ? activeOrganization.id : (row && (row.activeOrganizationId || row.active_organization_id)) || null;
    var activeOrgName = activeOrganization ? activeOrganization.name : (row && (row.activeOrganizationName || row.active_organization_name)) || '';
    var legacyUser = {
      id: profileId,
      authUserId: authUserId,
      email: email,
      name: displayName,
      first: firstName || displayName.split(' ')[0] || 'Пользователь',
      last: lastName || '',
      firstName: firstName,
      lastName: lastName,
      role: legacyRole,
      status: (row && row.status) || 'active',
      noOrganization: !!noOrganization,
      company: noOrganization ? 'КальКа' : (activeOrgName || ''),
      organizationId: noOrganization ? null : activeOrgId,
      activeOrganizationId: noOrganization ? null : activeOrgId,
      activeOrganizationName: noOrganization ? '' : activeOrgName,
      permissions: []
    };
    if (window.ROLES && window.ROLES[legacyUser.role] && Array.isArray(window.ROLES[legacyUser.role].pages)) {
      legacyUser.permissions = window.ROLES[legacyUser.role].pages.slice();
    }
    return legacyUser;
  }

  function ensureAppShellVisible() {
    showAppShell();
    try {
      if (typeof window.renderNav === 'function') window.renderNav();
    } catch (error) {}
    try {
      if (typeof window.renderDash === 'function' && window.__userSession && window.__userSession.currentUser && window.__userSession.currentUser.noOrganization) {
        window.renderDash();
      }
    } catch (error) {}
  }

  async function loadUserProfile(authUser) {
    var client = getClient();
    if (!client || !authUser) {
      var noClientError = new Error('Сервис авторизации временно недоступен. Обратитесь к администратору');
      noClientError.code = 'NO_CLIENT';
      throw noClientError;
    }

    console.info('supabase request start', 'user_profiles');
    var response = await withTimeout(
      client
        .from('user_profiles')
        .select('id, auth_user_id, email, first_name, last_name, phone, status, created_at, updated_at')
        .eq('auth_user_id', authUser.id)
        .maybeSingle(),
      8000,
      'Не удалось загрузить профиль пользователя'
    ).catch(function (error) {
      console.error('supabase request failed', {
        request: 'user_profiles',
        code: errorInfo(error).code,
        message: errorInfo(error).message,
        details: errorInfo(error).details,
        hint: errorInfo(error).hint,
        raw: error
      });
      setLastRpcError(error, 'Не удалось загрузить профиль пользователя');
      throw error;
    });

    if (response && response.error) {
      console.error('supabase request failed', {
        request: 'user_profiles',
        code: errorInfo(response.error).code,
        message: errorInfo(response.error).message,
        details: errorInfo(response.error).details,
        hint: errorInfo(response.error).hint,
        raw: response.error
      });
      throw response.error;
    }

    if (response && response.data) {
      console.info('session: profile loaded');
      markPerf('profile_loaded');
      return response.data;
    }

    console.info('supabase request start', 'user_profiles upsert');
    var meta = (authUser && authUser.user_metadata) || {};
    var payload = {
      auth_user_id: authUser.id,
      email: (authUser.email || meta.email || '').toLowerCase(),
      first_name: meta.first_name || meta.firstName || '',
      last_name: meta.last_name || meta.lastName || '',
      phone: meta.phone || '',
      status: 'active'
    };
    var upsertResponse = await withTimeout(
      client
        .from('user_profiles')
        .upsert(payload, { onConflict: 'auth_user_id' })
        .select('id, auth_user_id, email, first_name, last_name, phone, status, created_at, updated_at')
        .single(),
      8000,
      'Не удалось создать профиль пользователя'
    ).catch(function (error) {
      console.error('supabase request failed', {
        request: 'user_profiles upsert',
        code: errorInfo(error).code,
        message: errorInfo(error).message,
        details: errorInfo(error).details,
        hint: errorInfo(error).hint,
        raw: error
      });
      setLastRpcError(error, 'Не удалось создать профиль пользователя');
      throw error;
    });

    if (upsertResponse.error) {
      console.error('supabase request failed', {
        request: 'user_profiles upsert',
        code: errorInfo(upsertResponse.error).code,
        message: errorInfo(upsertResponse.error).message,
        details: errorInfo(upsertResponse.error).details,
        hint: errorInfo(upsertResponse.error).hint,
        raw: upsertResponse.error
      });
      throw upsertResponse.error;
    }

    console.info('session: profile loaded');
    markPerf('profile_loaded');
    return upsertResponse.data || buildFallbackProfile(authUser);
  }

  async function loadMemberships(profileId) {
    var client = getClient();
    if (!client || !profileId) return [];

    console.info('supabase request start', 'organization_members');
    var response = await withTimeout(
      client
        .from('organization_members')
        .select('id, organization_id, user_profile_id, role, status, created_at, updated_at')
        .eq('user_profile_id', profileId)
        .eq('status', 'active'),
      8000,
      'Не удалось загрузить доступы пользователя'
    ).catch(function (error) {
      console.error('supabase request failed', {
        request: 'organization_members',
        code: errorInfo(error).code,
        message: errorInfo(error).message,
        details: errorInfo(error).details,
        hint: errorInfo(error).hint,
        raw: error
      });
      setLastRpcError(error, 'Не удалось загрузить доступы пользователя');
      throw error;
    });

    if (response && response.error) {
      console.error('supabase request failed', {
        request: 'organization_members',
        code: errorInfo(response.error).code,
        message: errorInfo(response.error).message,
        details: errorInfo(response.error).details,
        hint: errorInfo(response.error).hint,
        raw: response.error
      });
      throw response.error;
    }

    var memberships = response && Array.isArray(response.data) ? response.data.slice() : [];
    console.info('session: memberships loaded');
    markPerf('memberships_loaded');
    return memberships;
  }

  async function loadOrganizations(memberships) {
    var client = getClient();
    if (!client) return [];
    var ids = uniqueIds(memberships);
    if (!ids.length) return [];

    console.info('supabase request start', 'organizations');
    var response = await withTimeout(
      client
        .from('organizations')
        .select('id, name, type, status, created_at, updated_at')
        .in('id', ids)
        .eq('status', 'active'),
      8000,
      'Не удалось загрузить организации пользователя'
    ).catch(function (error) {
      console.error('supabase request failed', {
        request: 'organizations',
        code: errorInfo(error).code,
        message: errorInfo(error).message,
        details: errorInfo(error).details,
        hint: errorInfo(error).hint,
        raw: error
      });
      setLastRpcError(error, 'Не удалось загрузить организации пользователя');
      throw error;
    });

    if (response && response.error) {
      console.error('supabase request failed', {
        request: 'organizations',
        code: errorInfo(response.error).code,
        message: errorInfo(response.error).message,
        details: errorInfo(response.error).details,
        hint: errorInfo(response.error).hint,
        raw: response.error
      });
      throw response.error;
    }

    var organizations = response && Array.isArray(response.data) ? response.data.slice() : [];
    console.info('session: organizations loaded');
    markPerf('organizations_loaded');
    return organizations;
  }

  async function bootstrapSession(authUser) {
    var client = getClient();
    if (!client || !authUser) return null;
    setState(STATE.LOADING_PROFILE, { authUserId: authUser.id });
    console.info('supabase request start', 'get_my_session');
    var response = await withTimeout(
      client.rpc('get_my_session'),
      8000,
      'Не удалось загрузить профиль пользователя'
    ).catch(function (error) {
      console.error('rpc get_my_session failed', {
        request: 'get_my_session',
        code: error && error.code ? error.code : '',
        message: error && error.message ? error.message : '',
        details: error && error.details ? error.details : '',
        hint: error && error.hint ? error.hint : '',
        raw: error
      });
      setLastRpcError(error, 'Не удалось загрузить профиль пользователя');
      throw error;
    });
    if (response && response.error) {
      console.error('rpc get_my_session failed', {
        request: 'get_my_session',
        code: response.error.code || '',
        message: response.error.message || '',
        details: response.error.details || '',
        hint: response.error.hint || '',
        raw: response.error
      });
      setLastRpcError(response.error, 'Не удалось загрузить профиль пользователя');
      throw response.error;
    }
    var normalized = normalizeSessionRow(response && response.data);
    if (!normalized || !normalized.row) {
      throw new Error('Не удалось загрузить профиль пользователя');
    }
    var row = normalized.row;
    console.log('RPC RAW SESSION', response && response.data);
    console.log('RPC ROW NORMALIZED', row);
    var profile = {
      id: normalized.profileId || '',
      auth_user_id: normalized.authUserId || authUser.id,
      email: normalized.email || authUser.email || '',
      first_name: normalized.firstName || 'Пользователь',
      last_name: normalized.lastName || '',
      phone: '',
      status: normalized.status || 'active',
      created_at: '',
      updated_at: ''
    };
    var memberships = normalized.memberships.slice();
    var organizations = normalized.organizations.slice();
    var activeOrganization = normalized.activeOrganizationId
      ? organizations.find(function (org) { return String(org.id || '') === String(normalized.activeOrganizationId || ''); }) || null
      : null;
    if (!activeOrganization && organizations.length) activeOrganization = organizations[0];
    var activeMembership = activeOrganization
      ? memberships.find(function (item) { return String(item.organization_id || '') === String(activeOrganization.id || ''); }) || memberships[0] || null
      : memberships[0] || null;
    if (!activeOrganization && normalized.activeOrganizationName && normalized.activeOrganizationId) {
      activeOrganization = {
        id: normalized.activeOrganizationId,
        name: normalized.activeOrganizationName,
        type: 'organization',
        status: 'active',
        created_at: '',
        updated_at: ''
      };
    }
    var noOrganization = (normalized.membershipsCount > 0 || normalized.activeOrganizationId) ? false : !!normalized.noOrganization;
    var role = noOrganization ? 'unassigned' : (normalized.role || (activeMembership && activeMembership.role) || 'manager');
    var legacyUser = buildLegacyUserFromRpcRow(row, activeOrganization, noOrganization, role);
    var legacyActiveRest = {
      id: activeOrganization ? activeOrganization.id : (normalized.activeOrganizationId || null),
      organizationId: activeOrganization ? activeOrganization.id : (normalized.activeOrganizationId || null),
      name: normalized.activeOrganizationName || (activeOrganization && activeOrganization.name) || '',
      kind: (activeOrganization && activeOrganization.type) || 'restaurant',
      type: (activeOrganization && activeOrganization.type) || 'restaurant',
      members: []
    };
    console.log('LEGACY USER', legacyUser);
    console.log('LEGACY ACTIVE REST', legacyActiveRest);
    var session = noOrganization
      ? buildNoOrganizationSession(authUser, profile)
      : buildSession(authUser, profile, memberships.map(function (item) {
          return {
            id: item.id || '',
            organization_id: item.organization_id || '',
            user_profile_id: item.user_profile_id || profile.id,
            role: item.role || 'manager',
            status: item.status || 'active',
            created_at: item.created_at || '',
            updated_at: item.updated_at || ''
          };
        }), organizations.map(function (item) {
          return {
            id: item.id || '',
            name: item.name || '',
            type: item.type || 'organization',
            status: item.status || 'active',
            created_at: item.created_at || '',
            updated_at: item.updated_at || ''
          };
        }));

    session.profile = profile;
    session.memberships = memberships;
    session.organizations = organizations;
    session.activeOrganization = activeOrganization;
    session.activeOrganizationId = activeOrganization ? activeOrganization.id : (normalized.activeOrganizationId || null);
    session.currentMembership = activeMembership;
    session.role = role;
    session.noOrganization = noOrganization;
    session.permissions = noOrganization ? [] : ((window.ROLES && window.ROLES[role] && window.ROLES[role].pages) ? window.ROLES[role].pages.slice() : []);
    session.currentUser.role = role;
    session.currentUser.noOrganization = noOrganization;
    session.currentUser.company = noOrganization ? 'КальКа' : ((activeOrganization && activeOrganization.name) || session.currentUser.company || 'КальКа');
    session.currentUser.organizationId = noOrganization ? null : session.activeOrganizationId;
    session.currentUser.activeOrganizationId = noOrganization ? null : session.activeOrganizationId;
    session.currentUser.activeOrganizationName = activeOrganization && activeOrganization.name ? activeOrganization.name : '';
    session.currentUser.memberships = memberships.map(function (item) {
      return {
        organizationId: item.organization_id,
        role: item.role === 'platform_owner' ? 'owner' : (item.role || 'manager'),
        status: item.status
      };
    });
    session.rawRole = row.role || role;
    session.currentUser = legacyUser;
    if (memberships.length) {
      console.info('session: memberships loaded');
      markPerf('memberships_loaded');
      console.info('initUserSession memberships loaded', memberships.length);
    }
    if (organizations.length || noOrganization) {
      console.info('session: organizations loaded');
      markPerf('organizations_loaded');
    }
    console.info('session: profile loaded');
    markPerf('profile_loaded');
    console.info('normalized session', {
      profileId: normalized.profileId,
      membershipsCount: normalized.membershipsCount,
      organizationsCount: normalized.organizationsCount,
      activeOrganizationId: session.activeOrganizationId,
      noOrganization: noOrganization
    });
    console.info('initUserSession resolved', {
      authUserId: authUser.id,
      profileId: profile.id,
      membershipsCount: normalized.membershipsCount,
      organizationsCount: normalized.organizationsCount,
      activeOrganizationId: session.activeOrganizationId,
      noOrganization: noOrganization
    });
    if (normalized.membershipsCount > 0 && !normalized.organizationsCount) {
      var noOrganizationsError = new Error('Не удалось загрузить организации пользователя');
      noOrganizationsError.code = 'NO_ORGANIZATIONS';
      throw noOrganizationsError;
    }
    session.role = role;
    session.noOrganization = noOrganization;
    session.activeOrganizationId = noOrganization ? null : legacyActiveRest.organizationId;
    session.activeOrganization = noOrganization ? null : (activeOrganization || {
      id: legacyActiveRest.organizationId,
      name: legacyActiveRest.name,
      type: legacyActiveRest.type,
      status: 'active'
    });
    session.currentUser.role = legacyUser.role;
    session.currentUser.noOrganization = noOrganization;
    session.currentUser.company = noOrganization ? 'КальКа' : (legacyActiveRest.name || session.currentUser.company || 'КальКа');
    session.currentUser.organizationId = noOrganization ? null : legacyActiveRest.organizationId;
    session.currentUser.activeOrganizationId = noOrganization ? null : legacyActiveRest.organizationId;
    session.currentUser.activeOrganizationName = noOrganization ? '' : legacyActiveRest.name;
    window.CU = legacyUser;
    window.activeRest = legacyActiveRest;
    window.__userSession = session;
    applySession(session);
    console.info('session: ready');
    markPerf('session_ready');
    printPerfTable();
    return session;
  }

  function getBootstrapPromise(authUser, loader) {
    var userId = authUser && authUser.id ? String(authUser.id) : '';
    if (!userId) return loader();
    if (bootstrapPromises[userId]) return bootstrapPromises[userId];
    var promise = loader().finally(function () {
      delete bootstrapPromises[userId];
    });
    bootstrapPromises[userId] = promise;
    return promise;
  }

  function openAppShell(currentUser) {
    ensureAppShellVisible();
    var legacyUser = normalizeLegacyUserFromSession(window.__userSession || { currentUser: currentUser }) || currentUser || null;
    if (legacyUser) {
      window.CU = legacyUser;
      if (window.__userSession && window.__userSession.activeOrganization) {
        window.activeRest = {
          id: window.__userSession.activeOrganization.id,
          organizationId: window.__userSession.activeOrganization.id,
          name: window.__userSession.activeOrganization.name || '',
          emoji: window.__userSession.activeOrganization.emoji || '🏢',
          type: window.__userSession.activeOrganization.type || 'organization',
          kind: window.__userSession.activeOrganization.type || 'organization',
          members: window.__userSession.memberships ? window.__userSession.memberships.slice() : []
        };
      }
      if (typeof window.enterApp === 'function') {
        window.enterApp(legacyUser);
      }
      if (typeof window.setupUI === 'function') {
        try { window.setupUI(legacyUser); } catch (error) {}
      }
      if (typeof window.buildNav === 'function') {
        try { window.buildNav(legacyUser); } catch (error) {}
      }
      if (typeof window.renderDash === 'function') {
        try { window.renderDash(); } catch (error) {}
      }
      if (typeof window.goPage === 'function') {
        try { window.goPage('dash'); } catch (error) {}
      }
      if (typeof window.go === 'function') {
        try { window.go('dash'); } catch (error) {}
      }
    } else if (typeof window.enterApp === 'function') {
      window.enterApp(currentUser);
    }
    ensureAppShellVisible();
    markPerf('app_shell_rendered');
    printPerfTable();
    if (typeof window.__renderBuildDebug === 'function') {
      try { window.__renderBuildDebug(window.__userSession || null); } catch (error) {}
    }
  }

  async function startLoginFlow(email, password) {
    var client = getClient();
    if (!client) {
      console.error('missing Supabase config', getSupabaseDiagnostics());
      setAuthServiceStatus('Сервис авторизации временно недоступен. Обратитесь к администратору', 'err');
      throw new Error('Сервис авторизации временно недоступен. Обратитесь к администратору');
    }
    setAuthServiceStatus('');
    console.info('auth: signIn started');
    markPerf('auth_start');
    var response = await withTimeout(
      client.auth.signInWithPassword({ email: email, password: password }),
      10000,
      'Не удалось подключиться к серверу авторизации'
    ).catch(function (error) {
      var info = errorInfo(error);
      console.error('signIn failed', {
        code: info.code,
        message: info.message,
        details: info.details,
        hint: info.hint,
        raw: error,
        host: getSupabaseDiagnostics().host,
        source: getSupabaseDiagnostics().source
      });
      var networkLike = /failed to fetch|networkerror|connection reset|ERR_CONNECTION_RESET/i.test(String(info.message || '')) ||
        /failed to fetch|networkerror|connection reset|ERR_CONNECTION_RESET/i.test(String(error && error.raw && error.raw.message ? error.raw.message : ''));
      if (networkLike) {
        var netErr = new Error('Не удалось подключиться к серверу авторизации. Проверьте интернет или попробуйте позже');
        netErr.code = info.code || 'NETWORK_ERROR';
        setAuthServiceStatus(netErr.message, 'err');
        setLastAuthError(netErr);
        throw netErr;
      }
      setLastAuthError(error);
      throw error;
    });
    if (response.error) {
      var responseInfo = errorInfo(response.error);
      console.error('signIn failed', {
        code: responseInfo.code,
        message: responseInfo.message,
        details: responseInfo.details,
        hint: responseInfo.hint,
        raw: response.error,
        host: getSupabaseDiagnostics().host,
        source: getSupabaseDiagnostics().source
      });
      setLastAuthError(response.error);
      setAuthServiceStatus('Не удалось подключиться к серверу авторизации. Проверьте интернет или попробуйте позже', 'err');
      throw response.error;
    }
    console.info('auth: signIn success');
    return response;
  }

  async function resolveAuthUserAfterSignIn(client, response) {
    var authUser = (response && response.data && response.data.user) || (response && response.data && response.data.session && response.data.session.user) || null;
    if (!authUser && client && client.auth && client.auth.getSession) {
      var sessionResponse = await client.auth.getSession();
      authUser = sessionResponse && sessionResponse.data && sessionResponse.data.session && sessionResponse.data.session.user
        ? sessionResponse.data.session.user
        : null;
    }
    return authUser;
  }

  async function login(email, password) {
    var client = getClient();
    if (!client) {
      throw new Error('Сервис авторизации временно недоступен. Обратитесь к администратору');
    }
    if (window.__loginInProgress) {
      return window.__userSession || null;
    }
    if (window.__sessionReady && window.__userSession && window.__userSession.currentUser) {
      openAppShell(window.__userSession.currentUser);
      return window.__userSession;
    }

    clearErrorsAndActions();
    if (typeof window.cleanRuntime === 'function') {
      window.cleanRuntime();
    } else if (typeof window.clearClientRuntimeState === 'function') {
      window.clearClientRuntimeState();
    }
    if (typeof window.clearClientStorage === 'function') {
      try { window.clearClientStorage(); } catch (error) {}
    }

    try {
      var existingSessionResponse = await client.auth.getSession();
      var existingSessionUser = existingSessionResponse && existingSessionResponse.data && existingSessionResponse.data.session && existingSessionResponse.data.session.user
        ? existingSessionResponse.data.session.user
        : null;
      if (existingSessionUser) {
        try {
          await client.auth.signOut();
        } catch (signOutError) {
          console.warn('pre-login signOut failed', errorInfo(signOutError));
        }
      }
    } catch (sessionProbeError) {
      console.warn('pre-login session probe failed', errorInfo(sessionProbeError));
    }

    window.__loginInProgress = true;
    window.__restoreInProgress = false;
    setState(STATE.SIGNING_IN);
    setAuthServiceStatus('Авторизация выполняется через защищённый Supabase Auth');
    setAuthActionButtons(true, true);
    try {
      var response;
      try {
        response = await startLoginFlow(email, password);
      } catch (signInError) {
        if (signInError && signInError.code === 'TIMEOUT') {
          console.warn('signIn timeout, trying existing session');
          var timeoutSession = await client.auth.getSession().catch(function (sessionError) {
            console.error('auth: getSession after signIn timeout failed', errorInfo(sessionError));
            return null;
          });
          if (timeoutSession && timeoutSession.data && timeoutSession.data.session && timeoutSession.data.session.user) {
            response = {
              data: {
                session: timeoutSession.data.session,
                user: timeoutSession.data.session.user
              },
              error: null
            };
          } else {
            throw signInError;
          }
        } else {
          throw signInError;
        }
      }
      var authUser = await resolveAuthUserAfterSignIn(client, response);
      if (!authUser) {
        throw new Error('Не удалось подключиться к серверу авторизации');
      }
      var session = await getBootstrapPromise(authUser, function () {
        setState(STATE.LOADING_PROFILE, { authUserId: authUser.id });
        return bootstrapSession(authUser);
      });
      if (!session || !session.currentUser) {
        throw new Error('Не удалось загрузить профиль пользователя');
      }
      if (session.noOrganization) {
        console.info('no organization mode');
        setAuthServiceStatus('Вы вошли, но пока не добавлены ни в одну организацию', 'ok');
      }
      setLastAuthError(null);
      setLastRpcError(null);
      setAuthActionButtons(false, false);
      markPerf('auth_success');
      openAppShell(session.currentUser);
      window.__sessionReady = true;
      return session;
    } catch (error) {
      setState(STATE.AUTH_ERROR, errorInfo(error));
      setLastAuthError(error);
      setAuthActionButtons(true, true);
      throw error;
    } finally {
      window.__loginInProgress = false;
      setLoginButtonState('Войти в систему →', false);
      if (!window.__sessionReady) setAuthActionButtons(true, true);
    }
  }

  async function restoreSession() {
    var client = getClient();
    if (!client) return false;
    if (window.__loginInProgress || window.__sessionReady || window.__restoreInProgress) return false;
    window.__restoreInProgress = true;
    try {
      var response = await withTimeout(client.auth.getSession(), 8000, 'Не удалось подключиться к серверу авторизации');
      var authUser = response && response.data && response.data.session && response.data.session.user ? response.data.session.user : null;
      if (!authUser) {
        showLoginScreen();
        return false;
      }
      var session = await window.AuthServerFirst.initUserSession(authUser, { forceReload: true });
      if (session && session.currentUser) {
        markPerf('auth_success');
        openAppShell(session.currentUser);
        window.__sessionReady = true;
        return true;
      }
      showLoginScreen();
      return false;
    } catch (error) {
      setState(STATE.AUTH_ERROR, errorInfo(error));
      console.error('restoreSession failed', errorInfo(error));
      showLoginScreen();
      return false;
    } finally {
      window.__restoreInProgress = false;
    }
  }

  function noopDbLoad(callback) {
    if (window.__authServerFirstMode) {
      if (typeof callback === 'function') {
        setTimeout(function () { callback(); }, 0);
      }
      return;
    }
    if (typeof window.__legacyDbLoad === 'function') {
      return window.__legacyDbLoad(callback);
    }
    if (typeof callback === 'function') callback();
  }

  function logout() {
    var client = getClient();
    setState(STATE.UNAUTHENTICATED);
    setLastAuthError(null);
    setLastRpcError(null);
    setAuthActionButtons(false, false);
    window.__sessionReady = false;
    window.__loginInProgress = false;
    window.__restoreInProgress = false;
    try {
        if (typeof window.cleanRuntime === 'function') {
          window.cleanRuntime();
        } else if (typeof window.clearClientRuntimeState === 'function') {
          window.clearClientRuntimeState();
        } else {
          window.__userSession = null;
        window.CU = null;
        window.activeRest = null;
      }
    } catch (error) {}
    if (client && client.auth && client.auth.signOut) {
      return client.auth.signOut().catch(function (error) {
        console.error('logout signOut failed', errorInfo(error));
      }).finally(function () {
        if (typeof window.clearClientStorage === 'function') {
          try { window.clearClientStorage(); } catch (storageError) {}
        }
        showLoginScreen();
      });
    }
    if (typeof window.clearClientStorage === 'function') {
      try { window.clearClientStorage(); } catch (storageError) {}
    }
    showLoginScreen();
    if (typeof window.__renderBuildDebug === 'function') {
      try { window.__renderBuildDebug(null); } catch (error) {}
    }
    return Promise.resolve();
  }

  window.AuthServerFirst = {
    enabled: true,
    state: function () { return currentState; },
    startLogin: login,
    restoreSession: restoreSession,
    initUserSession: function (authUser, opts) {
      var options = opts || {};
      if (!authUser) return Promise.resolve(null);
      if (!options.forceReload && window.__sessionReady && window.__userSession && window.__userSession.currentUser && String(window.__userSession.currentUser.authUserId || '') === String(authUser.id || '')) {
        return Promise.resolve(window.__userSession);
      }
      if (options.forceReload) {
        var userId = authUser && authUser.id ? String(authUser.id) : '';
        if (userId && bootstrapPromises[userId]) {
          delete bootstrapPromises[userId];
        }
      }
      return getBootstrapPromise(authUser, function () {
        window.__authState = STATE.LOADING_PROFILE;
        setState(STATE.LOADING_PROFILE, { authUserId: authUser.id });
        return bootstrapSession(authUser);
      });
    },
    openAppShell: openAppShell,
    logout: logout,
    loadUserProfile: loadUserProfile,
    loadMemberships: loadMemberships,
    loadOrganizations: loadOrganizations
  };

  window.doLogin = function () {
    var email = ((document.getElementById('liE') || {}).value || '').trim().toLowerCase();
    var password = ((document.getElementById('liP') || {}).value || '');
    var errEl = document.getElementById('liErr');
    if (errEl) errEl.textContent = '';
    if (!email || !password) {
      if (errEl) errEl.textContent = 'Заполните email и пароль';
      return Promise.resolve(null);
    }
    if (window.__sessionReady && window.__userSession && window.__userSession.currentUser) {
      openAppShell(window.__userSession.currentUser);
      return Promise.resolve(window.__userSession);
    }
    return login(email, password).catch(function (error) {
      console.error('signIn failed', errorInfo(error));
      if (error && error.message === 'Не удалось создать профиль пользователя') {
        if (errEl) errEl.textContent = error.message;
        setAuthServiceStatus(error.message, 'err');
        return null;
      }
      if (error && error.message === 'Не удалось загрузить доступы пользователя') {
        if (errEl) errEl.textContent = error.message;
        setAuthServiceStatus(error.message, 'err');
        return null;
      }
      if (error && error.message === 'Не удалось загрузить организации пользователя') {
        if (errEl) errEl.textContent = error.message;
        setAuthServiceStatus(error.message, 'err');
        return null;
      }
      if (error && /Не удалось подключиться к серверу авторизации/i.test(error.message || '')) {
        if (errEl) errEl.textContent = error.message;
        setAuthServiceStatus(error.message, 'err');
        return null;
      }
      if (error && error.code === 'NO_CLIENT') {
        if (errEl) errEl.textContent = 'Сервис авторизации временно недоступен. Обратитесь к администратору';
        setAuthServiceStatus('Сервис авторизации временно недоступен. Обратитесь к администратору', 'err');
        return null;
      }
      if (errEl) errEl.textContent = error && error.message ? error.message : 'Ошибка входа';
      setAuthServiceStatus(errEl ? errEl.textContent : 'Ошибка входа', 'err');
      return null;
    });
  };

  window.dbLoad = noopDbLoad;
  window.app = window.app || {};
  window.app.auth = window.app.auth || {};
  window.app.auth.restoreSession = restoreSession;
  window.app.auth.initUserSession = function (authUser, opts) { return window.AuthServerFirst.initUserSession(authUser, opts); };
  window.app.auth.startLogin = function (email, password) { return login(email, password); };
  window.doLogout = function () {
    return logout();
  };
  window.resetAuthSessionAndReload = function () {
    var client = getClient();
    return Promise.resolve()
      .then(function () {
        if (client && client.auth && client.auth.signOut) {
          return client.auth.signOut().catch(function (error) {
            console.warn('reset signOut failed', errorInfo(error));
          });
        }
      })
      .then(function () {
        if (typeof window.cleanRuntime === 'function') window.cleanRuntime();
        else if (typeof window.clearClientRuntimeState === 'function') window.clearClientRuntimeState();
        if (typeof window.clearClientStorage === 'function') {
          try { window.clearClientStorage(); } catch (storageError) {}
        }
        window.__sessionReady = false;
        window.__loginInProgress = false;
        window.__restoreInProgress = false;
        window.__userSession = null;
        window.CU = null;
        window.activeRest = null;
        window.__lastAuthError = null;
        window.__lastRpcError = null;
        window.location.href = EXPECTED_PRODUCTION_URL;
      });
  };

  setTimeout(function () {
    try {
      var config = app.config && typeof app.config.getSupabaseConfig === 'function' ? app.config.getSupabaseConfig() : null;
      if (!config || !config.enabled) {
        setAuthServiceStatus('Сервис авторизации временно недоступен. Обратитесь к администратору', 'err');
      }
    } catch (error) {}
  }, 0);
})(window);
