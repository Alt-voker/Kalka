(function () {
  function normalizeRole(role) {
    if (!role) return 'unassigned';
    if (role === 'platform_owner') return 'owner';
    return role;
  }

  function normalizePermissionList(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            return String(
              item.key ||
              item.permission_key ||
              item.permissionKey ||
              item.name ||
              ''
            ).trim();
          }
          return '';
        })
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed) return [];
      try {
        var parsed = JSON.parse(trimmed);
        return normalizePermissionList(parsed);
      } catch (error) {
        return trimmed.indexOf(',') >= 0
          ? trimmed.split(',').map(function (item) { return item.trim(); }).filter(Boolean)
          : [trimmed];
      }
    }
    if (typeof value === 'object') {
      if (Array.isArray(value.permissions)) return normalizePermissionList(value.permissions);
      if (Array.isArray(value.items)) return normalizePermissionList(value.items);
      if (Array.isArray(value.data)) return normalizePermissionList(value.data);
    }
    return [];
  }

  const ROLE_PAGES = {
    owner: ['*'],
    admin: ['dash', 'suppliers', 'orders', 'prices', 'users'],
    organization_owner: ['dash', 'suppliers', 'orders', 'prices', 'users'],
    manager: ['dash', 'suppliers', 'orders', 'prices'],
    buyer: ['dash', 'suppliers', 'orders', 'prices'],
    chef: ['dash', 'techcards', 'products'],
    bar_manager: ['dash', 'suppliers', 'techcards', 'orders'],
    accountant: ['dash', 'reports'],
    warehouse: ['dash', 'stock', 'orders'],
    unassigned: ['dash']
  };

  function safeHasAccess(page, role) {
    const r = normalizeRole(role);
    const pages = ROLE_PAGES[r] || ROLE_PAGES.unassigned;
    if (pages.includes('*')) return true;
    return pages.includes(page);
  }

  function hasPermission(permissionKey) {
    var session = window.__userSession || {};
    var role = normalizeRole(
      session.role ||
      (session.currentUser && session.currentUser.role) ||
      ''
    );
    var permissions = normalizePermissionList(
      session.activeOrganizationPermissions ||
      (session.currentUser && session.currentUser.activeOrganizationPermissions)
    );

    if (!permissionKey) return false;
    if (role === 'owner') return true;
    if (!permissions.length) return false;
    return permissions.indexOf(permissionKey) >= 0;
  }

  window.normalizeRole = normalizeRole;
  window.normalizePermissionList = normalizePermissionList;
  window.safeHasAccess = safeHasAccess;
  window.hasPermission = hasPermission;

  console.info('access-control loaded');
  console.info('access test owner dash', safeHasAccess('dash', 'owner'));
})();
