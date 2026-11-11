const APP_CONFIG = window.PJOTA_APP_CONFIG || {};
const STORAGE_KEY = APP_CONFIG.storageKey || "burgerstock.v1";
const AUTH_STORAGE_KEY = APP_CONFIG.authStorageKey || "burgerstock.auth.v1";
const SESSION_STORAGE_KEY = APP_CONFIG.sessionStorageKey || "burgerstock.session.v1";
const PRINT_SETTINGS_KEY = APP_CONFIG.printStorageKey || "burgerstock.print.v1";
const BACKUP_META_KEY = APP_CONFIG.backupMetaKey || "burgerstock.backup.v1";
const SOUND_SETTINGS_KEY = APP_CONFIG.soundStorageKey || "burgerstock.sound.v1";

const storageRepository = window.PJotaStorageRepository || {
  get(key) {
    return localStorage.getItem(key);
  },
  set(key, value) {
    localStorage.setItem(key, value);
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  getSession(key) {
    return sessionStorage.getItem(key);
  },
  setSession(key, value) {
    sessionStorage.setItem(key, value);
  },
  removeSession(key) {
    sessionStorage.removeItem(key);
  },
};

const defaultState = {
  ingredients: [],
  products: [],
  purchases: [],
  sales: [],
  orders: [],
  movements: [],
  expenses: [],
  cashClosings: [],
  cashAdjustments: [],
  auditLogs: [],
  deliveries: [],
  stockAdjustments: [],
  settings: {},
  customers: [],
};

const defaultAuthState = {
  users: [],
};

let reportFilter = {
  mode: "all",
  start: "",
  end: "",
};

let menuFilter = {
  query: "",
  status: "all",
};

let customerFilter = {
  query: "",
};

let printSettings = loadPrintSettings();
let soundSettings = loadSoundSettings();
let quickOrderDraft = {
  items: [],
  form: {
    customerName: "",
    customerPhone: "",
    customerWhatsapp: true,
    destination: "delivery",
    address: "",
    paymentMethod: "pix",
    deliveryFee: 0,
    discount: 0,
    surcharge: 0,
    note: "",
  },
};

let authState = loadAuthState();
let currentSession = loadSession();

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  if (globalThis.structuredClone) return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

const exampleState = {
  ingredients: [
    { id: createId(), name: "Pao brioche", unit: "un", stock: 0, min: 0 },
    { id: createId(), name: "Pao de hot dog", unit: "un", stock: 0, min: 0 },
    { id: createId(), name: "Carne hamburguer", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Carne moida", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Queijo mucarela", unit: "un", stock: 0, min: 0 },
    { id: createId(), name: "Queijo cheddar", unit: "un", stock: 0, min: 0 },
    { id: createId(), name: "Creme de cheddar artesanal", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Bacon", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Ovo", unit: "un", stock: 0, min: 0 },
    { id: createId(), name: "Alface", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Tomate", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Cebola caramelizada", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Barbecue", unit: "ml", stock: 0, min: 0 },
    { id: createId(), name: "Maionese da casa", unit: "ml", stock: 0, min: 0 },
    { id: createId(), name: "Salsicha", unit: "un", stock: 0, min: 0 },
    { id: createId(), name: "Batata palha", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Milho verde", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Salada para hot dog", unit: "g", stock: 0, min: 0 },
    { id: createId(), name: "Refrigerante lata 350ml", unit: "un", stock: 0, min: 0 },
  ],
  products: [],
  purchases: [],
  sales: [],
  orders: [],
  movements: [],
  expenses: [],
};

exampleState.products = [
  {
    id: createId(),
    name: "PCQ",
    menuName: "PCQ",
    description: "Pao brioche, carne, queijo mucarela e maionese da casa.",
    category: "Hamburgueres",
    imageUrl: "",
    menuActive: true,
    featured: false,
    sortOrder: 1,
    price: 18,
    recipe: [],
  },
  {
    id: createId(),
    name: "Classico",
    menuName: "Classico",
    description: "Pao brioche, carne, queijo mucarela, alface, tomate e maionese da casa.",
    category: "Hamburgueres",
    imageUrl: "",
    menuActive: true,
    featured: false,
    sortOrder: 2,
    price: 20,
    recipe: [],
  },
  {
    id: createId(),
    name: "X-Tudao",
    menuName: "X-Tudao",
    description: "Pao brioche, duas carnes, bacon, queijo mucarela, ovo, alface, tomate e maionese da casa.",
    category: "Hamburgueres",
    imageUrl: "",
    menuActive: true,
    featured: true,
    sortOrder: 3,
    price: 30,
    recipe: [],
  },
  {
    id: createId(),
    name: "Tradicional",
    menuName: "Tradicional",
    description: "Pao brioche, carne, queijo mucarela, ovo, alface, tomate e maionese da casa.",
    category: "Hamburgueres",
    imageUrl: "",
    menuActive: true,
    featured: false,
    sortOrder: 4,
    price: 23,
    recipe: [],
  },
  {
    id: createId(),
    name: "Bacon Cheese",
    menuName: "Bacon Cheese",
    description: "Pao brioche, carne, bacon, queijo cheddar ou mucarela, barbecue e maionese da casa.",
    category: "Hamburgueres",
    imageUrl: "",
    menuActive: true,
    featured: true,
    sortOrder: 5,
    price: 27,
    recipe: [],
  },
  {
    id: createId(),
    name: "P'jotinha",
    menuName: "P'jotinha",
    description: "Pao brioche, carne, creme de cheddar artesanal, bacon, cebola caramelizada e maionese da casa.",
    category: "Hamburgueres",
    imageUrl: "",
    menuActive: true,
    featured: true,
    sortOrder: 6,
    price: 25,
    recipe: [],
  },
  {
    id: createId(),
    name: "Dog Simples",
    menuName: "Dog Simples",
    description: "Pao, carne moida, uma salsicha, batata palha, milho verde, salada e maionese da casa.",
    category: "Hot Dogs",
    imageUrl: "",
    menuActive: true,
    featured: false,
    sortOrder: 7,
    price: 15,
    recipe: [],
  },
  {
    id: createId(),
    name: "Dog Duplo",
    menuName: "Dog Duplo",
    description: "Pao, carne moida, duas salsichas, batata palha, milho verde, salada e maionese da casa.",
    category: "Hot Dogs",
    imageUrl: "",
    menuActive: true,
    featured: false,
    sortOrder: 8,
    price: 18,
    recipe: [],
  },
  {
    id: createId(),
    name: "Latinha",
    menuName: "Latinha",
    description: "Jesus, Coca e Coca Zero 350ml.",
    category: "Bebidas",
    imageUrl: "",
    menuActive: true,
    featured: false,
    sortOrder: 9,
    price: 6,
    recipe: [],
  },
];

exampleState.purchases = [];

let state = loadState();

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const fileDateFormat = new Intl.DateTimeFormat("pt-BR");

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const orderStatuses = {
  awaiting_acceptance: { label: "Aguardando aceite", className: "warn", next: "in_production" },
  in_production: { label: "Em producao", className: "warn", next: "ready" },
  ready: { label: "Pronto", className: "", next: "dispatching" },
  dispatching: { label: "Saindo para entrega/mesa", className: "", next: "payment_confirmed" },
  payment_confirmed: { label: "Pagamento confirmado", className: "", next: "" },
  canceled: { label: "Cancelado", className: "neutral", next: "" },
};

const legacyOrderStatusMap = {
  pending: "awaiting_acceptance",
  confirmed: "payment_confirmed",
};

const orderBoardStatuses = ["awaiting_acceptance", "in_production", "ready", "dispatching", "payment_confirmed", "canceled"];



function loadAuthState(){ return {users:[]}; }



function loadSession(){ return null; }

function loadPrintSettings() {
  try {
    const raw = storageRepository.get(PRINT_SETTINGS_KEY);
    return raw ? { autoPrintOrders: true, ...JSON.parse(raw) } : { autoPrintOrders: true };
  } catch {
    return { autoPrintOrders: true };
  }
}

function savePrintSettings() {
  storageRepository.set(PRINT_SETTINGS_KEY, JSON.stringify(printSettings));
}

function loadSoundSettings() {
  try {
    const raw = storageRepository.get(SOUND_SETTINGS_KEY);
    return raw ? { enabled: true, ...JSON.parse(raw) } : { enabled: true };
  } catch {
    return { enabled: true };
  }
}

function saveSoundSettings() {
  storageRepository.set(SOUND_SETTINGS_KEY, JSON.stringify(soundSettings));
}

function saveSession(user){ currentSession={userId:user.id}; }

function clearSession(){ currentSession=null; authState={users:[]}; state=clone(defaultState); cloud.confirmed=null; }

function getCurrentUser() {
  if (!currentSession?.userId) return null;
  return authState.users.find((user) => user.id === currentSession.userId) || null;
}

function isAdmin() {
  return getCurrentUser()?.role === "admin";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validatePassword(value){ return typeof value==='string' && value.length>=10 && value.length<=72 && /[A-Za-z]/.test(value) && /[0-9]/.test(value) ? '' : 'Use de 10 a 72 caracteres, incluindo letras e números.'; }









function findUser(id) {
  return authState.users.find((user) => user.id === id);
}

function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return authState.users.find((user) => user.email === normalizedEmail);
}

function hasUserEmailConflict(email, currentId = "") {
  const normalizedEmail = normalizeEmail(email);
  return authState.users.some((user) => user.id !== currentId && user.email === normalizedEmail);
}

function normalizeState(input) {
  const normalized = { ...clone(defaultState), ...input };
  normalized.ingredients = Array.isArray(normalized.ingredients) ? normalized.ingredients : [];
  normalized.products = Array.isArray(normalized.products) ? normalized.products : [];
  normalized.purchases = Array.isArray(normalized.purchases) ? normalized.purchases : [];
  normalized.sales = Array.isArray(normalized.sales) ? normalized.sales : [];
  normalized.orders = Array.isArray(normalized.orders) ? normalized.orders : [];
  normalized.movements = Array.isArray(normalized.movements) ? normalized.movements : [];
  normalized.expenses = Array.isArray(normalized.expenses) ? normalized.expenses : [];
  normalized.cashClosings = Array.isArray(normalized.cashClosings) ? normalized.cashClosings : [];
  normalized.cashAdjustments = Array.isArray(normalized.cashAdjustments) ? normalized.cashAdjustments : [];
  normalized.auditLogs = Array.isArray(normalized.auditLogs) ? normalized.auditLogs : [];
  normalized.deliveries = Array.isArray(normalized.deliveries) ? normalized.deliveries : [];
  normalized.stockAdjustments = Array.isArray(normalized.stockAdjustments) ? normalized.stockAdjustments : [];
  normalized.settings = normalized.settings && typeof normalized.settings === "object" ? normalized.settings : {};
  normalized.customers = Array.isArray(normalized.customers) ? normalized.customers : [];

  normalized.ingredients = normalized.ingredients.map((ingredient) => ({
    id: String(ingredient.id || createId()),
    name: String(ingredient.name || "Materia-prima"),
    unit: String(ingredient.unit || "un"),
    stock: toNumber(ingredient.stock),
    min: toNumber(ingredient.min),
  }));

  normalized.products = normalized.products.map((product) => ({
    id: String(product.id || createId()),
    name: String(product.name || "Produto"),
    menuName: String(product.menuName || product.name || "Produto"),
    description: String(product.description || ""),
    category: String(product.category || "Cardapio"),
    imageUrl: String(product.imageUrl || ""),
    menuActive: product.menuActive !== false,
    featured: Boolean(product.featured),
    sortOrder: toNumber(product.sortOrder),
    price: toNumber(product.price),
    recipe: Array.isArray(product.recipe)
      ? product.recipe
          .map((line) => ({
            ingredientId: String(line.ingredientId || ""),
            quantity: toNumber(line.quantity),
          }))
          .filter((line) => line.ingredientId && line.quantity > 0)
      : [],
  }));

  normalized.purchases = normalized.purchases.map((purchase) => ({
    id: String(purchase.id || createId()),
    ingredientId: String(purchase.ingredientId || ""),
    ingredientName: String(purchase.ingredientName || ""),
    unit: String(purchase.unit || ""),
    quantity: toNumber(purchase.quantity),
    cost: toNumber(purchase.cost),
    date: purchase.date || new Date().toISOString(),
    updatedAt: purchase.updatedAt || "",
  }));

  normalized.sales = normalized.sales.map((sale) => normalizeSale(sale));
  normalized.orders = normalized.orders.map((order) => normalizeOrder(order));
  normalized.movements = normalized.movements.map((movement) => normalizeMovement(movement));
  normalized.expenses = normalized.expenses.map((expense) => normalizeExpense(expense));
  normalized.cashClosings = normalized.cashClosings.map((closing) => normalizeCashClosing(closing));
  normalized.cashAdjustments = normalized.cashAdjustments.map((adjustment) => normalizeCashAdjustment(adjustment));
  normalized.auditLogs = normalized.auditLogs.map((log) => normalizeAuditLog(log));
  normalized.deliveries = normalized.deliveries.map((delivery) => normalizeDelivery(delivery));
  normalized.stockAdjustments = normalized.stockAdjustments.map((adjustment) => normalizeStockAdjustment(adjustment));
  normalized.settings = normalizeSettings(normalized.settings);
  normalized.customers = normalized.customers
    .map((customer) => window.PJotaCustomerModel.normalizeCustomer(customer, createId))
    .filter((customer) => customer.phone);
  return normalized;
}

function normalizeOrderItem(item, fallback = {}) {
  const quantity = Math.max(1, Math.floor(toNumber(item.quantity || fallback.quantity || 1)));
  const price = toNumber(item.price ?? item.unitPrice ?? fallback.price);
  const total = toNumber(item.total) || quantity * price;

  return {
    productId: String(item.productId || fallback.productId || ""),
    productName: String(item.productName || fallback.productName || "Produto"),
    quantity,
    price,
    total,
    note: String(item.note || ""),
  };
}

function normalizeOrder(order) {
  const fallbackItem = {
    productId: order.productId,
    productName: order.productName,
    quantity: order.quantity,
    price: order.price,
  };
  const items = Array.isArray(order.items) && order.items.length
    ? order.items.map((item) => normalizeOrderItem(item))
    : [normalizeOrderItem(fallbackItem)];
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const price = items[0]?.price || 0;
  const subtotal = toNumber(order.subtotal) || items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = toNumber(order.deliveryFee);
  const discount = toNumber(order.discount);
  const surcharge = toNumber(order.surcharge);
  const total = toNumber(order.total) || Math.max(0, subtotal + deliveryFee + surcharge - discount);
  const rawStatus = String(order.status || "awaiting_acceptance");
  const status = orderStatuses[rawStatus] ? rawStatus : legacyOrderStatusMap[rawStatus] || "awaiting_acceptance";

  return {
    id: String(order.id || createId()),
    productId: String(order.productId || items[0]?.productId || ""),
    productName: String(order.productName || (items.length === 1 ? items[0].productName : `${items.length} itens`)),
    items,
    customerName: String(order.customerName || ""),
    customerPhone: String(order.customerPhone || ""),
    customerId: String(order.customerId || ""),
    customerWhatsapp: Boolean(order.customerWhatsapp),
    address: String(order.address || ""),
    paymentMethod: String(order.paymentMethod || "not_informed"),
    note: String(order.note || ""),
    destination: order.destination === "table" || order.destination === "pickup" ? order.destination : "delivery",
    quantity,
    price,
    subtotal,
    deliveryFee,
    discount,
    surcharge,
    total,
    status,
    date: order.date || new Date().toISOString(),
    acceptedAt: order.acceptedAt || order.confirmedAt || "",
    readyAt: order.readyAt || "",
    dispatchedAt: order.dispatchedAt || "",
    paidAt: order.paidAt || "",
    statusUpdatedAt: order.statusUpdatedAt || order.confirmedAt || order.date || new Date().toISOString(),
    confirmedAt: order.confirmedAt || "",
    inventoryDeductedAt: order.inventoryDeductedAt || "",
    saleId: order.saleId || "",
    saleIds: Array.isArray(order.saleIds) ? order.saleIds : order.saleId ? [order.saleId] : [],
    cancelStage: String(order.cancelStage || ""),
    cancelReason: String(order.cancelReason || ""),
    cancelNote: String(order.cancelNote || ""),
    canceledAt: order.canceledAt || "",
    deliveryPerson: String(order.deliveryPerson || ""),
    deliveryFeePaid: toNumber(order.deliveryFeePaid),
    deliveryStartedAt: order.deliveryStartedAt || "",
    deliveryFinishedAt: order.deliveryFinishedAt || "",
  };
}

function normalizeMovement(movement) {
  return {
    id: String(movement.id || createId()),
    date: movement.date || new Date().toISOString(),
    type: String(movement.type || "ajuste"),
    ingredientId: String(movement.ingredientId || ""),
    ingredientName: String(movement.ingredientName || ""),
    unit: String(movement.unit || ""),
    quantity: toNumber(movement.quantity),
    source: String(movement.source || ""),
    sourceId: String(movement.sourceId || ""),
  };
}

function normalizeExpense(expense) {
  return {
    id: String(expense.id || createId()),
    category: String(expense.category || "Outros"),
    description: String(expense.description || expense.category || "Despesa operacional"),
    amount: toNumber(expense.amount),
    date: expense.date || new Date().toISOString(),
    updatedAt: expense.updatedAt || "",
  };
}

function normalizeCashClosing(closing) {
  return {
    id: String(closing.id || createId()),
    openedAt: closing.openedAt || new Date().toISOString(),
    closedAt: closing.closedAt || "",
    responsible: String(closing.responsible || ""),
    openingAmount: toNumber(closing.openingAmount),
    cashExpected: toNumber(closing.cashExpected),
    pixExpected: toNumber(closing.pixExpected),
    cardExpected: toNumber(closing.cardExpected),
    otherExpected: toNumber(closing.otherExpected),
    totalExpected: toNumber(closing.totalExpected),
    totalCounted: toNumber(closing.totalCounted),
    difference: toNumber(closing.difference),
    notes: String(closing.notes || ""),
    status: closing.status === "closed" ? "closed" : "open",
  };
}

function normalizeCashAdjustment(adjustment) {
  return {
    id: String(adjustment.id || createId()),
    cashId: String(adjustment.cashId || ""),
    type: adjustment.type === "sangria" ? "sangria" : "suprimento",
    amount: toNumber(adjustment.amount),
    note: String(adjustment.note || ""),
    responsible: String(adjustment.responsible || ""),
    date: adjustment.date || new Date().toISOString(),
  };
}

function normalizeAuditLog(log) {
  return {
    id: String(log.id || createId()),
    date: log.date || new Date().toISOString(),
    user: String(log.user || "Sistema"),
    action: String(log.action || "Alteracao"),
    detail: String(log.detail || ""),
  };
}

function normalizeDelivery(delivery) {
  return {
    id: String(delivery.id || createId()),
    orderId: String(delivery.orderId || ""),
    orderNumber: String(delivery.orderNumber || ""),
    customerName: String(delivery.customerName || ""),
    motoboy: String(delivery.motoboy || ""),
    fee: toNumber(delivery.fee),
    startedAt: delivery.startedAt || "",
    deliveredAt: delivery.deliveredAt || "",
  };
}

function normalizeStockAdjustment(adjustment) {
  return {
    id: String(adjustment.id || createId()),
    ingredientId: String(adjustment.ingredientId || ""),
    ingredientName: String(adjustment.ingredientName || ""),
    unit: String(adjustment.unit || ""),
    type: String(adjustment.type || "ajuste"),
    quantity: toNumber(adjustment.quantity),
    reason: String(adjustment.reason || ""),
    date: adjustment.date || new Date().toISOString(),
    user: String(adjustment.user || "Sistema"),
  };
}

function normalizeSettings(settings = {}) {
  const defaults = APP_CONFIG.defaultSettings || {};
  return {
    companyName: String(settings.companyName || defaults.companyName || "P'Jota Buguer"),
    address: String(settings.address || defaults.address || ""),
    phone: String(settings.phone || defaults.phone || ""),
    whatsapp: String(settings.whatsapp || defaults.whatsapp || ""),
    defaultDeliveryFee: toNumber(settings.defaultDeliveryFee || defaults.defaultDeliveryFee),
    printMessage: String(settings.printMessage || defaults.printMessage || "Obrigado pela preferencia!"),
    logoUrl: String(settings.logoUrl || defaults.logoUrl || ""),
  };
}

function normalizeSale(sale) {
  const quantity = toNumber(sale.quantity);
  const price = toNumber(sale.price);
  const total = toNumber(sale.total) || quantity * price;
  const recipeSnapshot = Array.isArray(sale.recipeSnapshot)
    ? sale.recipeSnapshot
        .map((line) => ({
          ingredientId: String(line.ingredientId || ""),
          quantity: toNumber(line.quantity),
        }))
        .filter((line) => line.ingredientId && line.quantity > 0)
    : [];
  const cmvUnit = Number.isFinite(Number(sale.cmvUnit)) ? Number(sale.cmvUnit) : null;
  const cmvTotal = Number.isFinite(Number(sale.cmvTotal)) ? Number(sale.cmvTotal) : null;

  return {
    id: String(sale.id || createId()),
    productId: String(sale.productId || ""),
    productName: String(sale.productName || "Produto"),
    quantity,
    price,
    total,
    date: sale.date || new Date().toISOString(),
    recipeSnapshot,
    cmvUnit,
    cmvTotal,
    grossProfit: Number.isFinite(Number(sale.grossProfit)) ? Number(sale.grossProfit) : total - (cmvTotal || 0),
    source: String(sale.source || "manual"),
    orderId: String(sale.orderId || ""),
    updatedAt: sale.updatedAt || "",
  };
}

function loadState(){ return clone(defaultState); }

async function saveState(){
  if(!isAdmin()) throw new Error('Apenas administradores podem editar estes dados.');
  await cloudMutate('state.save',normalizeState(state));
}

function formatQuantity(value, unit) {
  return `${toNumber(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${escapeHtml(unit)}`;
}

function findIngredient(id) {
  return state.ingredients.find((item) => item.id === id);
}

function findProduct(id) {
  return state.products.find((item) => item.id === id);
}

function findPurchase(id) {
  return state.purchases.find((item) => item.id === id);
}

function findSale(id) {
  return state.sales.find((item) => item.id === id);
}

function findOrder(id) {
  return state.orders.find((item) => item.id === id);
}

function findExpense(id) {
  return state.expenses.find((item) => item.id === id);
}

function findCustomer(id) {
  return state.customers.find((item) => item.id === id);
}

function findCustomerByPhone(phone) {
  return window.PJotaCustomerService.findByPhone(state.customers, phone);
}

function applyCustomerToQuickOrder(customer) {
  if (!customer) return;
  syncQuickOrderFormFromDom();
  quickOrderDraft.form.customerName = customer.name;
  quickOrderDraft.form.customerPhone = customer.phone;
  quickOrderDraft.form.customerWhatsapp = customer.whatsapp;
  if (quickOrderDraft.form.destination === "delivery" && customer.address) {
    quickOrderDraft.form.address = customer.address;
  }
  renderDigitalMenu();
}

function updateQuickOrderFromPhone() {
  const customer = findCustomerByPhone($("#quickPhone")?.value);
  if (customer) applyCustomerToQuickOrder(customer);
}

function getCurrentUserName() {
  const user = getCurrentUser();
  return user ? `${user.name} (${user.role === "admin" ? "admin" : "operador"})` : "Sistema";
}

function addAuditLog(action, detail = "") {
  state.auditLogs.push({
    id: createId(),
    date: new Date().toISOString(),
    user: getCurrentUserName(),
    action,
    detail,
  });
}

function getOpenCash() {
  return state.cashClosings.find((cash) => cash.status === "open");
}

function getStoreSettings() {
  state.settings = normalizeSettings(state.settings);
  return state.settings;
}

function getOrderStatus(status) {
  return orderStatuses[status] || orderStatuses.awaiting_acceptance;
}

function getOrderStatusLabel(order, status = order.status) {
  if (status !== "dispatching") return getOrderStatus(status).label;
  if (order.destination === "table") return "Indo para mesa";
  if (order.destination === "pickup") return "Aguardando retirada";
  return "Saiu para entrega";
}

function getOrderNumber(order) {
  return String(order.id || "").replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase() || "PEDIDO";
}

function getOrderItems(order) {
  return Array.isArray(order.items) && order.items.length ? order.items : [normalizeOrderItem(order)];
}

function getOrderDestinationLabel(destination) {
  const labels = {
    delivery: "Entrega",
    table: "Mesa",
    pickup: "Retirada",
  };
  return labels[destination] || labels.delivery;
}

function getPaymentMethodLabel(method) {
  const labels = {
    pix: "Pix",
    cash: "Dinheiro",
    card: "Cartao",
    other: "Outro",
    not_informed: "Nao informado",
  };
  return labels[method] || labels.not_informed;
}

function calculateOrderTotal({ quantity, price, deliveryFee = 0, discount = 0, surcharge = 0 }) {
  const subtotal = toNumber(quantity) * toNumber(price);
  return {
    subtotal,
    total: Math.max(0, subtotal + toNumber(deliveryFee) + toNumber(surcharge) - toNumber(discount)),
  };
}

function calculateOrderItemsTotals(items, extras = {}) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  return {
    subtotal,
    total: Math.max(0, subtotal + toNumber(extras.deliveryFee) + toNumber(extras.surcharge) - toNumber(extras.discount)),
  };
}

function canFulfillItems(items) {
  const calculation = window.PJotaOrderInventoryService.calculateRequirements(items, state.products);
  return calculation.ok && window.PJotaOrderInventoryService.validateAvailability(calculation.requirements, state.ingredients).ok;
}

function deductOrderInventory(order, items) {
  const result = window.PJotaOrderInventoryService.deductOnce(order, items, state.products, state.ingredients);
  if (!result.ok) return result;
  if (result.alreadyDeducted) return result;

  result.requirements.forEach((requirement) => {
    const ingredient = findIngredient(requirement.ingredientId);
    if (ingredient) {
      recordMovement({
        type: "venda",
        ingredient,
        quantity: requirement.quantity,
        source: "Pedido",
        sourceId: order.id,
      });
    }
  });
  return result;
}

function recordMovement({ type, ingredient, quantity, source, sourceId }) {
  state.movements.push({
    id: createId(),
    date: new Date().toISOString(),
    type,
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    quantity,
    source,
    sourceId: sourceId || "",
  });
}

function wrapReceiptText(text, width = 28) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    if (!line) {
      line = word;
      return;
    }
    if (`${line} ${word}`.length <= width) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function receiptLine(label, value, width = 28) {
  const left = String(label || "");
  const right = String(value || "");
  const spaces = Math.max(1, width - left.length - right.length);
  if (left.length + right.length + spaces <= width) return `${left}${" ".repeat(spaces)}${right}`;
  return `${left}\n${right}`;
}

function receiptBlock(label, text, width = 28) {
  return [`${label}:`, ...wrapReceiptText(text || "Nao informado", width)].join("\n");
}

function receiptSeparator(width = 28) {
  return "-".repeat(width);
}

function getReceiptText(order) {
  const settings = getStoreSettings();
  const lines = [
    settings.companyName.toUpperCase(),
    "COMPROVANTE CLIENTE",
    receiptSeparator(),
    receiptLine("Pedido", `#${getOrderNumber(order)}`),
    receiptLine("Data", dateFormat.format(new Date(order.date))),
    receiptLine("Destino", getOrderDestinationLabel(order.destination)),
    receiptLine("Status", getOrderStatusLabel(order)),
    receiptLine("Pagto", getPaymentMethodLabel(order.paymentMethod)),
    receiptSeparator(),
    receiptBlock("Cliente", order.customerName),
  ];

  if (order.customerPhone) lines.push(receiptBlock("Telefone", `${order.customerPhone}${order.customerWhatsapp ? " / WhatsApp" : ""}`));
  if (order.address) lines.push(receiptBlock("Local", order.address));

  lines.push(receiptSeparator(), "ITENS");
  getOrderItems(order).forEach((item) => {
    lines.push(...wrapReceiptText(`${item.quantity}x ${item.productName}`, 28));
    lines.push(receiptLine("Valor", currency.format(item.total)));
  });

  if (order.deliveryFee > 0) lines.push(receiptLine("Taxa entrega", currency.format(order.deliveryFee)));
  if (order.surcharge > 0) lines.push(receiptLine("Acrescimo", currency.format(order.surcharge)));
  if (order.discount > 0) lines.push(receiptLine("Desconto", `-${currency.format(order.discount)}`));

  lines.push(
    receiptSeparator(),
    receiptBlock("Obs", order.note || "Sem observacao"),
    receiptSeparator(),
    receiptLine("TOTAL", currency.format(order.total)),
    receiptSeparator(),
    ...wrapReceiptText(settings.printMessage, 28),
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  );

  return lines.join("\n");
}

function getKitchenReceiptText(order) {
  const settings = getStoreSettings();
  const lines = [
    settings.companyName.toUpperCase(),
    `COZINHA #${getOrderNumber(order)}`,
    receiptSeparator(),
    receiptBlock("Cliente", order.customerName),
    receiptLine("Destino", getOrderDestinationLabel(order.destination)),
  ];

  if (order.address) lines.push(receiptBlock("Local", order.address));

  lines.push(receiptSeparator(), "PRODUTOS");
  getOrderItems(order).forEach((item) => {
    lines.push(...wrapReceiptText(`${item.quantity}x ${item.productName}${item.note ? ` - ${item.note}` : ""}`, 28));
  });

  lines.push(
    receiptSeparator(),
    receiptBlock("Obs", order.note || "Sem observacao"),
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  );

  return lines.join("\n");
}

function getReceiptHtml(order) {
  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Pedido #${getOrderNumber(order)}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body {
            width: 38mm;
            margin: 0;
            padding: 0 0 26mm 0;
            color: #000;
            font-family: ui-monospace, "Courier New", monospace;
            font-size: 8px;
            line-height: 1.15;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-break: normal;
            font: inherit;
          }
          .feed {
            height: 24mm;
          }
        </style>
      </head>
      <body>
        <pre>${escapeHtml(getReceiptText(order))}</pre>
        <div class="feed"></div>
      </body>
    </html>`;
}

function getKitchenReceiptHtml(order) {
  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Comanda #${getOrderNumber(order)}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body {
            width: 38mm;
            margin: 0;
            padding: 0 0 26mm 0;
            color: #000;
            font-family: ui-monospace, "Courier New", monospace;
            font-size: 8.5px;
            line-height: 1.15;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-break: normal;
            font: inherit;
          }
          .feed {
            height: 24mm;
          }
        </style>
      </head>
      <body>
        <pre>${escapeHtml(getKitchenReceiptText(order))}</pre>
        <div class="feed"></div>
      </body>
    </html>`;
}

