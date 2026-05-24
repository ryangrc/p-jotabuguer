const STORAGE_KEY = "burgerstock.v1";
const AUTH_STORAGE_KEY = "burgerstock.auth.v1";
const SESSION_STORAGE_KEY = "burgerstock.session.v1";

const defaultState = {
  ingredients: [],
  products: [],
  purchases: [],
  sales: [],
  orders: [],
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
    { id: createId(), name: "Pao brioche", unit: "un", stock: 40, min: 12 },
    { id: createId(), name: "Carne smash 90g", unit: "un", stock: 55, min: 20 },
    { id: createId(), name: "Queijo cheddar", unit: "un", stock: 46, min: 18 },
    { id: createId(), name: "Alface", unit: "g", stock: 900, min: 300 },
    { id: createId(), name: "Molho da casa", unit: "ml", stock: 1200, min: 350 },
  ],
  products: [],
  purchases: [],
  sales: [],
  orders: [],
};

exampleState.products = [
  {
    id: createId(),
    name: "Classico cheddar",
    menuName: "Classico cheddar",
    description: "Pao brioche, smash 90g, cheddar e molho da casa.",
    category: "Smash",
    imageUrl: "",
    menuActive: true,
    featured: true,
    sortOrder: 1,
    price: 28,
    recipe: [
      { ingredientId: exampleState.ingredients[0].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[1].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[2].id, quantity: 2 },
      { ingredientId: exampleState.ingredients[4].id, quantity: 25 },
    ],
  },
  {
    id: createId(),
    name: "Salada da casa",
    menuName: "Salada da casa",
    description: "Pao brioche, carne smash, cheddar, alface e molho da casa.",
    category: "Classicos",
    imageUrl: "",
    menuActive: true,
    featured: false,
    sortOrder: 2,
    price: 31,
    recipe: [
      { ingredientId: exampleState.ingredients[0].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[1].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[2].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[3].id, quantity: 35 },
      { ingredientId: exampleState.ingredients[4].id, quantity: 30 },
    ],
  },
];

exampleState.purchases = [
  {
    id: createId(),
    ingredientId: exampleState.ingredients[0].id,
    ingredientName: exampleState.ingredients[0].name,
    unit: exampleState.ingredients[0].unit,
    quantity: 40,
    cost: 48,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[1].id,
    ingredientName: exampleState.ingredients[1].name,
    unit: exampleState.ingredients[1].unit,
    quantity: 55,
    cost: 165,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[2].id,
    ingredientName: exampleState.ingredients[2].name,
    unit: exampleState.ingredients[2].unit,
    quantity: 46,
    cost: 69,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[3].id,
    ingredientName: exampleState.ingredients[3].name,
    unit: exampleState.ingredients[3].unit,
    quantity: 900,
    cost: 27,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[4].id,
    ingredientName: exampleState.ingredients[4].name,
    unit: exampleState.ingredients[4].unit,
    quantity: 1200,
    cost: 36,
    date: new Date().toISOString(),
  },
];

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

function normalizeAuthState(input) {
  const normalized = { ...clone(defaultAuthState), ...(input || {}) };
  normalized.users = Array.isArray(normalized.users) ? normalized.users : [];
  normalized.users = normalized.users
    .map((user) => ({
      id: String(user.id || createId()),
      name: String(user.name || "Usuario"),
      email: String(user.email || "").trim().toLowerCase(),
      role: user.role === "admin" ? "admin" : "operator",
      salt: String(user.salt || ""),
      passwordHash: String(user.passwordHash || ""),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || "",
    }))
    .filter((user) => user.email && user.salt && user.passwordHash);
  return normalized;
}

function loadAuthState() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return clone(defaultAuthState);

  try {
    return normalizeAuthState(JSON.parse(raw));
  } catch {
    return clone(defaultAuthState);
  }
}

function saveAuthState() {
  authState = normalizeAuthState(authState);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  currentSession = { userId: user.id, email: user.email, startedAt: new Date().toISOString() };
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
}

