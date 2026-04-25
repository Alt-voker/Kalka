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
  var currentState = window.__authState || STATE.UNAUTHENTICATED;

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

  function showAppShell() {
    var auth = document.getElementById('AUTH');
    var appShell = document.getElementById('APP');
    var loader = document.getElementById('pvLoad');
    if (auth) auth.classList.add('gone');
    if (appShell) appShell.classList.add('on');
    if (loader) loader.remove();
  }

  function getClient() {
    return app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
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
    var role = activeMembership && activeMembership.role ? activeMembership.role : 'manager';
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
      ? { id: session.activeOrganization.id, name: session.activeOrganization.name || '', emoji: session.activeOrganization.emoji || '🏢' }
      : { id: 'r0', name: 'Все рестораны', emoji: '🌐' };
    window.__sessionReady = !!(session && session.currentUser);
    setState(session && session.noOrganization ? STATE.NO_ORGANIZATION : STATE.AUTHENTICATED, session || null);
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
      'Не удалось загрузить профиль пользователя'
    ).catch(function (error) {
      console.error('supabase request failed', {
        request: 'user_profiles upsert',
        code: errorInfo(error).code,
        message: errorInfo(error).message,
        details: errorInfo(error).details,
        hint: errorInfo(error).hint,
        raw: error
      });
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
      'Не удалось загрузить доступные организации'
    ).catch(function (error) {
      console.error('supabase request failed', {
        request: 'organization_members',
        code: errorInfo(error).code,
        message: errorInfo(error).message,
        details: errorInfo(error).details,
        hint: errorInfo(error).hint,
        raw: error
      });
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
    return organizations;
  }

  async function bootstrapSession(authUser) {
    var profile = await loadUserProfile(authUser);
    setState(STATE.LOADING_MEMBERSHIPS, { authUserId: authUser.id, profileId: profile.id });
    var memberships = await loadMemberships(profile.id);
    if (!memberships.length) {
      var noOrgSession = buildNoOrganizationSession(authUser, profile);
      applySession(noOrgSession);
      console.info('session: ready');
      return noOrgSession;
    }

    setState(STATE.LOADING_ORGANIZATIONS, { authUserId: authUser.id, profileId: profile.id, membershipsCount: memberships.length });
    var organizations = await loadOrganizations(memberships);
    if (!organizations.length) {
      var noOrganizationsSession = buildNoOrganizationSession(authUser, profile);
      applySession(noOrganizationsSession);
      console.info('session: ready');
      return noOrganizationsSession;
    }

    var session = buildSession(authUser, profile, memberships, organizations);
    applySession(session);
    console.info('session: ready');
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
    if (typeof window.enterApp === 'function') {
      window.enterApp(currentUser);
    }
    ensureAppShellVisible();
  }

  async function startLoginFlow(email, password) {
    var client = getClient();
    if (!client) {
      throw new Error('Сервис авторизации временно недоступен. Обратитесь к администратору');
    }
    console.info('auth: signIn started');
    var response = await withTimeout(
      client.auth.signInWithPassword({ email: email, password: password }),
      10000,
      'Не удалось подключиться к серверу авторизации'
    );
    if (response.error) {
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

    window.__loginInProgress = true;
    window.__restoreInProgress = false;
    setState(STATE.SIGNING_IN);
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
      }
      openAppShell(session.currentUser);
      window.__sessionReady = true;
      return session;
    } catch (error) {
      setState(STATE.AUTH_ERROR, errorInfo(error));
      throw error;
    } finally {
      window.__loginInProgress = false;
      setLoginButtonState('Войти в систему →', false);
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
      var session = await getBootstrapPromise(authUser, function () {
        setState(STATE.LOADING_PROFILE, { authUserId: authUser.id });
        return bootstrapSession(authUser);
      });
      if (session && session.currentUser) {
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
    window.__sessionReady = false;
    window.__loginInProgress = false;
    window.__restoreInProgress = false;
    try {
      window.__userSession = null;
      window.CU = null;
      window.activeRest = { id: 'r0', name: 'Все рестораны', emoji: '🌐' };
    } catch (error) {}
    if (client && client.auth && client.auth.signOut) {
      return client.auth.signOut().catch(function (error) {
        console.error('logout signOut failed', errorInfo(error));
      }).finally(function () {
        showLoginScreen();
      });
    }
    showLoginScreen();
    return Promise.resolve();
  }

  window.AuthServerFirst = {
    enabled: true,
    state: function () { return currentState; },
    startLogin: login,
    restoreSession: restoreSession,
    initUserSession: function (authUser) {
      if (!authUser) return Promise.resolve(null);
      if (window.__sessionReady && window.__userSession && window.__userSession.currentUser && String(window.__userSession.currentUser.authUserId || '') === String(authUser.id || '')) {
        return Promise.resolve(window.__userSession);
      }
      return getBootstrapPromise(authUser, function () {
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
      if (errEl) errEl.textContent = error && error.message ? error.message : 'Ошибка входа';
      return null;
    });
  };

  window.dbLoad = noopDbLoad;
  window.app = window.app || {};
  window.app.auth = window.app.auth || {};
  window.app.auth.restoreSession = restoreSession;
  window.app.auth.initUserSession = function (authUser) { return window.AuthServerFirst.initUserSession(authUser); };
  window.app.auth.startLogin = function (email, password) { return login(email, password); };
  window.doLogout = function () {
    return logout();
  };
})(window);