function printHtml(html, blockedMessage) {
  const printWindow = window.open("", "_blank", "width=380,height=640");
  if (!printWindow) {
    alert(blockedMessage);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.addEventListener("load", () => {
    printWindow.print();
    printWindow.close();
  });
}

function printOrderReceipt(order) {
  printHtml(getReceiptHtml(order), "O navegador bloqueou a janela de impressao. Libere pop-ups para imprimir automaticamente.");
}

function printKitchenCommand(order) {
  printHtml(getKitchenReceiptHtml(order), "O navegador bloqueou a janela de impressao da cozinha. Libere pop-ups para imprimir automaticamente.");
}

function playNewOrderSound() {
  if (!soundSettings.enabled) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // O navegador pode bloquear audio ate haver interacao do usuario.
  }
}

function ingredientOptions(selectedId = "") {
  return state.ingredients
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)} (${escapeHtml(item.unit)})</option>`,
    )
    .join("");
}

function productOptions(selectedId = "") {
  return state.products
    .map(
      (product) =>
        `<option value="${escapeHtml(product.id)}" ${product.id === selectedId ? "selected" : ""}>${escapeHtml(product.name)}</option>`,
    )
    .join("");
}

function hasNameConflict(items, name, currentId = "") {
  return items.some((item) => item.id !== currentId && item.name.trim().toLowerCase() === name.trim().toLowerCase());
}

function getIngredientCostStats(ingredientId) {
  const purchases = state.purchases.filter((purchase) => purchase.ingredientId === ingredientId);
  const quantity = purchases.reduce((sum, purchase) => sum + toNumber(purchase.quantity), 0);
  const cost = purchases.reduce((sum, purchase) => sum + toNumber(purchase.cost), 0);

  return {
    totalQuantity: quantity,
    totalCost: cost,
    averageCost: quantity > 0 ? cost / quantity : 0,
  };
}

function calculateRecipeCmv(recipe) {
  return recipe.reduce((sum, line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (!ingredient) return sum;

    const { averageCost } = getIngredientCostStats(ingredient.id);
    return sum + averageCost * line.quantity;
  }, 0);
}

function calculateProductCmv(product) {
  return calculateRecipeCmv(product.recipe);
}

function getStockValue() {
  return state.ingredients.reduce((sum, ingredient) => {
    const { averageCost } = getIngredientCostStats(ingredient.id);
    return sum + averageCost * ingredient.stock;
  }, 0);
}

function createRecipeSnapshot(product) {
  return product.recipe.map((line) => ({
    ingredientId: line.ingredientId,
    quantity: line.quantity,
  }));
}

function getSaleRecipe(sale) {
  if (sale.recipeSnapshot?.length) return sale.recipeSnapshot;
  return findProduct(sale.productId)?.recipe || [];
}

function getSaleCmv(sale) {
  if (Number.isFinite(Number(sale.cmvTotal))) return Number(sale.cmvTotal);
  const recipe = getSaleRecipe(sale);
  return calculateRecipeCmv(recipe) * sale.quantity;
}

function getSaleGrossProfit(sale) {
  if (Number.isFinite(Number(sale.grossProfit))) return Number(sale.grossProfit);
  return sale.total - getSaleCmv(sale);
}

function getCmvStatus(percent) {
  if (percent < 30) return { label: "Bom", className: "" };
  if (percent <= 40) return { label: "Atencao", className: "warn" };
  return { label: "Ruim", className: "danger" };
}

function getStockStatus(item) {
  if (item.min <= 0) return { label: "Normal", className: "", level: "normal" };
  if (item.stock <= item.min * 0.5) return { label: "Critico", className: "danger", level: "critical" };
  if (item.stock <= item.min) return { label: "Atencao", className: "warn", level: "attention" };
  return { label: "Normal", className: "", level: "normal" };
}

function getInventoryAlerts() {
  return state.ingredients
    .filter((item) => item.stock <= item.min)
    .map((item) => ({
      ...item,
      status: getStockStatus(item),
      suggested: Math.max(item.min - item.stock, 0),
    }));
}

function getCriticalItems() {
  return getInventoryAlerts();
}

function applyPurchaseToStock(purchase) {
  const ingredient = findIngredient(purchase.ingredientId);
  if (ingredient) ingredient.stock += purchase.quantity;
}

function removePurchaseFromStock(purchase) {
  const ingredient = findIngredient(purchase.ingredientId);
  if (!ingredient) return true;
  if (ingredient.stock - purchase.quantity < -0.000001) return false;
  ingredient.stock -= purchase.quantity;
  return true;
}

function createPurchase(ingredient, quantity, cost) {
  const purchase = {
    id: createId(),
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    quantity,
    cost,
    date: new Date().toISOString(),
  };
  state.purchases.push(purchase);
  applyPurchaseToStock(purchase);
  recordMovement({ type: "compra", ingredient, quantity, source: "Compra", sourceId: purchase.id });
  return purchase;
}

function updatePurchase(purchase, ingredient, quantity, cost) {
  const updated = {
    ...purchase,
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    quantity,
    cost,
    updatedAt: new Date().toISOString(),
  };

  if (purchase.ingredientId === ingredient.id) {
    const currentIngredient = findIngredient(purchase.ingredientId);
    const nextStock = currentIngredient.stock - purchase.quantity + quantity;
    if (nextStock < -0.000001) {
      alert("Nao e possivel editar essa compra porque o estoque ficaria negativo.");
      return false;
    }
    currentIngredient.stock = nextStock;
    const diff = quantity - purchase.quantity;
    if (Math.abs(diff) > 0.000001) {
      recordMovement({
        type: "ajuste",
        ingredient: currentIngredient,
        quantity: Math.abs(diff),
        source: diff > 0 ? "Edicao de compra (+)" : "Edicao de compra (-)",
        sourceId: purchase.id,
      });
    }
  } else {
    const oldIngredient = findIngredient(purchase.ingredientId);
    if (!removePurchaseFromStock(purchase)) {
      alert("Nao e possivel editar essa compra porque a remocao deixaria o estoque negativo.");
      return false;
    }
    if (oldIngredient) {
      recordMovement({ type: "cancelamento", ingredient: oldIngredient, quantity: purchase.quantity, source: "Edicao de compra", sourceId: purchase.id });
    }
    applyPurchaseToStock(updated);
    recordMovement({ type: "compra", ingredient, quantity, source: "Edicao de compra", sourceId: purchase.id });
  }

  Object.assign(purchase, updated);
  addAuditLog("Compra editada", `${ingredient.name} - ${formatQuantity(quantity, ingredient.unit)} - ${currency.format(cost)}`);
  return true;
}

async function deletePurchase(id) {
  const purchase = findPurchase(id);
  if (!purchase) return;
  if (!await cloudConfirm(`Deseja excluir a compra de "${purchase.ingredientName}"? O estoque sera reduzido.`)) return;
  if (!removePurchaseFromStock(purchase)) {
    alert("Nao e possivel excluir essa compra porque o estoque ficaria negativo.");
    return;
  }
  const ingredient = findIngredient(purchase.ingredientId);
  if (ingredient) {
    recordMovement({ type: "cancelamento", ingredient, quantity: purchase.quantity, source: "Exclusao de compra", sourceId: purchase.id });
  }
  state.purchases = state.purchases.filter((item) => item.id !== id);
  addAuditLog("Compra removida", `${purchase.ingredientName} - ${currency.format(purchase.cost)}`);
  if ($("#purchaseId").value === id) resetPurchaseForm();
  await saveState();
  renderAll();
}

function restoreSaleStock(sale) {
  getSaleRecipe(sale).forEach((line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (ingredient) ingredient.stock += line.quantity * sale.quantity;
  });
}

function deductSaleStock(sale) {
  getSaleRecipe(sale).forEach((line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (ingredient) ingredient.stock -= line.quantity * sale.quantity;
  });
}

function deductProductStock(product, quantity) {
  product.recipe.forEach((line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (ingredient) ingredient.stock -= line.quantity * quantity;
  });
}

function buildSale(product, quantity, price, extra = {}) {
  const recipeSnapshot = createRecipeSnapshot(product);
  const cmvUnit = calculateRecipeCmv(recipeSnapshot);
  const total = quantity * price;
  const cmvTotal = cmvUnit * quantity;

  return {
    id: createId(),
    productId: product.id,
    productName: product.name,
    quantity,
    price,
    total,
    date: new Date().toISOString(),
    recipeSnapshot,
    cmvUnit,
    cmvTotal,
    grossProfit: total - cmvTotal,
    ...extra,
  };
}

function createSaleFromProduct(product, quantity, price, extra = {}) {
  if (!extra.skipStockDeduction && !canSell(product, quantity)) return null;
  const sale = buildSale(product, quantity, price, extra);
  if (!extra.skipStockDeduction) {
    deductProductStock(product, quantity);
    product.recipe.forEach((line) => {
      const ingredient = findIngredient(line.ingredientId);
      if (ingredient) {
        recordMovement({
          type: "venda",
          ingredient,
          quantity: line.quantity * quantity,
          source: extra.orderId ? "Pedido" : "Venda",
          sourceId: extra.orderId || sale.id,
        });
      }
    });
  }
  state.sales.push(sale);
  addAuditLog("Venda registrada", `${product.name} - ${quantity} un - ${currency.format(sale.total)}`);
  return sale;
}

function canSell(product, quantity) {
  if (!product || !Array.isArray(product.recipe) || !product.recipe.length || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) return false;

  return product.recipe.every((line) => {
    const ingredient = findIngredient(line.ingredientId);
    return ingredient && ingredient.stock >= line.quantity * quantity;
  });
}

function getDateRange() {
  const now = new Date();
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let start = null;
  let end = null;

  if (reportFilter.mode === "today") {
    start = startOfDay(now);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  }

  if (reportFilter.mode === "week") {
    start = startOfDay(now);
    start.setDate(start.getDate() - start.getDay());
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  }

  if (reportFilter.mode === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  if (reportFilter.mode === "custom") {
    start = reportFilter.start ? new Date(`${reportFilter.start}T00:00:00`) : null;
    end = reportFilter.end ? new Date(`${reportFilter.end}T23:59:59.999`) : null;
  }

  return { start, end };
}

function isInPeriod(dateValue) {
  const date = new Date(dateValue);
  const { start, end } = getDateRange();
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function getFilteredSales() {
  return state.sales.filter((sale) => {
    if (!isInPeriod(sale.date)) return false;
    const order = sale.orderId ? findOrder(sale.orderId) : null;
    return order?.status !== "canceled";
  });
}

function getFilteredPurchases() {
  return state.purchases.filter((purchase) => isInPeriod(purchase.date));
}

function getFilteredExpenses() {
  return state.expenses.filter((expense) => isInPeriod(expense.date));
}

function calculatePeriodMetrics() {
  const sales = getFilteredSales();
  const purchases = getFilteredPurchases();
  const expenses = getFilteredExpenses();
  const revenue = sales.reduce((sum, sale) => sum + toNumber(sale.total), 0);
  const purchasesTotal = purchases.reduce((sum, purchase) => sum + toNumber(purchase.cost), 0);
  const expensesTotal = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const soldCmv = sales.reduce((sum, sale) => sum + getSaleCmv(sale), 0);
  const grossProfit = sales.reduce((sum, sale) => sum + getSaleGrossProfit(sale), 0);

  return {
    sales,
    purchases,
    expenses,
    revenue,
    purchasesTotal,
    expensesTotal,
    soldCmv,
    grossProfit,
    realProfit: revenue - soldCmv - expensesTotal,
    salesQuantity: sales.reduce((sum, sale) => sum + toNumber(sale.quantity), 0),
  };
}

function activateTab(tabId) {
  const targetButton = $(`.tab-button[data-tab="${tabId}"]`);
  const targetPanel = $(`#${tabId}`);
  if (!targetPanel || targetPanel.classList.contains("hidden") || targetButton?.classList.contains("hidden")) return;

  $$(".tab-button").forEach((item) => item.classList.remove("active"));
  $$(".tab-panel").forEach((item) => item.classList.remove("active"));
  if (targetButton) {
    targetButton.classList.add("active");
  }
  targetPanel.classList.add("active");
}