function clearSession() {
  currentSession = null;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

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

function validatePassword(value) {
  const password = String(value || "");
  if (!/^[A-Za-z0-9]{8,}$/.test(password)) {
    return "A senha precisa ter pelo menos 8 caracteres e usar apenas letras e numeros.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "A senha precisa misturar letras e numeros.";
  }
  return "";
}

function createSalt() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function fallbackHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function hashPassword(password, salt) {
  const text = `${salt}:${password}`;
  if (!globalThis.crypto?.subtle) return fallbackHash(text);
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildPasswordRecord(password) {
  const salt = createSalt();
  return {
    salt,
    passwordHash: await hashPassword(password, salt),
  };
}

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
  return normalized;
}

function normalizeOrder(order) {
  const quantity = toNumber(order.quantity) || 1;
  const price = toNumber(order.price);
  const total = toNumber(order.total) || quantity * price;
  const rawStatus = String(order.status || "awaiting_acceptance");
  const status = orderStatuses[rawStatus] ? rawStatus : legacyOrderStatusMap[rawStatus] || "awaiting_acceptance";

  return {
    id: String(order.id || createId()),
    productId: String(order.productId || ""),
    productName: String(order.productName || "Produto"),
    customerName: String(order.customerName || ""),
    note: String(order.note || ""),
    destination: order.destination === "table" || order.destination === "pickup" ? order.destination : "delivery",
    quantity,
    price,
    total,
    status,
    date: order.date || new Date().toISOString(),
    acceptedAt: order.acceptedAt || order.confirmedAt || "",
    readyAt: order.readyAt || "",
    dispatchedAt: order.dispatchedAt || "",
    paidAt: order.paidAt || "",
    statusUpdatedAt: order.statusUpdatedAt || order.confirmedAt || order.date || new Date().toISOString(),
    confirmedAt: order.confirmedAt || "",
    saleId: order.saleId || "",
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

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return clone(defaultState);

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function getOrderDestinationLabel(destination) {
  const labels = {
    delivery: "Entrega",
    table: "Mesa",
    pickup: "Retirada",
  };
  return labels[destination] || labels.delivery;
}

function ingredientOptions(selectedId = "") {
  return state.ingredients
    .map(
      (item) =>
        `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)} (${escapeHtml(item.unit)})</option>`,
    )
    .join("");
}

function productOptions(selectedId = "") {
  return state.products
    .map(
      (product) =>
        `<option value="${product.id}" ${product.id === selectedId ? "selected" : ""}>${escapeHtml(product.name)}</option>`,
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

function getCriticalItems() {
  return state.ingredients
    .filter((item) => item.stock <= item.min)
    .map((item) => ({
      ...item,
      suggested: Math.max(item.min - item.stock, 0),
    }));
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
  } else {
    if (!removePurchaseFromStock(purchase)) {
      alert("Nao e possivel editar essa compra porque a remocao deixaria o estoque negativo.");
      return false;
    }
    applyPurchaseToStock(updated);
  }

  Object.assign(purchase, updated);
  return true;
}

function deletePurchase(id) {
  const purchase = findPurchase(id);
  if (!purchase) return;
  if (!confirm(`Deseja excluir a compra de "${purchase.ingredientName}"? O estoque sera reduzido.`)) return;
  if (!removePurchaseFromStock(purchase)) {
    alert("Nao e possivel excluir essa compra porque o estoque ficaria negativo.");
    return;
  }
  state.purchases = state.purchases.filter((item) => item.id !== id);
  if ($("#purchaseId").value === id) resetPurchaseForm();
  saveState();
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
  if (!canSell(product, quantity)) return null;
  deductProductStock(product, quantity);
  const sale = buildSale(product, quantity, price, extra);
  state.sales.push(sale);
  return sale;
}

function canSell(product, quantity) {
  if (!product.recipe.length) return false;

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
  return state.sales.filter((sale) => isInPeriod(sale.date));
}

function getFilteredPurchases() {
  return state.purchases.filter((purchase) => isInPeriod(purchase.date));
}

function calculatePeriodMetrics() {
  const sales = getFilteredSales();
  const purchases = getFilteredPurchases();
  const revenue = sales.reduce((sum, sale) => sum + toNumber(sale.total), 0);
  const purchasesTotal = purchases.reduce((sum, purchase) => sum + toNumber(purchase.cost), 0);
  const soldCmv = sales.reduce((sum, sale) => sum + getSaleCmv(sale), 0);
  const grossProfit = sales.reduce((sum, sale) => sum + getSaleGrossProfit(sale), 0);

  return {
    sales,
    purchases,
    revenue,
    purchasesTotal,
    soldCmv,
    grossProfit,
    salesQuantity: sales.reduce((sum, sale) => sum + toNumber(sale.quantity), 0),
  };
}

function activateTab(tabId) {
  const targetButton = $(`.tab-button[data-tab="${tabId}"]`);
  const targetPanel = $(`#${tabId}`);
  if (!targetButton || !targetPanel || targetButton.classList.contains("hidden")) return;

  $$(".tab-button").forEach((item) => item.classList.remove("active"));
  $$(".tab-panel").forEach((item) => item.classList.remove("active"));
  targetButton.classList.add("active");
  targetPanel.classList.add("active");
}

function renderAll() {
  renderAuthGate();
  renderSelects();
  renderDashboard();
  renderInventory();
  renderProducts();
  renderDigitalMenu();
  renderInvestment();
  renderPurchases();
  renderSales();
  renderUsers();
  renderRecipePreview();
  updateSaleHint();
}

function renderAuthGate() {
  const currentUser = getCurrentUser();
  const hasUsers = authState.users.length > 0;
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
  if (!activePanel || activeButton?.classList.contains("hidden")) activateTab("dashboard");
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
              <button class="ghost-button edit-user" type="button" data-id="${user.id}">Editar</button>
              <button class="danger-button delete-user" type="button" data-id="${user.id}">Excluir</button>
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
}

function renderDashboard() {
  const metrics = calculatePeriodMetrics();
  const criticalItems = getCriticalItems();

  $("#statRevenue").textContent = currency.format(metrics.revenue);
  $("#statCosts").textContent = currency.format(metrics.purchasesTotal);
  $("#statSoldCmv").textContent = currency.format(metrics.soldCmv);
  $("#statProfit").textContent = currency.format(metrics.grossProfit);
  $("#statDashboardStockValue").textContent = currency.format(getStockValue());

  $("#alertsTable").innerHTML =
    criticalItems
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatQuantity(item.stock, item.unit)}</td>
          <td>${formatQuantity(item.min, item.unit)}</td>
          <td><span class="badge danger">${formatQuantity(item.suggested, item.unit)}</span></td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="4" class="empty">Nenhum ingrediente abaixo do minimo.</td></tr>`;

  $("#periodSummaryTable").innerHTML = `
    <tr><th>Quantidade vendida</th><td>${metrics.salesQuantity.toLocaleString("pt-BR")}</td></tr>
    <tr><th>Numero de vendas</th><td>${metrics.sales.length.toLocaleString("pt-BR")}</td></tr>
    <tr><th>Faturamento</th><td>${currency.format(metrics.revenue)}</td></tr>
    <tr><th>Compras realizadas</th><td>${currency.format(metrics.purchasesTotal)}</td></tr>
    <tr><th>CMV vendido</th><td>${currency.format(metrics.soldCmv)}</td></tr>
    <tr><th>Lucro bruto</th><td>${currency.format(metrics.grossProfit)}</td></tr>
    <tr><th>Itens criticos</th><td>${criticalItems.length.toLocaleString("pt-BR")}</td></tr>
  `;
}

function renderInventory() {
  $("#inventoryTable").innerHTML =
    state.ingredients
      .map((item) => {
        const statusClass = item.stock <= item.min ? "danger" : item.stock <= item.min * 1.5 ? "warn" : "";
        const statusLabel = item.stock <= item.min ? "Baixo" : item.stock <= item.min * 1.5 ? "Atencao" : "Ok";
        return `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatQuantity(item.stock, item.unit)}</td>
          <td>${formatQuantity(item.min, item.unit)}</td>
          <td><span class="badge ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-ingredient" type="button" data-id="${item.id}">Editar</button>
              <button class="ghost-button restock-ingredient" type="button" data-id="${item.id}">Repor</button>
              <button class="danger-button delete-ingredient" type="button" data-id="${item.id}">Excluir</button>
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
              <button class="ghost-button edit-product" type="button" data-id="${product.id}">Editar</button>
              <button class="danger-button delete-product" type="button" data-id="${product.id}">Excluir</button>
            </div>
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
  const activeProducts = state.products
    .filter((product) => product.menuActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  $("#digitalMenuList").innerHTML =
    activeProducts
      .map((product) => {
        const available = availableForProduct(product);
        const publicName = product.menuName || product.name;
        const status = available > 0 ? `<span class="badge">Disponivel: ${available}</span>` : `<span class="badge danger">Sem estoque</span>`;
        const image = product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(publicName)}" />` : "";
        const featured = product.featured ? `<span class="badge warn">Destaque</span>` : "";

        return `<article class="menu-card">
          ${image}
          <div class="menu-card-header">
            <div>
              <strong>${escapeHtml(publicName)}</strong>
              <p>${escapeHtml(product.category || "Cardapio")} - ${currency.format(product.price)}</p>
            </div>
            <div class="row-actions">${featured}${status}</div>
          </div>
          <p>${escapeHtml(product.description || "Sem descricao cadastrada.")}</p>
          <div class="menu-order-form">
            <input class="menu-customer" data-id="${product.id}" type="text" placeholder="Cliente" />
            <input class="menu-quantity" data-id="${product.id}" type="number" min="1" step="1" value="1" />
            <select class="menu-destination" data-id="${product.id}">
              <option value="delivery">Entrega</option>
              <option value="table">Mesa</option>
              <option value="pickup">Retirada</option>
            </select>
            <input class="menu-note" data-id="${product.id}" type="text" placeholder="Observacao do pedido" />
            <button class="ghost-button create-menu-order" type="button" data-id="${product.id}" ${available <= 0 ? "disabled" : ""}>Criar pedido</button>
          </div>
        </article>`;
      })
      .join("") || `<div class="empty">Nenhum produto ativo no cardapio.</div>`;

  const query = menuFilter.query.trim().toLowerCase();
  const filteredOrders = state.orders
    .filter((order) => {
      if (menuFilter.status !== "all" && order.status !== menuFilter.status) return false;
      if (!query) return true;
      return [getOrderNumber(order), order.productName, order.customerName, order.note, getOrderDestinationLabel(order.destination)]
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

        return `<article class="order-card">
          <div class="order-card-header">
            <div>
              <strong>#${getOrderNumber(order)} - ${escapeHtml(order.productName)} x ${order.quantity}</strong>
              <p>${escapeHtml(order.customerName || "Cliente nao informado")}</p>
            </div>
            <span class="badge ${status.className}">${getOrderStatusLabel(order)}</span>
          </div>
          <p>${getOrderDestinationLabel(order.destination)} - ${dateFormat.format(new Date(order.date))}</p>
          <p>${escapeHtml(order.note || "Sem observacao")} - ${currency.format(order.total)}</p>
          <div class="row-actions">
            ${
              canAccept
                ? `<button class="ghost-button accept-menu-order" type="button" data-id="${order.id}">Aceitar pedido</button>
                   <button class="danger-button cancel-menu-order" type="button" data-id="${order.id}">Cancelar</button>`
                : ""
            }
            ${
              canAdvance
                ? `<button class="ghost-button advance-menu-order" type="button" data-id="${order.id}">Avancar para ${getOrderStatusLabel(order, status.next)}</button>`
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

  $$(".create-menu-order").forEach((button) => {
    button.addEventListener("click", () => createMenuOrder(button.dataset.id));
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
              <button class="ghost-button edit-purchase" type="button" data-id="${purchase.id}">Editar</button>
              <button class="danger-button delete-purchase" type="button" data-id="${purchase.id}">Excluir</button>
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
              <button class="ghost-button edit-sale" type="button" data-id="${sale.id}">Editar</button>
            </div>
          </td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="5" class="empty">Nenhuma venda registrada.</td></tr>`;

  $$(".edit-sale").forEach((button) => {
    button.addEventListener("click", () => startSaleEdit(button.dataset.id));
  });
}

function addRecipeLine(selectedId = "", quantity = "") {
  const template = $("#recipeLineTemplate").content.cloneNode(true);
  const line = template.querySelector(".recipe-line");
  const select = line.querySelector(".recipe-ingredient");
  const input = line.querySelector(".recipe-quantity");

  select.innerHTML = ingredientOptions(selectedId);
  input.value = quantity;
  select.addEventListener("change", renderRecipePreview);
  input.addEventListener("input", renderRecipePreview);
  line.querySelector(".remove-line").addEventListener("click", () => {
    line.remove();
    renderRecipePreview();
  });
  $("#recipeLines").append(line);
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
  $("#recipeLines").innerHTML = "";
  addRecipeLine();
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

function deleteUser(id) {
  if (!isAdmin()) return;
  const user = findUser(id);
  const currentUser = getCurrentUser();
  if (!user || !currentUser) return;

  const adminCount = authState.users.filter((item) => item.role === "admin").length;
  if (user.id === currentUser.id) {
    alert("Voce nao pode excluir o usuario que esta logado.");
    return;
  }
  if (user.role === "admin" && adminCount <= 1) {
    alert("Mantenha pelo menos um administrador ativo.");
    return;
  }
  if (!confirm(`Deseja excluir o acesso de "${user.email}"?`)) return;
  authState.users = authState.users.filter((item) => item.id !== id);
  saveAuthState();
  if ($("#userId").value === id) resetUserForm();
  renderAll();
}

function getMenuInput(productId, className) {
  return document.querySelector(`.${className}[data-id="${productId}"]`);
}

function createMenuOrder(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const quantity = Math.max(1, Math.floor(toNumber(getMenuInput(productId, "menu-quantity")?.value) || 1));
  const customerName = getMenuInput(productId, "menu-customer")?.value.trim() || "";
  const note = getMenuInput(productId, "menu-note")?.value.trim() || "";
  const destination = getMenuInput(productId, "menu-destination")?.value || "delivery";

  if (!canSell(product, quantity)) {
    alert("Estoque insuficiente para criar esse pedido.");
    return;
  }

  state.orders.push({
    id: createId(),
    productId: product.id,
    productName: product.menuName || product.name,
    customerName,
    note,
    destination,
    quantity,
    price: product.price,
    total: product.price * quantity,
    status: "awaiting_acceptance",
    date: new Date().toISOString(),
    acceptedAt: "",
    readyAt: "",
    dispatchedAt: "",
    paidAt: "",
    statusUpdatedAt: new Date().toISOString(),
    confirmedAt: "",
    saleId: "",
  });

  saveState();
  renderAll();
}

function acceptMenuOrder(orderId) {
  const order = findOrder(orderId);
  if (!order || order.status !== "awaiting_acceptance") return;

  const product = findProduct(order.productId);
  if (!product) {
    alert("Produto nao encontrado no cardapio atual.");
    return;
  }

  const sale = createSaleFromProduct(product, order.quantity, order.price, {
    source: "cardapio",
    orderId: order.id,
  });

  if (!sale) {
    alert("Estoque insuficiente para confirmar esse pedido.");
    return;
  }

  const now = new Date().toISOString();
  order.status = "in_production";
  order.acceptedAt = now;
  order.confirmedAt = now;
  order.statusUpdatedAt = now;
  order.saleId = sale.id;
  saveState();
  renderAll();
}

function advanceMenuOrder(orderId) {
  const order = findOrder(orderId);
  if (!order) return;
  const nextStatus = getOrderStatus(order.status).next;
  if (!nextStatus || order.status === "awaiting_acceptance") return;

  const now = new Date().toISOString();
  order.status = nextStatus;
  order.statusUpdatedAt = now;
  if (nextStatus === "ready") order.readyAt = now;
  if (nextStatus === "dispatching") order.dispatchedAt = now;
  if (nextStatus === "payment_confirmed") order.paidAt = now;
  saveState();
  renderAll();
}

function cancelMenuOrder(orderId) {
  const order = findOrder(orderId);
  if (!order || order.status !== "awaiting_acceptance") return;
  if (!confirm(`Deseja cancelar o pedido de "${order.productName}"?`)) return;
  order.status = "canceled";
  order.statusUpdatedAt = new Date().toISOString();
  saveState();
  renderAll();
}

function registerIngredientRestockFromForm() {
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
  saveState();
  renderAll();
}

function deleteIngredient(id) {
  const ingredient = findIngredient(id);
  if (!ingredient) return;

  const linkedProducts = state.products.filter((product) =>
    product.recipe.some((line) => line.ingredientId === ingredient.id),
  );
  const linkedNames = linkedProducts.map((product) => product.name).join(", ");
  const message = linkedProducts.length
    ? `Excluir "${ingredient.name}" tambem vai remover essa materia-prima da ficha tecnica de: ${linkedNames}. Deseja continuar?`
    : `Deseja excluir "${ingredient.name}" do estoque?`;

  if (!confirm(message)) return;

  state.ingredients = state.ingredients.filter((item) => item.id !== ingredient.id);
  state.products = state.products.map((product) => ({
    ...product,
    recipe: product.recipe.filter((line) => line.ingredientId !== ingredient.id),
  }));

  if ($("#ingredientId").value === ingredient.id) resetIngredientForm();

  saveState();
  renderAll();
}

function deleteProduct(id) {
  const product = findProduct(id);
  if (!product) return;

  if (!confirm(`Deseja excluir "${product.name}" do cardapio? As vendas antigas continuam no historico.`)) return;

  state.products = state.products.filter((item) => item.id !== product.id);
  if ($("#productId").value === id) resetProductForm();
  saveState();
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

function exportBackup() {
  const payload = JSON.stringify(normalizeState(state), null, 2);
  downloadText(`burgerstock-backup-${new Date().toISOString().slice(0, 10)}.json`, payload, "application/json");
}

function importBackupFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!validateBackup(parsed)) {
        alert("Backup invalido. O arquivo precisa conter ingredients, products, purchases e sales.");
        return;
      }
      if (!confirm("Importar este backup vai substituir todos os dados atuais. Deseja continuar?")) return;
      state = normalizeState(parsed);
      saveState();
      resetSaleForm();
      resetPurchaseForm();
      resetProductForm();
      resetIngredientForm();
      renderAll();
      alert("Backup importado com sucesso.");
    } catch {
      alert("Nao foi possivel ler o arquivo JSON.");
    }
  });
  reader.readAsText(file);
}

function csvEscape(value) {
  const text = String(value ?? "");
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

  $("#setupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = $("#setupName").value.trim();
    const email = normalizeEmail($("#setupEmail").value);
    const password = $("#setupPassword").value;
    const passwordError = validatePassword(password);

    if (!name || !email) return;
    if (authState.users.length > 0) {
      $("#setupMessage").textContent = "O administrador inicial ja foi criado.";
      renderAuthGate();
      return;
    }
    if (passwordError) {
      $("#setupMessage").textContent = passwordError;
      return;
    }

    const passwordRecord = await buildPasswordRecord(password);
    const user = {
      id: createId(),
      name,
      email,
      role: "admin",
      ...passwordRecord,
      createdAt: new Date().toISOString(),
    };
    authState.users.push(user);
    saveAuthState();
    saveSession(user);
    $("#setupForm").reset();
    renderAll();
  });

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = normalizeEmail($("#loginEmail").value);
    const password = $("#loginPassword").value;
    const user = findUserByEmail(email);

    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      $("#loginMessage").textContent = "Email ou senha incorretos.";
      return;
    }

    saveSession(user);
    $("#loginForm").reset();
    $("#loginMessage").textContent = "";
    renderAll();
  });

  $("#logoutButton").addEventListener("click", () => {
    clearSession();
    renderAuthGate();
  });

  $("#menuOrderSearch").addEventListener("input", () => {
    menuFilter.query = $("#menuOrderSearch").value;
    renderDigitalMenu();
  });

  $("#menuOrderStatusFilter").addEventListener("change", () => {
    menuFilter.status = $("#menuOrderStatusFilter").value;
    renderDigitalMenu();
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

  $("#ingredientForm").addEventListener("submit", (event) => {
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
      ingredient.name = name;
      ingredient.unit = unit;
      ingredient.stock = stock;
      ingredient.min = min;
    } else {
      ingredient = { id: createId(), name, unit, stock, min };
      state.ingredients.push(ingredient);
    }

    resetIngredientForm();
    saveState();
    renderAll();
  });

  $("#cancelIngredientEdit").addEventListener("click", resetIngredientForm);
  $("#registerIngredientRestock").addEventListener("click", registerIngredientRestockFromForm);

  $("#purchaseForm").addEventListener("submit", (event) => {
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
    saveState();
    renderAll();
  });

  $("#cancelPurchaseEdit").addEventListener("click", resetPurchaseForm);

  $("#addRecipeLine").addEventListener("click", () => addRecipeLine());

  $("#productForm").addEventListener("submit", (event) => {
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
    }

    resetProductForm();
    saveState();
    renderAll();
  });

  $("#cancelProductEdit").addEventListener("click", resetProductForm);

  $("#saleProduct").addEventListener("change", () => {
    const product = findProduct($("#saleProduct").value);
    $("#salePrice").value = product ? product.price.toFixed(2) : "";
    updateSaleHint();
  });

  $("#saleQuantity").addEventListener("input", updateSaleHint);

  $("#saleForm").addEventListener("submit", (event) => {
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
    } else {
      createSaleFromProduct(product, quantity, price);
    }

    resetSaleForm();
    saveState();
    renderAll();
  });

  $("#cancelSaleEdit").addEventListener("click", resetSaleForm);

  $("#userForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const userId = $("#userId").value;
    const name = $("#userName").value.trim();
    const email = normalizeEmail($("#userEmail").value);
    const role = $("#userRole").value === "admin" ? "admin" : "operator";
    const password = $("#userPassword").value;
    const userBeingEdited = userId ? findUser(userId) : null;

    $("#userMessage").textContent = "";

    if (!name || !email) {
      $("#userMessage").textContent = "Informe nome e email.";
      return;
    }
    if (hasUserEmailConflict(email, userId)) {
      $("#userMessage").textContent = "Ja existe usuario com esse email.";
      return;
    }
    if (!userBeingEdited || password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        $("#userMessage").textContent = passwordError;
        return;
      }
    }

    if (userBeingEdited) {
      const currentUser = getCurrentUser();
      const adminCount = authState.users.filter((user) => user.role === "admin").length;
      if (userBeingEdited.role === "admin" && role !== "admin" && adminCount <= 1) {
        $("#userMessage").textContent = "Mantenha pelo menos um administrador ativo.";
        return;
      }

      userBeingEdited.name = name;
      userBeingEdited.email = email;
      userBeingEdited.role = role;
      userBeingEdited.updatedAt = new Date().toISOString();
      if (password) Object.assign(userBeingEdited, await buildPasswordRecord(password));
      if (currentUser?.id === userBeingEdited.id) saveSession(userBeingEdited);
    } else {
      authState.users.push({
        id: createId(),
        name,
        email,
        role,
        ...(await buildPasswordRecord(password)),
        createdAt: new Date().toISOString(),
      });
    }

    saveAuthState();
    resetUserForm();
    renderAll();
  });

  $("#cancelUserEdit").addEventListener("click", resetUserForm);

  $("#seedData").addEventListener("click", () => {
    state = normalizeState(exampleState);
    saveState();
    resetProductForm();
    renderAll();
  });

  $("#clearData").addEventListener("click", () => {
    if (!confirm("Deseja apagar todos os dados cadastrados?")) return;
    state = clone(defaultState);
    localStorage.removeItem(STORAGE_KEY);
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
renderAll();
