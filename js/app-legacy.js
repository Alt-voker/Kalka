
let ROLES={
  owner:     {label:'Владелец',     emoji:'👑',color:'#5ba3f5',dim:'rgba(200,240,80,.12)',   pages:['owner','admin','restaurants','dashboard','catalog','order','favorites','orders','suppliers','analytics','tender','techcards','chef-calc','sup-dashboard','sup-products','sup-orders','sup-analytics']},
  admin:     {label:'Администратор',emoji:'🛡️',color:'#ab7df8',dim:'rgba(171,125,248,.12)', pages:['admin','restaurants','dashboard','catalog','order','favorites','orders','suppliers','analytics','tender','techcards','chef-calc','sup-products']},
  manager:   {label:'Управляющий',  emoji:'👔',color:'#4fc3f7',dim:'rgba(79,195,247,.12)',  pages:['dashboard','catalog','order','favorites','orders','suppliers','analytics','tender','techcards','chef-calc','sup-products','restaurants']},
  chef:      {label:'Шеф-повар',    emoji:'👨‍🍳',color:'#ff7043',dim:'rgba(255,112,67,.12)',  pages:['dashboard','catalog','order','favorites','orders','suppliers','analytics','tender','techcards','chef-calc','sup-products','restaurants']},
  buyer:     {label:'Закупщик',     emoji:'🛒',color:'#4caf82',dim:'rgba(76,175,130,.12)',  pages:['dashboard','catalog','order','favorites','orders','suppliers','analytics','tender','restaurants']},
  supplier:  {label:'Поставщик',    emoji:'🏭',color:'#8a9ba8',dim:'rgba(138,155,168,.12)', pages:['sup-dashboard','sup-products','sup-orders','sup-analytics']},
  accountant:{label:'Бухгалтер',    emoji:'📊',color:'#ffd54f',dim:'rgba(255,213,79,.12)',  pages:['analytics','orders','dashboard','restaurants']},
};
const ROLE_DEFAULT_PAGES=Object.fromEntries(Object.entries(ROLES).map(function(entry){
  return [entry[0], (entry[1].pages||[]).slice()];
}));
const PM={
  owner:          {sec:'Владелец',    ico:'', lbl:'Панель владельца'},
  admin:          {sec:'Управление',  ico:'', lbl:'Пользователи'},
  dashboard:      {sec:'Главная',     ico:'', lbl:'Дашборд'},
  analytics:      {sec:null,          ico:'', lbl:'Аналитика'},
  catalog:        {sec:'Закупки',     ico:'', lbl:'Каталог'},
  tender:         {sec:'Закупки',     ico:'', lbl:'Тендер'},
  order:          {sec:null,          ico:'', lbl:'Заказ и Корзина', badge:'cart'},
  favorites:      {sec:null,          ico:'', lbl:'Избранное',       badge:'fav'},
  orders:         {sec:'Кабинет',     ico:'', lbl:'История заказов'},
  suppliers:      {sec:null,          ico:'', lbl:'Поставщики'},
  restaurants:    {sec:'Управление',  ico:'', lbl:'Ресторан/Бар'},
  techcards:      {sec:null,          ico:'', lbl:'Тех. карты'},
  'chef-calc':    {sec:null,          ico:'', lbl:'Калькулятор'},
  'sup-products': {sec:null,          ico:'', lbl:'Мои товары'},
  'sup-dashboard':{sec:'Поставщик',   ico:'', lbl:'Дашборд'},
  'sup-orders':   {sec:null,          ico:'', lbl:'Входящие заказы',  badge:'sup'},
  'sup-analytics':{sec:null,          ico:'', lbl:'Аналитика'},
  cart:           {sec:null,          ico:'', lbl:'Корзина (legacy)'},
};
const PT={order:'Заказ и Корзина',tender:'Тендер',owner:'Панель владельца',admin:'Управление пользователями',dashboard:'Дашборд',catalog:'Каталог товаров',cart:'Корзина',favorites:'Избранное',orders:'История заказов',suppliers:'Поставщики',analytics:'Аналитика','tender':'Тендер',techcards:'Технологические карты','chef-calc':'Калькулятор','sup-dashboard':'Панель поставщика','sup-products':'Мои товары','sup-orders':'Входящие заказы','sup-analytics':'Аналитика продаж'};
const OWNER_EMAIL_HINTS=['owner@provision.ru','michaelkeepcalm@gmail.com','keepcalm3300@gmail.com','michaelkeepcalm3300gmail.com','keepcalm3300gmail.com','keepcalm3300gmail.com@MacBook-Air-Mihail.local'];
function isOwnerUser(u){
  if(!u) return false;
  if(u.role==='owner') return true;
  var email=String(u.email||'').toLowerCase();
  if(!email) return false;
  return OWNER_EMAIL_HINTS.some(function(h){
    h=String(h||'').toLowerCase();
    return email===h || email.indexOf(h)>=0 || h.indexOf(email)>=0;
  });
}
function _uniqList(list){
  return Array.from(new Set((Array.isArray(list)?list:[]).filter(Boolean).map(function(v){ return String(v).trim(); }).filter(Boolean)));
}
function _normalizeOrgKey(value){
  return String(value||'').trim().toLowerCase();
}
function _legalEntityId(orgKey, name){
  return _normalizeOrgKey(orgKey||'org')+'::'+String(name||'').trim().toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,'');
}
function getCurrentOrganizationKey(user){
  var u = user || CU || null;
  var rest = getCurrentOrderRestaurantMeta ? getCurrentOrderRestaurantMeta() : null;
  if(rest && rest.brandName) return _normalizeOrgKey(rest.brandName);
  if(rest && rest.legalName) return _normalizeOrgKey(rest.legalName);
  if(rest && rest.name) return _normalizeOrgKey(rest.name);
  if(activeRest && activeRest.id && activeRest.id !== 'r0'){
    var db = dbGet();
    var rest2 = (db.restaurants || []).find(function(r){ return r.id === activeRest.id; });
    if(rest2) return _normalizeOrgKey(rest2.brandName || rest2.legalName || rest2.name || activeRest.name || '');
  }
  if(isOwnerUser(u) && u && u.company) return _normalizeOrgKey(u.company);
  if(u && u.company) return _normalizeOrgKey(u.company);
  return 'default';
}
function getPriceImportOrganizationKey(user){
  var u = user || CU || null;
  if(u && u.company) return _normalizeOrgKey(u.company);
  var rest = getCurrentOrderRestaurantMeta ? getCurrentOrderRestaurantMeta() : null;
  if(rest && rest.brandName) return _normalizeOrgKey(rest.brandName);
  if(rest && rest.legalName) return _normalizeOrgKey(rest.legalName);
  if(rest && rest.name) return _normalizeOrgKey(rest.name);
  if(activeRest && activeRest.id && activeRest.id !== 'r0'){
    var db = dbGet();
    var rest2 = (db.restaurants || []).find(function(r){ return r.id === activeRest.id; });
    if(rest2) return _normalizeOrgKey(rest2.brandName || rest2.legalName || rest2.name || activeRest.name || '');
  }
  return getCurrentOrganizationKey(u);
}
function getOrgLegalEntityNames(db, orgKey){
  db = db || dbGet();
  var allowedRestIds = CU && CU.role === 'owner'
    ? (db.restaurants || []).filter(function(rest){ return rest.id !== 'r0'; }).map(function(rest){ return rest.id; })
    : getUserScopedRestaurantIds(CU, db);
  var names = [];
  (db.restaurants || []).forEach(function(rest){
    if(!rest || rest.id === 'r0') return;
    if(allowedRestIds.indexOf(rest.id) < 0) return;
    var legal = Array.isArray(rest.assignedLegalEntities) && rest.assignedLegalEntities.length
      ? rest.assignedLegalEntities
      : (rest.legalEntities && rest.legalEntities.length ? rest.legalEntities : (rest.legalName ? [rest.legalName] : []));
    legal.forEach(function(name){
      if(name && names.indexOf(name) < 0) names.push(name);
    });
  });
  return _uniqList(names);
}
function getCurrentLegalEntityNames(){
  var orderLegals = Array.isArray(_orderLegalEntityNames) && _orderLegalEntityNames.length ? _orderLegalEntityNames : [];
  if(orderLegals.length) return _uniqList(orderLegals);
  var tenderLegals = Array.isArray(_tenderLegalEntityNames) && _tenderLegalEntityNames.length ? _tenderLegalEntityNames : [];
  if(tenderLegals.length) return _uniqList(tenderLegals);
  var rest = getCurrentOrderRestaurantMeta ? getCurrentOrderRestaurantMeta() : null;
  if(rest) return getRestLegalEntities(rest);
  if(activeRest && activeRest.id && activeRest.id !== 'r0'){
    var db = dbGet();
    var rest2 = (db.restaurants || []).find(function(r){ return r.id === activeRest.id; });
    if(rest2) return getRestLegalEntities(rest2);
  }
  return [];
}
function _getCurrentPriceScope(){
  var legalNames = getCurrentLegalEntityNames();
  var orgKey = getCurrentOrganizationKey(CU);
  return {
    organizationId: orgKey,
    legalEntityNames: legalNames,
    legalEntityIds: legalNames.map(function(name){ return _legalEntityId(orgKey, name); })
  };
}
function _supplierImportLegalSelection(){
  var ids = getSelectedSupPriceLegalIds ? getSelectedSupPriceLegalIds() : [];
  var names = getSelectedSupPriceLegalNames ? getSelectedSupPriceLegalNames() : [];
  if(!ids.length && _supPriceImportState && Array.isArray(_supPriceImportState.legalEntityIds) && _supPriceImportState.legalEntityIds.length){
    ids = _supPriceImportState.legalEntityIds.slice();
  }
  if(!names.length && _supPriceImportState && Array.isArray(_supPriceImportState.legalEntityNames) && _supPriceImportState.legalEntityNames.length){
    names = _supPriceImportState.legalEntityNames.slice();
  }
  return {
    organizationId: getPriceImportOrganizationKey(CU),
    legalEntityIds: _uniqList(ids),
    legalEntityNames: _uniqList(names)
  };
}
function _supplierImportCaptureLegalState(){
  var sel = _supplierImportLegalSelection();
  _supPriceImportState.organizationId = sel.organizationId;
  _supPriceImportState.legalEntityIds = sel.legalEntityIds.slice();
  _supPriceImportState.legalEntityNames = sel.legalEntityNames.slice();
  return sel;
}
function _supplierImportHasLegalSelection(){
  var sel = _supplierImportLegalSelection();
  return !!(sel.legalEntityIds.length || sel.legalEntityNames.length);
}
function _supplierImportPriceListId(supName, priceName, orgKey){
  if(_supPriceImportState && _supPriceImportState.priceListId) return _supPriceImportState.priceListId;
  var suffix = Math.random().toString(36).slice(2, 8);
  var base = [
    'plist',
    _normalizeOrgKey(orgKey || getPriceImportOrganizationKey(CU) || 'default'),
    String(supName || '').trim().toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,''),
    String(priceName || '').trim().toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,''),
    String(Date.now()),
    suffix
  ].filter(Boolean).join('::');
  _supPriceImportState.priceListId = base;
  return base;
}
function _supplierImportCreateOrUpdateList(meta, extra){
  extra = extra || {};
  SUP_PRICE_LISTS = Array.isArray(SUP_PRICE_LISTS) ? SUP_PRICE_LISTS.slice() : [];
  var now = new Date().toISOString();
  var existingIdx = SUP_PRICE_LISTS.findIndex(function(list){ return list && list.id === meta.id; });
  var rec = Object.assign({}, existingIdx >= 0 ? SUP_PRICE_LISTS[existingIdx] : {}, {
    id: meta.id,
    organizationId: meta.organizationId || '',
    supplierName: meta.supplierName || '',
    priceName: meta.priceName || '',
    legalEntityIds: _uniqList(meta.legalEntityIds || []),
    legalEntityNames: _uniqList(meta.legalEntityNames || []),
    sourceFile: extra.sourceFile || '',
    comment: extra.comment || '',
    active: extra.active !== false,
    uploadedAt: extra.uploadedAt || now,
    updatedAt: now
  });
  if(existingIdx >= 0) SUP_PRICE_LISTS[existingIdx] = rec; else SUP_PRICE_LISTS.push(rec);
  var selected = _uniqList(rec.legalEntityIds || []);
  if(selected.length){
    SUP_PRICE_LISTS = SUP_PRICE_LISTS.map(function(list){
      if(!list || list.id === rec.id) return list;
      if(_normalizeOrgKey(list.organizationId) !== _normalizeOrgKey(rec.organizationId)) return list;
      if(String(list.supplierName || '').toLowerCase() !== String(rec.supplierName || '').toLowerCase()) return list;
      var listIds = _uniqList(list.legalEntityIds || []);
      var overlap = listIds.some(function(id){ return selected.indexOf(id) >= 0; });
      if(!overlap) return list;
      return Object.assign({}, list, { active: false, updatedAt: now });
    });
  }
  return rec;
}
function _supplierImportSyncPriceListLegals(priceListId, organizationId, legalEntityIds, legalEntityNames){
  var rows = [];
  var ids = _uniqList(legalEntityIds);
  var names = _uniqList(legalEntityNames);
  ids.forEach(function(id, idx){
    rows.push({
      id: priceListId + '::' + id,
      priceListId: priceListId,
      organizationId: organizationId || '',
      legalEntityId: id,
      legalEntityName: names[idx] || names[0] || id
    });
  });
  SUP_PRICE_LIST_LEGALS = (Array.isArray(SUP_PRICE_LIST_LEGALS) ? SUP_PRICE_LIST_LEGALS.filter(function(row){
    return row && row.priceListId !== priceListId;
  }) : []).concat(rows);
  return rows;
}
function _supplierImportSyncPriceItems(priceListId, organizationId, rows){
  var items = [];
  (Array.isArray(rows) ? rows : []).forEach(function(row){
    items.push({
      id: priceListId + '::' + String(row.sourceRow || Date.now()),
      priceListId: priceListId,
      organizationId: organizationId || '',
      productId: row.productId || '',
      productName: row.name || '',
      nameInPrice: row.name || '',
      price: row.price1 || row.price || 0,
      unitId: row.unit || '',
      sourceRowNumber: row.sourceRow || 0,
      rawData: row.rawRow || row.rawData || {}
    });
  });
  SUP_PRICE_ITEMS = (Array.isArray(SUP_PRICE_ITEMS) ? SUP_PRICE_ITEMS.filter(function(row){
    return row && row.priceListId !== priceListId;
  }) : []).concat(items);
  return items;
}

// ── СЛОВАРИ ПАРСЕРА И ПОИСКА ─────────────────────────────────

var NAME_SYNONYMS = [
  'наименование товара','наименование продукта','наименование','название товара',
  'название продукта','название позиции','название','товар','наименование/марка',
  'продукт','продукция','позиция','номенклатура','описание','артикул и наименование',
  'name','product','item','description','goods','commodity','наим'
];

var UNIT_SYNONYMS = [
  'единица измерения','единица','ед. изм.','ед.изм.','ед.','ед',
  'единица изм','упаковка','фасовка','мера','unit','uom','u/m',
  'кг','г','шт','л','мл','пачка','бут','уп'
];

var PRICE_SYNONYMS = [
  'цена с ндс','цена с ндс (руб)','цена с ндс, руб','цена (с ндс)',
  'стоимость с ндс','итого с ндс','price with vat',
  'цена','цена за единицу','цена за ед','цена за кг','цена за шт',
  'цена/кг','цена/шт','цена, руб','цена руб','цена (руб.)','цена (руб)',
  'цена (₽)','стоимость','стоимость (руб)','закупочная цена',
  'розничная цена','price','cost','amount','rate','tariff','сумма',
  'цена без ндс','цена без ндс, руб','цена без ндс (руб)'
];

var PRODUCT_SYNONYMS = [
  ['томат черри','помидоры черри','томаты черри','помидор черри','черри томат'],
  ['томаты','помидоры','томат','помидор'],
  ['картофель чищенный','картофель в вакууме','картофель очищенный','картофель в/у','картофель п/ф'],
  ['говядина','говяжье мясо','говядина охл','говядина охлажденная','говядина б/к'],
  ['семга','лосось','сёмга охлажденная','семга охлажденная','лосось охлажденный','сёмга'],
  ['куриное филе','филе куриное','грудка куриная','куриная грудка','филе кур','грудь куриная'],
  ['курица','куриное филе','тушка куриная','курица целая'],
  ['масло сливочное','масло слив','сливочное масло','масло крестьянское'],
  ['молоко','молоко пастеризованное','молоко питьевое','молоко цельное'],
  ['сахар','сахар-песок','сахар белый','сахар песок','сахарный песок'],
  ['мука','мука пшеничная','мука пшен','мука в/с','мука высший сорт'],
  ['масло растительное','масло подсолнечное','масло раст','подсолнечное масло'],
  ['лук репчатый','лук','лук репч','лук репчатый свежий'],
  ['морковь','морковка','морковь свежая','морковь мытая'],
  ['свинина','свинина охлажденная','свинина б/к','мясо свиное'],
  ['сливки','сливки 33%','сливки 20%','сливки питьевые'],
  ['яйца','яйцо куриное','яйцо','яйца куриные'],
  ['перец болгарский','перец сладкий','болгарский перец','перец','перец красный'],
  ['огурцы','огурец','огурец свежий','огурцы свежие'],
  ['масло оливковое','оливковое масло','масло olive'],
];

var JUNK_PATTERNS = [
  /^итого/i,/^всего/i,/^примечание/i,/^примеч/i,/^склад/i,/^раздел/i,
  /^категория/i,/^группа/i,/^секция/i,/^тип/i,/^вид/i,
  /^прайс.лист/i,/^поставщик:/i,/^дата:/i,/^номер:/i,/^№/,
  /^nan$/i,/^n\/a$/i,/^#/,/^\s*$/
];

var UNIT_MAP = {
  'кг':'кг','kg':'кг','килограмм':'кг','кило':'кг','кг.':'кг',
  'г':'г','гр':'г','г.':'г','грамм':'г','g':'г',
  'шт':'шт','штука':'шт','штуки':'шт','штук':'шт','шт.':'шт','pcs':'шт','ед':'шт',
  'л':'л','литр':'л','литра':'л','литров':'л','l':'л','л.':'л',
  'мл':'мл','миллилитр':'мл','мл.':'мл','ml':'мл',
  'пачка':'пачка','пачек':'пачка','пач':'пачка','пач.':'пачка',
  'бут':'бут.','бутылка':'бут.','бут.':'бут.','бутылок':'бут.',
  'уп':'уп.','упак':'уп.','упаковка':'уп.','уп.':'уп.',
  'пор':'пор.','порция':'пор.','пор.':'пор.',
};

var UNIT_ALIASES = {
  'кг':'кг','кг.':'кг','kg':'кг','килограмм':'кг','килограмма':'кг','килограммов':'кг',
  'г':'г','гр':'г','гр.':'г','g':'г','грамм':'г','грамма':'г','граммов':'г',
  'шт':'шт','шт.':'шт','штук':'шт','штука':'шт','штуки':'шт','ед':'шт','ед.':'шт',
  'л':'л','l':'л','л.':'л','литр':'л','литра':'л','литров':'л',
  'мл':'мл','мл.':'мл','ml':'мл','миллилитр':'мл','миллилитра':'мл','миллилитров':'мл',
  'пачка':'пачка','пачек':'пачка','пачки':'пачка','пач':'пачка','пач.':'пачка',
  'бутылка':'бут.','бутылки':'бут.','бут':'бут.','бут.':'бут.','бутылок':'бут.',
  'уп':'уп.','уп.':'уп.','упаковка':'уп.','упаковки':'уп.','упаковок':'уп.','упак':'уп.',
  'пор':'пор.','порция':'пор.','порции':'пор.','порций':'пор.',
};


// ── ГЛОБАЛЬНЫЕ ДАННЫЕ ────────────────────────────────────────
let PRODUCTS   = [];
let SUP_PRODS  = [];
let SUPS_DATA  = [];
let SUP_PRICE_LISTS = [];
let SUP_PRICE_LIST_LEGALS = [];
let SUP_PRICE_ITEMS = [];
let ORDERS     = [];
let TECH_CARDS = [];
let ALL_SUPS   = [];
let selSups    = [];

const SM = {
  delivered:  ['bg','Доставлен'],
  transit:    ['bb','В пути'],
  processing: ['by','Обрабатывается'],
  cancelled:  ['br','Отменён']
};

// ── СОСТОЯНИЕ СЕССИИ ─────────────────────────────────────────
let CU = null, regTemp = null;
let cart = [], tenderChanges = [], tenderLoaded = false;
var cartComments = {};
var _supOrder    = [];
var _deletedItems = [];

// ── ФИЛЬТРЫ ───────────────────────────────────────────────────
let catFilter = 'all', ordFilter = 'all', tcFilter = 'all', ordersRestFilter = 'all';
let catSelectMode = false;
let catSelectedIds = [];
let activeRest = {id:'r0', name:'Все рестораны', emoji:'🌐'};

// ── СЧЁТЧИКИ И СОСТОЯНИЕ ФОРМ ────────────────────────────────
let tRC = 0, tcRC = 0, etcRC = 0, calcRC = 0;
let editTCId = null, editProdId = null, adTab = 'pending';
let sbC = false;

// ── СОСТОЯНИЕ ЗАГРУЗКИ ПРАЙСА ────────────────────────────────
var _currentSupName  = '';
var _supPriceAppend  = false;
var _mcmRows = [], _mcmSupName = '', _mcmAppend = false, _mcmPriceName = '';
var _priceLayoutMemory={};
var _mcmSupName='';
var _mcmAppend=false;
var _mcmPriceName='';

// ── СОСТОЯНИЕ ПОИСКА В КОРЗИНЕ ───────────────────────────────
var _cartSearchIdx = -1, _cartSearchSup = '';

// ── ТЕНДЕР ───────────────────────────────────────────────────
var _tenderActive        = false;
var _tenderRows          = [];
var _tspRowName          = '';
var _tspSupName          = '';



// ═══ БАЗА ДАННЫХ: Firebase REST API ═══
// Данные хранятся в облаке Google и общие для ВСЕХ устройств
// Вход пользователя работает с любого компьютера/телефона

var _FB_URL = 'https://restobaza-d2c05-default-rtdb.europe-west1.firebasedatabase.app/db.json';
var _dbCache = null;

function dbLoad(callback){
  var xhr = new XMLHttpRequest();
  xhr.open('GET', _FB_URL, true);
  xhr.timeout = 8000;
  xhr.onload = function(){
    if(xhr.status===200){
      try{
        var d = JSON.parse(xhr.responseText);
        if(d && Array.isArray(d.users)){
          d = _migrateOwner(d);
          _dbCache = d;
          // Загрузить прайсы и каталог из Firebase если есть
          if(Array.isArray(d.supProds) && d.supProds.length > 0){
            SUP_PRODS = d.supProds;
          }
          if(Array.isArray(d.supsData) && d.supsData.length > 0){
            SUPS_DATA = d.supsData;
          }
          if(Array.isArray(d.products) && d.products.length > 0){
            PRODUCTS = d.products;
          }
          if(Array.isArray(d.supplierPriceLists) && d.supplierPriceLists.length > 0){
            SUP_PRICE_LISTS = d.supplierPriceLists;
          }
          if(Array.isArray(d.supplierPriceListLegals) && d.supplierPriceListLegals.length > 0){
            SUP_PRICE_LIST_LEGALS = d.supplierPriceListLegals;
          }
          if(Array.isArray(d.supplierPriceItems) && d.supplierPriceItems.length > 0){
            SUP_PRICE_ITEMS = d.supplierPriceItems;
          }
          if(Array.isArray(d.priceImportBatches) && d.priceImportBatches.length > 0){
            window.priceImportBatches = d.priceImportBatches;
          }
          if(Array.isArray(d.priceImportItems) && d.priceImportItems.length > 0){
            window.priceImportItems = d.priceImportItems;
          }
          if(Array.isArray(d.supplierImportTemplates) && d.supplierImportTemplates.length > 0){
            window.supplierImportTemplates = d.supplierImportTemplates;
          }
          if(Array.isArray(d.orders) && d.orders.length > 0){
            ORDERS = d.orders;
          }
          if(Array.isArray(d.techCards) && d.techCards.length > 0){
            TECH_CARDS = d.techCards;
          }
          try{ localStorage.setItem('pv_cache', JSON.stringify(d)); }catch(e){}
          if(callback) callback();
          return;
        }
        if(xhr.responseText === 'null'){
          _dbCache = _getDefaults();
          _writeToFirebase(_dbCache, function(){ if(callback) callback(); });
          return;
        }
      }catch(e){}
    }
    // Fallback — localStorage
    var local = _getLocal();
    _dbCache = _migrateOwner(local);
    if(Array.isArray(local.supProds)) SUP_PRODS = local.supProds;
    if(Array.isArray(local.supsData)) SUPS_DATA = local.supsData;
    if(Array.isArray(local.products)) PRODUCTS = local.products;
    if(Array.isArray(local.supplierPriceLists)) SUP_PRICE_LISTS = local.supplierPriceLists;
    if(Array.isArray(local.supplierPriceListLegals)) SUP_PRICE_LIST_LEGALS = local.supplierPriceListLegals;
    if(Array.isArray(local.supplierPriceItems)) SUP_PRICE_ITEMS = local.supplierPriceItems;
    if(Array.isArray(local.priceImportBatches)) window.priceImportBatches = local.priceImportBatches;
    if(Array.isArray(local.priceImportItems)) window.priceImportItems = local.priceImportItems;
    if(Array.isArray(local.supplierImportTemplates)) { _dbCache.supplierImportTemplates = local.supplierImportTemplates; window.supplierImportTemplates = local.supplierImportTemplates; }
    if(Array.isArray(local.orders))   ORDERS   = local.orders;
  if(Array.isArray(local.techCards)) TECH_CARDS = local.techCards;
    if(callback) callback();
  };
  xhr.ontimeout = xhr.onerror = function(){
    var local = _getLocal();
    _dbCache = _migrateOwner(local);
    if(Array.isArray(local.supProds)) SUP_PRODS = local.supProds;
    if(Array.isArray(local.supsData)) SUPS_DATA = local.supsData;
    if(Array.isArray(local.products)) PRODUCTS = local.products;
    if(Array.isArray(local.supplierPriceLists)) SUP_PRICE_LISTS = local.supplierPriceLists;
    if(Array.isArray(local.supplierPriceListLegals)) SUP_PRICE_LIST_LEGALS = local.supplierPriceListLegals;
    if(Array.isArray(local.supplierPriceItems)) SUP_PRICE_ITEMS = local.supplierPriceItems;
    if(Array.isArray(local.priceImportBatches)) window.priceImportBatches = local.priceImportBatches;
    if(Array.isArray(local.priceImportItems)) window.priceImportItems = local.priceImportItems;
    if(Array.isArray(local.supplierImportTemplates)) { _dbCache.supplierImportTemplates = local.supplierImportTemplates; window.supplierImportTemplates = local.supplierImportTemplates; }
    if(Array.isArray(local.orders))   ORDERS   = local.orders;
    if(callback) callback();
  };
  xhr.send();
}
function _migrateOwner(d){
  if(!d || !Array.isArray(d.users)) return d;
  if(!Array.isArray(d.orgInvites)) d.orgInvites=[];
  for(var i=0; i<d.users.length; i++){
    var u = d.users[i];
    if(u && u.role === 'owner'){
      if(!u.status) u.status = 'active';
      if(!u.first) u.first = 'Owner';
      if(!u.last) u.last = 'Account';
    }
  }
  return d;
}

function _writeToFirebase(d, cb){
  var xhr = new XMLHttpRequest();
  xhr.open('PUT', _FB_URL, true);
  xhr.setRequestHeader('Content-Type','application/json');
  xhr.onload = xhr.onerror = function(){ if(cb) cb(); };
  xhr.send(JSON.stringify(d));
}

function dbGet(){
  if(!_dbCache) _dbCache = _getLocal();
  syncRolePagesFromDb(_dbCache);
  return _dbCache;
}

function syncRolePagesFromDb(db){
  db=db||_dbCache;
  var stored=db&&db.platformSettings&&db.platformSettings.rolePages&&typeof db.platformSettings.rolePages==='object'
    ? db.platformSettings.rolePages
    : null;
  Object.keys(ROLES).forEach(function(roleKey){
    var fallback=(ROLE_DEFAULT_PAGES[roleKey]||[]).slice();
    var saved=stored&&Array.isArray(stored[roleKey]) ? stored[roleKey].filter(Boolean) : null;
    ROLES[roleKey].pages=(saved&&saved.length ? saved : fallback).slice();
  });
}

function dbSet(d){
  // Включаем прайсы и каталог в сохраняемый объект
  d.supProds = SUP_PRODS;
  d.supsData = SUPS_DATA;
  d.products = PRODUCTS;
  d.supplierPriceLists = SUP_PRICE_LISTS;
  d.supplierPriceListLegals = SUP_PRICE_LIST_LEGALS;
  d.supplierPriceItems = SUP_PRICE_ITEMS;
  d.supplierImportTemplates = Array.isArray(window.supplierImportTemplates) ? window.supplierImportTemplates : (Array.isArray(d.supplierImportTemplates) ? d.supplierImportTemplates : []);
  d.priceImportBatches = Array.isArray(window.priceImportBatches) ? window.priceImportBatches : (Array.isArray(d.priceImportBatches) ? d.priceImportBatches : []);
  d.priceImportItems = Array.isArray(window.priceImportItems) ? window.priceImportItems : (Array.isArray(d.priceImportItems) ? d.priceImportItems : []);
  d.orders   = ORDERS;
  d.techCards = TECH_CARDS;
  _dbCache = d;
  try{ localStorage.setItem('pv_cache', JSON.stringify(d)); }catch(e){}
  _writeToFirebase(d, null);
}
function dbSave(d){ dbSet(d); }

function _getLocal(){
  try{
    var r = localStorage.getItem('pv_cache');
    if(r){ var d=JSON.parse(r); if(d&&Array.isArray(d.users)) return d; }
  }catch(e){}
  return _getDefaults();
}

function _getDefaults(){
  return {
    users:[
      {id:'u1',first:'Owner',last:'Account',company:'КальКа',
       email:'bootstrap-owner@local.invalid',pass:'__disabled__',role:'owner',
       status:'blocked',ev:false,created:'2026-01-01',bootstrapOnly:true}
    ],
    restaurants:[],
    supplierPriceLists:[],
    supplierPriceListLegals:[],
    supplierPriceItems:[],
    priceImportBatches:[],
    priceImportItems:[],
    orgInvites:[],
    audit:[{ts:new Date().toLocaleString('ru'),user:'Система',
            action:'Инициализация',page:'-'}],
    systemLog:[{ts:new Date().toLocaleString('ru'),type:'system',severity:'info',title:'Инициализация',details:'Платформа создана',source:'core'}],
    platformSettings:{},
    companySettings:{},
    supplierImportTemplates:[],
    supplierRatings:{},
    userFavorites:{}
  };
}
function v(id){return(document.getElementById(id)?.value||'').trim();}
function isEmail(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
function today(){return new Date().toISOString().slice(0,10);}
function dlFile(c,m,n){const b=new Blob([c],{type:m});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=n;a.click();}
function minP(p){return p.suppliers.length?Math.min(...p.suppliers.map(s=>s.price)):0;}
function maxP(p){return p.suppliers.length?Math.max(...p.suppliers.map(s=>s.price)):0;}
function sav(p){return p.suppliers.length>1?maxP(p)-minP(p):0;}
function curP(pid){const t=tenderChanges.find(x=>x.pid===pid);if(t)return t.newPrice;const p=PRODUCTS.find(x=>x.id===pid);return p?minP(p):0;}
function logAudit(user,action,page){const db=dbGet();db.audit.unshift({ts:new Date().toLocaleString('ru'),user,action,page});if(db.audit.length>100)db.audit.pop();dbSet(db);try{if(document.getElementById('pg-owner')?.classList.contains('on'))renderOwner();}catch(e){}}
function auditActor(){return (((CU&&CU.first)||'')+' '+((CU&&CU.last)||'')).trim()||'Система';}
function logSystemEvent(type,title,details,severity,source){
  var db=dbGet();
  if(!Array.isArray(db.systemLog)) db.systemLog=[];
  db.systemLog.unshift({
    ts:new Date().toLocaleString('ru'),
    type:type||'system',
    severity:severity||'info',
    title:title||'Событие',
    details:details||'',
    source:source||'core'
  });
  if(db.systemLog.length>200) db.systemLog.pop();
  dbSet(db);
  try{
    if(document.getElementById('pg-owner')?.classList.contains('on')) renderOwner();
    if(document.getElementById('ov-systemLog')?.classList.contains('on')) renderSystemLog();
  }catch(e){}
}

function scSw(s){
  var auth=document.getElementById('AUTH');
  var app=document.getElementById('APP');
  if(s==='Login'||s==='login'){
    if(auth){auth.classList.remove('gone');}
    if(app){app.classList.remove('on');}
  } else {
    if(auth){auth.classList.add('gone');}
    if(app){app.classList.add('on');}
  }
}

function getSupplierRatingsStore(){
  var db=dbGet();
  if(!db.supplierRatings || typeof db.supplierRatings!=='object') db.supplierRatings={};
  return db.supplierRatings;
}

function getSupplierRatingSummary(supName){
  var store=getSupplierRatingsStore();
  var supplierStore=store[supName] && typeof store[supName]==='object' ? store[supName] : {};
  var values=Object.values(supplierStore).map(function(v){ return Number(v)||0; }).filter(function(v){ return v>=1 && v<=5; });
  var count=values.length;
  var average=count ? values.reduce(function(sum,v){ return sum+v; },0)/count : 0;
  var mine=CU && supplierStore[CU.id] ? Number(supplierStore[CU.id])||0 : 0;
  return {
    average:average,
    count:count,
    mine:mine
  };
}

function formatSupplierRatingAverage(value){
  return value ? value.toFixed(1).replace('.',',') : '—';
}

function getUserFavorites(user){
  if(!user || !user.id) return {pages:[],suppliers:[],note:''};
  var db=dbGet();
  if(!db.userFavorites || typeof db.userFavorites!=='object') db.userFavorites={};
  if(!db.userFavorites[user.id] || typeof db.userFavorites[user.id]!=='object'){
    db.userFavorites[user.id]={pages:[],suppliers:[],note:''};
  }
  var fav=db.userFavorites[user.id];
  if(!Array.isArray(fav.pages)) fav.pages=[];
  if(!Array.isArray(fav.suppliers)) fav.suppliers=[];
  if(typeof fav.note!=='string') fav.note='';
  return fav;
}

function saveUserFavorites(user, updater){
  if(!user || !user.id) return;
  var db=dbGet();
  var current=getUserFavorites(user);
  var next=typeof updater==='function' ? (updater(Object.assign({}, current, {
    pages:(current.pages||[]).slice(),
    suppliers:(current.suppliers||[]).slice(),
    note:current.note||''
  })) || current) : current;
  if(!db.userFavorites || typeof db.userFavorites!=='object') db.userFavorites={};
  db.userFavorites[user.id]=next;
  dbSet(db);
}

function getFavoritesCount(user){
  var fav=getUserFavorites(user);
  return (fav.pages||[]).length + (fav.suppliers||[]).length;
}

function toggleFavoritePage(page){
  if(!CU) return;
  saveUserFavorites(CU, function(fav){
    var idx=fav.pages.indexOf(page);
    if(idx>=0) fav.pages.splice(idx,1);
    else fav.pages.push(page);
    return fav;
  });
  updBdg();
  renderFavorites();
  toast('Избранное обновлено','ok');
}

function toggleFavoriteSupplier(supName){
  if(!CU) return;
  saveUserFavorites(CU, function(fav){
    var idx=fav.suppliers.indexOf(supName);
    if(idx>=0) fav.suppliers.splice(idx,1);
    else fav.suppliers.push(supName);
    return fav;
  });
  updBdg();
  renderFavorites();
  renderSuppliers();
  toast('Избранное обновлено','ok');
}

function saveFavoritesNote(){
  if(!CU) return;
  var note=(document.getElementById('favNote')||{value:''}).value||'';
  saveUserFavorites(CU, function(fav){
    fav.note=note;
    return fav;
  });
  toast('Личная заметка сохранена','ok');
}

function renderSupplierRatingStars(supName, activeValue){
  var current=Number(activeValue)||0;
  return [1,2,3,4,5].map(function(star){
    var filled=star<=current;
    return '<button type="button" onclick="event.stopPropagation();setSupplierRating(\''+String(supName).replace(/'/g,"\\'")+'\','+star+')"'
      +' style="border:none;background:none;padding:0;cursor:pointer;font-size:18px;line-height:1;color:'+(filled?'#f5b301':'#c7ced8')+';">'
      +(filled?'★':'☆')
      +'</button>';
  }).join('');
}

function setSupplierRating(supName, value){
  if(!CU || !CU.id){
    toast('Войдите в систему, чтобы поставить оценку','err');
    return;
  }
  var stars=Math.max(1, Math.min(5, Number(value)||0));
  if(!stars) return;
  var db=dbGet();
  var store=getSupplierRatingsStore();
  if(!store[supName] || typeof store[supName]!=='object') store[supName]={};
  store[supName][CU.id]=stars;
  db.supplierRatings=store;
  var summary=getSupplierRatingSummary(supName);
  SUPS_DATA.forEach(function(s){
    if(s && s.name===supName){
      s.rating=summary.average ? Number(summary.average.toFixed(1)) : 0;
      s.ratingVotes=summary.count;
    }
  });
  dbSet(db);
  if(typeof renderCatalog==='function') renderCatalog();
  if(typeof renderSuppliers==='function') renderSuppliers();
  if(_catalogSupplierId===supName) renderCatalogSupplierCard();
  toast('Оценка поставщику сохранена','ok');
}
function eyeT(id,btn){const e=document.getElementById(id);if(!e)return;e.type=e.type==='password'?'text':'password';btn.textContent=e.type==='password'?'👁':'🙈';}

function doLogin(){
  if(window.KalkaApp && window.KalkaApp.supabase && window.KalkaApp.supabase.isEnabled && window.KalkaApp.supabase.isEnabled()){
    var authErr=document.getElementById('liErr');
    if(authErr) authErr.textContent='Авторизация выполняется через защищённый Supabase Auth';
    return;
  }
  var er=document.getElementById('liErr'); er.textContent='';
  var em=(document.getElementById('liE').value||'').trim().toLowerCase();
  var pw=document.getElementById('liP').value||'';
  if(!em||!pw){er.textContent='Заполните email и пароль';return;}
  if(!isEmail(em)){er.textContent='Введите корректный email';return;}
  var btn=document.getElementById('loginBtn');
  if(btn){btn.textContent='Входим...';btn.disabled=true;}
  function done(){if(btn){btn.textContent='Войти в систему \u2192';btn.disabled=false;}}
  function check(db){
    done();
    if(!db||!Array.isArray(db.users)){er.textContent='Ошибка базы данных. Попробуйте ещё раз.';return;}
    var u=null;
    for(var i=0;i<db.users.length;i++){
      var usr=db.users[i];
      if(usr&&usr.email&&usr.email.toLowerCase()===em&&usr.pass===pw){u=usr;break;}
    }
    if(!u){er.textContent='Неверный email или пароль';return;}
    if(u.status==='blocked'){er.textContent='Аккаунт заблокирован';return;}
    if(u.status!=='active'){er.textContent='Аккаунт неактивен. Обратитесь к администратору.';return;}
    enterApp(u);
  }
  // Always load fresh from Firebase
  var xhr=new XMLHttpRequest();
  xhr.open('GET',_FB_URL,true); xhr.timeout=7000;
  xhr.onload=function(){
    if(xhr.status===200){
      try{var d=JSON.parse(xhr.responseText);if(d&&Array.isArray(d.users)){_dbCache=d;try{localStorage.setItem('pv_cache',JSON.stringify(d));}catch(e){}check(d);return;}}catch(e){}
    }
    check(dbGet());
  };
  xhr.ontimeout=xhr.onerror=function(){check(dbGet());};
  xhr.send();
}
function renderDemoG(){}
function demoLogin(uid){const u=dbGet().users.find(x=>x.id===uid);if(u&&u.status==='active')enterApp(u);}
function updPendBadge(){
  var db=dbGet();
  var cnt=db.users.filter(function(u){return u.status==='pending';}).length;
  // Always update the badge counter
  var el=document.getElementById('pendCnt');
  if(el) el.textContent=cnt;
  // Highlight the Заявки button
  var tb=document.getElementById('tabPend');
  if(tb){ tb.style.borderColor=cnt>0?'var(--rd)':''; tb.style.color=cnt>0?'var(--rd)':''; }
  // Show push notification only when admin/owner is logged in
  if(cnt>0 && CU && (CU.role==='owner'||CU.role==='admin')){
    var names=db.users.filter(function(u){return u.status==='pending';}).map(function(u){return u.first+' '+u.last+' ('+u.email+')';});
    showPush('warn','👤 Заявки на одобрение ('+cnt+')','',
      names.join('<br>')+'<br><br><button onclick="goPage(\'admin\');adSw(\'pending\');closeAllPush();" style="background:var(--ac);color:#000;border:none;border-radius:5px;padding:7px 14px;cursor:pointer;font-weight:700;font-size:13px;">Открыть заявки →</button>');
  }
}
function closeAllPush(){document.querySelectorAll('.push').forEach(function(p){p.remove();});}

function enterApp(u){
  CU=u;
  // Применить личные скрытые поставщики
  setTimeout(function(){updatePersonalHiddenSups();},100);
  document.getElementById('AUTH').classList.add('gone');
  document.getElementById('APP').classList.add('on');
  setupUI(u);
  logAudit(u.first+' '+u.last,'Вход в систему','—');
  setTimeout(function(){
    renderOrgInviteBadge();
    notifyPendingOrgInvites();
  },150);
  if(['owner','admin'].includes(u.role)){
    setTimeout(function(){updPendBadge();},800);
    if(window._pPoll)clearInterval(window._pPoll);
    window._pPoll=setInterval(function(){updPendBadge();},30000);
  }
}
function setupUI(u){
  const rd=ROLES[u.role]||{};const tc=['owner','chef','buyer'].includes(u.role)?'#000':'#fff';
  const av=document.getElementById('sbAva');av.style.background=`linear-gradient(135deg,${rd.color},${rd.color}88)`;av.style.color=tc;av.textContent=(u.first[0]+u.last[0]).toUpperCase();
  document.getElementById('sbName').textContent=u.first+' '+u.last;document.getElementById('sbRole').textContent=u.company;
  const isS=u.role==='supplier',isAcc=u.role==='accountant';
  const scopedRestaurants=getUserScopedRestaurantIds(u, dbGet());
  document.getElementById('cartBtn').style.display=(!isS&&!isAcc)?'flex':'none';
  document.getElementById('favBtn').style.display=(!isS&&!isAcc)?'flex':'none';
  document.getElementById('tbSearch').style.display=isS?'none':'flex';
  document.getElementById('restBtn').style.display=(!isS && (['owner','admin','manager'].includes(u.role) || scopedRestaurants.length>1))?'flex':'none';
  const ta=document.getElementById('topAct');
  if(u.role==='supplier')                        {ta.textContent='+ Товар';            ta.onclick=()=>openModal('addProduct');}
  else if(['chef','manager','admin'].includes(u.role)){ta.textContent='+ Тех. карта';  ta.onclick=()=>openModal('newTC');}
  else if(u.role==='owner')                      {ta.textContent='🛡 Панель владельца';ta.onclick=()=>goPage('owner');}
  else                                           {ta.textContent='+ Заказ';            ta.onclick=()=>openModal('newOrder');}
  buildNav(u);
  renderOrgInviteBadge();
  var firstPage=((ROLES[u.role]||{}).pages||[]).find(function(pg){ return canAccessPage(u, pg); })||'dashboard';
  if(!canAccessPage(u, firstPage)) firstPage='orders';
  goPage(firstPage);
  renderDemoG();
}
function doLogout(){
  CU=null;cart=[];
  if(window._pPoll){clearInterval(window._pPoll);window._pPoll=null;}
  document.getElementById('APP').classList.remove('on');
  document.getElementById('AUTH').classList.remove('gone');
  ['liE','liP'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('liErr').textContent='';
  scSw('Login');renderDemoG();
}

function toggleSB(){sbC=!sbC;document.getElementById('SB').classList.toggle('slim',sbC);document.getElementById('sbTog').textContent=sbC?'›':'‹';}
function buildNav(u){
  if(isOwnerUser(u)) u = Object.assign({}, u, { role:'owner', status:'active' });
  const basePages=((ROLES[u.role]||{}).pages||[]).slice();
  const rawPages=(u.role==='admin'&&ownerGetSettings().adminAdvanced&&basePages.indexOf('owner')<0)?['owner'].concat(basePages):basePages;
  const pages=rawPages.filter(function(pg){ return pg!=='dashboard' || userCanSeeDashboard(u); });
  let html='',lastSec=null;
  pages.forEach(pg=>{
    const m=PM[pg]||{sec:null,ico:'•',lbl:pg};
    if(m.sec&&m.sec!==lastSec){html+=`<div class="sb-sec">${m.sec}</div>`;lastSec=m.sec;}
    let badge='';
    if(m.badge==='cart')   badge=`<span class="sb-bdg" id="navCB" style="background:var(--or);color:#fff;">0</span>`;
    if(m.badge==='fav')    badge=`<span class="sb-bdg" id="navFB" style="background:var(--yl);color:#000;">0</span>`;
    if(m.badge==='tender') badge=`<span class="sb-bdg" id="navTB" style="background:var(--rd);color:#fff;display:none;">!</span>`;
    if(m.badge==='sup')    badge=`<span class="sb-bdg" style="background:var(--rd);color:#fff;">2</span>`;
    html+=`<div class="sb-item" data-page="${pg}" onclick="goPage('${pg}')"><span class="sb-ico">${m.ico}</span><span class="sb-lbl">${m.lbl}</span>${badge}<span class="sb-tip">${m.lbl}</span></div>`;
  });
  document.getElementById('sbNav').innerHTML=html;
}
function goPage(pg){
  if(!CU)return;
  if(isOwnerUser(CU)) CU = Object.assign({}, CU, { role:'owner', status:'active' });
  if(!canAccessPage(CU, pg)){toast('🚫 Нет доступа к этому разделу','err');return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.remove('on'));
  document.getElementById('pg-'+pg)?.classList.add('on');
  document.querySelectorAll(`[data-page="${pg}"]`).forEach(i=>i.classList.add('on'));
  document.getElementById('topTitle').textContent=PT[pg]||pg;
  const R={order:renderOrder,dashboard:renderDash,catalog:renderCatalog,cart:renderCart,favorites:renderFavorites,orders:renderOrders,suppliers:renderSuppliers,analytics:renderAnalytics,tender:renderTender,techcards:renderTechCards,'chef-calc':initCalc,'sup-products':renderSupProducts,'sup-orders':renderSupOrders,'sup-analytics':renderSupAnalytics,'sup-dashboard':renderSupDash,admin:renderAdmin,restaurants:renderRestaurants,owner:renderOwner};
  if(R[pg])R[pg]();
}
function getDashboardOrders(){
  ensureDashboardRestSelection();
  var orders=(ORDERS||[]).slice();
  if(CU && normalizeDashboardAccess(CU).scope!=='all_orgs' && CU.role!=='owner'){
    var allowedIds=getUserDashboardRestaurantIds(CU);
    orders=orders.filter(function(order){
      return allowedIds.indexOf(String(order.restId||''))>=0;
    });
  }
  if(activeRest && activeRest.id && activeRest.id!=='r0'){
    orders=orders.filter(function(order){
      return String(order.restId||'')===String(activeRest.id) || String(order.rest||'')===String(activeRest.name||'');
    });
  }
  return orders;
}
function getOrderSupplierName(order){
  return order.supplierName || String(order.sup||'').replace(/^[^\s]+\s+/,'').trim() || '—';
}
function getOrderItemNames(order){
  if(Array.isArray(order.itemsDetailed) && order.itemsDetailed.length){
    return order.itemsDetailed.map(function(item){ return String(item.name||'').trim(); }).filter(Boolean);
  }
  return String(order.items||'').split(',').map(function(item){ return item.trim(); }).filter(Boolean);
}
function getPeriodThreshold(days){
  if(!days || days<=0) return 0;
  return Date.now()-days*24*60*60*1000;
}
function getOrdersForPeriod(orders, days){
  var threshold=getPeriodThreshold(days);
  return (orders||[]).filter(function(order){
    if(!threshold) return true;
    var time=_parseOrderDateValue(order.date);
    return !time || time>=threshold;
  });
}
function getOrdersForMonths(orders, months){
  var count=parseInt(months,10)||0;
  if(!count) return (orders||[]).slice();
  var start=new Date();
  start.setHours(0,0,0,0);
  start.setDate(1);
  start.setMonth(start.getMonth()-(count-1));
  var threshold=start.getTime();
  return (orders||[]).filter(function(order){
    var time=_parseOrderDateValue(order.date);
    return !time || time>=threshold;
  });
}
function getOrganizationTurnoverRows(orders){
  var totals={};
  (orders||[]).forEach(function(order){
    var key=String(order.rest||'Без организации');
    totals[key]=(totals[key]||0)+(Number(order.sum)||0);
  });
  return Object.entries(totals).sort(function(a,b){ return b[1]-a[1]; });
}
function getSupplierTurnoverSummary(supplierName, orders){
  var matched=(orders||[]).filter(function(order){
    return (getOrderSupplierName(order)||order.sup||'')===supplierName;
  });
  var by30=getOrdersForPeriod(matched,30).reduce(function(sum,order){ return sum+(Number(order.sum)||0); },0);
  var by90=getOrdersForPeriod(matched,90).reduce(function(sum,order){ return sum+(Number(order.sum)||0); },0);
  var all=matched.reduce(function(sum,order){ return sum+(Number(order.sum)||0); },0);
  return {
    count:matched.length,
    by30:by30,
    by90:by90,
    all:all,
    organizations:getOrganizationTurnoverRows(matched)
  };
}
function getAnalyticsPeriodValue(){
  var value=document.getElementById('analyticsPeriod');
  return value?String(value.value||'90'):'90';
}
function getAnalyticsPeriodLabel(value){
  var labels={'30':'30 дней','90':'90 дней','365':'12 месяцев','all':'всё время'};
  return labels[String(value||'90')]||'90 дней';
}
function getAnalyticsOrders(){
  var orders=getUserVisibleOrders(CU);
  var period=getAnalyticsPeriodValue();
  if(period==='all') return orders;
  return getOrdersForPeriod(orders, parseInt(period,10)||90);
}
function getDashboardCategoryData(orders){
  var colors={meat:'#5ba3f5',fish:'#4fc3f7',veg:'#4caf82',fruit:'#ffb74d',dairy:'#ffd54f',alcohol:'#ab7df8',dry:'#ff7043',other:'#8a9ba8'};
  var labels={meat:'Мясо',fish:'Рыба',veg:'Овощи',fruit:'Фрукты',dairy:'Молочное',alcohol:'Алкоголь',dry:'Бакалея',other:'Прочее'};
  var sums={};
  orders.forEach(function(order){
    var items=getOrderItemNames(order);
    if(!items.length) return;
    var perItem=(Number(order.sum)||0)/items.length;
    items.forEach(function(name){
      var prod=PRODUCTS.find(function(p){ return String(p.name||'').toLowerCase()===String(name||'').toLowerCase(); });
      var cat=prod&&prod.cat?prod.cat:'other';
      if(!labels[cat]) cat='other';
      sums[cat]=(sums[cat]||0)+perItem;
    });
  });
  return Object.keys(sums).map(function(cat){
    return {cat:cat,label:labels[cat]||labels.other,color:colors[cat]||colors.other,sum:sums[cat]||0};
  }).sort(function(a,b){ return b.sum-a.sum; });
}
function renderDash(){
  function setEl(id,v){var e=document.getElementById(id);if(e)e.innerHTML=v;}
  var dashPeriod=parseInt(document.getElementById('dashPeriod')?.value||'6',10)||6;
  var orders=getOrdersForMonths(getDashboardOrders(), dashPeriod).slice().sort(function(a,b){
    return _parseOrderDateValue(b.date)-_parseOrderDateValue(a.date);
  });
  var spend=orders.reduce(function(s,o){return s+(Number(o.sum)||0);},0);
  var activeSuppliers={};
  var statusCounts={processing:0,transit:0,delivered:0,cancelled:0};
  var extraInvoices=0;
  var restaurantsInOrders={};
  orders.forEach(function(order){
    var supplier=getOrderSupplierName(order);
    if(supplier) activeSuppliers[supplier]=true;
    if(statusCounts[order.status]!=null) statusCounts[order.status]+=1;
    if(String(order.invoiceGroup||'').toLowerCase().indexOf('доп')>=0) extraInvoices+=1;
    if(order.rest) restaurantsInOrders[order.rest]=true;
  });
  var avgOrder=orders.length?spend/orders.length:0;
  var tenderSavings=(typeof tenderChanges!=='undefined'&&Array.isArray(tenderChanges)?tenderChanges:[]).reduce(function(sum,item){
    var diff=Number(item.oldPrice||0)-Number(item.newPrice||0);
    return diff>0?sum+diff:sum;
  },0);
  var atRisk=(typeof tenderChanges!=='undefined'&&Array.isArray(tenderChanges)?tenderChanges:[]).filter(function(item){
    return Number(item.newPrice||0)>Number(item.oldPrice||0);
  }).length;
  var pendingMinCheck=orders.filter(function(order){ return order.status==='processing'; }).length;
  var statsHtml=[
    {label:'Заказы',value:String(orders.length),sub:'за '+dashPeriod+' мес.'},
    {label:'Закупки',value:spend?'₽'+Math.round(spend).toLocaleString():'—',sub:'оборот периода'},
    {label:'Средний чек',value:avgOrder?'₽'+Math.round(avgOrder).toLocaleString():'—',sub:'на один заказ'},
    {label:'Поставщики',value:String(Object.keys(activeSuppliers).length),sub:'в периоде'},
    {label:'Точки',value:String(Object.keys(restaurantsInOrders).length||((activeRest&&activeRest.id!=='r0')?1:0)),sub:'в периоде'}
  ].map(function(card){
    return '<div class="kpi"><div class="kpi-v">'+card.value+'</div><div class="kpi-l">'+card.label+'</div><div class="kpi-s">'+card.sub+'</div></div>';
  }).join('');
  setEl('dashStats', statsHtml);
  var restLabel=(activeRest&&activeRest.id!=='r0')?activeRest.name:'Все заведения';
  var roleLabel=CU&&ROLES[CU.role]?ROLES[CU.role].label:'Пользователь';
  setEl('dashSub', roleLabel+' · '+restLabel+' · период: '+dashPeriod+' мес. · заказов: '+orders.length);
  var drIco=document.getElementById('drIco');if(drIco)drIco.textContent=(activeRest&&activeRest.emoji)||'🍽️';
  var drName=document.getElementById('drName');if(drName)drName.textContent=(activeRest&&activeRest.name)||'Все рестораны';
  var pulseHtml=[
    {label:'Обрабатываются',value:statusCounts.processing,color:'var(--yl)'},
    {label:'В пути',value:statusCounts.transit,color:'var(--bl)'},
    {label:'Доставлены',value:statusCounts.delivered,color:'var(--gr)'},
    {label:'Доп. накладные',value:extraInvoices,color:'var(--or)'}
  ].map(function(item){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--br);font-size:13px;"><span>'+item.label+'</span><span style="font-weight:800;color:'+item.color+';">'+item.value+'</span></div>';
  }).join('');
  pulseHtml+='<div style="margin-top:10px;padding:10px 12px;background:var(--bg3);border:1px solid var(--br);border-radius:var(--r);font-size:12px;color:var(--t2);">Активных поставщиков: <b>'+Object.keys(activeSuppliers).length+'</b> · Рисков по ценам: <b>'+atRisk+'</b> · Заказов в работе: <b>'+pendingMinCheck+'</b></div>';
  setEl('dashPulse', pulseHtml);
  // Топ поставщики
  var supMap={};
  orders.forEach(function(o){
    var sn=getOrderSupplierName(o);
    supMap[sn]=(supMap[sn]||0)+(o.sum||0);
  });
  var tops=Object.entries(supMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  setEl('dashTopSup', tops.length ? tops.map(function(x){
    var pct=tops[0][1]?Math.round(x[1]/tops[0][1]*100):0;
    return '<div style="margin-bottom:8px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
      +'<span>'+x[0]+'</span><span style="font-weight:700;">₽'+Math.round(x[1]/1000)+'к</span></div>'
      +'<div style="background:var(--bg3);border-radius:3px;height:5px;">'
      +'<div style="background:var(--ac);border-radius:3px;height:5px;width:'+pct+'%;"></div>'
      +'</div></div>';
  }).join('') : '<div style="color:var(--t3);font-size:12px;padding:10px;">Нет данных о заказах</div>');
  // Структура закупок
  var catData=getDashboardCategoryData(orders).slice(0,5);
  var catTotal=catData.reduce(function(sum,item){ return sum+item.sum; },0);
  setEl('dashStructure', catData.length?catData.map(function(item){
    var pct=catTotal?Math.round(item.sum/catTotal*100):0;
    return '<div style="margin-bottom:10px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+item.color+';margin-right:6px;"></span>'+item.label+'</span><span style="font-weight:700;">'+pct+'%</span></div>'
      +'<div style="background:var(--bg3);border-radius:999px;height:7px;overflow:hidden;"><div style="height:7px;border-radius:999px;background:'+item.color+';width:'+pct+'%;"></div></div>'
      +'</div>';
  }).join(''):'<div style="color:var(--t3);font-size:12px;padding:10px;">Пока недостаточно данных для структуры закупок</div>');
  // Изменения цен / экономия
  var changes=(typeof tenderChanges!=='undefined'&&Array.isArray(tenderChanges))?tenderChanges:[];
  setEl('dashSavings', changes.length ?
    '<div style="padding:10px 12px;margin-bottom:10px;background:var(--bg3);border:1px solid var(--br);border-radius:var(--r);font-size:12px;color:var(--t2);">Потенциальная экономия: <b style="color:var(--gr);">₽'+Math.round(tenderSavings).toLocaleString()+'</b> · Ростов цен: <b style="color:var(--rd);">'+atRisk+'</b></div>'
    +changes.slice(0,5).map(function(t){
      var diff=t.newPrice-t.oldPrice,isUp=diff>0;
      var pct=t.oldPrice?Math.round(Math.abs(diff)/t.oldPrice*100):0;
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;'
        +'border-bottom:1px solid var(--br);font-size:12px;">'
        +'<span>'+t.name+' ('+t.sup+')</span>'
        +'<span style="color:'+(isUp?'var(--rd)':'var(--gr)')+';font-weight:700;">'
        +(isUp?'+':'')+diff.toLocaleString()+' ₽ ('+pct+'%)</span></div>';
    }).join('')
    : '<div style="color:var(--t3);font-size:12px;padding:10px;">Загрузите тендер для анализа экономии и рисков цен</div>');
  var orgTurnover=getOrganizationTurnoverRows(orders).slice(0,5);
  var insights=[];
  if(orgTurnover.length){
    insights.push('<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:8px;">Оборот по организациям</div>'
      +orgTurnover.map(function(row){
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--br);font-size:12px;">'
          +'<span>'+row[0]+'</span><b>₽'+Math.round(row[1]).toLocaleString()+'</b></div>';
      }).join(''));
  }
  if(orders.length){
    var topSupplier=tops[0];
    if(topSupplier) insights.push('Самый дорогой поставщик периода: <b>'+topSupplier[0]+'</b> на ₽'+Math.round(topSupplier[1]).toLocaleString());
    if(statusCounts.processing>0) insights.push('В обработке сейчас <b>'+statusCounts.processing+'</b> заказ'+(statusCounts.processing===1?'':'ов')+'.');
    if(extraInvoices>0) insights.push('Используется разделение на накладные: <b>'+extraInvoices+'</b> доп. накладных.');
    if(catData[0]) insights.push('Главная категория закупки: <b>'+catData[0].label+'</b> ('+(catTotal?Math.round(catData[0].sum/catTotal*100):0)+'%).');
  } else {
    insights.push('По текущей точке ещё нет заказов. Начните с создания первого заказа или применения шаблона.');
  }
  if(atRisk>0) insights.push('После последнего тендера выросли цены по <b>'+atRisk+'</b> позициям.');
  setEl('dashInsights', insights.map(function(text){
    return '<div style="padding:10px 12px;margin-bottom:8px;background:var(--bg3);border:1px solid var(--br);border-radius:var(--r);font-size:12px;color:var(--t2);">'+text+'</div>';
  }).join(''));
  // Последние заказы
  setEl('dashOrders', orders.length ? orders.slice(0,7).map(function(o){
    var s=SM[o.status]||['bg','—'];
    return '<tr>'
      +'<td>'+o.id+'</td>'
      +'<td>'+(o.rest||'—')+'</td>'
      +'<td>'+getOrderSupplierName(o)+'</td>'
      +'<td>'+getOrderItemNames(o).slice(0,3).join(', ')+(getOrderItemNames(o).length>3?' ...':'')+'</td>'
      +'<td>₽'+(o.sum||0).toLocaleString()+'</td>'
      +'<td>'+String(o.date||'')+'</td>'
      +'<td><span class="badge '+s[0]+'">'+s[1]+'</span></td>'
      +'</tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--t3);padding:18px;">Заказов пока нет</td></tr>');
  renderDashChart();
}
function renderDashChart(){
  var monthsCount=parseInt(document.getElementById('dashPeriod')?.value||'6',10)||6;
  var orders=getOrdersForMonths(getDashboardOrders(), monthsCount);
  var now=new Date();
  var months=[];
  for(var i=monthsCount-1;i>=0;i--){
    var d=new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({
      key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),
      l:d.toLocaleDateString('ru-RU',{month:'short'}),
      v:0
    });
  }
  orders.forEach(function(order){
    var time=_parseOrderDateValue(order.date);
    if(!time) return;
    var d=new Date(time);
    var key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    var found=months.find(function(item){ return item.key===key; });
    if(found) found.v+=(Number(order.sum)||0);
  });
  var max=Math.max.apply(null, months.map(function(item){ return item.v; }).concat([1]));
  document.getElementById('dashChart').innerHTML=months.map(function(d){
    var label=Math.round(d.v/1000);
    return `<div class="bc-col"><div class="bc-v">${label?label+'К':'0'}</div><div class="bc-bar" style="height:${Math.max(8,Math.round(d.v/max*100))}%;background:linear-gradient(180deg,var(--ac),rgba(200,240,80,.15));"></div><div class="bc-l">${d.l}</div></div>`;
  }).join('');
}
function renderRestPick(){
  const db=dbGet();
  var list=db.restaurants.slice();
  if(CU && document.getElementById('pg-dashboard')?.classList.contains('on') && normalizeDashboardAccess(CU).scope!=='all_orgs' && CU.role!=='owner'){
    var allowed=getUserDashboardRestaurantIds(CU,db);
    list=list.filter(function(r){ return r.id==='r0' || allowed.indexOf(r.id)>=0; });
  }
  document.getElementById('restPickList').innerHTML=list.map(r=>`<div class="di" onclick="selRest('${r.id}');closeModal('restPick');" style="${r.id===activeRest.id?'border-color:var(--ac);':''}"><span style="font-size:22px;">${r.emoji}</span><div><div class="d-nm">${r.name}</div><div class="d-co">${r.type}${r.city?' · '+r.city:''}</div></div>${r.id===activeRest.id?'<span class="badge bg" style="margin-left:auto;">Выбран</span>':''}</div>`).join('');
}
function selRest(id){
  const db=dbGet();
  const r=db.restaurants.find(x=>x.id===id);if(!r)return;
  if(CU && document.getElementById('pg-dashboard')?.classList.contains('on') && id!=='r0' && normalizeDashboardAccess(CU).scope!=='all_orgs' && CU.role!=='owner'){
    var allowed=getUserDashboardRestaurantIds(CU,db);
    if(allowed.indexOf(id)<0){toast('🚫 Нет доступа к статистике этого заведения','err');return;}
  }
  activeRest=r;renderDash();toast(`${r.emoji} Переключились на ${r.name}`,'ok');
}

var _catalogQuery = '';
var _catalogSort = 'name';
var _catalogSupplierId = '';
var _catalogSupplierSort = 'asc';
var _catalogSupplierQuery = '';

function renderSupSel(){}
function togSup(){ renderCatalog(); }
function selAllSups(){ renderCatalog(); }
function filtCat(){ renderCatalog(); }

function getCatalogVisibleSuppliers(){
  return (SUPS_DATA||[]).filter(function(s){ return s && !s.hidden; });
}

function getSupplierCatalogProducts(supName){
  var seen={};
  var items=[];
  (SUP_PRODS||[]).forEach(function(p){
    var owner=p && (p._supplier||p.supplier||'');
    if(owner!==supName) return;
    if(p.hidden || p.active===false) return;
    var key=String(p.name||'').trim().toLowerCase();
    if(!key || seen[key]) return;
    seen[key]=true;
    items.push({
      id:p.id,
      name:String(p.name||'').trim(),
      unit:p.unit||'',
      category:p.cat||'',
      source:'price'
    });
  });
  (PRODUCTS||[]).forEach(function(prod){
    if(!prod || !Array.isArray(prod.suppliers)) return;
    var match=prod.suppliers.some(function(s){ return s && s.name===supName; });
    if(!match) return;
    var key=String(prod.name||'').trim().toLowerCase();
    if(!key || seen[key]) return;
    seen[key]=true;
    items.push({
      id:prod.id,
      name:String(prod.name||'').trim(),
      unit:prod.unit||'',
      category:prod.cat||'',
      source:'catalog'
    });
  });
  items.sort(function(a,b){
    var cmp=String(a.name||'').localeCompare(String(b.name||''),'ru');
    return _catalogSupplierSort==='desc' ? -cmp : cmp;
  });
  return items;
}

function getCatalogSupplierAssortmentCount(supName){
  return getSupplierCatalogProducts(supName).length;
}

function getCatalogSuppliers(){
  var query=_catalogQuery;
  var list=getCatalogVisibleSuppliers().map(function(s){
    var assortment=getSupplierCatalogProducts(s.name);
    var rating=getSupplierRatingSummary(s.name);
    return Object.assign({}, s, {
      legalName:s.legalName||s.name||'—',
      city:s.city||'—',
      minOrderLabel:s.min||'—',
      deliverySchedule:s.deliverySchedule||s.delivery||'—',
      workSchedule:s.workSchedule||'—',
      assortmentCount:assortment.length,
      assortmentIndex:assortment.map(function(item){ return item.name; }).join(' '),
      ratingAverage:rating.average,
      ratingCount:rating.count,
      myRating:rating.mine
    });
  });
  if(query){
    list=list.filter(function(s){
      var haystack=[
        s.name||'',
        s.legalName||'',
        s.city||'',
        s.deliverySchedule||'',
        s.workSchedule||'',
        s.assortmentIndex||''
      ].join(' ').toLowerCase();
      return haystack.indexOf(query)>=0;
    });
  }
  list.sort(function(a,b){
    if(_catalogSort==='city') return String(a.city||'').localeCompare(String(b.city||''),'ru') || String(a.name||'').localeCompare(String(b.name||''),'ru');
    if(_catalogSort==='assortment') return (b.assortmentCount-a.assortmentCount) || String(a.name||'').localeCompare(String(b.name||''),'ru');
    return String(a.name||'').localeCompare(String(b.name||''),'ru');
  });
  return list;
}

function sortCat(by){
  _catalogSort=by||'name';
  renderCatalog();
}

function doSearch(q){
  _catalogQuery=String(q||'').trim().toLowerCase();
  renderCatalog();
}

function openCatalogSupplierCard(supName){
  _catalogSupplierId=supName||'';
  _catalogSupplierSort='asc';
  _catalogSupplierQuery='';
  renderCatalogSupplierCard();
  openModal('catalogSupplier');
}

function renderCatalogSupplierCard(){
  var info=document.getElementById('catalogSupplierInfo');
  var body=document.getElementById('catalogSupplierProducts');
  if(!info || !body) return;
  var supplier=(SUPS_DATA||[]).find(function(s){ return s && s.name===_catalogSupplierId; });
  if(!supplier){
    info.innerHTML='<div style="padding:16px;border:1px dashed var(--br2);border-radius:var(--r);color:var(--t3);">Поставщик не найден</div>';
    body.innerHTML='';
    return;
  }
  var assortment=getSupplierCatalogProducts(supplier.name);
  var ratingSummary=getSupplierRatingSummary(supplier.name);
  var searchInput=document.getElementById('catalogSupplierSearchInput');
  if(searchInput) searchInput.value=_catalogSupplierQuery;
  if(_catalogSupplierQuery){
    var query=_catalogSupplierQuery.toLowerCase();
    assortment=assortment.filter(function(item){
      return [
        item.name||'',
        item.unit||'',
        item.category||''
      ].join(' ').toLowerCase().indexOf(query)>=0;
    });
  }
  info.innerHTML=
    '<div style="padding:14px 16px;border:1px solid var(--br);border-radius:var(--r2);background:var(--bg3);">'
    +'<div style="display:flex;align-items:flex-start;gap:12px;">'
    +'<div style="flex:1;min-width:0;">'
    +'<div style="font-size:18px;font-weight:800;">'+supplier.name+'</div>'
    +'<div style="font-size:12px;color:var(--t3);margin-top:4px;">'+(supplier.type||'Поставщик')+'</div>'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">'
    +'<div style="font-size:13px;color:var(--t2);"><b>Рейтинг:</b> '+formatSupplierRatingAverage(ratingSummary.average)+'</div>'
    +'<div style="font-size:12px;color:var(--t3);">Оценок: '+ratingSummary.count+'</div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">'
    +'<div style="font-size:12px;color:var(--t3);">Ваша оценка:</div>'
    +'<div style="display:flex;gap:4px;">'+renderSupplierRatingStars(supplier.name, ratingSummary.mine)+'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:14px;">'
    +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg2);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Юр. лицо</div><div style="font-size:13px;font-weight:700;margin-top:4px;">'+(supplier.legalName||supplier.name)+'</div></div>'
    +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg2);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Мин. заказ</div><div style="font-size:13px;font-weight:700;margin-top:4px;">'+(supplier.min||'—')+'</div></div>'
    +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg2);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Город</div><div style="font-size:13px;font-weight:700;margin-top:4px;">'+(supplier.city||'—')+'</div></div>'
    +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg2);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">График доставки</div><div style="font-size:13px;font-weight:700;margin-top:4px;">'+(supplier.deliverySchedule||supplier.delivery||'—')+'</div></div>'
    +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg2);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">График работы</div><div style="font-size:13px;font-weight:700;margin-top:4px;">'+(supplier.workSchedule||'—')+'</div></div>'
    +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg2);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Ассортимент</div><div style="font-size:13px;font-weight:700;margin-top:4px;">'+assortment.length+' позиций</div></div>'
    +'</div>'
    +'</div>';
  body.innerHTML=assortment.length
    ? '<div style="display:grid;gap:6px;">'+assortment.map(function(item, idx){
        return '<div style="display:grid;grid-template-columns:40px minmax(0,1fr) 90px 130px;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg3);">'
          +'<div style="font-size:12px;color:var(--t3);font-weight:700;">'+(idx+1)+'</div>'
          +'<div style="font-size:13px;font-weight:700;">'+item.name+'</div>'
          +'<div style="font-size:12px;color:var(--t3);">'+(item.unit||'—')+'</div>'
          +'<div style="font-size:11px;color:var(--t3);">'+(item.category||'—')+'</div>'
          +'</div>';
      }).join('')+'</div>'
    : '<div style="padding:20px;border:1px dashed var(--br2);border-radius:10px;color:var(--t3);text-align:center;">'+(_catalogSupplierQuery?'По вашему поиску ничего не найдено':'У этого поставщика пока нет ассортимента в каталоге')+'</div>';
}

function sortCatalogSupplierProducts(direction){
  _catalogSupplierSort=direction==='desc'?'desc':'asc';
  renderCatalogSupplierCard();
}

function searchCatalogSupplierProducts(value){
  _catalogSupplierQuery=String(value||'').trim();
  renderCatalogSupplierCard();
}

function catalogSupplierUploadPrice(){
  if(!_catalogSupplierId) return;
  openSupPriceUpload(_catalogSupplierId,false);
  closeModal('catalogSupplier');
}

function renderCatalog(){
  var list=getCatalogSuppliers();
  var sub=document.getElementById('catalogSub');
  if(sub){
    sub.textContent='Открытый каталог поставщиков: '+list.length+' компаний · ассортимент обновляется автоматически после загрузки прайсов в системе';
  }
  renderCatList(list);
}

function renderCatList(list){
  var grid=document.getElementById('catGrid');
  if(!grid) return;
  if(!list.length){
    grid.innerHTML='<div class="empty"><div class="empty-ico">🏭</div><div class="empty-txt">Поставщики не найдены</div></div>';
    return;
  }
  grid.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;"></div>';
  var wrap=grid.firstChild;
  list.forEach(function(s){
    var card=document.createElement('div');
    card.style.cssText='background:var(--bg2);border:1px solid var(--br);border-radius:var(--r2);overflow:hidden;cursor:pointer;';
    card.onclick=function(){ openCatalogSupplierCard(s.name); };
    card.innerHTML=
      '<div style="padding:14px 16px;border-bottom:1px solid var(--br);background:var(--bg3);">'
      +'<div style="display:flex;align-items:flex-start;gap:12px;">'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:17px;font-weight:800;">'+s.name+'</div>'
      +'<div style="font-size:12px;color:var(--t3);margin-top:4px;">'+(s.type||'Поставщик')+'</div>'
      +'</div>'
      +'<div style="font-size:11px;color:var(--t3);white-space:nowrap;">'+s.assortmentCount+' поз.</div>'
      +'</div>'
      +'</div>'
      +'<div style="padding:14px 16px;display:grid;gap:8px;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--br);border-radius:10px;background:var(--bg3);">'
      +'<div style="font-size:12px;color:var(--t2);"><b>Рейтинг:</b> '+formatSupplierRatingAverage(s.ratingAverage)+'</div>'
      +'<div style="font-size:11px;color:var(--t3);">'+s.ratingCount+' оценок</div>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--t2);"><b>Юр. лицо:</b> '+(s.legalName||s.name)+'</div>'
      +'<div style="font-size:12px;color:var(--t2);"><b>Мин. сумма заказа:</b> '+(s.minOrderLabel||'—')+'</div>'
      +'<div style="font-size:12px;color:var(--t2);"><b>Город:</b> '+(s.city||'—')+'</div>'
      +'<div style="font-size:12px;color:var(--t2);"><b>График доставки:</b> '+(s.deliverySchedule||'—')+'</div>'
      +'<div style="font-size:12px;color:var(--t2);"><b>График работы:</b> '+(s.workSchedule||'—')+'</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:4px;" onclick="event.stopPropagation();">'
      +'<div style="font-size:11px;color:var(--t3);">Поставьте свою оценку</div>'
      +'<div style="display:flex;gap:4px;">'+renderSupplierRatingStars(s.name, s.myRating)+'</div>'
      +'</div>'
      +'<div style="margin-top:4px;font-size:11px;color:var(--t3);">Нажмите, чтобы открыть карточку поставщика и посмотреть ассортимент без цен</div>'
      +'</div>';
    wrap.appendChild(card);
  });
}
function addToCartD(pid){
  // Берём минимальную цену по умолчанию
  const p=PRODUCTS.find(x=>x.id===pid);if(!p)return;
  const mn=minP(p),sup=p.suppliers.find(s=>s.price===mn);
  addToCartFrom(pid, sup?sup.name:'—');
}
function addToCartFrom(pid, supName){
  const p=PRODUCTS.find(x=>x.id===pid);if(!p)return;
  const sp=p.suppliers.find(s=>s.name===supName)||p.suppliers[0];
  const price=sp?sp.price:0;
  const ex=cart.find(x=>x.pid===pid&&x.supplier===supName);
  if(ex){ex.qty+=1;}
  else{cart.push({pid,name:p.name,emoji:p.emoji,supplier:supName,price:price,qty:1,unit:p.unit,comment:''});}
  updBdg();
  toast('✓ '+p.name+' ('+supName+') → корзина','ok');
  renderCart();
  flashCartUI();
}

function flashCartUI(){
  var cartBtn=document.getElementById('cartBtn');
  var sec=document.getElementById('orderCartSection');
  if(cartBtn){
    cartBtn.classList.remove('cart-flash');
    void cartBtn.offsetWidth;
    cartBtn.classList.add('cart-flash');
    setTimeout(function(){cartBtn.classList.remove('cart-flash');},1200);
  }
  if(sec){
    sec.classList.remove('cart-flash-box');
    void sec.offsetWidth;
    sec.classList.add('cart-flash-box');
    setTimeout(function(){sec.classList.remove('cart-flash-box');},1200);
  }
}
function renderCatColList(){const el=document.getElementById('catColList');if(!el)return;el.innerHTML=ALL_SUPS.map(s=>`<label style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg3);border-radius:var(--r);cursor:pointer;font-size:13px;"><input type="checkbox" id="cc-${s.replace(/\s/g,'_')}" ${selSups.includes(s)?'checked':''} style="width:15px;height:15px;"> ${s}</label>`).join('');}
function applyCatCols(){selSups=ALL_SUPS.filter(s=>document.getElementById('cc-'+s.replace(/\s/g,'_'))?.checked);if(!selSups.length)selSups=[...ALL_SUPS];renderSupSel();renderCatalog();}
function renderAcpPrices(){const el=document.getElementById('acpPrices');if(!el)return;el.innerHTML=ALL_SUPS.map(s=>`<div style="display:flex;align-items:center;gap:8px;"><label style="width:130px;font-size:12px;color:var(--t2);">🏭 ${s}</label><input class="fI" type="number" id="acpP-${s.replace(/\s/g,'_')}" placeholder="0" style="margin:0;width:100px;text-align:right;"></div>`).join('');}
function submitCatProd(){
  const n=v('acp-n'),em=v('acp-em')||'📦',cat=document.getElementById('acp-cat').value,unit=document.getElementById('acp-unit').value;
  if(!n){toast('❗ Укажите название','err');return;}
  const suppliers=[];ALL_SUPS.forEach(s=>{const inp=document.getElementById('acpP-'+s.replace(/\s/g,'_'));const pr=parseInt(inp?.value||0);if(pr>0)suppliers.push({name:s,price:pr});});
  if(!suppliers.length){toast('❗ Укажите цену хотя бы у одного поставщика','err');return;}
  const mn=Math.min(...suppliers.map(s=>s.price));
  PRODUCTS.push({id:Date.now(),name:n,cat,unit,emoji:em,sticker:null,fav:false,suppliers,pKg:mn,pSh:0,pL:0,pMl:0});
  closeModal('addCatProd');renderCatalog(); savePriceData();toast(`✅ «${n}» добавлен в каталог!`,'ok');
}
function renderEpPrices(p){const el=document.getElementById('epPrices');if(!el)return;el.innerHTML=ALL_SUPS.map(s=>{const sup=p.suppliers.find(x=>x.name===s);return`<div style="display:flex;align-items:center;gap:8px;"><label style="width:130px;font-size:12px;color:var(--t2);">🏭 ${s}</label><input class="fI" type="number" id="epP-${s.replace(/\s/g,'_')}" value="${sup?sup.price:0}" style="margin:0;width:100px;text-align:right;"></div>`;}).join('');}
function openEditProd(id){const p=PRODUCTS.find(x=>x.id===id);if(!p)return;editProdId=id;document.getElementById('epId').value=id;document.getElementById('epN').value=p.name;document.getElementById('epEm').value=p.emoji;document.getElementById('epCat').value=p.cat;document.getElementById('epUnit').value=p.unit;renderEpPrices(p);openModal('editProd');}
function saveEditProd(){
  const id=editProdId;if(!id)return;const idx=PRODUCTS.findIndex(x=>x.id===id);if(idx<0)return;
  const n=v('epN');if(!n){toast('❗ Укажите название','err');return;}
  const suppliers=[];ALL_SUPS.forEach(s=>{const inp=document.getElementById('epP-'+s.replace(/\s/g,'_'));const pr=parseInt(inp?.value||0);if(pr>0)suppliers.push({name:s,price:pr});});
  const mn=suppliers.length?Math.min(...suppliers.map(s=>s.price)):0;
  PRODUCTS[idx]={...PRODUCTS[idx],name:n,emoji:v('epEm')||PRODUCTS[idx].emoji,cat:document.getElementById('epCat').value,unit:document.getElementById('epUnit').value,suppliers,pKg:mn};
  closeModal('editProd');renderCatalog(); savePriceData();toast(`✅ «${n}» обновлён!`,'ok');
}
function deleteProd(){const id=editProdId;const p=PRODUCTS.find(x=>x.id===id);if(!confirm(`Удалить «${p?.name}» из каталога?`))return;PRODUCTS=PRODUCTS.filter(x=>x.id!==id);closeModal('editProd');renderCatalog(); savePriceData();toast('🗑 Товар удалён','ok');}


function updBdg(){
  const c=cart.length,f=getFavoritesCount(CU);
  ['cartDot','navCB'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=c;});
  ['favDot','navFB'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=f;});
}
function adjCQ(i,d){cart[i].qty=Math.max(0.1,Math.round((cart[i].qty+d)*10)/10);renderCart();}


function checkoutSup(si){
  var supName=_supOrder[si];if(!supName)return;
  var items=cart.filter(function(x){return x.supplier===supName;});if(!items.length)return;
  var total=items.reduce(function(s,x){return s+x.price*x.qty;},0);
  var ruleStatus=supplierRuleStatus(supName,total);
  if(ruleStatus.blocked){toast('Этот поставщик в стоп-листе для текущего заведения','err');return;}
  if(!ruleStatus.minOrderMet){toast('Не достигнута минимальная сумма заказа для '+supName,'err');return;}
  var cmt=document.getElementById('sc'+si);
  var comment=(cmt?cmt.value:'')||cartComments[supName]||'';
  var mainItems=items.filter(function(item){ return item.invoiceGroup!=='extra'; });
  var extraItems=items.filter(function(item){ return item.invoiceGroup==='extra'; });
  checkoutSupplierItems(supName, mainItems, comment, 'Основная накладная');
  checkoutSupplierItems(supName, extraItems, comment, 'Доп. накладная');
  cart=cart.filter(function(x){return x.supplier!==supName;});
  delete cartComments[supName];
  ORDERS=ORDERS; saveOrdersData(); updBdg();renderCart();renderDash();
  logAudit(auditActor(), 'Оформил заказ к '+supName+' · ₽'+total.toLocaleString()+(extraItems.length?' · с доп. накладной':''),'Корзина');
}
function doCheckoutAll(){
  var sups=_supOrder.slice();
  if(!sups.length)return;
  var skipped=[];
  // Checkout each supplier by name (not index, since _supOrder shifts after each checkout)
  sups.forEach(function(supName){
    var idx=_supOrder.indexOf(supName);
    if(idx>=0){
      var items=cart.filter(function(x){return x.supplier===supName;});
      var total=items.reduce(function(s,x){return s+(x.price||0)*x.qty;},0);
      var status=supplierRuleStatus(supName,total);
      if(status.blocked || !status.minOrderMet){skipped.push(supName);return;}
      checkoutSup(idx);
    }
  });
  if(skipped.length) toast('Пропущены поставщики по правилам закупки: '+skipped.join(' · '),'err');
  if(sups.length>1) toast('Все заказы оформлены ('+sups.length+' поставщикам)!','ok');
}

function checkoutSupplierItems(supName, items, comment, suffix){
  if(!items.length) return;
  var total=items.reduce(function(s,x){return s+(x.price||0)*(x.qty||0);},0);
  var id='#'+String(1050+ORDERS.length).padStart(4,'0');
  var restMeta=getActiveRestMeta();
  ORDERS.unshift({
    id:id,
    createdByUserId:CU?CU.id:'',
    createdByEmail:CU?CU.email:'',
    createdByName:CU?(CU.first+' '+(CU.last||'')).trim():'',
    rest:(activeRest&&activeRest.name)||'—',
    restId:_orderRestId||'',
    brand:restMeta&&restMeta.brandName?restMeta.brandName:'',
    legalEntities:(_orderLegalEntityNames||[]).slice(),
    sup:(items[0].emoji||'📦')+' '+supName+(suffix?' · '+suffix:''),
    supplierName:supName,
    items:items.map(function(c){return c.name;}).join(', '),
    itemsDetailed:items.map(function(item){
      return {
        name:item.name,
        qty:item.qty,
        unit:item.unit,
        zone:item.zone||'',
        invoiceGroup:item.invoiceGroup||'main',
        comment:item.comment||''
      };
    }),
    zones:items.map(function(item){return item.zone||'';}).filter(Boolean),
    invoiceGroup:suffix||'Основная накладная',
    deliveryDate:_orderDeliveryDate||'',
    deliveryFrom:_orderDeliveryFrom||'',
    deliveryTo:_orderDeliveryTo||'',
    sum:total,
    date:today().slice(5).split('-').reverse().join('.')+'.26',
    status:'processing',
    comment:comment
  });
  toast('Заказ '+id+' → '+supName+(suffix?' · '+suffix:'')+' ₽'+total.toLocaleString(),'ok');
}
function clearSupCart(si){
  var supName=_supOrder[si];if(!supName)return;
  cart=cart.filter(function(x){return x.supplier!==supName;});
  delete cartComments[supName];
  updBdg();renderCart();
}
function doCheckout(){doCheckoutAll();}
function togFav(pid){const p=PRODUCTS.find(x=>x.id===pid);if(!p)return;p.fav=!p.fav;updBdg();renderCatalog();toast(p.fav?`⭐ ${p.name} в избранном`:`Удалено из избранного`,'ok');}
function renderFavorites(){
  var pagesEl=document.getElementById('favPages');
  var pagePicker=document.getElementById('favPagePicker');
  var supEl=document.getElementById('favSuppliers');
  var supPicker=document.getElementById('favSupplierPicker');
  var noteEl=document.getElementById('favNote');
  if(!pagesEl || !pagePicker || !supEl || !supPicker) return;
  var fav=getUserFavorites(CU);
  var visiblePages=((ROLES[CU?.role||'']||{}).pages||[]).filter(function(pg){
    return ['favorites','cart'].indexOf(pg)<0 && PM[pg] && PT[pg];
  });
  var favoritePages=(fav.pages||[]).filter(function(pg){ return visiblePages.indexOf(pg)>=0; });
  var visibleSuppliers=getUserVisibleSuppliers(CU);
  var favoriteSuppliers=visibleSuppliers.filter(function(s){ return (fav.suppliers||[]).indexOf(s.name)>=0; });
  if(noteEl) noteEl.value=fav.note||'';

  pagesEl.innerHTML=favoritePages.length ? favoritePages.map(function(pg){
    return '<button onclick="goPage(\''+pg+'\')" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;background:var(--bg3);border:1px solid var(--br);border-radius:var(--r2);padding:12px 14px;cursor:pointer;color:var(--tx);text-align:left;">'
      +'<span style="font-size:13px;font-weight:700;">'+(PT[pg]||pg)+'</span>'
      +'<span onclick="event.stopPropagation();toggleFavoritePage(\''+pg+'\')" style="font-size:14px;color:var(--ac);">★</span>'
      +'</button>';
  }).join('') : '<div class="empty"><div class="empty-ico">⭐</div><div class="empty-txt">Нет избранных вкладок</div></div>';

  pagePicker.innerHTML=visiblePages.map(function(pg){
    var active=favoritePages.indexOf(pg)>=0;
    return '<button onclick="toggleFavoritePage(\''+pg+'\')" style="background:'+(active?'var(--aD)':'var(--bg3)')+';color:'+(active?'var(--ac)':'var(--t2)')+';border:1px solid '+(active?'var(--ac)':'var(--br)')+';border-radius:999px;padding:7px 12px;font-size:12px;cursor:pointer;font-weight:700;">'
      +(active?'★ ':'☆ ')+(PT[pg]||pg)
      +'</button>';
  }).join('');

  supEl.innerHTML=favoriteSuppliers.length ? favoriteSuppliers.map(function(s){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:var(--bg3);border:1px solid var(--br);border-radius:var(--r2);">'
      +'<div><div style="font-size:13px;font-weight:700;">'+s.name+'</div><div style="font-size:11px;color:var(--t3);">'+(s.legalName||s.name)+' · '+(s.city||'—')+'</div></div>'
      +'<div style="display:flex;gap:8px;">'
      +'<button onclick="goPage(\'catalog\');openCatalogSupplierCard(\''+_esc(s.name)+'\')" style="background:var(--bg2);border:1px solid var(--br);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;color:var(--t2);">Открыть</button>'
      +'<button onclick="toggleFavoriteSupplier(\''+_esc(s.name)+'\')" style="background:var(--aD);border:1px solid var(--ac);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;color:var(--ac);">★</button>'
      +'</div>'
      +'</div>';
  }).join('') : '<div class="empty"><div class="empty-ico">🏭</div><div class="empty-txt">Нет избранных поставщиков</div></div>';

  supPicker.innerHTML=visibleSuppliers.map(function(s){
    var active=(fav.suppliers||[]).indexOf(s.name)>=0;
    return '<button onclick="toggleFavoriteSupplier(\''+_esc(s.name)+'\')" style="background:'+(active?'var(--aD)':'var(--bg3)')+';color:'+(active?'var(--ac)':'var(--t2)')+';border:1px solid '+(active?'var(--ac)':'var(--br)')+';border-radius:999px;padding:7px 12px;font-size:12px;cursor:pointer;font-weight:700;">'
      +(active?'★ ':'☆ ')+s.name
      +'</button>';
  }).join('');
}
function filtOrds(f,el){ordFilter=f;document.querySelectorAll('#ordChips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');renderOrders();}
function getAvailableOrderRestaurants(){
  var orders=getUserVisibleOrders(CU);
  var db=dbGet();
  var seen={};
  return orders.map(function(order){
    var id=String(order.restId||order.rest||'');
    if(!id || seen[id]) return null;
    seen[id]=true;
    var rest=(db.restaurants||[]).find(function(item){ return String(item.id)===String(order.restId||''); });
    return {
      id:id,
      name:(rest&&rest.name) || order.rest || 'Без организации'
    };
  }).filter(Boolean).sort(function(a,b){ return a.name.localeCompare(b.name,'ru'); });
}
function renderOrdersRestaurantFilter(){
  var el=document.getElementById('ordersRestFilter');
  if(!el) return;
  var rests=getAvailableOrderRestaurants();
  if(ordersRestFilter!=='all' && !rests.some(function(rest){ return rest.id===ordersRestFilter; })){
    ordersRestFilter='all';
  }
  el.innerHTML='<option value="all">Все организации</option>'+rests.map(function(rest){
    return '<option value="'+rest.id+'"'+(ordersRestFilter===rest.id?' selected':'')+'>'+rest.name+'</option>';
  }).join('');
}
function setOrdersRestaurantFilter(value){
  ordersRestFilter=value||'all';
  renderOrders();
}
function orderMetaLines(o){
  var lines=[];
  if(o.rest) lines.push('🏢 '+o.rest);
  if(o.brand) lines.push('🏷 '+o.brand);
  if(Array.isArray(o.legalEntities) && o.legalEntities.length) lines.push('🏛 '+o.legalEntities.join(' · '));
  if(Array.isArray(o.zones) && o.zones.filter(Boolean).length) lines.push('🏷 Зоны: '+o.zones.filter(Boolean).join(' · '));
  if(o.deliveryDate || o.deliveryFrom || o.deliveryTo){
    var delivery = [];
    if(o.deliveryDate) delivery.push(o.deliveryDate);
    if(o.deliveryFrom || o.deliveryTo) delivery.push((o.deliveryFrom||'—')+'–'+(o.deliveryTo||'—'));
    lines.push('🚚 Доставка: '+delivery.join(' · '));
  }
  if(o.invoiceGroup) lines.push('🧾 '+o.invoiceGroup);
  return lines.join(' · ');
}
function renderMiniStatGrid(targetId, items){
  var el=document.getElementById(targetId);
  if(!el) return;
  el.innerHTML=(items||[]).map(function(item){
    return '<div class="sc '+(item.cls||'ca')+'">'
      +'<div class="sc-ico">'+(item.ico||'•')+'</div>'
      +'<div class="sc-lbl">'+(item.label||'')+'</div>'
      +'<div class="sc-val" style="'+(item.valStyle||'')+'">'+(item.value||'0')+'</div>'
      +'<div class="sc-chg '+(item.chgClass||'')+'">'+(item.note||'')+'</div>'
      +'</div>';
  }).join('');
}
function getVisibleOrderById(orderId){
  return getUserVisibleOrders(CU).find(function(item){ return item.id===orderId; }) || null;
}
function buildOrderItemsHtml(order){
  var items=(order.itemsDetailed&&order.itemsDetailed.length)?order.itemsDetailed:[];
  if(!items.length){
    return '<div style="color:var(--t3);font-size:12px;">Подробный состав заказа пока не сохранён.</div>';
  }
  return items.map(function(item){
    var qty=Number(item.qty||0);
    var lineTotal=(item.price&&qty)?Math.round(item.price*qty):0;
    return '<div style="display:grid;grid-template-columns:1.5fr .7fr .8fr .8fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--br);align-items:center;">'
      +'<div><div style="font-size:13px;font-weight:700;">'+(item.name||'—')+'</div>'+(item.comment?'<div style="font-size:11px;color:var(--t3);margin-top:4px;">'+item.comment+'</div>':'')+'</div>'
      +'<div style="font-size:12px;color:var(--t2);">'+(qty?String(qty).replace(/\.0$/,''):'—')+' '+(item.unit||'')+'</div>'
      +'<div style="font-size:12px;color:var(--t2);">'+(item.price?'₽'+Math.round(item.price).toLocaleString():'—')+'</div>'
      +'<div style="font-size:12px;font-weight:700;text-align:right;">'+(lineTotal?'₽'+lineTotal.toLocaleString():'—')+'</div>'
      +'</div>';
  }).join('');
}
function openOrderDetails(orderId){
  var order=getVisibleOrderById(orderId);
  if(!order){ toast('Заказ недоступен','err'); return; }
  var body=document.getElementById('orderDetailsBody');
  if(!body) return;
  body.innerHTML=''
    +'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">'
    +'<div style="padding:12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Номер</div><div style="font-size:18px;font-weight:800;margin-top:4px;">'+(order.id||'—')+'</div></div>'
    +'<div style="padding:12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Поставщик</div><div style="font-size:15px;font-weight:800;margin-top:4px;">'+(getOrderSupplierName(order)||order.sup||'—')+'</div></div>'
    +'<div style="padding:12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Сумма</div><div style="font-size:18px;font-weight:800;margin-top:4px;">₽'+Math.round(order.sum||0).toLocaleString()+'</div></div>'
    +'<div style="padding:12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;">Статус</div><div style="font-size:15px;font-weight:800;margin-top:4px;">'+((SM[order.status]||[])[1]||'—')+'</div></div>'
    +'</div>'
    +'<div style="padding:12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg2);">'
    +'<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:10px;">Информация о заказе</div>'
    +'<div style="display:grid;gap:8px;font-size:12px;color:var(--t2);">'
    +'<div><b>Заведение:</b> '+(order.rest||'—')+'</div>'
    +'<div><b>Бренд:</b> '+(order.brand||'—')+'</div>'
    +'<div><b>Юр. лица:</b> '+(Array.isArray(order.legalEntities)&&order.legalEntities.length?order.legalEntities.join(' · '):'—')+'</div>'
    +'<div><b>Зоны:</b> '+(Array.isArray(order.zones)&&order.zones.filter(Boolean).length?order.zones.filter(Boolean).join(' · '):'—')+'</div>'
    +'<div><b>Накладная:</b> '+(order.invoiceGroup||'—')+'</div>'
    +'<div><b>Доставка:</b> '+((order.deliveryDate||order.deliveryFrom||order.deliveryTo)?[
      order.deliveryDate||'',
      (order.deliveryFrom||'—')+'–'+(order.deliveryTo||'—')
    ].filter(Boolean).join(' · '):'—')+'</div>'
    +'<div><b>Дата:</b> '+(order.date||'—')+'</div>'
    +'<div><b>Комментарий:</b> '+(order.comment||'—')+'</div>'
    +'</div>'
    +'</div>'
    +'<div style="padding:12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg2);">'
    +'<div style="display:grid;grid-template-columns:1.5fr .7fr .8fr .8fr;gap:10px;font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;"><div>Ассортимент</div><div>Кол-во</div><div>Цена</div><div style="text-align:right;">Сумма</div></div>'
    +buildOrderItemsHtml(order)
    +'</div>';
  var btn=document.getElementById('orderDetailsExcelBtn');
  if(btn) btn.onclick=function(){ exportOrderExcel(order.id); };
  openModal('orderDetails');
}
function exportOrderExcel(orderId){
  var order=getVisibleOrderById(orderId);
  if(!order){ toast('Заказ недоступен','err'); return; }
  if(typeof XLSX==='undefined'){ toast('Excel-модуль не загружен','err'); return; }
  var wb=XLSX.utils.book_new();
  var rows=[
    ['Заказ', order.id||'—'],
    ['Заведение', order.rest||'—'],
    ['Поставщик', getOrderSupplierName(order)||order.sup||'—'],
    ['Бренд', order.brand||'—'],
    ['Юр. лица', Array.isArray(order.legalEntities)&&order.legalEntities.length?order.legalEntities.join(' · '):'—'],
    ['Зоны', Array.isArray(order.zones)&&order.zones.filter(Boolean).length?order.zones.filter(Boolean).join(' · '):'—'],
    ['Накладная', order.invoiceGroup||'—'],
    ['Доставка', (order.deliveryDate||order.deliveryFrom||order.deliveryTo)?[
      order.deliveryDate||'',
      (order.deliveryFrom||'—')+' – '+(order.deliveryTo||'—')
    ].filter(Boolean).join(' · '):'—'],
    ['Дата', order.date||'—'],
    ['Статус', (SM[order.status]||[])[1]||order.status||'—'],
    ['Комментарий', order.comment||'—'],
    [],
    ['Ассортимент','Количество','Ед.','Цена','Сумма']
  ];
  var items=(order.itemsDetailed&&order.itemsDetailed.length)?order.itemsDetailed:[];
  if(items.length){
    items.forEach(function(item){
      var qty=Number(item.qty||0);
      rows.push([
        item.name||'—',
        qty||'',
        item.unit||'',
        item.price?Math.round(item.price):'',
        item.price&&qty?Math.round(item.price*qty):''
      ]);
    });
  } else {
    rows.push([order.items||'—','','','','']);
  }
  rows.push([]);
  rows.push(['Итого','','','',Math.round(order.sum||0)]);
  var ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:36},{wch:14},{wch:10},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws,'Заказ');
  XLSX.writeFile(wb,'order_'+String(order.id||'document').replace(/[^\w-]+/g,'_')+'.xlsx');
}
function renderOrders(){
  const el=document.getElementById('ordersList');if(!el)return;
  renderOrdersRestaurantFilter();
  const scoped=getUserVisibleOrders(CU);
  const orgScoped=ordersRestFilter==='all'?scoped:scoped.filter(function(o){
    return String(o.restId||o.rest||'')===String(ordersRestFilter);
  });
  const list=ordFilter==='all'?orgScoped:orgScoped.filter(function(o){return o.status===ordFilter;});
  var totalSum=orgScoped.reduce(function(sum,o){ return sum+(o.sum||0); },0);
  var deliveredCount=orgScoped.filter(function(o){ return o.status==='delivered'; }).length;
  var restCount=Array.from(new Set(orgScoped.map(function(o){ return o.restId||o.rest||''; }).filter(Boolean))).length;
  var supplierCount=Array.from(new Set(orgScoped.map(function(o){ return getOrderSupplierName(o)||o.sup||''; }).filter(Boolean))).length;
  renderMiniStatGrid('ordersSummary',[
    {cls:'ca',ico:'📦',label:'Заказов в выборке',value:String(orgScoped.length),note:ordersRestFilter==='all'?'Все доступные организации':'По выбранной организации'},
    {cls:'cg',ico:'₽',label:'Общий объём',value:'₽'+Math.round(totalSum).toLocaleString(),note:'По видимой истории'},
    {cls:'cb',ico:'✅',label:'Доставлено',value:String(deliveredCount),note:deliveredCount?'Исполненные заказы':'Пока нет'},
    {cls:'cp',ico:'🏭',label:'Поставщиков',value:String(supplierCount),note:supplierCount?'В этой выборке':'Нет поставщиков'}
  ]);
  if(!list.length){el.innerHTML='<div class="empty"><div class="empty-ico">📦</div><div class="empty-txt">Нет заказов</div></div>';return;}
  el.innerHTML=list.map(o=>{
    const[cl,lb]=SM[o.status]||['bgr','—'];
    var meta=orderMetaLines(o);
    return`<div style="background:var(--bg2);border:1px solid var(--br);border-radius:var(--r2);padding:12px;margin-bottom:6px;display:grid;grid-template-columns:90px 1.2fr 110px auto auto auto;align-items:center;gap:12px;transition:border-color .15s;" onmouseenter="this.style.borderColor='var(--br2)'" onmouseleave="this.style.borderColor='var(--br)'"><div><div style="font-family:var(--fH);font-size:13px;font-weight:800;color:var(--ac);">${o.id}</div><div class="c3 fs11">${o.date}</div></div><div><div class="fw6 fs13" style="margin-bottom:4px;">${o.rest||'Без организации'}</div><div class="c3 fs11" style="margin-bottom:4px;">Поставщик: ${getOrderSupplierName(o)||o.sup||'—'}</div><div class="c3 fs11">${o.items}</div>${meta?`<div class="c3 fs11" style="margin-top:4px;">${meta}</div>`:''}</div><div class="fw7" style="font-size:13px;">₽${o.sum.toLocaleString()}</div><span class="badge ${cl}">${lb}</span><button onclick="openOrderDetails('${o.id}')" style="background:var(--bg3);border:1px solid var(--br);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;color:var(--t2);">Просмотр</button><button onclick="exportOrderExcel('${o.id}')" style="background:var(--grD);color:var(--gr);border:1px solid var(--gr);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">Excel</button></div>`;
  }).join('');
}
function exportOrders(){
  var esc=function(v){ return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'; };
  var header='ID,Заведение,Бренд,Юр лица,Поставщик,Состав,Зоны,Накладная,Сумма,Дата,Комментарий,Статус\n';
  var rows=getUserVisibleOrders(CU).map(function(o){
    return [
      esc(o.id),
      esc(o.rest||''),
      esc(o.brand||''),
      esc(Array.isArray(o.legalEntities)?o.legalEntities.join(' · '):''),
      esc(o.sup||''),
      esc(o.items||''),
      esc(Array.isArray(o.zones)?o.zones.filter(Boolean).join(' · '):''),
      esc(o.invoiceGroup||''),
      o.sum||0,
      esc(o.date||''),
      esc(o.comment||''),
      esc(o.status||'')
    ].join(',');
  }).join('\n');
  dlFile(header+rows,'text/csv','orders.csv');toast('📥 Экспортировано','ok');
}
function repeatVisibleOrder(orderId){
  var order=getUserVisibleOrders(CU).find(function(item){ return item.id===orderId; });
  if(!order){ toast('Заказ недоступен','err'); return; }
  _pendingOrderTemplate={
    restId:order.restId||'',
    restName:order.rest||'',
    templateName:'Повтор заказа '+order.id,
    items:(order.itemsDetailed&&order.itemsDetailed.length ? order.itemsDetailed : []).map(function(item){
      return item.name+(item.qty?' '+item.qty:'')+(item.unit?' '+item.unit:'');
    }).join('\n'),
    supplierNames:[getOrderSupplierName(order)].filter(Boolean)
  };
  openCreateOrder({restId:order.restId||'',supplierNames:[getOrderSupplierName(order)].filter(Boolean)});
}
function renderSuppliers(){
  var el=document.getElementById('supGrid');if(!el)return;
  // Личные скрытые поставщики (хранятся в localStorage для каждого пользователя)
  var hiddenKey='pv_hidden_'+(CU?CU.id:'guest');
  var hiddenLocal={};
  try{var h=localStorage.getItem(hiddenKey);if(h)hiddenLocal=JSON.parse(h);}catch(e){}

  var visible=getUserVisibleSuppliers(CU);
  document.getElementById('supSub').textContent=visible.length+' поставщиков в вашем личном кабинете';

  var sm={active:'bg',contract:'by',new:'bb'};
  var sl={active:'Активен',contract:'Контракт',new:'Новый'};
  var canAdmin=CU&&['owner','admin'].includes(CU.role);
  var canManagePrices=CU&&['owner','admin','buyer','manager'].includes(CU.role);
  var canManageSupplierPage=!!(CU && (['owner','admin'].includes(CU.role) || getUserScopedRestaurantIds(CU, dbGet()).length));
  var fav=getUserFavorites(CU);
  var favoriteSuppliers=(fav.suppliers||[]);
  var db=dbGet();
  var visibleOrders=getUserVisibleOrders(CU);

  var cards=visible.map(function(s){
    var i=SUPS_DATA.indexOf(s);
    var supplierToken = encodeURIComponent(String(s.name || ''));
    var ratingSummary=getSupplierRatingSummary(s.name);
    var isPersonalHidden=hiddenLocal[s.name]===true;
    var cardStyle=isPersonalHidden?'opacity:0.5;':'';
    var personalBadge=isPersonalHidden?'<span class="badge bgr" style="margin-left:4px;font-size:10px;">Скрыт вами</span>':'';
    var canManageSupplier=canManageSupplierRecord(CU, s, db);
    var orgSummary=getSupplierVisibleOrganizationsForUser(s, CU, db).map(function(rest){ return rest.name; }).join(' · ') || 'Без привязки';
    var turnover=getSupplierTurnoverSummary(s.name, visibleOrders);
    var turnoverRows=turnover.organizations.slice(0,3).map(function(row){
      return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--t2);padding:4px 0;border-bottom:1px solid var(--br);"><span>'+row[0]+'</span><b>₽'+Math.round(row[1]).toLocaleString()+'</b></div>';
    }).join('') || '<div style="font-size:11px;color:var(--t3);">Пока нет заказов по этому поставщику.</div>';

    var personalBtn='<button onclick="togglePersonalSup(\''+s.name+'\')" style="flex:1;background:var(--bg3);border:1px solid var(--br);border-radius:6px;padding:6px 8px;font-size:11px;cursor:pointer;color:var(--t2);">'
      +(isPersonalHidden?'✅ Работать с ним':'🚫 Не работать')+'</button>';

    // Кнопки загрузки прайса — для всех пользователей
    var priceBtns=canManagePrices?'<div style="display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--br);">'
      +'<button type="button" onclick="supCardAction(this)" data-sup-action="prices" data-supplier-token="'+supplierToken+'" style="flex:1;background:var(--bg3);color:var(--t2);border:1px solid var(--br);border-radius:6px;padding:5px 8px;font-size:11px;cursor:pointer;font-weight:600;">Прайсы</button>'
      +'<button type="button" onclick="supCardAction(this)" data-sup-action="delete-price" data-supplier-token="'+supplierToken+'" style="flex:1;background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:6px;padding:6px 8px;font-size:11px;cursor:pointer;">Удалить прайс</button>'
      +'<button type="button" onclick="supCardAction(this)" data-sup-action="main-price" data-supplier-token="'+supplierToken+'" style="flex:1;background:var(--aD);color:var(--ac);border:1px solid var(--ac);border-radius:6px;padding:5px 8px;font-size:11px;cursor:pointer;font-weight:600;">Основной прайс</button>'
      +'<button type="button" onclick="supCardAction(this)" data-sup-action="extra-price" data-supplier-token="'+supplierToken+'" style="flex:1;background:var(--bg3);color:var(--t2);border:1px solid var(--br);border-radius:6px;padding:5px 8px;font-size:11px;cursor:pointer;">+ Доп.прайс</button>'
      +'</div>':'';

    var manageBtn=canManageSupplier?(
      '<button onclick="openSupplierModal('+i+')" style="flex:1;background:var(--bg4);border:1px solid var(--br2);border-radius:6px;padding:6px 8px;font-size:11px;cursor:pointer;color:var(--t2);">Изменить карточку</button>'
    ):'';

    var adminBtns=canAdmin?(
      '<button onclick="toggleSupHidden('+i+')" style="flex:1;background:var(--bg3);border:1px solid var(--br);border-radius:6px;padding:6px 8px;font-size:11px;cursor:pointer;color:var(--t2);">'+(s.hidden?'Показать':'Скрыть всем')+'</button>'
      +'<button onclick="deleteSup('+i+')" style="flex:1;background:var(--rdD);border:1px solid var(--rd);border-radius:6px;padding:6px 8px;font-size:11px;cursor:pointer;color:var(--rd);">Удалить</button>'
    ):'';

    var favoriteBtn='<button onclick="toggleFavoriteSupplier(\''+s.name+'\')" style="flex:1;background:'+(favoriteSuppliers.indexOf(s.name)>=0?'var(--aD)':'var(--bg3)')+';border:1px solid '+(favoriteSuppliers.indexOf(s.name)>=0?'var(--ac)':'var(--br)')+';border-radius:6px;padding:6px 8px;font-size:11px;cursor:pointer;color:'+(favoriteSuppliers.indexOf(s.name)>=0?'var(--ac)':'var(--t2)')+';">'+(favoriteSuppliers.indexOf(s.name)>=0?'★ В избранном':'☆ В избранное')+'</button>';

    return '<div class="sup-card" style="'+cardStyle+'">'
      +'<div class="sup-hd">'
      +'<div><div class="sup-name">'+s.name+'</div><div class="sup-type">'+s.type+'</div></div>'
      +'<span class="badge '+sm[s.status||'active']+'" style="margin-left:auto;">'+sl[s.status||'active']+'</span>'
      +personalBadge
      +'</div>'
      +'<div style="font-size:11px;color:var(--t3);margin-bottom:10px;">Юр. лицо: '+(s.legalName||s.name)+'</div>'
      +'<div style="font-size:11px;color:var(--t3);margin-bottom:10px;">Организации: '+orgSummary+'</div>'
      +'<div class="sup-sg">'
      +'<div class="ss"><div class="ss-l">Рейтинг</div><div class="ss-v">'+formatSupplierRatingAverage(ratingSummary.average)+' <span style="font-size:10px;color:var(--t3);">('+ratingSummary.count+')</span></div></div>'
      +'<div class="ss"><div class="ss-l">Заказов</div><div class="ss-v">'+s.orders+'</div></div>'
      +'<div class="ss"><div class="ss-l">Доставка</div><div class="ss-v" style="font-size:11px;">'+s.delivery+'</div></div>'
      +'<div class="ss"><div class="ss-l">Мин. заказ</div><div class="ss-v" style="font-size:11px;">'+s.min+'</div></div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:8px 10px;border:1px solid var(--br);border-radius:8px;background:var(--bg3);">'
      +'<div style="font-size:11px;color:var(--t3);">Ваша оценка</div>'
      +'<div style="display:flex;gap:4px;">'+renderSupplierRatingStars(s.name, ratingSummary.mine)+'</div>'
      +'</div>'
      +'<div style="margin-top:10px;padding:10px;border:1px solid var(--br);border-radius:8px;background:var(--bg3);">'
      +'<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:8px;">Оборот закупки</div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:8px;">'
      +'<div><div style="font-size:10px;color:var(--t3);">30 дней</div><div style="font-size:13px;font-weight:800;">₽'+Math.round(turnover.by30).toLocaleString()+'</div></div>'
      +'<div><div style="font-size:10px;color:var(--t3);">90 дней</div><div style="font-size:13px;font-weight:800;">₽'+Math.round(turnover.by90).toLocaleString()+'</div></div>'
      +'<div><div style="font-size:10px;color:var(--t3);">Всё время</div><div style="font-size:13px;font-weight:800;">₽'+Math.round(turnover.all).toLocaleString()+'</div></div>'
      +'</div>'
      +'<div style="font-size:11px;color:var(--t3);margin-bottom:6px;">По организациям</div>'
      +turnoverRows
      +'</div>'
      +(s.tags&&s.tags.length?'<div class="sup-tags">'+s.tags.map(function(t){return '<span class="sup-tag">'+t+'</span>';}).join('')+'</div>':'')
      +'<div style="display:flex;gap:6px;margin-top:12px;border-top:1px solid var(--br);padding-top:10px;">'
      +personalBtn
      +favoriteBtn
      +manageBtn
      +adminBtns
      +'</div>'
      +priceBtns
      +'</div>';
  }).join('');

  var addBtn=canManageSupplierPage?'<div class="sup-card dsh" onclick="openSupplierModal()" style="display:flex;align-items:center;justify-content:center;min-height:170px;"><div style="text-align:center;color:var(--t3);"><div style="font-size:26px;margin-bottom:7px;">➕</div><div style="font-size:13px;font-weight:600;">Добавить поставщика</div></div></div>':'';
  el.innerHTML=cards+addBtn;
  bindSupplierCardActions(el);
}

function supCardAction(btn){
  if(!btn) return;
  var action = btn.getAttribute('data-sup-action') || '';
  var supName = '';
  try{
    supName = decodeURIComponent(btn.getAttribute('data-supplier-token') || '');
  }catch(e){
    supName = btn.getAttribute('data-supplier-token') || '';
  }
  if(!supName) return;
  if(action === 'prices') openSupPriceLists(supName);
  else if(action === 'delete-price') deleteSupPrice(supName);
  else if(action === 'main-price') openSupPriceUpload(supName, false);
  else if(action === 'extra-price') openSupPriceUpload(supName, true);
}

function bindSupplierCardActions(root){
  root = root || document.getElementById('supGrid');
  if(!root) return;
  if(!window.__supplierCardActionBound){
    window.__supplierCardActionBound = true;
    root.addEventListener('click', function(ev){
      var btn = ev && ev.target ? ev.target.closest('button[data-sup-action]') : null;
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      supCardAction(btn);
    }, true);
  }
  root.querySelectorAll('button[data-sup-action]').forEach(function(btn){
    btn.onclick = function(ev){
      if(ev){ ev.preventDefault(); ev.stopPropagation(); }
      supCardAction(btn);
    };
  });
  window.supCardAction = supCardAction;
}

if(!window.__supplierCardDocBound){
  window.__supplierCardDocBound = true;
  document.addEventListener('click', function(ev){
    var btn = ev && ev.target ? ev.target.closest('button[data-sup-action]') : null;
    if(!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    supCardAction(btn);
  }, true);
}

function togglePersonalSup(supName){
  if(!CU)return;
  var hiddenKey='pv_hidden_'+CU.id;
  var hiddenLocal={};
  try{var h=localStorage.getItem(hiddenKey);if(h)hiddenLocal=JSON.parse(h);}catch(e){}
  hiddenLocal[supName]=!hiddenLocal[supName];
  try{localStorage.setItem(hiddenKey,JSON.stringify(hiddenLocal));}catch(e){}
  renderSuppliers();
  // Обновляем каталог — скрытые поставщики не показываются в колонках
  updatePersonalHiddenSups();
  toast(hiddenLocal[supName]?'🚫 Поставщик «'+supName+'» скрыт из вашего каталога':'✅ Поставщик «'+supName+'» снова активен','ok');
}

function updatePersonalHiddenSups(){
  if(!CU)return;
  var hiddenKey='pv_hidden_'+CU.id;
  var hiddenLocal={};
  try{var h=localStorage.getItem(hiddenKey);if(h)hiddenLocal=JSON.parse(h);}catch(e){}
  // Обновляем selSups — убираем скрытые для этого пользователя
  selSups=ALL_SUPS.filter(function(s){return !hiddenLocal[s];});
  renderCatalog();
}



function toggleSupHidden(i){
  if(!SUPS_DATA[i])return;
  SUPS_DATA[i].hidden=!SUPS_DATA[i].hidden;
  var name=SUPS_DATA[i].name;
  var isHidden=SUPS_DATA[i].hidden;
  renderSuppliers();
  toast((isHidden?'🙈 «'+name+'» скрыт из каталога':'👁 «'+name+'» снова виден'),'ok');
}

function deleteSup(i){
  if(!SUPS_DATA[i])return;
  if(!CU || !['owner','admin'].includes(CU.role)){toast('Удалять поставщика может только владелец или администратор','err');return;}
  var name=SUPS_DATA[i].name;
  if(!confirm('Удалить поставщика «'+name+'»?\n\nПоставщик будет удалён из списка и каталога.'))return;
  SUPS_DATA.splice(i,1);
  // Also remove from ALL_SUPS if present
  var idx=ALL_SUPS.indexOf(name);
  if(idx>=0)ALL_SUPS.splice(idx,1);
  renderSuppliers();
  renderRestaurants();
  renderCatalog();
  savePriceData();
  toast('🗑 Поставщик «'+name+'» удалён','ok');
  logAudit(auditActor(), 'Удалил поставщика «'+name+'»','Поставщики');
}
function renderAnalytics(){
  var orders=getAnalyticsOrders();
  var periodValue=getAnalyticsPeriodValue();
  var periodLabel=getAnalyticsPeriodLabel(periodValue);
  var sub=document.querySelector('#pg-analytics .pg-sub');
  if(sub) sub.textContent='Личная аналитика по доступным организациям · период: '+periodLabel;
  var topProducts={};
  var supplierTotals={};
  var categoryTotals={};
  var monthTotals={};
  orders.forEach(function(order){
    var sup=getOrderSupplierName(order)||'—';
    if(!supplierTotals[sup]) supplierTotals[sup]={orders:0,total:0};
    supplierTotals[sup].orders+=1;
    supplierTotals[sup].total+=(order.sum||0);
    (order.itemsDetailed||[]).forEach(function(item){
      var name=item.name||'—';
      if(!topProducts[name]) topProducts[name]={qty:0,unit:item.unit||'',orders:0};
      topProducts[name].qty+=(parseFloat(item.qty)||0);
      topProducts[name].orders+=1;
      var prod=PRODUCTS.find(function(p){ return p.name===name; });
      var cat=(prod&&prod.cat)||'Без категории';
      if(!categoryTotals[cat]) categoryTotals[cat]=0;
      categoryTotals[cat]+=((item.price||0)*(item.qty||0)) || 0;
    });
    var ts=_parseOrderDateValue(order.date);
    if(ts){
      var d=new Date(ts);
      var key=String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getFullYear()).slice(-2);
      if(!monthTotals[key]) monthTotals[key]=0;
      monthTotals[key]+=(order.sum||0);
    }
  });
  var aTopP=document.getElementById('aTopP');
  var aSupR=document.getElementById('aSupR');
  var aOrgTurnover=document.getElementById('aOrgTurnover');
  var aChart=document.getElementById('aChart');
  var summary=document.getElementById('analyticsSummary');
  var totalSpend=orders.reduce(function(sum,order){ return sum+(order.sum||0); },0);
  var avgCheck=orders.length?Math.round(totalSpend/orders.length):0;
  var supplierCount=Object.keys(supplierTotals).length;
  var bestSupplierEntry=Object.entries(supplierTotals).sort(function(a,b){ return b[1].orders-a[1].orders || b[1].total-a[1].total; })[0];
  var bestSupplierName=bestSupplierEntry?bestSupplierEntry[0]:'—';
  var bestSupplierRating=bestSupplierEntry?formatSupplierRatingAverage(getSupplierRatingSummary(bestSupplierName).average):'0.0';
  var topCategoryEntry=Object.entries(categoryTotals).sort(function(a,b){ return b[1]-a[1]; })[0];
  renderMiniStatGrid('analyticsSummary',[
    {cls:'ca',ico:'📊',label:'Ср. чек заказа',value:'₽'+avgCheck.toLocaleString(),note:orders.length?'За '+periodLabel:'Нет данных'},
    {cls:'cb',ico:'🏭',label:'Поставщиков',value:String(supplierCount),note:supplierCount?'В периоде':'Пока нет'},
    {cls:'cg',ico:'₽',label:'Общий объём',value:'₽'+Math.round(totalSpend).toLocaleString(),note:'Оборот за '+periodLabel},
    {cls:'co',ico:'🏆',label:'Ведущий поставщик',value:bestSupplierName,valStyle:'font-size:13px;line-height:1.3;',note:bestSupplierEntry?'Рейтинг '+bestSupplierRating:'Пока нет'},
    {cls:'cp',ico:'📦',label:'Главная категория',value:topCategoryEntry?topCategoryEntry[0]:'—',valStyle:'font-size:13px;line-height:1.3;',note:topCategoryEntry?'Основной объём закупки':'Нет данных'}
  ]);
  if(!orders.length){
    if(aTopP) aTopP.innerHTML='<div style="color:var(--t3);padding:18px 6px;">Нет данных по доступным организациям</div>';
    if(aSupR) aSupR.innerHTML='<div style="color:var(--t3);padding:18px 6px;">Пока нет поставщиков в личной аналитике</div>';
    if(aOrgTurnover) aOrgTurnover.innerHTML='<div style="color:var(--t3);padding:18px 6px;">Оборот появится после первых заказов</div>';
    if(aChart) aChart.innerHTML='<div style="color:var(--t3);padding:18px 6px;">График появится после первых заказов</div>';
    return;
  }
  if(aTopP){
    var topList=Object.entries(topProducts).sort(function(a,b){ return b[1].qty-a[1].qty; }).slice(0,6);
    aTopP.innerHTML=topList.map(function(row){
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--br);"><div style="font-size:13px;font-weight:700;">'+row[0]+'</div><div style="font-size:12px;color:var(--t3);">'+Math.round(row[1].qty*1000)/1000+' '+(row[1].unit||'')+'</div></div>';
    }).join('');
  }
  if(aSupR){
    var supList=Object.entries(supplierTotals).sort(function(a,b){ return b[1].total-a[1].total; }).slice(0,6);
    aSupR.innerHTML=supList.map(function(row){
      var rating=getSupplierRatingSummary(row[0]);
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--br);"><div><div style="font-size:13px;font-weight:700;">'+row[0]+'</div><div style="font-size:11px;color:var(--t3);">'+row[1].orders+' заказов</div></div><div style="text-align:right;"><div style="font-size:12px;font-weight:700;">₽'+Math.round(row[1].total).toLocaleString()+'</div><div style="font-size:11px;color:var(--t3);">★ '+formatSupplierRatingAverage(rating.average)+'</div></div></div>';
    }).join('');
  }
  if(aOrgTurnover){
    var orgList=getOrganizationTurnoverRows(orders).slice(0,6);
    aOrgTurnover.innerHTML=orgList.map(function(row){
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--br);"><div style="font-size:13px;font-weight:700;">'+row[0]+'</div><div style="font-size:12px;color:var(--t2);">₽'+Math.round(row[1]).toLocaleString()+'</div></div>';
    }).join('');
  }
  if(aChart){
    var monthList=Object.entries(monthTotals).sort(function(a,b){ return a[0].localeCompare(b[0],'ru'); }).slice(-6);
    var maxVal=monthList.reduce(function(max,row){ return Math.max(max,row[1]); },0) || 1;
    aChart.innerHTML=monthList.map(function(row){
      var width=Math.max(8, Math.round((row[1]/maxVal)*100));
      return '<div style="display:grid;grid-template-columns:54px minmax(0,1fr) 72px;gap:10px;align-items:center;margin-bottom:8px;"><div style="font-size:11px;color:var(--t3);">'+row[0]+'</div><div style="height:10px;background:var(--bg3);border-radius:999px;overflow:hidden;"><div style="height:100%;width:'+width+'%;background:linear-gradient(90deg,var(--ac),#7bdff6);border-radius:999px;"></div></div><div style="font-size:11px;color:var(--t2);text-align:right;">₽'+Math.round(row[1]).toLocaleString()+'</div></div>';
    }).join('');
  }
}
function exportAnalytics(){
  var orders=getAnalyticsOrders();
  var periodLabel=getAnalyticsPeriodLabel(getAnalyticsPeriodValue());
  var months={};
  orders.forEach(function(order){
    var ts=_parseOrderDateValue(order.date);
    if(!ts) return;
    var d=new Date(ts);
    var key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    if(!months[key]) months[key]=0;
    months[key]+=(order.sum||0);
  });
  var rows=['Период,'+periodLabel,'','Месяц,Сумма'];
  Object.keys(months).sort().forEach(function(key){
    rows.push(key+','+Math.round(months[key]));
  });
  dlFile(rows.join('\n'),'text/csv','analytics.csv');toast('📥 Аналитика экспортирована','ok');
}
function addTRow(){const i=tRC++;const po=PRODUCTS.map(p=>`<option value="${p.id}">${p.emoji} ${p.name}</option>`).join('');const so=ALL_SUPS.map(s=>`<option>${s}</option>`).join('');const d=document.createElement('div');d.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px;';d.innerHTML=`<select class="fS" id="tr-p-${i}" style="margin:0;font-size:12px;">${po}</select><input class="fI" type="number" id="tr-v-${i}" placeholder="₽" style="margin:0;"><select class="fS" id="tr-s-${i}" style="margin:0;font-size:12px;">${so}</select>`;document.getElementById('tRows').appendChild(d);}
function fillDemoT(){}
function pickTF(){const fi=document.createElement('input');fi.type='file';fi.accept='.csv,.txt';fi.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const lines=ev.target.result.split(/\r?\n/).filter(l=>l.trim());document.getElementById('tRows').innerHTML='';tRC=0;let matched=0;lines.forEach((line,idx)=>{if(idx===0&&!/\d{2,}/.test(line))return;const parts=line.split(/[,;\t]/);if(parts.length<2)return;const rawP=parts[1].replace(/[^\d.]/g,'');if(!rawP)return;const prod=PRODUCTS.find(p=>p.name.toLowerCase().includes((parts[0].trim()).toLowerCase().slice(0,4)))||PRODUCTS[matched%PRODUCTS.length];addTRow();const i=tRC-1;const ps=document.getElementById('tr-p-'+i),pv=document.getElementById('tr-v-'+i),ss=document.getElementById('tr-s-'+i);if(ps)ps.value=prod.id;if(pv)pv.value=Math.round(parseFloat(rawP));if(ss&&parts[2])ss.value=parts[2].trim();matched++;});if(!matched)fillDemoT();toast(`📂 Загружено ${matched} позиций`,'ok');};r.readAsText(f,'utf-8');};fi.click();}
function submitTender(){
  tenderChanges=[];for(let i=0;i<tRC;i++){const ps=document.getElementById('tr-p-'+i),pv=document.getElementById('tr-v-'+i),ss=document.getElementById('tr-s-'+i);if(!ps||!pv||!pv.value)continue;const pid=parseInt(ps.value),nP=parseInt(pv.value),sup=ss?ss.value:'';const prod=PRODUCTS.find(x=>x.id===pid);if(!prod)continue;tenderChanges.push({pid,name:prod.name,oldPrice:minP(prod),newPrice:nP,sup});}
  if(!tenderChanges.length){toast('❗ Нет данных','err');return;}
  tenderLoaded=true;closeModal('uploadTender');renderTender();renderTechCards();
  const ups=tenderChanges.filter(t=>t.newPrice>t.oldPrice);
  if(ups.length){document.getElementById('tAlert').classList.remove('hidden');document.getElementById('tAlertTxt').textContent=ups.map(t=>`${t.name} +${Math.round((t.newPrice-t.oldPrice)/t.oldPrice*100)}%`).join(' · ');const tb=document.getElementById('navTB');if(tb)tb.style.display='inline-flex';}
  var _ts=document.getElementById('tStats');if(_ts)_ts.classList.remove('hidden');var _tsu=document.getElementById('tsUp');if(_tsu)_tsu.textContent=ups.length;var _tsd=document.getElementById('tsDn');if(_tsd)_tsd.textContent=tenderChanges.filter(t=>t.newPrice<t.oldPrice).length;
  toast(`✅ Тендер загружен: ${tenderChanges.length} позиций. Тех. карты обновлены!`,'ok');logAudit(CU?.first+' '+(CU?.last||''),`Загрузил тендер · ${tenderChanges.length} позиций`,'Тендер');
}
function renderTender(){
  renderCart();
  // Заполнить список поставщиков в быстром добавлении
  var supSel=document.getElementById('quickSup');
  if(supSel&&ALL_SUPS)supSel.innerHTML=ALL_SUPS.map(function(s){return'<option>'+s+'</option>';}).join('');
  var _tdl=document.getElementById('tDateLbl');if(_tdl)_tdl.textContent=tenderLoaded?'Тендер от '+today():'Не загружен';
  const body=document.getElementById('tBody');if(!body)return;
  if(!tenderLoaded){body.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--t3);padding:40px;">Загрузите тендер</td></tr>';return;}
  const affD=pid=>TECH_CARDS.filter(tc=>tc.ings.some(i=>i.pid===pid)).map(tc=>tc.name);
  body.innerHTML=tenderChanges.map(t=>{const diff=t.newPrice-t.oldPrice,isUp=diff>0,pct=Math.round(Math.abs(diff)/t.oldPrice*100);const prod=PRODUCTS.find(p=>p.id===t.pid);const alt=prod?prod.suppliers.filter(s=>s.name!==t.sup).sort((a,b)=>a.price-b.price)[0]:null;const dishes=affD(t.pid);return`<tr><td><b>${t.name}</b></td><td>${t.sup}</td><td>₽${t.oldPrice.toLocaleString()}</td><td><b>₽${t.newPrice.toLocaleString()}</b></td><td style="color:${isUp?'var(--rd)':'var(--gr)'};font-weight:700;">${isUp?'▲ +':'▼ −'}${pct}%<br><small class="c3">₽${Math.abs(diff).toLocaleString()}</small></td><td>${dishes.map(d=>`<span class="badge ${isUp?'br':'bg'}" style="margin-right:3px;">${d}</span>`).join('')||'<span class="c3 fs11">—</span>'}</td><td>${isUp&&alt?`<span class="badge bb">💡 ${alt.name} ₽${alt.price.toLocaleString()}</span>`:'<span class="c3 fs11">—</span>'}</td></tr>`;}).join('');
}
function exportTender(){if(!tenderLoaded){toast('Загрузите тендер','err');return;}dlFile('Продукт,Поставщик,Старая цена,Новая цена\n'+tenderChanges.map(t=>`${t.name},${t.sup},${t.oldPrice},${t.newPrice}`).join('\n'),'text/csv','tender.csv');toast('📥 Тендер экспортирован','ok');}
function calcTCC(tc,useTender=true){return Math.round(tc.ings.reduce((s,ing)=>{const bP=useTender?curP(ing.pid):(()=>{const p=PRODUCTS.find(x=>x.id===ing.pid);return p?minP(p):0;})();const uP=ing.unit==='мл'?bP/1000:ing.unit==='л'?bP:bP/1000;return s+uP*ing.qty;},0));}
function notifyChef(){
  if(!tenderLoaded){toast('Загрузите тендер','err');return;}
  const ups=tenderChanges.filter(t=>t.newPrice>t.oldPrice);const aff=TECH_CARDS.filter(tc=>tc.ings.some(i=>ups.find(u=>u.pid===i.pid)));
  let body=ups.map(t=>`• <b>${t.name}</b> ₽${t.oldPrice}→₽${t.newPrice} (+${Math.round((t.newPrice-t.oldPrice)/t.oldPrice*100)}%)`).join('<br>');
  if(aff.length){body+='<br><br><b>Затронутые блюда:</b><br>'+aff.map(tc=>{const d=calcTCC(tc,true)-calcTCC(tc,false);return`• ${tc.name}: +₽${d} к себестоимости`;}).join('<br>');}
  showPush('warn','⚠️ Подорожание — обновите меню','👨‍🍳 Шеф Александр',body);toast('📲 Уведомление шефу!','ok');
}
function notifyManager(){
  if(!tenderLoaded){toast('Загрузите тендер','err');return;}
  const ups=tenderChanges.filter(t=>t.newPrice>t.oldPrice);const imp=TECH_CARDS.reduce((s,tc)=>{const d=calcTCC(tc,true)-calcTCC(tc,false);return s+(d>0?d:0);},0);
  showPush('info','📊 Отчёт по тендеру','👔 Управляющий Алексей',`Тендер ${today()}<br>Подорожало: <b>${ups.length}</b> позиций<br>Рост себест.: <b>+₽${imp}/порция</b>`);toast('📲 Отправлено управляющему!','ok');
}

function filtTC(cat,el){tcFilter=cat;document.querySelectorAll('#tcChips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');renderTechCards();}
function renderTechCards(){
  const el=document.getElementById('tcGrid');if(!el)return;const list=tcFilter==='all'?TECH_CARDS:TECH_CARDS.filter(t=>t.cat===tcFilter);
  const catM={hot:{e:'🍲',l:'Горячее'},cold:{e:'🥗',l:'Холодное'},dessert:{e:'🍮',l:'Десерт'},drinks:{e:'🍸',l:'Напиток'},alcohol:{e:'🍷',l:'Алкоголь'},coffee:{e:'☕',l:'Кофе/чай'}};
  if(!list.length){el.innerHTML='<div class="empty" style="grid-column:1/-1"><div class="empty-ico">📋</div><div class="empty-txt">Нет тех. карт</div><button class="empty-btn" onclick="openModal(\'newTC\')">Создать</button></div>';return;}
  el.innerHTML=list.map(tc=>{
    const cost=calcTCC(tc,true),oldC=calcTCC(tc,false),diff=cost-oldC;const sell=Math.round(cost*(1+tc.markup/100));
    const hasC=tenderLoaded&&diff!==0,pct=oldC>0?Math.round(Math.abs(diff)/oldC*100):0;const m=catM[tc.cat]||{e:'',l:tc.cat};
    return`<div class="tc" style="${hasC&&diff>0?'border-color:rgba(239,83,80,.3);':''}">
      <div class="tc-hd"><div><div class="tc-name">${tc.name}</div><div class="tc-meta">${m.e} ${m.l} · Вход ${tc.inputG}г → Выход ${tc.yieldG}г (потери ${tc.lossP}%)</div></div>
        <div class="tc-cost"><div class="tc-cost-lbl">Себестоимость</div><div class="tc-cost-val" style="color:${hasC&&diff>0?'var(--rd)':hasC&&diff<0?'var(--gr)':'var(--ac)'};">₽${cost}</div>${hasC?`<div class="tc-delta" style="color:${diff>0?'var(--rd)':'var(--gr)'};">${diff>0?'▲':'▼'} ${pct}% (${diff>0?'+':''}₽${diff})</div>`:''}</div></div>
      <div class="tc-bd">${tc.ings.map(ing=>{const pp=curP(ing.pid),ic=Math.round((pp/(ing.unit==='мл'?1000:ing.unit==='л'?1:1000))*ing.qty);const chg=tenderChanges.find(t=>t.pid===ing.pid);const pn=PRODUCTS.find(p=>p.id===ing.pid)?.name||'?';return`<div class="tc-ir"><span class="tc-in">${pn}</span><span class="tc-iq">${ing.qty}${ing.unit}</span><span class="tc-ic" style="${chg?(chg.newPrice>chg.oldPrice?'color:var(--rd)':'color:var(--gr)'):''}">₽${ic}</span></div>`;}).join('')}</div>
      <div class="tc-ft"><span class="c3">Цена продажи ×${(tc.markup/100+1).toFixed(1)}</span><span style="color:var(--ac);font-weight:700;">₽${sell.toLocaleString()}</span>
        <div style="display:flex;gap:5px;"><button onclick="openEditTC(${tc.id})" style="background:var(--aD);border:1px solid rgba(200,240,80,.2);border-radius:5px;padding:3px 8px;color:var(--ac);font-size:11px;cursor:pointer;font-weight:600;">✏️</button><button onclick="dlTC(${tc.id})" style="background:var(--blD);border:1px solid rgba(79,195,247,.2);border-radius:5px;padding:3px 8px;color:var(--bl);font-size:11px;cursor:pointer;">📥</button></div>
      </div></div>`;
  }).join('');
}
function addTCRow(){const i=tcRC++;const o=PRODUCTS.map(p=>`<option value="${p.id}">${p.emoji} ${p.name}</option>`).join('');const d=document.createElement('div');d.className='ir-calc';d.innerHTML=`<select class="fS" style="margin:0;font-size:12px;">${o}</select><input class="fI" type="number" value="100" style="margin:0;"><select class="fS" style="margin:0;font-size:12px;"><option>г</option><option>мл</option><option>л</option><option>шт</option></select><div></div><button class="del-btn" onclick="this.closest('.ir-calc').remove()">✕</button>`;document.getElementById('tcRows').appendChild(d);}
function submitTC(){
  const n=v('tc-n');if(!n){toast('❗ Укажите название','err');return;}
  const cat=document.getElementById('tc-c').value,iG=parseInt(v('tc-i'))||300,lP=parseInt(v('tc-l'))||0,yG=parseInt(v('tc-y'))||250,mkp=parseInt(v('tc-m'))||300;
  const rows=document.querySelectorAll('#tcRows .ir-calc');const ings=[];
  rows.forEach(row=>{const sels=row.querySelectorAll('select'),inp=row.querySelector('input');if(!sels[0]||!inp||!inp.value)return;ings.push({pid:parseInt(sels[0].value),qty:parseFloat(inp.value)||0,unit:sels[1]?.value||'г'});});
  if(!ings.length){toast('❗ Добавьте ингредиенты','err');return;}
  TECH_CARDS.push({id:Date.now(),name:n,cat,inputG:iG,lossP:lP,yieldG:yG,markup:mkp,ings});
  document.getElementById('tcRows').innerHTML='';tcRC=0;closeModal('newTC');renderTechCards();toast(`✅ Тех. карта «${n}» создана!`,'ok');logAudit(CU?.first+' '+(CU?.last||''),`Создал тех. карту «${n}»`,'Тех. карты');
}
let etcRC_=0;
function addETCRow(){const i=etcRC_++;const o=PRODUCTS.map(p=>`<option value="${p.id}">${p.emoji} ${p.name}</option>`).join('');const d=document.createElement('div');d.className='ir-calc';d.innerHTML=`<select class="fS" style="margin:0;font-size:12px;">${o}</select><input class="fI" type="number" value="100" style="margin:0;"><select class="fS" style="margin:0;font-size:12px;"><option>г</option><option>мл</option><option>л</option><option>шт</option></select><div></div><button class="del-btn" onclick="this.closest('.ir-calc').remove()">✕</button>`;document.getElementById('etcRows').appendChild(d);}
function openEditTC(id){
  const tc=TECH_CARDS.find(t=>t.id===id);if(!tc)return;editTCId=id;
  document.getElementById('etcId').value=id;document.getElementById('etcN').value=tc.name;document.getElementById('etcC').value=tc.cat;
  document.getElementById('etcI').value=tc.inputG;document.getElementById('etcL').value=tc.lossP;document.getElementById('etcY').value=tc.yieldG;document.getElementById('etcM').value=tc.markup;
  const rows=document.getElementById('etcRows');rows.innerHTML='';etcRC_=0;
  const o=PRODUCTS.map(p=>`<option value="${p.id}">${p.emoji} ${p.name}</option>`).join('');
  tc.ings.forEach(ing=>{const d=document.createElement('div');d.className='ir-calc';d.innerHTML=`<select class="fS" style="margin:0;font-size:12px;">${o.replace(`value="${ing.pid}"`,`value="${ing.pid}" selected`)}</select><input class="fI" type="number" value="${ing.qty}" style="margin:0;"><select class="fS" style="margin:0;font-size:12px;"><option ${ing.unit==='г'?'selected':''}>г</option><option ${ing.unit==='мл'?'selected':''}>мл</option><option ${ing.unit==='л'?'selected':''}>л</option><option ${ing.unit==='шт'?'selected':''}>шт</option></select><div></div><button class="del-btn" onclick="this.closest('.ir-calc').remove()">✕</button>`;rows.appendChild(d);etcRC_++;});
  openModal('editTC');
}
function saveTC(){
  const id=editTCId;if(!id)return;const idx=TECH_CARDS.findIndex(t=>t.id===id);if(idx<0)return;
  const n=v('etcN');if(!n){toast('❗ Укажите название','err');return;}
  const cat=document.getElementById('etcC').value,iG=parseInt(v('etcI'))||300,lP=parseInt(v('etcL'))||0,yG=parseInt(v('etcY'))||250,mkp=parseInt(v('etcM'))||300;
  const rows=document.querySelectorAll('#etcRows .ir-calc');const ings=[];
  rows.forEach(row=>{const sels=row.querySelectorAll('select'),inp=row.querySelector('input');if(!sels[0]||!inp)return;ings.push({pid:parseInt(sels[0].value),qty:parseFloat(inp.value)||0,unit:sels[1]?.value||'г'});});
  TECH_CARDS[idx]={...TECH_CARDS[idx],name:n,cat,inputG:iG,lossP:lP,yieldG:yG,markup:mkp,ings};
  var db=dbGet();db.techCards=TECH_CARDS;dbSet(db);closeModal('editTC');renderTechCards();toast(`✅ «${n}» обновлена!`,'ok');
}
function deleteTC(){const id=editTCId;const tc=TECH_CARDS.find(t=>t.id===id);if(!confirm(`Удалить тех. карту «${tc?.name}»?`))return;TECH_CARDS=TECH_CARDS.filter(t=>t.id!==id);closeModal('editTC');renderTechCards();toast('🗑 Тех. карта удалена','ok');}
function dlTC(id){
  const tc=TECH_CARDS.find(t=>t.id===id);if(!tc)return;const cost=calcTCC(tc,true),sell=Math.round(cost*(1+tc.markup/100));
  const txt=`ТЕХНОЛОГИЧЕСКАЯ КАРТА\n${'═'.repeat(40)}\nНазвание: ${tc.name}\nКатегория: ${tc.cat}\nВход сырья: ${tc.inputG} г\nПотери: ${tc.lossP}%\nВыход блюда: ${tc.yieldG} г\nНаценка: ${tc.markup}%\n\nИНГРЕДИЕНТЫ:\n${tc.ings.map(ing=>{const p=PRODUCTS.find(x=>x.id===ing.pid);const pp=curP(ing.pid),ic=Math.round((pp/(ing.unit==='мл'?1000:ing.unit==='л'?1:1000))*ing.qty);return`  ${p?.name||'?'} — ${ing.qty}${ing.unit} — ₽${ic}`;}).join('\n')}\n\nСЕБЕСТОИМОСТЬ: ₽${cost}\nЦЕНА ПРОДАЖИ:  ₽${sell}\nМАРЖА:         ${sell>0?Math.round((sell-cost)/sell*100):0}%\n\nДата: ${today()}`;
  dlFile(txt,'text/plain',`TC_${tc.name.replace(/\s+/g,'_')}.txt`);toast('📥 Тех. карта скачана','ok');
}
function downloadAllTC(){TECH_CARDS.forEach(tc=>dlTC(tc.id));toast(`📥 Скачано ${TECH_CARDS.length} тех. карт`,'ok');}
function uploadTCFile(){const fi=document.createElement('input');fi.type='file';fi.accept='.json';fi.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const data=JSON.parse(ev.target.result);if(Array.isArray(data)){TECH_CARDS.push(...data);renderTechCards();toast(`✅ Загружено ${data.length} тех. карт`,'ok');}}catch{toast('❗ Ошибка формата','err');}};r.readAsText(f);};fi.click();}

let calcRC_=0;
function initCalc(){if(document.getElementById('calcRows').children.length===0){addCalcRow();addCalcRow();}}
function addCalcRow(){
  const i=calcRC_++;const o=PRODUCTS.map(p=>`<option value="${p.id}">${p.emoji} ${p.name} (₽${minP(p)}/кг)</option>`).join('');
  const row=document.createElement('div');row.className='ir-calc';row.dataset.rid=i;
  row.innerHTML=`<select class="fS" onchange="recalc()" style="margin:0;font-size:12px;">${o}</select><input class="fI" type="number" value="100" min="0.1" step="0.1" oninput="recalc()" style="margin:0;"><select class="fS" onchange="recalc()" style="margin:0;font-size:12px;"><option>г</option><option>мл</option><option>л</option><option>шт</option><option>кг</option></select><div class="ir-cost" id="ic${i}">₽0</div><button class="del-btn" onclick="this.closest('.ir-calc').remove();recalc();">✕</button>`;
  document.getElementById('calcRows').appendChild(row);recalc();
}
function clearCalcRows(){document.getElementById('calcRows').innerHTML='';calcRC_=0;recalc();}
function recalc(){
  const rows=document.querySelectorAll('#calcRows .ir-calc');let total=0,bd='';
  rows.forEach(row=>{
    const sels=row.querySelectorAll('select'),inp=row.querySelector('input'),rid=row.dataset.rid;if(!sels[0]||!inp)return;
    const pid=parseInt(sels[0].value),qty=parseFloat(inp.value)||0,unit=sels[1]?.value||'г';
    const pp=curP(pid);const p=PRODUCTS.find(x=>x.id===pid);
    let c=unit==='г'?pp/1000*qty:unit==='мл'?(p?.pMl||pp/1000)*qty:unit==='л'?(p?.pL||pp)*qty:unit==='шт'?(p?.pSh||pp)*qty:pp*qty;
    c=Math.round(c*100)/100;total+=c;
    const el=document.getElementById('ic'+rid);if(el)el.textContent='₽'+c.toFixed(0);
    bd+=`<div class="os-row" style="margin-bottom:4px;font-size:12px;"><span>${p?.name||'?'} ${qty}${unit}</span><span>₽${c.toFixed(0)}</span></div>`;
  });
  const inG=parseInt(document.getElementById('calcIn')?.value)||300;
  const lossP=Math.min(100,Math.max(0,parseInt(document.getElementById('calcLoss')?.value)||0));
  const yldG=parseInt(document.getElementById('calcYield')?.value)||250;
  const mkp=parseInt(document.getElementById('calcMarkup')?.value)||300;
  const lossVal=Math.round(inG*(lossP/100));
  const cost=Math.round(total),sell=Math.round(cost*(1+mkp/100)),margin=sell>0?Math.round((sell-cost)/sell*100):0,profit=sell-cost;
  document.getElementById('rCost').textContent='₽'+cost.toLocaleString();
  document.getElementById('rSub').textContent=`за 1 порцию · выход ${yldG}г`;
  document.getElementById('rIn').textContent=inG+'г';document.getElementById('rLoss').textContent=lossVal+'г ('+lossP+'%)';document.getElementById('rOut').textContent=yldG+'г';
  document.getElementById('rSell').textContent='₽'+sell.toLocaleString();document.getElementById('rMargin').textContent=margin+'%';document.getElementById('rProfit').textContent='₽'+profit.toLocaleString();
  const bdEl=document.getElementById('rBD');if(bdEl)bdEl.innerHTML=bd||'<div class="c3 fs12">Добавьте ингредиенты</div>';
}
function clearCalc(){clearCalcRows();document.getElementById('calcName').value='';document.getElementById('calcMarkup').value='300';document.getElementById('calcIn').value='300';document.getElementById('calcLoss').value='0';document.getElementById('calcYield').value='250';addCalcRow();addCalcRow();}
function saveCalcAsTC(){
  const n=(document.getElementById('calcName').value||'').trim()||'Новое блюдо';
  const mkp=parseInt(document.getElementById('calcMarkup').value)||300,iG=parseInt(document.getElementById('calcIn').value)||300,lP=parseInt(document.getElementById('calcLoss').value)||0,yG=parseInt(document.getElementById('calcYield').value)||250;
  const rows=document.querySelectorAll('#calcRows .ir-calc');const ings=[];
  rows.forEach(row=>{const sels=row.querySelectorAll('select'),inp=row.querySelector('input');if(!sels[0]||!inp||!inp.value)return;ings.push({pid:parseInt(sels[0].value),qty:parseFloat(inp.value)||0,unit:sels[1]?.value||'г'});});
  if(!ings.length){toast('❗ Добавьте ингредиенты','err');return;}
  TECH_CARDS.push({id:Date.now(),name:n,cat:'hot',inputG:iG,lossP:lP,yieldG:yG,markup:mkp,ings});
  toast(`✅ «${n}» сохранена в тех. картах!`,'ok');goPage('techcards');
}
function downloadCalc(){
  const n=(document.getElementById('calcName').value||'Блюдо').trim();
  const mkp=parseInt(document.getElementById('calcMarkup').value)||300,lP=parseInt(document.getElementById('calcLoss').value)||0,yG=parseInt(document.getElementById('calcYield').value)||250,iG=parseInt(document.getElementById('calcIn').value)||300;
  let total=0;const lines=[];
  document.querySelectorAll('#calcRows .ir-calc').forEach(row=>{const sels=row.querySelectorAll('select'),inp=row.querySelector('input');if(!sels[0]||!inp)return;const pid=parseInt(sels[0].value),qty=parseFloat(inp.value)||0,unit=sels[1]?.value||'г';const pp=curP(pid);const p=PRODUCTS.find(x=>x.id===pid);const c=unit==='г'?pp/1000*qty:unit==='кг'?pp*qty:pp*qty;total+=c;lines.push(`  ${p?.name||'?'} — ${qty}${unit} — ₽${c.toFixed(0)}`);});
  const cost=Math.round(total),sell=Math.round(cost*(1+mkp/100));
  dlFile(`КАЛЬКУЛЯЦИЯ БЛЮДА\n${'═'.repeat(40)}\nНазвание: ${n}\nВход сырья: ${iG}г\nПотери: ${lP}%\nВыход: ${yG}г\nНаценка: ${mkp}%\n\nИНГРЕДИЕНТЫ:\n${lines.join('\n')}\n\nСЕБЕСТОИМОСТЬ: ₽${cost}\nЦЕНА ПРОДАЖИ:  ₽${sell}\nМАРЖА:         ${sell>0?Math.round((sell-cost)/sell*100):0}%\n\nДата: ${today()}`,'text/plain',`Calc_${n.replace(/\s+/g,'_')}.txt`);toast('📥 Калькуляция скачана','ok');
}
function uploadCalcFile(){toast('Загрузка калькуляции — в разработке','ok');}

function renderSupDash(){if(CU)document.getElementById('supDashSub').textContent=CU.company;}
function uploadSupFile(){
  var fi=document.createElement('input');fi.type='file';fi.accept='.csv,.txt';
  fi.onchange=function(e){
    var f=e.target.files[0];if(!f)return;
    var r=new FileReader();
    r.onload=function(ev){
      var lines=ev.target.result.split(/\r?\n/).filter(function(l){return l.trim();});
      var added=0,updated=0;
      lines.forEach(function(line,idx){
        if(idx===0&&/название|name|товар/i.test(line))return;
        var parts=line.split(/[,;\t]/);
        if(parts.length<2)return;
        var name=(parts[0]||'').trim();if(!name)return;
        var cat=(parts[1]||'').trim()||'—';
        var pKg=parseFloat(parts[2])||0;
        var pSh=parseFloat(parts[3])||0;
        var pL=parseFloat(parts[4])||0;
        var pMl=parseFloat(parts[5])||0;
        var stock=parseInt(parts[6])||100;
        var unit=pKg?'кг':pSh?'шт':pL?'л':'кг';
        var ex=SUP_PRODS.findIndex(function(p){return p.name.toLowerCase()===name.toLowerCase();});
        if(ex>=0){
          SUP_PRODS[ex]=Object.assign(SUP_PRODS[ex],{cat:cat,pKg:pKg,pSh:pSh,pL:pL,pMl:pMl,stock:stock});
          updated++;
        } else {
          SUP_PRODS.push({id:Date.now()+idx,name:name,cat:cat,unit:unit,pKg:pKg,pSh:pSh,pL:pL,pMl:pMl,stock:stock,active:true});
          added++;
        }
      });
      renderSupProducts();
      toast('Загружено: +'+added+' новых, обновлено '+updated,'ok');
    };
    r.readAsText(f,'utf-8');
  };
  fi.click();
}

function renderSupProducts(){
  var el=document.getElementById('supProdBody');if(!el)return;
  var q=(document.getElementById('supProdSearch')||{value:''}).value.toLowerCase();
  if(!SUP_PRODS.length){
    el.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--t3);">Нет товаров. Загрузите прайс кнопкой выше.</td></tr>';
    return;
  }
  var rows=SUP_PRODS.map(function(p,i){
    if(q&&p.name.toLowerCase().indexOf(q)<0&&(p.cat||'').toLowerCase().indexOf(q)<0)return '';
    var canSee=canSeePrices(p);
    var hidStyle=p.hidden?'opacity:0.45;':'';
    var hidBadge=p.hidden?'<span style="font-size:10px;background:var(--rdD);color:var(--rd);border-radius:3px;padding:1px 5px;margin-left:4px;">скрыт</span>':'';
    var companies=(p.allowedCompanies&&p.allowedCompanies.length)?p.allowedCompanies.join(', '):'Все';
    var compBadge=(CU&&(CU.role==='owner'||CU.role==='admin'))?'<div style="font-size:10px;color:var(--t3);">👥 '+companies+'</div>':'';
    var dash='<span style="color:var(--t4);">—</span>';
    function priceCell(val,field){
      if(!canSee) return dash;
      return '<input class="pi" type="number" value="'+val+'" onchange="SUP_PRODS['+i+'].'+field+'=parseFloat(this.value)||0;">';
    }
    var actionBtns='';
    if(canSee){
      actionBtns+=
        '<button onclick="SUP_PRODS['+i+'].hidden=!SUP_PRODS['+i+'].hidden;renderSupProducts();" style="background:var(--bg3);border:1px solid var(--br);border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--t2);">'+(p.hidden?'👁':'🙈')+'</button>'
       +'<button onclick="SUP_PRODS['+i+'].active=!SUP_PRODS['+i+'].active;renderSupProducts();" style="background:'+(p.active?'var(--rdD)':'var(--grD)')+';color:'+(p.active?'var(--rd)':'var(--gr)')+';border:1px solid '+(p.active?'var(--rd)':'var(--gr)')+';border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;">'+(p.active?'Откл.':'Вкл.')+'</button>'
       +'<button onclick="delSupProd('+i+')" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:5px;padding:3px 7px;font-size:11px;cursor:pointer;">✕</button>';
    }
    return '<tr style="'+hidStyle+'">'
      +'<td><div style="font-weight:600;">'+p.name+hidBadge+'</div>'+compBadge+'</td>'
      +'<td><span class="badge bb" style="font-size:11px;">'+p.cat+'</span></td>'
      +'<td>'+priceCell(p.pKg,'pKg')+'</td>'
      +'<td>'+priceCell(p.pSh,'pSh')+'</td>'
      +'<td>'+priceCell(p.pL,'pL')+'</td>'
      +'<td>'+priceCell(p.pMl,'pMl')+'</td>'
      +'<td><span style="color:'+(p.stock<50?'var(--rd)':p.stock<100?'var(--ac)':'var(--gr)')+';">'+p.stock+'</span></td>'
      +'<td><span class="badge '+(p.active?'bg':'bgr')+'">'+(p.active?'Активен':'Скрыт')+'</span></td>'
      +'<td style="display:flex;gap:4px;justify-content:flex-end;">'+actionBtns+'</td>'
      +'</tr>';
  }).join('');
  el.innerHTML=rows||'<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--t3);">Ничего не найдено</td></tr>';
}

function delSupProd(i){
  if(!confirm('Удалить товар «'+(SUP_PRODS[i]?SUP_PRODS[i].name:'')+'»?'))return;
  SUP_PRODS.splice(i,1);
  renderSupProducts();
  toast('Удалено','ok');
}
function renderSupOrders(){
  const el=document.getElementById('supOrdBody');if(!el)return;
  el.innerHTML=ORDERS.slice(0,4).map((o,oi)=>{const[cl,lb]=SM[o.status]||['bgr','—'];return`<tr><td><b>${o.id}</b></td><td>${o.sup.split(' ').slice(1).join(' ')}</td><td>${o.items}</td><td style="font-size:11px;color:var(--t2);">${o.comment||'—'}</td><td><b>₽${o.sum.toLocaleString()}</b></td><td>${o.date}</td><td><span class="badge ${cl}">${lb}</span></td><td>${o.status==='processing'?`<button onclick="ORDERS[${oi}].status='transit';renderSupOrders();toast('✓ Принято!','ok');" style="background:var(--grD);color:var(--gr);border:1px solid var(--gr);border-radius:5px;padding:4px 9px;font-size:11px;cursor:pointer;font-weight:600;">✓ Принять</button>`:''}</td></tr>`;}).join('');
  const newOrd=document.getElementById('supNewOrd');
  if(newOrd)newOrd.innerHTML=ORDERS.filter(o=>o.status==='processing').map((o,oi)=>`<div style="background:var(--orD);border:1px solid rgba(255,112,67,.25);border-radius:var(--r2);padding:15px;margin-bottom:9px;"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;"><div><div style="font-weight:700;font-size:14px;">${o.id} · ${o.sup.split(' ').slice(1).join(' ')}</div><div style="font-size:11px;color:var(--t3);">${o.date}${o.comment?' · 💬 '+o.comment:''}</div></div><span class="badge bo">Новый</span></div><div style="font-size:13px;color:var(--t2);margin-bottom:12px;">${o.items}</div><div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-family:var(--fH);font-size:17px;font-weight:800;">₽${o.sum.toLocaleString()}</div><div style="display:flex;gap:7px;"><button onclick="ORDERS[${ORDERS.indexOf(o)}].status='transit';renderSupOrders();renderSupDash();toast('✓ Заказ принят!','ok');" style="background:var(--grD);color:var(--gr);border:1px solid var(--gr);border-radius:var(--r);padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer;">✓ Принять</button><button onclick="ORDERS[${ORDERS.indexOf(o)}].status='cancelled';renderSupOrders();renderSupDash();toast('✕ Отклонён','ok');" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:var(--r);padding:9px 18px;font-size:13px;cursor:pointer;">✕ Отклонить</button></div></div></div>`).join('')||'<div class="empty"><div class="empty-ico">✅</div><div class="empty-txt">Нет новых заказов</div></div>';
}
function renderSupAnalytics(){
  var el=document.getElementById('supAnalyticsBody');if(!el)return;
  var supMap={};
  ORDERS.forEach(function(o){
    var sn=(o.sup||'').replace(/^[^\s]*\s/,'').trim();
    if(!supMap[sn])supMap[sn]={orders:0,total:0};
    supMap[sn].orders++; supMap[sn].total+=(o.sum||0);
  });
  var list=Object.entries(supMap).sort(function(a,b){return b[1].total-a[1].total;});
  el.innerHTML=list.length ? list.map(function(x){
    return '<tr><td style="padding:10px 12px;">'+x[0]+'</td>'
      +'<td style="padding:10px;text-align:center;">'+x[1].orders+'</td>'
      +'<td style="padding:10px;text-align:right;font-weight:700;">₽'+x[1].total.toLocaleString()+'</td>'
      +'<td style="padding:10px;text-align:center;color:var(--t3);">—</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:30px;">Нет данных о заказах</td></tr>';
}
function renderAdmin(){
  const db=dbGet();const pending=db.users.filter(u=>u.status==='pending');const all=db.users.filter(u=>u.status!=='pending');
  document.getElementById('pendCnt').textContent=pending.length;
  document.getElementById('adminSub').textContent=`${db.users.length} пользователей · ${pending.length} ожидают`;
  if(adTab==='pending'){
    document.getElementById('adPending').innerHTML=pending.length?pending.map(u=>{const rd=ROLES[u.role]||{};const tc=['owner','chef','buyer'].includes(u.role)?'#000':'#fff';return`<div class="pc"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><div class="u-ava" style="background:linear-gradient(135deg,${rd.color},${rd.color}88);color:${tc};width:38px;height:38px;font-size:12px;">${(u.first[0]+u.last[0]).toUpperCase()}</div><div style="flex:1;"><div style="font-weight:700;font-size:14px;">${u.first} ${u.last}</div><div style="font-size:12px;color:var(--t2);">${u.company} · ${u.email}</div><div style="font-size:11px;color:var(--t3);margin-top:2px;">Роль: ${rd.emoji} ${rd.label} · Заявка: ${u.created}${u.reason?' · "'+u.reason+'"':''}</div></div><div style="display:flex;gap:7px;flex-wrap:wrap;"><button onclick="approveUser('${u.id}')" style="background:var(--grD);color:var(--gr);border:1px solid var(--gr);border-radius:var(--r);padding:8px 16px;font-weight:700;font-size:12px;cursor:pointer;">✓ Одобрить</button><button onclick="rejectUser('${u.id}')" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:var(--r);padding:8px 16px;font-size:12px;cursor:pointer;">✕ Отклонить</button></div></div></div>`;}).join(''):
    '<div class="empty"><div class="empty-ico">✅</div><div class="empty-txt">Нет новых заявок</div></div>';
  }
  if(adTab==='all'){
    document.getElementById('adAll').innerHTML=`<div class="panel"><div class="tw"><table><thead><tr><th></th><th>Пользователь</th><th>Компания / Email</th><th>Организации</th><th>Роль</th><th>Дашборд</th><th>Статус</th><th>Действия</th></tr></thead><tbody>${all.map(u=>{const rd=ROLES[u.role]||{};const tc=['owner','chef','buyer'].includes(u.role)?'#000':'#fff';const da=normalizeDashboardAccess(u);const restIds=getUserScopedRestaurantIds(u,db);const restCount=restIds.length;const dashCount=getUserDashboardRestaurantIds(u,db).length;const dashLabel=u.role==='owner'?'Весь дашборд':(!da.enabled?'Нет доступа':da.scope==='all_orgs'?'Все организации':da.scope==='selected'?'Выбрано: '+dashCount:'Назначено: '+dashCount);const dashTone=u.role==='owner'?'bg':(da.enabled?'bb':'br');const dashAction=(CU&&CU.role==='owner'&&u.role!=='owner')?`<button onclick="openDashboardAccessModal('${u.id}')" style="margin-top:6px;background:var(--bg4);border:1px solid var(--br2);border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;color:var(--t2);">⚙️ Настроить</button>`:'';const orgLabel=u.role==='owner'?'Все организации':(restCount?('Доступно: '+restCount):'Не назначены');return`<tr><td><div class="u-ava" style="background:linear-gradient(135deg,${rd.color},${rd.color}88);color:${tc};">${(u.first[0]+u.last[0]).toUpperCase()}</div></td><td><b>${u.first} ${u.last}</b></td><td style="font-size:12px;color:var(--t2);">${u.company}<br>${u.email}</td><td style="font-size:11px;color:var(--t3);">${orgLabel}</td><td><select class="role-sel" onchange="changeRole('${u.id}',this.value)">${Object.entries(ROLES).map(([k,r])=>`<option value="${k}" ${u.role===k?'selected':''}>${r.emoji} ${r.label}</option>`).join('')}</select></td><td style="font-size:11px;color:var(--t2);"><span class="badge ${dashTone}">${dashLabel}</span>${dashAction}</td><td><span class="badge ${u.status==='active'?'bg':u.status==='blocked'?'br':'by'}">${u.status==='active'?'Активен':u.status==='blocked'?'Заблокирован':'Ожидает'}</span></td><td><button onclick="toggleBlock('${u.id}')" style="background:${u.status==='blocked'?'var(--grD)':'var(--rdD)'};color:${u.status==='blocked'?'var(--gr)':'var(--rd)'};border:1px solid ${u.status==='blocked'?'var(--gr)':'var(--rd)'};border-radius:5px;padding:4px 10px;font-size:11px;cursor:pointer;">${u.status==='blocked'?'✓ Разблокировать':'🚫 Заблокировать'}</button></td></tr>`;}).join('')}</tbody></table></div></div>`;
  }
  if(adTab==='matrix'){
    const pages=['restaurants','dashboard','catalog','order','cart','orders','favorites','suppliers','analytics','tender','techcards','chef-calc','sup-products','sup-dashboard','sup-orders','sup-analytics','admin','owner'];
    const roleKeys=Object.keys(ROLES);
    document.getElementById('pmH').innerHTML=`<th style="padding:9px 13px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);">Раздел</th>`+roleKeys.map(k=>`<th style="padding:9px 13px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${ROLES[k].color};">${ROLES[k].emoji} ${ROLES[k].label}</th>`).join('');
    document.getElementById('pmB').innerHTML=pages.map(pg=>`<tr><td style="padding:9px 13px;font-size:12px;font-weight:600;">${PM[pg]?.ico||'•'} ${PM[pg]?.lbl||pg}</td>${roleKeys.map(k=>`<td style="padding:9px 13px;text-align:center;"><span style="font-size:16px;">${(ROLES[k].pages||[]).includes(pg)?'✅':'—'}</span></td>`).join('')}</tr>`).join('');
  }
}
function adSw(tab){
  adTab=tab;
  // show/hide content divs
  ['adPending','adAll','adMatrix'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.classList.toggle('hidden', id!=='ad'+tab.charAt(0).toUpperCase()+tab.slice(1));
  });
  // highlight correct button — HTML uses tabPend, tabAll, tabMatrix
  var btnMap={pending:'tabPend',all:'tabAll',matrix:'tabMatrix'};
  ['pending','all','matrix'].forEach(function(t){
    var btn=document.getElementById(btnMap[t]);
    if(btn){
      btn.style.background = t===tab ? 'var(--ac)' : '';
      btn.style.color      = t===tab ? '#000'       : '';
    }
  });
  renderAdmin();
}
function approveUser(id){
  const db=dbGet();const u=db.users.find(x=>x.id===id);if(!u)return;
  u.status='active';u.approved=today();dbSet(db);
  renderAdmin();renderDemoG();renderOwner();
  toast('✅ '+u.first+' '+u.last+' — доступ открыт!','ok');
  showPush('ok','✅ Пользователь одобрен','',u.first+' '+u.last+'<br>'+u.email+'<br>'+u.company);
  logAudit(auditActor(), 'Одобрил пользователя '+u.email,'Пользователи');
  updPendBadge();
}
function rejectUser(id){
  const db=dbGet();const u=db.users.find(x=>x.id===id);if(!u)return;
  u.status='rejected';dbSet(db);
  renderAdmin();renderOwner();
  toast('❌ '+u.first+' '+u.last+' — отклонён','ok');
  logAudit(auditActor(), 'Отклонил '+u.email,'Пользователи');
  updPendBadge();
}
function changeRole(id,role){const db=dbGet();const u=db.users.find(x=>x.id===id);if(!u||!ROLES[role])return;u.role=role;dbSet(db);renderOwner();toast(`✅ Роль изменена на ${ROLES[role].label}`,'ok');logAudit(CU?.first+' '+(CU?.last||''),`Изменил роль ${u.email} на ${role}`,'Пользователи');}
function toggleBlock(id){const db=dbGet();const u=db.users.find(x=>x.id===id);if(!u||u.id===CU?.id)return;u.status=u.status==='blocked'?'active':'blocked';dbSet(db);renderAdmin();renderOwner();toast(u.status==='blocked'?`🚫 ${u.first} заблокирован`:`✅ ${u.first} разблокирован`,'ok');}
var _dashboardAccessUserId='';
function openDashboardAccessModal(userId){
  if(!CU || CU.role!=='owner'){toast('Только владелец может выдавать права на дашборд','err');return;}
  var db=dbGet();
  var user=(db.users||[]).find(function(item){ return item.id===userId; });
  if(!user){toast('Пользователь не найден','err');return;}
  _dashboardAccessUserId=userId;
  var access=normalizeDashboardAccess(user);
  var info=document.getElementById('da-user'); if(info) info.innerHTML='<b>'+user.first+' '+user.last+'</b> · '+(user.company||'—')+' · '+user.email;
  var enabled=document.getElementById('da-enabled'); if(enabled) enabled.checked=!!access.enabled;
  var scope=document.getElementById('da-scope'); if(scope) scope.value=access.scope||'assigned';
  var list=document.getElementById('da-rest-list');
  if(list){
    var rests=(db.restaurants||[]).filter(function(rest){ return rest.id!=='r0'; });
    list.innerHTML=rests.length?rests.map(function(rest){
      var checked=access.restaurantIds.indexOf(rest.id)>=0?'checked':'';
      return '<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;border-radius:6px;"><input type="checkbox" class="da-rest-cb" value="'+rest.id+'" '+checked+' style="width:15px;height:15px;accent-color:var(--ac);"><span style="font-size:13px;">'+(rest.emoji||'🍽️')+' '+rest.name+'</span><span style="font-size:11px;color:var(--t3);margin-left:auto;">'+(rest.city||'')+'</span></label>';
    }).join(''):'<div style="color:var(--t3);font-size:12px;padding:8px;">Нет заведений</div>';
  }
  toggleDashboardAccessForm();
  openModal('dashboardAccess');
}
function toggleDashboardAccessForm(){
  var enabled=!!document.getElementById('da-enabled')?.checked;
  var scope=document.getElementById('da-scope')?.value||'assigned';
  var form=document.getElementById('da-form'); if(form) form.style.display=enabled?'block':'none';
  var note=document.getElementById('da-all-orgs-note'); if(note) note.style.display=(enabled&&scope==='all_orgs')?'block':'none';
  var restList=document.getElementById('da-rest-list'); if(restList) restList.style.display=(enabled&&scope==='selected')?'grid':'none';
  var restLabel=document.getElementById('da-rest-label'); if(restLabel) restLabel.style.display=(enabled&&scope==='selected')?'block':'none';
}
function saveDashboardAccess(){
  if(!CU || CU.role!=='owner'){toast('Только владелец может менять права дашборда','err');return;}
  var db=dbGet();
  var user=(db.users||[]).find(function(item){ return item.id===_dashboardAccessUserId; });
  if(!user){toast('Пользователь не найден','err');return;}
  var enabled=!!document.getElementById('da-enabled')?.checked;
  var scope=document.getElementById('da-scope')?.value||'assigned';
  if(scope==='all_orgs' && user.role!=='admin') scope='selected';
  var restaurantIds=[];
  document.querySelectorAll('.da-rest-cb:checked').forEach(function(cb){ restaurantIds.push(cb.value); });
  if(enabled && scope==='selected' && !restaurantIds.length){toast('Выберите хотя бы одно заведение','err');return;}
  user.dashboardAccess={enabled:enabled,scope:scope,restaurantIds:restaurantIds};
  dbSet(db);
  closeModal('dashboardAccess');
  renderAdmin();
  renderOwner();
  logAudit(CU?.first+' '+(CU?.last||''),'Настроил дашборд-доступ для '+user.email,'Пользователи');
  toast('✅ Права дашборда сохранены','ok');
}

function ownerGetSettings(){
  var db=dbGet();
  if(!db.platformSettings) db.platformSettings={};
  var ps=db.platformSettings;
  return {
    name: ps.name || 'КальКа',
    tagline: ps.tagline || 'Платформа управления закупками',
    supportEmail: ps.supportEmail || 'support@provision.ru',
    currency: ps.currency || '₽ Рубль',
    timezone: ps.timezone || 'UTC+3 Москва',
    domain: ps.domain || '',
    adminAdvanced: !!ps.adminAdvanced
  };
}

function hasAdminAdvancedAccess(){
  var settings=ownerGetSettings();
  return !!(CU && CU.role==='admin' && settings.adminAdvanced);
}

function normalizeDashboardAccess(user){
  var access=user&&user.dashboardAccess&&typeof user.dashboardAccess==='object'?user.dashboardAccess:{};
  return {
    enabled:user&&user.role==='owner'?true:!!access.enabled,
    scope:access.scope||((user&&user.role==='owner')?'all_orgs':'assigned'),
    restaurantIds:Array.isArray(access.restaurantIds)?access.restaurantIds.filter(Boolean):[]
  };
}

function getUserRestaurantMembershipIds(user, db){
  db=db||dbGet();
  if(!user) return [];
  return (db.restaurants||[]).filter(function(rest){
    return rest.id!=='r0' && Array.isArray(rest.members) && rest.members.some(function(member){ return member.userId===user.id; });
  }).map(function(rest){ return rest.id; });
}

function getUserDashboardRestaurantIds(user, db){
  db=db||dbGet();
  if(!user) return [];
  if(user.role==='owner') return (db.restaurants||[]).filter(function(rest){ return rest.id!=='r0'; }).map(function(rest){ return rest.id; });
  var access=normalizeDashboardAccess(user);
  if(!access.enabled) return [];
  if(access.scope==='all_orgs') return (db.restaurants||[]).filter(function(rest){ return rest.id!=='r0'; }).map(function(rest){ return rest.id; });
  if(access.scope==='selected') return access.restaurantIds.slice();
  return getUserRestaurantMembershipIds(user, db);
}

function getUserScopedRestaurantIds(user, db){
  db=db||dbGet();
  if(!user) return [];
  if(user.role==='owner') return (db.restaurants||[]).filter(function(rest){ return rest.id!=='r0'; }).map(function(rest){ return rest.id; });
  if(user.role==='admin'){
    var access=normalizeDashboardAccess(user);
    if(access.enabled && access.scope==='all_orgs') return (db.restaurants||[]).filter(function(rest){ return rest.id!=='r0'; }).map(function(rest){ return rest.id; });
  }
  return getUserRestaurantMembershipIds(user, db);
}

function getUserVisibleOrders(user){
  if(!user) return [];
  var db=dbGet();
  var allowedIds=getUserScopedRestaurantIds(user, db);
  if(user.role==='owner') return (ORDERS||[]).slice();
  if(!allowedIds.length) return [];
  return (ORDERS||[]).filter(function(order){
    return allowedIds.indexOf(String(order.restId||''))>=0;
  });
}

function getUserOutgoingOrders(user){
  if(!user) return [];
  return getUserVisibleOrders(user).filter(function(order){
    if(order.createdByUserId || order.createdByEmail){
      return order.createdByUserId===user.id || order.createdByEmail===user.email;
    }
    return true;
  });
}

function normalizeSupplierOrganizationIds(supplier, db){
  db=db||dbGet();
  if(!supplier) return [];
  var ids=Array.isArray(supplier.organizationIds)?supplier.organizationIds.filter(Boolean):[];
  if(ids.length) return Array.from(new Set(ids.map(String)));
  if(Array.isArray(supplier.organizations) && supplier.organizations.length){
    ids=supplier.organizations.map(function(value){
      var rest=(db.restaurants||[]).find(function(item){
        return item && (String(item.id)===String(value) || String(item.name)===String(value));
      });
      return rest ? String(rest.id) : '';
    }).filter(Boolean);
  }
  return Array.from(new Set(ids.map(String)));
}

function getSupplierVisibleOrganizationsForUser(supplier, user, db){
  db=db||dbGet();
  var ids=normalizeSupplierOrganizationIds(supplier, db);
  var rests=(db.restaurants||[]).filter(function(rest){
    return rest && rest.id!=='r0' && ids.indexOf(String(rest.id))>=0;
  });
  if(!user) return [];
  if(user.role==='owner' || user.role==='admin') return rests;
  return rests.filter(function(rest){ return isRestaurantParticipant(user, rest); });
}

function canManageSupplierRecord(user, supplier, db){
  db=db||dbGet();
  if(!user || !supplier) return false;
  if(user.role==='owner' || user.role==='admin') return true;
  return getSupplierVisibleOrganizationsForUser(supplier, user, db).length>0;
}

function getUserVisibleSuppliers(user){
  var db=dbGet();
  var base=(SUPS_DATA||[]).filter(function(s){ return s && !s.hidden; });
  if(!user) return [];
  if(user.role==='owner') return base;
  if(user.role==='admin' && normalizeDashboardAccess(user).scope==='all_orgs') return base;

  var visibleNames={};
  var allowedIds=getUserScopedRestaurantIds(user, db);
  base.forEach(function(supplier){
    var orgIds=normalizeSupplierOrganizationIds(supplier, db);
    if(orgIds.some(function(id){ return allowedIds.indexOf(String(id))>=0; })){
      visibleNames[supplier.name]=true;
    }
  });
  getUserVisibleOrders(user).forEach(function(order){
    var name=getOrderSupplierName(order);
    if(name) visibleNames[name]=true;
  });
  (SUP_PRODS||[]).forEach(function(prod){
    if(!prod) return;
    if(canSeePrices({allowedCompanies:prod.allowedCompanies,allowedUserIds:prod.allowedUserIds})){
      var supName=prod._supplier||prod.supplier||'';
      if(supName) visibleNames[supName]=true;
    }
  });
  return base.filter(function(s){ return !!visibleNames[s.name]; });
}

function isRestaurantParticipant(user, rest){
  if(!user || !rest) return false;
  if(user.role==='owner') return true;
  return Array.isArray(rest.members) && rest.members.some(function(member){ return member.userId===user.id; });
}

function canViewRestaurantSensitiveData(user, rest){
  return isRestaurantParticipant(user, rest);
}

function canManageRestaurantMembers(user, rest){
  if(!user || !rest) return false;
  return user.role==='owner' || user.role==='admin';
}

function canInviteRestaurantMembers(user, rest){
  if(!user || !rest) return false;
  return canManageRestaurantMembers(user, rest) || isRestaurantParticipant(user, rest);
}

function getPendingOrgInvites(userId, db){
  db=db||dbGet();
  return (db.orgInvites||[]).filter(function(invite){
    return invite && invite.userId===userId && invite.status==='pending';
  });
}

function renderOrgInviteBadge(){
  var badge=document.getElementById('orgInvBadge');
  if(!badge) return;
  var count=CU ? getPendingOrgInvites(CU.id).length : 0;
  badge.textContent=String(count);
  badge.style.display=count?'inline-flex':'none';
}

function notifyPendingOrgInvites(){
  if(!CU) return;
  var invites=getPendingOrgInvites(CU.id);
  if(!invites.length) return;
  showPush(
    'info',
    '✉️ Приглашения в организации ('+invites.length+')',
    '',
    'Для вас доступны новые приглашения в заведения.<br><br><button onclick="openModal(\'orgInvites\');closeAllPush();" style="background:var(--ac);color:#000;border:none;border-radius:5px;padding:7px 14px;cursor:pointer;font-weight:700;font-size:13px;">Открыть →</button>'
  );
}

function renderOrgInvites(){
  var body=document.getElementById('orgInvitesBody');
  if(!body) return;
  var db=dbGet();
  if(!CU){
    body.innerHTML='<div style="padding:24px;text-align:center;color:var(--t3);">Сначала войдите в систему</div>';
    return;
  }
  var invites=getPendingOrgInvites(CU.id, db);
  if(!invites.length){
    body.innerHTML='<div style="padding:24px;text-align:center;color:var(--t3);">У вас пока нет приглашений</div>';
    return;
  }
  body.innerHTML=invites.map(function(invite){
    var rest=(db.restaurants||[]).find(function(item){ return item.id===invite.restId; });
    var label=ROLES[invite.role] ? ROLES[invite.role].emoji+' '+ROLES[invite.role].label : invite.role;
    return '<div style="border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);padding:14px;">'
      +'<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-weight:800;font-size:14px;">'+(rest ? ((rest.emoji||'🍽️')+' '+rest.name) : 'Заведение недоступно')+'</div>'
      +'<div style="font-size:12px;color:var(--t2);margin-top:4px;">Роль: '+label+'</div>'
      +'<div style="font-size:11px;color:var(--t3);margin-top:4px;">Пригласил: '+(invite.invitedByName||'—')+' · '+(invite.created||today())+'</div>'
      +(rest?'<div style="font-size:11px;color:var(--t3);margin-top:4px;">Юр. лицо: '+(rest.legalName||'Не указано')+' · Адрес: '+([rest.city||'',rest.addr||''].filter(Boolean).join(', ')||'Не указан')+'</div>':'')
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      +'<button onclick="acceptOrgInvite(\''+invite.id+'\')" style="background:var(--grD);color:var(--gr);border:1px solid var(--gr);border-radius:var(--r);padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;">Принять</button>'
      +'<button onclick="declineOrgInvite(\''+invite.id+'\')" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:var(--r);padding:8px 12px;font-size:12px;cursor:pointer;">Отклонить</button>'
      +'</div>'
      +'</div>'
      +'</div>';
  }).join('');
}

function acceptOrgInvite(inviteId){
  if(!CU) return;
  var db=dbGet();
  var invite=(db.orgInvites||[]).find(function(item){ return item.id===inviteId && item.userId===CU.id && item.status==='pending'; });
  if(!invite){toast('Приглашение не найдено','err');return;}
  var rest=(db.restaurants||[]).find(function(item){ return item.id===invite.restId; });
  if(!rest){toast('Заведение не найдено','err');return;}
  if(!Array.isArray(rest.members)) rest.members=[];
  if(!rest.members.some(function(member){ return member.userId===CU.id; })){
    rest.members.push({userId:CU.id,role:invite.role||'manager'});
  }
  invite.status='accepted';
  invite.respondedAt=today();
  dbSet(db);
  renderOrgInviteBadge();
  renderOrgInvites();
  renderRestaurants();
  renderRestPick();
  logAudit((CU.first||'')+' '+(CU.last||''),'Принял приглашение в '+rest.name,'Рестораны');
  toast('✅ Вы стали участником «'+rest.name+'»','ok');
}

function declineOrgInvite(inviteId){
  if(!CU) return;
  var db=dbGet();
  var invite=(db.orgInvites||[]).find(function(item){ return item.id===inviteId && item.userId===CU.id && item.status==='pending'; });
  if(!invite){toast('Приглашение не найдено','err');return;}
  invite.status='declined';
  invite.respondedAt=today();
  dbSet(db);
  renderOrgInviteBadge();
  renderOrgInvites();
  logAudit((CU.first||'')+' '+(CU.last||''),'Отклонил приглашение в организацию','Рестораны');
  toast('Приглашение отклонено','ok');
}

function userCanSeeDashboard(user){
  if(!user) return false;
  if(isOwnerUser(user)) return true;
  if(user.role==='owner') return true;
  var access=normalizeDashboardAccess(user);
  if(!access.enabled) return false;
  if(access.scope==='all_orgs') return true;
  return getUserDashboardRestaurantIds(user).length>0;
}

function ensureDashboardRestSelection(){
  if(!CU) return;
  if(isOwnerUser(CU)) return;
  if(normalizeDashboardAccess(CU).scope==='all_orgs' || CU.role==='owner') return;
  var db=dbGet();
  var allowedIds=getUserDashboardRestaurantIds(CU, db);
  if(!allowedIds.length){
    activeRest={id:'r0',name:'Нет доступа к дашборду',emoji:'🔒'};
    return;
  }
  if(!activeRest || activeRest.id==='r0' || allowedIds.indexOf(activeRest.id)<0){
    var next=(db.restaurants||[]).find(function(rest){ return allowedIds.indexOf(rest.id)>=0; });
    if(next) activeRest=next;
  }
}

function canAccessPage(u, pg){
  if(!u) return false;
  if(isOwnerUser(u)) u = Object.assign({}, u, { role:'owner', status:'active' });
  if(pg==='dashboard') return userCanSeeDashboard(u);
  var pages=(ROLES[u.role]||{}).pages||[];
  if(pages.indexOf(pg)>=0) return true;
  if(u.role==='admin' && ownerGetSettings().adminAdvanced && pg==='owner') return true;
  return false;
}

function ownerGetNotifications(){
  var db=dbGet();
  if(!db.notificationSettings) db.notificationSettings={};
  var ns=db.notificationSettings;
  return {
    push: ns.push !== false,
    email: ns.email !== false,
    priceAlerts: ns.priceAlerts !== false,
    orders: ns.orders !== false,
    users: ns.users !== false,
    priceImport: ns.priceImport !== false
  };
}

function ownerGetApiState(){
  var db=dbGet();
  if(!db.apiSettings) db.apiSettings={};
  var api=db.apiSettings;
  if(!api.publicKey) api.publicKey='pv_live_mk_'+Math.random().toString(36).slice(2,22);
  if(!api.webhookUrl) api.webhookUrl='https://api.kalka.local/webhook';
  db.apiSettings=api;
  dbSet(db);
  return api;
}

function ownerDistinctCompanies(db){
  var map={};
  (db.users||[]).forEach(function(u){
    var name=(u&&u.company||'').trim();
    if(name) map[name.toLowerCase()]=name;
  });
  return Object.keys(map).map(function(k){return map[k];});
}

function ownerGetCompanySettings(db, companyName){
  if(!db.companySettings) db.companySettings={};
  var key=(companyName||'').trim().toLowerCase();
  var item=db.companySettings[key]||{};
  return {
    tariff:item.tariff||'growth',
    status:item.status||'active',
    restaurantLimit:item.restaurantLimit||5,
    note:item.note||''
  };
}

function ownerGetBillingSettings(db, companyName){
  if(!db.billingSettings) db.billingSettings={};
  var key=(companyName||'').trim().toLowerCase();
  var item=db.billingSettings[key]||{};
  return {
    plan:item.plan||'growth',
    status:item.status||'paid',
    amount:item.amount||9900,
    nextBilling:item.nextBilling||'',
    overdueDays:item.overdueDays||0
  };
}

function ownerCompanyDomKey(companyName){
  return String(companyName||'').trim().toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'_').replace(/^_+|_+$/g,'')||'company';
}

function ownerDuplicateCount(items, getName){
  var seen={}, dup=0;
  (items||[]).forEach(function(item){
    var name=(getName(item)||'').trim().toLowerCase();
    if(!name) return;
    if(seen[name]) dup++;
    seen[name]=true;
  });
  return dup;
}

function ownerMetricCard(icon,label,value,hint,tone){
  var bg='var(--bg3)', color='var(--tx)';
  if(tone==='good'){bg='var(--grD)';color='var(--gr)';}
  if(tone==='warn'){bg='var(--orD)';color='var(--or)';}
  if(tone==='bad'){bg='var(--rdD)';color='var(--rd)';}
  return '<div class="sc" style="background:'+bg+';border-color:'+bg+';">'
    +'<div class="sc-ico">'+icon+'</div>'
    +'<div class="sc-lbl">'+label+'</div>'
    +'<div class="sc-val" style="color:'+color+';">'+value+'</div>'
    +'<div class="sc-chg neu">'+hint+'</div>'
    +'</div>';
}

function ownerStatusRow(label,value,tone,sub){
  var color=tone==='good'?'var(--gr)':tone==='warn'?'var(--or)':tone==='bad'?'var(--rd)':'var(--tx)';
  return '<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--br);">'
    +'<div><div style="font-size:13px;font-weight:600;">'+label+'</div>'
    +(sub?'<div style="font-size:11px;color:var(--t3);margin-top:2px;">'+sub+'</div>':'')
    +'</div><div style="font-size:13px;font-weight:800;color:'+color+';white-space:nowrap;">'+value+'</div></div>';
}

function renderOwner(){
  if(CU && isOwnerUser(CU)) CU = Object.assign({}, CU, { role:'owner', status:'active' });
  var db=dbGet();
  var companies=ownerDistinctCompanies(db);
  var systemLog=Array.isArray(db.systemLog)?db.systemLog:[];
  var overdueCompanies=companies.filter(function(name){
    var bill=ownerGetBillingSettings(db,name);
    return bill.status==='overdue' || (bill.overdueDays||0)>0;
  }).length;
  var activeUsers=(db.users||[]).filter(function(u){return u.status==='active';}).length;
  var blockedUsers=(db.users||[]).filter(function(u){return u.status==='blocked';}).length;
  var pendingUsers=(db.users||[]).filter(function(u){return u.status==='pending';}).length;
  var visibleSuppliers=(SUPS_DATA||[]).filter(function(s){return !s.hidden;}).length;
  var hiddenSuppliers=(SUPS_DATA||[]).filter(function(s){return s.hidden;}).length;
  var productsWithoutUnit=(PRODUCTS||[]).filter(function(p){return !(p&&p.unit);}).length+(SUP_PRODS||[]).filter(function(p){return !(p&&p.unit);}).length;
  var productsWithoutPrice=(SUP_PRODS||[]).filter(function(p){
    return !((p.pKg||0)>0 || (p.pSh||0)>0 || (p.pL||0)>0 || (p.pMl||0)>0 || (p.price||0)>0);
  }).length;
  var duplicateProducts=ownerDuplicateCount(PRODUCTS,function(p){return p&&p.name;})+ownerDuplicateCount(SUP_PRODS,function(p){return p&&p.name;});
  var dashboardEnabledUsers=(db.users||[]).filter(function(u){ return userCanSeeDashboard(u); }).length;
  var audit=(db.audit||[]).slice(0,8);
  var summaryEl=document.getElementById('ownerSummaryGrid');
  var businessEl=document.getElementById('ownerBusinessCards');
  var dataEl=document.getElementById('ownerDataControlList');
  var healthEl=document.getElementById('ownerHealthList');
  var auditEl=document.getElementById('ownerRecentAudit');
  if(summaryEl){
    summaryEl.innerHTML=[
      ownerMetricCard('🏢','Компании',companies.length,companies.length?'Активные клиенты платформы':'Пока не добавлены',companies.length?'good':'warn'),
      ownerMetricCard('👥','Пользователи',activeUsers+'/'+(db.users||[]).length,blockedUsers?'Есть блокировки':'Все активны',blockedUsers?'warn':'good'),
      ownerMetricCard('🏭','Поставщики',visibleSuppliers,hiddenSuppliers?'Скрыто: '+hiddenSuppliers:'Все доступны',visibleSuppliers?'good':'warn'),
      ownerMetricCard('📦','Заказы',ORDERS.length,ORDERS.length?'В системе есть история заказов':'Пока без заказов',ORDERS.length?'good':'warn'),
      ownerMetricCard('📊','Дашборд-доступ',dashboardEnabledUsers,(db.users||[]).length?'Кому разрешена статистика':'Нет пользователей',dashboardEnabledUsers?'good':'warn')
    ].join('');
  }
  if(businessEl){
    var activeCompanies=companies.filter(function(name){
      return ownerGetCompanySettings(db,name).status==='active';
    }).length;
    businessEl.innerHTML=[
      ownerStatusRow('Активные компании',String(activeCompanies)+' / '+String(companies.length),activeCompanies?'good':'warn','Клиенты с доступом к платформе'),
      ownerStatusRow('Просроченные оплаты',String(overdueCompanies),overdueCompanies?'warn':'good','Клиенты с overdue или долгом'),
      ownerStatusRow('Активные пользователи',String(activeUsers),activeUsers?'good':'warn','С ролями и доступом в систему'),
      ownerStatusRow('Ожидают одобрения',String(pendingUsers),pendingUsers?'warn':'good','Новые заявки на вход'),
      ownerStatusRow('Кому доступен дашборд',String(dashboardEnabledUsers),dashboardEnabledUsers?'good':'warn','Права на статистику выдаёт только владелец'),
      ownerStatusRow('Заведений подключено',String((db.restaurants||[]).filter(function(r){return r.id!=='r0';}).length),(db.restaurants||[]).length?'good':'warn','Рестораны и бары в системе'),
      ownerStatusRow('Товаров в каталоге',String(PRODUCTS.length),PRODUCTS.length?'good':'warn','Нормализованный каталог платформы'),
      ownerStatusRow('Строк в прайсах',String(SUP_PRODS.length),SUP_PRODS.length?'good':'warn','Источник цен и ассортимента')
    ].join('');
  }
  if(dataEl){
    dataEl.innerHTML=[
      ownerStatusRow('Товары без единицы',String(productsWithoutUnit),productsWithoutUnit?'warn':'good','Нужно для корректного заказа и сравнения'),
      ownerStatusRow('Строки без цены',String(productsWithoutPrice),productsWithoutPrice?'warn':'good','Проверьте загрузки прайсов поставщиков'),
      ownerStatusRow('Дубли по названию',String(duplicateProducts),duplicateProducts?'warn':'good','Мешают чистому каталогу и аналитике'),
      ownerStatusRow('Скрытые поставщики',String(hiddenSuppliers),hiddenSuppliers?'warn':'good','Часть поставщиков исключена из выдачи'),
      ownerStatusRow('Заблокированные пользователи',String(blockedUsers),blockedUsers?'warn':'good','Требует периодического контроля'),
      ownerStatusRow('Ошибки импорта прайсов',String(systemLog.filter(function(e){return e.type==='price_import'&&e.severity==='warn';}).length),systemLog.filter(function(e){return e.type==='price_import'&&e.severity==='warn';}).length?'warn':'good','Пропуски строк, ручное сопоставление, проблемы структуры')
    ].join('');
  }
  if(healthEl){
    var supabaseReady=!!(window.KalkaApp&&window.KalkaApp.supabase&&window.KalkaApp.supabase.isEnabled&&window.KalkaApp.supabase.isEnabled());
    var settings=ownerGetSettings();
    var notifications=ownerGetNotifications();
    healthEl.innerHTML=[
      ownerStatusRow('Хранилище данных',supabaseReady?'Supabase подключен':'Fallback режим',supabaseReady?'good':'warn','Авторизация и база платформы'),
      ownerStatusRow('Расширенный доступ администратора',settings.adminAdvanced?'Включён':'Выключен',settings.adminAdvanced?'good':'warn','Правая рука получает owner-инструменты'),
      ownerStatusRow('Домен платформы',settings.domain||'Не задан',settings.domain?'good':'warn','Нужен для production и recovery-ссылок'),
      ownerStatusRow('Почта поддержки',settings.supportEmail||'Не задана',settings.supportEmail?'good':'warn','Отображается для клиентов и ошибок'),
      ownerStatusRow('Уведомления',Object.values(notifications).filter(Boolean).length+'/6',Object.values(notifications).filter(Boolean).length>=4?'good':'warn','Контроль новых заказов, ошибок и цен'),
      ownerStatusRow('Резервное копирование','Готово',SUP_PRODS.length||PRODUCTS.length||ORDERS.length?'good':'warn','Экспорт JSON доступен из панели владельца')
    ].join('');
  }
  if(auditEl){
    auditEl.innerHTML=audit.length?audit.map(function(a){
      return '<div style="padding:10px 0;border-bottom:1px solid var(--br);">'
        +'<div style="display:flex;justify-content:space-between;gap:10px;"><div style="font-size:13px;font-weight:600;">'+(a.user||'Система')+'</div><div style="font-size:11px;color:var(--t3);white-space:nowrap;">'+(a.ts||'')+'</div></div>'
        +'<div style="font-size:12px;color:var(--t2);margin-top:4px;">'+(a.action||'')+'</div>'
        +'<div style="font-size:11px;color:var(--t3);margin-top:2px;">'+(a.page||'—')+'</div>'
        +'</div>';
    }).join(''):'<div style="color:var(--t3);padding:18px 0;text-align:center;">Журнал пока пуст</div>';
  }
}

function openModal(name){
  if(name==='myProfile'){openMyProfile();}
  const el=document.getElementById('ov-'+name);if(!el)return;el.classList.add('on');
  if(name==='orgInvites')renderOrgInvites();
  if(name==='restPick')renderRestPick();
  if(name==='auditLog')renderAuditLog();
  if(name==='billingManager')renderBillingManager();
  if(name==='priceImportMonitor')renderPriceImportMonitor();
  if(name==='systemLog')renderSystemLog();
  if(name==='catCols')renderCatColList();
  if(name==='addCatProd')renderAcpPrices();
  if(name==='manageRoles')renderManageRoles();
  if(name==='blockUser')renderBlockUserSel();
  if(name==='addNavItem')renderAniRoles();
  if(name==='platSettings')fillPlatSettings();
  if(name==='apiKeys')fillApiKeys();
  if(name==='notifSettings')fillNotifSettings();
  if(name==='companyManager')renderCompanyManager();
}
function closeModal(name){const el=document.getElementById('ov-'+name);if(el)el.classList.remove('on');}
document.addEventListener('click',e=>{if(e.target.classList.contains('ov'))e.target.classList.remove('on');});

function renderAuditLog(){const db=dbGet();document.getElementById('auditBody').innerHTML=db.audit.map(a=>`<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--br);font-size:12px;"><span class="c3" style="white-space:nowrap;width:130px;flex-shrink:0;">${a.ts}</span><span style="flex:1;color:var(--tx);">${a.user}: ${a.action}</span><span class="c3" style="width:80px;text-align:right;">${a.page}</span></div>`).join('')||'<div class="c3 fs12" style="padding:20px;text-align:center;">Нет записей</div>';}
function exportAudit(){const db=dbGet();dlFile('Время,Пользователь,Действие,Страница\n'+db.audit.map(a=>`"${a.ts}","${a.user}","${a.action}","${a.page}"`).join('\n'),'text/csv','audit.csv');toast('📥 Журнал экспортирован','ok');}
function renderCompanyManager(){
  var db=dbGet();
  var companies=ownerDistinctCompanies(db);
  var body=document.getElementById('companyManagerBody');
  if(!body) return;
  if(!companies.length){
    body.innerHTML='<div style="padding:24px;text-align:center;color:var(--t3);">Пока нет компаний для управления</div>';
    return;
  }
  body.innerHTML='<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:8px 10px;">Компания</th><th style="text-align:left;padding:8px 10px;">Тариф</th><th style="text-align:left;padding:8px 10px;">Статус</th><th style="text-align:left;padding:8px 10px;">Лимит заведений</th><th style="text-align:left;padding:8px 10px;">Заметка</th></tr></thead><tbody>'
    +companies.map(function(name){
      var st=ownerGetCompanySettings(db,name);
      var key=name.toLowerCase();
      var domKey=ownerCompanyDomKey(name);
      return '<tr style="border-top:1px solid var(--br);">'
        +'<td style="padding:10px;"><div style="font-weight:700;">'+name+'</div><div style="font-size:11px;color:var(--t3);">'+((db.users||[]).filter(function(u){return (u.company||'').trim().toLowerCase()===key;}).length)+' пользователей</div></td>'
        +'<td style="padding:10px;"><select class="fS" id="cmp-tariff-'+domKey+'" style="margin:0;"><option value="start" '+(st.tariff==='start'?'selected':'')+'>Start</option><option value="growth" '+(st.tariff==='growth'?'selected':'')+'>Growth</option><option value="pro" '+(st.tariff==='pro'?'selected':'')+'>Pro</option><option value="enterprise" '+(st.tariff==='enterprise'?'selected':'')+'>Enterprise</option></select></td>'
        +'<td style="padding:10px;"><select class="fS" id="cmp-status-'+domKey+'" style="margin:0;"><option value="active" '+(st.status==='active'?'selected':'')+'>Активна</option><option value="trial" '+(st.status==='trial'?'selected':'')+'>Trial</option><option value="paused" '+(st.status==='paused'?'selected':'')+'>Пауза</option><option value="blocked" '+(st.status==='blocked'?'selected':'')+'>Заблокирована</option></select></td>'
        +'<td style="padding:10px;"><input class="fI" id="cmp-limit-'+domKey+'" type="number" min="1" value="'+st.restaurantLimit+'" style="margin:0;min-width:90px;"></td>'
        +'<td style="padding:10px;"><input class="fI" id="cmp-note-'+domKey+'" value="'+st.note.replace(/"/g,'&quot;')+'" placeholder="VIP, onboarding, договор..." style="margin:0;"></td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}
function saveCompanyManager(){
  var db=dbGet();
  var companies=ownerDistinctCompanies(db);
  if(!db.companySettings) db.companySettings={};
  companies.forEach(function(name){
    var key=name.toLowerCase();
    var domKey=ownerCompanyDomKey(name);
    db.companySettings[key]={
      tariff:(document.getElementById('cmp-tariff-'+domKey)||{value:'growth'}).value,
      status:(document.getElementById('cmp-status-'+domKey)||{value:'active'}).value,
      restaurantLimit:parseInt((document.getElementById('cmp-limit-'+domKey)||{value:'5'}).value,10)||5,
      note:(document.getElementById('cmp-note-'+domKey)||{value:''}).value.trim()
    };
  });
  dbSet(db);
  closeModal('companyManager');
  renderOwner();
  logSystemEvent('company','Обновлены настройки компаний','Сохранены тарифы, статусы и лимиты для '+companies.length+' компаний','info','owner');
  toast('✅ Компании и тарифы сохранены','ok');
}
function renderBillingManager(){
  var db=dbGet();
  var companies=ownerDistinctCompanies(db);
  var body=document.getElementById('billingManagerBody');
  if(!body) return;
  if(!companies.length){
    body.innerHTML='<div style="padding:24px;text-align:center;color:var(--t3);">Пока нет компаний для биллинга</div>';
    return;
  }
  body.innerHTML='<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:8px 10px;">Компания</th><th style="text-align:left;padding:8px 10px;">План</th><th style="text-align:left;padding:8px 10px;">Статус</th><th style="text-align:left;padding:8px 10px;">Сумма</th><th style="text-align:left;padding:8px 10px;">След. списание</th><th style="text-align:left;padding:8px 10px;">Просрочка</th></tr></thead><tbody>'
    +companies.map(function(name){
      var st=ownerGetBillingSettings(db,name);
      var domKey=ownerCompanyDomKey(name);
      return '<tr style="border-top:1px solid var(--br);">'
        +'<td style="padding:10px;font-weight:700;">'+name+'</td>'
        +'<td style="padding:10px;"><select class="fS" id="bill-plan-'+domKey+'" style="margin:0;"><option value="start" '+(st.plan==='start'?'selected':'')+'>Start</option><option value="growth" '+(st.plan==='growth'?'selected':'')+'>Growth</option><option value="pro" '+(st.plan==='pro'?'selected':'')+'>Pro</option><option value="enterprise" '+(st.plan==='enterprise'?'selected':'')+'>Enterprise</option></select></td>'
        +'<td style="padding:10px;"><select class="fS" id="bill-status-'+domKey+'" style="margin:0;"><option value="paid" '+(st.status==='paid'?'selected':'')+'>Оплачено</option><option value="trial" '+(st.status==='trial'?'selected':'')+'>Trial</option><option value="overdue" '+(st.status==='overdue'?'selected':'')+'>Overdue</option><option value="blocked" '+(st.status==='blocked'?'selected':'')+'>Заблокирован</option></select></td>'
        +'<td style="padding:10px;"><input class="fI" id="bill-amount-'+domKey+'" type="number" min="0" value="'+st.amount+'" style="margin:0;min-width:100px;"></td>'
        +'<td style="padding:10px;"><input class="fI" id="bill-next-'+domKey+'" type="date" value="'+st.nextBilling+'" style="margin:0;min-width:150px;"></td>'
        +'<td style="padding:10px;"><input class="fI" id="bill-overdue-'+domKey+'" type="number" min="0" value="'+st.overdueDays+'" style="margin:0;min-width:90px;"></td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}
function saveBillingManager(){
  var db=dbGet();
  var companies=ownerDistinctCompanies(db);
  if(!db.billingSettings) db.billingSettings={};
  companies.forEach(function(name){
    var key=name.toLowerCase();
    var domKey=ownerCompanyDomKey(name);
    db.billingSettings[key]={
      plan:(document.getElementById('bill-plan-'+domKey)||{value:'growth'}).value,
      status:(document.getElementById('bill-status-'+domKey)||{value:'paid'}).value,
      amount:parseInt((document.getElementById('bill-amount-'+domKey)||{value:'0'}).value,10)||0,
      nextBilling:(document.getElementById('bill-next-'+domKey)||{value:''}).value,
      overdueDays:parseInt((document.getElementById('bill-overdue-'+domKey)||{value:'0'}).value,10)||0
    };
  });
  dbSet(db);
  closeModal('billingManager');
  renderOwner();
  logSystemEvent('billing','Обновлены подписки и биллинг','Сохранены статусы оплат и даты списаний для '+companies.length+' компаний','info','owner');
  toast('✅ Подписки и биллинг сохранены','ok');
}
function renderPriceImportMonitor(filterValue){
  var db=dbGet();
  var body=document.getElementById('priceImportMonitorBody');
  if(!body) return;
  var filter=(typeof filterValue==='string'?filterValue:(document.getElementById('priceImportFilter')||{value:''}).value||'').trim().toLowerCase();
  var items=(Array.isArray(db.systemLog)?db.systemLog:[]).filter(function(item){
    if(item.type!=='price_import') return false;
    if(!filter) return true;
    var hay=(item.title||'')+' '+(item.details||'');
    return hay.toLowerCase().indexOf(filter)>=0;
  });
  body.innerHTML=items.length?items.map(function(item){
    var color=item.severity==='error'?'var(--rd)':item.severity==='warn'?'var(--or)':'var(--gr)';
    return '<div style="padding:10px 0;border-bottom:1px solid var(--br);">'
      +'<div style="display:flex;justify-content:space-between;gap:12px;"><div style="font-size:13px;font-weight:700;color:'+color+';">'+(item.title||'Импорт')+'</div><div style="font-size:11px;color:var(--t3);white-space:nowrap;">'+(item.ts||'')+'</div></div>'
      +'<div style="font-size:12px;color:var(--t2);margin-top:6px;">'+(item.details||'')+'</div>'
      +'<div style="font-size:11px;color:var(--t3);margin-top:4px;">Источник: '+(item.source||'price-import')+' · Важность: '+(item.severity||'info')+'</div>'
      +'</div>';
  }).join(''):'<div style="padding:24px;text-align:center;color:var(--t3);">Проблемных импортов не найдено</div>';
}
function exportPriceImportMonitor(){
  var db=dbGet();
  var items=(Array.isArray(db.systemLog)?db.systemLog:[]).filter(function(item){return item.type==='price_import';});
  dlFile('Время,Важность,Заголовок,Детали,Источник\n'+items.map(function(item){
    return ['"'+(item.ts||'')+'"','"'+(item.severity||'')+'"','"'+(item.title||'')+'"','"'+String(item.details||'').replace(/"/g,'""')+'"','"'+(item.source||'')+'"'].join(',');
  }).join('\n'),'text/csv','price_import_monitor.csv');
  toast('📥 Журнал проблемных прайсов экспортирован','ok');
}
function renderSystemLog(){
  var db=dbGet();
  var body=document.getElementById('systemLogBody');
  if(!body) return;
  var items=Array.isArray(db.systemLog)?db.systemLog:[];
  body.innerHTML=items.length?items.map(function(item){
    var color=item.severity==='error'?'var(--rd)':item.severity==='warn'?'var(--or)':'var(--gr)';
    return '<div style="padding:10px 0;border-bottom:1px solid var(--br);">'
      +'<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;"><div><div style="font-size:13px;font-weight:700;color:'+color+';">'+(item.title||'Событие')+'</div><div style="font-size:11px;color:var(--t3);margin-top:2px;">'+(item.type||'system')+' · '+(item.source||'core')+'</div></div><div style="font-size:11px;color:var(--t3);white-space:nowrap;">'+(item.ts||'')+'</div></div>'
      +'<div style="font-size:12px;color:var(--t2);margin-top:6px;">'+(item.details||'')+'</div>'
      +'</div>';
  }).join(''):'<div style="padding:24px;text-align:center;color:var(--t3);">Системных событий пока нет</div>';
}
function exportSystemLog(){
  var db=dbGet();
  var items=Array.isArray(db.systemLog)?db.systemLog:[];
  dlFile('Время,Тип,Важность,Заголовок,Детали,Источник\n'+items.map(function(item){
    return ['"'+(item.ts||'')+'"','"'+(item.type||'')+'"','"'+(item.severity||'')+'"','"'+(item.title||'')+'"','"'+String(item.details||'').replace(/"/g,'""')+'"','"'+(item.source||'')+'"'].join(',');
  }).join('\n'),'text/csv','system_log.csv');
  toast('📥 Системный журнал экспортирован','ok');
}
function exportBackup(){const db=dbGet();dlFile(JSON.stringify(db,null,2),'application/json','provision_backup_'+today()+'.json');logSystemEvent('backup','Создана резервная копия','Экспортирован JSON-снимок текущей базы','info','backup');toast('📥 Резервная копия создана','ok');}
function importBackup(){const fi=document.createElement('input');fi.type='file';fi.accept='.json';fi.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);dbSet(d);logSystemEvent('backup','Восстановление из резервной копии','Импортирован внешний JSON-файл и перезаписана локальная база','warn','backup');toast('✅ Данные восстановлены из резервной копии!','ok');renderAdmin();renderRestaurants();renderOwner();}catch{logSystemEvent('backup','Ошибка импорта резервной копии','Файл не прошёл проверку JSON','error','backup');toast('❗ Ошибка формата файла','err');}};r.readAsText(f);};fi.click();}
function fillPlatSettings(){
  var ps=ownerGetSettings();
  [['ps-name',ps.name],['ps-tag',ps.tagline],['ps-email',ps.supportEmail],['ps-cur',ps.currency],['ps-tz',ps.timezone],['ps-domain',ps.domain]].forEach(function(row){
    var el=document.getElementById(row[0]);if(el)el.value=row[1]||'';
  });
  var adminAdvanced=document.getElementById('ps-admin-advanced');if(adminAdvanced)adminAdvanced.checked=!!ps.adminAdvanced;
}
function savePlatSettings(){
  var db=dbGet();
  db.platformSettings={
    name:(document.getElementById('ps-name')||{value:''}).value.trim()||'КальКа',
    tagline:(document.getElementById('ps-tag')||{value:''}).value.trim()||'Платформа управления закупками',
    supportEmail:(document.getElementById('ps-email')||{value:''}).value.trim(),
    currency:(document.getElementById('ps-cur')||{value:'₽ Рубль'}).value,
    timezone:(document.getElementById('ps-tz')||{value:'UTC+3 Москва'}).value,
    domain:(document.getElementById('ps-domain')||{value:''}).value.trim(),
    adminAdvanced:!!document.getElementById('ps-admin-advanced')?.checked
  };
  dbSet(db);
  if(CU && CU.role==='admin') buildNav(CU);
  closeModal('platSettings');
  renderOwner();
  logSystemEvent('settings','Обновлены настройки платформы','Изменены название, почта поддержки, валюта, таймзона или домен','info','owner');
  toast('✅ Настройки платформы сохранены','ok');
}
function fillApiKeys(){
  var api=ownerGetApiState();
  var keyEl=document.getElementById('apiKeyVal');
  var webhookEl=document.getElementById('apiWebhookVal');
  if(keyEl) keyEl.textContent=api.publicKey||'—';
  if(webhookEl) webhookEl.textContent=api.webhookUrl||'—';
}
function genApiKey(){
  var db=dbGet();
  if(!db.apiSettings) db.apiSettings={};
  db.apiSettings.publicKey='pv_live_mk_'+Math.random().toString(36).slice(2,22);
  if(!db.apiSettings.webhookUrl) db.apiSettings.webhookUrl='https://api.kalka.local/webhook';
  dbSet(db);
  fillApiKeys();
  renderOwner();
  logSystemEvent('integration','Сгенерирован новый API ключ','Владелец обновил публичный ключ интеграций','warn','owner');
  toast('🔑 Новый API ключ сгенерирован','ok');
}
function fillNotifSettings(){
  var ns=ownerGetNotifications();
  [['ns-push',ns.push],['ns-email',ns.email],['ns-price-alerts',ns.priceAlerts],['ns-orders',ns.orders],['ns-users',ns.users],['ns-price-import',ns.priceImport]].forEach(function(row){
    var el=document.getElementById(row[0]);if(el)el.checked=!!row[1];
  });
}
function saveNotifSettings(){
  var db=dbGet();
  db.notificationSettings={
    push:!!document.getElementById('ns-push')?.checked,
    email:!!document.getElementById('ns-email')?.checked,
    priceAlerts:!!document.getElementById('ns-price-alerts')?.checked,
    orders:!!document.getElementById('ns-orders')?.checked,
    users:!!document.getElementById('ns-users')?.checked,
    priceImport:!!document.getElementById('ns-price-import')?.checked
  };
  dbSet(db);
  closeModal('notifSettings');
  renderOwner();
  logSystemEvent('settings','Обновлены уведомления','Изменены системные каналы уведомлений платформы','info','owner');
  toast('✅ Уведомления сохранены','ok');
}
function exportAll(){
  const db=dbGet();
  const data={platformSettings:db.platformSettings||{},notificationSettings:db.notificationSettings||{},apiSettings:db.apiSettings||{},users:db.users||[],restaurants:db.restaurants||[],audit:db.audit||[],products:PRODUCTS,orders:ORDERS,techCards:TECH_CARDS,supProds:SUP_PRODS,suppliers:SUPS_DATA,exported:today()};
  dlFile(JSON.stringify(data,null,2),'application/json','provision_all_data_'+today()+'.json');
  toast('📥 Все данные экспортированы','ok');
}
function renderManageRoles(){
  syncRolePagesFromDb(dbGet());
  const pages=['restaurants','dashboard','catalog','order','cart','favorites','orders','suppliers','analytics','tender','techcards','chef-calc','sup-products','sup-dashboard','sup-orders','sup-analytics','admin','owner'];
  const roleKeys=Object.keys(ROLES).filter(k=>k!=='owner');
  document.getElementById('mrH').innerHTML=`<th style="padding:9px 13px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);">Раздел</th>`+roleKeys.map(k=>`<th style="padding:9px 13px;font-size:11px;color:${ROLES[k].color};">${ROLES[k].emoji} ${ROLES[k].label}</th>`).join('');
  document.getElementById('mrB').innerHTML=pages.map(pg=>`<tr><td style="padding:9px 13px;font-size:12px;font-weight:600;">${PM[pg]?.ico||'•'} ${PM[pg]?.lbl||pg}</td>${roleKeys.map(k=>`<td style="padding:9px 13px;text-align:center;"><input type="checkbox" id="mr-${k}-${pg}" ${(ROLES[k].pages||[]).includes(pg)?'checked':''} style="width:15px;height:15px;cursor:pointer;accent-color:var(--ac);"></td>`).join('')}</tr>`).join('');
}
function saveRoles(){
  const db=dbGet();
  const pages=['restaurants','dashboard','catalog','order','cart','favorites','orders','suppliers','analytics','tender','techcards','chef-calc','sup-products','sup-dashboard','sup-orders','sup-analytics','admin','owner'];
  const roleKeys=Object.keys(ROLES).filter(k=>k!=='owner');
  roleKeys.forEach(k=>{ROLES[k].pages=pages.filter(pg=>document.getElementById(`mr-${k}-${pg}`)?.checked);});
  if(!db.platformSettings) db.platformSettings={};
  if(!db.platformSettings.rolePages || typeof db.platformSettings.rolePages!=='object') db.platformSettings.rolePages={};
  roleKeys.forEach(function(roleKey){
    db.platformSettings.rolePages[roleKey]=(ROLES[roleKey].pages||[]).slice();
  });
  dbSet(db);
  closeModal('manageRoles');renderOwner();toast('✅ Права обновлены! Изменения применены для новых сессий.','ok');
}
function renderBlockUserSel(){
  const db=dbGet();const sel=document.getElementById('buSel');const nr=document.getElementById('buNewRole');
  if(sel)sel.innerHTML=db.users.filter(u=>u.id!==CU?.id).map(u=>`<option value="${u.id}">${u.first} ${u.last} (${u.email})</option>`).join('');
  if(nr)nr.innerHTML=Object.entries(ROLES).map(([k,r])=>`<option value="${k}">${r.emoji} ${r.label}</option>`).join('');
}
function applyBlock(){
  const sel=document.getElementById('buSel')?.value;const action=document.getElementById('buAction')?.value;const reason=document.getElementById('buReason')?.value||'';const newRole=document.getElementById('buNewRole')?.value;
  if(!sel){toast('❗ Выберите пользователя','err');return;}
  const db=dbGet();const u=db.users.find(x=>x.id===sel);if(!u){toast('Пользователь не найден','err');return;}
  if(action==='block'){u.status='blocked';toast(`🚫 ${u.first} ${u.last} заблокирован. Причина: ${reason||'—'}`,'ok');}
  else if(action==='unblock'){u.status='active';toast(`✅ ${u.first} ${u.last} разблокирован`,'ok');}
  else if(action==='restrict'){toast(`⚠️ Доступ ${u.first} ${u.last} ограничен`,'ok');}
  else if(action==='role'&&newRole&&ROLES[newRole]){u.role=newRole;toast(`✅ Роль ${u.first} изменена на ${ROLES[newRole].label}`,'ok');}
  dbSet(db);closeModal('blockUser');renderAdmin();renderOwner();logAudit(CU?.first+' '+(CU?.last||''),`Действие "${action}" для ${u.email}${reason?' причина: '+reason:''}. `,'Пользователи');
}
function submitOrder(){
  var sup=(document.getElementById('mo-sup')||{value:''}).value;
  var item=(document.getElementById('mo-item')||{value:''}).value;
  var qty=(document.getElementById('mo-qty')||{value:'1'}).value;
  var unit=(document.getElementById('mo-unit')||{value:'кг'}).value;
  var comment=(document.getElementById('mo-note')||{value:''}).value||'';
  if(!item){toast('Укажите товар','err');return;}
  var id='#'+String(1050+ORDERS.length).padStart(4,'0');
  var restMeta=getActiveRestMeta();
  ORDERS.unshift({id:id,sup:sup,items:item+' ('+( qty||1)+unit+')',
    createdByUserId:CU?CU.id:'',
    createdByEmail:CU?CU.email:'',
    createdByName:CU?(CU.first+' '+(CU.last||'')).trim():'',
    rest:(activeRest&&activeRest.name)||'—',
    restId:_orderRestId||'',
    brand:restMeta&&restMeta.brandName?restMeta.brandName:'',
    legalEntities:(_orderLegalEntityNames||[]).slice(),
    supplierName:sup,
    itemsDetailed:[{name:item,qty:(parseFloat(qty)||1),unit:unit,zone:'',invoiceGroup:'main',comment:comment}],
    zones:[],
    invoiceGroup:'Основная накладная',
    deliveryDate:_orderDeliveryDate||'',
    deliveryFrom:_orderDeliveryFrom||'',
    deliveryTo:_orderDeliveryTo||'',
    sum:Math.round((parseFloat(qty)||1)*500),
    date:today().slice(5).split('-').reverse().join('.')+'.26',
    status:'processing',comment:comment});
  saveOrdersData();
  closeModal('newOrder');
  renderOrders();
  toast('Заказ '+id+' создан','ok');
}

function submitProduct(){const n=document.getElementById('ap-n')?.value;if(!n){toast('❗ Укажите название','err');return;}const pKg=parseInt(document.getElementById('ap-kg')?.value)||0;SUP_PRODS.push({id:Date.now(),name:n,cat:document.getElementById('ap-cat')?.value||'—',unit:document.getElementById('ap-unit')?.value||'кг',pKg,pSh:parseInt(document.getElementById('ap-sh')?.value)||0,pL:parseInt(document.getElementById('ap-l')?.value)||0,pMl:parseFloat(document.getElementById('ap-ml')?.value)||0,stock:parseInt(document.getElementById('ap-stk')?.value)||100,active:true});closeModal('addProduct');renderSupProducts();toast(`✅ Товар «${n}» добавлен!`,'ok');}
function renderSupplierOrganizationOptions(selectedIds){
  var box=document.getElementById('as-orgs');
  if(!box) return;
  var db=dbGet();
  selectedIds=Array.isArray(selectedIds)?selectedIds.map(String):[];
  var rests=(db.restaurants||[]).filter(function(rest){
    if(!rest || rest.id==='r0') return false;
    if(!CU) return false;
    if(CU.role==='owner' || CU.role==='admin') return true;
    return isRestaurantParticipant(CU, rest);
  });
  if(!rests.length){
    box.innerHTML='<div style="font-size:12px;color:var(--t3);">Нет доступных организаций для привязки поставщика.</div>';
    return;
  }
  box.innerHTML=rests.map(function(rest){
    return '<label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid var(--br);border-radius:8px;background:var(--bg2);cursor:pointer;">'
      +'<input type="checkbox" value="'+rest.id+'" '+(selectedIds.indexOf(String(rest.id))>=0?'checked':'')+' style="width:14px;height:14px;margin-top:2px;">'
      +'<div style="min-width:0;">'
      +'<div style="font-size:13px;font-weight:700;color:var(--tx);">'+rest.name+'</div>'
      +'<div style="font-size:11px;color:var(--t3);">'+(rest.legalName||'Без юр. лица')+(rest.addr?' · '+rest.addr:'')+'</div>'
      +'</div>'
      +'</label>';
  }).join('');
}
function closeSupplierModal(){
  ['as-edit-id','as-n','as-em2','as-legal','as-city','as-ct','as-ph','as-em','as-dl','as-wh','as-mn'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  var title=document.querySelector('#ov-addSup .m-title');
  if(title) title.textContent='Добавить поставщика';
  var btn=document.getElementById('as-submit-btn');
  if(btn) btn.textContent='Добавить';
  var cat=document.getElementById('as-c'); if(cat) cat.value='Универсальный';
  renderSupplierOrganizationOptions([]);
  closeModal('addSup');
}
function openSupplierModal(index, presetRestId){
  var db=dbGet();
  var supplier=(typeof index==='number' && index>=0)?SUPS_DATA[index]:null;
  if(supplier && !canManageSupplierRecord(CU, supplier, db)){toast('У вас нет прав на редактирование этого поставщика','err');return;}
  var title=document.querySelector('#ov-addSup .m-title');
  if(title) title.textContent=supplier?'Редактировать поставщика':'Добавить поставщика';
  var btn=document.getElementById('as-submit-btn');
  if(btn) btn.textContent=supplier?'Сохранить':'Добавить';
  var editInput=document.getElementById('as-edit-id'); if(editInput) editInput.value=supplier?String(index):'';
  var setVal=function(id,val){ var el=document.getElementById(id); if(el) el.value=val||''; };
  setVal('as-n', supplier?supplier.name:'');
  setVal('as-em2', supplier?supplier.emoji:'🏭');
  setVal('as-legal', supplier?supplier.legalName:'');
  setVal('as-city', supplier?supplier.city:'');
  setVal('as-ct', supplier?supplier.contact:'');
  setVal('as-ph', supplier?supplier.phone:'');
  setVal('as-em', supplier?supplier.email:'');
  setVal('as-dl', supplier?(supplier.deliverySchedule||supplier.delivery):'');
  setVal('as-wh', supplier?supplier.workSchedule:'');
  setVal('as-mn', supplier?String((supplier.min||'').replace(/[^\d.,]/g,'')).replace(',','.'):'');
  var cat=document.getElementById('as-c'); if(cat) cat.value=supplier&&supplier.type?supplier.type:'Универсальный';
  renderSupplierOrganizationOptions(supplier?normalizeSupplierOrganizationIds(supplier, db):(presetRestId?[String(presetRestId)]:[]));
  openModal('addSup');
}
function submitSup(){
  var db=dbGet();
  var editId=(document.getElementById('as-edit-id')||{value:''}).value;
  var existing=(editId!=='' && SUPS_DATA[Number(editId)])?SUPS_DATA[Number(editId)]:null;
  var n=(document.getElementById('as-n')||{value:''}).value.trim();
  if(!n){toast('Укажите название','err');return;}
  var emoji=(document.getElementById('as-em2')||{value:'🏭'}).value||'🏭';
  var type=(document.getElementById('as-c')||{value:'Поставщик'}).value||'Поставщик';
  var legalName=(document.getElementById('as-legal')||{value:''}).value.trim()||n;
  var city=(document.getElementById('as-city')||{value:''}).value.trim();
  var contact=(document.getElementById('as-ct')||{value:''}).value.trim();
  var phone=(document.getElementById('as-ph')||{value:''}).value.trim();
  var email=(document.getElementById('as-em')||{value:''}).value.trim();
  var delivery=(document.getElementById('as-dl')||{value:'1-2 дня'}).value||'1-2 дня';
  var workSchedule=(document.getElementById('as-wh')||{value:''}).value.trim();
  var minOrder=(document.getElementById('as-mn')||{value:''}).value.trim();
  var minStr=minOrder?'₽'+minOrder:'₽1 000';
  var organizationIds=Array.from(document.querySelectorAll('#as-orgs input[type="checkbox"]:checked')).map(function(cb){ return String(cb.value); }).filter(Boolean);
  if(!organizationIds.length){toast('Выберите хотя бы одну организацию','err');return;}
  if(existing && !canManageSupplierRecord(CU, existing, db)){toast('У вас нет прав на редактирование этого поставщика','err');return;}
  if(SUPS_DATA.find(function(x,idx){return idx!==Number(editId) && x.name.toLowerCase()===n.toLowerCase();})){
    toast('Поставщик с таким именем уже существует','err');return;
  }
  var payload={emoji:emoji,name:n,type:type,rating:existing&&existing.rating?existing.rating:5.0,orders:existing&&existing.orders?existing.orders:0,
    delivery:delivery,deliverySchedule:delivery,workSchedule:workSchedule,city:city,min:minStr,
    status:existing&&existing.status?existing.status:'new',tags:existing&&Array.isArray(existing.tags)?existing.tags.slice():[],contact:contact,phone:phone,email:email,legalName:legalName,
    organizationIds:organizationIds.slice()};
  if(existing){
    SUPS_DATA[Number(editId)]=Object.assign({},existing,payload);
  } else {
    SUPS_DATA.push(payload);
  }
  if(existing && existing.name!==n){
    PRODUCTS.forEach(function(prod){
      (prod.suppliers||[]).forEach(function(sup){ if(sup && sup.name===existing.name) sup.name=n; });
    });
    SUP_PRODS.forEach(function(prod){
      if(!prod) return;
      if(prod._supplier===existing.name) prod._supplier=n;
      if(prod.supplier===existing.name) prod.supplier=n;
    });
    var oldIdx=ALL_SUPS.indexOf(existing.name);
    if(oldIdx>=0) ALL_SUPS.splice(oldIdx,1);
  }
  if(ALL_SUPS.indexOf(n)<0) ALL_SUPS.push(n);
  closeSupplierModal();
  renderSuppliers();
  renderRestaurants();
  renderCatalog();
  savePriceData();
  toast('Поставщик «'+n+'» '+(existing?'обновлён':'добавлен')+'!','ok');
  logAudit(auditActor(), (existing?'Обновил':'Добавил')+' поставщика «'+n+'»','Поставщики');
}
function renderAniRoles(){const el=document.getElementById('aniRoles');if(!el)return;el.innerHTML=Object.entries(ROLES).map(([k,r])=>`<label style="display:flex;align-items:center;gap:7px;padding:7px;background:var(--bg3);border-radius:var(--r);cursor:pointer;font-size:12px;"><input type="checkbox" id="ani-r-${k}" style="width:14px;height:14px;accent-color:var(--ac);"> ${r.emoji} ${r.label}</label>`).join('');}
function submitNavItem(){const n=document.getElementById('ani-n')?.value.trim();if(!n){toast('❗ Укажите название','err');return;}const ico=document.getElementById('ani-i')?.value||'📄';const desc=document.getElementById('ani-d')?.value||'';const pg='custom_'+Date.now();const selectedRoles=Object.keys(ROLES).filter(k=>document.getElementById('ani-r-'+k)?.checked);if(!selectedRoles.length){toast('❗ Выберите роли','err');return;}selectedRoles.forEach(k=>{if(k!=='owner')ROLES[k].pages.push(pg);});ROLES.owner.pages.push(pg);PM[pg]={sec:'📁 Доп. разделы',ico,lbl:n};PT[pg]=n;if(CU)buildNav(CU);closeModal('addNavItem');toast(`✅ Вкладка «${n}» добавлена в навигацию!`,'ok');}

function showPush(type,title,to,body){const panel=document.getElementById('pushPanel');if(!panel)return;const el=document.createElement('div');el.className=`push ${type}`;el.innerHTML=`<div class="push-hd"><span class="push-ttl">${title}</span><span class="push-to">${to}</span><button class="push-cl" onclick="this.closest('.push').remove()">✕</button></div><div class="push-body">${body}</div><div class="push-time">${new Date().toLocaleTimeString('ru')}</div>`;panel.appendChild(el);setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),400);},8000);}
let toastT=null;
function toast(msg,type='ok'){const old=document.querySelector('.toast');if(old && typeof old.remove === "function")old.remove();if(toastT)clearTimeout(toastT);const el=document.createElement('div');el.className=`toast ${type}`;el.innerHTML=`<span>${type==='ok'?'✓':'✕'}</span>${msg}`;document.body.appendChild(el);toastT=setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.remove();},300);},3000);}


function submitCreateUser(forceCreate){
  var errEl=document.getElementById('cu-err'); if(errEl)errEl.textContent='';
  var fi=(document.getElementById('cu-fi')||{value:''}).value.trim();
  var la=(document.getElementById('cu-la')||{value:''}).value.trim();
  var co=(document.getElementById('cu-co')||{value:''}).value.trim();
  var em=((document.getElementById('cu-em')||{value:''}).value||'').trim().toLowerCase();
  var ro=(document.getElementById('cu-ro')||{value:'manager'}).value;
  var note=(document.getElementById('cu-note')||{value:''}).value.trim();
  var st=(document.getElementById('cu-status')||{value:'active'}).value;
  if(!fi||!la){if(errEl)errEl.textContent='Укажите имя и фамилию';return;}
  if(!co){if(errEl)errEl.textContent='Укажите компанию';return;}
  if(!em||!isEmail(em)){if(errEl)errEl.textContent='Введите корректный email';return;}
  var btn=document.querySelector('#ov-createUser .m-ok');
  if(btn){btn.textContent='Сохраняем...';btn.disabled=true;}
  function resetBtn(){if(btn){btn.textContent='✅ Сохранить пользователя';btn.disabled=false;}}
  function create(db){
    if(!db||!Array.isArray(db.users))db=_getDefaults();
    if(!forceCreate){
      for(var i=0;i<db.users.length;i++){
        var u=db.users[i];
        if(u&&u.email&&u.email.toLowerCase()===em){
          resetBtn();
          if(errEl)errEl.innerHTML='Email <b>'+em+'</b> \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442'+(u.first?' \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u043c <b>'+u.first+' '+u.last+'</b>':'')+
            '.<br><button onclick="submitCreateUser(true)" style="margin-top:6px;background:var(--or);color:#000;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:11px;font-weight:700;">\u041f\u0435\u0440\u0435\u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c</button>';
          return;
        }
      }
    }
    if(forceCreate)db.users=db.users.filter(function(u){return !u||!u.email||u.email.toLowerCase()!==em;});
    var nu={id:'u'+Date.now(),first:fi,last:la,company:co,email:em,role:ro,
      status:st,ev:true,created:today(),reason:note,createdBy:CU?CU.email:'system',precreated:true};
    db.users.push(nu);
    dbSet(db);
    resetBtn();
    renderDemoG();
    closeModal('createUser');
    ['cu-fi','cu-la','cu-co','cu-em','cu-note'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
    var stEl=document.getElementById('cu-status'); if(stEl)stEl.value='active';
    logAudit(auditActor(), 'Добавил пользователя '+em+' ('+ro+')','Пользователи');
    var rl=ROLES[ro]?(ROLES[ro].emoji+' '+ROLES[ro].label):ro;
    var stLabel=st==='active'
      ? 'будет активен сразу после самостоятельной регистрации'
      : 'потребует дополнительного одобрения';
    showPush('ok','✅ Пользователь сохранён!','',
      '<b>'+fi+' '+la+'</b><br>Email: <b>'+em+'</b><br>Роль: '+rl+
      '<br>Статус: <b>'+stLabel+'</b>'+
      '<br><br><span style="color:var(--ac);font-size:11px;">Теперь пользователь должен сам завершить регистрацию на экране входа.</span>');
    toast('Пользователь '+fi+' '+la+' сохранён','ok');
  }
  // Reload fresh from Firebase
  var xhr=new XMLHttpRequest();
  xhr.open('GET',_FB_URL,true); xhr.timeout=6000;
  xhr.onload=function(){
    var fresh=null;
    if(xhr.status===200){try{var d=JSON.parse(xhr.responseText);if(d&&Array.isArray(d.users)){fresh=d;_dbCache=d;try{localStorage.setItem('pv_cache',JSON.stringify(d));}catch(e){}}}catch(e){}}
    create(fresh||dbGet());
  };
  xhr.ontimeout=xhr.onerror=function(){create(dbGet());};
  xhr.send();
}

function clearCacheAndReload(){
  if(!confirm('Очистить кэш и перезагрузить?'))return;
  try{localStorage.removeItem('pv5x');localStorage.removeItem('pv6_data');
      localStorage.removeItem('pv_cache');localStorage.removeItem('pv_local');}catch(e){}
  _dbCache=null; window.location.reload();
}

function resetDatabase(){
  if(!confirm('Сбросить базу к начальным данным? Все созданные аккаунты будут удалены!'))return;
  var fresh=_getDefaults(); _dbCache=fresh;
  try{localStorage.setItem('pv_cache',JSON.stringify(fresh));}catch(e){}
  _writeToFirebase(fresh,null);
  renderDemoG(); toast('База данных сброшена','ok');
}


function openMyProfile(){
  if(!CU)return;
  var db=dbGet();
  var u=db.users.find(function(x){return x.id===CU.id;});
  if(!u)return;
  var set=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  set('mp-fi',u.first); set('mp-la',u.last); set('mp-co',u.company); set('mp-em',u.email);
  set('mp-old',''); set('mp-new',''); set('mp-new2','');
  var err=document.getElementById('mp-err'); if(err)err.textContent='';
  var ok=document.getElementById('mp-ok'); if(ok)ok.textContent='';
  var rd=ROLES[u.role]||{color:'var(--ac)',label:'',emoji:''};
  var tc=['owner','chef','buyer'].includes(u.role)?'#000':'#fff';
  var ava=document.getElementById('mpAva');
  if(ava){ava.style.background='linear-gradient(135deg,'+rd.color+','+rd.color+'88)';ava.style.color=tc;ava.textContent=((u.first||'?')[0]+(u.last||'?')[0]).toUpperCase();}
  var nm=document.getElementById('mpName'); if(nm)nm.textContent=(u.first||'')+' '+(u.last||'');
  var rl=document.getElementById('mpRole'); if(rl)rl.textContent=rd.emoji+' '+rd.label+(u.company?' · '+u.company:'');
  var em2=document.getElementById('mpEmail'); if(em2)em2.textContent=u.email;
  var orgBox=document.getElementById('mp-orgs');
  if(orgBox){
    var memberRests=(db.restaurants||[]).filter(function(rest){
      return rest.id!=='r0' && Array.isArray(rest.members) && rest.members.some(function(member){ return member.userId===u.id; });
    });
    orgBox.innerHTML=memberRests.length
      ? memberRests.map(function(rest){
          var member=(rest.members||[]).find(function(item){ return item.userId===u.id; })||{};
          var restRole=ROLES[member.role] ? (ROLES[member.role].emoji+' '+ROLES[member.role].label) : (member.role||'Участник');
          return '<div style="padding:10px 12px;border:1px solid var(--br);border-radius:10px;background:var(--bg2);">'
            +'<div style="font-size:13px;font-weight:700;">'+(rest.name||'Организация')+'</div>'
            +'<div style="font-size:11px;color:var(--t3);margin-top:4px;">'
            +(rest.legalName||'Юр. лицо не указано')
            +(rest.city?' · '+rest.city:'')
            +(rest.addr?' · '+rest.addr:'')
            +'</div>'
            +'<div style="font-size:11px;color:var(--t2);margin-top:6px;">Моя роль в организации: '+restRole+'</div>'
            +'</div>';
        }).join('')
      : '<div style="padding:12px;border:1px dashed var(--br2);border-radius:10px;color:var(--t3);font-size:12px;">Вы пока не состоите ни в одной организации.</div>';
  }
}
function saveMyProfile(){
  if(!CU)return;
  var err=document.getElementById('mp-err'); if(err)err.textContent='';
  var ok=document.getElementById('mp-ok'); if(ok)ok.textContent='';
  var fi=(document.getElementById('mp-fi')||{value:''}).value.trim();
  var la=(document.getElementById('mp-la')||{value:''}).value.trim();
  var co=(document.getElementById('mp-co')||{value:''}).value.trim();
  var newEm=((document.getElementById('mp-em')||{value:''}).value||'').trim().toLowerCase();
  var oldPw=(document.getElementById('mp-old')||{value:''}).value;
  var newPw=(document.getElementById('mp-new')||{value:''}).value;
  var newPw2=(document.getElementById('mp-new2')||{value:''}).value;
  if(!fi||!la){if(err)err.textContent='Укажите имя и фамилию';return;}
  if(!co){if(err)err.textContent='Укажите компанию';return;}
  if(newEm&&!isEmail(newEm)){if(err)err.textContent='Некорректный email';return;}
  var db=dbGet();
  var idx=db.users.findIndex(function(x){return x.id===CU.id;});
  if(idx<0){if(err)err.textContent='Пользователь не найден';return;}
  if(newEm&&newEm!==db.users[idx].email){
    var taken=db.users.some(function(u,i){return i!==idx&&u.email===newEm;});
    if(taken){if(err)err.textContent='Этот email уже занят другим пользователем';return;}
  }
  if(newPw||oldPw){
    if(!oldPw){if(err)err.textContent='Введите текущий пароль';return;}
    if(oldPw!==db.users[idx].pass){if(err)err.textContent='Неверный текущий пароль';return;}
    if(newPw.length<4){if(err)err.textContent='Новый пароль минимум 4 символа';return;}
    if(newPw!==newPw2){if(err)err.textContent='Пароли не совпадают';return;}
    db.users[idx].pass=newPw; CU.pass=newPw;
  }
  db.users[idx].first=fi; db.users[idx].last=la; db.users[idx].company=co;
  if(newEm){db.users[idx].email=newEm; CU.email=newEm;}
  dbSet(db);
  CU.first=fi; CU.last=la; CU.company=co;
  var sbName=document.getElementById('sbName'); if(sbName)sbName.textContent=fi+' '+la;
  var sbRole=document.getElementById('sbRole'); if(sbRole)sbRole.textContent=co;
  ['mp-old','mp-new','mp-new2'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  var em2=document.getElementById('mpEmail'); if(em2)em2.textContent=newEm||CU.email;
  if(ok)ok.textContent='Данные сохранены! Изменения применены на всех устройствах.';
  logAudit(fi+' '+la,'Обновил профиль','Профиль');
  toast('Профиль обновлён!','ok');
}



function rmC(i){
  _deletedItems.push({item:Object.assign({},cart[i]),idx:i});
  if(_deletedItems.length>10)_deletedItems.shift();
  cart.splice(i,1);
  updBdg();renderCart();
  toast('Удалено. Нажмите «↩ Вернуть» чтобы отменить','ok');
}

function undoLastDelete(){
  if(!_deletedItems.length)return;
  var last=_deletedItems.pop();
  cart.splice(last.idx,0,last.item);
  updBdg();renderCart();
  toast('↩ Товар возвращён в корзину','ok');
}

// ══════════════════════════════════════════
// ПРАЙС ПОСТАВЩИКА — поиск и скрытие
// ══════════════════════════════════════════

function filterSupProds(q){
  var rows=document.querySelectorAll('#supProdBody tr');
  var ql=q.toLowerCase();
  rows.forEach(function(row){
    var name=row.querySelector('td')&&row.querySelector('td').textContent.toLowerCase()||'';
    row.style.display=(!q||name.indexOf(ql)>=0)?'':'none';
  });
}

function uploadSupFileExcel(){
  toast('Загрузка Excel: переименуйте файл в .csv и загрузите через кнопку CSV','ok');
  uploadSupFile();
}


function openUploadPrice(){
  // Получаем список всех компаний из пользователей
  var db = dbGet();
  var companies = [];
  db.users.forEach(function(u){
    if(u.company && companies.indexOf(u.company) < 0) companies.push(u.company);
  });
  companies.sort();

  var listEl = document.getElementById('priceCompList');
  if(listEl){
    if(!companies.length){
      listEl.innerHTML = '<div style="color:var(--t3);font-size:12px;padding:8px;">Нет зарегистрированных компаний</div>';
    } else {
      listEl.innerHTML = companies.map(function(c){
        return '<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;border-radius:5px;" onmouseover="this.style.background=\'var(--bg4)\'" onmouseout="this.style.background=\'\'">'
          +'<input type="checkbox" class="price-comp-cb" value="'+c+'" style="width:15px;height:15px;cursor:pointer;accent-color:var(--ac);">'
          +'<span style="font-size:13px;">'+c+'</span></label>';
      }).join('');
    }
  }
  var errEl = document.getElementById('priceUploadErr');
  if(errEl) errEl.textContent = '';
  openModal('uploadPrice');
}

function selectAllPriceComps(val){
  document.querySelectorAll('.price-comp-cb').forEach(function(cb){ cb.checked = val; });
}

function doUploadPrice(){
  var errEl=document.getElementById('priceUploadErr');
  if(errEl) errEl.textContent='';

  // Получаем выбранные компании
  var selectedComps=[];
  document.querySelectorAll('.price-comp-cb:checked').forEach(function(cb){
    selectedComps.push(cb.value);
  });

  var fileInput=document.getElementById('priceFileInput');
  if(!fileInput||!fileInput.files||!fileInput.files[0]){
    if(errEl) errEl.textContent='Выберите файл';
    return;
  }

  var file=fileInput.files[0];
  var ext=file.name.split('.').pop().toLowerCase();
  var btn=document.getElementById('priceUploadBtn');
  if(btn){btn.textContent='Загружаем...';btn.disabled=true;}
  function resetBtn(){if(btn){btn.textContent='Загрузить прайс';btn.disabled=false;}}

  function processRows(rows){
    var added=0,updated=0;
    rows.forEach(function(parts,idx){
      if(idx===0){
        // Проверить заголовок
        var h=(parts[0]||'').toString().toLowerCase();
        if(/название|name|товар|product/i.test(h))return;
      }
      var name=(parts[0]||'').toString().trim(); if(!name)return;
      var cat=(parts[1]||'').toString().trim()||'—';
      var pKg=parseFloat(parts[2])||0;
      var pSh=parseFloat(parts[3])||0;
      var pL=parseFloat(parts[4])||0;
      var pMl=parseFloat(parts[5])||0;
      var stock=parseInt(parts[6])||100;
      var unit=pKg?'кг':pSh?'шт':pL?'л':'кг';

      var ex=SUP_PRODS.findIndex(function(p){return p.name.toLowerCase()===name.toLowerCase();});
      if(ex>=0){
        SUP_PRODS[ex].cat=cat;SUP_PRODS[ex].pKg=pKg;SUP_PRODS[ex].pSh=pSh;
        SUP_PRODS[ex].pL=pL;SUP_PRODS[ex].pMl=pMl;SUP_PRODS[ex].stock=stock;
        if(selectedComps.length){
          var existing=SUP_PRODS[ex].allowedCompanies||[];
          selectedComps.forEach(function(c){if(existing.indexOf(c)<0)existing.push(c);});
          SUP_PRODS[ex].allowedCompanies=existing;
        }
        updated++;
      } else {
        SUP_PRODS.push({id:Date.now()+idx,name:name,cat:cat,unit:unit,
          pKg:pKg,pSh:pSh,pL:pL,pMl:pMl,stock:stock,active:true,
          allowedCompanies:selectedComps.slice()});
        added++;
      }
    });
    renderSupProducts();
    savePriceData();
    closeModal('uploadPrice');
    if(fileInput) fileInput.value='';
    resetBtn();
    var compNames=selectedComps.length?selectedComps.join(', '):'все компании';
    toast('Загружено: +'+added+' новых, обновлено '+updated+'. Доступ: '+compNames,'ok');
    logAudit(auditActor(), 'Загрузил прайс (+'+added+'/обн '+updated+') для: '+compNames,'Прайс');
  }

  if(ext==='xlsx'||ext==='xls'){
    // Excel через SheetJS
    if(typeof XLSX==='undefined'){
      if(errEl)errEl.textContent='Библиотека Excel не загружена. Проверьте интернет-соединение.';
      resetBtn();return;
    }
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var wb=XLSX.read(ev.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        processRows(data);
      }catch(e){
        if(errEl)errEl.textContent='Ошибка чтения Excel: '+e.message;
        resetBtn();
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // CSV / TXT
    var reader=new FileReader();
    reader.onload=function(ev){
      var lines=ev.target.result.split(/\r?\n/).filter(function(l){return l.trim();});
      var rows=lines.map(function(line){return line.split(/[,;\t]/);});
      processRows(rows);
    };
    reader.readAsText(file,'utf-8');
  }
}

var _restaurantHistoryRange={};
function getRestaurantHistoryRange(restId){
  return Object.prototype.hasOwnProperty.call(_restaurantHistoryRange, restId)?_restaurantHistoryRange[restId]:30;
}
function setRestaurantHistoryRange(restId, days){
  _restaurantHistoryRange[restId]=days;
  renderRestaurants();
}
function _parseOrderDateValue(val){
  var str=String(val||'').trim();
  if(!str) return 0;
  var m=str.match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);
  if(m){
    var year=Number(m[3]);
    if(year<100) year=2000+year;
    return new Date(year, Number(m[2])-1, Number(m[1]), 12, 0, 0, 0).getTime();
  }
  var parsed=Date.parse(str);
  return isNaN(parsed)?0:parsed;
}
function renderRestaurants(){
  var el=document.getElementById('restGrid');
  if(!el)return;
  var db=dbGet();
  var restaurants=db.restaurants||[];
  // Убираем "Все рестораны" (r0) из управления
  var manageable=restaurants.filter(function(r){return r.id!=='r0';});
  document.getElementById('restPageSub').textContent=manageable.length+' заведений';

  if(!manageable.length){
    el.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--t3);">'
      +'<div style="font-size:48px;margin-bottom:12px;">🍽️</div>'
      +'<div style="font-size:16px;font-weight:700;margin-bottom:8px;">Нет заведений</div>'
      +'<div style="font-size:13px;margin-bottom:20px;">Добавьте первый ресторан или бар</div>'
      +'<button onclick="openModal(\'addRest\')" style="background:var(--ac);color:#fff;border:none;border-radius:var(--r);padding:10px 20px;font-weight:700;cursor:pointer;">+ Добавить заведение</button>'
      +'</div>';
    return;
  }

  el.innerHTML=manageable.map(function(r){
    var canViewSensitive=canViewRestaurantSensitiveData(CU, r);
    var canManageMembers=canManageRestaurantMembers(CU, r);
    var canInviteMembers=canInviteRestaurantMembers(CU, r);
    var legalEntities=Array.isArray(r.legalEntities)?r.legalEntities.filter(Boolean):[];
    var assignedLegalEntities=Array.isArray(r.assignedLegalEntities)&&r.assignedLegalEntities.length
      ? r.assignedLegalEntities.filter(Boolean)
      : legalEntities.slice();
    var legalSummary=legalEntities.length?legalEntities.join(' · '):(r.legalName||'Не заполнено');
    var assignedSummary=assignedLegalEntities.length?assignedLegalEntities.join(' · '):'Не выбраны';
    var responsibles=r.responsibles||{};
    var orderTemplates=Array.isArray(r.orderTemplates)?r.orderTemplates:[];
    var purchaseRules=r.purchaseRules||{};
    var zones=Array.isArray(r.zones)?r.zones.filter(Boolean):[];
    var historyRange=getRestaurantHistoryRange(r.id);
    var history=getRestaurantHistory(r, historyRange);
    var responsibleItems=[
      responsibles.director?'Директор: '+responsibles.director:'',
      responsibles.buyer?'Закупщик: '+responsibles.buyer:'',
      responsibles.accountant?'Бухгалтер: '+responsibles.accountant:'',
      responsibles.manager?'Управляющий: '+responsibles.manager:''
    ].filter(Boolean);
    var members=r.members||[];
    var users=db.users||[];
    var pendingInvites=(db.orgInvites||[]).filter(function(invite){
      return invite && invite.restId===r.id && invite.status==='pending';
    });
    // Получить полные данные пользователей
    var memberDetails=members.map(function(m){
      var u=users.find(function(u){return u.id===m.userId;});
      return u?Object.assign({},u,{restRole:m.role}):null;
    }).filter(Boolean);

    var memberCards=memberDetails.map(function(u){
      var rd=ROLES[u.role]||{emoji:'👤',label:u.role,color:'#888'};
      var tc=['owner','chef','buyer'].includes(u.role)?'#000':'#fff';
      var roleControl=canManageMembers
        ? '<select onchange="changeRestMemberRole(\''+r.id+'\',\''+u.id+'\',this.value)" '
          +'style="background:var(--bg3);border:1px solid var(--br);border-radius:5px;padding:4px 6px;font-size:11px;color:var(--tx);outline:none;">'
          +Object.keys(ROLES).map(function(rk){
            return '<option value="'+rk+'"'+(u.restRole===rk?' selected':'')+'>'+ROLES[rk].emoji+' '+ROLES[rk].label+'</option>';
          }).join('')
          +'</select>'
        : '<div style="font-size:11px;color:var(--t3);white-space:nowrap;">'+(ROLES[u.restRole]?ROLES[u.restRole].emoji+' '+ROLES[u.restRole].label:u.restRole)+'</div>';
      var removeControl=canManageMembers
        ? '<button onclick="removeRestMember(\''+r.id+'\',\''+u.id+'\')" '
          +'style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;" '
          +'title="Удалить из заведения">✕</button>'
        : '';
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--br);">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,'+rd.color+','+rd.color+'88);'
        +'color:'+tc+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">'
        +((u.first||'?')[0]+(u.last||'?')[0]).toUpperCase()+'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-weight:600;font-size:13px;">'+u.first+' '+u.last+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+rd.emoji+' '+rd.label+'  ·  '+u.email+'</div>'
        +'</div>'
        +roleControl
        +removeControl
        +'</div>';
    }).join('');

    // Пользователи НЕ в этом ресторане
    var memberIds=members.map(function(m){return m.userId;});
    var available=users.filter(function(u){
      return u.status==='active' && memberIds.indexOf(u.id)<0 && u.role!=='owner';
    });
    var pendingInviteIds=pendingInvites.map(function(invite){ return invite.userId; });
    available=available.filter(function(u){ return pendingInviteIds.indexOf(u.id)<0; });
    var availableOpts=available.map(function(u){
      return '<option value="'+u.id+'">'+u.first+' '+u.last+' ('+u.email+')</option>';
    }).join('');
    var pendingInviteCards=pendingInvites.length?pendingInvites.map(function(invite){
      var invitedUser=users.find(function(u){ return u.id===invite.userId; });
      var inviteRole=ROLES[invite.role] ? ROLES[invite.role].emoji+' '+ROLES[invite.role].label : invite.role;
      return '<div style="padding:8px 10px;border:1px solid var(--br);border-radius:8px;background:var(--bg3);font-size:12px;color:var(--t2);">'
        +'<b>'+(invitedUser ? invitedUser.first+' '+invitedUser.last : 'Пользователь')+'</b>'
        +' · '+(invitedUser ? invitedUser.email : '—')
        +' · '+inviteRole
        +'<div style="font-size:11px;color:var(--t3);margin-top:4px;">Пригласил: '+(invite.invitedByName||'—')+' · '+(invite.created||today())+'</div>'
        +'</div>';
    }).join(''):'';
    var linkedSuppliers=(SUPS_DATA||[]).filter(function(supplier){
      return normalizeSupplierOrganizationIds(supplier, db).indexOf(String(r.id))>=0 && !supplier.hidden;
    });
    var supplierCards=linkedSuppliers.length?linkedSuppliers.map(function(supplier){
      var supplierIndex=SUPS_DATA.indexOf(supplier);
      var canManageSupplier=canManageSupplierRecord(CU, supplier, db);
      return '<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);">'
        +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:13px;font-weight:700;">'+supplier.name+'</div>'
        +'<div style="font-size:11px;color:var(--t3);margin-top:4px;">'+(supplier.legalName||supplier.name)+' · '+(supplier.city||'Без города')+'</div>'
        +'<div style="font-size:11px;color:var(--t3);margin-top:4px;">Мин. заказ: '+(supplier.min||'—')+' · Доставка: '+(supplier.deliverySchedule||supplier.delivery||'—')+'</div>'
        +'</div>'
        +(canManageSupplier?'<button onclick="openSupplierModal('+supplierIndex+',\''+r.id+'\')" style="background:var(--bg4);border:1px solid var(--br2);border-radius:6px;padding:5px 9px;font-size:11px;cursor:pointer;color:var(--t2);">Изменить</button>':'')
        +'</div>'
        +'</div>';
    }).join(''):'<div style="color:var(--t3);font-size:12px;">Пока нет поставщиков, привязанных к этой организации.</div>';

	    var typeColors={Ресторан:'var(--ac)',Кафе:'var(--or)',Бар:'var(--pu)',Суши:'var(--bl)'};
	    var typeColor=typeColors[r.type]||'var(--t3)';
      var historyLabel=historyRange===0?'всё время':historyRange+' дн.';
	    var rulesBits=[];
    if(purchaseRules.minOrderAmount) rulesBits.push('Мин. заказ: ₽'+Number(purchaseRules.minOrderAmount).toLocaleString());
    if(purchaseRules.deadline) rulesBits.push('Дедлайн: '+purchaseRules.deadline);
    if(Array.isArray(purchaseRules.orderDays)&&purchaseRules.orderDays.length) rulesBits.push('Дни: '+purchaseRules.orderDays.join(', '));
    if(Array.isArray(purchaseRules.stopSuppliers)&&purchaseRules.stopSuppliers.length) rulesBits.push('Стоп: '+purchaseRules.stopSuppliers.join(' · '));
    if(Array.isArray(purchaseRules.prioritySuppliers)&&purchaseRules.prioritySuppliers.length) rulesBits.push('Приоритет: '+purchaseRules.prioritySuppliers.join(' · '));
    var templateCards=orderTemplates.length?orderTemplates.map(function(tpl){
      var itemCount=Array.isArray(tpl.items)?tpl.items.length:0;
      var supCount=Array.isArray(tpl.supplierNames)?tpl.supplierNames.length:0;
      return '<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);">'
        +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:13px;font-weight:700;">'+tpl.name+'</div>'
        +(tpl.description?'<div style="font-size:11px;color:var(--t3);margin-top:3px;">'+tpl.description+'</div>':'')
        +'<div style="font-size:11px;color:var(--t3);margin-top:6px;">'+itemCount+' позиций'
        +(supCount?' · '+supCount+' поставщиков':'')+'</div>'
        +'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">'
        +'<button onclick="useRestTemplate(\''+r.id+'\',\''+tpl.id+'\')" style="background:var(--ac);color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">Применить</button>'
        +'<button onclick="openRestTemplateModal(\''+r.id+'\',\''+tpl.id+'\')" style="background:var(--bg4);border:1px solid var(--br2);border-radius:6px;padding:5px 9px;font-size:11px;cursor:pointer;color:var(--t2);">✏️</button>'
        +'<button onclick="deleteRestTemplate(\''+r.id+'\',\''+tpl.id+'\')" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:6px;padding:5px 9px;font-size:11px;cursor:pointer;">✕</button>'
        +'</div>'
        +'</div>'
        +'</div>';
    }).join(''):'<div style="color:var(--t3);font-size:12px;">Пока нет шаблонов заказов для этой точки.</div>';

      var actionButtons=canViewSensitive
        ? '<button onclick="openEditRest(\''+r.id+'\')" style="background:var(--bg4);border:1px solid var(--br2);border-radius:var(--r);padding:6px 12px;font-size:12px;cursor:pointer;color:var(--t2);">✏️ Изменить</button>'
          +'<button onclick="deleteRest(\''+r.id+'\')" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:var(--r);padding:6px 12px;font-size:12px;cursor:pointer;">🗑 Удалить</button>'
        : '';
      var sensitiveSummary=canViewSensitive
        ? '<div style="padding:6px 16px;font-size:11px;color:var(--t3);">👥 Команда: '+memberDetails.length+' чел.'+(pendingInvites.length?' · приглашений: '+pendingInvites.length:'')+'</div>'
          +'<div style="padding:0 16px 8px;font-size:11px;color:var(--t3);">🏷 Бренд: '+(r.brandName||r.name||'Не заполнен')+'</div>'
          +'<div style="padding:0 16px 10px;font-size:11px;color:var(--t3);">🔀 Для заказов: '+assignedSummary+'</div>'
          +(responsibleItems.length?'<div style="padding:0 16px 10px;font-size:11px;color:var(--t3);">👤 Ответственные: '+responsibleItems.join(' · ')+'</div>':'')
          +((r.deliveryZone||r.receivingSchedule)?'<div style="padding:0 16px 10px;font-size:11px;color:var(--t3);">🚚 Доставка: '+(r.deliveryZone||'Не указана')+' · ⏰ Приёмка: '+(r.receivingSchedule||'Не указан график')+'</div>':'')
          +(zones.length?'<div style="padding:0 16px 10px;font-size:11px;color:var(--t3);">🏷 Зоны: '+zones.join(' · ')+'</div>':'')
          +(rulesBits.length?'<div style="padding:0 16px 10px;font-size:11px;color:var(--t3);">📏 Правила закупки: '+rulesBits.join(' · ')+'</div>':'')
        : '<div style="padding:0 16px 12px;font-size:11px;color:var(--t3);">🔒 Подробная информация доступна только участникам этого заведения</div>';
      var memberManageBlock='';
      if(canViewSensitive){
        var memberAddState=(canInviteMembers && available.length)
          ? '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
            +'<select id="add-u-'+r.id+'" style="flex:1;min-width:160px;background:var(--bg3);border:1px solid var(--br);border-radius:var(--r);padding:8px;font-size:12px;color:var(--tx);outline:none;">'
            +'<option value="">Выберите пользователя...</option>'+availableOpts+'</select>'
            +'<select id="add-r-'+r.id+'" style="background:var(--bg3);border:1px solid var(--br);border-radius:var(--r);padding:8px;font-size:12px;color:var(--tx);outline:none;">'
            +Object.keys(ROLES).filter(function(rk){return rk!=='owner';}).map(function(rk){
              return '<option value="'+rk+'">'+ROLES[rk].emoji+' '+ROLES[rk].label+'</option>';
            }).join('')+'</select>'
            +'<button onclick="addRestMember(\''+r.id+'\')" '
            +'style="background:var(--ac);color:#fff;border:none;border-radius:var(--r);padding:8px 14px;font-weight:700;font-size:12px;cursor:pointer;">'+(canManageMembers?'+ Добавить':'✉️ Пригласить')+'</button>'
            +'</div>'
          : '<div style="color:var(--t3);font-size:12px;">'+(canInviteMembers?'Все доступные пользователи уже добавлены или приглашены':'Изменять состав команды могут только владелец и администратор, участники могут приглашать новых коллег')+'</div>';
        memberManageBlock='<div style="padding:14px 16px;">'
          +(memberCards||'<div style="color:var(--t3);font-size:13px;padding:8px 0;">Нет участников</div>')
          +'</div>'
          +'<div style="padding:0 16px 14px;border-top:1px solid var(--br);margin-top:4px;padding-top:12px;">'
          +'<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:8px;">'+(canManageMembers?'Добавить участника':(canInviteMembers?'Пригласить в организацию':'Команда'))+'</div>'
          +memberAddState
          +(pendingInviteCards?'<div style="display:grid;gap:8px;margin-top:10px;">'+pendingInviteCards+'</div>':'')
          +'</div>'
          +'<div style="padding:0 16px 16px;border-top:1px solid var(--br);">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:12px;margin-bottom:10px;">'
          +'<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);">Поставщики организации</div>'
          +'<button onclick="openSupplierModal(undefined,\''+r.id+'\')" style="background:var(--bg4);border:1px solid var(--br2);border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;color:var(--t2);">+ Поставщик</button>'
          +'</div>'
          +'<div style="display:grid;gap:8px;">'+supplierCards+'</div>'
          +'</div>'
          +'<div style="padding:0 16px 16px;border-top:1px solid var(--br);">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:12px;margin-bottom:10px;">'
          +'<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);">Шаблоны заказов</div>'
          +'<div style="display:flex;gap:6px;flex-wrap:wrap;">'
          +'<button onclick="openRestRulesModal(\''+r.id+'\')" style="background:var(--bg4);border:1px solid var(--br2);border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;color:var(--t2);">⚙️ Правила</button>'
          +'<button onclick="openRestTemplateModal(\''+r.id+'\')" style="background:var(--bg4);border:1px solid var(--br2);border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;color:var(--t2);">+ Шаблон</button>'
          +'</div>'
          +'</div>'
          +'<div style="display:grid;gap:8px;">'+templateCards+'</div>'
          +'</div>'
          +'<div style="padding:0 16px 16px;border-top:1px solid var(--br);">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-top:12px;margin-bottom:10px;">'
          +'<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t3);">История точки · '+historyLabel+'</div>'
          +'<div style="display:flex;gap:6px;flex-wrap:wrap;">'
          +[7,30,90,0].map(function(days){
            var label=days===0?'Все':String(days);
            var active=historyRange===days;
            return '<button onclick="setRestaurantHistoryRange(\''+r.id+'\','+days+')" style="background:'+(active?'var(--ac)':'var(--bg4)')+';color:'+(active?'#fff':'var(--t2)')+';border:1px solid '+(active?'var(--ac)':'var(--br2)')+';border-radius:999px;padding:4px 9px;font-size:10px;font-weight:700;cursor:pointer;">'+label+'</button>';
          }).join('')
          +'</div>'
          +'</div>'
          +'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:8px;">'
          +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;">Заказы</div><div style="font-size:18px;font-weight:800;margin-top:4px;">'+history.orderCount+'</div></div>'
          +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;">Сумма</div><div style="font-size:18px;font-weight:800;margin-top:4px;">₽'+Math.round(history.totalSum).toLocaleString()+'</div></div>'
          +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;">Средний чек</div><div style="font-size:18px;font-weight:800;margin-top:4px;">₽'+Math.round(history.avgOrder).toLocaleString()+'</div></div>'
          +'</div>'
          +'<div style="display:grid;gap:8px;">'
          +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);font-size:12px;color:var(--t2);">📦 Последние заказы: '+(history.lastOrders.length?history.lastOrders.map(function(order){
            return order.id+' · '+order.date+' <button onclick="repeatRestaurantOrder(\''+r.id+'\',\''+order.id+'\')" style="margin-left:6px;background:var(--ac);color:#fff;border:none;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer;">Повторить</button>';
          }).join(' · '):'пока нет')+'</div>'
          +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);font-size:12px;color:var(--t2);">⭐ Любимые поставщики: '+(history.favoriteSuppliers.length?history.favoriteSuppliers.join(' · '):'пока нет статистики')+'</div>'
          +'<div style="padding:10px 12px;border:1px solid var(--br);border-radius:var(--r);background:var(--bg3);font-size:12px;color:var(--t2);">🧾 Частые товары: '+(history.frequentItems.length?history.frequentItems.join(' · ')+' <button onclick="startRestaurantOrderFromFrequent(\''+r.id+'\')" style="margin-left:8px;background:var(--bg4);color:var(--t2);border:1px solid var(--br2);border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer;">В новый заказ</button>':'пока нет статистики')+'</div>'
          +'</div>'
          +'</div>';
      }
	    return '<div style="background:var(--bg2);border:1px solid var(--br);border-radius:var(--r2);overflow:hidden;">'
	      // Шапка заведения
	      +'<div style="padding:14px 16px;background:var(--bg3);border-bottom:1px solid var(--br);">'
	      +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">'
      +'<div style="display:flex;align-items:center;gap:12px;">'
      +'<div style="width:48px;height:48px;border-radius:var(--r);background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:26px;">'+r.emoji+'</div>'
      +'<div>'
      +'<div style="font-family:var(--fH);font-size:16px;font-weight:800;">'+r.name+'</div>'
      +'<div style="font-size:12px;color:var(--t3);">'
      +'<span style="color:'+typeColor+';font-weight:600;">'+r.type+'</span>'
      +(r.city?' · '+r.city:'')
      +(r.addr?' · '+r.addr:'')
      +'</div>'
      +'</div></div>'
	      +'<div style="display:flex;gap:6px;">'
        +actionButtons
	      +'</div></div>'
	      +sensitiveSummary
	      +'<div style="padding:0 16px 10px;font-size:11px;color:var(--t3);">🏛 Юр. лицо'+(legalEntities.length>1?'а':'')+': '+legalSummary+'</div>'
	      +'<div style="padding:0 16px 10px;font-size:11px;color:var(--t3);">📍 Адрес: '+([r.city||'',r.addr||''].filter(Boolean).join(', ')||'Не указан')+'</div>'
	      +'</div>'
	      +memberManageBlock
	      +'</div>';
  }).join('');
}

function getRestaurantHistory(rest, days){
  var restName=rest&&rest.name?String(rest.name):'';
  var allOrders=(ORDERS||[]).filter(function(order){
    return String(order.rest||'')===restName;
  });
  var threshold=0;
  if(days && Number(days)>0){
    threshold=Date.now()-Number(days)*24*60*60*1000;
  }
  var orders=allOrders.filter(function(order){
    if(!threshold) return true;
    var time=_parseOrderDateValue(order.date);
    return !time || time>=threshold;
  });
  var supplierCounts={};
  var itemCounts={};
  var totalSum=0;
  orders.forEach(function(order){
    var sup=order.supplierName || String(order.sup||'').replace(/^[^\s]+\s+/,'').trim();
    if(sup) supplierCounts[sup]=(supplierCounts[sup]||0)+1;
    totalSum+=Number(order.sum)||0;
    var itemNames=Array.isArray(order.itemsDetailed)&&order.itemsDetailed.length
      ? order.itemsDetailed.map(function(item){ return String(item.name||'').trim(); }).filter(Boolean)
      : String(order.items||'').split(',').map(function(item){ return item.trim(); }).filter(Boolean);
    itemNames.forEach(function(item){
      itemCounts[item]=(itemCounts[item]||0)+1;
    });
  });
  return {
    orderCount: orders.length,
    totalSum: totalSum,
    avgOrder: orders.length?totalSum/orders.length:0,
    lastOrders: orders.slice(0,3).map(function(order){
      return {
        id: order.id,
        date: order.date,
        supplier: order.supplierName || String(order.sup||'').replace(/^[^\s]+\s+/,'').trim(),
        items: Array.isArray(order.itemsDetailed)&&order.itemsDetailed.length
          ? order.itemsDetailed.map(function(item){ return item.name; }).filter(Boolean)
          : String(order.items||'').split(',').map(function(item){ return item.trim(); }).filter(Boolean)
      };
    }),
    favoriteSuppliers: Object.keys(supplierCounts).sort(function(a,b){ return supplierCounts[b]-supplierCounts[a]; }).slice(0,3),
    frequentItems: Object.keys(itemCounts).sort(function(a,b){ return itemCounts[b]-itemCounts[a]; }).slice(0,5)
  };
}

function getRestaurantSmartSuggestions(){
  var rest=getActiveRestMeta();
  if(!rest) return [];
  return getRestaurantHistory(rest, getRestaurantHistoryRange(rest.id)).frequentItems.slice(0,6);
}

function renderOrderSmartSuggestions(){
  var wrap=document.getElementById('smartResult');
  if(!wrap) return;
  var suggestions=getRestaurantSmartSuggestions();
  if(!suggestions.length){
    if(!wrap.textContent || wrap.textContent.indexOf('Применён шаблон:')!==0) wrap.innerHTML='';
    return;
  }
  var current=wrap.textContent&&wrap.textContent.indexOf('Применён шаблон:')===0?'<div style="margin-bottom:6px;">'+wrap.textContent+'</div>':'';
  wrap.innerHTML=current+'<div style="display:flex;gap:6px;flex-wrap:wrap;">'+suggestions.map(function(item){
    return '<button onclick="addSuggestedOrderItem(\''+_esc(item)+'\')" style="background:var(--bg3);border:1px solid var(--br);border-radius:999px;padding:5px 10px;font-size:11px;cursor:pointer;color:var(--t2);">'+item+'</button>';
  }).join('')+'</div>';
}

function addSuggestedOrderItem(item){
  var inp=document.getElementById('orderSearchInput');
  if(!inp) return;
  var lines=String(inp.value||'').split(/\r?\n/).map(function(v){ return v.trim(); }).filter(Boolean);
  if(lines.indexOf(item)<0) lines.push(item);
  inp.value=lines.join('\n');
  autoResizeTA(inp);
  orderSearchMulti(inp.value);
}
function repeatRestaurantOrder(restId, orderId){
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  var order=(ORDERS||[]).find(function(o){ return o.id===orderId; });
  if(!rest || !order){toast('Не удалось найти заказ для повторения','err');return;}
  var items=Array.isArray(order.itemsDetailed)&&order.itemsDetailed.length
    ? order.itemsDetailed.map(function(item){ return item.name; }).filter(Boolean)
    : String(order.items||'').split(',').map(function(item){ return item.trim(); }).filter(Boolean);
  if(!items.length){toast('В заказе нет позиций для повторения','err');return;}
  var supplierNames=[];
  if(order.supplierName) supplierNames.push(order.supplierName);
  if(Array.isArray(rest.purchaseRules&&rest.purchaseRules.prioritySuppliers)){
    rest.purchaseRules.prioritySuppliers.forEach(function(name){
      if(name && supplierNames.indexOf(name)<0) supplierNames.push(name);
    });
  }
  _pendingOrderTemplate={
    restId:rest.id,
    templateName:'Повтор заказа '+order.id,
    supplierNames:supplierNames,
    items:items.map(function(name){ return {name:name}; })
  };
  openCreateOrder({restId:rest.id,supplierNames:supplierNames});
  toast('Подготовлен повтор заказа '+order.id,'ok');
}
function startRestaurantOrderFromFrequent(restId){
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  if(!rest){toast('Заведение не найдено','err');return;}
  var history=getRestaurantHistory(rest, getRestaurantHistoryRange(rest.id));
  if(!history.frequentItems.length){toast('Для этой точки пока нет частых товаров','err');return;}
  var supplierNames=history.favoriteSuppliers.slice();
  _pendingOrderTemplate={
    restId:rest.id,
    templateName:'Частые товары · '+rest.name,
    supplierNames:supplierNames,
    items:history.frequentItems.map(function(name){ return {name:name}; })
  };
  openCreateOrder({restId:rest.id,supplierNames:supplierNames});
  toast('Подготовлен новый заказ из частых товаров','ok');
}

function addRestMember(restId){
  var uSel=document.getElementById('add-u-'+restId);
  var rSel=document.getElementById('add-r-'+restId);
  if(!uSel||!uSel.value){toast('Выберите пользователя','err');return;}
  var userId=uSel.value;
  var role=rSel?rSel.value:'manager';
  var db=dbGet();
  var rest=db.restaurants.find(function(r){return r.id===restId;});
  if(!rest)return;
  if(!canInviteRestaurantMembers(CU, rest)){toast('У вас нет доступа к управлению участниками этого заведения','err');return;}
  if(!rest.members) rest.members=[];
  if(!Array.isArray(db.orgInvites)) db.orgInvites=[];
  // Проверить дубликат
  if(rest.members.find(function(m){return m.userId===userId;})){
    toast('Пользователь уже в этом заведении','err');return;
  }
  var targetUser=db.users.find(function(u){return u.id===userId;});
  if(!targetUser){toast('Пользователь не найден','err');return;}
  if(db.orgInvites.some(function(invite){
    return invite && invite.restId===restId && invite.userId===userId && invite.status==='pending';
  })){
    toast('Приглашение уже отправлено','err');return;
  }
  if(canManageRestaurantMembers(CU, rest)){
    rest.members.push({userId:userId,role:role});
    dbSet(db);
    toast('✅ '+targetUser.first+' '+targetUser.last+' добавлен в '+rest.name,'ok');
    logAudit(auditActor(), 'Добавил '+targetUser.email+' в '+rest.name,'Рестораны');
  } else {
    db.orgInvites.unshift({
      id:'oinv'+Date.now()+Math.random().toString(36).slice(2,6),
      restId:restId,
      userId:userId,
      role:role,
      invitedById:CU?CU.id:'',
      invitedByName:CU?((CU.first||'')+' '+(CU.last||'')).trim():'',
      created:today(),
      status:'pending'
    });
    dbSet(db);
    toast('✉️ Приглашение отправлено пользователю '+targetUser.first,'ok');
    logAudit(auditActor(), 'Пригласил '+targetUser.email+' в '+rest.name,'Рестораны');
    if(targetUser.id===CU.id){
      renderOrgInviteBadge();
      renderOrgInvites();
    }
  }
  renderRestaurants();
}

function removeRestMember(restId,userId){
  var db=dbGet();
  var rest=db.restaurants.find(function(r){return r.id===restId;});
  if(!rest||!rest.members)return;
  if(!canManageRestaurantMembers(CU, rest)){toast('Удалять участников могут только владелец и администратор','err');return;}
  var u=db.users.find(function(u){return u.id===userId;});
  if(!confirm('Удалить '+(u?u.first+' '+u.last:'пользователя')+' из «'+rest.name+'»?'))return;
  rest.members=rest.members.filter(function(m){return m.userId!==userId;});
  dbSet(db);
  toast('Пользователь удалён из '+rest.name,'ok');
  logAudit(auditActor(), 'Удалил '+(u?u.email:'?')+' из '+rest.name,'Рестораны');
  renderRestaurants();
}

function changeRestMemberRole(restId,userId,newRole){
  var db=dbGet();
  var rest=db.restaurants.find(function(r){return r.id===restId;});
  if(!rest||!rest.members)return;
  if(!canManageRestaurantMembers(CU, rest)){toast('Менять роли могут только владелец и администратор','err');return;}
  var member=rest.members.find(function(m){return m.userId===userId;});
  if(member) member.role=newRole;
  dbSet(db);
  var u=db.users.find(function(u){return u.id===userId;});
  toast('Роль '+(u?u.first:'')+' изменена на '+newRole,'ok');
  logAudit(auditActor(), 'Изменил роль участника '+(u?u.email:'?')+' в '+rest.name,'Рестораны');
}

function deleteRest(restId){
  var db=dbGet();
  var rest=db.restaurants.find(function(r){return r.id===restId;});
  if(!rest)return;
  if(!confirm('Удалить заведение «'+rest.name+'»?\n\nКоманда будет распущена.'))return;
  db.restaurants=db.restaurants.filter(function(r){return r.id!==restId;});
  if(activeRest&&activeRest.id===restId){
    activeRest=db.restaurants[0]||{id:'r0',name:'Все рестораны',emoji:'🌐'};
  }
  dbSet(db);
  toast('🗑 «'+rest.name+'» удалён','ok');
  logAudit(auditActor(), 'Удалил заведение «'+rest.name+'»','Рестораны');
  renderRestaurants();
}

function openEditRest(restId){
  var db=dbGet();
  var r=db.restaurants.find(function(x){return x.id===restId;});
  if(!r)return;
  // Заполнить форму addRest данными
  var n=document.getElementById('ar-n');if(n)n.value=r.name;
  var em=document.getElementById('ar-em');if(em)em.value=r.emoji||'🍽️';
  var t=document.getElementById('ar-t');if(t)t.value=r.type||'Ресторан';
  var city=document.getElementById('ar-city');if(city)city.value=r.city||'';
  var brand=document.getElementById('ar-brand');if(brand)brand.value=r.brandName||'';
  var addr=document.getElementById('ar-addr');if(addr)addr.value=r.addr||'';
  var legal=document.getElementById('ar-legal');if(legal)legal.value=r.legalName||'';
  var legals=document.getElementById('ar-legals');if(legals)legals.value=(Array.isArray(r.legalEntities)&&r.legalEntities.length?r.legalEntities:[r.legalName||'']).filter(Boolean).join('\n');
  var assignedLegals=document.getElementById('ar-assigned-legals');if(assignedLegals)assignedLegals.value=(Array.isArray(r.assignedLegalEntities)&&r.assignedLegalEntities.length?r.assignedLegalEntities:(Array.isArray(r.legalEntities)&&r.legalEntities.length?r.legalEntities:[r.legalName||''])).filter(Boolean).join('\n');
  var responsibles=r.responsibles||{};
  var director=document.getElementById('ar-director');if(director)director.value=responsibles.director||'';
  var buyer=document.getElementById('ar-buyer');if(buyer)buyer.value=responsibles.buyer||'';
  var accountant=document.getElementById('ar-accountant');if(accountant)accountant.value=responsibles.accountant||'';
  var manager=document.getElementById('ar-manager');if(manager)manager.value=responsibles.manager||'';
  var deliveryZone=document.getElementById('ar-delivery-zone');if(deliveryZone)deliveryZone.value=r.deliveryZone||'';
  var receivingSchedule=document.getElementById('ar-receiving-schedule');if(receivingSchedule)receivingSchedule.value=r.receivingSchedule||'';
  var zones=document.getElementById('ar-zones');if(zones)zones.value=(Array.isArray(r.zones)?r.zones:[]).join('\n');
  // Сохранить ID для редактирования
  var modal=document.getElementById('ov-addRest');
  if(modal) modal.dataset.editId=restId;
  var title=modal&&modal.querySelector('.m-title');
  if(title)title.textContent='✏️ Редактировать заведение';
  openModal('addRest');
}

function parseRestTemplateItems(raw){
  return String(raw||'').split(/\r?\n/).map(function(line){
    var parts=line.split('|').map(function(v){ return v.trim(); }).filter(Boolean);
    if(!parts.length) return null;
    var name=parts[0]||'';
    var qty=parts[1]?parseFloat(String(parts[1]).replace(',','.')):1;
    var unit=parts[2]||'';
    if(!name) return null;
    return {
      name:name,
      qty:isFinite(qty)&&qty>0?qty:1,
      unit:unit
    };
  }).filter(Boolean);
}

function stringifyRestTemplateItems(items){
  return (items||[]).map(function(item){
    return item.name+(item.qty||item.unit?' | '+(item.qty||1)+(item.unit?' | '+item.unit:''):'');
  }).join('\n');
}

function openRestTemplateModal(restId, templateId){
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  if(!rest){ toast('Заведение не найдено','err'); return; }
  var template=(rest.orderTemplates||[]).find(function(t){ return t.id===templateId; });
  var modal=document.getElementById('ov-restTemplate');
  if(!modal) return;
  modal.dataset.restId=restId;
  if(templateId) modal.dataset.templateId=templateId; else delete modal.dataset.templateId;
  var title=modal.querySelector('.m-title');
  if(title) title.textContent=template?'✏️ Редактировать шаблон заказа':'📋 Шаблон заказа';
  var restLabel=document.getElementById('rt-rest-label'); if(restLabel) restLabel.textContent=(rest.emoji||'🍽️')+' '+rest.name;
  var nameEl=document.getElementById('rt-name'); if(nameEl) nameEl.value=template?template.name:'';
  var descEl=document.getElementById('rt-desc'); if(descEl) descEl.value=template?template.description||'':'';
  var itemsEl=document.getElementById('rt-items'); if(itemsEl) itemsEl.value=template?stringifyRestTemplateItems(template.items||[]):'';
  var supsEl=document.getElementById('rt-sups'); if(supsEl) supsEl.value=template&&template.supplierNames?template.supplierNames.join('\n'):'';
  openModal('restTemplate');
}

function saveRestTemplate(){
  var modal=document.getElementById('ov-restTemplate');
  if(!modal) return;
  var restId=modal.dataset.restId||'';
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  if(!rest){ toast('Заведение не найдено','err'); return; }
  var name=(document.getElementById('rt-name')||{value:''}).value.trim();
  if(!name){ toast('Укажите название шаблона','err'); return; }
  var items=parseRestTemplateItems((document.getElementById('rt-items')||{value:''}).value);
  if(!items.length){ toast('Добавьте хотя бы одну позицию в шаблон','err'); return; }
  var supplierNames=(document.getElementById('rt-sups')||{value:''}).value.split(/\r?\n/).map(function(v){ return v.trim(); }).filter(Boolean);
  if(!rest.orderTemplates) rest.orderTemplates=[];
  var templateId=modal.dataset.templateId||'';
  var existing=templateId?rest.orderTemplates.find(function(t){ return t.id===templateId; }):null;
  var payload={
    id:existing?existing.id:'rt'+Date.now(),
    name:name,
    description:(document.getElementById('rt-desc')||{value:''}).value.trim(),
    items:items,
    supplierNames:supplierNames
  };
  if(existing) Object.assign(existing,payload);
  else rest.orderTemplates.push(payload);
  dbSet(db);
  closeModal('restTemplate');
  delete modal.dataset.templateId;
  toast('✅ Шаблон заказа сохранён','ok');
  renderRestaurants();
}

function deleteRestTemplate(restId, templateId){
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  if(!rest||!rest.orderTemplates) return;
  var tpl=rest.orderTemplates.find(function(t){ return t.id===templateId; });
  if(!tpl) return;
  if(!confirm('Удалить шаблон «'+tpl.name+'»?')) return;
  rest.orderTemplates=rest.orderTemplates.filter(function(t){ return t.id!==templateId; });
  dbSet(db);
  toast('Шаблон удалён','ok');
  renderRestaurants();
}

function normalizeSupplierRulesList(value){
  return String(value||'').split(/\r?\n/).map(function(v){ return v.trim(); }).filter(Boolean);
}

function openRestRulesModal(restId){
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  if(!rest){ toast('Заведение не найдено','err'); return; }
  var modal=document.getElementById('ov-restRules');
  if(!modal) return;
  modal.dataset.restId=restId;
  var rules=rest.purchaseRules||{};
  var title=modal.querySelector('.m-title');
  if(title) title.textContent='⚙️ Правила закупки: '+rest.name;
  var minOrder=document.getElementById('rr-min-order'); if(minOrder) minOrder.value=rules.minOrderAmount||'';
  var deadline=document.getElementById('rr-deadline'); if(deadline) deadline.value=rules.deadline||'';
  var orderDays=document.getElementById('rr-order-days'); if(orderDays) orderDays.value=(rules.orderDays||[]).join('\n');
  var stopSups=document.getElementById('rr-stop-sups'); if(stopSups) stopSups.value=(rules.stopSuppliers||[]).join('\n');
  var prioritySups=document.getElementById('rr-priority-sups'); if(prioritySups) prioritySups.value=(rules.prioritySuppliers||[]).join('\n');
  openModal('restRules');
}

function saveRestRules(){
  var modal=document.getElementById('ov-restRules');
  if(!modal) return;
  var restId=modal.dataset.restId||'';
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  if(!rest){ toast('Заведение не найдено','err'); return; }
  rest.purchaseRules={
    minOrderAmount: Math.max(0,parseFloat((document.getElementById('rr-min-order')||{value:'0'}).value)||0),
    deadline: (document.getElementById('rr-deadline')||{value:''}).value.trim(),
    orderDays: normalizeSupplierRulesList((document.getElementById('rr-order-days')||{value:''}).value),
    stopSuppliers: normalizeSupplierRulesList((document.getElementById('rr-stop-sups')||{value:''}).value),
    prioritySuppliers: normalizeSupplierRulesList((document.getElementById('rr-priority-sups')||{value:''}).value)
  };
  dbSet(db);
  closeModal('restRules');
  toast('✅ Правила закупки сохранены','ok');
  renderRestaurants();
  renderCart();
}

// Переопределяем submitRest с поддержкой редактирования
function submitRest(){
  var n=(document.getElementById('ar-n')||{value:''}).value.trim();
  if(!n){toast('Укажите название','err');return;}
  var brandName=(document.getElementById('ar-brand')||{value:''}).value.trim()||n;
  var legalName=(document.getElementById('ar-legal')||{value:''}).value.trim();
  var legalEntities=(document.getElementById('ar-legals')||{value:''}).value.split(/\r?\n/).map(function(v){return v.trim();}).filter(Boolean);
  var assignedLegalEntities=(document.getElementById('ar-assigned-legals')||{value:''}).value.split(/\r?\n/).map(function(v){return v.trim();}).filter(Boolean);
  if(!legalName && !legalEntities.length){toast('Укажите юр. лицо или список юр. лиц сети','err');return;}
  if(!legalEntities.length && legalName) legalEntities=[legalName];
  if(!legalName && legalEntities.length) legalName=legalEntities[0];
  if(!assignedLegalEntities.length) assignedLegalEntities=legalEntities.slice();
  assignedLegalEntities=assignedLegalEntities.filter(function(name,idx,arr){
    return legalEntities.indexOf(name)>=0 && arr.indexOf(name)===idx;
  });
  if(!assignedLegalEntities.length){toast('Для заведения нужно выбрать хотя бы одно доступное юр. лицо','err');return;}
  var responsibles={
    director:(document.getElementById('ar-director')||{value:''}).value.trim(),
    buyer:(document.getElementById('ar-buyer')||{value:''}).value.trim(),
    accountant:(document.getElementById('ar-accountant')||{value:''}).value.trim(),
    manager:(document.getElementById('ar-manager')||{value:''}).value.trim()
  };
  var deliveryZone=(document.getElementById('ar-delivery-zone')||{value:''}).value.trim();
  var receivingSchedule=(document.getElementById('ar-receiving-schedule')||{value:''}).value.trim();
  var zones=(document.getElementById('ar-zones')||{value:''}).value.split(/\r?\n/).map(function(v){return v.trim();}).filter(Boolean);
  var db=dbGet();
  var modal=document.getElementById('ov-addRest');
  var editId=modal&&modal.dataset.editId;

  if(editId){
    // Редактирование
    var r=db.restaurants.find(function(x){return x.id===editId;});
    if(r){
      r.name=n;
      r.emoji=(document.getElementById('ar-em')||{value:'🍽️'}).value||'🍽️';
      r.type=(document.getElementById('ar-t')||{value:'Ресторан'}).value;
      r.city=(document.getElementById('ar-city')||{value:''}).value.trim();
      r.brandName=brandName;
      r.addr=(document.getElementById('ar-addr')||{value:''}).value.trim();
      r.legalName=legalName;
      r.legalEntities=legalEntities.slice();
      r.assignedLegalEntities=assignedLegalEntities.slice();
      r.responsibles=responsibles;
      r.deliveryZone=deliveryZone;
      r.receivingSchedule=receivingSchedule;
      r.zones=zones;
      if(!Array.isArray(r.orderTemplates)) r.orderTemplates=[];
      if(!r.purchaseRules) r.purchaseRules={};
    }
    if(modal) delete modal.dataset.editId;
    var title=modal&&modal.querySelector('.m-title');
    if(title)title.textContent='🍽️ Добавить заведение';
    dbSet(db);
    closeModal('addRest');
    toast('✅ «'+n+'» обновлён!','ok');
  } else {
    // Создание нового
    var newRest={
      id:'r'+Date.now(),
      name:n,
      emoji:(document.getElementById('ar-em')||{value:'🍽️'}).value||'🍽️',
      type:(document.getElementById('ar-t')||{value:'Ресторан'}).value,
      city:(document.getElementById('ar-city')||{value:''}).value.trim(),
      brandName:brandName,
      addr:(document.getElementById('ar-addr')||{value:''}).value.trim(),
      legalName:legalName,
      legalEntities:legalEntities.slice(),
      assignedLegalEntities:assignedLegalEntities.slice(),
      responsibles:responsibles,
      deliveryZone:deliveryZone,
      receivingSchedule:receivingSchedule,
      zones:zones,
      orderTemplates:[],
      purchaseRules:{},
      members:[]
    };
    db.restaurants.push(newRest);
    dbSet(db);
    closeModal('addRest');
    toast('✅ «'+n+'» добавлен!','ok');
    logAudit(auditActor(), 'Создал заведение «'+n+'»','Рестораны');
  }
  renderRestaurants();
  renderRestPick();
  ['ar-n','ar-em','ar-city','ar-brand','ar-addr','ar-legal','ar-legals','ar-assigned-legals','ar-director','ar-buyer','ar-accountant','ar-manager','ar-delivery-zone','ar-receiving-schedule','ar-zones'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
}



function savePriceData(){
  // Быстрое сохранение прайсов в Firebase (вызывается после загрузки файла)
  var d = dbGet();
  d.supProds = SUP_PRODS;
  d.supsData = SUPS_DATA;
  d.products = PRODUCTS;
  d.supplierPriceLists = SUP_PRICE_LISTS;
  d.supplierPriceListLegals = SUP_PRICE_LIST_LEGALS;
  d.supplierPriceItems = SUP_PRICE_ITEMS;
  d.supplierImportTemplates = Array.isArray(window.supplierImportTemplates) ? window.supplierImportTemplates : (Array.isArray(d.supplierImportTemplates) ? d.supplierImportTemplates : []);
  d.priceImportBatches = Array.isArray(window.priceImportBatches) ? window.priceImportBatches : (Array.isArray(d.priceImportBatches) ? d.priceImportBatches : []);
  d.priceImportItems = Array.isArray(window.priceImportItems) ? window.priceImportItems : (Array.isArray(d.priceImportItems) ? d.priceImportItems : []);
  dbSet(d);
}

function saveOrdersData(){
  // Сохранение заказов
  var d = dbGet();
  d.orders = ORDERS;
  dbSet(d);
}


// ══════════════════════════════════════════
// ЗАГРУЗКА EXCEL/CSV В КАТАЛОГ
// ══════════════════════════════════════════

function openCatalogUpload(){
  var db=dbGet();
  var companies=[];
  (db.users||[]).forEach(function(u){if(u.company&&companies.indexOf(u.company)<0)companies.push(u.company);});
  companies.sort();
  var listEl=document.getElementById('catUploadCompList');
  if(listEl){
    listEl.innerHTML=companies.length
      ?companies.map(function(c){
          return '<label style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;border-radius:5px;">'
            +'<input type="checkbox" class="cat-comp-cb" value="'+c+'" style="width:15px;height:15px;accent-color:var(--ac);">'
            +'<span style="font-size:13px;">'+c+'</span></label>';
        }).join('')
      :'<div style="color:var(--t3);font-size:12px;padding:8px;">Нет компаний</div>';
  }
  var err=document.getElementById('catUploadErr');if(err)err.textContent='';
  openModal('catalogUpload');
}

function selectAllCatComps(val){
  document.querySelectorAll('.cat-comp-cb').forEach(function(cb){cb.checked=val;});
}

function doUploadCatalog(){
  var errEl=document.getElementById('catUploadErr');if(errEl)errEl.textContent='';
  var selectedComps=[];
  document.querySelectorAll('.cat-comp-cb:checked').forEach(function(cb){selectedComps.push(cb.value);});

  var fi=document.getElementById('catUploadFile');
  if(!fi||!fi.files||!fi.files[0]){if(errEl)errEl.textContent='Выберите файл';return;}
  var file=fi.files[0];
  var ext=file.name.split('.').pop().toLowerCase();

  var btn=document.getElementById('catUploadBtn');
  if(btn){btn.textContent='Загружаем...';btn.disabled=true;}
  function resetBtn(){if(btn){btn.textContent='Загрузить в каталог';btn.disabled=false;}}

  function processRows(rows){
    var added=0,updated=0;
    rows.forEach(function(parts,idx){
      if(idx===0){
        var h=(parts[0]||'').toString().toLowerCase();
        if(/название|name|товар|product/i.test(h))return;
      }
      var name=(parts[0]||'').toString().trim();if(!name)return;
      var cat=(parts[1]||'').toString().trim()||'dry';
      var emoji=(parts[2]||'').toString().trim()||'📦';
      var unit=(parts[3]||'').toString().trim()||'кг';
      var pKg=parseFloat(parts[4])||0;
      var pSh=parseFloat(parts[5])||0;
      var pL=parseFloat(parts[6])||0;
      var supName=(parts[7]||'').toString().trim()||'Мой поставщик';

      var ex=PRODUCTS.findIndex(function(p){return p.name.toLowerCase()===name.toLowerCase();});
      var price=pKg||pSh||pL||0;
      if(ex>=0){
        // Обновить/добавить поставщика
        var spIdx=PRODUCTS[ex].suppliers.findIndex(function(s){return s.name===supName;});
        if(spIdx>=0){PRODUCTS[ex].suppliers[spIdx].price=price;}
        else{PRODUCTS[ex].suppliers.push({name:supName,price:price});}
        if(pKg)PRODUCTS[ex].pKg=pKg;
        if(pSh)PRODUCTS[ex].pSh=pSh;
        if(pL)PRODUCTS[ex].pL=pL;
        updated++;
      } else {
        PRODUCTS.push({
          id:Date.now()+idx,name:name,cat:cat,unit:unit,emoji:emoji,
          sticker:null,fav:false,
          suppliers:[{name:supName,price:price}],
          pKg:pKg,pSh:pSh,pL:pL,pMl:0,
          allowedCompanies:selectedComps.slice()
        });
        added++;
      }
      // Добавить поставщика в ALL_SUPS если нет
      if(supName&&ALL_SUPS.indexOf(supName)<0)ALL_SUPS.push(supName);
    });
    renderCatalog();
    savePriceData();
    closeModal('catalogUpload');
    if(fi)fi.value='';
    resetBtn();
    var who=selectedComps.length?selectedComps.join(', '):'все';
    toast('Каталог: +'+added+' новых, обн. '+updated+'. Цены для: '+who,'ok');
    logAudit(auditActor(), 'Загрузил в каталог +'+added+'/обн '+updated,'Каталог');
  }

  function readExcel(file,cb){
    if(typeof XLSX==='undefined'){
      if(errEl)errEl.textContent='Библиотека Excel не загружена (проверьте интернет)';
      resetBtn();return;
    }
    var r=new FileReader();
    r.onload=function(ev){
      try{
        var wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        cb(XLSX.utils.sheet_to_json(ws,{header:1,defval:''}));
      }catch(e){if(errEl)errEl.textContent='Ошибка чтения Excel: '+e.message;resetBtn();}
    };
    r.readAsArrayBuffer(file);
  }

  function readCSV(file,cb){
    var r=new FileReader();
    r.onload=function(ev){cb(ev.target.result.split(/\r?\n/).filter(function(l){return l.trim();}).map(function(l){return l.split(/[,;\t]/);}));};
    r.readAsText(file,'utf-8');
  }

  if(ext==='xlsx'||ext==='xls'){readExcel(file,processRows);}
  else{readCSV(file,processRows);}
}

// ══════════════════════════════════════════
// ЗАГРУЗКА EXCEL/CSV В ТЕНДЕР
// ══════════════════════════════════════════


function openTenderUpload(){
  // Заполнить список компаний
  var db=dbGet();
  var companies=[];
  (db.users||[]).forEach(function(u){if(u.company&&companies.indexOf(u.company)<0)companies.push(u.company);});
  companies.sort();
  var listEl=document.getElementById('tenderCompList');
  if(listEl){
    listEl.innerHTML=companies.map(function(c){
      return '<label style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;">'
        +'<input type="checkbox" class="tender-comp-cb" value="'+c+'" style="width:15px;height:15px;accent-color:var(--ac);">'
        +'<span style="font-size:13px;">'+c+'</span></label>';
    }).join('') || '<div style="color:var(--t3);font-size:12px;padding:8px;">Нет компаний</div>';
  }
  var err=document.getElementById('tenderUploadErr');if(err)err.textContent='';
  openModal('tenderUploadFile');
}

function selectAllTenderComps(val){
  document.querySelectorAll('.tender-comp-cb').forEach(function(cb){cb.checked=val;});
}


function doUploadTenderFile(){
  var errEl=document.getElementById('tenderUploadErr');if(errEl)errEl.textContent='';

  var selectedComps=[];
  document.querySelectorAll('.tender-comp-cb:checked').forEach(function(cb){selectedComps.push(cb.value);});

  var fi=document.getElementById('tenderUploadFile');
  if(!fi||!fi.files||!fi.files[0]){if(errEl)errEl.textContent='Выберите файл';return;}
  var file=fi.files[0];
  var ext=file.name.split('.').pop().toLowerCase();

  var btn=document.getElementById('tenderUploadBtn');
  if(btn){btn.textContent='Загружаем...';btn.disabled=true;}
  function resetBtn(){if(btn){btn.textContent='Загрузить';btn.disabled=false;}}

  function processRows(rows){
    var loaded=0;
    var supName='';

    rows.forEach(function(parts,idx){
      if(idx===0){
        // Определить по заголовку какие колонки
        var h0=(parts[0]||'').toString().toLowerCase();
        if(/наимен|name|товар|product/i.test(h0))return; // пропустить заголовок
      }
      var name=(parts[0]||'').toString().trim();if(!name)return;
      // Колонка B: единица измерения
      var unit=(parts[1]||'').toString().trim()||'кг';
      // Колонка C: цена с НДС
      var priceRaw=(parts[2]||'').toString().replace(/[^\d.,]/g,'').replace(',','.');
      var price=parseFloat(priceRaw)||0;
      // Колонка D: поставщик (необяз.)
      var sup=(parts[3]||'').toString().trim();

      // Найти товар в PRODUCTS
      var prod=PRODUCTS.find(function(p){
        return p.name.toLowerCase()===name.toLowerCase()
          || p.name.toLowerCase().indexOf(name.toLowerCase().slice(0,5))>=0
          || name.toLowerCase().indexOf(p.name.toLowerCase().slice(0,5))>=0;
      });

      if(prod){
        // Обновить цену в suppliers
        if(sup){
          var spIdx=prod.suppliers.findIndex(function(s){return s.name===sup;});
          if(spIdx>=0){prod.suppliers[spIdx].price=price;}
          else{prod.suppliers.push({name:sup,price:price});}
        } else {
          // Обновить минимальную цену
          if(prod.suppliers.length>0) prod.suppliers[0].price=price;
        }
        // Обновить allowedCompanies
        if(selectedComps.length){
          if(!prod.allowedCompanies) prod.allowedCompanies=[];
          selectedComps.forEach(function(c){
            if(prod.allowedCompanies.indexOf(c)<0) prod.allowedCompanies.push(c);
          });
        }
      } else {
        // Создать новый товар
        var newSup=sup||(ALL_SUPS[0]||'Поставщик');
        PRODUCTS.push({
          id:Date.now()+idx,name:name,cat:'dry',unit:unit,emoji:'📦',
          sticker:null,fav:false,
          suppliers:[{name:newSup,price:price}],
          pKg:unit==='кг'?price:0,pSh:unit==='шт'?price:0,pL:unit==='л'?price:0,pMl:0,
          allowedCompanies:selectedComps.slice()
        });
        if(newSup&&ALL_SUPS.indexOf(newSup)<0) ALL_SUPS.push(newSup);
      }

      // Добавить в тендер строку
      addTRow();
      var i=tRC-1;
      var ps=document.getElementById('tr-p-'+i);
      var pv=document.getElementById('tr-v-'+i);
      var ss=document.getElementById('tr-s-'+i);
      if(ps&&prod)ps.value=prod.id;
      if(pv)pv.value=price||'';
      if(ss&&sup)ss.value=sup;
      loaded++;
    });

    savePriceData();
    renderCatalog();
    closeModal('tenderUploadFile');
    if(fi)fi.value='';
    resetBtn();
    var who=selectedComps.length?selectedComps.join(', '):'все';
    toast('Загружено '+loaded+' позиций. Цены для: '+who,'ok');
    logAudit(auditActor(), 'Загрузил прайс в тендер: '+loaded+' позиций для '+who,'Тендер');
  }

  function readExcel(f,cb){
    if(typeof XLSX==='undefined'){
      if(errEl)errEl.textContent='SheetJS не загружен (проверьте интернет)';
      resetBtn();return;
    }
    var r=new FileReader();
    r.onload=function(ev){
      try{
        var wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        cb(XLSX.utils.sheet_to_json(ws,{header:1,defval:''}));
      }catch(e){if(errEl)errEl.textContent='Ошибка Excel: '+e.message;resetBtn();}
    };
    r.readAsArrayBuffer(f);
  }

  if(ext==='xlsx'||ext==='xls'){readExcel(file,processRows);}
  else{
    var r=new FileReader();
    r.onload=function(ev){
      processRows(ev.target.result.split(/\r?\n/)
        .filter(function(l){return l.trim();})
        .map(function(l){return l.split(/[,;\t]/);})
      );
    };
    r.readAsText(file,'utf-8');
  }
}
// ══════════════════════════════════════════
// МУЛЬТИВЫБОР В КАТАЛОГЕ
// ══════════════════════════════════════════

function toggleCatSelect(){
  catSelectMode = !catSelectMode;
  catSelectedIds = [];
  var btn = document.getElementById('catSelectBtn');
  var bar = document.getElementById('catSelectBar');
  if(btn) btn.style.background = catSelectMode ? 'var(--ac)' : '';
  if(btn) btn.style.color = catSelectMode ? '#000' : '';
  if(bar) bar.style.display = catSelectMode ? 'flex' : 'none';
  renderCatalog();
  updateCatSelectCount();
}

function updateCatSelectCount(){
  var el = document.getElementById('catSelectCount');
  if(el) el.textContent = catSelectedIds.length + ' выбрано';
}

function toggleCatItem(pid){
  var idx = catSelectedIds.indexOf(pid);
  if(idx >= 0) catSelectedIds.splice(idx,1);
  else catSelectedIds.push(pid);
  // Обновить чекбокс
  var cb = document.getElementById('cat-cb-'+pid);
  if(cb) cb.checked = catSelectedIds.indexOf(pid) >= 0;
  // Обновить строку
  var row = document.getElementById('cat-row-'+pid);
  if(row) row.style.background = catSelectedIds.indexOf(pid) >= 0 ? 'var(--aD)' : '';
  updateCatSelectCount();
}

function selectAllCatItems(){
  catSelectedIds = PRODUCTS.map(function(p){return p.id;});
  renderCatalog();
  updateCatSelectCount();
}

function deselectAllCatItems(){
  catSelectedIds = [];
  renderCatalog();
  updateCatSelectCount();
}

function deleteSelectedCatItems(){
  if(!catSelectedIds.length){toast('Выберите товары для удаления','err');return;}
  if(!confirm('Удалить '+catSelectedIds.length+' товаров?'))return;
  PRODUCTS = PRODUCTS.filter(function(p){return catSelectedIds.indexOf(p.id)<0;});
  catSelectedIds = [];
  savePriceData();
  renderCatalog();
  updateCatSelectCount();
  toast('Удалено','ok');
}

function editSelectedCatItem(){
  if(!catSelectedIds.length){toast('Выберите товар для редактирования','err');return;}
  openEditProd(catSelectedIds[0]);
}


function _checkoutIdx(si){
  var supName=_supOrder[si];
  if(supName) checkoutSup(si);
}

function _clearSupIdx(si){
  var supName=_supOrder[si];
  if(supName) clearSupCart(si);
}

function _saveComment(si, val){
  var supName=_supOrder[si];
  if(supName) cartComments[supName]=val;
}

function getActiveRestMeta(){
  var db=dbGet();
  var restId=_orderRestId||(activeRest&&activeRest.id)||'';
  return (db.restaurants||[]).find(function(r){ return r.id===restId; })||null;
}

function getActivePurchaseRules(){
  var rest=getActiveRestMeta();
  return rest&&rest.purchaseRules?rest.purchaseRules:{};
}

function supplierRuleStatus(supName,total){
  var rules=getActivePurchaseRules();
  var stop=(rules.stopSuppliers||[]).map(function(v){ return String(v).toLowerCase(); });
  var priority=(rules.prioritySuppliers||[]).map(function(v){ return String(v).toLowerCase(); });
  var supKey=String(supName||'').toLowerCase();
  return {
    blocked: stop.indexOf(supKey)>=0,
    priority: priority.indexOf(supKey)>=0,
    minOrderAmount: Number(rules.minOrderAmount)||0,
    minOrderMet: !(Number(rules.minOrderAmount)||0) || Number(total||0) >= Number(rules.minOrderAmount||0),
    deadline: rules.deadline||'',
    orderDays: Array.isArray(rules.orderDays)?rules.orderDays:[]
  };
}

function getCurrentOrderRestaurantMeta(){
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===_orderRestId; });
  if(!rest && activeRest && activeRest.id){
    rest=(db.restaurants||[]).find(function(r){ return r.id===activeRest.id; });
  }
  return rest||null;
}

function getOrderHeaderRows(restName, date, supName, comment){
  var rest=getCurrentOrderRestaurantMeta();
  var chosenLegal = _orderLegalEntityNames.length ? _orderLegalEntityNames[0] : '';
  var deliveryParts = [];
  if(_orderDeliveryDate) deliveryParts.push(_orderDeliveryDate);
  if(_orderDeliveryFrom || _orderDeliveryTo){
    deliveryParts.push((_orderDeliveryFrom || '—')+' – '+(_orderDeliveryTo || '—'));
  }
  var rows=[
    ['Ресторан / Заведение:', restName||'Не указано']
  ];
  if(rest){
    rows.push(['Бренд:', rest.brandName||rest.name||'Не указан']);
    rows.push(['Юр. лицо для заказа:', chosenLegal || rest.legalName || 'Не указано']);
    if(rest.city||rest.addr){
      rows.push(['Адрес / локация:', [rest.city||'',rest.addr||''].filter(Boolean).join(', ')]);
    }
    if(rest.deliveryZone){
      rows.push(['Зона доставки:', rest.deliveryZone]);
    }
    if(rest.receivingSchedule){
      rows.push(['График приёмки:', rest.receivingSchedule]);
    }
    var responsibles=rest.responsibles||{};
    if(responsibles.director) rows.push(['Директор:', responsibles.director]);
    if(responsibles.buyer) rows.push(['Закупщик:', responsibles.buyer]);
    if(responsibles.accountant) rows.push(['Бухгалтер:', responsibles.accountant]);
    if(responsibles.manager) rows.push(['Управляющий:', responsibles.manager]);
  } else if(chosenLegal){
    rows.push(['Юр. лицо для заказа:', chosenLegal]);
  }
  if(supName) rows.push(['Поставщик:', supName]);
  if(deliveryParts.length) rows.push(['Доставка:', deliveryParts.join(' · ')]);
  rows.push(['Дата заказа:', date]);
  if(comment) rows.push(['Комментарий:', comment]);
  return rows;
}


// ══════════════════════════════════════════
// ВЫГРУЗКА ЗАКАЗА ПОСТАВЩИКА В EXCEL
// ══════════════════════════════════════════


function _exportSupCartXLSX(supName, items, total, restName, date, comment){
  var wb=XLSX.utils.book_new();

  // === ДАННЫЕ ДЛЯ ЛИСТА ===
  var wsData=[];

  // Шапка документа
  wsData.push(['ЗАКАЗ ПОСТАВЩИКУ']);
  wsData.push(['']);
  getOrderHeaderRows(restName, date, supName, comment).forEach(function(row){ wsData.push(row); });
  wsData.push(['']);

  // Заголовки таблицы
  wsData.push(['№','Наименование','Ед. изм.','Зона','Накладная','Кол-во','Цена за ед. (₽)','Сумма (₽)']);

  // Строки товаров
  var lastGroup='';
  items.forEach(function(item, i){
    var groupLabel = item.invoiceGroup==='extra' ? 'Доп. накладная' : 'Основная';
    if(groupLabel !== lastGroup){
      if(lastGroup) wsData.push(['']);
      wsData.push([groupLabel]);
      lastGroup = groupLabel;
    }
    var sum=Math.round(item.price*item.qty*100)/100;
    wsData.push([
      i+1,
      item.name,
      item.unit||'шт',
      item.zone||'',
      groupLabel,
      item.qty,
      item.price,
      sum
    ]);
  });

  // Итог
  wsData.push(['']);
  wsData.push(['','','','','ИТОГО:',Math.round(total*100)/100]);
  if(CU) wsData.push(['','','','','Заказ сделал:',CU.first+' '+CU.last]);

  // Создать лист
  var ws=XLSX.utils.aoa_to_sheet(wsData);

  // Ширина колонок
  ws['!cols']=[
    {wch:4},   // №
    {wch:35},  // Наименование
    {wch:10},  // Ед.
    {wch:16},  // Зона
    {wch:18},  // Накладная
    {wch:10},  // Кол-во
    {wch:16},  // Цена
    {wch:16},  // Сумма
  ];

  // Объединить ячейки для заголовка
  ws['!merges']=[
    {s:{r:0,c:0},e:{r:0,c:7}}, // "ЗАКАЗ ПОСТАВЩИКУ"
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Заказ');

  // Скачать файл
  var fileName='Заказ_'+supName.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g,'_')+'_'+date.replace(/\./g,'-')+'.xlsx';
  XLSX.writeFile(wb, fileName);
  toast('Excel скачан: '+fileName,'ok');
}

function _exportSupCartCSV(supName, items, total, restName, date, comment){
  var rows=[];
  rows.push('ЗАКАЗ ПОСТАВЩИКУ');
  rows.push('');
  rows.push('Ресторан: '+restName);
  rows.push('Поставщик: '+supName);
  rows.push('Дата: '+date);
  if(comment) rows.push('Комментарий: '+comment);
  rows.push('');
  rows.push('№,Наименование,Ед.изм.,Зона,Накладная,Кол-во,Цена за ед.,Сумма');

  var lastGroup='';
  items.forEach(function(item,i){
    var groupLabel = item.invoiceGroup==='extra' ? 'Доп. накладная' : 'Основная';
    if(groupLabel !== lastGroup){
      rows.push(groupLabel);
      lastGroup = groupLabel;
    }
    var sum=Math.round(item.price*item.qty*100)/100;
    rows.push([i+1, '"'+item.name+'"', item.unit||'шт', '"'+(item.zone||'')+'"',
               '"'+groupLabel+'"',
               item.qty, item.price, sum].join(','));
  });

  rows.push('');
  rows.push(',,,, ИТОГО:,'+Math.round(total*100)/100);
  if(CU) rows.push(',,,, Заказ сделал:,"'+CU.first+' '+CU.last+'"');

  var csv='\uFEFF'+rows.join('\n'); // BOM для Excel
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='Заказ_'+supName.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g,'_')+'_'+date.replace(/\./g,'-')+'.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV скачан (откройте в Excel)','ok');
}


// ══════════════════════════════════════════
// ЗАГРУЗКА ПРАЙСА КОНКРЕТНОГО ПОСТАВЩИКА
// ══════════════════════════════════════════

var _currentSupName = '';
var _supPriceAppend = false; // false=заменить, true=дополнить
var _supPriceImportBook = null;
var _supPriceImportSheetName = '';
var _supPriceImportRows = [];
var _supPriceImportFileName = '';
var _supPriceImportSheets = [];
var _supPriceImportTemplateKey = '';


function doUploadSupPrice(){doUploadPrice();}
function searchProductForCartItem(cartIdx, supName){
  _cartSearchIdx = cartIdx;
  _cartSearchSup = supName;

  var supEl = document.getElementById('cartSearchSupName');
  if(supEl) supEl.textContent = 'Поставщик: '+supName;

  var inp = document.getElementById('cartSearchInput');
  if(inp){ inp.value=''; inp.focus(); }

  filterCartSearch('');
  openModal('cartProdSearch');
}

function filterCartSearch(q){
  var el = document.getElementById('cartSearchResults');
  if(!el) return;

  var supProds = SUP_PRODS.filter(function(p){
    if(p.supplier && p.supplier!==_cartSearchSup) return false;
    if(p.hidden||!p.active) return false;
    if(!q) return true;
    return p.name.toLowerCase().indexOf(q.toLowerCase())>=0;
  });

  // Также поищем в PRODUCTS (у нужного поставщика)
  var catProds = PRODUCTS.filter(function(p){
    var hasSup = p.suppliers&&p.suppliers.some(function(s){return s.name===_cartSearchSup;});
    if(!hasSup) return false;
    if(!q) return true;
    return p.name.toLowerCase().indexOf(q.toLowerCase())>=0;
  });

  if(!supProds.length&&!catProds.length){
    el.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3);">Ничего не найдено</div>';
    return;
  }

  var html='';

  // Из SUP_PRODS
  supProds.slice(0,30).forEach(function(p){
    var price=p.pKg||p.pSh||p.pL||p.pMl||0;
    var priceLabel=price?'₽'+price.toLocaleString()+'/'+p.unit:'Цена не указана';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;'
      +'padding:10px 14px;border-bottom:1px solid var(--br);gap:12px;">'
      +'<div>'
        +'<div style="font-weight:600;font-size:13px;">'+p.name+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+p.unit+' · '+priceLabel+'</div>'
      +'</div>'
      +'<button onclick="selectCartProduct(\''+p.name.replace(/'/g,"\\'")
        +'\','+price+',\''+p.unit+'\')" '
      +'style="background:var(--ac);color:#fff;border:none;border-radius:var(--r);'
      +'padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">+ В позицию</button>'
      +'</div>';
  });

  // Из каталога
  catProds.slice(0,20).forEach(function(p){
    var sp=p.suppliers.find(function(s){return s.name===_cartSearchSup;});
    var price=sp?sp.price:0;
    var priceLabel=price?'₽'+price.toLocaleString()+'/'+p.unit:'Нет цены';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;'
      +'padding:10px 14px;border-bottom:1px solid var(--br);gap:12px;">'
      +'<div>'
        +'<div style="font-weight:600;font-size:13px;">'+p.emoji+' '+p.name+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+p.unit+' · '+priceLabel+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;">'
        +'<button onclick="selectCartProduct(\''+p.name.replace(/'/g,"\\'")
          +'\','+price+',\''+p.unit+'\')" '
        +'style="background:var(--ac);color:#fff;border:none;border-radius:var(--r);'
        +'padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">+ В позицию</button>'
        +'<button onclick="addFoundToCart('+p.id+',\''+_cartSearchSup+'\')" '
        +'style="background:var(--aD);color:var(--ac);border:1px solid var(--ac);border-radius:var(--r);'
        +'padding:6px 10px;font-size:12px;cursor:pointer;" title="Добавить новой строкой">🛒 В корзину</button>'
      +'</div>'
      +'</div>';
  });

  el.innerHTML=html||'<div style="text-align:center;padding:30px;color:var(--t3);">Нет товаров</div>';
}

function selectCartProduct(name, price, unit){
  if(_cartSearchIdx>=0 && _cartSearchIdx<cart.length){
    var prevName=cart[_cartSearchIdx].name;
    cart[_cartSearchIdx].name=name;
    cart[_cartSearchIdx].price=price;
    cart[_cartSearchIdx].unit=unit;
    cart[_cartSearchIdx].emoji='📦';
    cart[_cartSearchIdx].replacedFrom = prevName && prevName!==name ? prevName : (cart[_cartSearchIdx].replacedFrom||'');
    if(cart[_cartSearchIdx]._orderQuery && cart[_cartSearchIdx].supplier){
      _orderSetDraftEntry(cart[_cartSearchIdx]._orderQuery, cart[_cartSearchIdx].supplier, {
        name: name,
        price: price,
        unit: unit || 'кг',
        _type: cart[_cartSearchIdx]._type || 'main',
        replacedFrom: cart[_cartSearchIdx].replacedFrom || ''
      });
    }
  }
  closeModal('cartProdSearch');
  renderCart();
  flashCartUI();
  if(typeof _renderOrderTable === 'function'){
    _renderOrderTable((document.getElementById('orderTableSearch')||{value:''}).value);
  }
  toast('Товар заменён: '+name,'ok');
}

function addFoundToCart(pid, supName){
  addToCartFrom(pid, supName);
  closeModal('cartProdSearch');
}

// ══════════════════════════════════════════
// ВЫГРУЗКА ВСЕЙ КОРЗИНЫ В EXCEL (с разбивкой по поставщикам)
// ══════════════════════════════════════════



function _exportFullCartCSV(restName, date){
  var rows=['\uFEFF№,Наименование,Поставщик,Зона,Накладная,Кол-во,Ед.изм.,Цена/ед.,Сумма,Комментарий'];
  var n=1; var total=0;
  var lastGroup='';
  cart.forEach(function(item){
    var groupLabel = item.invoiceGroup==='extra' ? 'Доп. накладная' : 'Основная';
    if(groupLabel !== lastGroup){
      rows.push(groupLabel);
      lastGroup = groupLabel;
    }
    var sum=Math.round((item.price||0)*item.qty*100)/100;
    total+=sum;
    rows.push([n++,'"'+item.name+'"','"'+item.supplier+'"','"'+(item.zone||'')+'"',
               '"'+groupLabel+'"',item.qty,item.unit||'шт',
               item.price||0,sum,'"'+(item.comment||'')+'"'].join(','));
  });
  rows.push(',,,,,,,ИТОГО:,'+Math.round(total*100)/100+',');

  var blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.download='КальКа_Заказ_'+date.replace(/\./g,'-')+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('CSV скачан','ok');
}


// ══════════════════════════════════════════════════════════
// ЗАГРУЗКА ПРАЙСА ПОСТАВЩИКА (Excel / CSV)
// Колонка A: Наименование | B: Единица | C: Цена с НДС
// ══════════════════════════════════════════════════════════




// ═══ ЕДИНЫЙ ШАБЛОН ПРАЙСА ════════════════════════════════
function downloadPriceTemplate(){
  var rows=[
    'Наименование товара,Единица измерения,Цена с НДС',
    'Семга охлажденная,кг,2800',
    'Говядина мраморная,кг,3800',
    'Куриное филе,кг,380',
    'Томаты черри,кг,290',
    'Молоко 3.2%,л,90',
    'Хлеб белый,шт,45'
  ];
  var csv='\uFEFF'+rows.join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.download='price_template.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('Шаблон скачан','ok');
}
function downloadTenderTemplate(){ downloadPriceTemplate(); }
function downloadCatalogTemplate(){ downloadPriceTemplate(); }
function downloadSupTemplate(){ downloadPriceTemplate(); }

function _supPriceTemplateStorageKey(supName, orgKey){
  var supplierKey = String(supName || '').toLowerCase().trim();
  var org = _normalizeOrgKey(orgKey || getCurrentOrganizationKey(CU) || '');
  if(org) return 'pv_sup_price_templates_' + org + '_' + supplierKey;
  return 'pv_sup_price_templates_' + supplierKey;
}

function _saveSupPriceTemplate(supName, template){
  if(!supName || !template) return;
  var orgKey = _normalizeOrgKey(template.organizationId || getCurrentOrganizationKey(CU) || '');
  var key = _supPriceTemplateStorageKey(supName, orgKey);
  var next = Object.assign({}, template, {
    nameCols: Array.isArray(template.nameCols) ? template.nameCols.slice() : (template.nameCol >= 0 ? [template.nameCol] : []),
    unitCols: Array.isArray(template.unitCols) ? template.unitCols.slice() : (template.unitCol >= 0 ? [template.unitCol] : []),
    priceCols: Array.isArray(template.priceCols) ? template.priceCols.slice() : (template.priceCol >= 0 ? [template.priceCol] : []),
    price2Cols: Array.isArray(template.price2Cols) ? template.price2Cols.slice() : (template.priceCol2 >= 0 ? [template.priceCol2] : []),
    legalEntityIds: Array.isArray(template.legalEntityIds) ? template.legalEntityIds.slice() : [],
    legalEntityNames: Array.isArray(template.legalEntityNames) ? template.legalEntityNames.slice() : [],
    organizationId: orgKey,
    headerRow: typeof template.headerRow === 'number' ? template.headerRow : parseInt(template.headerRow, 10) || 0
  });
  try{
    var current = JSON.parse(localStorage.getItem(key) || 'null') || {};
    var merged = Object.assign({}, current, next, {
      supplierName: supName,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(merged));
  }catch(e){}

  try{
    var db = dbGet();
    if(!db.supplierImportTemplates || !Array.isArray(db.supplierImportTemplates)) db.supplierImportTemplates = [];
    var dbNext = Object.assign({}, next, {
      id: key,
      supplierName: supName,
      organizationId: orgKey,
      updatedAt: new Date().toISOString()
    });
    var idx = db.supplierImportTemplates.findIndex(function(item){ return item && item.id === key; });
    if(idx >= 0) db.supplierImportTemplates[idx] = dbNext;
    else db.supplierImportTemplates.push(dbNext);
    dbSet(db);
  }catch(e){}
}

function _loadSupPriceTemplate(supName){
  if(!supName) return null;
  var orgKey = _normalizeOrgKey(getCurrentOrganizationKey(CU) || '');
  try{
    var db = dbGet();
    if(db && Array.isArray(db.supplierImportTemplates)){
      var key = _supPriceTemplateStorageKey(supName, orgKey);
      var found = db.supplierImportTemplates.find(function(item){ return item && item.id === key; });
      if(!found && orgKey){
        found = db.supplierImportTemplates.find(function(item){
          return item && item.supplierName === supName && _normalizeOrgKey(item.organizationId || '') === orgKey;
        });
      }
      if(!found){
        var legacyKey = _supPriceTemplateStorageKey(supName, '');
        found = db.supplierImportTemplates.find(function(item){ return item && item.id === legacyKey; });
      }
      if(found) return {
        sheetName: found.sheetName || '',
        headerRow: parseInt(found.headerRow, 10) || 0,
        dataStartRow: parseInt(found.dataStartRow, 10) || 1,
        nameCols: Array.isArray(found.nameCols) ? found.nameCols.slice() : (found.nameCol >= 0 ? [found.nameCol] : []),
        unitCols: Array.isArray(found.unitCols) ? found.unitCols.slice() : (found.unitCol >= 0 ? [found.unitCol] : []),
        priceCols: Array.isArray(found.priceCols) ? found.priceCols.slice() : (found.priceCol >= 0 ? [found.priceCol] : []),
        price2Cols: Array.isArray(found.price2Cols) ? found.price2Cols.slice() : (found.priceCol2 >= 0 ? [found.priceCol2] : []),
        legalEntityIds: Array.isArray(found.legalEntityIds) ? found.legalEntityIds.slice() : [],
        legalEntityNames: Array.isArray(found.legalEntityNames) ? found.legalEntityNames.slice() : [],
        skipRules: found.skipRules || {},
        supplierName: found.supplierName || supName,
        organizationId: found.organizationId || orgKey
      };
    }
  }catch(e){}
  try{
    var raw = localStorage.getItem(_supPriceTemplateStorageKey(supName, orgKey)) || localStorage.getItem(_supPriceTemplateStorageKey(supName, ''));
    if(!raw) return null;
    var parsed = JSON.parse(raw);
    return {
      sheetName: parsed.sheetName || '',
      headerRow: parseInt(parsed.headerRow, 10) || 0,
      dataStartRow: parseInt(parsed.dataStartRow, 10) || 1,
      nameCols: Array.isArray(parsed.nameCols) ? parsed.nameCols.slice() : (parsed.nameCol >= 0 ? [parsed.nameCol] : []),
      unitCols: Array.isArray(parsed.unitCols) ? parsed.unitCols.slice() : (parsed.unitCol >= 0 ? [parsed.unitCol] : []),
      priceCols: Array.isArray(parsed.priceCols) ? parsed.priceCols.slice() : (parsed.priceCol >= 0 ? [parsed.priceCol] : []),
      price2Cols: Array.isArray(parsed.price2Cols) ? parsed.price2Cols.slice() : (parsed.priceCol2 >= 0 ? [parsed.priceCol2] : []),
      legalEntityIds: Array.isArray(parsed.legalEntityIds) ? parsed.legalEntityIds.slice() : [],
      legalEntityNames: Array.isArray(parsed.legalEntityNames) ? parsed.legalEntityNames.slice() : [],
      skipRules: parsed.skipRules || {},
      supplierName: parsed.supplierName || supName,
      organizationId: parsed.organizationId || orgKey
    };
  }catch(e){
    return null;
  }
}

function _buildSheetRows(rows){
  return Array.isArray(rows) ? rows.map(function(row){
    return Array.isArray(row) ? row.slice() : [];
  }) : [];
}

function _sheetToRows(book, sheetName){
  if(!book || !book.Sheets || !book.Sheets[sheetName]) return [];
  return XLSX.utils.sheet_to_json(book.Sheets[sheetName], {header:1, defval:'', raw:false, blankrows:false});
}

function _firstNonEmptySheetName(book){
  if(!book || !Array.isArray(book.SheetNames) || !book.SheetNames.length) return '';
  for(var i=0;i<book.SheetNames.length;i++){
    var name = book.SheetNames[i];
    if(name && book.Sheets && book.Sheets[name]) return name;
  }
  return book.SheetNames[0] || '';
}

function _renderPriceSheetSelect(sheetNames, selectedName){
  var sel = document.getElementById('supPriceSheetSelect');
  if(!sel) return;
  if(!Array.isArray(sheetNames) || !sheetNames.length){
    sel.innerHTML = '<option value="">Листы не найдены</option>';
    sel.value = '';
    return;
  }
  sel.innerHTML = sheetNames.map(function(name){
    return '<option value="'+_esc(name)+'"'+(name===selectedName?' selected':'')+'>'+name+'</option>';
  }).join('');
  sel.value = selectedName || sheetNames[0] || '';
}

function _setImportPreviewBadges(layout){
  var map = [
    ['previewColName',   layout && layout.nameCols && layout.nameCols.length ? 'Наименование · '+layout.nameCols.map(function(i){return i+1;}).join(', ') : 'Наименование'],
    ['previewColUnit',   layout && layout.unitCols && layout.unitCols.length ? 'Единица · '+layout.unitCols.map(function(i){return i+1;}).join(', ') : 'Единица'],
    ['previewColPrice1', layout && layout.priceCols && layout.priceCols.length ? 'Цена 1 · '+layout.priceCols.map(function(i){return i+1;}).join(', ') : 'Цена 1'],
    ['previewColPrice2', layout && layout.price2Cols && layout.price2Cols.length ? 'Цена 2 · '+layout.price2Cols.map(function(i){return i+1;}).join(', ') : 'Цена 2']
  ];
  map.forEach(function(item){
    var el = document.getElementById(item[0]);
    if(el) el.textContent = item[1];
  });
}

function _renderPriceRawPreview(rows){
  var el = document.getElementById('priceRawPreview');
  var hint = document.getElementById('pricePreviewHint');
  if(!el) return;
  if(!rows || !rows.length){
    el.innerHTML = '<div style="padding:14px;color:var(--t3);font-size:12px;">Нет данных для предпросмотра.</div>';
    if(hint) hint.textContent = 'Выбранный лист пустой или не содержит данных.';
    return;
  }
  var maxRows = rows.length;
  var maxCols = rows.reduce(function(m, r){ return Math.max(m, (r||[]).length); }, 0);
  if(maxCols < 1) maxCols = 1;
  if(hint) hint.textContent = 'Показаны все строки листа: '+rows.length+' · колонок: '+maxCols+'.';
  var html = '<div style="overflow:auto;max-height:260px;">'
    +'<table style="border-collapse:collapse;width:100%;min-width:'+(maxCols*140)+'px;font-size:11px;">'
    +'<tr style="background:var(--bg4);position:sticky;top:0;z-index:2;">'
    +'<th style="position:sticky;left:0;z-index:3;background:var(--bg4);padding:6px 8px;border:1px solid var(--br);width:52px;">#</th>';
  for(var ci=0; ci<maxCols; ci++){
    html += '<th style="padding:6px 8px;border:1px solid var(--br);text-align:center;background:var(--bg4);min-width:120px;">Колонка '+String.fromCharCode(65+ci)+'</th>';
  }
  html += '</tr>';
  for(var ri=0; ri<maxRows; ri++){
    var row = rows[ri] || [];
    html += '<tr>';
    html += '<td style="position:sticky;left:0;background:var(--bg3);padding:6px 8px;border:1px solid var(--br);color:var(--t3);">'+(ri+1)+'</td>';
    for(var cj=0; cj<maxCols; cj++){
      var val = row[cj] !== undefined && row[cj] !== null ? String(row[cj]) : '';
      html += '<td style="padding:6px 8px;border:1px solid var(--br);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">'+_esc(val)+'</td>';
    }
    html += '</tr>';
  }
  html += '</table></div>';
  el.innerHTML = html;
}

function _bindPricePreviewActions(){
  var confirmBtn = document.getElementById('priceConfirmBtn');
  var changeBtn  = document.getElementById('priceChangeColsBtn');
  var methodBadge= document.getElementById('priceMethodBadge');
  if(confirmBtn){
    confirmBtn.onclick = function(){ applyManualColumnMapAndSave(); };
  }
  if(changeBtn){
    changeBtn.onclick = function(){ openSupPriceManualMap(); };
  }
  if(methodBadge && _mcmLayout && _mcmLayout.method){
    methodBadge.textContent = _mcmLayout.method;
  }
}

function _updatePricePreviewSectionFromRows(rows, sheetName, fileName){
  _supPriceImportRows = _buildSheetRows(rows);
  _supPriceImportSheetName = sheetName || '';
  _supPriceImportFileName = fileName || '';
  var sec = document.getElementById('pricePreviewSection');
  if(sec) sec.style.display = 'block';
  _renderPriceRawPreview(_supPriceImportRows);
}

function saveCurrentSupPriceTemplate(){
  syncMcmRolesFromPreview();
  if(!_mcmLayout || !_mcmLayout.nameCols || !_mcmLayout.nameCols.length || !_mcmLayout.priceCols || !_mcmLayout.priceCols.length){
    var err = document.getElementById('mcm-err');
    if(err) err.textContent = 'Сначала назначьте обязательные колонки: наименование и цена.';
    return;
  }
  _saveSupPriceTemplate(_currentSupName, {
    sheetName: _supPriceImportSheetName || '',
    headerRow: Math.max(0, (_mcmLayout.headerRow >= 0 ? _mcmLayout.headerRow : 0)),
    dataStartRow: Math.max(1, (parseInt((document.getElementById('mcm-start-row')||{value:'1'}).value, 10) || 1)),
    nameCols: (_mcmLayout.nameCols||[]).slice(),
    unitCols: (_mcmLayout.unitCols||[]).slice(),
    priceCols: (_mcmLayout.priceCols||[]).slice(),
    price2Cols: (_mcmLayout.price2Cols||[]).slice(),
    skipRules: {
      dropEmpty: true,
      dropMeta: true,
      requirePrice: true
    }
  });
  toast('Шаблон импорта сохранён','ok');
}

function prepareSupPriceImportPreview(){
  var errEl = document.getElementById('supPriceErr');
  if(errEl) errEl.textContent = '';
  var fi = document.getElementById('supPriceFile');
  if(!fi || !fi.files || !fi.files[0]) return;
  var file = fi.files[0];
  _supPriceImportFileName = file.name || '';
  var ext = file.name.split('.').pop().toLowerCase();
  var isExcel = ext==='xlsx' || ext==='xls';
  var isCsv = ext==='csv' || ext==='txt';
  if(!isExcel && !isCsv){
    if(errEl) errEl.textContent = 'Файл не поддерживается';
    return;
  }

  function openWithRows(book, sheetNames, rows, selectedName){
    _supPriceImportBook = book || null;
    _supPriceImportSheets = sheetNames || [];
    _supPriceImportSheetName = selectedName || '';
    _renderPriceSheetSelect(_supPriceImportSheets, _supPriceImportSheetName);
    _updatePricePreviewSectionFromRows(rows, _supPriceImportSheetName, file.name);
    showManualColumnMap(rows, _currentSupName, _supPriceAppend, (document.getElementById('supPriceName')||{value:''}).value.trim() || (_supPriceAppend?'Дополнительный прайс':'Основной прайс'), {headerRow:0,nameCol:-1,unitCol:-1,priceCol:-1,priceCol2:-1,method:'manual',confidence:0});
    _bindPricePreviewActions();
  }

  if(isExcel){
    if(typeof XLSX === 'undefined'){
      if(errEl) errEl.textContent = 'SheetJS не загружен';
      return;
    }
    var r = new FileReader();
    r.onload = function(ev){
      try{
        var wb = XLSX.read(new Uint8Array(ev.target.result), {type:'array'});
        var firstSheet = _firstNonEmptySheetName(wb);
        var rows = firstSheet ? _sheetToRows(wb, firstSheet) : [];
        openWithRows(wb, wb.SheetNames.slice(), rows, firstSheet);
      } catch(e){
        if(errEl) errEl.textContent = 'Ошибка Excel: '+e.message;
      }
    };
    r.readAsArrayBuffer(file);
    return;
  }

  var r2 = new FileReader();
  r2.onload = function(ev){
    var rows = String(ev.target.result || '').split(/\r?\n/).filter(function(l){ return l.trim(); }).map(function(line){
      return line.split(/[,;\t]/);
    });
    openWithRows({SheetNames:['Лист1'], Sheets:{'Лист1':{}}}, ['Лист1'], rows, 'Лист1');
  };
  r2.readAsText(file, 'utf-8');
}

function selectSupPriceSheet(sheetName){
  if(!sheetName || !_supPriceImportBook) return;
  _supPriceImportSheetName = sheetName;
  var rows = _sheetToRows(_supPriceImportBook, sheetName);
  _updatePricePreviewSectionFromRows(rows, sheetName, _supPriceImportFileName);
  showManualColumnMap(rows, _currentSupName, _supPriceAppend, (document.getElementById('supPriceName')||{value:''}).value.trim() || (_supPriceAppend?'Дополнительный прайс':'Основной прайс'), {headerRow:0,nameCol:-1,unitCol:-1,priceCol:-1,priceCol2:-1,method:'manual',confidence:0});
  _bindPricePreviewActions();
}

// ═══ ЗАГРУЗКА ПРАЙСА ПОСТАВЩИКА ══════════════════════════
function openSupPriceUpload(supName, append){
  _currentSupName = supName;
  _supPriceAppend = append;
  _supplierImportResetState();
  _supPriceImportState.organizationId = getPriceImportOrganizationKey(CU);
  openModal('supPriceUpload');
  var titleEl = document.getElementById('supPriceUploadTitle');
  if(titleEl) titleEl.textContent = append ? 'Доп. прайс: '+supName : 'Новый прайс: '+supName;
  var nameEl = document.getElementById('supPriceSupName');
  if(nameEl) nameEl.textContent = supName;
  var priceNameEl = document.getElementById('supPriceName');
  if(priceNameEl) priceNameEl.value = '';
  var legalOptions = getPriceImportLegalOptions();
  var listEl = document.getElementById('supPriceCompList');
  if(listEl){
    var selectedHint = '<div style="font-size:11px;color:var(--t3);margin-bottom:8px;">Выберите одно или несколько юр. лиц для этого прайса.</div>';
    listEl.innerHTML = legalOptions.length ? legalOptions.map(function(opt){
      return '<label style="display:flex;align-items:center;gap:10px;padding:6px 4px;cursor:pointer;">'
        +'<input type="checkbox" class="sup-price-legal-cb" value="'+opt.id+'" data-name="'+opt.name.replace(/"/g,'&quot;')+'" data-org="'+opt.orgKey+'" checked '
        +'style="width:16px;height:16px;cursor:pointer;accent-color:var(--ac);">'
        +'<div><div style="font-size:13px;font-weight:600;">'+opt.name+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+(opt.orgName||'Организация')+' · '+opt.id+'</div></div></label>';
    }).join('') : '<div style="color:var(--t3);padding:8px;font-size:12px;">Нет доступных юр. лиц</div>';
    listEl.insertAdjacentHTML('afterbegin', selectedHint);
    var tpl = _loadSupPriceTemplate(supName);
    if(tpl && Array.isArray(tpl.legalEntityIds) && tpl.legalEntityIds.length){
      listEl.querySelectorAll('.sup-price-legal-cb').forEach(function(cb){
        cb.checked = tpl.legalEntityIds.indexOf(cb.value) >= 0;
      });
    }
  }
  _supplierImportCaptureLegalState();
  var fi=document.getElementById('supPriceFile'); if(fi)fi.value='';
  var err=document.getElementById('supPriceErr'); if(err)err.textContent='';
  _supPriceImportBook = null;
  _supPriceImportSheetName = '';
  _supPriceImportRows = [];
  _supPriceImportFileName = '';
  _supPriceImportSheets = [];
  _supPriceImportTemplateKey = '';
  _renderPriceSheetSelect([], '');
  _renderPriceRawPreview([]);
  var sec = document.getElementById('pricePreviewSection');
  if(sec) sec.style.display = 'none';
}

function selectAllSupPriceComps(val){
  selectAllSupPriceLegals(val);
}


function canSeePrices(product){
  if(!CU)return false;
  if(CU.role==='owner'||CU.role==='admin'||CU.role==='supplier')return true;
  if(product && product.priceListActive === false) return false;

  var scope = _getCurrentPriceScope();
  var prodOrg = _normalizeOrgKey(product && (product.organizationId || product.organization_id || product.organization || ''));
  if(prodOrg && scope.organizationId && prodOrg !== scope.organizationId && !isOwnerUser(CU) && CU.role !== 'admin'){
    return false;
  }
  var prodLegalIds = _uniqList(product && (product.legalEntityIds || product.legal_entity_ids || product.legalEntities || []));
  if(prodLegalIds.length){
    var contextIds = _uniqList(scope.legalEntityIds);
    if(contextIds.length){
      var legalMatch = prodLegalIds.some(function(id){ return contextIds.indexOf(id) >= 0; });
      if(!legalMatch) return false;
    }
  }

  if(product.allowedUserIds&&product.allowedUserIds.length>0){
    if(product.allowedUserIds.indexOf(CU.id)>=0)return true;
  }
  if(product.allowedCompanies&&product.allowedCompanies.length>0){
    if(product.allowedCompanies.indexOf(CU.company)>=0)return true;
  }
  if((!product.allowedUserIds||!product.allowedUserIds.length)&&
     (!product.allowedCompanies||!product.allowedCompanies.length))return true;
  return false;
}

// ═══ УМНЫЙ ПОИСК ═════════════════════════════════════════


function _parseSmartLine(line){
  line=String(line||'').replace(/\s+/g,' ').trim();
  if(!line) return null;
  var qty=1,unit='кг',name=line;
  var unitPat=Object.keys(UNIT_ALIASES)
    .sort(function(a,b){return b.length-a.length;})
    .map(function(token){ return token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); })
    .join('|');
  var re1=new RegExp('(^|\\s)([\\d]+(?:[.,][\\d]+)?)\\s*('+unitPat+')(?=[\\s.,;:]|$)','ig');
  var match,lastMatch=null;
  while((match=re1.exec(line))!==null){
    lastMatch=match;
  }
  if(lastMatch){
    qty=parseFloat(String(lastMatch[2]||'').replace(',','.'))||1;
    unit=UNIT_ALIASES[String(lastMatch[3]||'').toLowerCase()]||String(lastMatch[3]||'').toLowerCase();
    var start=lastMatch.index+(lastMatch[1] ? lastMatch[1].length : 0);
    var end=start+String(lastMatch[2]||'').length+String(lastMatch[3]||'').length;
    var rawSlice=line.slice(start);
    var fullMatchLength=rawSlice.match(/^([\d]+(?:[.,][\d]+)?)\s*([^\s]+)/);
    if(fullMatchLength) end=start+fullMatchLength[0].length;
    name=(line.slice(0,start)+' '+line.slice(end))
      .replace(/\s+/g,' ')
      .trim()
      .replace(/^[-—,.;:]+|[-—,.;:]+$/g,'')
      .trim();
  } else {
    var m2=line.match(/\s+([\d]+(?:[.,]\d+)?)\s*$/);
    if(m2){
      qty=parseFloat(m2[1].replace(',','.'))||1;
      name=line.replace(m2[0],'').trim();
    }
  }
  if(!name)return null;
  return{name:name,qty:qty,unit:unit};
}

function _normalizeOrderRequestQty(qty, fromUnit, targetUnit){
  var amount=parseFloat(qty);
  if(!isFinite(amount) || amount<=0) amount=1;
  var from=(fromUnit||'').toLowerCase().trim();
  var to=(targetUnit||'').toLowerCase().trim();
  if(!from || !to || from===to) return Math.round(amount*1000)/1000;

  var weight={ 'г':1, 'кг':1000 };
  var volume={ 'мл':1, 'л':1000 };
  if(weight[from] && weight[to]){
    return Math.round((amount*weight[from]/weight[to])*1000)/1000;
  }
  if(volume[from] && volume[to]){
    return Math.round((amount*volume[from]/volume[to])*1000)/1000;
  }
  return Math.round(amount*1000)/1000;
}

function _findProductMatch(sName){
  var sLow=sName.toLowerCase().trim();
  var sWords=sLow.split(/\s+/).filter(function(w){return w.length>1;});
  var ex=PRODUCTS.find(function(p){return p.name.toLowerCase()===sLow;});
  if(ex)return{prod:ex,score:100};
  var st=PRODUCTS.find(function(p){return p.name.toLowerCase().startsWith(sLow);});
  if(st)return{prod:st,score:90};
  var aw=PRODUCTS.filter(function(p){
    var pl=p.name.toLowerCase();
    return sWords.length>0&&sWords.every(function(w){return pl.includes(w);});
  });
  if(aw.length===1)return{prod:aw[0],score:80};
  if(aw.length>1){aw.sort(function(a,b){return a.name.length-b.name.length;});return{prod:aw[0],score:75};}
  if(sWords[0]&&sWords[0].length>=3){
    var fw=PRODUCTS.find(function(p){return p.name.toLowerCase().includes(sWords[0]);});
    if(fw)return{prod:fw,score:60};
  }
  var sp=SUP_PRODS.find(function(p){
    var pl=p.name.toLowerCase();
    return pl===sLow||pl.startsWith(sLow)||(sWords.length>0&&sWords.every(function(w){return pl.includes(w);}));
  });
  if(sp)return{supProd:sp,score:55};
  return null;
}

function smartAddToCart(){
  var inp=document.getElementById('smartInput');
  var resultEl=document.getElementById('smartResult');
  var previewEl=document.getElementById('smartPreview');
  var previewList=document.getElementById('smartPreviewList');
  if(!inp)return;
  var raw=inp.value.trim();
  if(!raw){toast('Введите список товаров','err');return;}
  var lines=raw.split(/\n/).map(function(l){return l.trim();}).filter(Boolean);
  var parsed=[],notFound=[],added=0;
  lines.forEach(function(line){
    var subLines=[line];
    if(!/\d\s*(?:кг|г|шт|л|мл|пачка|бут|уп)/i.test(line)){
      subLines=line.split(',').map(function(l){return l.trim();}).filter(Boolean);
    }
    subLines.forEach(function(sl){
      var item=_parseSmartLine(sl);if(!item)return;
      var match=_findProductMatch(item.name);
      if(!match){notFound.push(item.name);parsed.push({raw:sl,name:item.name,qty:item.qty,unit:item.unit,found:false});return;}
      var prod=match.prod||match.supProd;
      var supName='',price=0;
      if(match.prod){
        var sups=match.prod.suppliers||[];
        var cheapest=sups.reduce(function(best,s){return(!best||s.price<best.price)?s:best;},null);
        supName=cheapest?cheapest.name:(ALL_SUPS[0]||'—');
        price=cheapest?cheapest.price:0;
      } else if(match.supProd){
        supName=match.supProd.supplier||match.supProd._supplier||(ALL_SUPS[0]||'—');
        price=match.supProd.pKg||match.supProd.pSh||match.supProd.pL||0;
      }
      var ei=cart.findIndex(function(c){return c.name.toLowerCase()===prod.name.toLowerCase()&&c.supplier===supName;});
      if(ei>=0)cart[ei].qty+=item.qty;
      else cart.push({pid:prod.id||Date.now(),name:prod.name,emoji:prod.emoji||'',
        supplier:supName,price:price,qty:item.qty,unit:item.unit,comment:''});
      parsed.push({raw:sl,name:prod.name,qty:item.qty,unit:item.unit,found:true,supplier:supName,price:price});
      added++;
    });
  });
  if(added>0){updBdg();renderCart();}
  if(resultEl){
    resultEl.innerHTML=added>0
      ?'<span style="color:var(--gr);">Добавлено: '+added+'</span>'+(notFound.length?' <span style="color:var(--rd);">Не найдено: '+notFound.join(', ')+'</span>':'')
      :'<span style="color:var(--rd);">Ничего не найдено: '+notFound.join(', ')+'</span>';
  }
  if(previewList&&previewEl){
    previewList.innerHTML=parsed.map(function(p){
      return '<div style="display:flex;align-items:center;gap:10px;padding:7px 12px;border-bottom:1px solid var(--br);">'
        +'<span style="font-size:11px;font-weight:700;color:'+(p.found?'var(--gr)':'var(--rd)')+';">'+(p.found?'OK':'?')+'</span>'
        +'<div style="flex:1;"><div style="font-size:13px;font-weight:600;">'+(p.found?p.name:p.name+' — не найден')+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+(p.found?p.supplier+' · '+p.qty+' '+p.unit+(p.price?' · '+p.price.toLocaleString()+' руб.':''):p.raw)+'</div></div></div>';
    }).join('');
    previewEl.style.display=parsed.length?'block':'none';
  }
  if(added>0){inp.value='';toast('Добавлено '+added+' позиций','ok');}
}
function quickSearch(v){var i=document.getElementById('smartInput');if(i&&v)i.value+=(i.value?'\n':'')+v;}
function quickAddToCart(){smartAddToCart();}
function quickSelect(){}



// ═══════════════════════════════════════════════════════════════
// СЛОВАРЬ СИНОНИМОВ ТОВАРОВ
// ═══════════════════════════════════════════════════════════════




function deleteSupPrice(supName) {
  if(!confirm('Удалить все прайсы поставщика «'+supName+'»?'))return;
  var before=SUP_PRODS.length;
  var scope = _getCurrentPriceScope();
  var orgKey = _normalizeOrgKey(scope.organizationId || getPriceImportOrganizationKey(CU));
  var legalIds = _uniqList(scope.legalEntityIds || []);
  var legalNames = _uniqList(scope.legalEntityNames || []);
  var removedPriceListIds = (SUP_PRICE_LISTS || []).filter(function(list){
    if(String(list.supplierName || '').toLowerCase() !== String(supName || '').toLowerCase()) return false;
    var listOrg = _normalizeOrgKey(list.organizationId || '');
    var listLegalIds = _uniqList(list.legalEntityIds || []);
    var listLegalNames = _uniqList(list.legalEntityNames || []);
    var orgMatch = !listOrg || listOrg === orgKey;
    var legalMatch = !legalIds.length
      || !listLegalIds.length && !listLegalNames.length
      || listLegalIds.some(function(id){ return legalIds.indexOf(id) >= 0; })
      || listLegalNames.some(function(name){ return legalNames.indexOf(name) >= 0; });
    return orgMatch || legalMatch;
  }).map(function(list){ return list.id; });
  SUP_PRODS=SUP_PRODS.filter(function(p){
    return !(p._supplier===supName||p.supplier===supName);
  });
  SUP_PRICE_ITEMS = (SUP_PRICE_ITEMS || []).filter(function(item){
    return removedPriceListIds.indexOf(item.priceListId) < 0;
  });
  SUP_PRICE_LIST_LEGALS = (SUP_PRICE_LIST_LEGALS || []).filter(function(row){
    return removedPriceListIds.indexOf(row.priceListId) < 0;
  });
  SUP_PRICE_LISTS = (SUP_PRICE_LISTS || []).filter(function(list){
    if(String(list.supplierName || '').toLowerCase() !== String(supName || '').toLowerCase()) return true;
    var listOrg = _normalizeOrgKey(list.organizationId || '');
    var listLegalIds = _uniqList(list.legalEntityIds || []);
    var listLegalNames = _uniqList(list.legalEntityNames || []);
    var orgMatch = !listOrg || listOrg === orgKey;
    var legalMatch = !legalIds.length
      || !listLegalIds.length && !listLegalNames.length
      || listLegalIds.some(function(id){ return legalIds.indexOf(id) >= 0; })
      || listLegalNames.some(function(name){ return legalNames.indexOf(name) >= 0; });
    return !(orgMatch || legalMatch);
  });
  // Убрать поставщика из каталога
  PRODUCTS.forEach(function(p){
    p.suppliers=p.suppliers.filter(function(s){return s.name!==supName;});
  });
  var removed=before-SUP_PRODS.length;
  savePriceData();
  renderSupProducts();
  renderSuppliers();
  if(typeof renderCatalog==='function')renderCatalog();
  toast('Удалено '+removed+' позиций прайса «'+supName+'»','ok');
  logAudit(CU?CU.first+' '+CU.last:'','Удалён прайс «'+supName+'»','Прайсы');
}

// ═══════════════════════════════════════════════════════════════
// СОЗДАНИЕ ТЕНДЕРА
// ═══════════════════════════════════════════════════════════════
var _tenderRestName='';
var _tenderRestId='';
var _tenderLegalEntityNames=[];
var _tenderSelectedSups=[];
var _tenderAllRows=[];
var _tenderRequestLines=[];








function exportSupCart(si){
  var supName=_supOrder[si];
  if(!supName){toast('Поставщик не найден','err');return;}
  var items=cart.filter(function(x){return x.supplier===supName;});
  if(!items.length){toast('Корзина поставщика пуста','err');return;}
  var total=items.reduce(function(s,x){return s+(x.price||0)*x.qty;},0);
  var restName=_tenderRestName||(activeRest&&activeRest.name)||'Не указан';
  var date=new Date().toLocaleDateString('ru',{day:'2-digit',month:'2-digit',year:'numeric'});
  var comment=cartComments[supName]||'';

  if(typeof XLSX!=='undefined'){
    var wb=XLSX.utils.book_new();
    var data=[];
    data.push(['ЗАКАЗ ПОСТАВЩИКУ']);
    data.push([]);
    getOrderHeaderRows(restName, date, supName, comment).forEach(function(row){ data.push(row); });
    data.push([]);
    data.push(['№','Наименование','Ед. изм.','Зона','Накладная','Кол-во','Цена за ед. (руб.)','Сумма (руб.)','Комментарий']);
    items.forEach(function(item,i){
      data.push([i+1,item.name,item.unit||'шт',item.zone||'',item.invoiceGroup==='extra'?'Доп. накладная':'Основная',item.qty,item.price||0,
        Math.round((item.price||0)*item.qty*100)/100,item.comment||'']);
    });
    data.push([]);
    data.push(['','','','','','ИТОГО:',Math.round(total*100)/100,'','']);
    if(CU)data.push(['','','','','','Заказ сделал:',CU.first+' '+CU.last,'','']);

    var ws=XLSX.utils.aoa_to_sheet(data);
    ws['!cols']=[{wch:4},{wch:35},{wch:10},{wch:16},{wch:18},{wch:10},{wch:18},{wch:16},{wch:25}];
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}}];
    XLSX.utils.book_append_sheet(wb,ws,'Заказ');
    var fn='Заказ_'+supName.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g,'_')+'_'+date.replace(/\./g,'-')+'.xlsx';
    XLSX.writeFile(wb,fn);
    toast('Excel скачан: '+fn,'ok');
	  } else {
	    // CSV
	    var rows=['ЗАКАЗ ПОСТАВЩИКУ','','Ресторан: '+restName,'Поставщик: '+supName,'Дата: '+date];
	    if(comment)rows.push('Комментарий: '+comment);
	    rows.push('','№,Наименование,Ед.,Зона,Накладная,Кол-во,Цена,Сумма');
	    items.forEach(function(it,i){
	      rows.push([i+1,'"'+it.name+'"',it.unit||'шт','"'+(it.zone||'')+'"','"'+(it.invoiceGroup==='extra'?'Доп. накладная':'Основная')+'"',it.qty,it.price,
	        Math.round((it.price||0)*it.qty*100)/100].join(','));
	    });
	    rows.push(',,,,, ИТОГО:,'+Math.round(total*100)/100);
	    var blob=new Blob(['\uFEFF'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
	    var url=URL.createObjectURL(blob);
	    var a=document.createElement('a');a.href=url;
	    a.download='Заказ_'+supName.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g,'_')+'.csv';
    a.click();URL.revokeObjectURL(url);
    toast('CSV скачан','ok');
  }
}

// exportFullCart — с названием ресторана
function _exportFullCartXLSX(){
  var restName=_tenderRestName||(activeRest&&activeRest.name)||'Не указан';
  var date=new Date().toLocaleDateString('ru',{day:'2-digit',month:'2-digit',year:'numeric'});
  var wb=XLSX.utils.book_new();

  // Лист 1 — Сводный
  var summaryData=[['СВОДНЫЙ ЗАКАЗ']];
  getOrderHeaderRows(restName, date, '', '').forEach(function(row){ summaryData.push(row); });
  summaryData.push([]);
  summaryData.push(['Поставщик','Наименование','Зона','Накладная','Ед.','Кол-во','Цена','Сумма']);
  var grandTotal=0;
  _supOrder.forEach(function(supName){
    var items=cart.filter(function(x){return x.supplier===supName;});
    var supTotal=0;
    var lastGroup='';
    items.forEach(function(it){
      var groupLabel = it.invoiceGroup==='extra' ? 'Доп. накладная' : 'Основная';
      if(groupLabel !== lastGroup){
        if(lastGroup) summaryData.push([]);
        summaryData.push([groupLabel]);
        lastGroup = groupLabel;
      }
      var sum=Math.round((it.price||0)*it.qty*100)/100;
      summaryData.push([supName,it.name,it.zone||'',groupLabel,it.unit||'',it.qty,it.price||0,sum]);
      supTotal+=sum;
    });
    summaryData.push(['','','','','','ИТОГО '+supName+':',Math.round(supTotal*100)/100]);
    summaryData.push([]);
    grandTotal+=supTotal;
  });
  summaryData.push(['','','','','','ИТОГО ВСЕ:',Math.round(grandTotal*100)/100]);

  var ws1=XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols']=[{wch:22},{wch:30},{wch:16},{wch:18},{wch:8},{wch:10},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws1,'Сводный заказ');

  // Листы по поставщикам
  _supOrder.forEach(function(supName){
    var items=cart.filter(function(x){return x.supplier===supName;});
    if(!items.length)return;
    var total=items.reduce(function(s,x){return s+(x.price||0)*x.qty;},0);
    var data=[['ЗАКАЗ: '+supName]];
    getOrderHeaderRows(restName, date, supName, cartComments[supName]||'').forEach(function(row){ data.push(row); });
    data.push([]);
    data.push(['№','Наименование','Ед.','Зона','Накладная','Кол-во','Цена','Сумма','Комментарий']);
    var lastGroup='';
    items.forEach(function(it,i){
      var groupLabel = it.invoiceGroup==='extra' ? 'Доп. накладная' : 'Основная';
      if(groupLabel !== lastGroup){
        if(lastGroup) data.push([]);
        data.push([groupLabel]);
        lastGroup = groupLabel;
      }
      data.push([i+1,it.name,it.unit||'',it.zone||'',groupLabel,it.qty,it.price||0,
        Math.round((it.price||0)*it.qty*100)/100,it.comment||'']);
    });
	    data.push([]);
	    data.push(['','','','','','ИТОГО:',Math.round(total*100)/100,'','']);
	    var ws=XLSX.utils.aoa_to_sheet(data);
	    ws['!cols']=[{wch:4},{wch:30},{wch:8},{wch:16},{wch:18},{wch:10},{wch:12},{wch:12},{wch:20}];
	    var shName=supName.replace(/[^а-яёА-ЯЁa-zA-Z0-9\s]/g,'').substring(0,31);
	    XLSX.utils.book_append_sheet(wb,ws,shName||'Поставщик');
  });

  var fn='Корзина_'+restName.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g,'_')+'_'+date.replace(/\./g,'-')+'.xlsx';
  XLSX.writeFile(wb,fn);
  toast('Excel скачан: '+fn,'ok');
}

function exportFullCart(){
  if(!cart.length){toast('Корзина пуста','err');return;}
  if(typeof XLSX!=='undefined'){_exportFullCartXLSX();}
  else{
    var restName=_tenderRestName||(activeRest&&activeRest.name)||'Не указан';
    var date=new Date().toLocaleDateString('ru');
    var rows=['СВОДНЫЙ ЗАКАЗ','Ресторан: '+restName,'Дата: '+date,'',
      'Поставщик,Наименование,Зона,Накладная,Ед.,Кол-во,Цена,Сумма'];
    cart.forEach(function(it){
      rows.push([it.supplier,'"'+it.name+'"','"'+(it.zone||'')+'"','"'+(it.invoiceGroup==='extra'?'Доп. накладная':'Основная')+'"',it.unit,it.qty,it.price,
        Math.round((it.price||0)*it.qty*100)/100].join(','));
    });
    var blob=new Blob(['\uFEFF'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download='Корзина_'+date+'.csv';
    a.click();URL.revokeObjectURL(url);
    toast('CSV скачан','ok');
  }
}



// ═══════════════════════════════════════════════════════════════
// ТЕНДЕР — состояние
// ═══════════════════════════════════════════════════════════════
var _tenderActive   = false;      // есть ли активный тендер
var _tenderRows     = [];         // [{name, unitMap:{sup:unit}, priceMap:{sup:price}, hiddenSups:{sup:bool}}]
var _tspRowName     = '';         // поиск: для какого товара
var _tspSupName     = '';         // поиск: в прайсе какого поставщика

function renderTenderLegalList(restId){
  var listEl=document.getElementById('ct-legal-list');
  var hintEl=document.getElementById('ct-legal-hint');
  if(!listEl) return;
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  var legalEntities=getRestLegalEntities(rest);
  if(hintEl){
    hintEl.textContent=rest
      ? 'Выберите юр. лицо для тендера. Можно выбрать несколько.'
      : 'Сначала выберите организацию.';
  }
  if(!rest){
    listEl.innerHTML='<div style="color:var(--t3);font-size:12px;">Организация не выбрана.</div>';
    return;
  }
  if(!legalEntities.length){
    listEl.innerHTML='<div style="color:var(--rd);font-size:12px;">У этой организации не настроены юр. лица.</div>';
    return;
  }
  if(legalEntities.length===1 && !_tenderLegalEntityNames.length) _tenderLegalEntityNames=[legalEntities[0]];
  listEl.innerHTML=legalEntities.map(function(name){
    var checked=_tenderLegalEntityNames.indexOf(name)>=0;
    return '<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 6px;cursor:pointer;border-radius:6px;" onmouseover="this.style.background=\'var(--bg4)\'" onmouseout="this.style.background=\'\'">'
      +'<input type="checkbox" class="ct-legal-cb" value="'+name.replace(/"/g,'&quot;')+'"'+(checked?' checked':'')+' style="width:15px;height:15px;cursor:pointer;accent-color:var(--ac);margin-top:2px;">'
      +'<div><div style="font-size:13px;font-weight:600;">'+name+'</div><div style="font-size:11px;color:var(--t3);">Доступно для выбранной организации</div></div>'
      +'</label>';
  }).join('');
}

function getTenderScopedSuppliers(restId){
  var db=dbGet();
  return getUserVisibleSuppliers(CU).filter(function(supplier){
    if(!restId) return false;
    var orgIds=normalizeSupplierOrganizationIds(supplier, db);
    return orgIds.indexOf(String(restId))>=0;
  });
}

function _renderTenderSupList(filter){
  var listEl=document.getElementById('ct-sups-list');
  if(!listEl) return;
  var q=(filter||'').toLowerCase().trim();
  var sups=getTenderScopedSuppliers(_tenderRestId).filter(function(s){
    return !q || s.name.toLowerCase().includes(q) || String(s.type||'').toLowerCase().includes(q);
  });
  listEl.innerHTML=sups.length ? sups.map(function(s){
    var checked=_tenderSelectedSups.indexOf(s.name)>=0;
    return '<label style="display:flex;align-items:center;gap:10px;padding:8px 6px;cursor:pointer;border-radius:6px;"'
      +' onmouseover="this.style.background=\'var(--bg4)\'" onmouseout="this.style.background=\'\'">'
      +'<input type="checkbox" class="ct-sup-cb" value="'+s.name+'"'+(checked?' checked':'')+' style="width:16px;height:16px;cursor:pointer;accent-color:var(--ac);">'
      +'<div><div style="font-size:13px;font-weight:600;">'+s.name+'</div>'
      +'<div style="font-size:11px;color:var(--t3);">'+(s.type||'Поставщик')+'</div></div></label>';
  }).join('')
  : '<div style="color:var(--t3);padding:16px;font-size:13px;text-align:center;">'
    +(_tenderRestId
      ? 'Для выбранной организации пока нет поставщиков.<br>Добавьте их в разделе «Поставщики».'
      : 'Сначала выберите организацию.')
    +'</div>';
}

function filterTenderSupList(val){ _renderTenderSupList(val); }

function _getTenderVisibleProducts(selectedSups){
  var sups=selectedSups||_tenderSelectedSups||[];
  return (SUP_PRODS||[]).filter(function(p){
    var supName=p._supplier||p.supplier||'';
    if(!supName || sups.indexOf(supName)<0) return false;
    return canSeePrices(p);
  });
}

function _buildTenderRowsFromCatalog(selectedSups){
  var products={};
  _getTenderVisibleProducts(selectedSups).forEach(function(p){
    var supName=p._supplier||p.supplier||'';
    var price=p.pKg||p.pSh||p.pL||p.pMl||0;
    if(!price || !supName) return;
    var canonical=_tenderCanonical(p.name);
    if(!products[canonical]){
      products[canonical]={name:canonical,requestName:canonical,requestLine:canonical,requestQty:1,requestUnit:p.unit||'кг',unitMap:{},priceMap:{},supNames:{},hiddenSups:{}};
    }
    if(!products[canonical].priceMap[supName] || price < products[canonical].priceMap[supName]){
      products[canonical].priceMap[supName]=price;
      products[canonical].unitMap[supName]=p.unit||'кг';
      products[canonical].supNames[supName]=p.name;
    }
  });
  return Object.values(products).sort(function(a,b){
    return String(a.name||'').localeCompare(String(b.name||''),'ru');
  });
}

function _buildTenderRowsFromLines(lines, selectedSups){
  var cleanLines=(lines||[]).map(function(line){ return String(line||'').trim(); }).filter(Boolean);
  return cleanLines.map(function(line){
    var parsed=_parseSmartLine(line)||{name:line,qty:1,unit:'кг'};
    var keyword=_extractKeyword(parsed.name);
    var row={
      name:parsed.name,
      requestName:parsed.name,
      requestLine:line,
      requestQty:parsed.qty,
      requestUnit:parsed.unit,
      keyword:keyword,
      unitMap:{},
      priceMap:{},
      supNames:{},
      hiddenSups:{}
    };
    selectedSups.forEach(function(sup){
      var found=_findBestForSupplier(keyword, sup);
      if(!found || !found.item) return;
      var item=found.item;
      var price=found.price || item.pKg || item.pSh || item.pL || item.pMl || 0;
      if(!price) return;
      row.priceMap[sup]=price;
      row.unitMap[sup]=item.unit||'кг';
      row.supNames[sup]=item.name||parsed.name;
    });
    return row;
  }).sort(function(a,b){
    return String(a.requestName||a.name||'').localeCompare(String(b.requestName||b.name||''),'ru');
  });
}

function _applyTenderRows(rows){
  _tenderRows=(rows||[]).slice();
  renderTenderTable();
}

// ─────────────────────────────────────────────────────────────
// openCreateTender — открыть модал создания тендера
// ─────────────────────────────────────────────────────────────
function openCreateTender(){
  var db = dbGet();
  _tenderSelectedSups=[];
  _tenderLegalEntityNames=[];
  var restSel=document.getElementById('ct-rest');
  if(restSel){
    var allowedRestIds=getUserScopedRestaurantIds(CU, db);
    var rests=(db.restaurants||[]).filter(function(r){
      if(r.id==='r0') return false;
      if(CU && CU.role==='owner') return true;
      return allowedRestIds.indexOf(r.id)>=0;
    });
    restSel.innerHTML='<option value="">— выберите организацию —</option>'
      +rests.map(function(r){ return '<option value="'+r.id+'">'+(r.emoji||'🍽️')+' '+r.name+'</option>'; }).join('');
    if(activeRest && activeRest.id && activeRest.id!=='r0') restSel.value=activeRest.id;
    _tenderRestId=restSel.value||'';
    restSel.onchange=function(){
      _tenderRestId=this.value||'';
      _tenderLegalEntityNames=[];
      _tenderSelectedSups=[];
      renderTenderLegalList(_tenderRestId);
      _renderTenderSupList('');
    };
  }
  renderTenderLegalList(_tenderRestId);
  _renderTenderSupList('');
  var supSearch=document.getElementById('ct-sup-search');
  if(supSearch) supSearch.value='';
  var bulkInput=document.getElementById('ct-search-input');
  if(bulkInput) bulkInput.value='';
  var err = document.getElementById('ct-err');
  if(err) err.textContent = '';
  openModal('createTender');
}

function selectAllTenderSups(val){
  document.querySelectorAll('.ct-sup-cb').forEach(function(cb){cb.checked=val;});
}

// ─────────────────────────────────────────────────────────────
// submitCreateTender — собрать тендерные строки
// ─────────────────────────────────────────────────────────────
function submitCreateTender(){
  var restSel = document.getElementById('ct-rest');
  var restId = restSel ? restSel.value : '';
  var err = document.getElementById('ct-err');
  if(!restId){if(err)err.textContent='Выберите организацию';return;}
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  var restName=rest ? rest.name : '';
  var legalSelections=[];
  document.querySelectorAll('.ct-legal-cb:checked').forEach(function(cb){ legalSelections.push(cb.value); });
  if(!legalSelections.length){if(err)err.textContent='Выберите хотя бы одно юр. лицо';return;}

  var selectedSups = [];
  document.querySelectorAll('.ct-sup-cb:checked').forEach(function(cb){
    selectedSups.push(cb.value);
  });
  if(!selectedSups.length){if(err)err.textContent='Выберите хотя бы одного поставщика';return;}

  var rawSearch=(document.getElementById('ct-search-input')||{value:''}).value||'';
  var lines=rawSearch.split(/\n/).map(function(line){ return line.trim(); }).filter(Boolean);

  _tenderRestId        = restId;
  _tenderRestName      = restName;
  _tenderLegalEntityNames = legalSelections.slice();
  _tenderSelectedSups  = selectedSups;
  _tenderActive        = true;
  _tenderRequestLines = lines.slice();
  _tenderAllRows = _buildTenderRowsFromCatalog(selectedSups);
  _tenderRows = lines.length ? _buildTenderRowsFromLines(lines, selectedSups) : _tenderAllRows.slice();

  closeModal('createTender');
  var tenderInput=document.getElementById('tenderSearchInput');
  if(tenderInput){
    tenderInput.value=rawSearch;
    autoResizeTA(tenderInput);
  }
  renderTenderTable();
  toast('Тендер создан: «'+restName+'» — '+selectedSups.length+' поставщиков, '+_tenderRows.length+' позиций','ok');
}

// Каноническое имя через синонимы
function _tenderCanonical(name){
  var nl = name.toLowerCase().trim();
  if(typeof PRODUCT_SYNONYMS !== 'undefined'){
    for(var i=0;i<PRODUCT_SYNONYMS.length;i++){
      var grp = PRODUCT_SYNONYMS[i];
      for(var j=0;j<grp.length;j++){
        if(nl===grp[j]||nl.includes(grp[j])||grp[j].includes(nl)){
          return grp[0]; // первый в группе — каноническое имя
        }
      }
    }
  }
  return name.trim();
}

// ─────────────────────────────────────────────────────────────
// renderTenderTable — отрисовать тендерную таблицу по ТЗ
// ─────────────────────────────────────────────────────────────
function renderTenderTable(){
  // Показать/скрыть секции
  var emptyEl   = document.getElementById('tenderEmpty');
  var tableEl   = document.getElementById('tenderTableSection');
  var cartEl    = document.getElementById('tenderCartSection');
  var btnExport = document.getElementById('btnExportTender');
  var btnCart   = document.getElementById('btnExportCart');
  var btnClear  = document.getElementById('btnClearTender');

  if(!_tenderActive){
    if(emptyEl)  emptyEl.style.display  = 'block';
    if(tableEl)  tableEl.style.display  = 'none';
    if(cartEl)   cartEl.style.display   = 'none';
    if(btnExport)btnExport.style.display= 'none';
    if(btnCart)  btnCart.style.display  = 'none';
    if(btnClear) btnClear.style.display = 'none';
    return;
  }

  if(emptyEl)  emptyEl.style.display  = 'none';
  if(tableEl)  tableEl.style.display  = 'block';
  if(btnExport)btnExport.style.display= '';
  if(btnClear) btnClear.style.display = '';

  // Заголовок
  var restEl = document.getElementById('tenderRestName');
  if(restEl) restEl.textContent = _tenderRestName;
  var supsEl = document.getElementById('tenderSupsList');
  if(supsEl){
    var metaParts=[];
    if(_tenderLegalEntityNames.length) metaParts.push('Юр. лицо: '+_tenderLegalEntityNames.join(' · '));
    if(_tenderSelectedSups.length) metaParts.push('Поставщики: '+_tenderSelectedSups.join(' · '));
    supsEl.textContent = metaParts.join(' • ');
  }
  var subTitle = document.getElementById('tenderSubTitle');
  if(subTitle) subTitle.textContent = _tenderRows.length+' позиций · '+_tenderSelectedSups.length+' поставщиков · '+_tenderRestName;

  var sups = _tenderSelectedSups;

  // THEAD
  var thead = document.getElementById('tenderTableHead');
  if(thead){
    thead.innerHTML = '<tr style="background:var(--bg3);">'
      +'<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;'
        +'border:1px solid var(--br);min-width:180px;position:sticky;left:0;'
        +'background:var(--bg3);z-index:2;">Наименование</th>'
      +sups.map(function(s){
        return '<th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:700;'
          +'border:1px solid var(--br);min-width:160px;background:var(--bg3);">'+s+'</th>';
      }).join('')
      +'</tr>';
  }

  // TBODY
  var tbody = document.getElementById('tenderTableBody');
  if(!tbody) return;

  if(!_tenderRows.length){
    tbody.innerHTML='<tr><td colspan="'+(sups.length+1)+'" style="text-align:center;'
      +'color:var(--t3);padding:40px;">Нет товаров в прайсах выбранных поставщиков</td></tr>';
    return;
  }

  tbody.innerHTML = _tenderRows.map(function(row, ri){
    // Ячейки поставщиков
    var cells = sups.map(function(sup){
      if(row.hiddenSups && row.hiddenSups[sup]){
        return '<td style="border:1px solid var(--br);padding:6px;background:var(--bg);">'
          +'<div style="text-align:center;">'
          +'<button onclick="tenderShowSup(\''+_esc(row.name)+'\',\''+_esc(sup)+'\')"'
          +' style="font-size:10px;color:var(--t4);background:none;border:none;cursor:pointer;padding:4px;">показать</button>'
          +'</div></td>';
      }
      var price = row.priceMap[sup];
      var unit  = row.unitMap[sup]  || '—';
      var supOwn= row.supNames[sup] || '';

      if(!price){
        // Нет предложения от этого поставщика
        return '<td style="border:1px solid var(--br);padding:6px;background:var(--bg);">'
          +'<div style="text-align:center;color:var(--t4);font-size:11px;padding:20px 4px;">—</div>'
          +'</td>';
      }

      // Определить минимальную цену по строке с учётом текущей замены
      var displayPrices = sups.map(function(s){
        var displayItem = _orderDisplayEntry(row.name, s, {
          item: {name: row.name, unit: unit},
          price: row.priceMap[s] || 0
        });
        return displayItem ? parseFloat(displayItem.price) || 0 : 0;
      }).filter(Boolean);
      var minP = displayPrices.length ? Math.min.apply(null, displayPrices) : 0;
      var isBest = displayPrices.length > 1 && parseFloat(price) === minP;

      var cardBg   = isBest ? 'var(--grD)' : 'var(--bg3)';
      var priceCl  = isBest ? 'var(--gr)'  : 'var(--ac)';
      var borderCl = isBest ? 'var(--gr)'  : 'var(--br)';

      return '<td style="border:1px solid var(--br);padding:6px;vertical-align:top;">'
        +'<div style="background:'+cardBg+';border:1px solid '+borderCl+';border-radius:var(--r);'
          +'padding:8px 10px;min-height:80px;display:flex;flex-direction:column;gap:6px;position:relative;">'

          // Название у поставщика (мелко)
          +(supOwn && supOwn !== row.name
            ? '<div style="font-size:10px;color:var(--t3);line-height:1.3;">'+supOwn+'</div>'
            : '')

          // Цена и единица
          +'<div style="display:flex;align-items:baseline;gap:4px;">'
            +'<span style="font-size:16px;font-weight:800;color:'+priceCl+';">₽'+price.toLocaleString()+'</span>'
            +'<span style="font-size:11px;color:var(--t3);">/ '+unit+'</span>'
          +'</div>'

          // Кнопки
          +'<div style="display:flex;gap:4px;margin-top:auto;">'
            // Лупа — поиск в прайсе
            +'<button onclick="openTenderSearch(\''+_esc(row.name)+'\',\''+_esc(sup)+'\')"'
              +' title="Поиск в прайсе '+sup+'"'
              +' style="flex:1;background:var(--bg2);border:1px solid var(--br);border-radius:var(--r);'
                +'padding:5px;font-size:12px;cursor:pointer;color:var(--t2);">🔍</button>'
            // В корзину
            +'<button onclick="addTenderToCart(\''+_esc(row.name)+'\',\''+_esc(sup)+'\','+price+',\''+_esc(unit)+'\')"'
              +' title="Перейти к заказу с этой позицией"'
              +' style="flex:2;background:var(--aD);border:1px solid var(--ac);border-radius:var(--r);'
                +'padding:5px 8px;font-size:11px;cursor:pointer;color:var(--ac);font-weight:700;">В заказ</button>'
            // Скрыть
            +'<button onclick="tenderHideSup(\''+_esc(row.name)+'\',\''+_esc(sup)+'\')"'
              +' title="Скрыть предложение"'
              +' style="background:var(--bg2);border:1px solid var(--br);border-radius:var(--r);'
                +'padding:5px 7px;font-size:11px;cursor:pointer;color:var(--t3);">✕</button>'
          +'</div>'

          // Пометка «Выгоднее»
          +(isBest ? '<div style="position:absolute;top:-1px;right:-1px;background:var(--gr);color:#fff;'
            +'font-size:9px;font-weight:700;padding:2px 6px;border-radius:0 var(--r) 0 var(--r);">лучшая</div>' : '')

        +'</div>'
        +'</td>';
    }).join('');

    return '<tr id="trow-'+ri+'" data-name="'+_esc(row.name)+'">'
      +'<td style="border:1px solid var(--br);padding:10px 14px;font-size:13px;font-weight:600;'
        +'vertical-align:middle;position:sticky;left:0;background:var(--bg2);z-index:1;">'
        +'<div>'+row.name+'</div>'
        +(row.requestQty && row.requestUnit
          ? '<div style="font-size:10px;color:var(--t3);margin-top:4px;">Нужно: '+row.requestQty+' '+row.requestUnit+'</div>'
          : '')
      +'</td>'
      +cells
      +'</tr>';
  }).join('');

  // Обновить корзину
  renderCart();
}

// Вспомогательная функция экранирования для onclick
function _esc(s){
  return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

// ─────────────────────────────────────────────────────────────
// Действия с карточками
// ─────────────────────────────────────────────────────────────

// Добавить в корзину вручную
function addTenderToCart(productName, supName, price, unit){
  _pendingOrderTemplate={
    restId:_tenderRestId,
    restName:_tenderRestName,
    templateId:'tender-'+Date.now(),
    templateName:'Из тендера',
    items:[{name:productName}],
    supplierNames:[supName]
  };
  goPage('order');
  openCreateOrder({restId:_tenderRestId,supplierNames:[supName]});
  toast('Товар передан в создание заказа','ok');
}
function removeFromTenderCart(productName, supName){
  cart = cart.filter(function(c){return !(c.name===productName && c.supplier===supName);});
  updBdg();
  renderTenderTable();
  _updateTenderCartBadge();
}

// Скрыть предложение поставщика
function tenderHideSup(productName, supName){
  var row = _tenderRows.find(function(r){return r.name===productName;});
  if(row){
    if(!row.hiddenSups) row.hiddenSups = {};
    row.hiddenSups[supName] = true;
    renderTenderTable();
  }
}

// Показать скрытое предложение
function tenderShowSup(productName, supName){
  var row = _tenderRows.find(function(r){return r.name===productName;});
  if(row && row.hiddenSups) delete row.hiddenSups[supName];
  renderTenderTable();
}

// Значок корзины в шапке тендера
function _updateTenderCartBadge(){
  var badge = document.getElementById('tenderCartBadge');
  var btnGo = document.getElementById('btnGoCart');
  var cartSec = document.getElementById('tenderCartSection');
  var btnExportCart = document.getElementById('btnExportCart');

  if(cart.length > 0){
    var total = cart.reduce(function(s,c){return s+(c.price||0)*c.qty;},0);
    if(badge) badge.textContent = cart.length+' поз. в корзине · ₽'+total.toLocaleString();
    if(btnGo) btnGo.style.display = '';
    if(cartSec) cartSec.style.display = 'block';
    if(btnExportCart) btnExportCart.style.display = '';
  } else {
    if(badge) badge.textContent = '';
    if(btnGo) btnGo.style.display = 'none';
    if(cartSec) cartSec.style.display = 'none';
    if(btnExportCart) btnExportCart.style.display = 'none';
  }
}

function scrollToCart(){
  var el = document.getElementById('tenderCartSection');
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

// ─────────────────────────────────────────────────────────────
// Фильтрация таблицы
// ─────────────────────────────────────────────────────────────
function filterTenderTable(val){
  var rows = document.querySelectorAll('#tenderTableBody tr[data-name]');
  var q = (val||'').toLowerCase().trim();
  rows.forEach(function(tr){
    var name = (tr.dataset.name||'').toLowerCase();
    tr.style.display = (!q || name.includes(q)) ? '' : 'none';
  });
}

function tenderSearchMulti(val){
  var clearBtn=document.getElementById('tenderSearchClear');
  var quickFilter=document.getElementById('tenderSearch');
  var infoEl=document.getElementById('tenderSmartResult');
  if(clearBtn) clearBtn.style.display=val&&val.trim() ? '' : 'none';
  if(!_tenderActive) return;
  if(quickFilter) quickFilter.value='';

  if(!val || !val.trim()){
    _tenderRequestLines=[];
    _applyTenderRows(_tenderAllRows);
    if(infoEl) infoEl.textContent='Показан весь доступный ассортимент выбранных поставщиков.';
    return;
  }

  var lines=val.split(/\n/).map(function(line){ return line.trim(); }).filter(Boolean);
  _tenderRequestLines=lines.slice();
  var rows=_buildTenderRowsFromLines(lines, _tenderSelectedSups);
  _applyTenderRows(rows);

  var found=rows.filter(function(row){
    return _tenderSelectedSups.some(function(sup){ return !!row.priceMap[sup]; });
  }).length;
  var missing=rows.filter(function(row){
    return !_tenderSelectedSups.some(function(sup){ return !!row.priceMap[sup]; });
  }).length;
  if(infoEl){
    infoEl.textContent=found+' из '+lines.length+' позиций найдены'
      +(missing ? ' · не найдены: '+missing : '');
  }
}

function tenderSearchRunAll(){
  var inp=document.getElementById('tenderSearchInput');
  if(inp) tenderSearchMulti(inp.value);
}

function tenderSearchClear(){
  var inp=document.getElementById('tenderSearchInput');
  if(inp){ inp.value=''; inp.style.height='120px'; }
  var infoEl=document.getElementById('tenderSmartResult');
  if(infoEl) infoEl.textContent='';
  tenderSearchMulti('');
}

// ─────────────────────────────────────────────────────────────
// Поиск в прайсе поставщика (по клику на лупу)
// ─────────────────────────────────────────────────────────────
function openTenderSearch(productName, supName){
  _tspRowName = productName;
  _tspSupName = supName;

  var lbl = document.getElementById('tsp-sup-label');
  if(lbl) lbl.textContent = 'Поиск замены для «'+productName+'» в прайсе «'+supName+'»';

  var inp = document.getElementById('tsp-input');
  if(inp){ inp.value = ''; inp.focus(); }

  tspFilter('');

  var panel = document.getElementById('tenderSearchPanel');
  if(panel){ panel.style.display = 'flex'; }
}

function closeTenderSearch(){
  var panel = document.getElementById('tenderSearchPanel');
  if(panel) panel.style.display = 'none';
}

function tspFilter(val){
  var el = document.getElementById('tsp-results');
  if(!el) return;

  var q = (val||'').toLowerCase().trim();
  var sup = _tspSupName;

  // Найти все товары этого поставщика
  var items = _getTenderVisibleProducts([sup]).filter(function(p){
    return (p._supplier===sup||p.supplier===sup)
      && (!q || p.name.toLowerCase().includes(q));
  }).slice(0,50);

  if(!items.length){
    el.innerHTML = '<div style="text-align:center;color:var(--t3);padding:30px;font-size:13px;">'
      +(q ? 'Ничего не найдено по «'+val+'»' : 'Прайс пуст')+'</div>';
    return;
  }

  el.innerHTML = items.map(function(p){
    var price = p.pKg||p.pSh||p.pL||p.pMl||0;
    var isReplacement = p.name!==_tspRowName;
    return '<div style="display:flex;align-items:center;justify-content:space-between;'
      +'padding:10px 18px;border-bottom:1px solid var(--br);gap:12px;">'
      +'<div style="flex:1;">'
        +'<div style="font-size:13px;font-weight:600;">'+p.name+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+p.unit
          +(price?' · <b style="color:var(--ac);">₽'+price.toLocaleString()+'</b>':'')+'</div>'
      +'</div>'
      +'<button onclick="tspSelect(\''+_esc(p.name)+'\','+price+',\''+_esc(p.unit)+'\')"'
        +' style="background:var(--ac);color:#fff;border:none;border-radius:var(--r);'
        +'padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">'
        +(isReplacement ? 'Выбрать' : 'Оставить')
        +'</button>'
    +'</div>';
  }).join('');
}

// Выбрать товар из поиска
function tspSelect(itemName, price, unit){
  // Тендер изолирован — только показываем информацию
  closeTenderSearch();
  var row = _tenderRows.find(function(r){return r.name===_tspRowName;});
  if(row){
    row.priceMap[_tspSupName]  = price;
    row.unitMap[_tspSupName]   = unit;
    row.supNames[_tspSupName]  = itemName;
  }
  renderTenderTable();
  toast('Предложение обновлено в тендере','ok');
}
function clearTender(){
  if(!confirm('Сбросить тендер и очистить корзину?')) return;
  _tenderActive = false;
  _tenderRows   = [];
  _tenderAllRows = [];
  _tenderRequestLines = [];
  _tenderRestId = '';
  _tenderRestName = '';
  _tenderLegalEntityNames = [];
  _tenderSelectedSups = [];
  cart = [];
  cartComments = {};
  var tenderInput=document.getElementById('tenderSearchInput');
  if(tenderInput){ tenderInput.value=''; tenderInput.style.height='120px'; }
  var tenderInfo=document.getElementById('tenderSmartResult');
  if(tenderInfo) tenderInfo.textContent='';
  updBdg();
  renderTenderTable();
  renderCart();
}

// ─────────────────────────────────────────────────────────────
// Переопределить renderCart чтобы показывать в tenderCartSection
// ─────────────────────────────────────────────────────────────
function renderCart(){
  // Показать/скрыть секцию корзины в заказе
  var cartSec   = document.getElementById('orderCartSection');
  var exportBtn = document.getElementById('orderExportBtn');
  var chkBtn    = document.getElementById('orderCheckoutBtn');
  var undoBtn   = document.getElementById('undoBtnOrder');
  if(cartSec)   cartSec.style.display   = cart.length ? 'block' : 'none';
  if(exportBtn) exportBtn.style.display = cart.length ? '' : 'none';
  if(chkBtn)    chkBtn.disabled         = !cart.length;
  if(undoBtn)   undoBtn.style.display   = _deletedItems.length ? '' : 'none';

  var el = document.getElementById('cartBySup');
  if(!el) return;

  _updateTenderCartBadge();

  var coBtn  = document.getElementById('coAllBtn');
  var coBtn2 = document.getElementById('coAllBtn2');
  var total  = cart.reduce(function(s,x){return s+(x.price||0)*x.qty;},0);
  var txt    = document.getElementById('cartSummaryText');
  if(txt) txt.textContent = '';
  if(coBtn)  coBtn.disabled  = !cart.length;
  if(coBtn2) coBtn2.disabled = !cart.length;

  if(!cart.length){
    el.innerHTML = '';
    return;
  }

  // Группировка по поставщикам
  var bySup = {};
  cart.forEach(function(item, i){
    if(!bySup[item.supplier]) bySup[item.supplier] = {items:[], total:0};
    bySup[item.supplier].items.push(Object.assign({},item,{idx:i}));
    bySup[item.supplier].total += (item.price||0)*item.qty;
  });
  _supOrder = Object.keys(bySup);
  var restMeta=getActiveRestMeta();
  var restZones=restMeta&&Array.isArray(restMeta.zones)&&restMeta.zones.length?restMeta.zones.filter(Boolean):['Основная зона'];

  var supTotals = _supOrder.map(function(sn){return bySup[sn].total;});
  var minTotal  = Math.min.apply(null, supTotals);
  var avgTotal  = supTotals.reduce(function(a,b){return a+b;},0)/(supTotals.length||1);
  var grandTotal= supTotals.reduce(function(a,b){return a+b;},0);

  var html = _supOrder.map(function(supName, si){
    var sg = bySup[supName];
    var supInfo = SUPS_DATA.find(function(s){return s.name===supName;})||{};
    var isCheapest = sg.total===minTotal && _supOrder.length>1;
    var ruleStatus=supplierRuleStatus(supName, sg.total);
    var ruleBadge=ruleStatus.blocked
      ? '<span style="font-size:10px;background:var(--rd);color:#fff;border-radius:4px;padding:1px 6px;margin-left:6px;">стоп</span>'
      : (ruleStatus.priority
        ? '<span style="font-size:10px;background:var(--ac);color:#fff;border-radius:4px;padding:1px 6px;margin-left:6px;">приоритет</span>'
        : '');
    var ruleNote=ruleStatus.blocked
      ? 'Поставщик заблокирован правилами заведения'
      : (!ruleStatus.minOrderMet && ruleStatus.minOrderAmount
        ? 'Не достигнут минимальный заказ: ₽'+ruleStatus.minOrderAmount.toLocaleString()
        : (ruleStatus.deadline ? 'Дедлайн: '+ruleStatus.deadline : ''));
    var checkoutDisabled=ruleStatus.blocked || !ruleStatus.minOrderMet;
    var checkoutLabel=ruleStatus.blocked ? 'Стоп' : (!ruleStatus.minOrderMet ? 'Мин. сумма' : 'Оформить');

    var tableRows = sg.items.map(function(item){
      var sum = Math.round((item.price||0)*item.qty*100)/100;
      var zoneOptions=restZones.map(function(zone){
        return '<option value="'+zone.replace(/"/g,'&quot;')+'"'+((item.zone||restZones[0])===zone?' selected':'')+'>'+zone+'</option>';
      }).join('');
      return '<tr>'
        // Наименование
        +'<td style="padding:8px 12px;font-weight:600;font-size:13px;">'
          +item.emoji+' '+item.name
          +(item.replacedFrom
            ? '<div style="font-size:10px;color:var(--or);font-weight:800;margin-top:3px;line-height:1.35;">'
              +'было: '+item.replacedFrom+'<br>стало: '+item.name
              +'</div>'
            : '')
          +(item.comment?'<div style="font-size:10px;color:var(--t3);margin-top:2px;">'+item.comment+'</div>':'')
        +'</td>'
        // Кол-во
        +'<td style="padding:6px 10px;">'
          +'<div style="display:flex;align-items:center;border:1px solid var(--br);border-radius:6px;overflow:hidden;width:88px;">'
          +'<button onclick="adjCQ('+item.idx+',-1)" style="width:24px;height:30px;background:var(--bg3);border:none;color:var(--tx);cursor:pointer;font-size:14px;">−</button>'
          +'<input type="number" value="'+item.qty+'" min="0.1" step="0.1"'
            +' onchange="cart['+item.idx+'].qty=Math.max(0.1,parseFloat(this.value)||0.1);renderCart();"'
            +' style="width:40px;height:30px;background:none;border:none;text-align:center;font-size:12px;font-weight:700;color:var(--tx);outline:none;">'
          +'<button onclick="adjCQ('+item.idx+',1)" style="width:24px;height:30px;background:var(--bg3);border:none;color:var(--tx);cursor:pointer;font-size:14px;">+</button>'
          +'</div>'
        +'</td>'
        // Единица
        +'<td style="padding:6px 8px;">'
          +'<select onchange="cart['+item.idx+'].unit=this.value;renderCart();"'
            +' style="background:var(--bg3);border:1px solid var(--br);border-radius:6px;padding:4px 6px;font-size:12px;color:var(--tx);outline:none;">'
          +['кг','г','шт','л','мл','пачка','бут.'].map(function(u){
            return '<option'+(u===item.unit?' selected':'')+'>'+u+'</option>';
          }).join('')
          +'</select>'
        +'</td>'
        // Цена
        +'<td style="padding:6px 10px;text-align:right;font-weight:600;font-size:13px;">₽'+(item.price||0).toLocaleString()+'</td>'
        // Сумма
        +'<td style="padding:6px 10px;text-align:right;font-weight:800;font-size:14px;color:var(--ac);">₽'+sum.toLocaleString()+'</td>'
        // Комментарий
        +'<td style="padding:6px 8px;">'
          +'<input type="text" value="'+(item.comment||'')+'" placeholder="Комментарий..."'
            +' onchange="cart['+item.idx+'].comment=this.value;renderCart();"'
            +' style="width:130px;background:var(--bg3);border:1px solid var(--br);border-radius:5px;'
              +'padding:4px 7px;font-size:11px;color:var(--tx);outline:none;">'
        +'</td>'
        +'<td style="padding:6px 8px;">'
          +'<select onchange="cart['+item.idx+'].zone=this.value;renderCart();" style="background:var(--bg3);border:1px solid var(--br);border-radius:6px;padding:4px 6px;font-size:11px;color:var(--tx);outline:none;min-width:95px;">'
          +zoneOptions
          +'</select>'
        +'</td>'
        +'<td style="padding:6px 8px;text-align:center;">'
          +'<button onclick="cart['+item.idx+'].invoiceGroup=(cart['+item.idx+'].invoiceGroup===\'extra\'?\'main\':\'extra\');renderCart();" style="background:'+(item.invoiceGroup==='extra'?'var(--orD)':'var(--bg3)')+';color:'+(item.invoiceGroup==='extra'?'var(--or)':'var(--t2)')+';border:1px solid '+(item.invoiceGroup==='extra'?'var(--or)':'var(--br)')+';border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;white-space:nowrap;">'+(item.invoiceGroup==='extra'?'Доп. накладная':'Основная')+'</button>'
        +'</td>'
        // Удалить
        +'<td style="padding:6px 8px;">'
          +'<button onclick="rmC('+item.idx+')" style="background:var(--rdD);color:var(--rd);'
            +'border:1px solid var(--rd);border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;">✕</button>'
        +'</td>'
        +'</tr>';
    }).join('');

    return '<div style="background:var(--bg2);border:1px solid '+(isCheapest?'var(--gr)':'var(--br)')+';'
      +'border-radius:var(--r2);overflow:hidden;margin-bottom:14px;">'
      // Шапка поставщика
      +'<div style="display:flex;align-items:center;justify-content:space-between;'
        +'padding:10px 16px;background:var(--bg3);border-bottom:1px solid var(--br);flex-wrap:wrap;gap:8px;">'
        +'<div>'
          +'<div style="font-weight:800;font-size:15px;">'
            +supName
            +(isCheapest?'<span style="font-size:10px;background:var(--gr);color:#fff;border-radius:4px;padding:1px 6px;margin-left:6px;">Выгоднее</span>':'')
            +ruleBadge
          +'</div>'
          +'<div style="font-size:11px;color:var(--t3);margin-top:2px;">'
            +sg.items.length+' позиций · Итого: <b style="color:var(--ac);">₽'+sg.total.toLocaleString()+'</b>'
            +(supInfo.min?' · Мин. заказ: '+supInfo.min:'')
          +'</div>'
          +(ruleNote?'<div style="font-size:11px;color:'+(checkoutDisabled?'var(--rd)':'var(--t3)')+';margin-top:4px;">'+ruleNote+'</div>':'')
        +'</div>'
        +'<div style="display:flex;gap:6px;">'
          +'<button onclick="exportSupCart('+si+')" style="background:var(--grD);color:var(--gr);border:1px solid var(--gr);border-radius:var(--r);padding:6px 12px;font-size:12px;cursor:pointer;">Excel</button>'
          +'<button onclick="_checkoutIdx('+si+')" '+(checkoutDisabled?'disabled ':'')+'style="background:'+(checkoutDisabled?'var(--bg4)':'var(--ac)')+';color:'+(checkoutDisabled?'var(--t3)':'#fff')+';border:'+(checkoutDisabled?'1px solid var(--br)':'none')+';border-radius:var(--r);padding:6px 14px;font-weight:800;font-size:12px;cursor:'+(checkoutDisabled?'not-allowed':'pointer')+';">'+checkoutLabel+'</button>'
          +'<button onclick="_clearSupIdx('+si+')" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:var(--r);padding:6px 10px;font-size:12px;cursor:pointer;" title="Очистить">🗑</button>'
        +'</div>'
      +'</div>'
      // Таблица
      +'<div style="overflow-x:auto;">'
        +'<table style="width:100%;border-collapse:collapse;">'
          +'<thead><tr style="background:var(--bg4);font-size:11px;color:var(--t3);text-transform:uppercase;">'
            +'<th style="padding:7px 12px;text-align:left;">Наименование</th>'
            +'<th style="padding:7px 10px;text-align:center;">Кол-во</th>'
            +'<th style="padding:7px 10px;text-align:center;">Ед.</th>'
            +'<th style="padding:7px 10px;text-align:right;">Цена</th>'
            +'<th style="padding:7px 10px;text-align:right;">Сумма</th>'
            +'<th style="padding:7px 10px;text-align:center;">Комментарий</th>'
            +'<th style="padding:7px 10px;text-align:center;">Зона</th>'
            +'<th style="padding:7px 10px;text-align:center;">Накладная</th>'
            +'<th style="padding:7px 8px;"></th>'
          +'</tr></thead>'
          +'<tbody>'+tableRows+'</tbody>'
        +'</table>'
      +'</div>'
      // Комментарий к поставщику
      +'<div style="padding:8px 16px 12px;">'
        +'<div style="font-size:11px;color:var(--t3);margin-bottom:4px;">Общий комментарий для '+supName+':</div>'
        +'<textarea id="sc'+si+'" rows="2" placeholder="Условия доставки, время, пожелания..."'
          +' style="width:100%;background:var(--bg3);border:1px solid var(--br);border-radius:var(--r);'
          +'padding:7px 10px;color:var(--tx);font-size:12px;resize:vertical;outline:none;box-sizing:border-box;"'
          +' oninput="_saveComment('+si+',this.value)">'+(cartComments[supName]||'')+'</textarea>'
      +'</div>'
    +'</div>';
  }).join('');

  // Итоги внизу
  html += '<div style="background:var(--bg2);border:1px solid var(--br);border-radius:var(--r2);padding:14px 16px;margin-top:4px;">'
    +'<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;">'
    +'<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end;">'
    +'<div><div style="font-size:11px;color:var(--t3);">Поставщиков</div><div style="font-size:20px;font-weight:800;">'+_supOrder.length+'</div></div>'
    +'<div><div style="font-size:11px;color:var(--t3);">Мин. по поставщику</div><div style="font-size:20px;font-weight:800;color:var(--gr);">₽'+minTotal.toLocaleString()+'</div></div>'
    +'<div><div style="font-size:11px;color:var(--t3);">Средний</div><div style="font-size:20px;font-weight:800;color:var(--ac);">₽'+Math.round(avgTotal).toLocaleString()+'</div></div>'
    +'<div style="text-align:right;min-width:240px;">'
      +'<div style="font-size:12px;color:var(--t3);">Итоговая информация</div>'
      +'<div style="font-size:20px;font-weight:900;color:var(--tx);">Итог по корзине: '+cart.length+' позиций</div>'
      +'<div style="font-size:26px;font-weight:900;color:var(--gr);line-height:1.1;">₽'+grandTotal.toLocaleString()+'</div>'
    +'</div>'
    +'</div>'
    +'<button onclick="exportFullCart()" style="background:var(--gr);color:#fff;border:none;border-radius:var(--r);padding:10px 18px;font-weight:800;font-size:13px;cursor:pointer;align-self:flex-end;">Excel — вся корзина</button>'
    +'</div>'
  +'</div>';

  el.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// Экспорт тендерной таблицы
// ─────────────────────────────────────────────────────────────
function exportTenderTable(){
  if(!_tenderActive){toast('Сначала создайте тендер','err');return;}
  if(typeof XLSX==='undefined'){toast('SheetJS не загружен','err');return;}

  var sups = _tenderSelectedSups;
  var date = new Date().toLocaleDateString('ru',{day:'2-digit',month:'2-digit',year:'numeric'});
  var wb = XLSX.utils.book_new();
  var data = [];
  data.push(['ТЕНДЕР']);
  data.push(['Организация:', _tenderRestName]);
  data.push(['Юр. лицо:', _tenderLegalEntityNames.join(', ')||'—']);
  data.push(['Дата:', date]);
  data.push(['Поставщики:', sups.join(', ')]);
  data.push([]);
  // Заголовки
  data.push(['Наименование'].concat(sups.map(function(s){return s+' (цена)';})).concat(['Лучшая цена','Поставщик']));
  // Строки
  _tenderRows.forEach(function(row){
    var prices = sups.map(function(s){return row.priceMap[s]||'';});
    var valid  = prices.filter(Boolean);
    var minP   = valid.length ? Math.min.apply(null,valid) : '';
    var bestSup= minP ? sups.find(function(s){return row.priceMap[s]===minP;})||'' : '';
    data.push([row.name].concat(prices).concat([minP,bestSup]));
  });
  var ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:30}].concat(sups.map(function(){return {wch:14};})).concat([{wch:14},{wch:22}]);
  XLSX.utils.book_append_sheet(wb,ws,'Тендер');
  var fn = 'Тендер_'+_tenderRestName.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g,'_')+'_'+date.replace(/\./g,'-')+'.xlsx';
  XLSX.writeFile(wb,fn);
  toast('Excel скачан: '+fn,'ok');
}



function clearCart(){cart=[];cartComments={};_supOrder=[];updBdg();}

// ═══════════════════════════════════════════════════════════════
// ЗАКАЗ И КОРЗИНА — поиск товаров
// ═══════════════════════════════════════════════════════════════

var _orderMode = 'search'; // 'search' | 'bulk'


function orderAdd(pid, name, emoji, supplier, price){
  // Получить кол-во и единицу из полей
  var qtyEl  = document.getElementById('oqty-'+pid+'-'+supplier);
  var unitEl = document.getElementById('ounit-'+pid+'-'+supplier);
  var qty    = qtyEl  ? (parseFloat(qtyEl.value)||1)  : 1;
  var unit   = unitEl ? unitEl.value : 'кг';

  var ei = cart.findIndex(function(c){return c.name===name && c.supplier===supplier;});
  if(ei >= 0){
    cart[ei].qty += qty;
  } else {
    cart.push({pid:pid||Date.now(), name:name, emoji:emoji||'',
      supplier:supplier, price:price, qty:qty, unit:unit, comment:''});
  }
  updBdg();
  renderCart();
  flashCartUI();
  // Перерисовать результаты (кнопка → «В корзине»)
  var inp = document.getElementById('orderSearchInput');
  if(inp && inp.value) orderSearch(inp.value);
  toast('«'+name+'» → '+supplier+' добавлен','ok');
}

function orderRemove(name, supplier, query){
  cart = cart.filter(function(c){
    if(query){
      return !((c._orderQuery||'')===query && c.supplier===supplier);
    }
    return !(c.name===name && c.supplier===supplier);
  });
  var rowNode = document.querySelector('[data-order-row="'+_cssAttrVal(query)+'"][data-order-sup="'+_cssAttrVal(supplier)+'"]');
  if(rowNode){
    rowNode.classList.remove('order-in-cart');
    rowNode.classList.remove('order-in-cart-locked');
    rowNode.style.background = '';
    rowNode.style.borderColor = '';
  }
  updBdg();
  renderCart();
  if(typeof _renderOrderTable === 'function'){
    _renderOrderTable((document.getElementById('orderTableSearch')||{value:''}).value);
  }
  var inp = document.getElementById('orderSearchInput');
  if(inp && inp.value) orderSearch(inp.value);
}




// ═══ МНОГОСТРОЧНЫЙ ПОИСК ТОВАРОВ ═════════════════════════════



function detectStructure(rows) {
  // Возвращает {headerRow, nameCol, unitCol, priceCol, confidence, method}

  var known = _detectFreshMillLayout(rows);
  if(known) {
    known.method = 'fresh_mill_layout';
    return known;
  }
  
  // 1. Поиск строки заголовков
  var result = _findHeaderRow(rows);
  if(result.headerRow >= 0 && result.nameCol >= 0 && result.priceCol >= 0) {
    result.method = 'header_match';
    return result;
  }
  
  // 2. Эвристический анализ данных (нет явных заголовков)
  result = _heuristicAnalysis(rows);
  if(result.nameCol >= 0 && result.priceCol >= 0) {
    result.method = 'heuristic';
    return result;
  }
  
  // 3. Вернуть лучшее что есть (частичное)
  result.method = 'partial';
  return result;
}

function _detectFreshMillLayout(rows) {
  if(!rows || !rows.length) return null;
  for(var ri=0; ri<Math.min(rows.length, 20); ri++){
    var row = rows[ri] || [];
    var text = row.map(function(c){ return (c||'').toString().trim().toLowerCase(); });
    var hasName = text.some(function(v){ return v === 'наименование товара' || v.indexOf('наименование товара') >= 0; });
    var hasPrice = text.some(function(v){ return v.indexOf('цена товара') >= 0 || v.indexOf('цена') >= 0; });
    if(hasName && hasPrice) {
      // Для этого формата реальные товарные строки идут ниже:
      // B = название, H = цена, I = единица.
      // Колонка F может содержать отдельную ценовую шапку, но в строках товаров там пусто,
      // поэтому она не должна становиться основной ценой.
      var headerRow = ri;
      var nameCol = -1, unitCol = -1, priceCol = -1, priceCol2 = -1;

      // Ищем строку с "за кг." / "за шт." и используем её только как подсказку,
      // но не как основную карту колонок.
      var next = rows[ri+1] || [];
      next.forEach(function(c, ci){
        var v = (c||'').toString().trim().toLowerCase();
        if(v.indexOf('за кг') >= 0 || v === 'кг' || v === 'кг.') {
          unitCol = ci;
        }
        if(v.indexOf('за шт') >= 0 || v === 'шт' || v === 'шт.') {
          priceCol2 = ci;
        }
      });

      // Товарный блок можно проверить по нескольким следующим строкам:
      // выбираем колонку с наибольшей долей товарных названий и колонку с ценами.
      var sample = rows.slice(ri + 2, ri + 12);
      var maxCols = 0;
      sample.forEach(function(r){ if(r && r.length > maxCols) maxCols = r.length; });
      if(maxCols < row.length) maxCols = row.length;

      var bestName = {ci:-1, score:0};
      var bestPrice = {ci:-1, score:0};
      var bestUnit = {ci:-1, score:0};

      for(var ci2=0; ci2<maxCols; ci2++){
        var nameScore = 0, priceScore = 0, unitScore = 0, seen = 0;
        sample.forEach(function(r){
          if(!r || ci2 >= r.length) return;
          var val = (r[ci2] || '').toString().trim();
          if(!val) return;
          seen++;
          if(_looksLikeProductName(val)) nameScore++;
          if(extractPrice(val) > 0) priceScore++;
          if(normalizeUnit(val).match(/^(кг|г|шт|л|мл|уп|пачка|бут)$/i)) unitScore++;
          if(_looksLikeOriginText(val)) nameScore -= 2;
        });
        if(nameScore > bestName.score) bestName = {ci:ci2, score:nameScore};
        if(priceScore > bestPrice.score) bestPrice = {ci:ci2, score:priceScore};
        if(unitScore > bestUnit.score) bestUnit = {ci:ci2, score:unitScore};
      }

      if(bestName.ci >= 0) nameCol = bestName.ci;
      if(bestPrice.ci >= 0) priceCol = bestPrice.ci;
      if(bestUnit.ci >= 0) unitCol = bestUnit.ci;

      // Жёсткий fallback для этого конкретного формата:
      // если распознавание не сработало, используем проверенную структуру файла.
      if(nameCol < 0) nameCol = 1; // B
      if(priceCol < 0) priceCol = 7; // H
      if(unitCol < 0) unitCol = 8; // I
      if(priceCol2 < 0 && row.length > 5) priceCol2 = 5; // F как запасная ценовая колонка

      return {headerRow:headerRow, nameCol:nameCol, unitCol:unitCol, priceCol:priceCol, priceCol2:priceCol2, confidence:99};
    }
  }
  return null;
}

// Поиск строки заголовков (первые 15 строк файла)
function _findHeaderRow(rows) {
  var best = {headerRow:-1, nameCol:-1, unitCol:-1, priceCol:-1, confidence:0};

  for(var ri = 0; ri < Math.min(15, rows.length); ri++) {
    var row = rows[ri];
    if(!row || !row.length) continue;

    // Вычислить scores по всем ролям для каждой ячейки
    var scores = [];
    row.forEach(function(cell, ci) {
      var h = (cell||'').toString().toLowerCase().trim();
      scores.push({
        ci:ci, raw:h,
        name:  _matchSynonym(h, NAME_SYNONYMS),
        price: _matchSynonym(h, PRICE_SYNONYMS),
        unit:  _matchSynonym(h, UNIT_SYNONYMS)
      });
    });

    // Назначаем роли: PRICE → NAME → UNIT (каждая колонка только одна роль)
    var nameCol=-1, unitCol=-1, priceCol=-1;
    var used = {};

    // 1. PRICE — выбираем колонку с max price-score
    scores.forEach(function(s) {
      if(s.price > 0 && (priceCol<0 || s.price > scores[priceCol].price)) {
        priceCol = s.ci;
      }
    });
    if(priceCol >= 0) used[priceCol] = true;

    // 2. NAME — выбираем колонку с max name-score (не занятую)
    scores.forEach(function(s) {
      if(!used[s.ci] && s.name > 0 && (nameCol<0 || s.name > scores[nameCol].name)) {
        nameCol = s.ci;
      }
    });
    if(nameCol >= 0) used[nameCol] = true;

    // 3. UNIT — выбираем колонку с max unit-score (не занятую)
    scores.forEach(function(s) {
      if(!used[s.ci] && s.unit > 0 && (unitCol<0 || s.unit > scores[unitCol].unit)) {
        unitCol = s.ci;
      }
    });
    if(unitCol >= 0) used[unitCol] = true;

    var matches = (nameCol>=0 ? scores[nameCol].name : 0)
                + (priceCol>=0 ? scores[priceCol].price : 0)
                + (unitCol>=0 ? scores[unitCol].unit : 0);

    if(matches > best.confidence && nameCol >= 0) {
      best = {headerRow:ri, nameCol:nameCol, unitCol:unitCol,
              priceCol:priceCol, confidence:matches};
    }
  }
  return best;
}
function _matchSynonym(text, synonyms) {
  var t = text.toLowerCase().trim();
  for(var i=0; i<synonyms.length; i++) {
    var s = synonyms[i].toLowerCase();
    if(t === s) return 3 + Math.floor((synonyms.length - i) / 4); // позиция даёт приоритет
  }
  for(var j=0; j<synonyms.length; j++) {
    var s2 = synonyms[j].toLowerCase();
    if(t.length>1 && s2.length>1 && (t.includes(s2) || s2.includes(t))) return 2;
  }
  return 0;
}
function _heuristicAnalysis(rows) {
  var result = {headerRow:-1, nameCol:-1, unitCol:-1, priceCol:-1, confidence:0};
  if(rows.length < 2) return result;
  
  var colStats = {}; // {colIdx: {textCount, numCount, shortCount, emptyCount}}
  
  // Анализируем все строки кроме первых двух (могут быть мусорные заголовки)
  var startRow = 0;  // анализируем все строки
  rows.slice(startRow, Math.min(startRow+30,rows.length)).forEach(function(row) {
    if(!row) return;
    row.forEach(function(cell, ci) {
      var v = (cell||'').toString().trim();
      if(!colStats[ci]) colStats[ci]={text:0,num:0,short:0,empty:0,unitMatch:0,origin:0};
      if(!v) { colStats[ci].empty++; return; }
      
      var asNum = parseFloat(v.replace(/[₽руб$,\s]/g,'').replace(',','.'));
      var isNum = !isNaN(asNum) && asNum > 0;
      
      if(isNum) {
        colStats[ci].num++;
      } else if(v.length <= 5 && _isUnitValue(v)) {
        colStats[ci].unitMatch++;
        colStats[ci].short++;
      } else if(_looksLikeOriginText(v)) {
        colStats[ci].origin++;
      } else if(v.length > 3) {
        colStats[ci].text++;
      } else {
        colStats[ci].short++;
      }
    });
  });
  
  var colIdxs = Object.keys(colStats).map(Number).sort(function(a,b){return a-b;});
  var totalRows = Math.min(20, rows.length - startRow);
  
  // Определить роли колонок
  var nameScore=-1, priceScore=-1, unitScore=-1;
  
  colIdxs.forEach(function(ci) {
    var s = colStats[ci];
    var textRatio  = s.text  / (totalRows || 1);
    var numRatio   = s.num   / (totalRows || 1);
    var unitRatio  = s.unitMatch / (totalRows || 1);
    var originRatio = s.origin / (totalRows || 1);
    
    // Лучшая "текстовая" колонка → название
    if(textRatio > 0.5 && originRatio < 0.25 && textRatio > nameScore) {
      nameScore = textRatio; result.nameCol = ci;
    }
    // Лучшая "числовая" колонка → цена
    if(numRatio > 0.4 && numRatio > priceScore) {
      priceScore = numRatio; result.priceCol = ci;
    }
    // Лучшая "единица" колонка
    if(unitRatio > 0.3 && unitRatio > unitScore) {
      unitScore = unitRatio; result.unitCol = ci;
    }
  });
  
  // Не допустить совпадения колонок
  if(result.nameCol === result.priceCol && result.priceCol >= 0) result.priceCol = -1;
  if(result.nameCol === result.unitCol)  result.unitCol = -1;
  
  result.confidence = Math.round((nameScore+priceScore)*50);
  return result;
}

// Проверить является ли значение единицей измерения
function _isUnitValue(v) {
  var low = v.toLowerCase().trim();
  var units = ['кг','г','гр','шт','л','мл','уп','пач','бут','пачка',
               'кг.','шт.','л.','kg','g','pcs','l','ml'];
  return units.some(function(u){ return low===u||low.startsWith(u); });
}

// ── ОЧИСТКА СТРОК ─────────────────────────────────────────────

function cleanRows(rows, headerRow) {
  var result = [];
  rows.forEach(function(row, ri) {
    if(ri <= headerRow) return; // пропустить заголовок и выше
    if(!row || !row.length) return;

    // Оставляем строку, если в ней есть хотя бы одно непустое значение.
    // Никакие служебные/географические/страночные тексты здесь не вырезаем,
    // чтобы импорт шёл строго по выбранным колонкам.
    var hasValue = false;
    for(var ci=0; ci<row.length; ci++){
      if((row[ci] || '').toString().trim()){ hasValue = true; break; }
    }
    if(!hasValue) return;

    result.push(row);
  });
  return result;
}

function _looksLikeMetaText(text) {
  var s = (text || '').toString().trim().toLowerCase();
  if(!s) return true;
  if(JUNK_PATTERNS.some(function(p){ return p.test(s); })) return true;
  if(/(^|[\s:])\+?\d[\d\s().-]{5,}/.test(s)) return true; // телефоны
  if(/(\bг\.?\s*[а-яё-]+|\bул\.?\s*[а-яё-]+|\bпроспект|\bшоссе|\bдом\b|\booo\b|\bооо\b|\bип\b)/i.test(s)) return true;
  if(/(адрес|телефон|email|e-mail|почт|офис|склад|режим работы|график|прайс|поставщик|город|юр\.?\s*лицо|инн|огрн|кпп|страна|происхожд)/i.test(s)) return true;
  return false;
}

function _looksLikeOriginText(text) {
  var raw = (text || '').toString().trim();
  var s = raw.toLowerCase();
  if(!s) return false;
  if(/^\d+$/.test(s)) return false;
  if(/^[A-ZА-ЯЁ]{2,20}$/.test(raw)) return true;
  var origins = [
    'перу','египет','турция','израиль','испания','китай','кения','чили','италия','греция',
    'марокко','франция','нидерланды','бельгия','польша','индия','мексика','эквадор','бразилия',
    'юар','казахстан','таджикистан','узбекистан','азербайджан','беларусь','россия','абхазия',
    'сербия','аргентина','тайланд','вьетнам','пакистан','корея','сша','с.ша','usa','china','peru',
    'egypt','turkey','israel','spain','italy','greece'
  ];
  if(origins.indexOf(s) >= 0) return true;
  if(/страна\s+происхождения|страна\s+производства|country of origin|origin/i.test(s)) return true;
  return false;
}

function _looksLikeProductName(text) {
  var s = (text || '').toString().trim();
  if(!s) return false;
  if(_looksLikeMetaText(s)) return false;
  if(_looksLikeOriginText(s)) return false;
  if(/^\d+$/.test(s)) return false;
  if(s.length < 2) return false;
  if(/^[\d\s.,/-]+$/.test(s)) return false;
  if(/^[A-ZА-ЯЁ]{2,20}$/.test(s)) return false;
  return true;
}

function _scoreDataRow(row) {
  if(!row || !row.length) return 0;
  var score = 0;
  var hasProduct = false;
  var hasPrice = false;
  for(var i=0;i<row.length;i++){
    var val = (row[i] || '').toString().trim();
    if(!val) continue;
    if(_looksLikeProductName(val)) {
      score += 3;
      hasProduct = true;
    }
    if(extractPrice(val) > 0) {
      score += 2;
      hasPrice = true;
    }
    if(_isUnitValue(val)) score += 1;
  }
  if(hasProduct) score += 2;
  if(hasPrice) score += 1;
  return score;
}

function _detectDataStartRow(rows) {
  if(!rows || !rows.length) return 0;
  var limit = Math.min(rows.length, 120);
  var scores = [];
  var bestRow = 0;
  var bestScore = -1;
  for(var ri=0; ri<limit; ri++){
    var sc = _scoreDataRow(rows[ri]);
    scores.push(sc);
    if(sc > bestScore){
      bestScore = sc;
      bestRow = ri;
    }
  }

  // Ищем устойчивый блок товарных строк подряд.
  // Это лучше, чем выбирать один "самый жирный" ряд, потому что в шапке тоже бывают числа.
  var threshold = Math.max(4, Math.round(bestScore * 0.6));
  var runStart = -1, runLen = 0, bestRunStart = -1, bestRunLen = 0;
  for(var i=0; i<scores.length; i++){
    if(scores[i] >= threshold){
      if(runStart < 0) runStart = i;
      runLen++;
    } else {
      if(runLen > bestRunLen){
        bestRunLen = runLen;
        bestRunStart = runStart;
      }
      runStart = -1;
      runLen = 0;
    }
  }
  if(runLen > bestRunLen){
    bestRunLen = runLen;
    bestRunStart = runStart;
  }

  if(bestRunStart >= 0) return bestRunStart;

  // Если устойчивого блока нет, ищем первую строку, где есть и товар, и цена.
  for(var j=0; j<limit; j++){
    var row = rows[j] || [];
    var hasProduct = false, hasPrice = false, hasUnit = false;
    for(var c=0; c<row.length; c++){
      var val = (row[c] || '').toString().trim();
      if(!val) continue;
      if(!hasProduct && _looksLikeProductName(val)) hasProduct = true;
      if(!hasPrice && extractPrice(val) > 0) hasPrice = true;
      if(!hasUnit && _isUnitValue(val)) hasUnit = true;
    }
    if(hasProduct && hasPrice) return j;
    if(hasProduct && hasPrice && hasUnit) return j;
  }

  return bestRow;
}

// ── ИЗВЛЕЧЕНИЕ ЦЕНЫ ──────────────────────────────────────────

function extractPrice(raw) {
  if(raw===null||raw===undefined||raw==='') return 0;
  var s = raw.toString()
    .replace(/[₽руб\s$€£¥]/gi,'')   // убираем валюту и пробелы (НЕ точку)
    .replace(/\s+/g,'')
    .replace(/,/g,'.')               // запятую → точка
    .trim();
  // Убрать всё кроме цифр и точки
  s = s.replace(/[^\d.]/g,'');
  if(!s) return 0;
  // Если несколько точек — оставить последнюю как десятичную
  var parts = s.split('.');
  if(parts.length > 2) s = parts.slice(0,-1).join('') + '.' + parts[parts.length-1];
  var n = parseFloat(s);
  return (isNaN(n)||n<0) ? 0 : Math.round(n*100)/100;
}
function normalizeUnit(raw, productName) {
  if(raw && raw.toString().trim()) {
    var low = raw.toString().toLowerCase().trim()
      .replace(/^\d+[.,]?\d*\s*/, '').trim();
    if(UNIT_MAP[low]) return UNIT_MAP[low];
    for(var k in UNIT_MAP) {
      if(low === k || low.startsWith(k+' ') || low.endsWith(' '+k)) return UNIT_MAP[k];
    }
    if(low) return low;
  }
  // Попробовать извлечь из названия: "Молоко 1л" → "л"
  if(productName) {
    var nm = productName.toString();
    var unitWords = Object.keys(UNIT_MAP);
    for(var ui=0; ui<unitWords.length; ui++) {
      var u = unitWords[ui];
      var re = new RegExp('\\b\\d+[.,]?\\d*\\s*' + u.replace('.','[.]') + '(?:\\b|$)', 'i');
      if(re.test(nm)) return UNIT_MAP[u] || u;
    }
  }
  return 'кг';
}
function findSynonymGroup(name) {
  var nl = (name||'').toLowerCase().trim();
  for(var i=0;i<PRODUCT_SYNONYMS.length;i++) {
    var grp = PRODUCT_SYNONYMS[i];
    for(var j=0;j<grp.length;j++) {
      var s = grp[j].toLowerCase();
      if(s === nl || nl.includes(s) || s.includes(nl)) return grp;
    }
  }
  return null;
}

function getCanonicalName(name) {
  var grp = findSynonymGroup(name);
  return grp ? grp[0] : name;
}

// ── ЗАПОМИНАНИЕ СТРУКТУРЫ ПРАЙСА ─────────────────────────────

function rememberPriceLayout(supName, layout) {
  var orgKey = _normalizeOrgKey((layout && layout.organizationId) || getCurrentOrganizationKey(CU) || '');
  var memoryKey = orgKey ? (orgKey + '::' + String(supName || '').toLowerCase().trim()) : String(supName || '').toLowerCase().trim();
  _priceLayoutMemory[memoryKey] = {
    nameCols:  Array.isArray(layout.nameCols) ? layout.nameCols.slice() : (layout.nameCol >= 0 ? [layout.nameCol] : []),
    unitCols:  Array.isArray(layout.unitCols) ? layout.unitCols.slice() : (layout.unitCol >= 0 ? [layout.unitCol] : []),
    priceCols: Array.isArray(layout.priceCols) ? layout.priceCols.slice() : (layout.priceCol >= 0 ? [layout.priceCol] : []),
    price2Cols:Array.isArray(layout.price2Cols) ? layout.price2Cols.slice() : (layout.priceCol2 >= 0 ? [layout.priceCol2] : []),
    headerRow: layout.headerRow,
    organizationId: orgKey,
    savedAt:   new Date().toISOString()
  };
  // Сохранить в localStorage
  try {
    localStorage.setItem('pv_price_layouts', JSON.stringify(_priceLayoutMemory));
  } catch(e) {}
}

function recallPriceLayout(supName) {
  var orgKey = _normalizeOrgKey(getCurrentOrganizationKey(CU) || '');
  var memoryKey = orgKey ? (orgKey + '::' + String(supName || '').toLowerCase().trim()) : String(supName || '').toLowerCase().trim();
  // Попробовать из памяти
  if(_priceLayoutMemory[memoryKey]) return _priceLayoutMemory[memoryKey];
  if(_priceLayoutMemory[supName]) return _priceLayoutMemory[supName];
  // Попробовать из localStorage
  try {
    var stored = localStorage.getItem('pv_price_layouts');
    if(stored) {
      var parsed = JSON.parse(stored);
      _priceLayoutMemory = parsed;
      if(parsed[memoryKey]) return parsed[memoryKey];
      if(parsed[supName]) return parsed[supName];
    }
  } catch(e) {}
  return null;
}

function _layoutLooksCompatible(rows, layout) {
  if(!rows || !rows.length || !layout) return false;
  var headerRow = layout.headerRow >= 0 ? layout.headerRow : 0;
  var cleaned = cleanRows(rows, headerRow).slice(0, 18);
  if(!cleaned.length) return false;
  var nameOk=0, priceOk=0, total=0;
  cleaned.forEach(function(parts){
    total++;
    var name = _collectJoinedText(parts, layout.nameCols || (layout.nameCol >= 0 ? [layout.nameCol] : []));
    var p1   = _collectFirstPrice(parts, layout.priceCols || (layout.priceCol >= 0 ? [layout.priceCol] : []));
    var p2   = _collectFirstPrice(parts, layout.price2Cols || (layout.priceCol2 >= 0 ? [layout.priceCol2] : []));
    if(_looksLikeProductName(name)) nameOk++;
    if((p1>0) || (p2>0)) priceOk++;
  });
  return total > 0 && nameOk/total >= 0.45 && priceOk/total >= 0.45;
}

function loadPriceLayoutsFromStorage() {
  try {
    var stored = localStorage.getItem('pv_price_layouts');
    if(stored) _priceLayoutMemory = JSON.parse(stored);
  } catch(e) {}
}

// ── ПРЕВЬЮ ТАБЛИЦЫ ────────────────────────────────────────────

function renderPricePreview(rows, layout) {
  var el = document.getElementById('pricePreviewTable');
  if(!el) return;
  
  var sups = _tenderSelectedSups; // для контекста
  var previewRows = rows.slice(0, Math.min(8, rows.length));
  var maxCols = previewRows.reduce(function(m,r){return Math.max(m,r.length);},0);
  
  var headerRow = layout.headerRow >= 0 ? layout.headerRow : -1;
  
  var colColors = {};
  (layout.nameCols || (layout.nameCol >= 0 ? [layout.nameCol] : [])).forEach(function(ci){ colColors[ci] = {bg:'rgba(91,163,245,.15)',label:'Наименование'}; });
  (layout.priceCols || (layout.priceCol >= 0 ? [layout.priceCol] : [])).forEach(function(ci){ colColors[ci] = {bg:'rgba(76,175,130,.15)',label:'Цена'}; });
  (layout.price2Cols || (layout.priceCol2 >= 0 ? [layout.priceCol2] : [])).forEach(function(ci){ colColors[ci] = {bg:'rgba(171,125,248,.15)',label:'Цена 2'}; });
  (layout.unitCols || (layout.unitCol >= 0 ? [layout.unitCol] : [])).forEach(function(ci){ colColors[ci] = {bg:'rgba(255,193,7,.15)', label:'Единица'}; });
  
  var html = '<div style="overflow-x:auto;max-height:260px;overflow-y:auto;">'
    +'<table style="border-collapse:collapse;font-size:12px;width:100%;min-width:400px;">';
  
  // Заголовок колонок (А, Б, В...)
  html += '<tr style="background:var(--bg4);">';
  html += '<td style="padding:4px 8px;color:var(--t4);font-size:10px;">#</td>';
  for(var ci=0;ci<maxCols;ci++) {
    var cc = colColors[ci];
    html += '<td style="padding:4px 8px;text-align:center;font-size:10px;color:var(--t3);'
      +'background:'+(cc?cc.bg:'')+';">'
      +(cc?'<b style="color:var(--ac);">'+cc.label+'</b>':String.fromCharCode(65+ci))
      +'</td>';
  }
  html += '</tr>';
  
  previewRows.forEach(function(row, ri) {
    var isHeader = ri === headerRow;
    html += '<tr style="border-bottom:1px solid var(--br);'+(isHeader?'background:var(--aD);':'ri%2===0?\"background:var(--bg3)\":\"\"')+'">'; 
    html += '<td style="padding:4px 8px;color:var(--t4);font-size:10px;">'+(ri+1)+'</td>';
    for(var ci2=0;ci2<maxCols;ci2++) {
      var val = (row && row[ci2] !== undefined) ? (row[ci2]||'') : '';
      var cc2 = colColors[ci2];
      html += '<td style="padding:4px 8px;border-left:1px solid var(--br);white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;'
        +'background:'+(cc2?cc2.bg:'')+';">'
        +String(val).substring(0,50)
        +'</td>';
    }
    html += '</tr>';
  });
  
  html += '</table></div>';
  
  // Легенда
  html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:11px;">';
  if((layout.nameCols || (layout.nameCol >= 0 ? [layout.nameCol] : [])).length) html += '<span style="color:var(--ac);">🔵 Наименование · '+(layout.nameCols || [layout.nameCol]).map(function(i){return i+1;}).join(', ')+'</span>';
  if((layout.priceCols || (layout.priceCol >= 0 ? [layout.priceCol] : [])).length) html += '<span style="color:var(--gr);">🟢 Цена · '+(layout.priceCols || [layout.priceCol]).map(function(i){return i+1;}).join(', ')+'</span>';
  if((layout.price2Cols || (layout.priceCol2>= 0 ? [layout.priceCol2] : [])).length) html += '<span style="color:#ab7df8;">🟣 Цена 2 · '+(layout.price2Cols || [layout.priceCol2]).map(function(i){return i+1;}).join(', ')+'</span>';
  if((layout.unitCols || (layout.unitCol >= 0 ? [layout.unitCol] : [])).length) html += '<span style="color:#ff9800;">🟡 Единица · '+(layout.unitCols || [layout.unitCol]).map(function(i){return i+1;}).join(', ')+'</span>';
  html += '<span style="color:var(--t3);">Метод: '+(layout.method||'auto')+'</span>';
  html += '</div>';
  
  el.innerHTML = html;
}

// ── ФИНАЛЬНАЯ ОБРАБОТКА СТРОК С ОЧИСТКОЙ ─────────────────────

function processSupPriceRows(rows, cols, supName, append, priceName, allowedUserIds) {
  var allowedCompanies = [];
  document.querySelectorAll('.sup-price-comp-cb:checked').forEach(function(cb){
    var co = cb.dataset.company;
    if(co && allowedCompanies.indexOf(co)<0) allowedCompanies.push(co);
  });
  if(!allowedUserIds||!allowedUserIds.length){
    allowedUserIds = [];
    document.querySelectorAll('.sup-price-comp-cb:checked').forEach(function(cb){
      allowedUserIds.push(cb.value);
    });
  }

  if(!append){
    SUP_PRODS = SUP_PRODS.filter(function(p){
      return !(p._supplier===supName && (p._priceName===priceName||!p._priceName));
    });
  }

  var added=0, updated=0, skipped=0, needsReview=[];
  var headerRow = cols.headerRow >= 0 ? cols.headerRow : 0;
  var cleanedRows = Array.isArray(rows) ? rows.slice(headerRow + 1) : [];

  cleanedRows.forEach(function(parts, idx){
    var name  = _collectJoinedText(parts, cols.nameCols);
    var unit  = _collectJoinedText(parts, cols.unitCols);
    var price = _collectFirstPrice(parts, cols.priceCols);
    var price2 = _collectFirstPrice(parts, cols.price2Cols);
    if((!price || price<=0) && price2 > 0) price = price2;

    if(!name) {
      skipped++;
      return;
    }

    // Если нет цены — пометить на проверку
    if(!price || price <= 0) {
      if(!price) needsReview.push({row:idx+headerRow+2, name:name, reason:'Нет цены'});
      skipped++;
      return;
    }

    // Числовые значения в поле названия — подозрительно
    if(/^\d+$/.test(name)) {
      needsReview.push({row:idx+headerRow+2, name:name, reason:'Название — число'});
      return;
    }

    // Определить поля цены по единице
    var uLow = unit.toLowerCase();
    var pKg=0, pSh=0, pL=0, pMl=0;
    if(uLow==='кг'||uLow==='kg')       pKg = price;
    else if(uLow==='г'||uLow==='g')    pKg = Math.round(price*1000*100)/100;
    else if(uLow==='л'||uLow==='l')    pL  = price;
    else if(uLow==='мл'||uLow==='ml')  { pL = Math.round(price*1000*100)/100; unit='л'; }
    else                               pSh = price;

    // Найти существующий
    // При append (доп.прайс) — ищем точное совпадение name+supplier+type
    // Товары с разными _type НЕ считаются дубликатами
    var currentType = append ? 'additional' : 'main';
    var ex = append ? SUP_PRODS.findIndex(function(p){
      return p.name.toLowerCase()===name.toLowerCase()
          && p._supplier===supName
          && (p._type||'main')==='additional';  // только доп. прайс
    }) : -1;

    var entry = {
      id:        ex>=0 ? SUP_PRODS[ex].id : Date.now()+idx,
      name:      name,
      cat:       '—',
      unit:      unit,
      supplier:  supName,
      _supplier: supName,
      _priceName:priceName,
      pKg:pKg, pSh:pSh, pL:pL, pMl:pMl,
      stock:     999,
      active:    true,
      hidden:    false,
      _type:     currentType,
      allowedUserIds:    allowedUserIds.slice(),
      allowedCompanies:  allowedCompanies.slice()
    };

    if(ex>=0){ SUP_PRODS[ex]=entry; updated++; }
    else     { SUP_PRODS.push(entry); added++; }

    // Обновить каталог PRODUCTS
    var prodIdx = PRODUCTS.findIndex(function(p){
      return p.name.toLowerCase()===name.toLowerCase();
    });
    if(prodIdx>=0){
      var spIdx = PRODUCTS[prodIdx].suppliers.findIndex(function(s){return s.name===supName;});
      if(spIdx>=0) PRODUCTS[prodIdx].suppliers[spIdx].price = price;
      else         PRODUCTS[prodIdx].suppliers.push({name:supName,price:price});
      PRODUCTS[prodIdx].unit = PRODUCTS[prodIdx].unit || unit;
    } else {
      PRODUCTS.push({
        id:Date.now()+idx+10000, name:name, cat:'dry', unit:unit, emoji:'',
        sticker:null, fav:false, allowedCompanies:allowedCompanies.slice(),
        suppliers:[{name:supName,price:price}],
        pKg:pKg, pSh:pSh, pL:pL, pMl:0
      });
      if(ALL_SUPS.indexOf(supName)<0) ALL_SUPS.push(supName);
    }
  });

  // Запомнить структуру
  rememberPriceLayout(supName, cols);

  savePriceData();
  renderSupProducts();
  if(typeof renderCatalog==='function') renderCatalog();

  var msg = (append?'Доп.':'Новый') + ' прайс «'+priceName+'» ('+supName+'): '
    +'+'+added+' новых, обн.'+updated
    +(skipped?' · пропущено: '+skipped:'');
  toast(msg, 'ok');
  logAudit(CU?CU.first+' '+CU.last:'', msg, 'Прайсы');
  logSystemEvent('price_import','Загрузка прайса: '+supName,msg+(needsReview.length?' · требует проверки: '+needsReview.length:''),needsReview.length||skipped?'warn':'info','price-import');

  if(needsReview.length) {
    _showNeedsReview(needsReview, supName);
  }
}

// Показать строки требующие проверки
function _showNeedsReview(items, supName) {
  var el = document.getElementById('priceReviewList');
  if(!el) { logSystemEvent('price_import','Строки прайса требуют проверки',items.length+' строк пропущено при импорте прайса '+supName,'warn','price-import'); toast(items.length+' строк пропущено (нет цены)','err'); return; }
  
  el.innerHTML = items.slice(0,10).map(function(item){
    return '<div style="display:flex;gap:8px;padding:5px 10px;font-size:12px;border-bottom:1px solid var(--br);">'
      +'<span style="color:var(--rd);min-width:20px;">'+item.row+'</span>'
      +'<span style="flex:1;">'+item.name+'</span>'
      +'<span style="color:var(--t3);">'+item.reason+'</span>'
      +'</div>';
  }).join('');
  
  var sec = document.getElementById('priceReviewSection');
  if(sec) sec.style.display = 'block';
  logSystemEvent('price_import','Требуется ручная проверка прайса',supName+': '+items.length+' строк не были загружены автоматически','warn','price-import');
}

// ── ОСНОВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ─────────────────────────────────

function doSupPriceUpload(){
  return prepareSupPriceImportPreview();
}

function openSupPriceManualMap(){
  var errEl = document.getElementById('supPriceErr');
  if(errEl) errEl.textContent = '';

  var supName = _currentSupName;
  if(!supName){ if(errEl) errEl.textContent='Поставщик не определён'; return; }

  var append    = _supPriceAppend;
  var priceName = (document.getElementById('supPriceName')||{value:''}).value.trim()
                  || (append?'Дополнительный прайс':'Основной прайс');

  var fi = document.getElementById('supPriceFile');
  if(!fi||!fi.files||!fi.files[0]){
    if(errEl) errEl.textContent='Сначала выберите файл прайса';
    return;
  }

  var file = fi.files[0];
  var ext  = file.name.split('.').pop().toLowerCase();

  function finish(rows){
    if(!rows || !rows.length){
      if(errEl) errEl.textContent='Файл пустой';
      return;
    }
  showManualColumnMap(rows, supName, append, priceName, {headerRow:0,nameCol:-1,unitCol:-1,priceCol:-1,priceCol2:-1,method:'manual',confidence:0});
}

  if(ext==='xlsx'||ext==='xls'){
    if(typeof XLSX==='undefined'){ if(errEl) errEl.textContent='SheetJS не загружен'; return; }
    var r = new FileReader();
    r.onload = function(ev){
      try{
        var wb = XLSX.read(new Uint8Array(ev.target.result),{type:'array'});
        var ws = wb.Sheets[wb.SheetNames[0]];
        finish(XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false}));
      } catch(e){ if(errEl) errEl.textContent='Ошибка Excel: '+e.message; }
    };
    r.readAsArrayBuffer(file);
  } else {
    var r = new FileReader();
    r.onload = function(ev){
      finish(ev.target.result.split(/\r?\n/).filter(function(l){return l.trim();}).map(function(l){return l.split(/[,;\t]/);}));
    };
    r.readAsText(file,'utf-8');
  }
}

function updatePricePreviewHeader(layout){
  var map = [
    ['previewColName',   layout && layout.nameCols && layout.nameCols.length ? 'Наименование: '+layout.nameCols.map(function(i){return i+1;}).join(', ') : 'Наименование'],
    ['previewColUnit',   layout && layout.unitCols && layout.unitCols.length ? 'Ед. изм.: '+layout.unitCols.map(function(i){return i+1;}).join(', ') : 'Ед. изм.'],
    ['previewColPrice1', layout && layout.priceCols && layout.priceCols.length ? 'Цена 1: '+layout.priceCols.map(function(i){return i+1;}).join(', ') : 'Цена 1'],
    ['previewColPrice2', layout && layout.price2Cols && layout.price2Cols.length ? 'Цена 2: '+layout.price2Cols.map(function(i){return i+1;}).join(', ') : 'Цена 2']
  ];
  map.forEach(function(item){
    var el=document.getElementById(item[0]);
    if(el) el.textContent=item[1];
  });
}

// Показать превью + кнопки подтвердить / изменить

function showManualColumnMap(rows, supName, append, priceName, detectedLayout) {
  _mcmRows      = rows;
  _mcmSupName   = supName;
  _mcmAppend    = append;
  _mcmPriceName = priceName;

  if(!rows.length) return;
  var dataStartRow = 1;
  var sampleRows = rows.slice(0, Math.min(rows.length, 30));
  var maxCols = rows.slice(0, Math.min(rows.length, 120)).reduce(function(max, row){
    return Math.max(max, row ? row.length : 0);
  }, 0);
  if(maxCols < 1) maxCols = 1;
  _mcmMaxCols = maxCols;
  _mcmSelectedRoleByCol = {};
  var headers = [];
  for(var hi=0; hi<maxCols; hi++){
    headers.push('Колонка '+(hi+1));
  }

  // Превью первых строк
  var prev = document.getElementById('mcm-preview');
  if(prev){
    var tbl = '<div style="overflow-x:auto;font-size:11px;max-height:280px;overflow-y:auto;">'
      +'<table style="border-collapse:collapse;width:100%;min-width:'+(Math.max(8,maxCols)*150)+'px;">';
  tbl += '<tr>'+headers.map(function(h,i){
      var guessed = 'ignore';
      _mcmSelectedRoleByCol[i] = guessed;
      return '<th style="border:1px solid var(--br);padding:6px 6px;background:var(--bg4);text-align:center;min-width:150px;vertical-align:top;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;">'
          +'<span style="font-size:10px;color:var(--t3);font-weight:700;letter-spacing:.02em;">'+('Колонка '+(i+1))+'</span>'
          +'<span style="font-size:10px;color:var(--t4);background:rgba(255,255,255,.35);border:1px solid var(--br);border-radius:999px;padding:2px 6px;">'+h+'</span>'
        +'</div>'
        +'<select id="mcm-role-'+i+'" onchange="_setMcmRole('+i+', this.value)" style="width:100%;background:var(--bg2);border:1px solid var(--br);border-radius:8px;padding:7px 8px;font-size:11px;color:var(--tx);outline:none;">'
        +'<option value="ignore" selected>Игнорировать</option>'
        +'<option value="name">Наименование</option>'
        +'<option value="unit">Единица</option>'
        +'<option value="price">Цена 1</option>'
        +'<option value="price2">Цена 2</option>'
        +'</select>'
      +'</th>';
    }).join('')+'</tr>';
    sampleRows.forEach(function(r){
      tbl += '<tr>';
      for(var ci=0; ci<maxCols; ci++){
        var cell = r && r[ci] !== undefined ? r[ci] : '';
        tbl += '<td style="border:1px solid var(--br);padding:4px 6px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
          +(cell||'').toString().substring(0,40)
          +'</td>';
      }
      tbl += '</tr>';
    });
    tbl += '</table></div>';
    prev.innerHTML = tbl;
  }

  var hint = document.getElementById('mcm-manual-hint');
  if(hint){
    hint.textContent = 'Назначьте роли прямо над колонками. Автоматическое распознавание отключено: все роли выбираются вручную. Роль может быть назначена двум колонкам, если прайс разбит на несколько столбцов.';
  }

  var startRowEl = document.getElementById('mcm-start-row');
  if(startRowEl){
    startRowEl.value = '1';
  }

  // Подсказка, если файл очень широкий
  if(hint && maxCols > 10){
    hint.innerHTML = 'Назначьте роли прямо в таблице. Колонок в файле: <b>'+maxCols+'</b>. Можно прокрутить горизонтально и выбрать роли для каждой.';
  }

  var opts = '<option value="-1">— не указана —</option>'
    + headers.map(function(h,i){
      return '<option value="'+i+'">'+h+'</option>';
    }).join('');

  // Заполнить и предвыбрать обнаруженные колонки
  ['mcm-name-col','mcm-unit-col','mcm-price-col','mcm-price2-col'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.innerHTML = opts; }
  });
  
  var err = document.getElementById('mcm-err');
  if(err) err.textContent = '';
  
  // Показать режим работы
  var methodEl = document.getElementById('mcm-method');
  if(methodEl) {
    methodEl.textContent = 'Режим: ручное сопоставление колонок';
  }

  // Сразу показать редактируемый предпросмотр по текущим колонкам
  _mcmLayout = {
    headerRow: 0,
    nameCols: [],
    unitCols: [],
    priceCols: [],
    price2Cols: [],
    method: 'manual',
    confidence: 0
  };
  _setImportPreviewBadges(_mcmLayout);

  _setImportPreviewBadges(_mcmLayout);
  syncMcmRolesFromPreview();
  renderPriceEditTable(rows, _mcmLayout, supName, append, priceName, [], 'mcm-edit-preview');
  openModal('manualColumnMap');
  _bindPricePreviewActions();
}

function _setMcmRole(col, role){
  _mcmSelectedRoleByCol[col] = role || 'ignore';
  var current = document.getElementById('mcm-role-'+col);
  if(current) current.value = role || 'ignore';
  syncMcmRolesFromPreview();
  _setImportPreviewBadges(_mcmLayout);
  renderPriceEditTable(_mcmRows, _mcmLayout, _mcmSupName, _mcmAppend, _mcmPriceName, [], 'mcm-edit-preview');
}

function applyManualColumnMap(){
  var startRow = parseInt((document.getElementById('mcm-start-row')||{value:'1'}).value)||1;
  var err  = document.getElementById('mcm-err');
  syncMcmRolesFromPreview();
  if(!_mcmLayout || !_mcmLayout.nameCols || !_mcmLayout.nameCols.length){ if(err) err.textContent='Выберите хотя бы одну колонку с названием'; return; }
  if(!_mcmLayout.priceCols || !_mcmLayout.priceCols.length){ if(err) err.textContent='Выберите хотя бы одну колонку с ценой'; return; }

  _mcmLayout.headerRow = startRow - 1;
  _setImportPreviewBadges(_mcmLayout);
  renderPriceEditTable(_mcmRows, _mcmLayout, _mcmSupName, _mcmAppend, _mcmPriceName, [], 'mcm-edit-preview');
  if(err) err.textContent = 'Колонки применены. Проверьте предпросмотр и нажмите "Сохранить и загрузить".';
}

function applyManualColumnMapAndSave(){
  var err  = document.getElementById('mcm-err');
  applyManualColumnMap();
  if(err && /Выберите|разные колонки/.test(err.textContent || '')) return;
  if(!_mcmLayout || !_mcmLayout.nameCols || !_mcmLayout.nameCols.length || !_mcmLayout.priceCols || !_mcmLayout.priceCols.length) return;
  if(err) err.textContent = 'Загружаю прайс...';
  priceSaveEdited();
}

function syncMcmRolesFromPreview(){
  var layout = {headerRow:-1,nameCols:[],unitCols:[],priceCols:[],price2Cols:[],method:'manual',confidence:0};
  for(var ci=0; ci<_mcmMaxCols; ci++){
    var role = _mcmSelectedRoleByCol[ci] || 'ignore';
    if(role === 'name') layout.nameCols.push(ci);
    else if(role === 'unit') layout.unitCols.push(ci);
    else if(role === 'price') layout.priceCols.push(ci);
    else if(role === 'price2') layout.price2Cols.push(ci);
  }
  _mcmLayout = layout;
  return layout;
}
function detectColumns(headers) {
  var layout = _findHeaderRow([headers]);
  return {
    nameCol:  layout.nameCol,
    unitCol:  layout.unitCol,
    priceCol: layout.priceCol
  };
}



// ═══════════════════════════════════════════════════════════════
// МОДУЛЬ: ПОИСК ПО СТРОКАМ → ТАБЛИЦА ПОСТАВЩИКОВ
// Поиск по первому слову, 1 товар на поставщика, табличный вид
// ═══════════════════════════════════════════════════════════════

// Оценить релевантность товара для поискового запроса (0..100)
function _scoreMatch(productName, keyword) {
  var pn  = productName.toLowerCase().trim();
  var kw  = keyword.toLowerCase().trim();
  if(!pn || !kw) return 0;
  // Точное совпадение
  if(pn === kw) return 100;
  // Начинается с ключевого слова
  if(pn.startsWith(kw + ' ') || pn.startsWith(kw + ',')) return 90;
  // Первое слово = ключевое
  var firstWord = pn.split(/[\s,.(]/)[0];
  if(firstWord === kw) return 85;
  // Содержит ключевое слово
  if(pn.includes(' ' + kw + ' ') || pn.includes(' ' + kw)) return 70;
  if(pn.includes(kw)) return 60;
  return 0;
}

// Найти лучший товар поставщика для ключевого слова (учитывая синонимы)
function _findBestForSupplier(keyword, supName) {
  var best = {item: null, score: 0};
  var keywords = [keyword];
  var scopedCandidates = [];

  // Добавить синонимы
  if(typeof PRODUCT_SYNONYMS !== 'undefined') {
    var kl = keyword.toLowerCase();
    for(var gi=0; gi<PRODUCT_SYNONYMS.length; gi++) {
      var grp = PRODUCT_SYNONYMS[gi];
      var inGroup = grp.some(function(s){ return s.toLowerCase().includes(kl) || kl.includes(s.toLowerCase()); });
      if(inGroup) {
        grp.forEach(function(syn){ if(keywords.indexOf(syn)<0) keywords.push(syn); });
        break;
      }
    }
  }

  // Поиск по SUP_PRODS этого поставщика
  SUP_PRODS.forEach(function(p) {
    if((p._supplier||p.supplier) !== supName) return;
    if(!canSeePrices(p)) return;
    var price = p.pKg||p.pSh||p.pL||p.pMl||0;
    if(!price) return;

    var maxScore = 0;
    keywords.forEach(function(kw) {
      var sc = _scoreMatch(p.name, kw);
      // Синонимы дают чуть меньший балл
      if(kw !== keyword) sc = Math.round(sc * 0.85);
      if(sc > maxScore) maxScore = sc;
    });

    if(maxScore > best.score) {
      best = { item: p, score: maxScore, price: price };
    }
    scopedCandidates.push(p);
  });

  if(scopedCandidates.length) return best.score > 0 ? best : null;

  // Поиск по PRODUCTS этого поставщика
  PRODUCTS.forEach(function(p) {
    var sup = (p.suppliers||[]).find(function(s){ return s.name===supName; });
    if(!sup || !sup.price) return;
    if(!canSeePrices({
      organizationId: sup.organizationId || p.organizationId,
      legalEntityIds: sup.legalEntityIds || p.legalEntityIds,
      legalEntityNames: sup.legalEntityNames || p.legalEntityNames,
      priceListActive: sup.priceListActive !== false ? (p.priceListActive !== false) : false,
      allowedCompanies:sup.allowedCompanies || p.allowedCompanies,
      allowedUserIds:sup.allowedUserIds || p.allowedUserIds
    })) return;

    var maxScore = 0;
    keywords.forEach(function(kw) {
      var sc = _scoreMatch(p.name, kw);
      if(kw !== keyword) sc = Math.round(sc * 0.85);
      if(sc > maxScore) maxScore = sc;
    });

    if(maxScore > best.score) {
      best = {
        item: { name:p.name, unit:p.unit||'кг', _supplier:supName, pKg:p.pKg||0, pSh:p.pSh||0, pL:p.pL||0 },
        score: maxScore,
        price: sup.price
      };
    }
  });

  return best.score > 0 ? best : null;
}

// Извлечь ключевое слово — первое слово строки
function _extractKeyword(line) {
  var clean = line.trim();
  // Убрать проценты, скобки, числа в начале
  // "Молоко 3.2%" → "молоко"
  // "Сыр Гауда" → "сыр"
  var word = clean.split(/[\s,.(]/)[0];
  return word.toLowerCase().replace(/[%*+]/g,'').trim();
}

// ─────────────────────────────────────────────────────────────
// ГЛАВНАЯ ФУНКЦИЯ — поиск + таблица
// ─────────────────────────────────────────────────────────────
function orderSearchMulti(val) {
  var clearBtn  = document.getElementById('orderSearchClear');
  var resultsEl = document.getElementById('orderSearchResults');
  var listEl    = document.getElementById('orderSearchList');
  var countEl   = document.getElementById('orderSearchCount');

  if(clearBtn) clearBtn.style.display = val && val.trim() ? '' : 'none';
  if(!val || !val.trim()) { if(resultsEl) resultsEl.style.display='none'; return; }

  var lines = val.split(/\n/).map(function(l){return l.trim();}).filter(Boolean);
  if(!lines.length) { if(resultsEl) resultsEl.style.display='none'; return; }

  // Определить активных поставщиков (у кого есть товары в прайсе)
  var activeSups = [];
  SUP_PRODS.forEach(function(p) {
    var sn = p._supplier||p.supplier||'';
    if(sn && activeSups.indexOf(sn)<0) activeSups.push(sn);
  });
  PRODUCTS.forEach(function(p) {
    (p.suppliers||[]).forEach(function(s) {
      if(s.name && activeSups.indexOf(s.name)<0) activeSups.push(s.name);
    });
  });

  if(!activeSups.length) {
    if(resultsEl) resultsEl.style.display='block';
    if(listEl) listEl.innerHTML='<div style="text-align:center;color:var(--t3);padding:40px;font-size:14px;">'
      +'Прайсы не загружены.<br>Добавьте поставщиков и загрузите прайсы в разделе «Поставщики».</div>';
    return;
  }

  // Для каждой строки — найти лучший товар у каждого поставщика
  var tableRows = lines.map(function(line) {
    var parsed = _parseSmartLine(line) || {name:line,qty:1,unit:'кг'};
    var keyword = _extractKeyword(parsed.name);
    var cells   = {}; // {supName: {item, price, score}}
    activeSups.forEach(function(sup) {
      var found = _findBestForSupplier(keyword, sup);
      cells[sup] = found;
    });
    return {
      line: line,
      keyword: keyword,
      cells: cells,
      requestName: parsed.name,
      requestQty: parsed.qty,
      requestUnit: parsed.unit
    };
  });

  var notFound = tableRows.filter(function(r) {
    return Object.values(r.cells).every(function(c){ return !c; });
  }).map(function(r){ return r.line; });

  var found = tableRows.filter(function(r) {
    return Object.values(r.cells).some(function(c){ return !!c; });
  });

  if(resultsEl) resultsEl.style.display='block';
  if(countEl) countEl.innerHTML =
    '<span style="color:var(--t2);font-weight:600;">'
    + found.length+' из '+lines.length+' позиций найдено'
    + (notFound.length ? ' · <span style="color:var(--rd);">не найдено: <b>'+notFound.join(', ')+'</b></span>' : '')
    + '</span>';

  if(!listEl) return;

  // ─── ТАБЛИЦА ─────────────────────────────────────────────
  var html = '<div style="overflow-x:auto;">';
  html += '<table style="width:100%;border-collapse:collapse;min-width:'+(200+activeSups.length*160)+'px;">';

  // THEAD
  html += '<thead><tr style="background:var(--bg3);">';
  html += '<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;'
        + 'border:1px solid var(--br);min-width:160px;position:sticky;left:0;background:var(--bg3);z-index:2;">'
        + 'Запрос</th>';
  activeSups.forEach(function(sup) {
    html += '<th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:700;'
          + 'border:1px solid var(--br);min-width:160px;">' + sup + '</th>';
  });
  html += '</tr></thead>';

  // TBODY
  html += '<tbody>';
  tableRows.forEach(function(row, ri) {
    var rowBg = ri%2===0 ? 'var(--bg2)' : 'var(--bg)';
    html += '<tr style="border-bottom:1px solid var(--br);">';

    // Колонка запроса
    html += '<td style="padding:10px 14px;border:1px solid var(--br);'
          + 'position:sticky;left:0;background:'+rowBg+';z-index:1;">'
          + '<div style="font-size:13px;font-weight:700;color:var(--tx);">'+row.line+'</div>'
          + '<div style="font-size:10px;color:var(--t4);margin-top:2px;">ключ: '+row.keyword+'</div>'
          + '</td>';

    // Колонки поставщиков
    var allPrices = activeSups.map(function(s){ return row.cells[s] ? row.cells[s].price : 0; }).filter(Boolean);
    var minPrice  = allPrices.length ? Math.min.apply(null, allPrices) : 0;

    activeSups.forEach(function(sup) {
      var cell = row.cells[sup];
      if(!cell) {
        // Нет товара у поставщика
        html += '<td style="padding:8px 10px;border:1px solid var(--br);text-align:center;'
              + 'color:var(--t4);font-size:12px;background:'+rowBg+';">—</td>';
        return;
      }

      var isBest = cell.price && cell.price===minPrice && allPrices.length>1;
      var cellBg = isBest ? 'var(--grD)' : rowBg;
      var priceColor = isBest ? 'var(--gr)' : 'var(--ac)';
      var currentOrderItem = _orderDisplayEntry(row.line, sup, cell);
      var currentCartItem = _orderCartEntryByQuery(row.line, sup);
      var inCart = !!currentCartItem;
      var hasDraft = !!_orderDraftEntryByQuery(row.line, sup);
      var replacedFrom = currentOrderItem && currentOrderItem.replacedFrom ? currentOrderItem.replacedFrom : '';
      var activeBorder = inCart ? 'var(--ac)' : (hasDraft ? 'var(--or)' : (isBest ? 'var(--gr)' : 'var(--br)'));
      var activeBg = inCart ? 'rgba(91,163,245,.11)' : (hasDraft ? 'rgba(224,123,42,.07)' : cellBg);

      html += '<td style="padding:6px 8px;border:1px solid '+activeBorder+';'
            + 'background:'+activeBg+';vertical-align:top;position:relative;">';

      if(isBest) {
        html += '<div style="position:absolute;top:0;right:0;background:var(--gr);color:#fff;'
              + 'font-size:9px;font-weight:700;padding:2px 6px;border-radius:0 0 0 4px;">лучшая</div>';
      }
      if(hasDraft && !inCart) {
        html += '<div style="position:absolute;top:0;left:0;background:var(--or);color:#fff;'
              + 'font-size:9px;font-weight:700;padding:2px 6px;border-radius:0 0 4px 0;">выбрано</div>';
      }

      // Название товара
      html += '<div style="font-size:12px;font-weight:600;color:var(--t2);margin-bottom:4px;'
            + 'padding-right:'+(isBest?'36':'0')+'px;">'+(currentOrderItem ? currentOrderItem.name : cell.item.name)+'</div>';
      if(replacedFrom){
        html += '<div style="font-size:10px;font-weight:700;color:var(--or);margin-bottom:3px;">'
              + 'замена: '+replacedFrom+' → '+(currentOrderItem ? currentOrderItem.name : cell.item.name)
              + '</div>';
      }

      // Цена + единица
      html += '<div style="font-size:15px;font-weight:800;color:'+priceColor+';margin-bottom:6px;">'
            + '₽'+(currentOrderItem ? currentOrderItem.price : cell.price).toLocaleString()
            + '<span style="font-size:11px;font-weight:400;color:var(--t3);"> / '+(currentOrderItem ? currentOrderItem.unit : cell.item.unit)+'</span>'
            + '</div>';

      // Кол-во + кнопка
      var itemId  = (cell.item.id||Date.now());
      var supKey  = sup.replace(/[^a-zA-Zа-яА-Я0-9]/g,'_');
      var qtyId   = 'oqty-'+itemId+'-'+supKey;
      var suggestedUnit = currentOrderItem ? currentOrderItem.unit : cell.item.unit;
      var suggestedQty = currentCartItem
        ? (currentCartItem.qty || 1)
        : _normalizeOrderRequestQty(row.requestQty, row.requestUnit, suggestedUnit);
      html += '<div style="display:flex;gap:4px;align-items:center;">'
            + '<input type="number" min="0.001" step="0.001" value="'+suggestedQty+'"'
              + ' id="'+qtyId+'"'
              + ' style="width:52px;background:var(--bg2);border:1px solid var(--br);border-radius:var(--r);'
                + 'padding:4px 5px;font-size:12px;font-weight:700;color:var(--tx);text-align:center;outline:none;">'
            + '<button onclick="openOrderSupSearch(\''+_esc(row.line)+'\',\''+_esc(sup)+'\')"'
              + ' title="Поиск товара в прайсе '+_esc(sup)+'"'
              + ' style="background:var(--bg2);border:1px solid var(--br);border-radius:var(--r);'
                + 'padding:4px 8px;font-size:13px;cursor:pointer;flex-shrink:0;">🔍</button>'
            + '<button onclick="_orderToggleInvoiceGroup(\''+_esc(row.line)+'\',\''+_esc(sup)+'\')"'
              + ' title="Переключить на доп. накладную"'
              + ' style="background:'+(currentOrderItem && currentOrderItem.invoiceGroup==='extra'?'var(--orD)':'var(--bg2)')+';color:'+(currentOrderItem && currentOrderItem.invoiceGroup==='extra'?'var(--or)':'var(--t2)')+';border:1px solid '+(currentOrderItem && currentOrderItem.invoiceGroup==='extra'?'var(--or)':'var(--br)')+';border-radius:var(--r);'
                + 'padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">'+((currentOrderItem && currentOrderItem.invoiceGroup==='extra')?'Доп. накладная':'Основная')+'</button>'
            + (inCart
              ? '<button onclick="orderRemove(\''+_esc(currentCartItem.name)+'\',\''+_esc(sup)+'\',\''+_esc(row.line)+'\')"'
                + ' style="flex:1;background:var(--ac);color:#fff;border:none;border-radius:var(--r);'
                  + 'padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">✓ В заказе</button>'
              : '<button onclick="orderAddFromTable(\''+_esc(row.line)+'\',\''+_esc(currentOrderItem.name)+'\',\''+_esc(sup)+'\','+currentOrderItem.price+',\''+_esc(currentOrderItem.unit)+'\',\''+qtyId+'\')"'
                + ' style="flex:1;background:var(--aD);color:var(--ac);border:1px solid var(--ac);border-radius:var(--r);'
                  + 'padding:4px 8px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;">🛒 В заказ</button>')
            + '</div>';

      html += '</td>';
    });

    html += '</tr>';
  });

  // Строка "не найдено"
  notFound.forEach(function(line) {
    html += '<tr style="opacity:.6;">';
    html += '<td style="padding:10px 14px;border:1px solid var(--br);'
          + 'position:sticky;left:0;background:var(--bg);z-index:1;">'
          + '<div style="font-size:13px;color:var(--t2);">'+line+'</div>'
          + '<div style="font-size:10px;color:var(--rd);margin-top:2px;">не найдено в прайсах</div>'
          + '</td>';
    activeSups.forEach(function() {
      html += '<td style="padding:10px;border:1px solid var(--br);text-align:center;'
            + 'color:var(--t4);font-size:12px;">нет в наличии</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  listEl.innerHTML = html;
}

function orderSearch(val){ orderSearchMulti(val); }

function orderSearchRunAll(){
  var inp=document.getElementById('orderSearchInput');
  if(inp) orderSearchMulti(inp.value);
}

function orderSearchClear(){
  var inp=document.getElementById('orderSearchInput');
  if(inp){inp.value='';inp.style.height='120px';}
  var res=document.getElementById('orderSearchResults');
  if(res) res.style.display='none';
  var clr=document.getElementById('orderSearchClear');
  if(clr) clr.style.display='none';
  var sr=document.getElementById('smartResult');
  if(sr) sr.innerHTML='';
}

function autoResizeTA(el){
  el.style.height='auto';
  el.style.height=Math.max(120,el.scrollHeight)+'px';
}

function setOrderMode(mode){ _orderMode=mode||'search'; }

function autoResizeTextarea(el){ autoResizeTA(el); }



// ═══════════════════════════════════════════════════════════════
// МОДУЛЬ: «ЗАКАЗ И КОРЗИНА» — таблица + создание заказа
// ═══════════════════════════════════════════════════════════════

var _orderRestId   = '';
var _orderRestName = '';
var _orderLegalEntityIds = [];
var _orderLegalEntityNames = [];
var _orderSups     = [];   // выбранные поставщики для заказа
var _orderHidden   = {};   // {rowKey: true} — скрытые ячейки
var _orderDraft    = {};   // {query:supplier -> выбранный вариант до добавления в корзину}
var _ossRowQuery   = '';   // поиск в прайсе: текущий запрос
var _ossSup        = '';   // поиск в прайсе: поставщик
var _pendingOrderTemplate = null;
var _orderDeliveryDate = '';
var _orderDeliveryFrom = '';
var _orderDeliveryTo   = '';

function getRestLegalEntities(rest){
  if(!rest) return [];
  var legalEntities=Array.isArray(rest.legalEntities)?rest.legalEntities.filter(Boolean):[];
  var assignedLegalEntities=Array.isArray(rest.assignedLegalEntities)&&rest.assignedLegalEntities.length
    ? rest.assignedLegalEntities.filter(Boolean)
    : legalEntities.slice();
  if(!assignedLegalEntities.length && rest.legalName) assignedLegalEntities=[rest.legalName];
  return assignedLegalEntities.filter(function(name,idx,arr){ return arr.indexOf(name)===idx; });
}

function renderOrderLegalList(restId){
  var listEl=document.getElementById('co-legal-list');
  var hintEl=document.getElementById('co-legal-hint');
  if(!listEl) return;
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  var legalEntities=getRestLegalEntities(rest);
  if(hintEl){
    hintEl.textContent=rest
      ? 'Выберите юр. лицо, от которого будет оформлен заказ. Можно выбрать несколько.'
      : 'Сначала выберите заведение.';
  }
  if(!rest){
    listEl.innerHTML='<div style="color:var(--t3);font-size:12px;">Заведение не выбрано.</div>';
    return;
  }
  if(!legalEntities.length){
    listEl.innerHTML='<div style="color:var(--rd);font-size:12px;">У этого заведения не настроены юр. лица для заказа.</div>';
    return;
  }
  if(legalEntities.length===1 && !_orderLegalEntityNames.length) _orderLegalEntityNames=[legalEntities[0]];
  listEl.innerHTML=legalEntities.map(function(name){
    var checked=_orderLegalEntityNames.indexOf(name)>=0;
    return '<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 6px;cursor:pointer;border-radius:6px;" onmouseover="this.style.background=\'var(--bg4)\'" onmouseout="this.style.background=\'\'">'
      +'<input type="checkbox" class="co-legal-cb" value="'+name.replace(/"/g,'&quot;')+'"'+(checked?' checked':'')+' style="width:15px;height:15px;cursor:pointer;accent-color:var(--ac);margin-top:2px;">'
      +'<div><div style="font-size:13px;font-weight:600;">'+name+'</div>'
      +'<div style="font-size:11px;color:var(--t3);">Доступно для этого заведения</div></div>'
      +'</label>';
  }).join('');
}

function useRestTemplate(restId, templateId){
  var db=dbGet();
  var rest=(db.restaurants||[]).find(function(r){ return r.id===restId; });
  var template=rest&&(rest.orderTemplates||[]).find(function(t){ return t.id===templateId; });
  if(!rest||!template){ toast('Шаблон не найден','err'); return; }
  _pendingOrderTemplate={
    restId:rest.id,
    restName:rest.name,
    templateId:template.id,
    templateName:template.name,
    items:(template.items||[]).map(function(item){ return item.name; }).join('\n'),
    supplierNames:(template.supplierNames||[]).slice()
  };
  openCreateOrder({restId:rest.id,supplierNames:_pendingOrderTemplate.supplierNames});
}

function applyPendingOrderTemplate(){
  if(!_pendingOrderTemplate) return;
  var tpl=_pendingOrderTemplate;
  var inp=document.getElementById('orderSearchInput');
  if(inp){
    inp.value=tpl.items||'';
    autoResizeTA(inp);
    orderSearchMulti(inp.value);
  }
  var smartResult=document.getElementById('smartResult');
  if(smartResult){
    smartResult.textContent='Применён шаблон: '+tpl.templateName;
  }
  renderOrderSmartSuggestions();
  _pendingOrderTemplate=null;
}

// ─────────────────────────────────────────────────────────────
// 1. ОТКРЫТИЕ МОДАЛА «СОЗДАТЬ ЗАКАЗ»
// ─────────────────────────────────────────────────────────────
function openCreateOrder(preset){
  var db = dbGet();
  preset=preset||null;
  if(!preset) _pendingOrderTemplate=null;
  _orderLegalEntityNames=[];

  // Заполнить список заведений
  var restSel = document.getElementById('co-rest');
  if(restSel){
    var allowedRestIds=getUserScopedRestaurantIds(CU, db);
    var rests = (db.restaurants||[]).filter(function(r){
      if(r.id==='r0') return false;
      if(CU && CU.role==='owner') return true;
      return allowedRestIds.indexOf(r.id)>=0;
    });
    restSel.innerHTML = '<option value="">— выберите заведение —</option>'
      + rests.map(function(r){
          return '<option value="'+r.id+'">'+(r.emoji||'🍽️')+' '+r.name+'</option>';
        }).join('');
    // Предвыбрать активное
    if(preset&&preset.restId) restSel.value=preset.restId;
    else if(activeRest && activeRest.id !== 'r0') restSel.value = activeRest.id;
    restSel.onchange=function(){ _orderLegalEntityNames=[]; _orderRestId=this.value; renderOrderLegalList(this.value); renderOrderSmartSuggestions(); };
  }
  _orderRestId=restSel&&restSel.value?restSel.value:'';
  renderOrderLegalList(restSel&&restSel.value?restSel.value:'');
  renderOrderSmartSuggestions();

  // Заполнить список поставщиков
  _orderSups=(preset&&Array.isArray(preset.supplierNames)?preset.supplierNames.slice():[]).filter(Boolean);
  _renderOrderSupList('');

  var errEl = document.getElementById('co-err');
  if(errEl) errEl.textContent = '';
  var si = document.getElementById('co-sup-search');
  if(si) si.value = '';

  openModal('createOrder');
}

function _renderOrderSupList(filter){
  var listEl = document.getElementById('co-sups-list');
  if(!listEl) return;
  var q = (filter||'').toLowerCase();
  var sups = getUserVisibleSuppliers(CU).filter(function(s){
    return !s.hidden && (!q || s.name.toLowerCase().includes(q));
  });
  listEl.innerHTML = sups.length ? sups.map(function(s){
    var checked = _orderSups.indexOf(s.name) >= 0;
    return '<label style="display:flex;align-items:center;gap:10px;padding:7px 6px;cursor:pointer;'
      +'border-radius:6px;" onmouseover="this.style.background=\'var(--bg4)\'" onmouseout="this.style.background=\'\'">'
      +'<input type="checkbox" class="co-sup-cb" value="'+s.name+'"'+(checked?' checked':'')
      +' style="width:15px;height:15px;cursor:pointer;accent-color:var(--ac);">'
      +'<div><div style="font-size:13px;font-weight:600;">'+s.name+'</div>'
      +'<div style="font-size:11px;color:var(--t3);">'+s.type+'</div></div>'
      +'</label>';
  }).join('')
  : '<div style="color:var(--t3);padding:12px;font-size:13px;">Нет поставщиков. Добавьте в разделе «Поставщики».</div>';
}

function filterOrderSupList(val){ _renderOrderSupList(val); }

function selectAllOrderSups(val){
  document.querySelectorAll('.co-sup-cb').forEach(function(cb){ cb.checked = val; });
}

function getPriceImportLegalOptions(){
  var db = dbGet();
  var scopeKey = getPriceImportOrganizationKey(CU);
  var map = {};
  var legalByName = [];
  (db.restaurants || []).forEach(function(rest){
    if(!rest || rest.id === 'r0') return;
    if(CU && CU.role !== 'owner' && CU.role !== 'admin'){
      var allowedIds = getUserScopedRestaurantIds(CU, db);
      if(allowedIds.indexOf(rest.id) < 0) return;
    }
    var legalNames = getRestLegalEntities(rest);
    legalNames.forEach(function(name){
      var key = _legalEntityId(scopeKey, name);
      if(!map[key]){
        map[key] = true;
        legalByName.push({
          id: key,
          name: name,
          orgKey: scopeKey,
          orgName: rest.brandName || rest.legalName || rest.name || ''
        });
      }
    });
  });
  return legalByName;
}

function getSelectedSupPriceLegalIds(){
  var ids = [];
  document.querySelectorAll('.sup-price-legal-cb:checked').forEach(function(cb){
    if(cb.value && ids.indexOf(cb.value) < 0) ids.push(cb.value);
  });
  return ids;
}

function getSelectedSupPriceLegalNames(){
  var names = [];
  document.querySelectorAll('.sup-price-legal-cb:checked').forEach(function(cb){
    var name = cb.dataset.name || cb.value || '';
    if(name && names.indexOf(name) < 0) names.push(name);
  });
  return names;
}

function selectAllSupPriceLegals(val){
  document.querySelectorAll('.sup-price-legal-cb').forEach(function(cb){ cb.checked = val; });
  _supplierImportCaptureLegalState();
}

function openSupPriceLists(supName){
  openModal('supplierPriceLists');
  var scope = _getCurrentPriceScope();
  var orgKey = _normalizeOrgKey(scope.organizationId || getPriceImportOrganizationKey(CU));
  var legalIds = _uniqList(scope.legalEntityIds || []);
  var legalNames = _uniqList(scope.legalEntityNames || []);
  var lists = (SUP_PRICE_LISTS || []).filter(function(list){
    if(!list) return false;
    if(String(list.supplierName || '').toLowerCase() !== String(supName || '').toLowerCase()) return false;
    var listOrg = _normalizeOrgKey(list.organizationId || '');
    var listLegalIds = _uniqList(list.legalEntityIds || []);
    var listLegalNames = _uniqList(list.legalEntityNames || []);
    var orgMatch = !listOrg || !orgKey || listOrg === orgKey;
    var legalMatch = !legalIds.length
      || !listLegalIds.length && !listLegalNames.length
      || listLegalIds.some(function(id){ return legalIds.indexOf(id) >= 0; })
      || listLegalNames.some(function(name){ return legalNames.indexOf(name) >= 0; });
    return orgMatch && legalMatch;
  });
  var body = document.getElementById('supplierPriceListsBody');
  var title = document.getElementById('supplierPriceListsTitle');
  var hint = document.getElementById('supplierPriceListsHint');
  if(title) title.textContent = 'Прайсы поставщика: ' + supName;
  if(hint) hint.textContent = 'Организация: ' + (orgKey || 'default') + ' · прайсы текущей организации и её юр. лиц';
  if(body){
    if(!lists.length){
      body.innerHTML = '<div style="padding:16px;color:var(--t3);font-size:12px;">Для этого поставщика пока нет сохранённых прайсов.</div>';
    }else{
      body.innerHTML = '<div style="overflow:auto;max-height:360px;"><table style="width:100%;border-collapse:collapse;">'
        + '<thead><tr style="background:var(--bg3);">'
        + '<th style="padding:10px 12px;text-align:left;border-bottom:1px solid var(--br);">Прайс</th>'
        + '<th style="padding:10px 12px;text-align:left;border-bottom:1px solid var(--br);">Юр. лица</th>'
        + '<th style="padding:10px 12px;text-align:left;border-bottom:1px solid var(--br);">Дата</th>'
        + '<th style="padding:10px 12px;text-align:left;border-bottom:1px solid var(--br);">Статус</th>'
        + '</tr></thead><tbody>'
        + lists.map(function(list){
          var legalText = _uniqList(list.legalEntityNames || []).join(' · ') || '—';
          var status = list.active ? '<span class="badge bg">Активен</span>' : '<span class="badge bgr">Архив</span>';
          return '<tr>'
            + '<td style="padding:10px 12px;border-bottom:1px solid var(--br);"><b>'+_esc(list.priceName || 'Прайс')+'</b><div style="font-size:11px;color:var(--t3);margin-top:3px;">'+_esc(list.sourceFile || '')+'</div></td>'
            + '<td style="padding:10px 12px;border-bottom:1px solid var(--br);font-size:12px;color:var(--t2);">'+_esc(legalText)+'</td>'
            + '<td style="padding:10px 12px;border-bottom:1px solid var(--br);font-size:12px;color:var(--t2);">'+_esc(String(list.uploadedAt || '').replace('T', ' ').slice(0, 16))+'</td>'
            + '<td style="padding:10px 12px;border-bottom:1px solid var(--br);">'+status+'</td>'
          + '</tr>';
        }).join('')
        + '</tbody></table></div>';
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 2. ПОДТВЕРЖДЕНИЕ СОЗДАНИЯ ЗАКАЗА
// ─────────────────────────────────────────────────────────────
function submitCreateOrder(){
  var errEl  = document.getElementById('co-err');
  var restSel = document.getElementById('co-rest');
  var restId  = restSel ? restSel.value : '';
  var db = dbGet();

  if(!restId){ if(errEl) errEl.textContent='Выберите заведение'; return; }
  var legalSelections=[];
  document.querySelectorAll('.co-legal-cb:checked').forEach(function(cb){ legalSelections.push(cb.value); });
  if(!legalSelections.length){ if(errEl) errEl.textContent='Выберите хотя бы одно юр. лицо для заказа'; return; }

  var sels = [];
  document.querySelectorAll('.co-sup-cb:checked').forEach(function(cb){ sels.push(cb.value); });
  if(!sels.length){ if(errEl) errEl.textContent='Выберите хотя бы одного поставщика'; return; }

  _orderRestId   = restId;
  var rest = (db.restaurants||[]).find(function(r){ return r.id === restId; });
  _orderRestName = rest ? (rest.emoji||'')+'  '+rest.name : restId;
  _orderLegalEntityIds = legalSelections.map(function(name){ return String(name).toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,''); });
  _orderLegalEntityNames = legalSelections.slice();
  _orderSups     = sels;
  _orderHidden   = {};
  _orderDraft    = {};
  _orderDeliveryDate = (document.getElementById('co-delivery-date')||{value:''}).value || '';
  _orderDeliveryFrom = (document.getElementById('co-delivery-from')||{value:''}).value || '';
  _orderDeliveryTo   = (document.getElementById('co-delivery-to')||{value:''}).value || '';

  // Обновить активный ресторан
  if(rest){ activeRest = {id:rest.id, name:rest.name, emoji:rest.emoji||'🍽️'}; }

  closeModal('createOrder');
  buildOrderTable();
  applyPendingOrderTemplate();
  renderOrderSmartSuggestions();
  toast('Заказ создан: '+_orderRestName+' · '+sels.length+' поставщиков','ok');
}

// ─────────────────────────────────────────────────────────────
// 3. ПОСТРОЕНИЕ ТАБЛИЦЫ ЗАКАЗА
// ─────────────────────────────────────────────────────────────
function buildOrderTable(){
  // Показать секцию
  var sec = document.getElementById('orderTableSection');
  if(sec) sec.style.display = 'block';

  // Заголовок
  var titleEl = document.getElementById('orderTableTitle');
  if(titleEl) titleEl.textContent = 'Заказ: '+_orderRestName;
  var subEl = document.getElementById('orderTableSub');
  if(subEl) subEl.textContent = 'Юр. лицо: '+(_orderLegalEntityNames.join(' · ')||'не выбрано')+' · Поставщики: '+_orderSups.join(' · ');

  _renderOrderTable('');
}

function _renderOrderTable(filter){
  var sups = _orderSups;
  var thead = document.getElementById('orderTableHead');
  var tbody = document.getElementById('orderTableBody');
  if(!thead || !tbody) return;

  var q = (filter||'').toLowerCase();

  // Собрать уникальные товары по ключевому слову из поиска
  // или по всем товарам если поиск пуст
  var rows = _buildOrderRows(q, sups);

  // THEAD
  thead.innerHTML = '<tr style="background:var(--bg3);">'
    +'<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;'
    +'border:1px solid var(--br);min-width:160px;position:sticky;left:0;background:var(--bg3);z-index:2;">Наименование</th>'
    + sups.map(function(s){
        return '<th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:700;'
          +'border:1px solid var(--br);min-width:180px;">'+s+'</th>';
      }).join('')
    +'</tr>';

  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="'+(sups.length+1)+'" style="text-align:center;'
      +'color:var(--t3);padding:40px;">'+(q?'Ничего не найдено по «'+q+'»':'Введите товары в поиске выше')+'</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function(row, ri){
    var displayItems = sups.map(function(sup){
      var baseCell = row.cells[sup];
      return baseCell ? _orderDisplayEntry(row.query, sup, baseCell) : null;
    });
    var allPrices = displayItems.map(function(item){ return item ? parseFloat(item.price) || 0 : 0; }).filter(Boolean);
    var minP = allPrices.length ? Math.min.apply(null, allPrices) : 0;
    var rowBg = ri%2===0 ? 'var(--bg2)' : 'var(--bg)';

    var cells = sups.map(function(sup){
      var hKey = row.query+':'+sup;
      if(_orderHidden[hKey]){
        return '<td style="border:1px solid var(--br);padding:6px;background:'+rowBg+';">'
          +'<div style="text-align:center;">'
          +'<button onclick="orderShowCell(\''+_esc(row.query)+'\',\''+_esc(sup)+'\')"'
          +' style="font-size:10px;color:var(--t4);background:none;border:none;cursor:pointer;padding:4px;">показать</button>'
          +'</div></td>';
      }

      var cell = row.cells[sup];
      if(!cell){
        return '<td style="border:1px solid var(--br);padding:8px;text-align:center;'
          +'color:var(--t4);font-size:12px;background:'+rowBg+';">—</td>';
      }

      var currentOrderItem = _orderDisplayEntry(row.query, sup, cell);
      var currentPrice = parseFloat(currentOrderItem ? currentOrderItem.price : cell.price) || 0;
      var isBest = currentPrice && currentPrice===minP && allPrices.length>1;
      var cellBg = isBest ? 'var(--grD)' : rowBg;
      var currentCartItem = _orderCartEntryByQuery(row.query, sup);
      var inCart = !!currentCartItem;
      var replacedFrom = currentOrderItem && currentOrderItem.replacedFrom ? currentOrderItem.replacedFrom : '';
      var activeBorder = inCart ? 'var(--ac)' : (isBest ? 'var(--gr)' : 'var(--br)');
      var activeBg = inCart ? 'rgba(91,163,245,.11)' : cellBg;

      return '<td data-order-row="'+_cssAttrVal(row.query)+'" data-order-sup="'+_cssAttrVal(sup)+'" style="padding:6px 8px;border:1px solid '+activeBorder+';'
        +'background:'+activeBg+';vertical-align:top;position:relative;">'
        // Метка лучшей цены
        +(isBest?'<div style="position:absolute;top:0;right:0;background:var(--gr);color:#fff;'
          +'font-size:9px;font-weight:700;padding:2px 6px;border-radius:0 0 0 4px;">лучшая</div>':'')
        +(inCart?'<div style="position:absolute;top:0;left:0;background:var(--ac);color:#fff;'
          +'font-size:9px;font-weight:700;padding:2px 6px;border-radius:0 0 4px 0;">в корзине</div>':'')
        // Карточка товара
        +'<div style="font-size:11px;color:var(--t3);margin-bottom:2px;padding-right:'+(isBest?'36':'0')+'px;'
          +(inCart?'font-weight:700;color:var(--ac);':'')+'">'
          +(replacedFrom
            ? '<span style="display:inline-block;padding:2px 6px;margin-right:6px;border-radius:999px;background:var(--orD);color:var(--or);font-size:9px;font-weight:800;">замена</span>'
            : '')
          +(currentOrderItem ? currentOrderItem.name : cell.item.name)
        +'</div>'
        +(replacedFrom
          ? '<div style="font-size:10px;color:var(--or);font-weight:800;margin-bottom:3px;line-height:1.35;">'
            +'было: '+_esc(replacedFrom)+'<br>стало: '+_esc(currentOrderItem.name)
            +'</div>'
          : '')
        +'<div style="font-size:15px;font-weight:800;color:'+(isBest?'var(--gr)':'var(--ac)')+';margin-bottom:6px;">'
          +'₽'+_fmtPrice(currentPrice)
          +'<span style="font-size:11px;font-weight:400;color:var(--t3);"> / '+(currentOrderItem ? currentOrderItem.unit : cell.item.unit)+'</span>'
        +'</div>'
        // Кнопки
        +'<div style="display:flex;gap:4px;align-items:center;">'
          // Лупа
          +'<button onclick="openOrderSupSearch(\''+_esc(row.query)+'\',\''+_esc(sup)+'\')"'
            +' title="Поиск в прайсе '+sup+'"'
            +' style="background:var(--bg2);border:1px solid var(--br);border-radius:var(--r);'
              +'padding:4px 7px;font-size:13px;cursor:pointer;">🔍</button>'
          +'<button onclick="_orderToggleInvoiceGroup(\''+_esc(row.query)+'\',\''+_esc(sup)+'\')"'
            +' title="Переключить на доп. накладную"'
            +' style="background:'+(currentOrderItem && currentOrderItem.invoiceGroup==='extra'?'var(--orD)':'var(--bg2)')+';color:'+(currentOrderItem && currentOrderItem.invoiceGroup==='extra'?'var(--or)':'var(--t2)')+';'
              +'border:1px solid '+(currentOrderItem && currentOrderItem.invoiceGroup==='extra'?'var(--or)':'var(--br)')+';border-radius:var(--r);'
              +'padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">'
            +((currentOrderItem && currentOrderItem.invoiceGroup==='extra')?'Доп. накладная':'Основная')
          +'</button>'
          // В корзину / В корзине
          +(inCart
            ?'<button onclick="orderRemove(\''+_esc(currentCartItem.name)+'\',\''+_esc(sup)+'\',\''+_esc(row.query)+'\')"'
               +' style="flex:1;background:var(--ac);color:#fff;border:none;border-radius:var(--r);'
                 +'padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">✓ В заказе</button>'
            :'<button onclick="orderAddFromTable(\''+_esc(row.query)+'\',\''+_esc(currentOrderItem.name)+'\',\''+_esc(sup)+'\','+currentOrderItem.price+',\''+_esc(currentOrderItem.unit)+'\')"'
               +' style="flex:1;background:var(--aD);color:var(--ac);border:1px solid var(--ac);border-radius:var(--r);'
                 +'padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;" title="+ В заказ">🛒 В заказ</button>')
          // Скрыть
          +'<button onclick="orderHideCell(\''+_esc(row.query)+'\',\''+_esc(sup)+'\')"'
            +' title="Скрыть от закупщика"'
            +' style="background:var(--bg2);border:1px solid var(--br);border-radius:var(--r);'
              +'padding:4px 6px;font-size:11px;cursor:pointer;color:var(--t4);">✕</button>'
        +'</div>'
      +'</td>';
    }).join('');

    return '<tr data-query="'+_esc(row.query)+'">'
      +'<td style="border:1px solid var(--br);padding:10px 14px;font-size:13px;font-weight:700;'
        +'position:sticky;left:0;background:'+rowBg+';z-index:1;vertical-align:middle;">'
        +row.query
      +'</td>'
      +cells
      +'</tr>';
  }).join('');
}

// Собрать строки для таблицы
function _buildOrderRows(filter, sups){
  // Берём запросы из textarea поиска ИЛИ из всех товаров
  var inp = document.getElementById('orderSearchInput');
  var lines = (inp && inp.value.trim())
    ? inp.value.split(/\n/).map(function(l){return l.trim();}).filter(Boolean)
    : [];

  // Если нет строк — взять топ товаров из прайсов
  if(!lines.length){
    var names = {};
    sups.forEach(function(sup){
      SUP_PRODS.filter(function(p){ return (p._supplier||p.supplier)===sup && canSeePrices(p); })
        .slice(0,20)
        .forEach(function(p){ names[p.name] = true; });
    });
    lines = Object.keys(names).slice(0,30);
  }

  var q = filter.toLowerCase();

  return lines
    .filter(function(line){ return !q || line.toLowerCase().includes(q); })
    .map(function(line){
      var keyword = _extractKeyword(line);
      var cells = {};
      sups.forEach(function(sup){
        var found = _findBestForSupplier(keyword, sup);
        if(found) cells[sup] = found;
      });
      return {query:line, keyword:keyword, cells:cells};
    });
}

function filterOrderTable(val){ _renderOrderTable(val); }
function closeOrderTable(){
  var s = document.getElementById('orderTableSection');
  if(s) s.style.display = 'none';
}

// Скрыть/показать ячейку
function orderHideCell(query, sup){
  _orderHidden[query+':'+sup] = true;
  _renderOrderTable((document.getElementById('orderTableSearch')||{value:''}).value);
}
function orderShowCell(query, sup){
  delete _orderHidden[query+':'+sup];
  _renderOrderTable((document.getElementById('orderTableSearch')||{value:''}).value);
}

function _orderDraftKey(query, sup){
  return (query||'')+':'+(sup||'');
}

function _orderDraftEntryByQuery(query, sup){
  return _orderDraft[_orderDraftKey(query, sup)] || null;
}

function _orderSetDraftEntry(query, sup, item){
  _orderDraft[_orderDraftKey(query, sup)] = {
    name: item.name,
    price: item.price,
    unit: item.unit || 'кг',
    _type: item._type || 'main',
    replacedFrom: item.replacedFrom || ''
  };
}

function _orderCartEntryByQuery(query, sup){
  return cart.find(function(c){
    return c.supplier===sup && (c._orderQuery||'')===query;
  }) || null;
}

function _orderHasEntry(query, sup){
  return !!_orderCartEntryByQuery(query, sup);
}

function _orderDisplayEntry(query, sup, fallback){
  return _orderDraftEntryByQuery(query, sup)
    || _orderCartEntryByQuery(query, sup)
    || {
      name: fallback.item.name,
      price: fallback.price,
      unit: fallback.item.unit,
      _type: fallback.item._type || 'main',
      invoiceGroup: fallback.item.invoiceGroup || 'main',
      replacedFrom: ''
    };
}

function refreshOrderWorkspaceImmediate(){
  try{
    updBdg();
    renderCart();
    _renderOrderTable((document.getElementById('orderTableSearch')||{value:''}).value);
    var searchInp = document.getElementById('orderSearchInput');
    if(searchInp && searchInp.value) orderSearch(searchInp.value);
    var searchResults = document.getElementById('orderSearchResults');
    if(searchResults && searchResults.style.display !== 'none'){
      orderSearchMulti(searchInp ? searchInp.value : '');
    }
  }catch(err){}
  flashCartUI();
}

function _orderUpsertItem(query, name, sup, price, unit, itemType, qty){
  var q = query || name;
  var prod = PRODUCTS.find(function(p){ return p.name===name; }) || {id:Date.now(), emoji:''};
  var normalizedQty=Math.max(0.001, parseFloat(qty)||1);
  var selected = _orderDraftEntryByQuery(q, sup);
  var replacementLabel = selected && selected.name===name ? (selected.replacedFrom || '') : '';
  var selectedInvoice = selected && selected.invoiceGroup ? selected.invoiceGroup : 'main';
  var existing = cart.findIndex(function(c){
    return c.supplier===sup && (c._orderQuery||'')===q;
  });

  if(existing >= 0){
    cart[existing] = Object.assign({}, cart[existing], {
      pid: prod.id || cart[existing].pid || Date.now(),
      name: name,
      emoji: prod.emoji || cart[existing].emoji || '',
      supplier: sup,
      price: price,
      qty: normalizedQty,
      unit: unit || cart[existing].unit || 'кг',
      _type: itemType || cart[existing]._type || 'main',
      invoiceGroup: selectedInvoice || cart[existing].invoiceGroup || 'main',
      _orderQuery: q,
      replacedFrom: replacementLabel || cart[existing].replacedFrom || ''
    });
    refreshOrderWorkspaceImmediate();
    return 'replaced';
  }

  cart.push({
    pid: prod.id || Date.now(),
    name: name,
    emoji: prod.emoji || '',
    supplier: sup,
    price: price,
    qty: normalizedQty,
    unit: unit || 'кг',
    comment: '',
    _type: itemType || 'main',
    invoiceGroup: selectedInvoice,
    _orderQuery: q,
    replacedFrom: replacementLabel
  });
  refreshOrderWorkspaceImmediate();
  return 'added';
}

function _orderToggleInvoiceGroup(query, sup){
  var existingCart = _orderCartEntryByQuery(query, sup);
  var existingDraft = _orderDraftEntryByQuery(query, sup);
  var current = existingCart || existingDraft || null;
  var nextGroup = current && current.invoiceGroup === 'extra' ? 'main' : 'extra';
  var currentName = current ? current.name : query;
  var currentPrice = current ? current.price : 0;
  var currentUnit = current ? current.unit : 'кг';
  var currentType = current ? current._type : 'main';
  var currentReplacedFrom = current && current.replacedFrom ? current.replacedFrom : '';

  if(existingCart){
    existingCart.invoiceGroup = nextGroup;
  } else {
    _orderSetDraftEntry(query, sup, {
      name: currentName,
      price: currentPrice,
      unit: currentUnit,
      _type: currentType,
      invoiceGroup: nextGroup,
      replacedFrom: currentReplacedFrom
    });
  }

  refreshOrderWorkspaceImmediate();
}

// Добавить в корзину из таблицы заказа
function orderAddFromTable(query, name, sup, price, unit, qtyInputId){
  var selected = _orderDraftEntryByQuery(query, sup);
  var finalName = selected ? selected.name : name;
  var finalPrice = selected ? selected.price : price;
  var finalUnit = selected ? selected.unit : unit;
  var finalType = selected ? selected._type : 'main';
  var qtyEl = qtyInputId ? document.getElementById(qtyInputId) : null;
  var finalQty = qtyEl ? Math.max(0.001, parseFloat(qtyEl.value)||1) : 1;
  var mode = _orderUpsertItem(query, finalName, sup, finalPrice, finalUnit, finalType, finalQty);
  var rowNode = document.querySelector('[data-order-row="'+_cssAttrVal(query)+'"][data-order-sup="'+_cssAttrVal(sup)+'"]');
  if(rowNode){
    rowNode.classList.add('order-in-cart');
    rowNode.classList.add('order-in-cart-locked');
    rowNode.style.background = 'rgba(91,163,245,.11)';
    rowNode.style.borderColor = 'var(--ac)';
  }
  toast(mode==='replaced'
    ? '«'+finalName+'» → '+sup+' обновлён в корзине'
    : '«'+finalName+'» → '+sup+' добавлен в корзину','ok');
}

// ─────────────────────────────────────────────────────────────
// 4. ПОИСК В ПРАЙСЕ ПОСТАВЩИКА (лупа в таблице)
// ─────────────────────────────────────────────────────────────
function openOrderSupSearch(rowQuery, supName){
  _ossRowQuery = rowQuery;
  _ossSup      = supName;

  var lbl = document.getElementById('oss-sup-label');
  var current = _orderDraftEntryByQuery(rowQuery, supName) || _orderCartEntryByQuery(rowQuery, supName);
  if(lbl) lbl.textContent = 'Поставщик: «'+supName+'» · позиция: «'+rowQuery+'»'
    +(current ? ' · сейчас выбран: «'+current.name+'»' : '');

  var inp = document.getElementById('oss-input');
  if(inp){ inp.value = _extractKeyword(rowQuery); }

  ossFilter(_extractKeyword(rowQuery));
  openModal('orderSupSearch');
}

function ossFilter(val){
  var el = document.getElementById('oss-results');
  if(!el) return;
  var q   = (val||'').toLowerCase().trim();
  var sup = _ossSup;

  // Собрать все товары поставщика (основной + доп.прайс)
  var items = SUP_PRODS.filter(function(p){
    return (p._supplier||p.supplier)===sup
      && canSeePrices(p)
      && (!q || p.name.toLowerCase().includes(q));
  });

  // Сортировка: основные первыми, потом доп.
  items.sort(function(a,b){
    var aMain = a._type!=='additional' ? 0 : 1;
    var bMain = b._type!=='additional' ? 0 : 1;
    if(aMain!==bMain) return aMain-bMain;
    return a.name.localeCompare(b.name,'ru');
  });

  if(!items.length){
    el.innerHTML='<div style="color:var(--t3);padding:20px;text-align:center;font-size:13px;">'
      +(q?'Ничего не найдено по «'+val+'»':'Прайс пуст')+'</div>';
    return;
  }

  el.innerHTML = items.map(function(p){
    var price = p.pKg||p.pSh||p.pL||p.pMl||0;
    var isAdd = p._type==='additional';
    var current = _orderDraftEntryByQuery(_ossRowQuery, sup) || _orderCartEntryByQuery(_ossRowQuery, sup);
    var selected = current && current.name===p.name && (current._type||'main')===(p._type||'main');
    var typeBadge = isAdd
      ? '<span style="font-size:10px;background:rgba(171,125,248,.2);color:#ab7df8;border:1px solid #ab7df8;'
        +'border-radius:3px;padding:1px 5px;margin-left:5px;font-weight:700;">доп</span>'
      : '';

    return '<div style="display:flex;align-items:center;justify-content:space-between;'
      +'padding:9px 14px;border-bottom:1px solid var(--br);gap:12px;">'
      +'<div style="flex:1;">'
        +'<div style="font-size:13px;font-weight:600;">'+p.name+typeBadge+'</div>'
        +'<div style="font-size:11px;color:var(--t3);">'+(p.unit||'кг')
          +(price?' · <b style="color:'+(isAdd?'#ab7df8':'var(--ac)')+';">₽'+_fmtPrice(price)+'</b>':'')
          +(isAdd?'<span style="color:var(--t4);"> · доп.прайс</span>':'')
        +'</div>'
      +'</div>'
      +'<button onclick="ossSelect(\''+_esc(p.name)+'\','+price+',\''+_esc(p.unit||'кг')+'\',\''+_esc(p._type||'main')+'\')"'
        +' style="background:'+(selected?'var(--ac)':'var(--aD)')+';color:'+(selected?'#fff':'var(--ac)')+';'
          +'border:'+(selected?'none':'1px solid var(--ac)')+';border-radius:var(--r);'
          +'padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">'
        +(selected?'✓ Выбран':'Заменить')
      +'</button>'
    +'</div>';
  }).join('');
}
function ossSelect(itemName, price, unit, itemType){
  var sup   = _ossSup;
  var itype = itemType || 'main';
  var current = _orderDraftEntryByQuery(_ossRowQuery, sup) || _orderCartEntryByQuery(_ossRowQuery, sup);

  _orderSetDraftEntry(_ossRowQuery, sup, {
    name: itemName,
    price: price,
    unit: unit || 'кг',
    _type: itype,
    invoiceGroup: current && current.invoiceGroup ? current.invoiceGroup : 'main',
    replacedFrom: current && current.name !== itemName ? current.name : ''
  });
  var rowNode = document.querySelector('[data-order-row="'+_cssAttrVal(_ossRowQuery)+'"][data-order-sup="'+_cssAttrVal(sup)+'"]');
  if(rowNode){
  rowNode.classList.add('order-replaced');
  rowNode.style.background = 'rgba(224,123,42,.08)';
  rowNode.style.borderColor = 'var(--or)';
  }
  refreshOrderWorkspaceImmediate();
  closeModal('orderSupSearch');
  toast('Вариант заменён: «'+itemName+'» → '+sup+(itype==='additional'?' (доп)':'')+'. Для добавления нажмите 🛒.','ok');
}

function _ossAddToOrder(query, itemName, price, unit, sup, itype){
  return _orderUpsertItem(query, itemName, sup, price, unit, itype);
}
function _fmtPrice(n){
  if(!n && n!==0) return '0';
  var num = parseFloat(n);
  if(isNaN(num)) return '0';
  // Формат: 1 234.56
  return num % 1 === 0
    ? Math.round(num).toLocaleString('ru')
    : num.toLocaleString('ru',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function _cssAttrVal(v){
  return String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/]/g,'\\]');
}

// Приведение цены из поля ввода к числу
function _parseInputPrice(val){
  if(!val && val!==0) return 0;
  var s = val.toString().replace(/\s/g,'').replace(',','.').replace(/[^\d.]/g,'');
  var parts = s.split('.');
  if(parts.length>2) s = parts.slice(0,-1).join('')+'.'+parts[parts.length-1];
  var n = parseFloat(s);
  return isNaN(n)||n<0 ? 0 : Math.round(n*100)/100;
}

function _collectMappedParts(parts, cols){
  if(!Array.isArray(cols) || !cols.length) return [];
  var out = [];
  cols.forEach(function(col){
    if(col < 0 || !parts || col >= parts.length) return;
    var val = parts[col];
    val = val === null || val === undefined ? '' : String(val).trim();
    if(val) out.push(val);
  });
  return out;
}

function _collectJoinedText(parts, cols){
  return _collectMappedParts(parts, cols).join(' ').replace(/\s+/g,' ').trim();
}

function _collectFirstPrice(parts, cols){
  if(!Array.isArray(cols) || !cols.length) return 0;
  for(var i=0; i<cols.length; i++){
    var col = cols[i];
    if(col < 0 || !parts || col >= parts.length) continue;
    var price = _parseInputPrice(parts[col]);
    if(price > 0) return price;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────
// 6. РЕДАКТИРУЕМАЯ ТАБЛИЦА ПРАЙСА
// ─────────────────────────────────────────────────────────────

// Глобальное хранилище редактируемых строк прайса
var _priceEditRows = []; // [{name, unit, price}]
var _priceEditLayout = null;
var _priceEditContext = null; // {rows, supName, append, priceName, allowedUserIds}
var _priceEditContainerId = 'pricePreviewTable';
var _mcmLayout = null;
var _mcmMaxCols = 0;
var _mcmSelectedRoleByCol = {};

function renderPriceEditTable(rows, layout, supName, append, priceName, allowedUserIds, containerId){
  _priceEditLayout  = layout;
  _priceEditContext = {rows:rows, supName:supName, append:append, priceName:priceName, allowedUserIds:allowedUserIds};
  _priceEditContainerId = containerId || 'pricePreviewTable';

  // Извлечь данные строк после заголовка
  var headerRow = layout.headerRow >= 0 ? layout.headerRow : 0;
  _priceEditRows = [];

  var cleaned = cleanRows(rows, headerRow);
  cleaned.forEach(function(parts){
    var name  = _collectJoinedText(parts, layout.nameCols);
    var unit  = _collectJoinedText(parts, layout.unitCols);
    var price = _collectFirstPrice(parts, layout.priceCols);
    var price2 = _collectFirstPrice(parts, layout.price2Cols);
    if((!price || price<=0) && price2 > 0) price = price2;
    if(!name) return;
    _priceEditRows.push({name:name, unit:unit, price:price, price2:price2});
  });

  _renderEditTable();
}

function _renderEditTable(){
  var el = document.getElementById(_priceEditContainerId || 'pricePreviewTable');
  if(!el) return;

  var units = ['кг','г','шт','л','мл','пачка','бут.','уп.'];
  var unitOpts = units.map(function(u){return '<option>'+u+'</option>';}).join('');

  var html = '<div style="overflow-x:auto;max-height:360px;overflow-y:auto;'
    +'border:1px solid var(--br);border-radius:var(--r);box-shadow:0 1px 0 rgba(0,0,0,.02);">'
    +'<table style="border-collapse:collapse;width:100%;min-width:680px;font-size:13px;">'
    +'<thead><tr style="background:var(--bg3);position:sticky;top:0;z-index:1;">'
    +'<th style="padding:8px 10px;text-align:left;border:1px solid var(--br);min-width:220px;">Наименование</th>'
    +'<th style="padding:8px 10px;text-align:center;border:1px solid var(--br);min-width:80px;">Единица</th>'
    +'<th style="padding:8px 10px;text-align:right;border:1px solid var(--br);min-width:110px;">Цена 1, ₽</th>'
    +'<th style="padding:8px 10px;text-align:right;border:1px solid var(--br);min-width:110px;">Цена 2, ₽</th>'
    +'<th style="padding:8px 10px;border:1px solid var(--br);width:36px;"></th>'
    +'</tr></thead><tbody>';

  _priceEditRows.forEach(function(row, i){
    html += '<tr>'
      +'<td style="padding:4px 6px;border:1px solid var(--br);">'
        +'<input value="'+_esc(row.name)+'" oninput="_priceEditRows['+i+'].name=this.value"'
          +' style="width:100%;background:transparent;border:none;outline:none;font-size:13px;color:var(--tx);padding:4px;">'
      +'</td>'
      +'<td style="padding:4px 6px;border:1px solid var(--br);text-align:center;">'
        +'<select onchange="_priceEditRows['+i+'].unit=this.value"'
          +' style="background:var(--bg3);border:1px solid var(--br);border-radius:4px;padding:3px 6px;font-size:12px;color:var(--tx);outline:none;">'
          + units.map(function(u){
              return '<option'+(u===row.unit?' selected':'')+'>'+u+'</option>';
            }).join('')
        +'</select>'
      +'</td>'
      +'<td style="padding:4px 6px;border:1px solid var(--br);">'
        +'<input type="text" value="'+_fmtPrice(row.price)+'"'
          +' oninput="_priceEditRows['+i+'].price=_parseInputPrice(this.value)"'
          +' onblur="this.value=_fmtPrice(_priceEditRows['+i+'].price)"'
          +' pattern="[0-9.,]*"'
          +' style="width:100%;background:transparent;border:none;outline:none;font-size:13px;'
            +'color:var(--ac);font-weight:700;text-align:right;padding:4px;">'
      +'</td>'
      +'<td style="padding:4px 6px;border:1px solid var(--br);">'
        +'<input type="text" value="'+_fmtPrice(row.price2||0)+'"'
          +' oninput="_priceEditRows['+i+'].price2=_parseInputPrice(this.value)"'
          +' onblur="this.value=_fmtPrice(_priceEditRows['+i+'].price2||0)"'
          +' pattern="[0-9.,]*"'
          +' style="width:100%;background:transparent;border:none;outline:none;font-size:13px;'
            +'color:var(--ac);font-weight:700;text-align:right;padding:4px;">'
      +'</td>'
      +'<td style="padding:4px 6px;border:1px solid var(--br);text-align:center;">'
        +'<button onclick="priceDeleteRow('+i+')"' 
          +' style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);'
            +'border-radius:4px;padding:2px 6px;font-size:11px;cursor:pointer;" title="Удалить строку">✕</button>'
      +'</td>'
    +'</tr>';
  });

  html += '</tbody></table></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;color:var(--t3);margin-top:6px;">'
    +'<span>'+_priceEditRows.length+' строк</span>'
    +'<span>Кликните по строке, чтобы отредактировать</span>'
    +'</div>';

  el.innerHTML = html;
}

function priceDeleteRow(i){
  _priceEditRows.splice(i, 1);
  _renderEditTable();
}

function priceAddRow(){
  _priceEditRows.push({name:'', unit:'кг', price:0, price2:0});
  _renderEditTable();
  // Скроллим к последней строке
  setTimeout(function(){
    var el = document.getElementById('pricePreviewTable');
    if(el) el.scrollTop = el.scrollHeight;
  },50);
}

// Сохранить отредактированный прайс
function priceSaveEdited(){
  if(!_priceEditContext) return;
  var ctx = _priceEditContext;
  var layout = _priceEditLayout;

  // Проверка
  var invalid = _priceEditRows.filter(function(r){ return !r.name || (r.price<=0 && (!r.price2 || r.price2<=0)); });
  if(invalid.length){
    toast('Заполните название и цену для всех строк ('+invalid.length+' незаполнено)','err');
    return;
  }

  // Конвертировать в rows-формат для processSupPriceRows
  var fakeRows = _priceEditRows.map(function(r){ return [r.name, r.unit, r.price.toString(), (r.price2||'').toString()]; });
  var fakeLayout = {nameCol:0, unitCol:1, priceCol:2, priceCol2:3, headerRow:-1, method:'manual_edit', confidence:100};

  var previewSec = document.getElementById('pricePreviewSection');
  if(previewSec) previewSec.style.display = 'none';
  closeModal('manualColumnMap');
  closeModal('supPriceUpload');

  _saveSupPriceTemplate(ctx.supName, {
    sheetName: _supPriceImportSheetName || '',
    headerRow: Math.max(0, (layout.headerRow >= 0 ? layout.headerRow : 0)),
    dataStartRow: Math.max(1, (parseInt((document.getElementById('mcm-start-row')||{value:'1'}).value, 10) || 1)),
    nameCols: (layout.nameCols||[]).slice(),
    unitCols: (layout.unitCols||[]).slice(),
    priceCols: (layout.priceCols||[]).slice(),
    price2Cols: (layout.price2Cols||[]).slice(),
    skipRules: {
      dropEmpty: true,
      dropMeta: true,
      requirePrice: true
    }
  });

  processSupPriceRows(fakeRows, fakeLayout, ctx.supName, ctx.append, ctx.priceName, ctx.allowedUserIds);
}

// ─────────────────────────────────────────────────────────────
// 7. ПЕРЕОПРЕДЕЛИТЬ _showPreviewAndConfirm — теперь редактируемая таблица
// ─────────────────────────────────────────────────────────────
function _showPreviewAndConfirm(rows, layout, supName, append, priceName, allowedUserIds, fi, resetBtn){
  var previewSec = document.getElementById('pricePreviewSection');
  var confirmBtn = document.getElementById('priceConfirmBtn');
  var changeBtn  = document.getElementById('priceChangeColsBtn');
  var methodBadge= document.getElementById('priceMethodBadge');

  if(methodBadge) methodBadge.textContent = (layout && layout.method === 'manual') ? 'ручной режим' : (layout.method||'auto');
  updatePricePreviewHeader(layout);

  // Рендерить редактируемую таблицу
  renderPriceEditTable(rows, layout, supName, append, priceName, allowedUserIds);

  if(previewSec) previewSec.style.display = 'block';

  if(confirmBtn){
    confirmBtn.onclick = function(){
      if(fi) fi.value='';
      resetBtn();
      priceSaveEdited();
    };
  }
  if(changeBtn){
    changeBtn.onclick = function(){
      if(previewSec) previewSec.style.display='none';
      resetBtn();
      showManualColumnMap(rows, supName, append, priceName, layout);
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 8. ОБНОВИТЬ renderOrder — показать таблицу если заказ создан
// ─────────────────────────────────────────────────────────────
function renderOrder(){
  renderCart();
  if(_orderSups.length > 0){
    var sec = document.getElementById('orderTableSection');
    if(sec) { sec.style.display='block'; _renderOrderTable(''); }
  }
}


// ═══════════════════════════════════════════════════════════════
// ИМПОРТ ПРАЙСОВ ПОСТАВЩИКОВ — НОВЫЙ РУЧНОЙ МАСТЕР
// ═══════════════════════════════════════════════════════════════

var _supPriceImportState = {
  book: null,
  fileName: '',
  sheetNames: [],
  sheetName: '',
  rows: [],
  maxCols: 0,
  dataStartRow: 1,
  mapping: { name: [], unit: [], price: [], price2: [] },
  parsedRows: [],
  template: null,
  organizationId: '',
  legalEntityIds: [],
  legalEntityNames: [],
  priceListId: '',
  priceListName: ''
};

function _excelColLabel(idx){
  var n = idx + 1;
  var out = '';
  while(n > 0){
    var r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function _supplierImportResetState(){
  _supPriceImportState = {
    book: null,
    fileName: '',
    sheetNames: [],
    sheetName: '',
    rows: [],
    maxCols: 0,
    dataStartRow: 1,
    mapping: { name: [], unit: [], price: [], price2: [] },
    parsedRows: [],
    template: null,
    organizationId: '',
    legalEntityIds: [],
    legalEntityNames: [],
    priceListId: '',
    priceListName: ''
  };
  _mcmRows = [];
  _mcmLayout = null;
  _mcmMaxCols = 0;
  _mcmSelectedRoleByCol = {};
  _priceEditRows = [];
  _priceEditLayout = null;
  _priceEditContext = null;
}

function _supplierImportNormalizeRows(rows){
  return (Array.isArray(rows) ? rows : []).map(function(row){
    return Array.isArray(row) ? row.map(function(cell){
      return cell === null || cell === undefined ? '' : String(cell);
    }) : [];
  });
}

function _supplierImportGetSheetRows(book, sheetName){
  if(!book || !sheetName) return [];
  var ws = book.Sheets && book.Sheets[sheetName];
  if(!ws) return [];
  return _supplierImportNormalizeRows(XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true
  }));
}

function _supplierImportFirstPopulatedSheet(book){
  if(!book || !book.SheetNames) return '';
  for(var i=0; i<book.SheetNames.length; i++){
    var name = book.SheetNames[i];
    var rows = _supplierImportGetSheetRows(book, name);
    if(rows.some(function(row){
      return row.some(function(cell){ return String(cell || '').trim(); });
    })) return name;
  }
  return book.SheetNames[0] || '';
}

function _supplierImportApplyStateFromTemplate(){
  var tpl = _loadSupPriceTemplate(_currentSupName || '');
  if(!tpl) return;
  if(tpl.sheetName && _supPriceImportState.sheetNames.indexOf(tpl.sheetName) >= 0){
    _supPriceImportState.sheetName = tpl.sheetName;
  }
  _supPriceImportState.dataStartRow = Math.max(1, parseInt(tpl.dataStartRow || 1, 10) || 1);
  _supPriceImportState.mapping = {
    name: Array.isArray(tpl.nameCols) ? tpl.nameCols.slice() : (tpl.nameCol >= 0 ? [tpl.nameCol] : []),
    unit: Array.isArray(tpl.unitCols) ? tpl.unitCols.slice() : (tpl.unitCol >= 0 ? [tpl.unitCol] : []),
    price: Array.isArray(tpl.priceCols) ? tpl.priceCols.slice() : (tpl.priceCol >= 0 ? [tpl.priceCol] : []),
    price2: Array.isArray(tpl.price2Cols) ? tpl.price2Cols.slice() : (tpl.priceCol2 >= 0 ? [tpl.priceCol2] : [])
  };
  _supPriceImportState.template = tpl;
}

function _supplierImportSetSheet(sheetName){
  if(!_supPriceImportState.book) return;
  _supPriceImportState.sheetName = sheetName || '';
  _supPriceImportState.rows = _supplierImportGetSheetRows(_supPriceImportState.book, _supPriceImportState.sheetName);
  _supPriceImportState.maxCols = _supPriceImportState.rows.reduce(function(max, row){
    return Math.max(max, row ? row.length : 0);
  }, 0);
  if(_supPriceImportState.maxCols < 1) _supPriceImportState.maxCols = 1;
  _supPriceImportState.dataStartRow = 1;
  _supPriceImportState.mapping = { name: [], unit: [], price: [], price2: [] };
  _supplierImportApplyStateFromTemplate();

  _mcmRows = _supPriceImportState.rows.slice();
  _mcmMaxCols = _supPriceImportState.maxCols;
  _mcmSelectedRoleByCol = {};
  (_supPriceImportState.mapping.name || []).forEach(function(i){ if(i >= 0) _mcmSelectedRoleByCol[i] = 'name'; });
  (_supPriceImportState.mapping.unit || []).forEach(function(i){ if(i >= 0) _mcmSelectedRoleByCol[i] = 'unit'; });
  (_supPriceImportState.mapping.price || []).forEach(function(i){ if(i >= 0) _mcmSelectedRoleByCol[i] = 'price'; });
  (_supPriceImportState.mapping.price2 || []).forEach(function(i){ if(i >= 0) _mcmSelectedRoleByCol[i] = 'price2'; });
}

function _supplierImportRowText(parts, cols){
  if(!Array.isArray(cols) || !cols.length) return '';
  var vals = [];
  cols.forEach(function(col){
    if(col < 0 || !parts || col >= parts.length) return;
    var val = parts[col];
    if(val === null || val === undefined) val = '';
    val = String(val);
    if(val.trim()) vals.push(val.trim());
  });
  return vals.join(' ').replace(/\s+/g, ' ').trim();
}

function _supplierImportRowPrice(parts, cols){
  if(!Array.isArray(cols) || !cols.length) return 0;
  for(var i=0; i<cols.length; i++){
    var col = cols[i];
    if(col < 0 || !parts || col >= parts.length) continue;
    var price = extractPrice(parts[col]);
    if(price > 0) return price;
  }
  return 0;
}

function _supplierImportBuildMappingFromSelects(){
  var mapping = { name: [], unit: [], price: [], price2: [] };
  for(var i=0; i<_mcmMaxCols; i++){
    var sel = document.getElementById('mcm-role-' + i);
    var role = sel ? sel.value : (_mcmSelectedRoleByCol[i] || 'ignore');
    _mcmSelectedRoleByCol[i] = role || 'ignore';
    if(role === 'name') mapping.name.push(i);
    else if(role === 'unit') mapping.unit.push(i);
    else if(role === 'price') mapping.price.push(i);
    else if(role === 'price2') mapping.price2.push(i);
  }
  _supPriceImportState.mapping = mapping;
  return mapping;
}

function _supplierImportBuildParsedRows(){
  var rows = Array.isArray(_supPriceImportState.rows) ? _supPriceImportState.rows : [];
  var startRow = Math.max(1, parseInt(_supPriceImportState.dataStartRow, 10) || 1);
  var mapping = _supPriceImportState.mapping || { name: [], unit: [], price: [], price2: [] };
  var out = [];
  for(var ri = startRow - 1; ri < rows.length; ri++){
    var parts = rows[ri] || [];
    var name = _supplierImportRowText(parts, mapping.name);
    var unit = _supplierImportRowText(parts, mapping.unit);
    var price = _supplierImportRowPrice(parts, mapping.price);
    var price2 = _supplierImportRowPrice(parts, mapping.price2);
    if(!price && price2) price = price2;
    if(!name || !String(name).trim()) continue;
    if(!price || price <= 0) continue;
    out.push({
      sourceRow: ri + 1,
      name: name,
      unit: unit,
      price1: price,
      price2: price2 || 0,
      rawRow: parts.slice ? parts.slice() : []
    });
  }
  _supPriceImportState.parsedRows = out;
  return out;
}

function _supplierImportRenderSheetSelect(){
  var sel = document.getElementById('supPriceSheetSelect');
  if(!sel) return;
  var sheets = _supPriceImportState.sheetNames || [];
  sel.innerHTML = sheets.length ? sheets.map(function(name){
    return '<option value="' + _esc(name) + '"' + (name === _supPriceImportState.sheetName ? ' selected' : '') + '>' + _esc(name) + '</option>';
  }).join('') : '<option value="">Лист не найден</option>';
  sel.disabled = sheets.length <= 1;
}

function _supplierImportRenderRawPreview(){
  var el = document.getElementById('mcm-preview');
  var rawEl = document.getElementById('priceRawPreview');
  if(!el && !rawEl) return;
  var rows = _supPriceImportState.rows || [];
  var maxCols = _supPriceImportState.maxCols || 0;
  var startRow = Math.max(1, parseInt((document.getElementById('mcm-start-row') || { value: '1' }).value, 10) || 1);
  function buildPreviewTable(interactive){
    var html = '<div style="overflow:auto;max-height:300px;border:1px solid var(--br);border-radius:12px;background:var(--bg);">'
    + '<table style="border-collapse:collapse;width:100%;min-width:' + Math.max(8, maxCols) * 160 + 'px;">';
    html += '<thead style="position:sticky;top:0;z-index:3;background:var(--bg3);">';
    html += '<tr>';
    html += '<th style="position:sticky;left:0;z-index:4;background:var(--bg3);padding:8px 10px;border:1px solid var(--br);min-width:64px;">#</th>';
    for(var ci=0; ci<maxCols; ci++){
      var role = _mcmSelectedRoleByCol[ci] || 'ignore';
      var roleLabel = role === 'name' ? 'Наименование'
        : role === 'unit' ? 'Единица измерения'
        : role === 'price' ? 'Цена 1'
        : role === 'price2' ? 'Цена 2'
        : 'Игнорировать';
      html += '<th style="padding:6px 8px;border:1px solid var(--br);min-width:160px;vertical-align:top;">'
      + '<div style="display:flex;flex-direction:column;gap:6px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'
      + '<span style="font-size:10px;color:var(--t4);font-weight:700;">' + _excelColLabel(ci) + '</span>'
      + '<span style="font-size:10px;color:var(--t3);background:var(--bg2);border:1px solid var(--br);border-radius:999px;padding:2px 6px;">Колонка ' + (ci + 1) + '</span>'
      + '</div>';
      if(interactive){
        html += '<select id="mcm-role-' + ci + '" onchange="_setMcmRole(' + ci + ', this.value)" style="width:100%;background:var(--bg2);border:1px solid var(--br);border-radius:8px;padding:7px 8px;font-size:11px;color:var(--tx);outline:none;">'
        + '<option value="ignore">Игнорировать</option>'
        + '<option value="name">Наименование</option>'
        + '<option value="unit">Единица измерения</option>'
        + '<option value="price">Цена 1</option>'
        + '<option value="price2">Цена 2</option>'
        + '</select>';
      } else {
        html += '<div style="font-size:11px;color:var(--t2);background:var(--bg2);border:1px solid var(--br);border-radius:8px;padding:7px 8px;">' + roleLabel + '</div>';
      }
      html += '</div>'
        + '</th>';
    }
    html += '</tr></thead><tbody>';
    rows.forEach(function(row, ri){
      var bg = ri + 1 === startRow ? 'background:rgba(91,163,245,.08);' : (ri % 2 ? 'background:var(--bg2);' : '');
      html += '<tr style="' + bg + '">';
      html += '<td style="position:sticky;left:0;z-index:2;background:inherit;padding:6px 10px;border:1px solid var(--br);font-size:11px;color:var(--t3);text-align:center;">' + (ri + 1) + '</td>';
      for(var cj=0; cj<maxCols; cj++){
        var val = row && row[cj] !== undefined && row[cj] !== null ? String(row[cj]) : '';
        html += '<td style="padding:6px 10px;border:1px solid var(--br);max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(val) + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }
  if(el){
    el.style.display = 'block';
    el.innerHTML = buildPreviewTable(true);
  }
  if(rawEl){
    rawEl.innerHTML = buildPreviewTable(false);
  }
}

function _supplierImportSyncSelectsToMapping(){
  for(var i=0; i<_mcmMaxCols; i++){
    var sel = document.getElementById('mcm-role-' + i);
    if(sel){
      sel.value = _mcmSelectedRoleByCol[i] || 'ignore';
    }
  }
}

function _supplierImportRenderParsedPreview(){
  var data = _supplierImportBuildParsedRows();
  renderPriceEditTable(_supPriceImportState.rows, _supPriceImportState.mapping, _currentSupName, _supPriceAppend, (document.getElementById('supPriceName') || { value: '' }).value.trim() || (_supPriceAppend ? 'Дополнительный прайс' : 'Основной прайс'), [], 'mcm-edit-preview');
  var err = document.getElementById('mcm-err');
  if(err){
    err.textContent = data.length
      ? 'Найдено товарных строк: ' + data.length
      : 'Нет корректных строк для импорта. Проверьте роли колонок и строку начала данных.';
  }
}

function _supplierImportApplyStateToUI(){
  _supplierImportRenderSheetSelect();
  _supplierImportRenderRawPreview();
  _supplierImportSyncSelectsToMapping();
  _supplierImportRenderParsedPreview();
  _setImportPreviewBadges(_supPriceImportState.mapping);
}

function prepareSupPriceImportPreview(){
  var errEl = document.getElementById('supPriceErr');
  if(errEl) errEl.textContent = '';
  var fi = document.getElementById('supPriceFile');
  if(!fi || !fi.files || !fi.files[0]){
    if(errEl) errEl.textContent = 'Сначала выберите файл прайса';
    return;
  }
  var file = fi.files[0];
  var ext = (file.name.split('.').pop() || '').toLowerCase();
  if(['xlsx','xls','csv','txt'].indexOf(ext) < 0){
    if(errEl) errEl.textContent = 'Файл не поддерживается. Загрузите Excel или CSV.';
    return;
  }
  if(typeof XLSX === 'undefined'){
    if(errEl) errEl.textContent = 'Не загружена библиотека для чтения таблиц';
    return;
  }

  _supplierImportResetState();
  _supPriceImportState.fileName = file.name || '';

  var reader = new FileReader();
  reader.onload = function(ev){
    try{
      var wb = ext === 'csv' || ext === 'txt'
        ? XLSX.read(String(ev.target.result || ''), { type: 'string' })
        : XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
      _supPriceImportState.book = wb;
      _supPriceImportState.sheetNames = (wb.SheetNames || []).slice();
      _supPriceImportState.sheetName = _supplierImportFirstPopulatedSheet(wb) || _supPriceImportState.sheetNames[0] || '';
      _supplierImportSetSheet(_supPriceImportState.sheetName);
      _supplierImportApplyStateToUI();
      closeModal('supPriceUpload');
      showManualColumnMap(_supPriceImportState.rows, _currentSupName, _supPriceAppend, (document.getElementById('supPriceName')||{value:''}).value.trim() || (_supPriceAppend?'Дополнительный прайс':'Основной прайс'), {method:'manual'});
      _bindPricePreviewActions();
    } catch(e){
      if(errEl) errEl.textContent = 'Ошибка Excel: ' + e.message;
    }
  };
  if(ext === 'csv' || ext === 'txt') reader.readAsText(file, 'utf-8');
  else reader.readAsArrayBuffer(file);
}

function selectSupPriceSheet(sheetName){
  if(!_supPriceImportState.book || !sheetName) return;
  _supPriceImportState.sheetName = sheetName;
  _supplierImportSetSheet(sheetName);
  _supplierImportApplyStateToUI();
}

function openSupPriceManualMap(){
  if(!_supPriceImportState.rows || !_supPriceImportState.rows.length){
    prepareSupPriceImportPreview();
    return;
  }
  openModal('manualColumnMap');
  _supplierImportApplyStateToUI();
}

function updatePricePreviewHeader(layout){
  var map = [
    ['previewColName', layout && layout.name && layout.name.length ? 'Наименование: ' + layout.name.map(function(i){ return _excelColLabel(i); }).join(', ') : 'Наименование'],
    ['previewColUnit', layout && layout.unit && layout.unit.length ? 'Единица: ' + layout.unit.map(function(i){ return _excelColLabel(i); }).join(', ') : 'Единица'],
    ['previewColPrice1', layout && layout.price && layout.price.length ? 'Цена 1: ' + layout.price.map(function(i){ return _excelColLabel(i); }).join(', ') : 'Цена 1'],
    ['previewColPrice2', layout && layout.price2 && layout.price2.length ? 'Цена 2: ' + layout.price2.map(function(i){ return _excelColLabel(i); }).join(', ') : 'Цена 2']
  ];
  map.forEach(function(item){
    var el = document.getElementById(item[0]);
    if(el) el.textContent = item[1];
  });
}

function _setImportPreviewBadges(layout){
  updatePricePreviewHeader(layout || _supPriceImportState.mapping);
  var methodBadge = document.getElementById('priceMethodBadge');
  if(methodBadge) methodBadge.textContent = 'ручной режим';
}

function syncMcmRolesFromPreview(){
  return _supplierImportBuildMappingFromSelects();
}

function _setMcmRole(col, role){
  _mcmSelectedRoleByCol[col] = role || 'ignore';
  syncMcmRolesFromPreview();
  _supplierImportRenderParsedPreview();
}

function showManualColumnMap(rows, supName, append, priceName, detectedLayout){
  _mcmRows = _supplierImportNormalizeRows(rows);
  _mcmSupName = supName;
  _mcmAppend = append;
  _mcmPriceName = priceName;
  _mcmMaxCols = _supPriceImportState.maxCols || _mcmRows.reduce(function(max, row){ return Math.max(max, row.length); }, 0);
  if(_mcmMaxCols < 1) _mcmMaxCols = 1;
  _mcmSelectedRoleByCol = {};

  (_supPriceImportState.mapping.name || []).forEach(function(i){ _mcmSelectedRoleByCol[i] = 'name'; });
  (_supPriceImportState.mapping.unit || []).forEach(function(i){ _mcmSelectedRoleByCol[i] = 'unit'; });
  (_supPriceImportState.mapping.price || []).forEach(function(i){ _mcmSelectedRoleByCol[i] = 'price'; });
  (_supPriceImportState.mapping.price2 || []).forEach(function(i){ _mcmSelectedRoleByCol[i] = 'price2'; });

  var hint = document.getElementById('mcm-manual-hint');
  if(hint) hint.textContent = 'Назначьте роли прямо над колонками. Одна роль может встречаться в двух колонках. Система читает строки строго по выбранным колонкам и строке начала данных.';

  var startRowEl = document.getElementById('mcm-start-row');
  if(startRowEl){
    startRowEl.value = String(_supPriceImportState.dataStartRow || 1);
    startRowEl.oninput = function(){
      _supPriceImportState.dataStartRow = Math.max(1, parseInt(this.value, 10) || 1);
      _supplierImportRenderParsedPreview();
    };
  }

  var methodEl = document.getElementById('mcm-method');
  if(methodEl) methodEl.textContent = 'Режим: ручное сопоставление колонок';

  _setImportPreviewBadges(_supPriceImportState.mapping);
  _supplierImportRenderRawPreview();
  renderPriceEditTable(_supPriceImportState.rows, _supPriceImportState.mapping, supName, append, priceName, [], 'mcm-edit-preview');
  _supplierImportSyncSelectsToMapping();
  _supplierImportRenderParsedPreview();
  _bindPricePreviewActions();
  openModal('manualColumnMap');
}

function applyManualColumnMap(){
  var err = document.getElementById('mcm-err');
  var startRow = parseInt((document.getElementById('mcm-start-row') || { value: '1' }).value, 10) || 1;
  if(startRow < 1) startRow = 1;
  _supPriceImportState.dataStartRow = startRow;
  syncMcmRolesFromPreview();
  if(!_supPriceImportState.mapping.name.length){
    if(err) err.textContent = 'Выберите хотя бы одну колонку с наименованием.';
    return;
  }
  if(!_supPriceImportState.mapping.price.length){
    if(err) err.textContent = 'Выберите хотя бы одну колонку с ценой.';
    return;
  }
  if(err) err.textContent = 'Настройки применены. Проверьте предпросмотр ниже.';
  _supplierImportRenderParsedPreview();
}

function applyManualColumnMapAndSave(){
  applyManualColumnMap();
  var err = document.getElementById('mcm-err');
  if(err && /Выберите/.test(err.textContent || '')) return;
  priceSaveEdited();
}

function saveCurrentSupPriceTemplate(){
  _supplierImportCaptureLegalState();
  var mapping = syncMcmRolesFromPreview() || _supPriceImportState.mapping || { name: [], unit: [], price: [], price2: [] };
  if(!mapping.name.length || !mapping.price.length){
    var err = document.getElementById('mcm-err');
    if(err) err.textContent = 'Сначала назначьте обязательные колонки: наименование и цена.';
    return;
  }
  if(!_supplierImportHasLegalSelection()){
    var err2 = document.getElementById('mcm-err');
    if(err2) err2.textContent = 'Выберите хотя бы одно юр. лицо для этого прайса.';
    return;
  }
  _saveSupPriceTemplate(_currentSupName, {
    sheetName: _supPriceImportState.sheetName || '',
    headerRow: Math.max(0, (_supPriceImportState.dataStartRow || 1) - 1),
    dataStartRow: Math.max(1, _supPriceImportState.dataStartRow || 1),
    nameCols: (mapping.name || []).slice(),
    unitCols: (mapping.unit || []).slice(),
    priceCols: (mapping.price || []).slice(),
    price2Cols: (mapping.price2 || []).slice(),
    legalEntityIds: (_supPriceImportState.legalEntityIds || []).slice(),
    legalEntityNames: (_supPriceImportState.legalEntityNames || []).slice(),
    skipRules: { dropEmpty: true, requirePrice: true }
  });
  toast('Шаблон импорта сохранён', 'ok');
}

function renderPriceEditTable(rows, layout, supName, append, priceName, allowedUserIds, containerId){
  _priceEditContext = { rows: rows, supName: supName, append: append, priceName: priceName, allowedUserIds: allowedUserIds };
  _priceEditLayout = layout || { name: [], unit: [], price: [], price2: [] };
  _priceEditContainerId = containerId || 'pricePreviewTable';
  var parsed = [];
  var data = Array.isArray(rows) ? rows : [];
  var startRow = Math.max(1, _supPriceImportState.dataStartRow || 1);
  var nameCols = (_priceEditLayout.name || _priceEditLayout.nameCols || []).slice ? (_priceEditLayout.name || _priceEditLayout.nameCols || []).slice() : (_priceEditLayout.name || _priceEditLayout.nameCols || []);
  var unitCols = (_priceEditLayout.unit || _priceEditLayout.unitCols || []).slice ? (_priceEditLayout.unit || _priceEditLayout.unitCols || []).slice() : (_priceEditLayout.unit || _priceEditLayout.unitCols || []);
  var priceCols = (_priceEditLayout.price || _priceEditLayout.priceCols || []).slice ? (_priceEditLayout.price || _priceEditLayout.priceCols || []).slice() : (_priceEditLayout.price || _priceEditLayout.priceCols || []);
  var price2Cols = (_priceEditLayout.price2 || _priceEditLayout.price2Cols || []).slice ? (_priceEditLayout.price2 || _priceEditLayout.price2Cols || []).slice() : (_priceEditLayout.price2 || _priceEditLayout.price2Cols || []);
  for(var ri=startRow - 1; ri < data.length; ri++){
    var parts = data[ri] || [];
    var name = _supplierImportRowText(parts, nameCols);
    var unit = _supplierImportRowText(parts, unitCols);
    var price1 = _supplierImportRowPrice(parts, priceCols);
    var price2 = _supplierImportRowPrice(parts, price2Cols);
    if(!price1 && price2) price1 = price2;
    if(!name || (!price1 && !price2)) continue;
    parsed.push({
      sourceRow: ri + 1,
      name: name,
      unit: unit,
      price1: price1,
      price2: price2 || 0
    });
  }
  _priceEditRows = parsed;
  _renderEditTable();
}

function _renderEditTable(){
  var el = document.getElementById(_priceEditContainerId || 'pricePreviewTable');
  if(!el) return;
  var units = ['', 'шт', 'кг', 'г', 'л', 'мл', 'пачка', 'бут.', 'уп.', 'пор.'];
  var html = '<div style="overflow:auto;max-height:380px;border:1px solid var(--br);border-radius:12px;background:var(--bg);">'
    + '<table style="border-collapse:collapse;width:100%;min-width:760px;font-size:13px;">'
    + '<thead><tr style="background:var(--bg3);position:sticky;top:0;z-index:1;">'
    + '<th style="padding:8px 10px;text-align:center;border:1px solid var(--br);min-width:70px;">Строка</th>'
    + '<th style="padding:8px 10px;text-align:left;border:1px solid var(--br);min-width:260px;">Наименование</th>'
    + '<th style="padding:8px 10px;text-align:center;border:1px solid var(--br);min-width:90px;">Ед. изм.</th>'
    + '<th style="padding:8px 10px;text-align:right;border:1px solid var(--br);min-width:120px;">Цена 1, ₽</th>'
    + '<th style="padding:8px 10px;text-align:right;border:1px solid var(--br);min-width:120px;">Цена 2, ₽</th>'
    + '<th style="padding:8px 10px;text-align:center;border:1px solid var(--br);width:42px;"></th>'
    + '</tr></thead><tbody>';
  _priceEditRows.forEach(function(row, i){
    var rowNo = row && row.sourceRow !== undefined && row.sourceRow !== null && row.sourceRow !== ''
      ? row.sourceRow
      : (i + 1);
    html += '<tr>'
      + '<td style="padding:4px 8px;border:1px solid var(--br);text-align:center;color:var(--t3);font-size:11px;">' + rowNo + '</td>'
      + '<td style="padding:4px 8px;border:1px solid var(--br);">'
        + '<input value="' + _esc(row.name) + '" oninput="_priceEditRows[' + i + '].name=this.value" style="width:100%;background:transparent;border:none;outline:none;font-size:13px;color:var(--tx);padding:4px;">'
      + '</td>'
      + '<td style="padding:4px 8px;border:1px solid var(--br);text-align:center;">'
        + '<select onchange="_priceEditRows[' + i + '].unit=this.value" style="background:var(--bg2);border:1px solid var(--br);border-radius:8px;padding:4px 6px;font-size:12px;color:var(--tx);outline:none;">'
        + units.map(function(u){ return '<option value="' + _esc(u) + '"' + (u === (row.unit || '') ? ' selected' : '') + '>' + (u || '—') + '</option>'; }).join('')
        + '</select>'
      + '</td>'
      + '<td style="padding:4px 8px;border:1px solid var(--br);">'
        + '<input type="text" value="' + _fmtPrice(row.price1) + '" oninput="_priceEditRows[' + i + '].price1=_parseInputPrice(this.value)" onblur="this.value=_fmtPrice(_priceEditRows[' + i + '].price1)" pattern="[0-9.,]*" style="width:100%;background:transparent;border:none;outline:none;font-size:13px;color:var(--ac);font-weight:700;text-align:right;padding:4px;">'
      + '</td>'
      + '<td style="padding:4px 8px;border:1px solid var(--br);">'
        + '<input type="text" value="' + _fmtPrice(row.price2 || 0) + '" oninput="_priceEditRows[' + i + '].price2=_parseInputPrice(this.value)" onblur="this.value=_fmtPrice(_priceEditRows[' + i + '].price2||0)" pattern="[0-9.,]*" style="width:100%;background:transparent;border:none;outline:none;font-size:13px;color:var(--ac);font-weight:700;text-align:right;padding:4px;">'
      + '</td>'
      + '<td style="padding:4px 8px;border:1px solid var(--br);text-align:center;">'
        + '<button onclick="priceDeleteRow(' + i + ')" style="background:var(--rdD);color:var(--rd);border:1px solid var(--rd);border-radius:8px;padding:2px 7px;font-size:12px;cursor:pointer;" title="Удалить строку">✕</button>'
      + '</td>'
    + '</tr>';
  });
  html += '</tbody></table></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;color:var(--t3);margin-top:6px;">'
    + '<span>Отображено строк: ' + _priceEditRows.length + '</span>'
    + '<span>Редактируйте строки перед сохранением</span>'
    + '</div>';
  el.innerHTML = html;
}

function priceDeleteRow(i){
  _priceEditRows.splice(i, 1);
  _renderEditTable();
}

function priceAddRow(){
  _priceEditRows.push({sourceRow: _priceEditRows.length + 1, name: '', unit: '', price1: 0, price2: 0});
  _renderEditTable();
  setTimeout(function(){
    var el = document.getElementById(_priceEditContainerId || 'mcm-edit-preview');
    if(el) el.scrollTop = el.scrollHeight;
  }, 50);
}

function processSupPriceRows(rows, cols, supName, append, priceName, allowedUserIds){
  var priceScope = _supplierImportCaptureLegalState();
  if(!_supplierImportHasLegalSelection()){
    toast('Выберите хотя бы одно юр. лицо для прайса','err');
    return { added: 0, updated: 0, skipped: Array.isArray(rows) ? rows.length : 0, needsReview: 0, error: 'legal_entities_required' };
  }
  var allowedCompanies = [];
  document.querySelectorAll('.sup-price-comp-cb:checked').forEach(function(cb){
    var co = cb.dataset.company;
    if(co && allowedCompanies.indexOf(co) < 0) allowedCompanies.push(co);
  });
  if(!allowedUserIds || !allowedUserIds.length){
    allowedUserIds = [];
    document.querySelectorAll('.sup-price-comp-cb:checked').forEach(function(cb){
      allowedUserIds.push(cb.value);
    });
  }

  if(!append){
    SUP_PRODS = SUP_PRODS.filter(function(p){
      return !(p._supplier === supName && (p._priceName === priceName || !p._priceName));
    });
  }
  var priceList = _supplierImportCreateOrUpdateList(
    _supplierImportPriceListId(supName, priceName, priceScope.organizationId),
    {
      sourceFile: _supPriceImportState.fileName || '',
      active: true
    }
  );
  _supPriceImportState.priceListId = priceList.id;
  _supPriceImportState.priceListName = priceList.priceName;
  _supplierImportSyncPriceListLegals(priceList.id, priceList.organizationId, priceList.legalEntityIds, priceList.legalEntityNames);

  var items = Array.isArray(rows) ? rows : [];
  var added = 0, updated = 0, skipped = 0, needsReview = [];
  var nameCols = (cols.name || cols.nameCols || []);
  var unitCols = (cols.unit || cols.unitCols || []);
  var priceCols = (cols.price || cols.priceCols || []);
  var price2Cols = (cols.price2 || cols.price2Cols || []);

  items.forEach(function(row, idx){
    var parts = Array.isArray(row) ? row : [row.name, row.unit, row.price1, row.price2];
    var directName = row && typeof row === 'object' && !Array.isArray(row) ? row.name : '';
    var directUnit = row && typeof row === 'object' && !Array.isArray(row) ? row.unit : '';
    var directPrice1 = row && typeof row === 'object' && !Array.isArray(row) ? row.price1 : 0;
    var directPrice2 = row && typeof row === 'object' && !Array.isArray(row) ? row.price2 : 0;
    var name = String(directName || _supplierImportRowText(parts, nameCols) || '').trim();
    var unit = String(directUnit || _supplierImportRowText(parts, unitCols) || '').trim();
    var price1 = directPrice1 || _supplierImportRowPrice(parts, priceCols);
    var price2 = directPrice2 || _supplierImportRowPrice(parts, price2Cols);
    var price = price1 || price2;

    if(!name || !String(name).trim()){
      skipped++;
      return;
    }
    if(!price || price <= 0){
      needsReview.push({row: idx + 1, name: name, reason: 'Нет цены'});
      skipped++;
      return;
    }

    var normUnit = String(unit || '').trim();
    var pKg = 0, pSh = 0, pL = 0, pMl = 0;
    var uLow = normUnit.toLowerCase();
    if(uLow === 'кг' || uLow === 'kg') pKg = price;
    else if(uLow === 'г' || uLow === 'гр' || uLow === 'g') pKg = Math.round(price * 1000 * 100) / 100;
    else if(uLow === 'л' || uLow === 'l') pL = price;
    else if(uLow === 'мл' || uLow === 'ml') { pL = Math.round(price * 1000 * 100) / 100; normUnit = 'л'; }
    else pSh = price;
    if(!normUnit) normUnit = 'шт';

    var currentType = append ? 'additional' : 'main';
    var ex = append ? SUP_PRODS.findIndex(function(p){
      return p.name.toLowerCase() === String(name).toLowerCase()
        && p._supplier === supName
        && (p._type || 'main') === 'additional';
    }) : -1;

    var entry = {
      id: ex >= 0 ? SUP_PRODS[ex].id : Date.now() + idx,
      name: String(name).trim(),
      cat: '—',
      unit: normUnit,
      supplier: supName,
      _supplier: supName,
      _priceName: priceName,
      organizationId: priceScope.organizationId,
      priceListId: priceList.id,
      priceListName: priceList.priceName,
      priceListActive: true,
      legalEntityIds: priceList.legalEntityIds.slice(),
      legalEntityNames: priceList.legalEntityNames.slice(),
      sourceFile: _supPriceImportState.fileName || '',
      pKg: pKg,
      pSh: pSh,
      pL: pL,
      pMl: pMl,
      stock: 999,
      active: true,
      hidden: false,
      _type: currentType,
      allowedUserIds: allowedUserIds.slice(),
      allowedCompanies: allowedCompanies.slice(),
      sourceRow: idx + 1
    };

    if(ex >= 0){ SUP_PRODS[ex] = entry; updated++; }
    else { SUP_PRODS.push(entry); added++; }

    var prodIdx = PRODUCTS.findIndex(function(p){
      return p.name.toLowerCase() === String(name).toLowerCase();
    });
    if(prodIdx >= 0){
      var spIdx = PRODUCTS[prodIdx].suppliers.findIndex(function(s){ return s.name === supName; });
      var supObj = {
        name: supName,
        price: price,
        organizationId: priceScope.organizationId,
        priceListId: priceList.id,
        priceListName: priceList.priceName,
        legalEntityIds: priceList.legalEntityIds.slice(),
        legalEntityNames: priceList.legalEntityNames.slice(),
        sourceFile: _supPriceImportState.fileName || '',
        active: true
      };
      if(spIdx >= 0) PRODUCTS[prodIdx].suppliers[spIdx] = Object.assign({}, PRODUCTS[prodIdx].suppliers[spIdx], supObj);
      else PRODUCTS[prodIdx].suppliers.push(supObj);
      PRODUCTS[prodIdx].unit = PRODUCTS[prodIdx].unit || normUnit;
    } else {
      PRODUCTS.push({
        id: Date.now() + idx + 10000,
        name: String(name).trim(),
        cat: 'dry',
        unit: normUnit,
        emoji: '',
        sticker: null,
        fav: false,
        allowedCompanies: allowedCompanies.slice(),
        suppliers: [{ name: supName, price: price }],
        pKg: pKg,
        pSh: pSh,
        pL: pL,
        pMl: pMl
      });
      if(ALL_SUPS.indexOf(supName) < 0) ALL_SUPS.push(supName);
    }
  });

  _supplierImportSyncPriceItems(priceList.id, priceScope.organizationId, items.map(function(row, idx){
    return {
      sourceRow: row && row.sourceRow ? row.sourceRow : (idx + 1),
      name: row && row.name ? String(row.name).trim() : '',
      unit: row && row.unit ? String(row.unit).trim() : '',
      price1: row && row.price1 ? row.price1 : 0,
      price2: row && row.price2 ? row.price2 : 0,
      rawRow: row && row.rawRow ? row.rawRow : []
    };
  }));

  rememberPriceLayout(supName, {
    headerRow: Math.max(0, (_supPriceImportState.dataStartRow || 1) - 1),
    nameCols: (cols.name || cols.nameCols || []).slice(),
    unitCols: (cols.unit || cols.unitCols || []).slice(),
    priceCols: (cols.price || cols.priceCols || []).slice(),
    price2Cols: (cols.price2 || cols.price2Cols || []).slice(),
    dataStartRow: _supPriceImportState.dataStartRow || 1
  });

  savePriceData();
  renderSupProducts();
  if(typeof renderCatalog === 'function') renderCatalog();

  var msg = (append ? 'Доп.' : 'Новый') + ' прайс «' + priceName + '» (' + supName + '): +' + added + ' новых, обн.' + updated + (skipped ? ' · пропущено: ' + skipped : '');
  toast(msg, 'ok');
  logAudit(CU ? CU.first + ' ' + CU.last : '', msg, 'Прайсы');
  logSystemEvent('price_import', 'Загрузка прайса: ' + supName, msg + (needsReview.length ? ' · требует проверки: ' + needsReview.length : ''), needsReview.length || skipped ? 'warn' : 'info', 'price-import');

  if(needsReview.length) _showNeedsReview(needsReview, supName);
  return {
    added: added,
    updated: updated,
    skipped: skipped,
    needsReview: needsReview.length
  };
}

function _saveSupplierImportRowsDirect(rows, supName, append, priceName, allowedUserIds){
  var priceScope = _supplierImportCaptureLegalState();
  if(!_supplierImportHasLegalSelection()){
    toast('Выберите хотя бы одно юр. лицо для прайса','err');
    return { added: 0, updated: 0, skipped: Array.isArray(rows) ? rows.length : 0, needsReview: 0, error: 'legal_entities_required' };
  }
  var allowedCompanies = [];
  document.querySelectorAll('.sup-price-comp-cb:checked').forEach(function(cb){
    var co = cb.dataset.company;
    if(co && allowedCompanies.indexOf(co) < 0) allowedCompanies.push(co);
  });
  if(!allowedUserIds || !allowedUserIds.length){
    allowedUserIds = [];
    document.querySelectorAll('.sup-price-comp-cb:checked').forEach(function(cb){
      allowedUserIds.push(cb.value);
    });
  }

  if(!append){
    SUP_PRODS = SUP_PRODS.filter(function(p){
      return !(p._supplier === supName && (p._priceName === priceName || !p._priceName));
    });
  }
  var priceList = _supplierImportCreateOrUpdateList(
    _supplierImportPriceListId(supName, priceName, priceScope.organizationId),
    {
      sourceFile: _supPriceImportState.fileName || '',
      active: true
    }
  );
  _supPriceImportState.priceListId = priceList.id;
  _supPriceImportState.priceListName = priceList.priceName;
  _supplierImportSyncPriceListLegals(priceList.id, priceList.organizationId, priceList.legalEntityIds, priceList.legalEntityNames);

  var added = 0;
  var updated = 0;
  var items = Array.isArray(rows) ? rows : [];

  items.forEach(function(row, idx){
    var name = String((row && row.name) || '').trim();
    var unit = String((row && row.unit) || '').trim();
    var price1 = parseFloat((row && row.price1) || 0) || 0;
    var price2 = parseFloat((row && row.price2) || 0) || 0;
    var price = price1 || price2;
    if(!name || !price || price <= 0) return;

    var normUnit = unit || 'шт';
    var pKg = 0, pSh = 0, pL = 0, pMl = 0;
    var uLow = normUnit.toLowerCase();
    if(uLow === 'кг' || uLow === 'kg') pKg = price;
    else if(uLow === 'г' || uLow === 'гр' || uLow === 'g') pKg = Math.round(price * 1000 * 100) / 100;
    else if(uLow === 'л' || uLow === 'l') pL = price;
    else if(uLow === 'мл' || uLow === 'ml') { pL = Math.round(price * 1000 * 100) / 100; normUnit = 'л'; }
    else pSh = price;

    var currentType = append ? 'additional' : 'main';
    var ex = append ? SUP_PRODS.findIndex(function(p){
      return p.name.toLowerCase() === name.toLowerCase()
        && p._supplier === supName
        && (p._type || 'main') === 'additional';
    }) : -1;

    var entry = {
      id: ex >= 0 ? SUP_PRODS[ex].id : Date.now() + idx,
      name: name,
      cat: '—',
      unit: normUnit,
      supplier: supName,
      _supplier: supName,
      _priceName: priceName,
      organizationId: priceScope.organizationId,
      priceListId: priceList.id,
      priceListName: priceList.priceName,
      priceListActive: true,
      legalEntityIds: priceList.legalEntityIds.slice(),
      legalEntityNames: priceList.legalEntityNames.slice(),
      sourceFile: _supPriceImportState.fileName || '',
      pKg: pKg,
      pSh: pSh,
      pL: pL,
      pMl: pMl,
      stock: 999,
      active: true,
      hidden: false,
      _type: currentType,
      allowedUserIds: allowedUserIds.slice(),
      allowedCompanies: allowedCompanies.slice(),
      sourceRow: row && row.sourceRow ? row.sourceRow : (idx + 1)
    };

    if(ex >= 0){ SUP_PRODS[ex] = entry; updated++; }
    else { SUP_PRODS.push(entry); added++; }

    var prodIdx = PRODUCTS.findIndex(function(p){
      return p.name.toLowerCase() === name.toLowerCase();
    });
    if(prodIdx >= 0){
      var spIdx = PRODUCTS[prodIdx].suppliers.findIndex(function(s){ return s.name === supName; });
      var supObj = {
        name: supName,
        price: price,
        organizationId: priceScope.organizationId,
        priceListId: priceList.id,
        priceListName: priceList.priceName,
        legalEntityIds: priceList.legalEntityIds.slice(),
        legalEntityNames: priceList.legalEntityNames.slice(),
        sourceFile: _supPriceImportState.fileName || '',
        active: true
      };
      if(spIdx >= 0) PRODUCTS[prodIdx].suppliers[spIdx] = Object.assign({}, PRODUCTS[prodIdx].suppliers[spIdx], supObj);
      else PRODUCTS[prodIdx].suppliers.push(supObj);
      PRODUCTS[prodIdx].unit = PRODUCTS[prodIdx].unit || normUnit;
    } else {
      PRODUCTS.push({
        id: Date.now() + idx + 30000,
        name: name,
        cat: 'dry',
        unit: normUnit,
        emoji: '',
        sticker: null,
        fav: false,
        allowedCompanies: allowedCompanies.slice(),
        suppliers: [{ name: supName, price: price }],
        pKg: pKg,
        pSh: pSh,
        pL: pL,
        pMl: pMl
      });
      if(ALL_SUPS.indexOf(supName) < 0) ALL_SUPS.push(supName);
    }
  });

  _supplierImportSyncPriceItems(priceList.id, priceScope.organizationId, items.map(function(row, idx){
    return {
      sourceRow: row && row.sourceRow ? row.sourceRow : (idx + 1),
      name: row && row.name ? String(row.name).trim() : '',
      unit: row && row.unit ? String(row.unit).trim() : '',
      price1: row && row.price1 ? row.price1 : 0,
      price2: row && row.price2 ? row.price2 : 0,
      rawRow: row && row.rawRow ? row.rawRow : []
    };
  }));

  if(added > 0 || updated > 0){
    savePriceData();
    renderSupProducts();
    if(typeof renderCatalog === 'function') renderCatalog();
  }

  return { added: added, updated: updated, skipped: Math.max(0, items.length - added - updated), needsReview: 0 };
}

function priceSaveEdited(){
  if(!_priceEditContext) return;
  var ctx = _priceEditContext;
  var startRowInput = document.getElementById('mcm-start-row');
  _supPriceImportState.dataStartRow = Math.max(1, parseInt((startRowInput || { value: '1' }).value, 10) || 1);
  syncMcmRolesFromPreview();
  _supplierImportCaptureLegalState();
  _supplierImportRenderParsedPreview();

  var validRows = _priceEditRows.filter(function(r){
    return String(r.name || '').trim() && ((r.price1 && r.price1 > 0) || (r.price2 && r.price2 > 0));
  });
  if(!validRows.length){
    var rebuilt = _supplierImportBuildParsedRows();
    if(rebuilt && rebuilt.length){
      validRows = rebuilt.map(function(r){
        return {
          sourceRow: r.sourceRow,
          name: r.name,
          unit: r.unit,
          price1: r.price1,
          price2: r.price2
        };
      });
      _priceEditRows = validRows.slice();
      _renderEditTable();
    }
  }
  var invalidCount = _priceEditRows.length - validRows.length;
  if(!validRows.length){
    toast('Нет ни одной корректной строки для загрузки', 'err');
    var emptyErr = document.getElementById('mcm-err');
    if(emptyErr) emptyErr.textContent = 'Нет ни одной корректной строки для загрузки. Проверьте название и цену.';
    return;
  }
  try{
    if(!_supplierImportHasLegalSelection()){
      toast('Выберите хотя бы одно юр. лицо для прайса','err');
      var legalErr = document.getElementById('mcm-err');
      if(legalErr) legalErr.textContent = 'Выберите хотя бы одно юр. лицо для прайса.';
      return;
    }
    _saveSupPriceTemplate(ctx.supName, {
      sheetName: _supPriceImportState.sheetName || '',
      headerRow: Math.max(0, (_supPriceImportState.dataStartRow || 1) - 1),
      dataStartRow: Math.max(1, _supPriceImportState.dataStartRow || 1),
      nameCols: (_supPriceImportState.mapping.name || []).slice(),
      unitCols: (_supPriceImportState.mapping.unit || []).slice(),
      priceCols: (_supPriceImportState.mapping.price || []).slice(),
      price2Cols: (_supPriceImportState.mapping.price2 || []).slice(),
      legalEntityIds: (_supPriceImportState.legalEntityIds || []).slice(),
      legalEntityNames: (_supPriceImportState.legalEntityNames || []).slice(),
      skipRules: { dropEmpty: true, requirePrice: true }
    });

    var result = processSupPriceRows(validRows.map(function(r){
      return {
        sourceRow: r.sourceRow,
        name: r.name,
        unit: r.unit,
        price1: r.price1,
        price2: r.price2
      };
    }), _supPriceImportState.mapping, ctx.supName, ctx.append, ctx.priceName, ctx.allowedUserIds) || { added: 0, updated: 0, skipped: 0 };

    if((result.added || 0) <= 0 && (result.updated || 0) <= 0){
      result = _saveSupplierImportRowsDirect(validRows, ctx.supName, ctx.append, ctx.priceName, ctx.allowedUserIds);
      if((result.added || 0) <= 0 && (result.updated || 0) <= 0){
        toast('Прайс не загружен: не удалось сохранить ни одной строки', 'err');
        var errEl = document.getElementById('mcm-err');
        if(errEl) errEl.textContent = 'Прайс не загружен: не удалось сохранить ни одной строки.';
        return;
      }
    }

    if(invalidCount > 0){
      toast('Загружено с пропуском строк: ' + invalidCount, 'ok');
    }

    var previewSec = document.getElementById('pricePreviewSection');
    if(previewSec) previewSec.style.display = 'none';
    closeModal('manualColumnMap');
    closeModal('supPriceUpload');
  } catch(e){
    console.error('priceSaveEdited failed:', e);
    toast('Ошибка загрузки прайса: ' + (e && e.message ? e.message : 'неизвестная ошибка'), 'err');
    var errNode = document.getElementById('mcm-err');
    if(errNode) errNode.textContent = 'Ошибка загрузки прайса: ' + (e && e.message ? e.message : 'неизвестная ошибка');
  }
}

function _showPreviewAndConfirm(rows, layout, supName, append, priceName, allowedUserIds, fi, resetBtn){
  var previewSec = document.getElementById('pricePreviewSection');
  var confirmBtn = document.getElementById('priceConfirmBtn');
  var changeBtn  = document.getElementById('priceChangeColsBtn');
  var methodBadge= document.getElementById('priceMethodBadge');

  if(methodBadge) methodBadge.textContent = 'ручной режим';
  updatePricePreviewHeader(layout || _supPriceImportState.mapping);
  renderPriceEditTable(rows, layout, supName, append, priceName, allowedUserIds, 'mcm-edit-preview');
  if(previewSec) previewSec.style.display = 'block';

  if(confirmBtn){
    confirmBtn.onclick = function(){
      if(fi) fi.value = '';
      if(typeof resetBtn === 'function') resetBtn();
      priceSaveEdited();
    };
  }
  if(changeBtn){
    changeBtn.onclick = function(){
      if(previewSec) previewSec.style.display = 'none';
      if(typeof resetBtn === 'function') resetBtn();
      openSupPriceManualMap();
    };
  }
}

function _bindPricePreviewActions(){
  var confirmBtn = document.getElementById('priceConfirmBtn');
  if(confirmBtn){
    confirmBtn.onclick = function(ev){
      if(ev) ev.preventDefault();
      applyManualColumnMapAndSave();
    };
  }
  var changeBtn = document.getElementById('priceChangeColsBtn');
  if(changeBtn){
    changeBtn.onclick = function(ev){
      if(ev) ev.preventDefault();
      openSupPriceManualMap();
    };
  }
  var saveTplBtn = document.getElementById('mcmSaveTplBtn');
  var applyBtn = document.getElementById('mcmApplyBtn');
  if(saveTplBtn){
    saveTplBtn.onclick = function(ev){
      if(ev) ev.preventDefault();
      saveCurrentSupPriceTemplate();
    };
  }
  if(applyBtn){
    applyBtn.onclick = function(ev){
      if(ev) ev.preventDefault();
      applyManualColumnMapAndSave();
    };
  }
}

document.addEventListener('DOMContentLoaded',function(){
  loadPriceLayoutsFromStorage();
  document.body.insertAdjacentHTML('beforeend',
    '<div id="pvLoad" style="position:fixed;inset:0;z-index:99999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">'+
    '<div style="font-family:Montserrat,sans-serif;font-size:26px;font-weight:900;background:linear-gradient(135deg,#52b788,#74c69d);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">КальКа</div>'+
    '<div id="pvTxt" style="font-size:13px;color:var(--t2);">Загрузка...</div>'+
     '<div style="width:180px;height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;"><div id="pvBar" style="height:100%;background:#5ba3f5;border-radius:2px;width:20%;transition:width .4s;"></div></div>'+
     '</div>');
  function setBar(pct,txt){var b=document.getElementById('pvBar');if(b)b.style.width=pct+'%';var t=document.getElementById('pvTxt');if(t&&txt)t.textContent=txt;}
  function finalizeBoot(){
    var ld=document.getElementById('pvLoad');if(ld)ld.remove();
    try{renderDemoG();}catch(e){console.error('renderDemoG failed during boot:',e);}
    try{scSw('Login');}catch(e){console.error('scSw failed during boot:',e);}
    try{
      document.querySelectorAll('.ov').forEach(function(ov){
        ov.addEventListener('mousedown',function(e){if(e.target===ov)ov.classList.remove('on');});
      });
    }catch(e){console.error('modal boot bind failed:',e);}
  }
  setBar(40,'Подключение к базе данных...');
  setTimeout(function(){
    var ld=document.getElementById('pvLoad');
    if(ld){
      console.error('Boot loader fallback triggered');
      finalizeBoot();
    }
  },6000);
  dbLoad(function(){
    setBar(100,'Готово!');
    setTimeout(function(){
      finalizeBoot();
    },200);
  });
});
