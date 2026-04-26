(function () {
  function normalizeRole(role) {
    if (!role) return 'unassigned';
    if (role === 'platform_owner') return 'owner';
    return role;
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

  window.normalizeRole = normalizeRole;
  window.safeHasAccess = safeHasAccess;

  console.info('access test owner dash', safeHasAccess('dash', 'owner'));
})();
