(function (window) {
  var app = window.KalkaApp = window.KalkaApp || {};
  var availabilityChecked = false;
  var available = false;

  function client() {
    return app.supabase && app.supabase.getClient ? app.supabase.getClient() : null;
  }

  async function detectAvailability() {
    if (availabilityChecked) return available;
    availabilityChecked = true;

    var supabase = client();
    if (!supabase) return false;

    try {
      var response = await supabase.from('suppliers').select('id').limit(1);
      available = !response.error;
    } catch (error) {
      available = false;
    }
    return available;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function firstNonEmptyArray() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (Array.isArray(arguments[i]) && arguments[i].length) return arguments[i];
    }
    return [];
  }

  function hasCommerceData(snapshot) {
    var data = snapshot || {};
    return !!(
      safeArray(data.restaurants).length ||
      safeArray(data.supsData || data.suppliers).length ||
      safeArray(data.products).length ||
      safeArray(data.supProds).length ||
      safeArray(data.orders).length ||
      safeArray(data.techCards).length
    );
  }

  function mapRestaurant(row) {
    return {
      id: row.legacy_id || row.id,
      name: row.name || '',
      emoji: row.emoji || '🍽️',
      type: row.kind || 'Ресторан',
      city: row.city || '',
      addr: row.address || '',
      members: safeArray(row.members)
    };
  }

  function mapSupplier(row) {
    return {
      emoji: row.emoji || '🏭',
      name: row.name || '',
      type: row.kind || 'Поставщик',
      rating: Number(row.rating || 0) || 0,
      orders: parseInt(row.orders_count || 0, 10) || 0,
      delivery: row.delivery || '1-2 дня',
      min: row.min_order_text || '₽1 000',
      status: row.status || 'new',
      tags: safeArray(row.tags),
      contact: row.contact || '',
      phone: row.phone || '',
      hidden: !!row.hidden
    };
  }

  function mapProduct(row, priceRows) {
    var suppliers = priceRows.map(function (priceRow) {
      return {
        name: priceRow.supplier_name || '',
        price: Number(priceRow.price || 0) || 0
      };
    }).filter(function (item) {
      return item.name;
    });

    return {
      id: row.legacy_product_id || row.id,
      name: row.name || '',
      cat: row.category || 'dry',
      unit: row.unit || 'кг',
      emoji: row.emoji || '',
      sticker: row.sticker || null,
      fav: !!row.favorite,
      suppliers: suppliers,
      pKg: Number(row.p_kg || 0) || 0,
      pSh: Number(row.p_sh || 0) || 0,
      pL: Number(row.p_l || 0) || 0,
      pMl: Number(row.p_ml || 0) || 0,
      allowedCompanies: safeArray(row.allowed_companies)
    };
  }

  function mapSupProd(priceRow) {
    return {
      id: priceRow.legacy_sup_prod_id || priceRow.id,
      name: priceRow.product_name || '',
      cat: priceRow.category || '—',
      unit: priceRow.unit || 'кг',
      supplier: priceRow.supplier_name || '',
      _supplier: priceRow.supplier_name || '',
      _priceName: priceRow.price_name || '',
      pKg: Number(priceRow.p_kg || 0) || 0,
      pSh: Number(priceRow.p_sh || 0) || 0,
      pL: Number(priceRow.p_l || 0) || 0,
      pMl: Number(priceRow.p_ml || 0) || 0,
      stock: parseInt(priceRow.stock || 0, 10) || 0,
      active: priceRow.active !== false,
      hidden: !!priceRow.hidden,
      _type: priceRow.price_type || 'main',
      allowedUserIds: safeArray(priceRow.allowed_user_ids),
      allowedCompanies: safeArray(priceRow.allowed_companies)
    };
  }

  function mapOrder(row) {
    return {
      id: row.legacy_order_id || row.id,
      rest: row.restaurant_name || '—',
      sup: row.supplier_label || row.supplier_name || '—',
      items: row.items_text || '',
      sum: Number(row.total || 0) || 0,
      date: row.order_date || '',
      status: row.status || 'processing',
      comment: row.comment || ''
    };
  }

  function mapTechCard(row) {
    return {
      id: row.legacy_tech_card_id || row.id,
      name: row.name || '',
      cat: row.category || 'hot',
      inputG: Number(row.input_g || 0) || 0,
      lossP: Number(row.loss_p || 0) || 0,
      yieldG: Number(row.yield_g || 0) || 0,
      markup: Number(row.markup || 0) || 0,
      ings: safeArray(row.ingredients)
    };
  }

  async function load(baseDb) {
    if (!(await detectAvailability())) return null;

    var supabase = client();
    var results = await Promise.all([
      supabase.from('restaurants').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
      supabase.from('product_supplier_prices').select('*').order('product_name'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('tech_cards').select('*').order('name')
    ]);

    if (results.some(function (item) { return item.error; })) return null;

    var restaurants = safeArray(results[0].data).map(mapRestaurant);
    var suppliers = safeArray(results[1].data).map(mapSupplier);
    var productRows = safeArray(results[2].data);
    var priceRows = safeArray(results[3].data);
    var groupedPrices = {};
    priceRows.forEach(function (row) {
      var key = row.product_id;
      if (!groupedPrices[key]) groupedPrices[key] = [];
      groupedPrices[key].push(row);
    });

    var products = productRows.map(function (row) {
      return mapProduct(row, groupedPrices[row.id] || []);
    });

    var incoming = {
      restaurants: restaurants,
      supsData: suppliers,
      products: products,
      supProds: priceRows.map(mapSupProd),
      orders: safeArray(results[4].data).map(mapOrder),
      techCards: safeArray(results[5].data).map(mapTechCard)
    };

    if (!hasCommerceData(incoming) && hasCommerceData(baseDb)) {
      console.warn('Commerce tables returned empty snapshot, preserving base state');
      setTimeout(function () {
        save(baseDb).catch(function (error) {
          console.error('Commerce background restore failed:', error);
        });
      }, 0);
      return Object.assign({}, baseDb || {});
    }

    return Object.assign({}, baseDb || {}, {
      restaurants: firstNonEmptyArray(incoming.restaurants, baseDb && baseDb.restaurants),
      supsData: firstNonEmptyArray(incoming.supsData, baseDb && baseDb.supsData),
      products: firstNonEmptyArray(incoming.products, baseDb && baseDb.products),
      supProds: firstNonEmptyArray(incoming.supProds, baseDb && baseDb.supProds),
      orders: firstNonEmptyArray(incoming.orders, baseDb && baseDb.orders),
      techCards: firstNonEmptyArray(incoming.techCards, baseDb && baseDb.techCards)
    });
  }

  function snapshotFromState(db) {
    var state = db || {};
    var runtime = window || {};
    return {
      restaurants: firstNonEmptyArray(state.restaurants, runtime.RESTAURANTS),
      suppliers: firstNonEmptyArray(state.supsData, runtime.SUPS_DATA),
      products: firstNonEmptyArray(state.products, runtime.PRODUCTS),
      supProds: firstNonEmptyArray(state.supProds, runtime.SUP_PRODS),
      orders: firstNonEmptyArray(state.orders, runtime.ORDERS),
      techCards: firstNonEmptyArray(state.techCards, runtime.TECH_CARDS)
    };
  }

  async function save(db) {
    if (!(await detectAvailability())) return false;
    var supabase = client();
    var snapshot = snapshotFromState(db || {});
    if (!hasCommerceData(snapshot)) {
      console.warn('Commerce save skipped: snapshot is empty');
      return false;
    }
    var response = await supabase.rpc('replace_commerce_snapshot', {
      snapshot: snapshot
    });
    return !response.error;
  }

  app.commerce = {
    isAvailable: detectAvailability,
    load: load,
    save: save
  };
})(window);