function renderAll() {
  renderAuthGate();
  renderSelects();
  renderDashboard();
  renderInventory();
  renderProducts();
  renderDigitalMenu();
  renderMenuCatalog();
  renderCustomers();
  renderKitchen();
  renderDeliveries();
  renderCashClosing();
  renderMovements();
  renderFinance();
  renderInvestment();
  renderReports();
  renderSettings();
  renderAudit();
  renderBackupWarning();
  renderPurchases();
  renderSales();
  renderUsers();
  renderRecipePreview();
  updateSaleHint();
}

function renderAuthGate() {
  const currentUser = getCurrentUser();
  const hasUsers = !cloud.setup;
  const authenticated = Boolean(currentUser);

  $("#authScreen").classList.toggle("hidden", authenticated);
  $("#setupForm").classList.toggle("hidden", hasUsers);
  $("#loginForm").classList.toggle("hidden", !hasUsers || authenticated);
  document.body.classList.toggle("locked", !authenticated);
  $(".app-shell").classList.toggle("hidden", !authenticated);

  $$(".admin-only").forEach((item) => item.classList.toggle("hidden", !isAdmin()));

  if (!authenticated) return;

  $("#currentUserBadge").textContent = `${currentUser.name} (${currentUser.role === "admin" ? "admin" : "operador"})`;
  const activePanel = $(".tab-panel.active");
  const activeButton = activePanel ? $(`.tab-button[data-tab="${activePanel.id}"]`) : null;
  if (!activePanel || activeButton?.classList.contains("hidden")) activateTab(isAdmin() ? "dashboard" : "menu");
}

function renderUsers() {
  if (!$("#usersTable") || !isAdmin()) return;

  $("#usersTable").innerHTML =
    authState.users
      .map(
        (user) => `<tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${user.role === "admin" ? "Administrador" : "Operador"}</td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-user" type="button" data-id="${escapeHtml(user.id)}">Editar</button>
              <button class="danger-button delete-user" type="button" data-id="${escapeHtml(user.id)}">Excluir</button>
            </div>
          </td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="4">Nenhum usuario cadastrado.</td></tr>`;

  $$(".edit-user").forEach((button) => {
    button.addEventListener("click", () => startUserEdit(button.dataset.id));
  });

  $$(".delete-user").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.id));
  });
}

function renderSelects() {
  const ingredientSelects = ["#purchaseIngredient", ".recipe-ingredient"];
  ingredientSelects.forEach((selector) => {
    $$(selector).forEach((select) => {
      const selected = select.value;
      select.innerHTML = ingredientOptions(selected);
    });
  });

  $("#saleProduct").innerHTML = productOptions($("#saleProduct").value);
  const selectedProduct = findProduct($("#saleProduct").value) || state.products[0];
  $("#salePrice").value = selectedProduct ? selectedProduct.price.toFixed(2) : "";
  updateAllRecipeLineUnits();
  renderRecipeSearchResults();
}

function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = state.sales.filter((sale) => sale.date.slice(0, 10) === today);
  const todayOrders = state.orders.filter((order) => order.date.slice(0, 10) === today && order.status !== "canceled");
  const todayExpenses = state.expenses.filter((expense) => expense.date.slice(0, 10) === today);
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const todayCmv = todaySales.reduce((sum, sale) => sum + getSaleCmv(sale), 0);
  const todayExpenseTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const openOrders = state.orders.filter((order) => ["awaiting_acceptance", "in_production", "ready", "dispatching"].includes(order.status));
  const topProduct = Object.entries(sumBy(todaySales, (sale) => sale.productName, (sale) => sale.quantity))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)[0];
  const criticalItems = getCriticalItems();

  $("#statRevenue").textContent = currency.format(todayRevenue);
  $("#statOpenOrders").textContent = openOrders.length.toLocaleString("pt-BR");
  $("#statDayProfit").textContent = currency.format(todayRevenue - todayCmv - todayExpenseTotal);
  $("#statCriticalCount").textContent = criticalItems.length.toLocaleString("pt-BR");
  $("#statTopProduct").textContent = topProduct ? topProduct.label : "-";

  $("#alertsTable").innerHTML =
    criticalItems
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatQuantity(item.stock, item.unit)}</td>
          <td>${formatQuantity(item.min, item.unit)}</td>
          <td><span class="badge ${item.status.className}">${item.status.label}</span></td>
          <td><span class="badge danger">${formatQuantity(item.suggested, item.unit)}</span></td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="5" class="empty">Nenhum ingrediente abaixo do minimo.</td></tr>`;

  $("#periodSummaryTable").innerHTML =
    todayOrders
      .slice(-8)
      .reverse()
      .map((order) => `<tr><th>#${getOrderNumber(order)} - ${escapeHtml(order.customerName || "Cliente")}</th><td>${getOrderStatusLabel(order)}</td></tr>`)
      .join("") || `<tr><td class="empty">Nenhum pedido hoje.</td></tr>`;
}

