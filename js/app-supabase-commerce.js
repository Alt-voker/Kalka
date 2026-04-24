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
      safeArray(data.supplierPriceLists).length ||
      safeArray(data.supplierPriceListLegals).length ||
      safeArray(data.supplierPriceItems).length ||
      safeArray(data.supplierImportTemplates).length ||
      safeArray(data.priceImportBatches).length ||
      safeArray(data.priceImportItems).length ||
      safeArray(data.orders).length ||
      safeArray(data.techCards).length
    );
  }

  function mapRestaurant(row) {
    return {
      id: row.legacy_id || row.id,
      organizationId: row.organization_id || '',
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
      organizationId: row.organization_id || '',
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
      organizationId: row.organization_id || '',
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
      organizationId: priceRow.organization_id || '',
      name: priceRow.product_name || '',
      cat: priceRow.category || '—',
      unit: priceRow.unit || 'кг',
      supplier: priceRow.supplier_name || '',
      _supplier: priceRow.supplier_name || '',
      _priceName: priceRow.price_name || '',
      priceListId: priceRow.price_list_id || '',
      priceListName: priceRow.price_list_name || '',
      priceListActive: priceRow.active !== false,
      legalEntityIds: safeArray(priceRow.legal_entity_ids),
      legalEntityNames: safeArray(priceRow.legal_entity_names),
      sourceFile: priceRow.source_file || '',
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

  function mapPriceList(row) {
    return {
      id: row.legacy_price_list_id || row.id,
      organizationId: row.organization_id || '',
      supplierId: row.supplier_id || '',
      supplierName: row.supplier_name || '',
      priceName: row.price_name || row.name || '',
      legalEntityIds: safeArray(row.legal_entity_ids),
      legalEntityNames: safeArray(row.legal_entity_names),
      comment: row.comment || '',
      sourceFile: row.source_file || '',
      active: row.active !== false,
      uploadedAt: row.uploaded_at || row.created_at || '',
      updatedAt: row.updated_at || row.created_at || ''
    };
  }

  function mapPriceListLegal(row) {
    return {
      id: row.legacy_price_list_legal_id || row.id,
      priceListId: row.price_list_id || '',
      organizationId: row.organization_id || '',
      legalEntityId: row.legal_entity_id || '',
      legalEntityName: row.legal_entity_name || ''
    };
  }

  function mapPriceItem(row) {
    return {
      id: row.legacy_price_item_id || row.id,
      priceListId: row.price_list_id || '',
      organizationId: row.organization_id || '',
      productId: row.product_id || '',
      productName: row.product_name || '',
      nameInPrice: row.name_in_price || row.product_name || '',
      price: Number(row.price || 0) || 0,
      unitId: row.unit_id || '',
      sourceRowNumber: parseInt(row.source_row_number || 0, 10) || 0,
      rawData: row.raw_data || {}
    };
  }

  function mapImportTemplate(row) {
    return {
      id: row.id,
      organizationId: row.organization_id || '',
      supplierName: row.supplier_name || '',
      supplierLegacyKey: row.supplier_legacy_key || '',
      sheetName: row.sheet_name || '',
      headerRow: parseInt(row.header_row || 0, 10) || 0,
      dataStartRow: parseInt(row.data_start_row || 1, 10) || 1,
      columnMapping: row.column_mapping || {},
      skipRules: row.skip_rules || {},
      createdBy: row.created_by || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function mapImportBatch(row) {
    return {
      id: row.id,
      organizationId: row.organization_id || '',
      supplierName: row.supplier_name || '',
      supplierLegacyKey: row.supplier_legacy_key || '',
      templateId: row.template_id || '',
      sourceFileName: row.source_file_name || '',
      sheetName: row.sheet_name || '',
      totalRows: parseInt(row.total_rows || 0, 10) || 0,
      importedRows: parseInt(row.imported_rows || 0, 10) || 0,
      skippedRows: parseInt(row.skipped_rows || 0, 10) || 0,
      status: row.status || 'draft',
      createdBy: row.created_by || '',
      createdAt: row.created_at || ''
    };
  }

  function mapImportItem(row) {
    return {
      id: row.id,
      organizationId: row.organization_id || '',
      batchId: row.batch_id || '',
      supplierName: row.supplier_name || '',
      sourceRowNumber: parseInt(row.source_row_number || 0, 10) || 0,
      name: row.name || '',
      unit: row.unit || 'кг',
      price: Number(row.price || 0) || 0,
      rawData: row.raw_data || {},
      createdAt: row.created_at || ''
    };
  }

  function mapOrder(row) {
    return {
      id: row.legacy_order_id || row.id,
      organizationId: row.organization_id || '',
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
      organizationId: row.organization_id || '',
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
      supabase.from('supplier_price_lists').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('supplier_price_list_legal_entities').select('*').order('legal_entity_name'),
      supabase.from('supplier_price_items').select('*').order('source_row_number'),
      supabase.from('supplier_import_templates').select('*').order('updated_at', { ascending: false }),
      supabase.from('price_import_batches').select('*').order('created_at', { ascending: false }),
      supabase.from('price_import_items').select('*').order('source_row_number'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('tech_cards').select('*').order('name')
    ]);

    if (results.some(function (item) { return item.error; })) return null;

    var restaurants = safeArray(results[0].data).map(mapRestaurant);
    var suppliers = safeArray(results[1].data).map(mapSupplier);
    var productRows = safeArray(results[2].data);
    var priceRows = safeArray(results[3].data);
    var priceListRows = safeArray(results[4].data);
    var priceListLegalRows = safeArray(results[5].data);
    var priceItemRows = safeArray(results[6].data);
    var importTemplateRows = safeArray(results[7].data);
    var importBatchRows = safeArray(results[8].data);
    var importItemRows = safeArray(results[9].data);
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
      supplierPriceLists: priceListRows.map(mapPriceList),
      supplierPriceListLegals: priceListLegalRows.map(mapPriceListLegal),
      supplierPriceItems: priceItemRows.map(mapPriceItem),
      supplierImportTemplates: importTemplateRows.map(mapImportTemplate),
      priceImportBatches: importBatchRows.map(mapImportBatch),
      priceImportItems: importItemRows.map(mapImportItem),
      orders: safeArray(results[10].data).map(mapOrder),
      techCards: safeArray(results[11].data).map(mapTechCard)
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
      supplierPriceLists: firstNonEmptyArray(incoming.supplierPriceLists, baseDb && baseDb.supplierPriceLists),
      supplierPriceListLegals: firstNonEmptyArray(incoming.supplierPriceListLegals, baseDb && baseDb.supplierPriceListLegals),
      supplierPriceItems: firstNonEmptyArray(incoming.supplierPriceItems, baseDb && baseDb.supplierPriceItems),
      supplierImportTemplates: firstNonEmptyArray(incoming.supplierImportTemplates, baseDb && baseDb.supplierImportTemplates),
      priceImportBatches: firstNonEmptyArray(incoming.priceImportBatches, baseDb && baseDb.priceImportBatches),
      priceImportItems: firstNonEmptyArray(incoming.priceImportItems, baseDb && baseDb.priceImportItems),
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
      supplierPriceLists: firstNonEmptyArray(state.supplierPriceLists, runtime.SUP_PRICE_LISTS),
      supplierPriceListLegals: firstNonEmptyArray(state.supplierPriceListLegals, runtime.SUP_PRICE_LIST_LEGALS),
      supplierPriceItems: firstNonEmptyArray(state.supplierPriceItems, runtime.SUP_PRICE_ITEMS),
      supplierImportTemplates: firstNonEmptyArray(state.supplierImportTemplates, runtime.supplierImportTemplates),
      priceImportBatches: firstNonEmptyArray(state.priceImportBatches, runtime.priceImportBatches),
      priceImportItems: firstNonEmptyArray(state.priceImportItems, runtime.priceImportItems),
      orders: firstNonEmptyArray(state.orders, runtime.ORDERS),
      techCards: firstNonEmptyArray(state.techCards, runtime.TECH_CARDS)
    };
  }

  function snapshotCounts(snapshot) {
    return {
      restaurants: safeArray(snapshot.restaurants).length,
      suppliers: safeArray(snapshot.suppliers).length,
      products: safeArray(snapshot.products).length,
      supProds: safeArray(snapshot.supProds).length,
      orders: safeArray(snapshot.orders).length,
      techCards: safeArray(snapshot.techCards).length
    };
  }

  function isSuspiciousCommerceSnapshot(snapshot, baseDb) {
    var nextCounts = snapshotCounts(snapshot);
    var currentCounts = snapshotCounts(snapshotFromState(baseDb || {}));
    if (!nextCounts.restaurants || !nextCounts.suppliers) return true;
    if (currentCounts.restaurants > 0 && nextCounts.restaurants === 0) return true;
    if (currentCounts.suppliers > 0 && nextCounts.suppliers === 0) return true;
    if (currentCounts.products >= 5 && nextCounts.products < Math.ceil(currentCounts.products * 0.5)) return true;
    if (currentCounts.supProds >= 5 && nextCounts.supProds < Math.ceil(currentCounts.supProds * 0.5)) return true;
    if (currentCounts.orders >= 5 && nextCounts.orders < Math.ceil(currentCounts.orders * 0.5)) return true;
    return false;
  }

  async function save(db) {
    if (!(await detectAvailability())) return false;
    var supabase = client();
    var sourceDb = db || {};
    var snapshot = snapshotFromState(sourceDb);
    if (!hasCommerceData(snapshot) || isSuspiciousCommerceSnapshot(snapshot, sourceDb)) {
      console.warn('Commerce save skipped: suspicious or empty snapshot', snapshotCounts(snapshot));
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