function renderInventory() {
  $("#inventoryTable").innerHTML =
    state.ingredients
      .map((item) => {
        const status = getStockStatus(item);
        return `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatQuantity(item.stock, item.unit)}</td>
          <td>${formatQuantity(item.min, item.unit)}</td>
          <td><span class="badge ${status.className}">${status.label}</span></td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-ingredient" type="button" data-id="${escapeHtml(item.id)}">Editar</button>
              <button class="ghost-button restock-ingredient" type="button" data-id="${escapeHtml(item.id)}">Repor</button>
              <button class="danger-button delete-ingredient" type="button" data-id="${escapeHtml(item.id)}">Excluir</button>
            </div>
          </td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="5" class="empty">Cadastre ingredientes para iniciar o estoque.</td></tr>`;

  $$(".edit-ingredient").forEach((button) => {
    button.addEventListener("click", () => startIngredientEdit(button.dataset.id));
  });

  $$(".restock-ingredient").forEach((button) => {
    button.addEventListener("click", () => startIngredientRestock(button.dataset.id));
  });

  $$(".delete-ingredient").forEach((button) => {
    button.addEventListener("click", () => deleteIngredient(button.dataset.id));
  });
}

function renderProducts() {
  $("#productList").innerHTML =
    state.products
      .map((product) => {
        const pendingRecipe = !product.recipe.length;
        const cmv = calculateProductCmv(product);
        const profit = product.price - cmv;
        const margin = product.price > 0 ? (profit / product.price) * 100 : 0;
        const cmvPercent = product.price > 0 ? (cmv / product.price) * 100 : 0;
        const popularity = state.sales
          .filter((sale) => sale.productId === product.id)
          .reduce((sum, sale) => sum + sale.quantity, 0);
        const recipeItems = product.recipe
          .map((line) => {
            const ingredient = findIngredient(line.ingredientId);
            return ingredient
              ? `<li>${formatQuantity(line.quantity, ingredient.unit)} de ${escapeHtml(ingredient.name)}</li>`
              : "";
          })
          .filter(Boolean)
          .join("");

        return `<article class="product-card">
          <div class="product-card-header">
            <strong>${escapeHtml(product.name)} - ${currency.format(product.price)}</strong>
            <div class="row-actions">
              ${pendingRecipe ? `<span class="badge warn">Ficha pendente</span>` : ""}
              ${cmvPercent > 40 ? `<span class="badge danger">CMV alto</span>` : ""}
              <button class="ghost-button edit-product" type="button" data-id="${escapeHtml(product.id)}">Editar</button>
              <button class="danger-button delete-product" type="button" data-id="${escapeHtml(product.id)}">Excluir</button>
            </div>
          </div>
          <div class="product-metrics">
            <span>Custo ${currency.format(cmv)}</span>
            <span>Lucro un. ${currency.format(profit)}</span>
            <span>Margem ${margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
            <span>Popularidade ${popularity}</span>
          </div>
          <small>Baixa automatica de estoque ao vender 1 unidade:</small>
          <ul>${recipeItems || "<li>Sem materia-prima cadastrada</li>"}</ul>
        </article>`;
      })
      .join("") || `<div class="empty">Cadastre hamburgueres e suas receitas.</div>`;

  $$(".edit-product").forEach((button) => {
    button.addEventListener("click", () => startProductEdit(button.dataset.id));
  });

  $$(".delete-product").forEach((button) => {
    button.addEventListener("click", () => deleteProduct(button.dataset.id));
  });
}

function renderDigitalMenu() {
  if ($("#autoPrintOrders")) $("#autoPrintOrders").checked = Boolean(printSettings.autoPrintOrders);
  if ($("#soundOrders")) $("#soundOrders").checked = Boolean(soundSettings.enabled);

  const activeProducts = state.products
    .filter((product) => product.menuActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const availableProducts = activeProducts.filter((product) => product.recipe.length && availableForProduct(product) > 0);
  const unavailableProducts = activeProducts.filter((product) => !product.recipe.length || availableForProduct(product) <= 0);
  const draftTotals = getQuickOrderTotals();
  const form = quickOrderDraft.form;
  const matchedCustomer = findCustomerByPhone(form.customerPhone);
  const addressPlaceholder = form.destination === "table" ? "Numero da mesa" : "Endereco";
  const showAddress = form.destination !== "pickup";

  $("#digitalMenuList").innerHTML =
    `<div class="quick-order">
      <div class="quick-products">
        <strong>Produtos disponiveis</strong>
        ${
          availableProducts
            .map((product) => {
        const available = availableForProduct(product);
        const publicName = product.menuName || product.name;
        const selected = getQuickOrderItem(product.id)?.quantity || 0;
        return `<div class="quick-product-row">
          <div>
            <strong>${escapeHtml(publicName)}</strong>
            <small>${currency.format(product.price)} - disponivel ${available}</small>
          </div>
          <button class="icon-button quick-decrease" type="button" data-id="${escapeHtml(product.id)}">-</button>
          <span>${selected}</span>
          <button class="icon-button quick-increase" type="button" data-id="${escapeHtml(product.id)}">+</button>
        </div>`;
      }).join("") || `<div class="empty">Nenhum produto disponivel. Confira ficha tecnica e estoque.</div>`
        }
      </div>
      <div class="quick-order-fields">
        <strong>Dados do pedido</strong>
        <input id="quickCustomer" type="text" placeholder="Cliente" value="${escapeHtml(form.customerName)}" />
        <input id="quickPhone" type="tel" placeholder="Telefone" value="${escapeHtml(form.customerPhone)}" />
        ${matchedCustomer ? `<div class="customer-match">Cliente recorrente: <strong>${escapeHtml(matchedCustomer.name)}</strong> - ${matchedCustomer.orderCount} pedido(s)</div>` : ""}
        <label class="check-row compact-check"><input id="quickWhatsapp" type="checkbox" ${form.customerWhatsapp ? "checked" : ""} /> WhatsApp</label>
        <select id="quickDestination">
          <option value="delivery" ${form.destination === "delivery" ? "selected" : ""}>Entrega</option>
          <option value="table" ${form.destination === "table" ? "selected" : ""}>Mesa</option>
          <option value="pickup" ${form.destination === "pickup" ? "selected" : ""}>Retirada</option>
        </select>
        <input id="quickAddress" class="${showAddress ? "" : "hidden"}" type="text" placeholder="${addressPlaceholder}" value="${escapeHtml(showAddress ? form.address : "")}" />
        <select id="quickPayment">
          <option value="pix" ${form.paymentMethod === "pix" ? "selected" : ""}>Pix</option>
          <option value="cash" ${form.paymentMethod === "cash" ? "selected" : ""}>Dinheiro</option>
          <option value="card" ${form.paymentMethod === "card" ? "selected" : ""}>Cartao</option>
        </select>
        <input id="quickDeliveryFee" type="number" min="0" step="0.01" placeholder="Taxa de entrega" value="${form.deliveryFee || ""}" />
        <input id="quickDiscount" type="number" min="0" step="0.01" placeholder="Desconto" value="${form.discount || ""}" />
        <input id="quickSurcharge" type="number" min="0" step="0.01" placeholder="Acrescimo" value="${form.surcharge || ""}" />
        <textarea id="quickNote" rows="3" placeholder="Observacao geral">${escapeHtml(form.note)}</textarea>
      </div>
      <div class="quick-summary">
        <strong>Resumo</strong>
        <div id="quickOrderItems">
          ${
            quickOrderDraft.items
              .map((item) => `<p>${item.quantity}x ${escapeHtml(item.productName)} <span>${currency.format(item.total)}</span></p>`)
              .join("") || `<p>Nenhum produto selecionado.</p>`
          }
        </div>
        <p>Subtotal <span>${currency.format(draftTotals.subtotal)}</span></p>
        <p>Taxa <span id="quickFeePreview">${currency.format(0)}</span></p>
        <p>Desconto <span id="quickDiscountPreview">${currency.format(0)}</span></p>
        <p>Acrescimo <span id="quickSurchargePreview">${currency.format(0)}</span></p>
        <p class="big">Total <span id="quickTotalPreview">${currency.format(draftTotals.total)}</span></p>
        <div class="form-actions">
          <button id="createQuickOrder" type="button">Criar pedido</button>
          <button id="clearQuickOrder" class="ghost-button" type="button">Limpar</button>
        </div>
      </div>
      ${
        unavailableProducts.length
          ? `<details class="quick-unavailable"><summary>Indisponiveis (${unavailableProducts.length})</summary>${unavailableProducts
              .map((product) => `<p>${escapeHtml(product.menuName || product.name)} - ${product.recipe.length ? "sem estoque" : "sem ficha tecnica"}</p>`)
              .join("")}</details>`
          : ""
      }
    </div>`;

  const query = menuFilter.query.trim().toLowerCase();
  const filteredOrders = state.orders
    .filter((order) => {
      if (menuFilter.status !== "all" && order.status !== menuFilter.status) return false;
      if (!query) return true;
      return [
        getOrderNumber(order),
        order.productName,
        order.customerName,
        order.customerPhone,
        order.address,
        order.note,
        getPaymentMethodLabel(order.paymentMethod),
        getOrderDestinationLabel(order.destination),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  $("#menuOrderList").innerHTML = orderBoardStatuses
    .filter((statusKey) => menuFilter.status === "all" || menuFilter.status === statusKey)
    .map((statusKey) => {
      const statusOrders = filteredOrders.filter((order) => order.status === statusKey);
      const sampleOrder = statusOrders[0] || { status: statusKey, destination: "delivery" };
      const status = getOrderStatus(statusKey);
      const columnTitle = statusKey === "dispatching" ? "Saindo/mesa" : getOrderStatusLabel(sampleOrder, statusKey);
      const cards =
        statusOrders
          .map((order) => {
        const status = getOrderStatus(order.status);
        const nextStatus = status.next ? getOrderStatus(status.next) : null;
        const canAccept = order.status === "awaiting_acceptance";
        const canAdvance = Boolean(nextStatus) && !canAccept;
        const canCancel = order.status !== "canceled" && order.status !== "payment_confirmed";
        const itemSummary = getOrderItems(order)
          .map((item) => `${item.quantity}x ${escapeHtml(item.productName)}`)
          .join("<br>");

        return `<article class="order-card">
          <div class="order-card-header">
            <div>
              <strong>#${getOrderNumber(order)}</strong>
              <p>${escapeHtml(order.customerName || "Cliente nao informado")}</p>
            </div>
            <span class="badge ${status.className}">${getOrderStatusLabel(order)}</span>
          </div>
          <p class="order-items">${itemSummary}</p>
          <p>${getOrderDestinationLabel(order.destination)} - ${dateFormat.format(new Date(order.date))}</p>
          ${order.customerPhone ? `<p>${escapeHtml(order.customerPhone)}${order.customerWhatsapp ? " / WhatsApp" : ""}</p>` : ""}
          ${order.address ? `<p>${escapeHtml(order.address)}</p>` : ""}
          <p>${getPaymentMethodLabel(order.paymentMethod)} - ${currency.format(order.total)}</p>
          <p>${escapeHtml(order.note || "Sem observacao")}</p>
          <div class="row-actions">
            <button class="ghost-button print-kitchen-order" type="button" data-id="${escapeHtml(order.id)}">Cozinha</button>
            <button class="ghost-button print-menu-order" type="button" data-id="${escapeHtml(order.id)}">Cliente</button>
            ${
              canAccept
                ? `<button class="ghost-button accept-menu-order" type="button" data-id="${escapeHtml(order.id)}">Aceitar pedido</button>
                   <button class="danger-button cancel-menu-order" type="button" data-id="${escapeHtml(order.id)}">Cancelar</button>`
                : ""
            }
            ${!canAccept && canCancel ? `<button class="danger-button cancel-menu-order" type="button" data-id="${escapeHtml(order.id)}">Cancelar</button>` : ""}
            ${
              canAdvance
                ? `<button class="ghost-button advance-menu-order" type="button" data-id="${escapeHtml(order.id)}">Avancar para ${getOrderStatusLabel(order, status.next)}</button>`
                : ""
            }
            ${
              order.status === "dispatching" && order.destination === "delivery" && !order.deliveryStartedAt
                ? `<button class="ghost-button start-delivery" type="button" data-id="${escapeHtml(order.id)}">Saiu entrega</button>`
                : ""
            }
            ${
              order.status === "dispatching" && order.destination === "delivery" && order.deliveryStartedAt && !order.deliveryFinishedAt
                ? `<button class="ghost-button finish-delivery" type="button" data-id="${escapeHtml(order.id)}">Entregue</button>`
                : ""
            }
          </div>
        </article>`;
      })
          .join("") || `<div class="empty">Nenhum pedido nesta etapa.</div>`;

      return `<section class="order-column ${statusKey}">
        <div class="order-column-header">
          <strong>${columnTitle}</strong>
          <span>${statusOrders.length}</span>
        </div>
        ${cards}
      </section>`;
    })
    .join("") || `<div class="empty">Nenhum pedido encontrado.</div>`;

  $$(".quick-increase").forEach((button) => {
    button.addEventListener("click", () => changeQuickOrderItem(button.dataset.id, 1));
  });

  $$(".quick-decrease").forEach((button) => {
    button.addEventListener("click", () => changeQuickOrderItem(button.dataset.id, -1));
  });

  [
    "#quickCustomer",
    "#quickWhatsapp",
    "#quickAddress",
    "#quickPayment",
    "#quickDeliveryFee",
    "#quickDiscount",
    "#quickSurcharge",
    "#quickNote",
  ].forEach((selector) => {
    const input = $(selector);
    if (input) input.addEventListener("input", updateQuickOrderPreview);
    if (input) input.addEventListener("change", updateQuickOrderPreview);
  });

  if ($("#quickPhone")) {
    $("#quickPhone").addEventListener("input", () => {
      syncQuickOrderFormFromDom();
      updateQuickOrderPreview();
    });
    $("#quickPhone").addEventListener("change", updateQuickOrderFromPhone);
    $("#quickPhone").addEventListener("blur", updateQuickOrderFromPhone);
  }

  if ($("#quickDestination")) {
    $("#quickDestination").addEventListener("change", () => {
      syncQuickOrderFormFromDom();
      if (quickOrderDraft.form.destination === "pickup") quickOrderDraft.form.address = "";
      renderDigitalMenu();
    });
  }

  if ($("#createQuickOrder")) $("#createQuickOrder").addEventListener("click", createMenuOrder);
  if ($("#clearQuickOrder")) $("#clearQuickOrder").addEventListener("click", clearQuickOrderDraft);

  $$(".print-menu-order").forEach((button) => {
    button.addEventListener("click", () => {
      const order = findOrder(button.dataset.id);
      if (order) printOrderReceipt(order);
    });
  });
  $$(".print-kitchen-order").forEach((button) => {
    button.addEventListener("click", () => {
      const order = findOrder(button.dataset.id);
      if (order) printKitchenCommand(order);
    });
  });

  $$(".accept-menu-order").forEach((button) => {
    button.addEventListener("click", () => acceptMenuOrder(button.dataset.id));
  });

  $$(".advance-menu-order").forEach((button) => {
    button.addEventListener("click", () => advanceMenuOrder(button.dataset.id));
  });

  $$(".cancel-menu-order").forEach((button) => {
    button.addEventListener("click", () => cancelMenuOrder(button.dataset.id));
  });
  $$(".start-delivery").forEach((button) => {
    button.addEventListener("click", () => startDelivery(button.dataset.id));
  });
  $$(".finish-delivery").forEach((button) => {
    button.addEventListener("click", () => finishDelivery(button.dataset.id));
  });
}

function renderMenuCatalog() {
  const list = $("#menuCatalogList");
  if (!list) return;
  const products = state.products
    .filter((product) => product.menuActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  list.innerHTML =
    products
      .map((product) => {
        const available = availableForProduct(product);
        const publicName = product.menuName || product.name;
        const status = !product.recipe.length
          ? `<span class="badge warn">Ficha pendente</span>`
          : available > 0
            ? `<span class="badge">Disponivel: ${available}</span>`
            : `<span class="badge danger">Sem estoque</span>`;

        return `<article class="menu-card">
          <div class="menu-card-header">
            <div>
              <strong>${escapeHtml(publicName)}</strong>
              <p>${escapeHtml(product.category || "Cardapio")} - ${currency.format(product.price)}</p>
            </div>
            <div class="row-actions">${product.featured ? `<span class="badge warn">Destaque</span>` : ""}${status}</div>
          </div>
          <p>${escapeHtml(product.description || "Sem descricao cadastrada.")}</p>
        </article>`;
      })
      .join("") || `<div class="empty">Nenhum produto ativo no cardapio.</div>`;
}

function renderCustomers() {
  const table = $("#customersTable");
  if (!table) return;
  const query = customerFilter.query.trim().toLowerCase();
  const customers = state.customers
    .filter((customer) => {
      if (!query) return true;
      return [customer.name, customer.phone, customer.address]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .slice()
    .sort((a, b) => new Date(b.lastOrderAt || b.createdAt) - new Date(a.lastOrderAt || a.createdAt));

  table.innerHTML =
    customers
      .map((customer) => {
        const lastOrder = customer.lastOrderAt ? fileDateFormat.format(new Date(customer.lastOrderAt)) : "-";
        return `<tr>
          <td>
            <strong>${escapeHtml(customer.name)}</strong>
            <small>${escapeHtml(customer.address || "Sem endereco principal")}</small>
          </td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${customer.orderCount.toLocaleString("pt-BR")}</td>
          <td>${currency.format(customer.totalSpent)}</td>
          <td>${lastOrder}</td>
          <td><button class="ghost-button use-customer" type="button" data-id="${escapeHtml(customer.id)}">Usar no pedido</button></td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="6" class="empty">Nenhum cliente cadastrado automaticamente ainda.</td></tr>`;

  table.querySelectorAll(".use-customer").forEach((button) => {
    button.addEventListener("click", () => {
      const customer = findCustomer(button.dataset.id);
      if (!customer) return;
      applyCustomerToQuickOrder(customer);
      activateTab("menu");
    });
  });
}

function getFinanceMetrics() {
  const metrics = calculatePeriodMetrics();
  const orders = state.orders.filter((order) => order.status !== "canceled" && isInPeriod(order.date));
  const orderTotal = orders.reduce((sum, order) => sum + order.total, 0);
  const soldTotal = orderTotal || metrics.revenue;
  const byPayment = (method) => orders.filter((order) => order.paymentMethod === method).reduce((sum, order) => sum + order.total, 0);
  const deliveryFees = orders.reduce((sum, order) => sum + order.deliveryFee, 0);
  const discounts = orders.reduce((sum, order) => sum + order.discount, 0);
  const surcharges = orders.reduce((sum, order) => sum + order.surcharge, 0);
  const ticket = orders.length ? soldTotal / orders.length : metrics.sales.length ? metrics.revenue / metrics.sales.length : 0;
  const expensesTotal = metrics.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesByCategory = metrics.expenses.reduce((groups, expense) => {
    groups[expense.category] = (groups[expense.category] || 0) + expense.amount;
    return groups;
  }, {});

  return {
    ...metrics,
    orders,
    soldTotal,
    pix: byPayment("pix"),
    cash: byPayment("cash"),
    card: byPayment("card"),
    other: byPayment("other") + byPayment("not_informed"),
    deliveryFees,
    discounts,
    surcharges,
    ticket,
    expensesTotal,
    expensesByCategory,
    realProfit: soldTotal - metrics.soldCmv - expensesTotal,
  };
}

function calculateRealResultForRange(start, end) {
  const inRange = (dateValue) => {
    const date = new Date(dateValue);
    return date >= start && date <= end;
  };
  const sales = state.sales.filter((sale) => inRange(sale.date) && findOrder(sale.orderId)?.status !== "canceled");
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const cmv = sales.reduce((sum, sale) => sum + getSaleCmv(sale), 0);
  const expenses = state.expenses.filter((expense) => inRange(expense.date)).reduce((sum, expense) => sum + expense.amount, 0);
  return revenue - cmv - expenses;
}

function getFinanceResultSnapshots() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    day: calculateRealResultForRange(dayStart, dayEnd),
    week: calculateRealResultForRange(weekStart, weekEnd),
    month: calculateRealResultForRange(monthStart, monthEnd),
  };
}

function renderFinance() {
  const cards = $("#financeSummaryCards");
  if (!cards) return;
  syncFinancePeriodControls();
  const data = getFinanceMetrics();
  const snapshots = getFinanceResultSnapshots();

  const summaryCards = [
    ["Faturamento", currency.format(data.soldTotal), "Periodo filtrado"],
    ["Lucro bruto", currency.format(data.grossProfit), "Vendas menos CMV"],
    ["CMV", currency.format(data.soldCmv), "Custo vendido"],
    ["Ticket medio", currency.format(data.ticket), "Total / pedidos"],
    ["Qtd. pedidos", data.orders.length.toLocaleString("pt-BR"), "Pedidos no periodo"],
    ["Qtd. vendas", data.sales.length.toLocaleString("pt-BR"), "Vendas geradas"],
    ["Despesas", currency.format(data.expensesTotal), "Operacao real"],
    ["Lucro real", currency.format(data.realProfit), "Faturamento - CMV - despesas"],
    ["Resultado diario", currency.format(snapshots.day), "Hoje"],
    ["Resultado semanal", currency.format(snapshots.week), "Semana atual"],
    ["Resultado mensal", currency.format(snapshots.month), "Mes atual"],
    ["Investido em estoque", currency.format(getStockValue()), "Saldo atual x custo medio"],
  ];
  cards.innerHTML = summaryCards
    .map((card) => `<article class="stat-card"><span>${card[0]}</span><strong>${card[1]}</strong><small>${card[2]}</small></article>`)
    .join("");

  $("#financeEntries").innerHTML = [
    ["Pix", currency.format(data.pix)],
    ["Dinheiro", currency.format(data.cash)],
    ["Cartao", currency.format(data.card)],
    ["Outros pagamentos", currency.format(data.other)],
    ["Quantidade de vendas", data.sales.length.toLocaleString("pt-BR")],
    ["Quantidade de pedidos", data.orders.length.toLocaleString("pt-BR")],
  ]
    .map((row) => `<p><span>${row[0]}</span><strong>${row[1]}</strong></p>`)
    .join("");

  const outflowRows = [
    ["Compras de estoque", currency.format(data.purchasesTotal)],
    ["Embalagens", currency.format(data.expensesByCategory.Embalagens || 0)],
    ["Energia", currency.format(data.expensesByCategory.Energia || 0)],
    ["Agua", currency.format(data.expensesByCategory.Agua || 0)],
    ["Internet", currency.format(data.expensesByCategory.Internet || 0)],
    ["Motoboy", currency.format(data.expensesByCategory.Motoboy || 0)],
    ["Aluguel", currency.format(data.expensesByCategory.Aluguel || 0)],
    ["Taxa de cartao", currency.format(data.expensesByCategory["Taxa de maquininha"] || 0)],
    ["Marketing", currency.format(data.expensesByCategory.Marketing || 0)],
    ["Outros", currency.format(data.expensesByCategory.Outros || 0)],
  ];
  $("#financeOutflows").innerHTML = outflowRows
    .map((row) => `<p><span>${row[0]}</span><strong>${row[1]}</strong></p>`)
    .join("");

  renderProfessionalCash(data);
  renderExpensesTable(data);
  renderCashConference(data);
  renderFinanceMovements(data);
}

function getCashExpected(data = getFinanceMetrics()) {
  const openCash = getOpenCash();
  const adjustments = openCash ? state.cashAdjustments.filter((item) => item.cashId === openCash.id) : [];
  const supplies = adjustments.filter((item) => item.type === "suprimento").reduce((sum, item) => sum + item.amount, 0);
  const withdrawals = adjustments.filter((item) => item.type === "sangria").reduce((sum, item) => sum + item.amount, 0);
  return {
    cash: data.cash + (openCash?.openingAmount || 0) + supplies - withdrawals,
    pix: data.pix,
    card: data.card,
    other: data.other,
    supplies,
    withdrawals,
  };
}

function renderProfessionalCash(data = getFinanceMetrics()) {
  const container = $("#cashStatus");
  if (!container) return;
  const openCash = getOpenCash();
  const expected = getCashExpected(data);
  const totalExpected = expected.cash + expected.pix + expected.card + expected.other;
  if (!openCash) {
    container.innerHTML = `<p><span>Status</span><strong class="badge warn">Caixa fechado</strong></p>
      <p><span>Pronto para abertura</span><strong>${new Date().toLocaleDateString("pt-BR")}</strong></p>`;
    return;
  }

  container.innerHTML = `
    <p><span>Status</span><strong class="badge">Caixa aberto</strong></p>
    <p><span>Responsavel</span><strong>${escapeHtml(openCash.responsible)}</strong></p>
    <p><span>Abertura</span><strong>${dateFormat.format(new Date(openCash.openedAt))}</strong></p>
    <p><span>Valor inicial</span><strong>${currency.format(openCash.openingAmount)}</strong></p>
    <p><span>Suprimentos</span><strong>${currency.format(expected.supplies)}</strong></p>
    <p><span>Sangrias</span><strong>${currency.format(expected.withdrawals)}</strong></p>
    <p><span>Total esperado</span><strong>${currency.format(totalExpected)}</strong></p>`;
}

async function openCash() {
  if (getOpenCash()) {
    alert("Ja existe um caixa aberto.");
    return;
  }
  const responsible = $("#cashResponsible").value.trim() || getCurrentUserName();
  const openingAmount = toNumber($("#cashOpeningAmount").value);
  const cash = {
    id: createId(),
    openedAt: new Date().toISOString(),
    closedAt: "",
    responsible,
    openingAmount,
    cashExpected: 0,
    pixExpected: 0,
    cardExpected: 0,
    otherExpected: 0,
    totalExpected: 0,
    totalCounted: 0,
    difference: 0,
    notes: "",
    status: "open",
  };
  state.cashClosings.push(cash);
  addAuditLog("Caixa aberto", `Responsavel: ${responsible} / Inicial: ${currency.format(openingAmount)}`);
  await saveState();
  renderAll();
}

async function registerCashAdjustment() {
  const openCash = getOpenCash();
  if (!openCash) {
    alert("Abra o caixa antes de registrar suprimento ou sangria.");
    return;
  }
  const amount = toNumber($("#cashAdjustmentAmount").value);
  const note = $("#cashAdjustmentNote").value.trim();
  if (amount <= 0 || !note) {
    alert("Informe valor e observacao para registrar o ajuste de caixa.");
    return;
  }
  const type = $("#cashAdjustmentType").value === "sangria" ? "sangria" : "suprimento";
  state.cashAdjustments.push({
    id: createId(),
    cashId: openCash.id,
    type,
    amount,
    note,
    responsible: getCurrentUserName(),
    date: new Date().toISOString(),
  });
  addAuditLog(type === "sangria" ? "Sangria registrada" : "Suprimento registrado", `${currency.format(amount)} - ${note}`);
  $("#cashAdjustmentAmount").value = "";
  $("#cashAdjustmentNote").value = "";
  await saveState();
  renderAll();
}

async function closeCash() {
  const openCash = getOpenCash();
  if (!openCash) {
    alert("Nao ha caixa aberto para fechar.");
    return;
  }
  const data = getFinanceMetrics();
  const expected = getCashExpected(data);
  const totalExpected = expected.cash + expected.pix + expected.card + expected.other;
  const totalCounted = toNumber($("#cashCounted").value) + toNumber($("#pixCounted").value) + toNumber($("#cardCounted").value);
  const difference = totalCounted - totalExpected;
  const notes = $("#cashConferenceNote").value.trim();
  if (Math.abs(difference) >= 0.01 && !notes) {
    alert("Informe uma observacao para fechar caixa com divergencia.");
    $("#cashConferenceNote").focus();
    return;
  }
  if (!await cloudConfirm(`Fechar caixa com diferenca de ${currency.format(difference)}?`)) return;
  openCash.closedAt = new Date().toISOString();
  openCash.cashExpected = expected.cash;
  openCash.pixExpected = expected.pix;
  openCash.cardExpected = expected.card;
  openCash.otherExpected = expected.other;
  openCash.totalExpected = totalExpected;
  openCash.totalCounted = totalCounted;
  openCash.difference = difference;
  openCash.notes = notes;
  openCash.status = "closed";
  addAuditLog("Caixa fechado", `Esperado: ${currency.format(totalExpected)} / Contado: ${currency.format(totalCounted)} / Diferenca: ${currency.format(difference)}`);
  await saveState();
  renderAll();
  alert("Caixa fechado. Gere um backup em Configuracoes para guardar o fechamento.");
  activateTab("settings");
}

function renderCashConference(data = getFinanceMetrics()) {
  const container = $("#cashConference");
  if (!container) return;
  const checks = [
    ["Dinheiro", getCashExpected(data).cash, toNumber($("#cashCounted")?.value)],
    ["Pix", data.pix, toNumber($("#pixCounted")?.value)],
    ["Cartao", data.card, toNumber($("#cardCounted")?.value)],
  ];
  const totalExpected = data.cash + data.pix + data.card;
  const totalCounted = checks.reduce((sum, [, , counted]) => sum + counted, 0);
  const totalDiff = totalCounted - totalExpected;
  const note = $("#cashConferenceNote")?.value.trim();
  container.innerHTML = checks
    .map(([label, expected, counted]) => {
      const diff = counted - expected;
      const className = Math.abs(diff) < 0.01 ? "" : diff > 0 ? "warn" : "danger";
      const text = Math.abs(diff) < 0.01 ? "Sem divergencia" : diff > 0 ? `Sobra ${currency.format(diff)}` : `Falta ${currency.format(Math.abs(diff))}`;
      return `<p><span>${label}: esperado ${currency.format(expected)} / informado ${currency.format(counted)}</span><strong class="badge ${className}">${text}</strong></p>`;
    })
    .join("") +
    `<p><span>Valor esperado</span><strong>${currency.format(totalExpected)}</strong></p>
     <p><span>Valor conferido</span><strong>${currency.format(totalCounted)}</strong></p>
     <p><span>Diferenca encontrada</span><strong class="badge ${Math.abs(totalDiff) < 0.01 ? "" : totalDiff > 0 ? "warn" : "danger"}">${currency.format(totalDiff)}</strong></p>
     <p><span>Observacoes</span><strong>${escapeHtml(note || "Sem observacao")}</strong></p>`;
}

function renderFinanceMovements(data = getFinanceMetrics()) {
  const table = $("#financeMovementsTable");
  if (!table) return;
  const saleRows = data.orders.map((order) => ({
    date: order.date,
    type: "Entrada",
    description: `Venda Pedido #${getOrderNumber(order)}`,
    origin: getPaymentMethodLabel(order.paymentMethod),
    value: order.total,
  }));
  const purchaseRows = data.purchases.map((purchase) => ({
    date: purchase.date,
    type: "Saida",
    description: `Compra de ${purchase.ingredientName}`,
    origin: "Estoque",
    value: -purchase.cost,
  }));
  const expenseRows = data.expenses.map((expense) => ({
    date: expense.date,
    type: "Saida",
    description: expense.description,
    origin: expense.category,
    value: -expense.amount,
  }));
  const movementRows = state.movements.filter((movement) => isInPeriod(movement.date)).map((movement) => ({
    date: movement.date,
    type: "Ajuste",
    description: movement.source || movement.type,
    origin: movement.ingredientName,
    value: 0,
  }));

  table.innerHTML =
    [...saleRows, ...purchaseRows, ...expenseRows, ...movementRows]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((row) => {
        const date = new Date(row.date);
        const className = row.value > 0 ? "entry" : row.value < 0 ? "exit" : "adjust";
        return `<article class="timeline-item ${className}">
          <div>
            <strong>${escapeHtml(row.description)}</strong>
            <small>${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - ${escapeHtml(row.origin)}</small>
          </div>
          <span>${row.value === 0 ? "Ajuste" : currency.format(row.value)}</span>
        </article>`;
      })
      .join("") || `<div class="empty">Nenhuma movimentacao financeira no periodo.</div>`;
}

function syncFinancePeriodControls() {
  if (!$("#financePeriodMode")) return;
  $("#financePeriodMode").value = reportFilter.mode;
  $("#financePeriodStart").value = reportFilter.start;
  $("#financePeriodEnd").value = reportFilter.end;
}

function resetExpenseForm() {
  if (!$("#expenseForm")) return;
  $("#expenseForm").reset();
  $("#expenseId").value = "";
  $("#expenseDate").value = new Date().toISOString().slice(0, 10);
  $("#expenseFormTitle").textContent = "Nova despesa operacional";
  $("#expenseSubmit").textContent = "Salvar despesa";
  $("#cancelExpenseEdit").classList.add("hidden");
}

function startExpenseEdit(id) {
  const expense = findExpense(id);
  if (!expense) return;
  $("#expenseId").value = expense.id;
  $("#expenseCategory").value = expense.category;
  $("#expenseDescription").value = expense.description;
  $("#expenseAmount").value = expense.amount;
  $("#expenseDate").value = expense.date.slice(0, 10);
  $("#expenseFormTitle").textContent = "Editar despesa operacional";
  $("#expenseSubmit").textContent = "Atualizar despesa";
  $("#cancelExpenseEdit").classList.remove("hidden");
  activateTab("finance");
}

async function deleteExpense(id) {
  const expense = findExpense(id);
  if (!expense) return;
  if (!await cloudConfirm(`Deseja excluir a despesa "${expense.description}"?`)) return;
  state.expenses = state.expenses.filter((item) => item.id !== id);
  addAuditLog("Despesa removida", `${expense.description} - ${currency.format(expense.amount)}`);
  if ($("#expenseId")?.value === id) resetExpenseForm();
  await saveState();
  renderAll();
}

function renderExpensesTable(data = getFinanceMetrics()) {
  const table = $("#expensesTable");
  if (!table) return;
  table.innerHTML =
    data.expenses
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(
        (expense) => `<tr>
          <td>${fileDateFormat.format(new Date(expense.date))}</td>
          <td>${escapeHtml(expense.category)}</td>
          <td>${escapeHtml(expense.description)}</td>
          <td>${currency.format(expense.amount)}</td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-expense" type="button" data-id="${escapeHtml(expense.id)}">Editar</button>
              <button class="danger-button delete-expense" type="button" data-id="${escapeHtml(expense.id)}">Excluir</button>
            </div>
          </td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="5" class="empty">Nenhuma despesa no periodo.</td></tr>`;

  table.querySelectorAll(".edit-expense").forEach((button) => {
    button.addEventListener("click", () => startExpenseEdit(button.dataset.id));
  });
  table.querySelectorAll(".delete-expense").forEach((button) => {
    button.addEventListener("click", () => deleteExpense(button.dataset.id));
  });
}

function renderKitchen() {
  const board = $("#kitchenBoard");
  if (!board) return;
  const kitchenStatuses = ["awaiting_acceptance", "in_production", "ready"];

  board.innerHTML = kitchenStatuses
    .map((statusKey) => {
      const orders = state.orders
        .filter((order) => order.status === statusKey)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      const label = getOrderStatusLabel({ status: statusKey, destination: "delivery" }, statusKey);
      const cards =
        orders
          .map((order) => {
            const items = getOrderItems(order).map((item) => `<li>${item.quantity}x ${escapeHtml(item.productName)}</li>`).join("");
            const status = getOrderStatus(order.status);
            return `<article class="kitchen-card">
              <div class="order-card-header">
                <strong>#${getOrderNumber(order)}</strong>
                <span class="badge ${status.className}">${getOrderStatusLabel(order)}</span>
              </div>
              <p>${escapeHtml(order.customerName || "Cliente nao informado")} - ${getOrderDestinationLabel(order.destination)}</p>
              <ul>${items}</ul>
              <p class="kitchen-note">${escapeHtml(order.note || "Sem observacao")}</p>
              <div class="row-actions">
                ${
                  order.status === "awaiting_acceptance"
                    ? `<button class="ghost-button accept-menu-order" type="button" data-id="${escapeHtml(order.id)}">Aceitar</button>`
                    : ""
                }
                ${
                  order.status !== "awaiting_acceptance"
                    ? `<button class="ghost-button advance-menu-order" type="button" data-id="${escapeHtml(order.id)}">Avancar</button>`
                    : ""
                }
              </div>
            </article>`;
          })
          .join("") || `<div class="empty">Nenhum pedido.</div>`;

      return `<section class="kitchen-column ${statusKey}">
        <div class="order-column-header"><strong>${label}</strong><span>${orders.length}</span></div>
        ${cards}
      </section>`;
    })
    .join("");

  board.querySelectorAll(".accept-menu-order").forEach((button) => {
    button.addEventListener("click", () => acceptMenuOrder(button.dataset.id));
  });
  board.querySelectorAll(".advance-menu-order").forEach((button) => {
    button.addEventListener("click", () => advanceMenuOrder(button.dataset.id));
  });
}

async function startDelivery(id){
  const name=await cloudPrompt('Nome do entregador:'); if(!name)return;
  const fee=Number(await cloudPrompt('Valor pago ao entregador:','0')); if(!Number.isFinite(fee))return;
  await cloudMutate('delivery.start',{id,name,fee}); renderAll();
}

async function finishDelivery(id){await cloudMutate('delivery.finish',{id});renderAll();}

function renderDeliveries() {
  const list = $("#deliveriesList");
  const stats = $("#deliveryStats");
  if (!list || !stats) return;
  const deliveries = state.deliveries.slice().sort((a, b) => new Date(b.startedAt || b.deliveredAt) - new Date(a.startedAt || a.deliveredAt));
  list.innerHTML =
    deliveries
      .slice(0, 20)
      .map((delivery) => {
        const status = delivery.deliveredAt ? "Entregue" : "Em rota";
        return `<p><span>#${escapeHtml(delivery.orderNumber)} - ${escapeHtml(delivery.customerName || "Cliente")}<br><small>${escapeHtml(delivery.motoboy)} - ${status}</small></span><strong>${currency.format(delivery.fee)}</strong></p>`;
      })
      .join("") || `<p><span>Nenhuma entrega registrada.</span><strong>-</strong></p>`;

  const completed = deliveries.filter((delivery) => delivery.startedAt && delivery.deliveredAt);
  const averageMinutes = completed.length
    ? completed.reduce((sum, delivery) => sum + (new Date(delivery.deliveredAt) - new Date(delivery.startedAt)) / 60000, 0) / completed.length
    : 0;
  const byMotoboy = Object.entries(sumBy(deliveries, (delivery) => delivery.motoboy, () => 1))
    .map(([name, total]) => `<p><span>${escapeHtml(name)}</span><strong>${total}</strong></p>`)
    .join("");
  stats.innerHTML = `<p><span>Tempo medio entrega</span><strong>${averageMinutes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} min</strong></p>
    <p><span>Total de entregas</span><strong>${deliveries.length}</strong></p>
    ${byMotoboy || `<p><span>Motoboys</span><strong>-</strong></p>`}`;
}

function getCashDateValue() {
  const input = $("#cashDate");
  if (!input) return new Date().toISOString().slice(0, 10);
  if (!input.value) input.value = new Date().toISOString().slice(0, 10);
  return input.value;
}

function renderCashClosing() {
  const container = $("#cashSummary");
  if (!container) return;
  const date = getCashDateValue();
  const orders = state.orders.filter((order) => order.status !== "canceled" && order.date.slice(0, 10) === date);
  const sales = state.sales.filter((sale) => sale.date.slice(0, 10) === date);
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  const byPayment = (method) => orders.filter((order) => order.paymentMethod === method).reduce((sum, order) => sum + order.total, 0);
  const deliveryFees = orders.reduce((sum, order) => sum + order.deliveryFee, 0);
  const discounts = orders.reduce((sum, order) => sum + order.discount, 0);
  const surcharges = orders.reduce((sum, order) => sum + order.surcharge, 0);
  const grossProfit = sales.reduce((sum, sale) => sum + getSaleGrossProfit(sale), 0);
  const ticket = orders.length ? total / orders.length : 0;

  const cards = [
    ["Total vendido", currency.format(total), "Pedidos do dia"],
    ["Pix", currency.format(byPayment("pix")), "Pagamentos"],
    ["Dinheiro", currency.format(byPayment("cash")), "Pagamentos"],
    ["Cartao", currency.format(byPayment("card")), "Pagamentos"],
    ["Outros", currency.format(byPayment("other") + byPayment("not_informed")), "Outros/nao informado"],
    ["Taxas de entrega", currency.format(deliveryFees), "Somadas aos pedidos"],
    ["Descontos", currency.format(discounts), "Concedidos"],
    ["Acrescimos", currency.format(surcharges), "Extras"],
    ["Qtd. pedidos", orders.length.toLocaleString("pt-BR"), "Pedidos no dia"],
    ["Ticket medio", currency.format(ticket), "Total / pedidos"],
    ["Lucro bruto estimado", currency.format(grossProfit), "Com base nas vendas aceitas"],
  ];

  container.innerHTML = cards
    .map((card) => `<article class="stat-card"><span>${card[0]}</span><strong>${card[1]}</strong><small>${card[2]}</small></article>`)
    .join("");
}

function renderMovements() {
  const table = $("#movementsTable");
  if (!table) return;
  table.innerHTML =
    state.movements
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(
        (movement) => `<tr>
          <td>${dateFormat.format(new Date(movement.date))}</td>
          <td>${escapeHtml(movement.type)}</td>
          <td>${escapeHtml(movement.ingredientName)}</td>
          <td>${formatQuantity(movement.quantity, movement.unit)}</td>
          <td>${escapeHtml(movement.source)} ${movement.sourceId ? `#${escapeHtml(String(movement.sourceId).slice(-6))}` : ""}</td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="5" class="empty">Nenhuma movimentacao registrada ainda.</td></tr>`;
}

function renderInvestment() {
  const totalPurchased = state.purchases.reduce((sum, purchase) => sum + toNumber(purchase.cost), 0);
  const productMetrics = state.products.map((product) => {
    const cmv = calculateProductCmv(product);
    const profit = product.price - cmv;
    return { product, cmv, profit };
  });
  const averageCmv =
    productMetrics.length > 0
      ? productMetrics.reduce((sum, metric) => sum + metric.cmv, 0) / productMetrics.length
      : 0;
  const averageProfit =
    productMetrics.length > 0
      ? productMetrics.reduce((sum, metric) => sum + metric.profit, 0) / productMetrics.length
      : 0;

  $("#statStockValue").textContent = currency.format(getStockValue());
  $("#statTotalPurchased").textContent = currency.format(totalPurchased);
  $("#statAverageCmv").textContent = currency.format(averageCmv);
  $("#statAverageProductProfit").textContent = currency.format(averageProfit);

  $("#ingredientInvestmentTable").innerHTML =
    state.ingredients
      .map((ingredient) => {
        const { averageCost, totalCost } = getIngredientCostStats(ingredient.id);
        const invested = averageCost * ingredient.stock;

        return `<tr>
          <td>${escapeHtml(ingredient.name)}</td>
          <td>${currency.format(averageCost)} / ${escapeHtml(ingredient.unit)}</td>
          <td>${currency.format(totalCost)}</td>
          <td>${formatQuantity(ingredient.stock, ingredient.unit)}</td>
          <td>${currency.format(invested)}</td>
        </tr>`;
      })
      .join("") ||
    `<tr><td colspan="5" class="empty">Cadastre compras para calcular o investimento.</td></tr>`;

  $("#productCmvTable").innerHTML =
    productMetrics
      .map(({ product, cmv, profit }) => {
        const cmvPercent = product.price > 0 ? (cmv / product.price) * 100 : 0;
        const status = getCmvStatus(cmvPercent);

        return `<tr>
          <td>${escapeHtml(product.name)}</td>
          <td>${currency.format(product.price)}</td>
          <td>${currency.format(cmv)}</td>
          <td>${cmvPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</td>
          <td>${currency.format(profit)}</td>
          <td><span class="badge ${status.className}">${status.label}</span></td>
        </tr>`;
      })
      .join("") ||
    `<tr><td colspan="6" class="empty">Cadastre produtos com ficha tecnica para calcular o CMV.</td></tr>`;
}

function sumBy(items, keyGetter, valueGetter) {
  return items.reduce((groups, item) => {
    const key = keyGetter(item) || "Nao informado";
    groups[key] = (groups[key] || 0) + valueGetter(item);
    return groups;
  }, {});
}

function renderBarList(title, rows, formatter = (value) => value.toLocaleString("pt-BR")) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return `<section class="report-block">
    <h3>${title}</h3>
    ${
      rows.length
        ? rows
            .map(
              (row) => `<div class="report-bar-row">
                <span>${escapeHtml(row.label)}</span>
                <div><i style="width:${Math.max(4, (row.value / max) * 100)}%"></i></div>
                <strong>${formatter(row.value)}</strong>
              </div>`,
            )
            .join("")
        : `<div class="empty">Sem dados no periodo.</div>`
    }
  </section>`;
}

function renderReports() {
  const container = $("#reportInsights");
  if (!container) return;
  const metrics = calculatePeriodMetrics();
  const salesByProduct = Object.entries(sumBy(metrics.sales, (sale) => sale.productName, (sale) => sale.quantity))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const leastSold = salesByProduct.slice().sort((a, b) => a.value - b.value);
  const profitByProduct = Object.entries(sumBy(metrics.sales, (sale) => sale.productName, (sale) => getSaleGrossProfit(sale)))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const consumed = {};
  metrics.sales.forEach((sale) => {
    getSaleRecipe(sale).forEach((line) => {
      const ingredient = findIngredient(line.ingredientId);
      if (!ingredient) return;
      const key = `${ingredient.name} (${ingredient.unit})`;
      consumed[key] = (consumed[key] || 0) + line.quantity * sale.quantity;
    });
  });
  const consumedRows = Object.entries(consumed)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const revenueByDay = Object.entries(sumBy(metrics.sales, (sale) => sale.date.slice(0, 10), (sale) => sale.total))
    .map(([label, value]) => ({ label: fileDateFormat.format(new Date(`${label}T12:00:00`)), value }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const profitByUnit = state.products
    .map((product) => ({ label: product.name, value: product.price - calculateProductCmv(product) }))
    .sort((a, b) => b.value - a.value);
  const salesByHour = Object.entries(sumBy(metrics.sales, (sale) => `${new Date(sale.date).getHours()}h`, (sale) => sale.quantity))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonth = calculateRealResultForRange(monthStart, new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const previousMonth = calculateRealResultForRange(previousMonthStart, previousMonthEnd);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const currentWeek = calculateRealResultForRange(weekStart, new Date());
  const previousWeek = calculateRealResultForRange(previousWeekStart, weekStart);

  container.innerHTML = [
    `<section class="report-block"><h3>Comparativos</h3>
      <p>Mes atual x anterior: <strong>${currency.format(currentMonth)} / ${currency.format(previousMonth)}</strong></p>
      <p>Semana atual x anterior: <strong>${currency.format(currentWeek)} / ${currency.format(previousWeek)}</strong></p>
      <p>Horario de pico: <strong>${salesByHour[0]?.label || "-"}</strong></p>
    </section>`,
    renderBarList("Produtos mais vendidos", salesByProduct.slice(0, 6)),
    renderBarList("Produtos menos vendidos", leastSold.slice(0, 6)),
    renderBarList("Ingredientes mais consumidos", consumedRows.slice(0, 6), (value) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })),
    renderBarList("Lucro por produto", profitByProduct.slice(0, 6), (value) => currency.format(value)),
    renderBarList("Produto mais lucrativo", profitByUnit.slice(0, 6), (value) => currency.format(value)),
    renderBarList("Produto menos lucrativo", profitByUnit.slice().reverse().slice(0, 6), (value) => currency.format(value)),
    renderBarList("Horario de pico", salesByHour.slice(0, 8)),
    renderBarList("Faturamento por periodo", revenueByDay.slice(-10), (value) => currency.format(value)),
    renderBarList("Evolucao de vendas", revenueByDay.slice(-10), (value) => currency.format(value)),
  ].join("");
}

function renderSettings() {
  if (!$("#settingsForm")) return;
  const settings = getStoreSettings();
  $("#settingCompanyName").value = settings.companyName;
  $("#settingAddress").value = settings.address;
  $("#settingPhone").value = settings.phone;
  $("#settingWhatsapp").value = settings.whatsapp;
  $("#settingDefaultDeliveryFee").value = settings.defaultDeliveryFee || "";
  $("#settingLogoUrl").value = settings.logoUrl;
  $("#settingPrintMessage").value = settings.printMessage;
}

function renderAudit() {
  const table = $("#auditTable");
  if (!table) return;
  table.innerHTML =
    state.auditLogs
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 100)
      .map(
        (log) => `<tr>
          <td>${dateFormat.format(new Date(log.date))}</td>
          <td>${escapeHtml(log.user)}</td>
          <td>${escapeHtml(log.action)}</td>
          <td>${escapeHtml(log.detail)}</td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="4" class="empty">Nenhuma alteracao registrada ainda.</td></tr>`;
}

function renderPurchases() {
  $("#purchasesTable").innerHTML =
    state.purchases
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(
        (purchase) => `<tr>
          <td>${dateFormat.format(new Date(purchase.date))}</td>
          <td>${escapeHtml(purchase.ingredientName)}</td>
          <td>${formatQuantity(purchase.quantity, purchase.unit)}</td>
          <td>${currency.format(purchase.cost)}</td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-purchase" type="button" data-id="${escapeHtml(purchase.id)}">Editar</button>
              <button class="danger-button delete-purchase" type="button" data-id="${escapeHtml(purchase.id)}">Excluir</button>
            </div>
          </td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="5" class="empty">Nenhuma compra registrada.</td></tr>`;

  $$(".edit-purchase").forEach((button) => {
    button.addEventListener("click", () => startPurchaseEdit(button.dataset.id));
  });

  $$(".delete-purchase").forEach((button) => {
    button.addEventListener("click", () => deletePurchase(button.dataset.id));
  });
}

function renderSales() {
  $("#salesTable").innerHTML =
    state.sales
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(
        (sale) => `<tr>
          <td>${dateFormat.format(new Date(sale.date))}</td>
          <td>${escapeHtml(sale.productName)}</td>
          <td>${sale.quantity}</td>
          <td>${currency.format(sale.total)}</td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-sale" type="button" data-id="${escapeHtml(sale.id)}">Editar</button>
            </div>
          </td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="5" class="empty">Nenhuma venda registrada.</td></tr>`;

  $$(".edit-sale").forEach((button) => {
    button.addEventListener("click", () => startSaleEdit(button.dataset.id));
  });
}

function getRecipeIngredientIds() {
  return $$(".recipe-line")
    .map((line) => line.querySelector(".recipe-ingredient").value)
    .filter(Boolean);
}

function updateRecipeLineUnit(line) {
  const ingredient = findIngredient(line.querySelector(".recipe-ingredient").value);
  const unit = line.querySelector(".recipe-unit");
  if (unit) unit.textContent = ingredient?.unit || "un";
}

function updateAllRecipeLineUnits() {
  $$(".recipe-line").forEach(updateRecipeLineUnit);
}

function renderRecipeSearchResults() {
  const results = $("#recipeSearchResults");
  if (!results) return;

  const query = $("#recipeIngredientSearch").value.trim().toLowerCase();
  const selectedIds = new Set(getRecipeIngredientIds());
  const matches = state.ingredients
    .filter((ingredient) => !selectedIds.has(ingredient.id))
    .filter((ingredient) => !query || ingredient.name.toLowerCase().includes(query))
    .slice(0, 8);

  results.innerHTML =
    matches
      .map(
        (ingredient) =>
          `<button class="recipe-search-option" type="button" data-id="${escapeHtml(ingredient.id)}">${escapeHtml(ingredient.name)} (${escapeHtml(ingredient.unit)})</button>`,
      )
      .join("") ||
    `<span class="empty">${state.ingredients.length ? "Nenhuma materia-prima encontrada." : "Cadastre materias-primas no estoque primeiro."}</span>`;

  $$(".recipe-search-option").forEach((button) => {
    button.addEventListener("click", () => {
      addRecipeLineFromQuickAdd(button.dataset.id);
    });
  });
}

function addRecipeLineFromQuickAdd(ingredientId = "") {
  const selectedId = ingredientId || $("#recipeSearchResults .recipe-search-option")?.dataset.id || "";
  const quantity = toNumber($("#recipeQuickQuantity").value);

  if (!selectedId) {
    alert("Selecione uma materia-prima para adicionar.");
    return;
  }
  if (quantity <= 0) {
    alert("Informe a quantidade usada por unidade vendida.");
    $("#recipeQuickQuantity").focus();
    return;
  }
  if (getRecipeIngredientIds().includes(selectedId)) {
    alert("Essa materia-prima ja esta na ficha tecnica.");
    return;
  }

  addRecipeLine(selectedId, quantity);
  $("#recipeIngredientSearch").value = "";
  $("#recipeQuickQuantity").value = "";
  renderRecipeSearchResults();
  const quantityInputs = $$(".recipe-line .recipe-quantity");
  const lastQuantityInput = quantityInputs[quantityInputs.length - 1];
  if (lastQuantityInput) lastQuantityInput.focus();
}

function addRecipeLine(selectedId = "", quantity = "") {
  const template = $("#recipeLineTemplate").content.cloneNode(true);
  const line = template.querySelector(".recipe-line");
  const select = line.querySelector(".recipe-ingredient");
  const input = line.querySelector(".recipe-quantity");

  select.innerHTML = ingredientOptions(selectedId);
  input.value = quantity;
  updateRecipeLineUnit(line);
  select.addEventListener("change", () => {
    updateRecipeLineUnit(line);
    renderRecipeSearchResults();
    renderRecipePreview();
  });
  input.addEventListener("input", renderRecipePreview);
  line.querySelector(".remove-line").addEventListener("click", () => {
    line.remove();
    renderRecipeSearchResults();
    renderRecipePreview();
  });
  $("#recipeLines").append(line);
  renderRecipeSearchResults();
  renderRecipePreview();
}

function getRecipeLinesFromForm() {
  return $$(".recipe-line")
    .map((line) => ({
      ingredientId: line.querySelector(".recipe-ingredient").value,
      quantity: toNumber(line.querySelector(".recipe-quantity").value),
    }))
    .filter((line) => line.ingredientId && line.quantity > 0);
}

function renderRecipePreview() {
  const preview = $("#recipePreview");
  if (!preview) return;

  updateAllRecipeLineUnits();
  const recipe = getRecipeLinesFromForm();
  preview.innerHTML =
    recipe
      .map((line) => {
        const ingredient = findIngredient(line.ingredientId);
        if (!ingredient) return "";
        return `<li>${formatQuantity(line.quantity, ingredient.unit)} de ${escapeHtml(ingredient.name)}</li>`;
      })
      .join("") || "<li>Nenhuma materia-prima selecionada.</li>";
}

function resetSaleForm() {
  $("#saleForm").reset();
  $("#saleId").value = "";
  $("#saleQuantity").value = 1;
  $("#saleFormTitle").textContent = "Registrar venda";
  $("#saleSubmit").textContent = "Salvar venda";
  $("#cancelSaleEdit").classList.add("hidden");
  renderSelects();
  updateSaleHint();
}

function startSaleEdit(id) {
  const sale = findSale(id);
  if (!sale) return;

  const product = findProduct(sale.productId);
  if (!product) {
    alert("Esse produto nao esta mais no cardapio. Para editar a venda, cadastre o produto novamente.");
    return;
  }

  document.querySelector('[data-tab="sales"]').click();
  $("#saleId").value = sale.id;
  $("#saleProduct").value = sale.productId;
  $("#saleQuantity").value = sale.quantity;
  $("#salePrice").value = Number(sale.price).toFixed(2);
  $("#saleFormTitle").textContent = "Editar venda";
  $("#saleSubmit").textContent = "Salvar alteracoes";
  $("#cancelSaleEdit").classList.remove("hidden");
  updateSaleHint();
  $("#saleQuantity").focus();
}

function resetPurchaseForm() {
  $("#purchaseForm").reset();
  $("#purchaseId").value = "";
  $("#purchaseFormTitle").textContent = "Registrar compra";
  $("#purchaseSubmit").textContent = "Salvar compra";
  $("#cancelPurchaseEdit").classList.add("hidden");
  renderSelects();
}

function startPurchaseEdit(id) {
  const purchase = findPurchase(id);
  if (!purchase) return;

  document.querySelector('[data-tab="purchases"]').click();
  $("#purchaseId").value = purchase.id;
  $("#purchaseIngredient").value = purchase.ingredientId;
  $("#purchaseQuantity").value = purchase.quantity;
  $("#purchaseCost").value = Number(purchase.cost).toFixed(2);
  $("#purchaseFormTitle").textContent = "Editar compra";
  $("#purchaseSubmit").textContent = "Salvar alteracoes";
  $("#cancelPurchaseEdit").classList.remove("hidden");
  $("#purchaseQuantity").focus();
}

function resetProductForm() {
  $("#productForm").reset();
  $("#productId").value = "";
  $("#productMenuActive").checked = true;
  $("#productFeatured").checked = false;
  $("#productSortOrder").value = 0;
  $("#productFormTitle").textContent = "Novo hamburguer";
  $("#productSubmit").textContent = "Salvar hamburguer";
  $("#cancelProductEdit").classList.add("hidden");
  $("#recipeIngredientSearch").value = "";
  $("#recipeQuickQuantity").value = "";
  $("#recipeLines").innerHTML = "";
  addRecipeLine();
  renderRecipeSearchResults();
}

function startProductEdit(id) {
  const product = findProduct(id);
  if (!product) return;

  document.querySelector('[data-tab="products"]').click();
  $("#productId").value = product.id;
  $("#productName").value = product.name;
  $("#productPrice").value = Number(product.price).toFixed(2);
  $("#productMenuName").value = product.menuName || product.name;
  $("#productCategory").value = product.category || "";
  $("#productDescription").value = product.description || "";
  $("#productImageUrl").value = product.imageUrl || "";
  $("#productMenuActive").checked = product.menuActive !== false;
  $("#productFeatured").checked = Boolean(product.featured);
  $("#productSortOrder").value = product.sortOrder || 0;
  $("#productFormTitle").textContent = "Editar hamburguer";
  $("#productSubmit").textContent = "Salvar alteracoes";
  $("#cancelProductEdit").classList.remove("hidden");
  $("#recipeLines").innerHTML = "";
  product.recipe.forEach((line) => addRecipeLine(line.ingredientId, line.quantity));
  if (!product.recipe.length) addRecipeLine();
  renderRecipeSearchResults();
  renderRecipePreview();
  $("#productName").focus();
}

function resetIngredientForm() {
  $("#ingredientForm").reset();
  $("#ingredientId").value = "";
  $("#ingredientStock").value = 0;
  $("#ingredientMin").value = 0;
  $("#ingredientRestockQuantity").value = 0;
  $("#ingredientRestockCost").value = 0;
  $("#stockAdjustmentQuantity").value = 0;
  $("#stockAdjustmentReason").value = "";
  $("#ingredientFormTitle").textContent = "Novo ingrediente";
  $("#ingredientSubmit").textContent = "Adicionar ingrediente";
  $("#cancelIngredientEdit").classList.add("hidden");
}

function startIngredientEdit(id) {
  const ingredient = findIngredient(id);
  if (!ingredient) return;

  $("#ingredientId").value = ingredient.id;
  $("#ingredientName").value = ingredient.name;
  $("#ingredientUnit").value = ingredient.unit;
  $("#ingredientStock").value = ingredient.stock;
  $("#ingredientMin").value = ingredient.min;
  $("#ingredientRestockQuantity").value = 0;
  $("#ingredientRestockCost").value = 0;
  $("#stockAdjustmentQuantity").value = 0;
  $("#stockAdjustmentReason").value = "";
  $("#ingredientFormTitle").textContent = "Editar ingrediente";
  $("#ingredientSubmit").textContent = "Salvar alteracoes";
  $("#cancelIngredientEdit").classList.remove("hidden");
  document.querySelector('[data-tab="inventory"]').click();
  $("#ingredientName").focus();
}

function startIngredientRestock(id) {
  const ingredient = findIngredient(id);
  if (!ingredient) return;

  startIngredientEdit(id);
  $("#ingredientRestockQuantity").focus();
}

function resetUserForm() {
  $("#userForm").reset();
  $("#userId").value = "";
  $("#userRole").value = "operator";
  $("#userPassword").required = true;
  $("#userFormTitle").textContent = "Novo usuario";
  $("#userSubmit").textContent = "Salvar usuario";
  $("#userMessage").textContent = "";
  $("#cancelUserEdit").classList.add("hidden");
}

function startUserEdit(id) {
  const user = findUser(id);
  if (!user || !isAdmin()) return;

  activateTab("users");
  $("#userId").value = user.id;
  $("#userName").value = user.name;
  $("#userEmail").value = user.email;
  $("#userRole").value = user.role;
  $("#userPassword").value = "";
  $("#userPassword").required = false;
  $("#userFormTitle").textContent = "Editar usuario";
  $("#userSubmit").textContent = "Salvar alteracoes";
  $("#userMessage").textContent = "";
  $("#cancelUserEdit").classList.remove("hidden");
  $("#userName").focus();
}

async function deleteUser(id){
  if(!isAdmin() || !await cloudConfirm('Desativar o acesso deste usuário?')) return;
  await cloudRequest('/api/users/disable',{id}); await cloudRefresh(true); resetUserForm();
}

function getQuickOrderItem(productId) {
  return quickOrderDraft.items.find((item) => item.productId === productId);
}

function syncQuickOrderDraft() {
  quickOrderDraft.items = quickOrderDraft.items
    .map((item) => {
      const product = findProduct(item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        productName: product.menuName || product.name,
        quantity: item.quantity,
        price: product.price,
        total: product.price * item.quantity,
      };
    })
    .filter(Boolean);
}

function getQuickOrderTotals() {
  syncQuickOrderDraft();
  return calculateOrderItemsTotals(quickOrderDraft.items);
}

function changeQuickOrderItem(productId, delta) {
  syncQuickOrderFormFromDom();
  const product = findProduct(productId);
  if (!product) return;
  const existing = getQuickOrderItem(productId);
  const nextQuantity = Math.max(0, (existing?.quantity || 0) + delta);
  const nextItems = quickOrderDraft.items.filter((item) => item.productId !== productId);

  if (nextQuantity > 0) {
    nextItems.push({
      productId: product.id,
      productName: product.menuName || product.name,
      quantity: nextQuantity,
      price: product.price,
      total: product.price * nextQuantity,
    });
  }

  if (!canFulfillItems(nextItems)) {
    alert("Estoque insuficiente para adicionar mais este produto.");
    return;
  }

  quickOrderDraft.items = nextItems;
  renderDigitalMenu();
}

function getQuickOrderFormData() {
  syncQuickOrderFormFromDom();
  const deliveryFee = toNumber(quickOrderDraft.form.deliveryFee);
  const discount = toNumber(quickOrderDraft.form.discount);
  const surcharge = toNumber(quickOrderDraft.form.surcharge);
  const totals = calculateOrderItemsTotals(quickOrderDraft.items, { deliveryFee, discount, surcharge });

  return {
    customerName: quickOrderDraft.form.customerName,
    customerPhone: quickOrderDraft.form.customerPhone,
    customerWhatsapp: quickOrderDraft.form.customerWhatsapp,
    destination: quickOrderDraft.form.destination,
    address: quickOrderDraft.form.address,
    paymentMethod: quickOrderDraft.form.paymentMethod,
    deliveryFee,
    discount,
    surcharge,
    note: $("#quickNote")?.value.trim() || "",
    ...totals,
  };
}

function syncQuickOrderFormFromDom() {
  if (!$("#quickCustomer")) return;
  const destination = $("#quickDestination").value || "delivery";
  quickOrderDraft.form = {
    customerName: $("#quickCustomer").value.trim(),
    customerPhone: $("#quickPhone").value.trim(),
    customerWhatsapp: Boolean($("#quickWhatsapp").checked),
    destination,
    address: destination === "pickup" ? "" : $("#quickAddress").value.trim(),
    paymentMethod: $("#quickPayment").value || "pix",
    deliveryFee: toNumber($("#quickDeliveryFee").value),
    discount: toNumber($("#quickDiscount").value),
    surcharge: toNumber($("#quickSurcharge").value),
    note: $("#quickNote").value.trim(),
  };
}

function updateQuickOrderPreview() {
  const data = getQuickOrderFormData();
  if ($("#quickFeePreview")) $("#quickFeePreview").textContent = currency.format(data.deliveryFee);
  if ($("#quickDiscountPreview")) $("#quickDiscountPreview").textContent = currency.format(data.discount);
  if ($("#quickSurchargePreview")) $("#quickSurchargePreview").textContent = currency.format(data.surcharge);
  if ($("#quickTotalPreview")) $("#quickTotalPreview").textContent = currency.format(data.total);
}

function clearQuickOrderDraft() {
  const settings = getStoreSettings();
  quickOrderDraft.items = [];
  quickOrderDraft.form = {
    customerName: "",
    customerPhone: "",
    customerWhatsapp: true,
    destination: "delivery",
    address: "",
    paymentMethod: "pix",
    deliveryFee: settings.defaultDeliveryFee || 0,
    discount: 0,
    surcharge: 0,
    note: "",
  };
  renderDigitalMenu();
}

function getMenuInput(productId, className) {
  return document.querySelector(`.${className}[data-id="${escapeHtml(productId)}"]`);
}

async function createMenuOrder(){
  syncQuickOrderDraft();
  if(!quickOrderDraft.items.length) return alert('Selecione pelo menos um produto.');
  const form=getQuickOrderFormData();
  if(!form.customerName) return alert('Informe o nome do cliente.');
  if(form.destination!=='pickup' && !form.address) return alert('Informe o endereço ou a mesa.');
  if(!await cloudConfirm('Confirmar pedido de '+form.customerName+'? Total previsto: '+currency.format(form.total))) return;
  const {subtotal,total,...fields}=form;
  const result=await cloudMutate('order.create',{...fields,items:quickOrderDraft.items.map(i=>({productId:i.productId,quantity:i.quantity}))});
  clearQuickOrderDraft(); renderAll(); playNewOrderSound();
  const order=findOrder(result.orderId); if(order && printSettings.autoPrintOrders) printKitchenCommand(order);
}

async function acceptMenuOrder(id){ await cloudMutate('order.accept',{id}); renderAll(); }

async function advanceMenuOrder(id){ await cloudMutate('order.advance',{id}); renderAll(); }

async function cancelMenuOrder(id){
  const reason=await cloudPrompt('Motivo do cancelamento (mínimo 3 caracteres):');
  if(!reason || !await cloudConfirm('Confirmar cancelamento? O consumo da produção será mantido.')) return;
  await cloudMutate('order.cancel',{id,reason,note:await cloudPrompt('Observação:','')||''}); renderAll();
}

async function registerIngredientRestockFromForm() {
  const ingredient = findIngredient($("#ingredientId").value);
  const quantity = toNumber($("#ingredientRestockQuantity").value);
  const cost = toNumber($("#ingredientRestockCost").value);

  if (!ingredient) {
    alert("Selecione uma materia-prima existente para registrar reposicao.");
    return;
  }

  if (quantity <= 0 || cost <= 0) {
    alert("Informe a quantidade comprada e o valor pago para registrar a reposicao.");
    return;
  }

  createPurchase(ingredient, quantity, cost);
  $("#ingredientStock").value = ingredient.stock;
  $("#ingredientRestockQuantity").value = 0;
  $("#ingredientRestockCost").value = 0;
  await saveState();
  renderAll();
}

async function registerStockAdjustmentFromForm() {
  const ingredient = findIngredient($("#ingredientId").value);
  const quantity = toNumber($("#stockAdjustmentQuantity").value);
  const type = $("#stockAdjustmentType").value || "ajuste";
  const reason = $("#stockAdjustmentReason").value.trim();

  if (!ingredient) {
    alert("Selecione uma materia-prima existente para registrar ajuste.");
    return;
  }
  if (quantity <= 0 || !reason) {
    alert("Informe quantidade e motivo obrigatorio para o ajuste.");
    return;
  }
  if (ingredient.stock - quantity < -0.000001) {
    alert("O ajuste deixaria o estoque negativo.");
    return;
  }

  ingredient.stock -= quantity;
  const adjustment = {
    id: createId(),
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    type,
    quantity,
    reason,
    date: new Date().toISOString(),
    user: getCurrentUserName(),
  };
  state.stockAdjustments.push(adjustment);
  recordMovement({ type, ingredient, quantity, source: reason, sourceId: adjustment.id });
  addAuditLog("Estoque ajustado", `${type} - ${ingredient.name} - ${formatQuantity(quantity, ingredient.unit)} - ${reason}`);
  $("#ingredientStock").value = ingredient.stock;
  $("#stockAdjustmentQuantity").value = 0;
  $("#stockAdjustmentReason").value = "";
  await saveState();
  renderAll();
}

async function deleteIngredient(id) {
  const ingredient = findIngredient(id);
  if (!ingredient) return;

  const linkedProducts = state.products.filter((product) =>
    product.recipe.some((line) => line.ingredientId === ingredient.id),
  );
  const linkedNames = linkedProducts.map((product) => product.name).join(", ");
  const message = linkedProducts.length
    ? `Excluir "${ingredient.name}" tambem vai remover essa materia-prima da ficha tecnica de: ${linkedNames}. Deseja continuar?`
    : `Deseja excluir "${ingredient.name}" do estoque?`;

  if (!await cloudConfirm(message)) return;

  state.ingredients = state.ingredients.filter((item) => item.id !== ingredient.id);
  state.products = state.products.map((product) => ({
    ...product,
    recipe: product.recipe.filter((line) => line.ingredientId !== ingredient.id),
  }));

  if ($("#ingredientId").value === ingredient.id) resetIngredientForm();

  await saveState();
  renderAll();
}

async function deleteProduct(id) {
  const product = findProduct(id);
  if (!product) return;

  if (!await cloudConfirm(`Deseja excluir "${product.name}" do cardapio? As vendas antigas continuam no historico.`)) return;

  state.products = state.products.filter((item) => item.id !== product.id);
  addAuditLog("Produto excluido", product.name);
  if ($("#productId").value === id) resetProductForm();
  await saveState();
  renderAll();
}

function updateSaleHint() {
  const product = findProduct($("#saleProduct").value);
  const impact = $("#saleStockImpact");
  if (!product) {
    $("#saleHint").textContent = "Cadastre um hamburguer antes de vender.";
    if (impact) impact.innerHTML = "<li>Nenhuma baixa prevista.</li>";
    return;
  }

  const quantity = toNumber($("#saleQuantity").value) || 1;
  $("#saleHint").textContent = `Disponivel pelo estoque atual: ${availableForProduct(product)} unidade(s).`;

  if (!impact) return;

  impact.innerHTML =
    product.recipe
      .map((line) => {
        const ingredient = findIngredient(line.ingredientId);
        if (!ingredient) return "";
        return `<li>${formatQuantity(line.quantity * quantity, ingredient.unit)} de ${escapeHtml(ingredient.name)}</li>`;
      })
      .filter(Boolean)
      .join("") || "<li>Esse produto nao possui ficha tecnica.</li>";
}

function availableForProduct(product) {
  if (!product || !product.recipe.length) return 0;

  return Math.min(
    ...product.recipe.map((line) => {
      const ingredient = findIngredient(line.ingredientId);
      if (!ingredient) return 0;
      return Math.floor(ingredient.stock / line.quantity);
    }),
  );
}

function validateBackup(data) {
  if (!data || typeof data !== "object") return false;
  return ["ingredients", "products", "purchases", "sales"].every((key) => Array.isArray(data[key]));
}

function getBackupMeta() {
  try {
    return JSON.parse(storageRepository.get(BACKUP_META_KEY)) || {};
  } catch {
    return {};
  }
}

function saveBackupMeta() {
  storageRepository.set(BACKUP_META_KEY, JSON.stringify({ lastBackupAt: new Date().toISOString() }));
}

function renderBackupWarning() {
  const warning = $("#backupWarning");
  if (!warning) return;
  const lastBackupAt = getBackupMeta().lastBackupAt;
  const days = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000) : null;
  if (days !== null && days <= 3) {
    warning.classList.add("hidden");
    warning.innerHTML = "";
    return;
  }

  const message =
    days === null
      ? "Nenhum backup foi registrado neste navegador. Recomendamos exportar um backup hoje."
      : `Seu ultimo backup foi realizado ha ${days} dias. Recomendamos gerar um novo backup.`;
  warning.classList.remove("hidden");
  warning.innerHTML = `<strong>Backup recomendado</strong><span>${message}</span><button class="ghost-button" type="button" data-go-tab="settings">Abrir configuracoes</button>`;
  warning.querySelector("[data-go-tab]")?.addEventListener("click", (event) => activateTab(event.currentTarget.dataset.goTab));
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportBackup(){
  const data=await cloudRequest('/api/backup');
  downloadText('pjotabuguer-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2),'application/json');
  saveBackupMeta();renderBackupWarning();
}

async function importBackupFile(file){
  const parsed=JSON.parse(await file.text());
  if(!validateBackup(parsed)) throw new Error('Backup inválido.');
  if(!await cloudConfirm('Restaurar este backup no servidor? A versão atual ficará no histórico de recuperação.'))return;
  await cloudMutate('state.import',normalizeState(parsed)); renderAll();
  alert('Backup confirmado no servidor e disponível nos outros dispositivos.');
}

function csvEscape(value) {
  const raw = String(value ?? "");
  const text = typeof value === "string" && /^[\s]*[=+@-]/.test(raw) ? "\'" + raw : raw;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  return `\ufeff${rows.map((row) => row.map(csvEscape).join(";")).join("\n")}`;
}

function exportCsv(report) {
  const today = new Date().toISOString().slice(0, 10);
  const rowsByReport = {
    sales: getSalesCsvRows,
    purchases: getPurchasesCsvRows,
    inventory: getInventoryCsvRows,
    products: getProductsCsvRows,
    cmv: getCmvCsvRows,
  };
  const getRows = rowsByReport[report];
  if (!getRows) return;
  downloadText(`burgerstock-${report}-${today}.csv`, toCsv(getRows()), "text/csv;charset=utf-8");
}

function getSalesCsvRows() {
  return [
    ["Data", "Produto", "Quantidade", "Preco unitario", "Total", "CMV vendido", "Lucro bruto"],
    ...getFilteredSales().map((sale) => [
      fileDateFormat.format(new Date(sale.date)),
      sale.productName,
      sale.quantity,
      sale.price,
      sale.total,
      getSaleCmv(sale),
      getSaleGrossProfit(sale),
    ]),
  ];
}

function getPurchasesCsvRows() {
  return [
    ["Data", "Materia-prima", "Quantidade", "Unidade", "Custo total"],
    ...getFilteredPurchases().map((purchase) => [
      fileDateFormat.format(new Date(purchase.date)),
      purchase.ingredientName,
      purchase.quantity,
      purchase.unit,
      purchase.cost,
    ]),
  ];
}

function getInventoryCsvRows() {
  return [
    ["Materia-prima", "Unidade", "Estoque atual", "Estoque minimo", "Custo medio", "Valor investido"],
    ...state.ingredients.map((ingredient) => {
      const { averageCost } = getIngredientCostStats(ingredient.id);
      return [ingredient.name, ingredient.unit, ingredient.stock, ingredient.min, averageCost, averageCost * ingredient.stock];
    }),
  ];
}

function getProductsCsvRows() {
  return [
    ["Produto", "Nome cardapio", "Ativo cardapio", "Categoria", "Preco", "Materia-prima", "Quantidade usada", "Unidade"],
    ...state.products.flatMap((product) =>
      product.recipe.map((line) => {
        const ingredient = findIngredient(line.ingredientId);
        return [
          product.name,
          product.menuName || product.name,
          product.menuActive !== false ? "Sim" : "Nao",
          product.category || "",
          product.price,
          ingredient?.name || "",
          line.quantity,
          ingredient?.unit || "",
        ];
      }),
    ),
  ];
}

function getCmvCsvRows() {
  return [
    ["Produto", "Preco", "CMV", "CMV %", "Lucro medio", "Status"],
    ...state.products.map((product) => {
      const cmv = calculateProductCmv(product);
      const percent = product.price > 0 ? (cmv / product.price) * 100 : 0;
      return [product.name, product.price, cmv, percent, product.price - cmv, getCmvStatus(percent).label];
    }),
  ];
}

function bindEvents() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });

  $$("[data-go-tab]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.goTab));
  });

  $("#setupForm").addEventListener("submit", async(event)=>{event.preventDefault();await authSubmit('/api/auth/setup',{name:$('#setupName').value,email:$('#setupEmail').value,password:$('#setupPassword').value,setupKey:$('#setupKey').value},'#setupMessage');});

  $("#loginForm").addEventListener("submit", async(event)=>{event.preventDefault();await authSubmit('/api/auth/login',{email:$('#loginEmail').value,password:$('#loginPassword').value},'#loginMessage');});

  $("#logoutButton").addEventListener("click", async()=>{if(cloud.pending && !await cloudConfirm('Há uma operação não confirmada. Exporte o rascunho antes de sair. Sair mesmo assim?'))return;await cloudRequest('/api/logout',{});sessionStorage.removeItem('pjota.pending.'+currentSession?.userId);cloud.pending=null;clearSession();await cloudBoot();});

  $("#menuOrderSearch").addEventListener("input", () => {
    menuFilter.query = $("#menuOrderSearch").value;
    renderDigitalMenu();
  });

  $("#menuOrderStatusFilter").addEventListener("change", () => {
    menuFilter.status = $("#menuOrderStatusFilter").value;
    renderDigitalMenu();
  });

  $("#customerSearch").addEventListener("input", () => {
    customerFilter.query = $("#customerSearch").value;
    renderCustomers();
  });

  $("#autoPrintOrders").addEventListener("change", () => {
    printSettings.autoPrintOrders = $("#autoPrintOrders").checked;
    savePrintSettings();
  });

  $("#soundOrders").addEventListener("change", () => {
    soundSettings.enabled = $("#soundOrders").checked;
    saveSoundSettings();
    if (soundSettings.enabled) playNewOrderSound();
  });

  $("#cashDate").addEventListener("change", renderCashClosing);
  $("#openCashButton").addEventListener("click", openCash);
  $("#registerCashAdjustment").addEventListener("click", registerCashAdjustment);
  $("#closeCashButton").addEventListener("click", closeCash);

  $("#financePeriodMode").addEventListener("change", () => {
    reportFilter.mode = $("#financePeriodMode").value;
    renderAll();
  });
  $("#financePeriodStart").addEventListener("change", () => {
    reportFilter.start = $("#financePeriodStart").value;
    reportFilter.mode = "custom";
    renderAll();
  });
  $("#financePeriodEnd").addEventListener("change", () => {
    reportFilter.end = $("#financePeriodEnd").value;
    reportFilter.mode = "custom";
    renderAll();
  });
  ["#cashCounted", "#pixCounted", "#cardCounted"].forEach((selector) => {
    $(selector).addEventListener("input", () => {
      renderCashConference();
    });
  });
  $("#cashConferenceNote").addEventListener("input", () => renderCashConference());

  $("#expenseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const expenseId = $("#expenseId").value;
    const category = $("#expenseCategory").value;
    const description = $("#expenseDescription").value.trim();
    const amount = toNumber($("#expenseAmount").value);
    const date = $("#expenseDate").value ? new Date(`${$("#expenseDate").value}T12:00:00`).toISOString() : new Date().toISOString();

    if (!description || amount <= 0) {
      alert("Informe descricao e valor valido para a despesa.");
      return;
    }

    if (expenseId) {
      const expense = findExpense(expenseId);
      if (!expense) return;
      expense.category = category;
      expense.description = description;
      expense.amount = amount;
      expense.date = date;
      expense.updatedAt = new Date().toISOString();
      addAuditLog("Despesa alterada", `${description} - ${currency.format(amount)}`);
    } else {
      state.expenses.push({
        id: createId(),
        category,
        description,
        amount,
        date,
        updatedAt: "",
      });
      addAuditLog("Despesa criada", `${description} - ${currency.format(amount)}`);
    }

    resetExpenseForm();
    await saveState();
    renderAll();
  });
  $("#cancelExpenseEdit").addEventListener("click", resetExpenseForm);

  $("#settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    state.settings = normalizeSettings({
      companyName: $("#settingCompanyName").value.trim(),
      address: $("#settingAddress").value.trim(),
      phone: $("#settingPhone").value.trim(),
      whatsapp: $("#settingWhatsapp").value.trim(),
      defaultDeliveryFee: toNumber($("#settingDefaultDeliveryFee").value),
      logoUrl: $("#settingLogoUrl").value.trim(),
      printMessage: $("#settingPrintMessage").value.trim(),
    });
    addAuditLog("Configuracoes alteradas", state.settings.companyName);
    await saveState();
    renderAll();
  });

  $("#periodMode").addEventListener("change", () => {
    reportFilter.mode = $("#periodMode").value;
    renderAll();
  });
  $("#periodStart").addEventListener("change", () => {
    reportFilter.start = $("#periodStart").value;
    reportFilter.mode = "custom";
    $("#periodMode").value = "custom";
    renderAll();
  });
  $("#periodEnd").addEventListener("change", () => {
    reportFilter.end = $("#periodEnd").value;
    reportFilter.mode = "custom";
    $("#periodMode").value = "custom";
    renderAll();
  });

  $("#ingredientForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const ingredientId = $("#ingredientId").value;
    const name = $("#ingredientName").value.trim();
    const unit = $("#ingredientUnit").value;
    const stock = toNumber($("#ingredientStock").value);
    const min = toNumber($("#ingredientMin").value);

    if (!name) return;
    if (hasNameConflict(state.ingredients, name, ingredientId)) {
      alert("Ja existe uma materia-prima com esse nome. Edite o item existente ou escolha outro nome.");
      return;
    }

    let ingredient;
    if (ingredientId) {
      ingredient = findIngredient(ingredientId);
      if (!ingredient) return;
      const isUnitInUse =
        ingredient.unit !== unit &&
        (state.products.some((product) => product.recipe.some((line) => line.ingredientId === ingredient.id)) ||
          state.purchases.some((purchase) => purchase.ingredientId === ingredient.id) ||
          state.sales.some((sale) => getSaleRecipe(sale).some((line) => line.ingredientId === ingredient.id)) ||
          state.movements.some((movement) => movement.ingredientId === ingredient.id));
      if (isUnitInUse) {
        alert("Nao e possivel alterar a unidade de um ingrediente que ja possui ficha tecnica, compra, venda ou movimentacao. Crie um novo ingrediente se precisar usar outra unidade.");
        return;
      }
      ingredient.name = name;
      ingredient.unit = unit;
      ingredient.stock = stock;
      ingredient.min = min;
    } else {
      ingredient = { id: createId(), name, unit, stock, min };
      state.ingredients.push(ingredient);
    }

    resetIngredientForm();
    await saveState();
    renderAll();
  });

  $("#cancelIngredientEdit").addEventListener("click", resetIngredientForm);
  $("#registerIngredientRestock").addEventListener("click", registerIngredientRestockFromForm);
  $("#registerStockAdjustment").addEventListener("click", registerStockAdjustmentFromForm);

  $("#purchaseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const purchaseId = $("#purchaseId").value;
    const ingredient = findIngredient($("#purchaseIngredient").value);
    const quantity = toNumber($("#purchaseQuantity").value);
    const cost = toNumber($("#purchaseCost").value);
    if (!ingredient || quantity <= 0 || cost < 0) return;

    if (purchaseId) {
      const purchase = findPurchase(purchaseId);
      if (!purchase || !updatePurchase(purchase, ingredient, quantity, cost)) return;
    } else {
      createPurchase(ingredient, quantity, cost);
    }

    resetPurchaseForm();
    await saveState();
    renderAll();
  });

  $("#cancelPurchaseEdit").addEventListener("click", resetPurchaseForm);

  $("#addRecipeLine").addEventListener("click", () => addRecipeLine());
  $("#recipeIngredientSearch").addEventListener("input", renderRecipeSearchResults);
  $("#recipeIngredientSearch").addEventListener("focus", renderRecipeSearchResults);
  $("#recipeQuickQuantity").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addRecipeLineFromQuickAdd();
    }
  });
  $("#addRecipeSearchLine").addEventListener("click", () => addRecipeLineFromQuickAdd());

  $("#productForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const productId = $("#productId").value;
    const name = $("#productName").value.trim();
    const price = toNumber($("#productPrice").value);
    const menuName = $("#productMenuName").value.trim() || name;
    const category = $("#productCategory").value.trim() || "Cardapio";
    const description = $("#productDescription").value.trim();
    const imageUrl = $("#productImageUrl").value.trim();
    const menuActive = $("#productMenuActive").checked;
    const featured = $("#productFeatured").checked;
    const sortOrder = toNumber($("#productSortOrder").value);
    const recipe = getRecipeLinesFromForm();

    if (!name || price <= 0) {
      alert("Informe nome e preco de venda validos.");
      return;
    }
    if (!recipe.length) {
      alert("Adicione pelo menos um ingrediente na receita.");
      return;
    }
    if (hasNameConflict(state.products, name, productId)) {
      alert("Ja existe um produto com esse nome.");
      return;
    }

    if (productId) {
      const product = findProduct(productId);
      if (!product) return;
      product.name = name;
      product.price = price;
      product.menuName = menuName;
      product.category = category;
      product.description = description;
      product.imageUrl = imageUrl;
      product.menuActive = menuActive;
      product.featured = featured;
      product.sortOrder = sortOrder;
      product.recipe = recipe;
      addAuditLog("Produto editado", name);
    } else {
      state.products.push({
        id: createId(),
        name,
        menuName,
        category,
        description,
        imageUrl,
        menuActive,
        featured,
        sortOrder,
        price,
        recipe,
      });
      addAuditLog("Produto criado", name);
    }

    resetProductForm();
    await saveState();
    renderAll();
  });

  $("#cancelProductEdit").addEventListener("click", resetProductForm);

  $("#saleProduct").addEventListener("change", () => {
    const product = findProduct($("#saleProduct").value);
    $("#salePrice").value = product ? product.price.toFixed(2) : "";
    updateSaleHint();
  });

  $("#saleQuantity").addEventListener("input", updateSaleHint);

  $("#saleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const saleId = $("#saleId").value;
    const saleBeingEdited = saleId ? findSale(saleId) : null;
    const product = findProduct($("#saleProduct").value);
    const quantity = toNumber($("#saleQuantity").value);
    const price = toNumber($("#salePrice").value);
    if (!product || quantity <= 0) return;

    if (saleBeingEdited) restoreSaleStock(saleBeingEdited);

    if (!canSell(product, quantity)) {
      if (saleBeingEdited) deductSaleStock(saleBeingEdited);
      $("#saleHint").textContent = "Estoque insuficiente para essa venda.";
      return;
    }

    if (saleBeingEdited) {
      const saleDraft = buildSale(product, quantity, price, { id: saleBeingEdited.id, date: saleBeingEdited.date });
      deductProductStock(product, quantity);
      saleBeingEdited.productId = product.id;
      saleBeingEdited.productName = product.name;
      saleBeingEdited.quantity = quantity;
      saleBeingEdited.price = price;
      saleBeingEdited.total = saleDraft.total;
      saleBeingEdited.recipeSnapshot = saleDraft.recipeSnapshot;
      saleBeingEdited.cmvUnit = saleDraft.cmvUnit;
      saleBeingEdited.cmvTotal = saleDraft.cmvTotal;
      saleBeingEdited.grossProfit = saleDraft.grossProfit;
      saleBeingEdited.updatedAt = new Date().toISOString();
      addAuditLog("Venda editada", `${product.name} - ${quantity} un`);
    } else {
      createSaleFromProduct(product, quantity, price);
    }

    resetSaleForm();
    await saveState();
    renderAll();
  });

  $("#cancelSaleEdit").addEventListener("click", resetSaleForm);

  $("#userForm").addEventListener("submit", async(event)=>{event.preventDefault();const data={name:$('#userName').value,email:$('#userEmail').value,role:$('#userRole').value};if($('#userId').value)data.id=$('#userId').value;if($('#userPassword').value)data.password=$('#userPassword').value;try{const result=await cloudRequest('/api/users',data);resetUserForm();if(result.reauthenticate){clearSession();await cloudBoot();}else await cloudRefresh(true);}catch(e){$('#userMessage').textContent=e.message;}});

  $("#cancelUserEdit").addEventListener("click", resetUserForm);

  $("#seedData").addEventListener("click", async () => {
    state = normalizeState(exampleState);
    await saveState();
    resetProductForm();
    renderAll();
  });

  $("#clearData").addEventListener("click", async () => {
    if (!await cloudConfirm("Deseja apagar todos os dados cadastrados?")) return;
    state = clone(defaultState);
    await saveState();
    resetProductForm();
    resetSaleForm();
    resetPurchaseForm();
    resetIngredientForm();
    renderAll();
  });

  $("#exportBackup").addEventListener("click", exportBackup);
  $("#importBackup").addEventListener("click", () => $("#backupFile").click());
  $("#backupFile").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importBackupFile(file);
    event.target.value = "";
  });

  $$(".export-csv").forEach((button) => {
    button.addEventListener("click", () => exportCsv(button.dataset.report));
  });
}

bindEvents();
addRecipeLine();
resetExpenseForm();
cloudBoot();
setInterval(() => cloudRefresh().catch(() => {}), 5000);
setInterval(renderKitchen, 15000);
